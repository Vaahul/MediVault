"""Create demo accounts, sample PDF reports and a few connections.

Usage:  python seed.py          (refuses to run if users already exist)
        python seed.py --reset  (wipes the database and uploads first)

Demo logins:
  Patient  aanya@example.com   Patient@123
  Patient  rohan@example.com   Patient@123
  Patient  meera@example.com   Patient@123
  Doctor   neha@example.com    Doctor@123
  Doctor   kapoor@example.com  Doctor@123
"""
import os
import shutil
import sqlite3
import sys
import uuid
from datetime import date, datetime, timedelta

from werkzeug.security import generate_password_hash

import app as medivault


def make_pdf(title, lines):
    """Build a small valid one-page PDF without third-party libraries."""
    def esc(s):
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    ops = [f"BT /F1 20 Tf 56 780 Td ({esc(title)}) Tj ET"]
    y = 744
    for line in lines:
        ops.append(f"BT /F1 11 Tf 56 {y} Td ({esc(line)}) Tj ET")
        y -= 18
    stream = "\n".join(ops).encode("latin-1", "replace")
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = bytearray(b"%PDF-1.4\n"), []
    for i, obj in enumerate(objs, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + obj + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
    for off in offsets:
        out += b"%010d 00000 n \n" % off
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)
    return bytes(out)


def main():
    app = medivault.app
    db_path, upload_dir = app.config["DATABASE"], app.config["UPLOAD_DIR"]
    if "--reset" in sys.argv:
        if os.path.exists(db_path):
            os.remove(db_path)
        shutil.rmtree(upload_dir, ignore_errors=True)
    medivault.init_db()
    db = sqlite3.connect(db_path)
    db.execute("PRAGMA foreign_keys = ON")
    if db.execute("SELECT COUNT(*) FROM users").fetchone()[0]:
        sys.exit("Database already has users. Run `python seed.py --reset` to start fresh.")

    def user(role, name, email, pw, **kw):
        cur = db.execute(
            "INSERT INTO users (role,name,email,password_hash,dob,specialization,registration,workplace) VALUES (?,?,?,?,?,?,?,?)",
            (role, name, email, generate_password_hash(pw), kw.get("dob"), kw.get("spec"), kw.get("reg"), kw.get("work")))
        return cur.lastrowid

    aanya = user("patient", "Aanya Rao", "aanya@example.com", "Patient@123", dob="1992-04-12")
    rohan = user("patient", "Rohan Iyer", "rohan@example.com", "Patient@123", dob="1974-09-03")
    meera = user("patient", "Meera Rao", "meera@example.com", "Patient@123", dob="1995-01-20")
    neha = user("doctor", "Dr. Neha Mehta", "neha@example.com", "Doctor@123",
                spec="Pulmonologist", reg="MH-2011-48213", work="City Care Clinic")
    kapoor = user("doctor", "Dr. S. Kapoor", "kapoor@example.com", "Doctor@123",
                  spec="Dermatologist", reg="DL-2015-77102", work="Skin & Care Centre")

    def record(patient, title, rtype, rdate, provider, lines):
        stored = f"{uuid.uuid4().hex}.pdf"
        with open(os.path.join(upload_dir, stored), "wb") as f:
            f.write(make_pdf(title, ["MediVault sample document (fictional data)", f"Date: {rdate}",
                                     f"Provider: {provider}", "", *lines]))
        cur = db.execute(
            "INSERT INTO records (patient_id,title,type,record_date,provider,stored_name,original_name) VALUES (?,?,?,?,?,?,?)",
            (patient, title, rtype, rdate, provider, stored, title.lower().replace(" ", "-") + ".pdf"))
        return cur.lastrowid

    cbc = record(aanya, "Complete blood count", "Report", "2026-09-12", "Metro Diagnostics",
                 ["Hemoglobin: 13.6 g/dL (12.0 - 15.5)", "WBC: 6.4 x10^9/L (4.0 - 11.0)",
                  "Platelets: 248 x10^9/L (150 - 450)", "", "Result: all values within normal range."])
    rx = record(aanya, "Montelukast 10 mg", "Prescription", "2026-09-02", "Dr. Neha Mehta",
                ["Montelukast 10 mg tablet", "Take one tablet once daily in the evening", "Duration: 3 months"])
    record(aanya, "Chest X-ray", "Scan", "2026-08-18", "City Imaging Centre",
           ["Chest PA view", "Lungs clear. No consolidation or effusion.", "Heart size normal."])
    record(aanya, "Lipid profile", "Report", "2026-06-21", "Metro Diagnostics",
           ["Total cholesterol: 182 mg/dL", "LDL: 104 mg/dL", "HDL: 52 mg/dL", "Triglycerides: 126 mg/dL"])
    ecg = record(rohan, "ECG report", "Report", "2026-10-05", "City Care Clinic",
                 ["Rhythm: normal sinus", "Heart rate: 78 bpm", "No acute ST-T changes."])
    amlo = record(rohan, "Amlodipine 5 mg", "Prescription", "2026-10-05", "Dr. Neha Mehta",
                  ["Amlodipine 5 mg tablet", "Take one tablet once daily in the morning"])

    db.execute("INSERT INTO connections (doctor_id,patient_id,status) VALUES (?,?,'approved')", (neha, aanya))
    db.execute("INSERT INTO connections (doctor_id,patient_id,status) VALUES (?,?,'approved')", (neha, rohan))
    db.execute("INSERT INTO connections (doctor_id,patient_id,status) VALUES (?,?,'pending')", (kapoor, aanya))
    db.execute("INSERT INTO family_links (requester_id,target_id,status) VALUES (?,?,'pending')", (meera, aanya))
    db.executemany("INSERT INTO shares (record_id,user_id) VALUES (?,?)",
                   [(cbc, neha), (rx, neha), (ecg, neha), (amlo, neha)])

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    db.executemany("INSERT INTO appointments (doctor_id,patient_id,starts_at,note) VALUES (?,?,?,?)", [
        (neha, rohan, f"{tomorrow}T09:30", "BP review"),
        (neha, aanya, f"{tomorrow}T11:00", "Follow-up"),
    ])
    db.commit()
    db.close()
    print(__doc__)


if __name__ == "__main__":
    main()
