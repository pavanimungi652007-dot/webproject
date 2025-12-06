# Vehicle Service Booking (AutoCare)

A small full-stack demo: Express + SQLite backend and static Bootstrap frontend.

Features:
- Customer signup/login (email/password)
- Create bookings (select service, vehicle details, date/time)
- View previous bookings and status (pending/accepted/rejected)
- Admin login and booking management (accept/reject)

Quick start (Windows PowerShell):

```powershell
# from repo root
npm install
npm start
```

Open http://localhost:3000 in your browser.

Notes:
- Admin seeded: username `admin`, password `admin123` (change in production)
- JWT secret is currently hardcoded in `server.js` — set via env var in production
- SQLite DB file `data.sqlite` will be created in project root

Feel free to ask for: database migration script, Dockerfile, or React frontend version.
