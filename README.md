# MediVault
MediVault is a secure medical record management platform that allows patients to upload, organize, and share medical reports and prescriptions with doctors and family members through consent-based access control.

# MediVault 

**Your medical records, organized and under your control.**

MediVault is a web-based medical records management platform designed to help patients securely organize their health records and prescriptions while enabling consent-based sharing with doctors and family members.

## Features

- **User Authentication:** Separate signup and login flows for patients and doctors.
- **Patient Dashboard:** View and manage personal medical records.
- **Medical Record Management:** Upload, view, and delete PDF reports, prescriptions, and scans.
- **Doctor–Patient Connections:** Doctors can request connections with patients, who retain control over approval.
- **Consent-Based Sharing:** Patients choose which records to share with connected doctors and family members.
- **Family Connections:** Request and manage family links through mutual approval.
- **Appointment Management:** Create, view, and delete appointments.
- **Role-Based Access Control:** Restricts features and record access according to user roles and permissions.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Python, Flask |
| Database | SQLite |
| Authentication | Flask sessions, password hashing |
| API Communication | REST API, JSON |
| Deployment | Render |

## Project Structure

```text
MediVault/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api.js
│   │   └── auth.jsx
│   ├── package.json
│   └── vite.config.js
│
└── backend/
    ├── app.py
    ├── seed.py
    ├── test_api.py
    ├── requirements.txt
    └── medivault.db
```

*The structure above is representative; your actual repository may contain additional files.*

## Getting Started

### Prerequisites

Install the following:

- Python 3.10 or later
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd MediVault
```

### 2. Set Up the Backend

```bash
cd backend
python -m venv venv
```

Activate the virtual environment.

**macOS / Linux**
```bash
source venv/bin/activate
```

**Windows**
```bash
venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Configure a secure session secret before running the application:

```bash
export SECRET_KEY="your-random-secret-key"
```

Start the Flask backend:

```bash
python app.py
```

The backend runs at `http://127.0.0.1:5001` if using the default configuration in the project.

### 3. Set Up the Frontend

Open a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal.

Ensure the frontend API configuration and Vite development proxy point to the backend at `http://127.0.0.1:5001`.

## Deployment

MediVault can be deployed on Render using separate frontend and backend services.

### Backend — Render Web Service

- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn app:app`

Configure the required environment variables, including `SECRET_KEY` and `FRONTEND_ORIGIN`.

### Frontend — Render Static Site

- **Root Directory:** `frontend`
- **Build Command:** `npm ci && npm run build`
- **Publish Directory:** `dist`

Set `VITE_API_BASE_URL` to the deployed backend's base URL.

Configure CORS and session cookies appropriately for cross-origin requests. Use persistent database and file storage before relying on saved medical records in a deployed environment.

## Security and Privacy

MediVault is designed around user consent and controlled access to medical records.

- Passwords are stored as hashes rather than plaintext.
- Protected API endpoints require authentication.
- Patients control access to their records.
- Doctor and family connections require approval.
- PDF uploads are validated by file extension and PDF signature.

**Note:** This is a project implementation and is not, by itself, a guarantee of production-grade security or regulatory compliance. Additional security testing, deployment hardening, and appropriate privacy safeguards are required before handling real patient information.

## Testing

Run the backend API tests using the project's test file:

```bash
cd backend
python -m unittest test_api
```

Confirm that the test runner and test configuration match your current `test_api.py` implementation.

## Future Improvements

- Migrate from SQLite to a managed production database.
- Add persistent and secure medical-document storage.
- Improve audit logging and access monitoring.
- Add notifications for connection requests and appointments.
- Introduce stronger security controls and automated testing.
- Evaluate applicable healthcare privacy and data-protection requirements.

## Contributors

Developed as a hackathon project.

## License

Specify the license applicable to this project before distributing or reusing the source code.
