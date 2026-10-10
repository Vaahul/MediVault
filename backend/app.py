"""MediVault backend (Flask + SQLite).

Run:  python app.py        (serves the API on http://127.0.0.1:5001)
Seed: python seed.py       (creates demo accounts and sample PDF reports)
"""
import os
import re
import sqlite3
import uuid
from datetime import date, datetime, timedelta
from functools import wraps

from flask import Flask, g, jsonify, request, send_from_directory, session
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get("SECRET_KEY", "dev-only-change-me"),
    DATABASE=os.environ.get("MEDIVAULT_DB", os.path.join(BASE_DIR, "medivault.db")),
    UPLOAD_DIR=os.environ.get("MEDIVAULT_UPLOADS", os.path.join(BASE_DIR, "uploads")),
    MAX_CONTENT_LENGTH=10 * 1024 * 1024,  # 10 MB per upload
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=timedelta(days=30),
)

RECORD_TYPES = ("Report", "Prescription", "Scan")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK (role IN ('patient','doctor')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  dob TEXT, specialization TEXT, registration TEXT, workplace TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Report','Prescription','Scan')),
  record_date TEXT NOT NULL,
  provider TEXT,
  stored_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS shares (
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (record_id, user_id)
);
CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (doctor_id, patient_id)
);
CREATE TABLE IF NOT EXISTS family_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (requester_id, target_id)
);
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


# ---------------------------------------------------------------- database
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    os.makedirs(app.config["UPLOAD_DIR"], exist_ok=True)
    db = sqlite3.connect(app.config["DATABASE"])
    db.executescript(SCHEMA)
    db.commit()
    db.close()


# ----------------------------------------------------------------- helpers
def err(message, status=400):
    return jsonify({"error": message}), status


def mv_id(user_id):
    return f"MV-{user_id:04d}"


