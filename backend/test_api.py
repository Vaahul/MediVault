"""Quick API smoke test: python -m unittest test_api -v"""
import io
import os
import sys
import tempfile
import unittest

_tmp = tempfile.mkdtemp()
os.environ["MEDIVAULT_DB"] = os.path.join(_tmp, "t.db")
os.environ["MEDIVAULT_UPLOADS"] = os.path.join(_tmp, "up")

import app as medivault  # noqa: E402
import seed  # noqa: E402


class ApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sys.argv = ["seed.py"]
        seed.main()

    def client(self, email, pw, role):
        c = medivault.app.test_client()
        r = c.post("/api/auth/login", json={"email": email, "password": pw, "role": role})
        self.assertEqual(r.status_code, 200, r.json)
        return c

    def test_flow(self):
        aanya = self.client("aanya@example.com", "Patient@123", "patient")
        doctor = self.client("neha@example.com", "Doctor@123", "doctor")

        # wrong tab/role is rejected
        c = medivault.app.test_client()
        self.assertEqual(c.post("/api/auth/login", json={"email": "neha@example.com", "password": "Doctor@123", "role": "patient"}).status_code, 401)

        recs = aanya.get("/api/records").json["records"]
        self.assertEqual(len(recs), 4)
        pdf = aanya.get(f"/api/records/{recs[0]['id']}/file")
        self.assertEqual(pdf.status_code, 200)
        self.assertEqual(pdf.mimetype, "application/pdf")
        self.assertTrue(pdf.data.startswith(b"%PDF-"))

        # doctor sees only shared records and can open only those
        pid = doctor.get("/api/doctor/patients").json["patients"][0]
        shared = doctor.get(f"/api/doctor/patients/{pid['id']}/records").json["records"]
        titles = {r["title"] for r in shared}
        private = [r for r in recs if r["title"] not in titles][0]
        self.assertEqual(doctor.get(f"/api/records/{private['id']}/file").status_code, 404)
        self.assertEqual(doctor.get(f"/api/records/{shared[0]['id']}/file").status_code, 200)

        # share a record, then revoke
        me = aanya.get("/api/auth/me").json["user"]
        neha = aanya.get("/api/people").json["doctors"][0]
        self.assertEqual(aanya.post("/api/shares", json={"user_id": neha["user_id"], "record_ids": [private["id"]]}).status_code, 200)
        self.assertEqual(doctor.get(f"/api/records/{private['id']}/file").status_code, 200)
        aanya.post("/api/shares/revoke", json={"user_id": neha["user_id"], "record_ids": [private["id"]]})
        self.assertEqual(doctor.get(f"/api/records/{private['id']}/file").status_code, 404)

        # upload: rejects non-PDF, accepts PDF
        bad = aanya.post("/api/records", data={"title": "x", "type": "Report", "date": "2026-01-01", "file": (io.BytesIO(b"hello"), "x.pdf")}, content_type="multipart/form-data")
        self.assertEqual(bad.status_code, 400)
        good = aanya.post("/api/records", data={"title": "My upload", "type": "Scan", "date": "2026-01-01", "provider": "Lab", "file": (io.BytesIO(seed.make_pdf("T", ["a"])), "up.pdf")}, content_type="multipart/form-data")
        self.assertEqual(good.status_code, 201, good.json)
        rid = good.json["record"]["id"]
        self.assertEqual(aanya.delete(f"/api/records/{rid}").status_code, 200)

        # requests: approve doctor request, family request
        reqs = aanya.get("/api/requests").json["requests"]
        self.assertEqual({r["kind"] for r in reqs}, {"doctor", "family"})
        for r in reqs:
            self.assertEqual(aanya.post(f"/api/requests/{r['kind']}/{r['id']}/decision", json={"decision": "approved"}).status_code, 200)
        self.assertEqual(len(aanya.get("/api/people").json["family"]), 1)

        # doctor connection request by MediVault ID, and appointments
        meera = self.client("meera@example.com", "Patient@123", "patient")
        mid = meera.get("/api/auth/me").json["user"]["mv_id"]
        self.assertEqual(doctor.post("/api/doctor/requests", json={"identifier": mid}).status_code, 201)
        self.assertEqual(doctor.post("/api/doctor/requests", json={"identifier": mid}).status_code, 409)
        self.assertEqual(doctor.post("/api/appointments", json={"patient_id": pid["id"], "starts_at": "2099-01-01T10:00", "note": "x"}).status_code, 201)
        self.assertGreaterEqual(len(aanya.get("/api/appointments").json["appointments"]), 2)

        # unauthenticated access is blocked
        anon = medivault.app.test_client()
        self.assertEqual(anon.get(f"/api/records/{recs[0]['id']}/file").status_code, 401)

    def test_signup(self):
        c = medivault.app.test_client()
        r = c.post("/api/auth/signup", json={"role": "patient", "name": "New P", "email": "new@example.com", "password": "longenough", "dob": "2000-01-01"})
        self.assertEqual(r.status_code, 201, r.json)
        self.assertEqual(c.post("/api/auth/signup", json={"role": "patient", "name": "New P", "email": "new@example.com", "password": "longenough", "dob": "2000-01-01"}).status_code, 409)


if __name__ == "__main__":
    unittest.main()
