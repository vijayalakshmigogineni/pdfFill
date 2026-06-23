# PDF Marker & AutoFill Platform

## Prerequisites

Install **Node.js v18 or later** before anything else:
https://nodejs.org/en/download

Verify installation by running:
```
node -v
npm -v
```

---

## Setup (one-time)

### 1. Backend

Open a terminal in the `backend` folder:

```
cd backend
```

Copy the example env file and fill in your database URL:

```
copy .env.example .env
```

Open `backend\.env` and set your Neon PostgreSQL connection string:

```
PORT=5000
DATABASE_URL=postgresql://neondb_owner:<password>@<host>/neondb?sslmode=require&channel_binding=require
BASE_URL=http://localhost:5000
```

Install dependencies:

```
npm install
```

### 2. Frontend

Open a second terminal in the `frontend` folder:

```
cd frontend
npm install
```

---

## Running the app

You need **two terminal windows** open at the same time.

**Terminal 1 — Backend:**
```
cd backend
npm run dev
```
You should see:
```
✅ Connected to Neon PostgreSQL
✅ Database tables ready
PDF Marker backend running on port 5000
```

**Terminal 2 — Frontend:**
```
cd frontend
npm run dev
```
You should see:
```
VITE ready in ...ms
Local: http://localhost:5173/
```

Open your browser at **http://localhost:5173**

---

## Quick start (Windows — double-click)

Double-click `start.bat` in the project root. It opens both servers in separate windows automatically.

---

## Workflow

1. **Upload PDF** — drag a PDF on the Dashboard and click Upload
2. **Mark Fields** — click "Mark Fields" → add Text/Checkbox/Signature boxes by clicking the toolbar buttons, drag to position, resize with the bottom-right handle, double-click the label to rename
3. **Save Markings** — Click mark savings option
4. **Fill Form** — click "Go To Fill Mode" and fill in values
5. **Download** — click Download to get the completed PDF

---

## Notes

- The database is hosted on Neon (cloud PostgreSQL) — no local DB needed.
- Uploaded PDFs are stored in `backend/uploads/` on each machine separately.
- The `node_modules` folders are not included in the zip — `npm install` recreates them.