def age_from(dob):
    try:
        born = datetime.strptime(dob, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None
    today = date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def user_public(u):
    return {
        "id": u["id"], "role": u["role"], "name": u["name"], "email": u["email"],
        "mv_id": mv_id(u["id"]), "specialization": u["specialization"],
        "workplace": u["workplace"], "age": age_from(u["dob"]),
    }


def current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    return get_db().execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()


def login_required(role=None):
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = current_user()
            if not user:
                return err("Please log in to continue.", 401)
            if role and user["role"] != role:
                return err("This action is not available for your account type.", 403)
            g.user = user
            return fn(*args, **kwargs)
        return wrapper
    return deco


def json_body():
    return request.get_json(silent=True) or {}


def parse_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def doctor_connected(db, doctor_id, patient_id):
    return db.execute(
        "SELECT 1 FROM connections WHERE doctor_id=? AND patient_id=? AND status='approved'",
        (doctor_id, patient_id),
    ).fetchone() is not None


def family_linked(db, a, b):
    return db.execute(
        "SELECT 1 FROM family_links WHERE status='approved' AND "
        "((requester_id=? AND target_id=?) OR (requester_id=? AND target_id=?))",
        (a, b, b, a),
    ).fetchone() is not None


def can_view_record(db, user, rec):
    """Owner, or someone the owner shared with AND is still connected to."""
    if rec["patient_id"] == user["id"]:
        return True
    shared = db.execute(
        "SELECT 1 FROM shares WHERE record_id=? AND user_id=?", (rec["id"], user["id"])
    ).fetchone()
    if not shared:
        return False
    if user["role"] == "doctor":
        return doctor_connected(db, user["id"], rec["patient_id"])
    return family_linked(db, user["id"], rec["patient_id"])


def record_dict(rec, shared_with=None):
    d = {
        "id": rec["id"], "title": rec["title"], "type": rec["type"],
        "date": rec["record_date"], "provider": rec["provider"],
        "file_name": rec["original_name"],
    }
    if shared_with is not None:
        d["shared_with"] = shared_with
    return d


def shared_with_map(db, record_ids):
    out = {rid: [] for rid in record_ids}
    if not record_ids:
        return out
    marks = ",".join("?" * len(record_ids))
    rows = db.execute(
        f"SELECT s.record_id, u.id, u.name, u.role FROM shares s JOIN users u ON u.id=s.user_id "
        f"WHERE s.record_id IN ({marks})", record_ids,
    ).fetchall()
    for r in rows:
        out[r["record_id"]].append({"id": r["id"], "name": r["name"], "role": r["role"]})
    return out


def is_pdf(file_storage):
    name = (file_storage.filename or "").lower()
    head = file_storage.stream.read(5)
    file_storage.stream.seek(0)
    return name.endswith(".pdf") and head == b"%PDF-"


# -------------------------------------------------------------------- auth
@app.post("/api/auth/signup")
def signup():
    d = json_body()
    role = d.get("role")
    name = (d.get("name") or "").strip()
    email = (d.get("email") or "").strip().lower()
    password = d.get("password") or ""
    if role not in ("patient", "doctor"):
        return err("Choose patient or doctor.")
    if not name or len(name) > 100:
        return err("Enter your full name.")
    if not EMAIL_RE.match(email):
        return err("Enter a valid email address.")
    if len(password) < 8:
        return err("Use at least 8 characters for your password.")

    dob = spec = reg = work = None
    if role == "patient":
        born = parse_date(d.get("dob"))
        if not born or born > date.today():
            return err("Enter a valid date of birth.")
        dob = born.isoformat()
    else:
        spec = (d.get("specialization") or "").strip()
        reg = (d.get("registration") or "").strip()
        work = (d.get("workplace") or "").strip()
        if not (spec and reg and work):
            return err("Enter your specialization, registration number and workplace.")

    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        return err("An account with this email already exists.", 409)
    cur = db.execute(
        "INSERT INTO users (role,name,email,password_hash,dob,specialization,registration,workplace) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (role, name, email, generate_password_hash(password), dob, spec, reg, work),
    )
    db.commit()
    session.clear()
    session["user_id"] = cur.lastrowid
    user = db.execute("SELECT * FROM users WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify({"user": user_public(user)}), 201


@app.post("/api/auth/login")
def login():
    d = json_body()
    email = (d.get("email") or "").strip().lower()
    user = get_db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if (not user or user["role"] != d.get("role")
            or not check_password_hash(user["password_hash"], d.get("password") or "")):
        return err("Email, password or account type is incorrect.", 401)
    session.clear()
    session["user_id"] = user["id"]
    session.permanent = bool(d.get("remember"))
    return jsonify({"user": user_public(user)})


@app.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/auth/me")
def me():
    user = current_user()
    return jsonify({"user": user_public(user) if user else None})


# ----------------------------------------------------------------- records
@app.get("/api/records")
@login_required("patient")
def list_records():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM records WHERE patient_id=? ORDER BY record_date DESC, id DESC", (g.user["id"],)
    ).fetchall()
    shares = shared_with_map(db, [r["id"] for r in rows])
    return jsonify({"records": [record_dict(r, shares[r["id"]]) for r in rows]})


@app.post("/api/records")
@login_required("patient")
def upload_record():
    title = (request.form.get("title") or "").strip()
    rtype = request.form.get("type")
    rdate = parse_date(request.form.get("date"))
    provider = (request.form.get("provider") or "").strip()[:120]
    file = request.files.get("file")
    if not file or not file.filename:
        return err("Choose a PDF file to upload.")
    if not is_pdf(file):
        return err("Only PDF files are supported.")
    if not title or len(title) > 120:
        return err("Enter a title for this record.")
    if rtype not in RECORD_TYPES:
        return err("Choose a record type.")
    if not rdate or rdate > date.today():
        return err("Enter a valid record date (not in the future).")

    stored = f"{uuid.uuid4().hex}.pdf"
    file.save(os.path.join(app.config["UPLOAD_DIR"], stored))
    db = get_db()
    cur = db.execute(
        "INSERT INTO records (patient_id,title,type,record_date,provider,stored_name,original_name) "
        "VALUES (?,?,?,?,?,?,?)",
        (g.user["id"], title, rtype, rdate.isoformat(), provider, stored, os.path.basename(file.filename)[:200]),
    )
    db.commit()
    rec = db.execute("SELECT * FROM records WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify({"record": record_dict(rec, [])}), 201


@app.delete("/api/records/<int:rid>")
@login_required("patient")
def delete_record(rid):
    db = get_db()
    rec = db.execute("SELECT * FROM records WHERE id=? AND patient_id=?", (rid, g.user["id"])).fetchone()
    if not rec:
        return err("Record not found.", 404)
    db.execute("DELETE FROM records WHERE id=?", (rid,))
    db.commit()
    try:
        os.remove(os.path.join(app.config["UPLOAD_DIR"], rec["stored_name"]))
    except OSError:
        pass
    return jsonify({"ok": True})


@app.get("/api/records/<int:rid>/file")
@login_required()
def record_file(rid):
    db = get_db()
    rec = db.execute("SELECT * FROM records WHERE id=?", (rid,)).fetchone()
    if not rec or not can_view_record(db, g.user, rec):
        return err("Record not found.", 404)
    resp = send_from_directory(
        app.config["UPLOAD_DIR"], rec["stored_name"], mimetype="application/pdf",
        as_attachment=request.args.get("download") == "1", download_name=rec["original_name"],
    )
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Cache-Control"] = "private, no-store"
    return resp


@app.get("/api/shared-with-me")
@login_required("patient")
def shared_with_me():
    db = get_db()
    rows = db.execute(
        "SELECT r.*, u.name AS owner_name FROM shares s JOIN records r ON r.id=s.record_id "
        "JOIN users u ON u.id=r.patient_id WHERE s.user_id=? ORDER BY r.record_date DESC", (g.user["id"],)
    ).fetchall()
    out = []
    for r in rows:
        if family_linked(db, g.user["id"], r["patient_id"]):
            d = record_dict(r)
            d["owner_name"] = r["owner_name"]
            out.append(d)
    return jsonify({"records": out})


# ------------------------------------------------------------------ sharing
def _share_target_ok(db, patient_id, target_id):
    target = db.execute("SELECT * FROM users WHERE id=?", (target_id,)).fetchone()
    if not target:
        return False
    if target["role"] == "doctor":
        return doctor_connected(db, target_id, patient_id)
    return family_linked(db, target_id, patient_id)


def _owned_ids(db, patient_id, ids):
    ids = [i for i in ids if isinstance(i, int)]
    if not ids:
        return []
    marks = ",".join("?" * len(ids))
    rows = db.execute(f"SELECT id FROM records WHERE patient_id=? AND id IN ({marks})", [patient_id, *ids]).fetchall()
    return [r["id"] for r in rows]


@app.post("/api/shares")
@login_required("patient")
def share_records():
    d = json_body()
    db = get_db()
    target = d.get("user_id")
    if not isinstance(target, int) or not _share_target_ok(db, g.user["id"], target):
        return err("You can only share with connected doctors and family members.", 403)
    ids = _owned_ids(db, g.user["id"], d.get("record_ids") or [])
    if not ids:
        return err("Choose at least one record to share.")
    db.executemany("INSERT OR IGNORE INTO shares (record_id,user_id) VALUES (?,?)", [(i, target) for i in ids])
    db.commit()
    return jsonify({"shared": len(ids)})


@app.post("/api/shares/revoke")
@login_required("patient")
def revoke_shares():
    d = json_body()
    db = get_db()
    target = d.get("user_id")
    ids = _owned_ids(db, g.user["id"], d.get("record_ids") or [])
    if not isinstance(target, int) or not ids:
        return err("Choose a person and at least one record.")
    marks = ",".join("?" * len(ids))
    db.execute(f"DELETE FROM shares WHERE user_id=? AND record_id IN ({marks})", [target, *ids])
    db.commit()
    return jsonify({"ok": True})


# -------------------------------------------------- patient: people & requests
def _shared_ids(db, patient_id, user_id):
    rows = db.execute(
        "SELECT s.record_id FROM shares s JOIN records r ON r.id=s.record_id WHERE r.patient_id=? AND s.user_id=?",
        (patient_id, user_id),
    ).fetchall()
    return [r["record_id"] for r in rows]


@app.get("/api/people")
@login_required("patient")
def people():
    db, me_id = get_db(), g.user["id"]
    doctors = db.execute(
        "SELECT c.id AS link_id, u.* FROM connections c JOIN users u ON u.id=c.doctor_id "
        "WHERE c.patient_id=? AND c.status='approved' ORDER BY u.name", (me_id,)
    ).fetchall()
    family = db.execute(
        "SELECT f.id AS link_id, u.* FROM family_links f JOIN users u ON u.id = "
        "CASE WHEN f.requester_id=? THEN f.target_id ELSE f.requester_id END "
        "WHERE f.status='approved' AND (f.requester_id=? OR f.target_id=?) ORDER BY u.name", (me_id, me_id, me_id)
    ).fetchall()
    return jsonify({
        "doctors": [{"link_id": r["link_id"], "user_id": r["id"], "name": r["name"],
                     "detail": r["specialization"], "shared_record_ids": _shared_ids(db, me_id, r["id"])} for r in doctors],
        "family": [{"link_id": r["link_id"], "user_id": r["id"], "name": r["name"],
                    "detail": "Family member", "shared_record_ids": _shared_ids(db, me_id, r["id"])} for r in family],
    })


@app.delete("/api/connections/<int:link_id>")
@login_required("patient")
def disconnect_doctor(link_id):
    db = get_db()
    row = db.execute("SELECT * FROM connections WHERE id=? AND patient_id=?", (link_id, g.user["id"])).fetchone()
    if not row:
        return err("Connection not found.", 404)
    db.execute("DELETE FROM shares WHERE user_id=? AND record_id IN (SELECT id FROM records WHERE patient_id=?)",
               (row["doctor_id"], g.user["id"]))
    db.execute("DELETE FROM connections WHERE id=?", (link_id,))
    db.commit()
    return jsonify({"ok": True})


@app.delete("/api/family/<int:link_id>")
@login_required("patient")
def disconnect_family(link_id):
    db, me_id = get_db(), g.user["id"]
    row = db.execute("SELECT * FROM family_links WHERE id=? AND (requester_id=? OR target_id=?)",
                     (link_id, me_id, me_id)).fetchone()
    if not row:
        return err("Family link not found.", 404)
    a, b = row["requester_id"], row["target_id"]
    db.execute("DELETE FROM shares WHERE user_id=? AND record_id IN (SELECT id FROM records WHERE patient_id=?)", (a, b))
    db.execute("DELETE FROM shares WHERE user_id=? AND record_id IN (SELECT id FROM records WHERE patient_id=?)", (b, a))
    db.execute("DELETE FROM family_links WHERE id=?", (link_id,))
    db.commit()
    return jsonify({"ok": True})


@app.get("/api/requests")
@login_required("patient")
def incoming_requests():
    db, me_id = get_db(), g.user["id"]
    docs = db.execute(
        "SELECT c.id, u.name, u.specialization FROM connections c JOIN users u ON u.id=c.doctor_id "
        "WHERE c.patient_id=? AND c.status='pending' ORDER BY c.id DESC", (me_id,)
    ).fetchall()
    fam = db.execute(
        "SELECT f.id, u.name FROM family_links f JOIN users u ON u.id=f.requester_id "
        "WHERE f.target_id=? AND f.status='pending' ORDER BY f.id DESC", (me_id,)
    ).fetchall()
    out = [{"kind": "doctor", "id": r["id"], "name": r["name"], "detail": f"{r['specialization']} wants to connect"} for r in docs]
    out += [{"kind": "family", "id": r["id"], "name": r["name"], "detail": "Wants to link as family"} for r in fam]
    return jsonify({"requests": out})


@app.post("/api/requests/<kind>/<int:rid>/decision")
@login_required("patient")
def decide_request(kind, rid):
    decision = json_body().get("decision")
    if decision not in ("approved", "rejected") or kind not in ("doctor", "family"):
        return err("Invalid request.")
    db = get_db()
    if kind == "doctor":
        sql = "UPDATE connections SET status=? WHERE id=? AND patient_id=? AND status='pending'"
    else:
        sql = "UPDATE family_links SET status=? WHERE id=? AND target_id=? AND status='pending'"
    cur = db.execute(sql, (decision, rid, g.user["id"]))
    db.commit()
    if cur.rowcount == 0:
        return err("Request not found.", 404)
    return jsonify({"ok": True})


@app.post("/api/family/request")
@login_required("patient")
def family_request():
    email = (json_body().get("email") or "").strip().lower()
    db, me_id = get_db(), g.user["id"]
    target = db.execute("SELECT * FROM users WHERE email=? AND role='patient'", (email,)).fetchone()
    if not target:
        return err("No patient account found with that email.", 404)
    if target["id"] == me_id:
        return err("You cannot add yourself.")
    existing = db.execute(
        "SELECT * FROM family_links WHERE (requester_id=? AND target_id=?) OR (requester_id=? AND target_id=?)",
        (me_id, target["id"], target["id"], me_id),
    ).fetchone()
    if existing and existing["status"] != "rejected":
        return err("You are already linked, or a request is pending.", 409)
    if existing:
        db.execute("DELETE FROM family_links WHERE id=?", (existing["id"],))
    db.execute("INSERT INTO family_links (requester_id,target_id) VALUES (?,?)", (me_id, target["id"]))
    db.commit()
    return jsonify({"ok": True, "name": target["name"]}), 201


# ------------------------------------------------------------------- doctor
@app.get("/api/doctor/patients")
@login_required("doctor")
def doctor_patients():
    db = get_db()
    rows = db.execute(
        "SELECT u.*, (SELECT COUNT(*) FROM shares s JOIN records r ON r.id=s.record_id "
        "WHERE r.patient_id=u.id AND s.user_id=?) AS shared_count "
        "FROM connections c JOIN users u ON u.id=c.patient_id "
        "WHERE c.doctor_id=? AND c.status='approved' ORDER BY u.name", (g.user["id"], g.user["id"])
    ).fetchall()
    return jsonify({"patients": [
        {"id": r["id"], "name": r["name"], "age": age_from(r["dob"]), "mv_id": mv_id(r["id"]),
         "shared_count": r["shared_count"]} for r in rows]})


@app.get("/api/doctor/patients/<int:pid>/records")
@login_required("doctor")
def doctor_patient_records(pid):
    db = get_db()
    if not doctor_connected(db, g.user["id"], pid):
        return err("You are not connected to this patient.", 403)
    rows = db.execute(
        "SELECT r.* FROM shares s JOIN records r ON r.id=s.record_id "
        "WHERE r.patient_id=? AND s.user_id=? ORDER BY r.record_date DESC", (pid, g.user["id"])
    ).fetchall()
    return jsonify({"records": [record_dict(r) for r in rows]})


@app.post("/api/doctor/requests")
@login_required("doctor")
def doctor_send_request():
    ident = (json_body().get("identifier") or "").strip()
    if not ident:
        return err("Enter the patient's email or MediVault ID.")
    db = get_db()
    m = re.fullmatch(r"(?i)MV-(\d+)", ident)
    if m:
        target = db.execute("SELECT * FROM users WHERE id=? AND role='patient'", (int(m.group(1)),)).fetchone()
    else:
        target = db.execute("SELECT * FROM users WHERE email=? AND role='patient'", (ident.lower(),)).fetchone()
    if not target:
        return err("No patient account found with those details.", 404)
    existing = db.execute("SELECT * FROM connections WHERE doctor_id=? AND patient_id=?",
                          (g.user["id"], target["id"])).fetchone()
    if existing and existing["status"] == "approved":
        return err("You are already connected to this patient.", 409)
    if existing and existing["status"] == "pending":
        return err("A request to this patient is already awaiting approval.", 409)
    if existing:
        db.execute("UPDATE connections SET status='pending' WHERE id=?", (existing["id"],))
    else:
        db.execute("INSERT INTO connections (doctor_id,patient_id) VALUES (?,?)", (g.user["id"], target["id"]))
    db.commit()
    return jsonify({"ok": True, "name": target["name"]}), 201


@app.get("/api/doctor/requests")
@login_required("doctor")
def doctor_sent_requests():
    rows = get_db().execute(
        "SELECT c.id, c.status, u.name FROM connections c JOIN users u ON u.id=c.patient_id "
        "WHERE c.doctor_id=? AND c.status IN ('pending','rejected') ORDER BY c.id DESC", (g.user["id"],)
    ).fetchall()
    return jsonify({"requests": [{"id": r["id"], "name": r["name"], "status": r["status"]} for r in rows]})


# ------------------------------------------------------------- appointments
@app.get("/api/appointments")
@login_required()
def list_appointments():
    db, u = get_db(), g.user
    col, other = ("doctor_id", "patient_id") if u["role"] == "doctor" else ("patient_id", "doctor_id")
    floor = date.today().isoformat() + "T00:00"
    rows = db.execute(
        f"SELECT a.*, o.name AS other_name FROM appointments a JOIN users o ON o.id=a.{other} "
        f"WHERE a.{col}=? AND a.starts_at>=? ORDER BY a.starts_at", (u["id"], floor)
    ).fetchall()
    return jsonify({"appointments": [
        {"id": r["id"], "starts_at": r["starts_at"], "note": r["note"], "with": r["other_name"],
         "patient_id": r["patient_id"]} for r in rows]})


@app.post("/api/appointments")
@login_required("doctor")
def create_appointment():
    d = json_body()
    pid, note = d.get("patient_id"), (d.get("note") or "").strip()[:200]
    try:
        when = datetime.strptime(d.get("starts_at") or "", "%Y-%m-%dT%H:%M")
    except ValueError:
        return err("Choose a valid date and time.")
    db = get_db()
    if not isinstance(pid, int) or not doctor_connected(db, g.user["id"], pid):
        return err("Choose one of your connected patients.", 403)
    if when < datetime.now() - timedelta(minutes=1):
        return err("Choose a time in the future.")
    db.execute("INSERT INTO appointments (doctor_id,patient_id,starts_at,note) VALUES (?,?,?,?)",
               (g.user["id"], pid, when.strftime("%Y-%m-%dT%H:%M"), note))
    db.commit()
    return jsonify({"ok": True}), 201


@app.delete("/api/appointments/<int:aid>")
@login_required("doctor")
def delete_appointment(aid):
    db = get_db()
    cur = db.execute("DELETE FROM appointments WHERE id=? AND doctor_id=?", (aid, g.user["id"]))
    db.commit()
    if cur.rowcount == 0:
        return err("Appointment not found.", 404)
    return jsonify({"ok": True})


@app.errorhandler(413)
def too_large(_e):
    return err("That file is larger than 10 MB.", 413)


init_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
