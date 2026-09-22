# 🏢 PeopleFlow — Enterprise HRMS

A production-ready **Human Resource Management System** built on the **MERN stack**. PeopleFlow covers the full HR lifecycle — secure authentication, role-based access, employee records, departments, **verified attendance (GPS geofence + rotating office QR code)**, leave, tasks, file uploads, dashboards and real-time notifications — using the backend patterns found in modern product companies: refresh-token rotation, caching, background job queues, WebSockets and OpenAPI documentation.

The web app is fully responsive (phone, tablet, desktop) and supports light and dark themes.

> **New here?** Jump to [🚀 Getting Started](#-getting-started) to install and run it, then follow [👣 First-Run Walkthrough](#-first-run-walkthrough) to create the admin, HR, managers and employees, and [📍 Verified Attendance](#-verified-attendance-anti-fraud-check-in--check-out) to set up and test check-in / check-out.

---

## 📑 Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started) — install, configure, run
- [First-Run Walkthrough](#-first-run-walkthrough) — admin → HR → departments → offices → employees
- [Verified Attendance](#-verified-attendance-anti-fraud-check-in--check-out) — how it works and how to test it
- [Running the Tests](#-running-the-tests)
- [API Overview](#-api-overview)
- [Troubleshooting](#-troubleshooting)
- [Deployment](#️-deployment)

---

## ✨ Features

### 🔐 Authentication & Security
- Login with **JWT access tokens** (15 min, kept in memory) and **httpOnly refresh-token cookies** (7 days)
- **Refresh-token rotation** with replay detection (a reused token revokes the session) and a short grace window so parallel tabs don't log each other out
- Password hashing with **bcrypt**, strong password policy, forced password change on first login
- Input validation on every endpoint, **rate-limited login**, Helmet security headers, CORS allow-list
- No public registration — accounts are provisioned by Admin / HR

### 👥 Role-Based Access Control
| Role | Can do |
| --- | --- |
| **Admin** | Everything, including user accounts, roles, activation and deletion. Configures offices and reads the attendance audit log. Does **not** check in (admins aren't part of the headcount). |
| **HR** | Employees, departments, designations, office locations & QR kiosk, attendance audit & corrections, leave approvals, tasks, salary slips, manager accounts. Checks in/out like everyone else. |
| **Manager** | View employees, attendance, approve/reject leave, assign & track tasks. Checks in/out. |
| **Employee** | Check in/out, apply for leave, work on assigned tasks, profile & documents |

Every route is protected on the API **and** in the UI (navigation, pages and actions adapt to the role).

### 👨‍💼 Employee Management
- One-step onboarding: creates the login account, generates a sequential **Employee ID** (`EMP001`…, race-free counter) and the profile
- Temporary credentials emailed to the employee (or shown to HR when SMTP isn't configured)
- Search (name, ID, email), filters (department, designation, status), pagination, sorting
- Reporting manager, employment type, status, monthly **salary structure** (basic, HRA, allowances, deductions)
- Profile tabs: overview, attendance, leave, tasks, documents

### 🏢 Departments & Designations
- CRUD with case-insensitive uniqueness, department heads, salary bands per designation
- Live employee counts; deletion is blocked while employees are assigned

### 📍 Verified Attendance
- Check-in / check-out requires **logged-in account + GPS inside the office geofence + a fresh, single-use office QR code**, with the time taken from the **server clock**
- Admin/HR configure offices (location, radius, GPS accuracy limit, timezone, QR lifetime, late/half-day rules, who may correct attendance)
- Full-screen **QR kiosk** page for a tablet at the office entrance
- Immutable **audit log** of every attempt, with the reason each failed attempt was rejected
- Manual corrections by HR/Admin with a mandatory reason, fully audited
- Late and half-day detection, personal history with monthly summary, organisation-wide daily view

See [📍 Verified Attendance](#-verified-attendance-anti-fraud-check-in--check-out) for details.

### 📝 Leave Management
- Casual, sick, earned and unpaid leave with **balance tracking**
- Working-day calculation (Sundays excluded), overlap detection, balance reservation for pending requests
- Approve / reject with notes (atomic balance deduction), cancel with automatic refund

### ✅ Task Management
- Assign tasks with priority and deadline; overdue tracking
- Assignees update status; managers edit, reassign and delete

### ☁️ File Uploads
- Profile pictures, resumes, ID proofs and generated salary slips
- **Cloudinary** storage, with automatic fallback to local disk when Cloudinary isn't configured

### ⚡ Performance
- **Redis caching** for dashboards, employee lists, departments and designations (automatic invalidation on writes), with an in-memory fallback
- Compression, lean queries, indexed collections, parallel aggregations
- Frontend: route-level code splitting, request cancellation, debounced search

### 📨 Background Jobs (BullMQ)
- Email queue (credentials, salary slips, reports) with retries and exponential backoff
- **Salary slip PDF generation** (PDFKit) → stored with the employee's documents → employee notified
- **Weekly HR report** every Monday 09:00 (repeatable job) emailed to Admin & HR
- Jobs run in-process automatically when Redis isn't available

### 🔔 Real-Time Notifications (Socket.io)
- Authenticated sockets with per-user rooms
- Instant alerts for task assignments, task status changes, leave requests and decisions, new accounts and payslips
- Notification centre with unread counts; dashboards and lists refresh live; optional desktop notifications

### 📊 Dashboards
- **Admin**: workforce KPIs, 7-day attendance, department distribution, accounts by role, task overview
- **HR / Manager**: attendance, department split, leave trends, hiring trend, one-click leave approvals
- **Employee**: live shift timer with verified check-in/out, weekly hours, monthly attendance, leave balance, tasks
- Custom SVG charts with tooltips, legends and a colour-vision-deficiency-validated palette

### 📖 API Documentation
- Interactive **Swagger UI** at `/api/docs`
- OpenAPI JSON at `/api/docs.json` — import it into **Postman** to generate the full collection

---

## 🛠 Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, React Router 7, Vite, Axios, Socket.io client, Lucide icons, jsQR (QR scanning fallback) |
| Backend | Node.js, Express 5 |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcrypt, cookie-parser |
| Caching | Redis (ioredis) |
| Queues | BullMQ |
| Real-time | Socket.io |
| Files | Multer, Cloudinary, PDFKit |
| Email | Nodemailer |
| Security | Helmet, express-rate-limit, CORS |
| Docs | Swagger UI (OpenAPI 3) |
| Tests | Node's built-in test runner, in-memory MongoDB |

---

## 📂 Project Structure

```text
PeopleFlow – Enterprise HRMS
├── peopleflow-backend
│   ├── app.js                 # Express app: middleware, routes, error handling
│   ├── index.js               # Server bootstrap: DB, seed, cache, queues, sockets
│   ├── seed.js                # Creates the first admin (also runnable directly)
│   ├── config/                # DB connection, constants (roles, leave policy, attendance security)
│   ├── controllers/           # auth, user, employee, department, designation, office,
│   │                          # attendance, leave, task, dashboard, upload, notification
│   ├── models/                # Mongoose schemas (incl. office, officeQrToken,
│   │                          # attendanceVerification, attendanceAuditLog)
│   ├── routers/               # One router per module
│   ├── middleware/            # JWT auth, RBAC, validation, uploads, errors
│   ├── validators/            # Request validation rules
│   ├── services/              # attendance verification, office QR, audit log, cache,
│   │                          # storage, notifications, user lifecycle
│   ├── queues/                # BullMQ queue + job processors
│   ├── sockets/               # Socket.io server (incl. QR kiosk rooms)
│   ├── docs/                  # OpenAPI specification
│   ├── tests/                 # Attendance + geofence test suites
│   ├── utils/                 # tokens, dates, geo (Haversine), responses, email, ID generator
│   └── uploads/               # Local file storage fallback
└── peopleflow-frontend
    └── src
        ├── api/               # Axios client (auto refresh) + endpoint functions
        ├── context/           # Auth, notifications (socket), toasts
        ├── hooks/             # useFetch, useListQuery, useAction, useDebounce
        ├── components/        # Layout, shared UI, SVG charts
        ├── pages/             # Feature pages per module
        │   └── attendance/    # Check-in flow, QR scanner, office settings, kiosk, audit
        ├── routes/            # Lazy routes + auth/role guards
        ├── styles/            # Design system (responsive, light/dark)
        └── utils/             # Formatting, constants, device id, preferences
```

---

## 🚀 Getting Started

### Prerequisites

| Need | Notes |
| --- | --- |
| **Node.js 20+** | Check with `node -v` |
| **MongoDB** | A local install, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster. For Atlas, add your IP under **Network Access**. |
| A browser with location + camera | Chrome, Edge or Safari. Needed for check-in. |
| *Optional* | Redis, Cloudinary account, Gmail app password (for sending emails) |

None of the optional services are needed to run the app locally — each one has a built-in fallback.

### Step 1 — Get the code

```bash
git clone <repository-url>
cd "PeopleFlow – Enterprise HRMS"
```

(Or unzip the folder you were sent and open a terminal inside it.)

### Step 2 — Configure and start the backend

```bash
cd peopleflow-backend
npm install
cp .env.example .env        # Windows PowerShell: copy .env.example .env
```

Open `peopleflow-backend/.env` and fill in at least these values:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/peopleflow   # or your Atlas connection string
ACCESS_TOKEN_SECRET_KEY=<any long random string>
REFRESH_TOKEN_SECRET_KEY=<a different long random string>
CLIENT_URL=http://localhost:5173
TZ=Asia/Kolkata                                      # your organisation's timezone

# The very first admin account — see "First-Run Walkthrough"
ADMIN_USERNAME=Administrator
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=Admin@12345
```

> Tip: generate a secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

Start the server:

```bash
npm run dev          # auto-restarts on file changes (or: npm start)
```

You should see the database connect and `Admin user created successfully`.

- API: `http://localhost:5000/api`
- API docs (Swagger): `http://localhost:5000/api/docs`

### Step 3 — Configure and start the frontend

In a **second terminal**:

```bash
cd peopleflow-frontend
npm install
cp .env.example .env        # contains VITE_API_URL=http://localhost:5000
npm run dev
```

Open **http://localhost:5173**.

> Use `localhost` (not your computer's IP address) in the browser. Browsers only allow location and camera access on `https://` pages or on `localhost` — see [Testing on a real phone](#option-c--testing-on-a-real-phone).

### Environment variables (backend)

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `ACCESS_TOKEN_SECRET_KEY` / `REFRESH_TOKEN_SECRET_KEY` | ✅ | Two different long random secrets |
| `CLIENT_URL` | ✅ | Allowed frontend origin(s), comma separated |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first run | The first admin account (only used while no admin exists) |
| `PORT`, `NODE_ENV`, `TZ` | | Server port (default 5000), environment, timezone used for attendance days |
| `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS` | optional | SMTP. Without it, emails are printed in the backend console and temporary passwords are shown on screen to whoever creates the account |
| `REDIS_URL` | optional | Enables Redis caching and BullMQ; otherwise in-memory cache + in-process jobs |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | optional | Cloud file storage; otherwise `./uploads` |
| `OFFICE_START` | optional | Default office start time (HH:MM) for new offices; later check-ins are marked late (default 09:30) |

---

## 👣 First-Run Walkthrough

There is no sign-up page. Every account is created by someone above it:

```text
.env / seed ──► Admin
                  ├──► HR           (Admin: User Accounts → Create User)
                  ├──► Manager      (Admin or HR: User Accounts → Create User)
                  └──► Employee     (Admin or HR: Employees → Add Employee)
```

| Account | Who creates it | Where in the app | Gets |
| --- | --- | --- | --- |
| **Admin** (first) | The server, from `.env` | Automatic on startup | The password you put in `ADMIN_PASSWORD` |
| **Admin** (more) | Admin | User Accounts → Create User, role *Admin* | Temporary password |
| **HR** | Admin only | User Accounts → Create User, role *HR* | Temporary password |
| **Manager** | Admin or HR | User Accounts → Create User, role *Manager* | Temporary password |
| **Employee** | Admin or HR | Employees → Add Employee | Temporary password + Employee ID (`EMP001`…) |

**About temporary passwords:** when an account is created, a random temporary password is generated. If email is configured, it's emailed to the new person. If not, it's **shown on screen** to the person who created the account — copy it and pass it on. On first login, everyone except the seeded admin is forced to choose a new password.

Follow these steps in order the first time:

### 1. Log in as Admin
The first admin is created automatically when the backend starts, using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`. (If you started the server before filling those in, fill them in and run `npm run seed` in `peopleflow-backend`.)

Go to http://localhost:5173 and log in with that email and password. It's only used while no admin exists, so changing `.env` later won't change the password — change it in the app under **Profile / Change password**.

### 2. Create an HR account (as Admin)
1. Sidebar → **User Accounts** → **Create User**.
2. Enter the name and email, choose role **HR**, save.
3. Copy the temporary password shown (or check the HR person's inbox if email is set up).

Only an Admin can create HR and Admin accounts.

### 3. Log in as HR and set a new password
Log out (or use a private/incognito window) and log in with the HR email and temporary password. You'll be asked to set a new password straight away.

From here, HR can do the rest of the setup. Admin can do all of it too.

### 4. Create departments and designations (Admin or HR)
Every employee needs a department and a designation, so create these first:
1. **Departments** → **Add Department** (e.g. *Engineering*, *Sales*).
2. **Designations** → **Add Designation** (e.g. *Software Engineer*, *Sales Executive*).

### 5. Add an office location (Admin or HR)
Check-in won't work until at least one office exists.
1. **Office Locations** → create an office.
2. Enter the name, a short code (e.g. `HQ`), and the office's **latitude and longitude**. To get them, right-click the building in Google Maps and click the coordinates to copy them.
3. Set the **allowed radius** (default 100 m — enough to cover the building plus a small margin) and check the other rules (GPS accuracy limit, QR lifetime, office start time, half-day hours, who may correct attendance).

Details: [Office settings](#office-settings).

### 6. Create manager accounts (Admin or HR)
**User Accounts → Create User**, role **Manager**. Managers can then be picked as a *reporting manager* when you add employees.

### 7. Add employees (Admin or HR)
1. **Employees** → **Add Employee**.
2. Required: first and last name, email, department, designation, joining date and basic salary. Optional: phone, reporting manager, employment type, the rest of the salary structure.
3. Save. This creates the login account, the employee profile and the next **Employee ID** (`EMP001`, `EMP002`, …) in one step.
4. Copy the temporary password shown, or let the email deliver it.

> Use **Add Employee** (not *Create User*) for regular staff — it's the only way to create the employee profile and Employee ID.

### 8. Employee's first login
The employee logs in with their email and temporary password, sets a new password, and lands on their dashboard. From there they can **check in / check out**, apply for leave, work on tasks and upload documents.

### 9. Put the QR kiosk up in the office (Admin or HR)
On a tablet or screen at the office entrance, log in as Admin or HR, go to **Office Locations → Open QR Kiosk**. The kiosk shows a QR code that changes on its own every 45 seconds (by default) and right after each scan. Leave it running.

Employees can now check in — see the next section.

### Day-to-day flow

```text
Employee logs in ─► Check In (GPS + scan kiosk QR) ─► works ─► Check Out (GPS + scan QR)
                                   │
       Manager / HR ─► approve leave, assign tasks, view attendance
                                   │
       HR / Admin ─► review failed attempts in Attendance Audit, correct attendance with a reason,
                     generate salary slips (queued)
                                   │
       Everyone ◄── real-time notifications & live dashboards
```

---

## 📍 Verified Attendance (anti-fraud check-in / check-out)

### The rule

A check-in or check-out is recorded **only** when every one of these passes, and **all checks happen on the server**:

```text
Logged-in account  +  GPS inside the office geofence  +  valid office QR code  +  server time  =  attendance recorded
```

If any check fails, no attendance record is created, and the attempt is written to the audit log with the reason.

### What the employee sees

1. Press **Check In** (on the dashboard or **My Attendance**).
2. The browser asks for location → *"✓ You are inside the office"*.
3. The camera opens → scan the QR code on the office kiosk.
4. *"✓ Office QR verified — ✓ Check-in recorded — Checked in at 09:42 AM"*.

Check-out works the same way. If something fails, the employee gets a plain explanation (e.g. *"You appear to be outside the office location. Please move inside the office and try again."*) without any security details.

### How it works

| Step | API | What the server does |
| --- | --- | --- |
| 1 | `POST /api/attendance/verify-location` | Identifies the employee **from the login token** (IDs in the request are ignored), checks the account and employee profile are active, validates the GPS reading, calculates the distance to each active office with the **Haversine formula**, and if inside, returns a one-time `verificationId` valid for 2 minutes. |
| 2 | `POST /api/attendance/check-in` or `/check-out` | Checks the `verificationId` belongs to this user and this action, validates the scanned QR token, checks there's no existing check-in (or that there is one, for check-out), then records the attendance with the **server's clock**. |
| Kiosk | `POST /api/offices/:id/qr` | Admin/HR only. Generates a random token, stores only its **hash**, and returns a QR image. The QR contains the office code and the random token — no employee data. |

### Protections

| Attack / mistake | What happens |
| --- | --- |
| Checking in from home | GPS outside the radius → rejected |
| Faking "I'm inside" in the request | Ignored — the server calculates the distance itself |
| Missing, malformed or out-of-range GPS values | Rejected |
| Imprecise GPS (error larger than the office's limit, 100 m by default) | Rejected; employee is told to turn on precise location |
| Standing on the edge of the radius | Asked to move further inside (the GPS error could put them outside) |
| Fake-location apps | Readings claiming better than 3 m accuracy are recorded but **flagged** for review |
| Photo/screenshot of an old QR code | Expired (45 s by default) → rejected |
| Reusing a QR code, or passing it to a colleague | Each code works **once** → rejected |
| QR code from a different office | Rejected |
| Home-made, static or forged QR code | Rejected (tokens are random, server-generated and stored hashed) |
| Changing the phone's clock or timezone | Ignored — the server's time is recorded; a difference of more than 5 min is flagged |
| Sending someone else's employee ID | Ignored — the employee comes from the login token |
| Finishing another person's verification | Rejected |
| Calling the API directly without logging in / with a forged token | Rejected (401) |
| Deactivated account or inactive employee | Rejected |
| Checking in twice, or while yesterday's session is still open | Rejected |
| Checking out without a check-in, or twice | Rejected |
| Double-click / network retry / two requests at once | Exactly **one** record is created |
| Reusing a check-in location step for check-out, or after 2 minutes | Rejected |
| One phone used to check in two employees on the same day | Recorded and **flagged** |
| Hammering the API | Rate limit: 20 attendance attempts per user per 10 minutes |
| Admin checking themselves in | Not allowed — admins aren't part of the attendance headcount |

Privacy: coordinates are stored rounded to about 1 m and only at check-in / check-out. Employees never see coordinates, device IDs or fraud flags — only Admin/HR do.

### Office settings

Set per office under **Office Locations**:

| Setting | Default | Meaning |
| --- | --- | --- |
| Latitude / Longitude | — | Centre of the office |
| Allowed radius | 100 m | How far from the centre a check-in is accepted (10–5000 m) |
| Max GPS inaccuracy | 100 m | Readings less precise than this are rejected (10–500 m) |
| Time zone | server `TZ` | Used to decide which day a check-in belongs to and for display |
| QR expires after | 45 s | Lifetime of each kiosk code (15–300 s). Codes are also single-use. |
| Office starts at | `OFFICE_START` | Later check-ins are marked **late** |
| Half day below | 4 h | Shorter shifts are marked **half-day** |
| Longest shift | 16 h | An open check-in older than this no longer blocks the next day |
| Correction permissions | Admin, HR | Whether managers may also correct attendance |

### Admin / HR tools

- **Attendance** — daily view of everyone, with a verification column (verified / flagged / manual) and filter.
- **Attendance Audit** — every attempt, success or failure, with the reason, IP, device, and who made each manual change. Filter by *failed only*, reason, employee, office or date. The log can't be edited or deleted.
- **Corrections** — from an employee's attendance page, Admin/HR can fix a record (e.g. a forgotten check-out) or add a missed day. A reason is required and it's audited. Nobody can correct their own attendance.

---

## 🧪 Running the Tests

### Option A — Automated tests (about a minute)

```bash
cd peopleflow-backend
npm test
```

This runs 54 tests against a temporary **in-memory** MongoDB — your real database is never touched. (The first run downloads a MongoDB binary, so it needs internet access and takes longer.) The suites in `tests/attendance.test.js` and `tests/geo.test.js` cover the normal flow and the fraud scenarios in the table above: fake GPS, expired/reused/foreign/forged QR codes, double-clicks and simultaneous requests, forged tokens, manipulated employee IDs and timestamps, rate limiting, audit-log immutability and correction permissions.

Expected output ends with:

```text
# tests 54
# pass 54
# fail 0
```

Frontend checks:

```bash
cd peopleflow-frontend
npm run lint
npm run build
```

### Option B — Manual test on one computer

1. Start the backend and frontend ([Getting Started](#-getting-started)).
2. Complete the [First-Run Walkthrough](#-first-run-walkthrough) up to step 7, using **your current location** as the office location, and create one employee.
3. In one browser window, log in as Admin or HR and open **Office Locations → Open QR Kiosk**.
4. In a **separate browser profile or incognito window**, log in as the employee → **My Attendance** → **Check In**. Allow location, then scan the kiosk QR with the camera.
   - Holding a laptop webcam up to its own screen is awkward. It's easier to show the kiosk on a second monitor, tablet or phone, or to take a photo of the QR with your phone and hold it up to the webcam (within the 45 seconds).
5. Try to cheat. Chrome DevTools can fake your location: press **F12** → **⋮** → **More tools** → **Sensors** → **Location**.

| Try this | Expected result |
| --- | --- |
| Set the location ~1 km away and check in | "You appear to be outside the office location" |
| Block the location permission | A message asking you to turn on location |
| Scan a QR photo that's older than 45 s | "This QR code has expired" |
| Scan the same QR with a second employee | "This QR code has already been used" |
| Press **Check In** again after checking in | "You have already checked in today" |
| Check out without having checked in | "…nothing to check out from" |
| Change your computer's clock, then check in | The real server time is recorded and the record is flagged |

6. Log in as Admin/HR → **Attendance Audit** → turn on *failed only*. Each of the attempts above should be listed with its reason.

You can also call the API directly (Swagger at `/api/docs`, or Postman) to confirm that fake requests are rejected — e.g. `verify-location` with far-away coordinates, a made-up `qrCode`, or an `employeeId` in the body. A full successful check-in needs a real camera scan, because the kiosk endpoint returns only the QR image, never the raw token.

### Option C — Testing on a real phone

Phones only allow location and camera access on **HTTPS** pages, and `http://192.168.x.x` is not HTTPS. Two ways around that:

**1. HTTPS tunnel (most realistic).** Expose both apps over HTTPS with a tool such as [ngrok](https://ngrok.com/) or VS Code's **Ports → Forward a Port** (set visibility to *Public*):
- Forward port `5000` (backend) and port `5173` (frontend).
- Set `VITE_API_URL=<backend https URL>` in `peopleflow-frontend/.env`.
- Add the frontend https URL to `CLIENT_URL` in `peopleflow-backend/.env` (comma separated).
- Restart both apps and open the frontend https URL on the phone.

**2. Kiosk on the phone, check-in on the laptop.** The kiosk only *shows* a QR code, so it doesn't need HTTPS:
- Start the frontend with `npm run dev -- --host`.
- Set `VITE_API_URL=http://<your-laptop-ip>:5000` and add `http://<your-laptop-ip>:5173` to `CLIENT_URL`. Restart both.
- On the phone, open `http://<your-laptop-ip>:5173`, log in as HR/Admin and open the kiosk.
- On the laptop, open `http://localhost:5173` as the employee and scan the phone's screen with the webcam.

Phone and laptop must be on the same Wi-Fi. On Windows you may need to allow Node.js through the firewall.

---

## 📡 API Overview

All endpoints are under `/api`.

| Module | Endpoints |
| --- | --- |
| Auth | `POST /auth/login` · `POST /auth/refresh-token` · `POST /auth/logout` · `GET /auth/me` · `PATCH /auth/change-password` |
| Users | `POST/GET /users` · `GET /users/options` · `GET/PATCH/DELETE /users/:id` · `PATCH /users/:id/status` |
| Employees | `POST/GET /employees` · `GET /employees/search` · `GET /employees/profile/me` · `GET/PATCH/DELETE /employees/:id` · `POST /employees/:id/salary-slip` |
| Departments | `POST/GET /departments` · `GET/PATCH/DELETE /departments/:id` |
| Designations | `POST/GET /designations` · `GET/PATCH/DELETE /designations/:id` |
| Offices | `POST/GET /offices` · `GET/PATCH /offices/:id` · `POST /offices/:id/qr` (kiosk QR) |
| Attendance | `POST /attendance/verify-location` · `POST /attendance/check-in` · `POST /attendance/check-out` · `GET /attendance/today` · `GET /attendance/me` · `GET /attendance/audit` · `POST /attendance/manual` · `PATCH /attendance/:id/correct` · `GET /attendance` · `GET /attendance/:employeeId` |
| Leaves | `POST/GET /leaves` · `GET /leaves/me` · `GET /leaves/:id` · `PATCH /leaves/:id/approve` · `/reject` · `/cancel` |
| Tasks | `POST/GET /tasks` · `GET /tasks/me` · `GET/PATCH/DELETE /tasks/:id` |
| Dashboard | `GET /dashboard` (role-based) |
| Upload | `POST /upload/profile` · `POST /upload/resume` · `POST /upload/documents` · `DELETE /upload/:id` |
| Notifications | `GET /notifications` · `PATCH /notifications/read-all` · `PATCH /notifications/:id/read` · `DELETE /notifications/:id` |

All responses share one envelope: `{ success, message, data, meta? }`. Full request/response details are in Swagger.

---

## 🩺 Troubleshooting

| Problem | Fix |
| --- | --- |
| Backend can't connect to MongoDB | Check `MONGODB_URI`. For Atlas, add your IP under **Network Access**. For local MongoDB, make sure the service is running. |
| No admin was created / can't log in as admin | `ADMIN_EMAIL` and `ADMIN_PASSWORD` must be set before the first start. Set them and run `npm run seed`. It does nothing if an admin already exists. |
| New user didn't get an email | Email isn't configured — the temporary password was shown on screen when the account was created (and printed in the backend console). Configure `EMAIL_*` to send real emails. |
| Frontend shows network / CORS errors | `VITE_API_URL` must point to the backend, and the frontend's address must be listed in `CLIENT_URL`. Restart both after changing `.env` files. |
| "Attendance locations have not been set up yet" | Create an office under **Office Locations**. |
| Always "outside the office" | Check the office latitude/longitude aren't swapped, and the radius is large enough. Desktop computers often only get an approximate location from Wi-Fi — use a phone, raise the radius and max inaccuracy for testing, or fake the location in DevTools. |
| "Location is not precise enough" | Turn on precise location, wait a few seconds, or raise **Max GPS inaccuracy** for that office. |
| Location or camera prompt never appears | The page must be on `https://` or `http://localhost`. See [Testing on a real phone](#option-c--testing-on-a-real-phone). |
| Admin has no Check In button | Expected — admins don't record attendance. Use an HR, manager or employee account. |
| `npm test` hangs on first run | It's downloading the in-memory MongoDB binary; needs internet access. |

---

## ☁️ Deployment

**Backend (Render / Railway)** — root `peopleflow-backend`, build `npm install`, start `npm start`. Set `NODE_ENV=production`, `CLIENT_URL=https://your-frontend.vercel.app`, and the secrets above. Add Redis (Upstash / Railway) and Cloudinary for production — the local `uploads/` folder is not persistent on most hosts.

**Frontend (Vercel / Netlify)** — root `peopleflow-frontend`, build `npm run build`, output `dist`, env `VITE_API_URL=https://your-api.onrender.com`. Add an SPA rewrite so deep links work (Vercel: rewrite all routes to `/index.html`; Netlify: `/* /index.html 200`).

Both apps **must** be served over HTTPS in production: the refresh cookie is sent with `SameSite=None; Secure`, and browsers only allow location and camera access on HTTPS pages.

Employee location tracking is regulated in many countries. Tell employees what is collected (location only at the moment of check-in/check-out) and follow your local privacy and employment laws.

---

## 🚀 Future Improvements
- Payroll processing & performance reviews
- Company announcements and calendar integration
- Multi-tenant support, two-factor authentication
- Docker, CI/CD pipeline, frontend test suite
