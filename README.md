# TalentHub — HR Management Platform

A full-stack HR management system built with the MERN stack. Manage employees, attendance, leaves, payroll, and more — all in one place with real-time updates.

![TalentHub](https://img.shields.io/badge/TalentHub-HR%20Platform-6366f1?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)
![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-black?style=flat-square&logo=socket.io)

---

## 🌐 Live Demo

| Portal | URL |
|--------|-----|
| Frontend |https://talenthub-frontend-u0mf.onrender.com|
| Backend API | https://talenthub-backend-ehju.onrender.com/api/health |

> ⚠️ Hosted on Render free tier — backend may take ~30 seconds to wake up on first visit.

---

## ✨ Features

### Admin Portal
- 📊 **Dashboard** — company stats, headcount, attendance overview
- 👥 **Employees** — onboard, edit, offboard employees
- 🏢 **Departments** — manage company structure
- ⏱ **Attendance** — live clock-in/out tracking, mark absent
- 🌴 **Leaves** — approve/decline requests, manage leave balances per employee
- 💰 **Payroll** — generate monthly payroll, mark as paid
- ❤️ **Emergency Contacts** — next of kin for all employees
- 👤 **Users** — create portal accounts, reset passwords, activate/deactivate

### Employee Portal
- 🏠 **Dashboard** — personal stats, today's attendance, recent leaves
- ⏰ **Attendance** — clock in/out, view history
- ✈️ **Leaves** — apply for leave, track balance (annual/sick/maternity/paternity)
- 💳 **Payslips** — view monthly salary breakdown
- 👤 **Profile** — personal and employment details

### Platform Features
- 🔴 **Real-time sync** — no page refresh needed (Socket.io)
- 🔔 **Notifications** — bell icon with live updates for both portals
- 🌙 **Dark / Light mode** — employee portal theme toggle
- 🔒 **Secure auth** — JWT + refresh tokens, bcrypt passwords, account lockout
- 🔑 **Password reset** — admin generates temp password, employee forced to change on login
- 📊 **Leave balance** — tracks allocated/used/pending days per employee per year

---

## 🛠 Tech Stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| Node.js | 22 | Runtime |
| Express | 4.18 | Web framework |
| MongoDB + Mongoose | 8.0 | Database |
| Socket.io | 4.8 | Real-time events |
| JSON Web Token | 9.0 | Authentication |
| bcryptjs | 2.4 | Password hashing |
| Helmet | 7.1 | Security headers |
| express-rate-limit | 7.1 | Rate limiting |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| React | 18.2 | UI framework |
| React Router | 6.21 | Routing |
| Axios | 1.6 | HTTP client |
| Socket.io-client | 4.8 | Real-time |
| DaisyUI + Tailwind | 4.x | Styling |
| React Hot Toast | 2.4 | Notifications |
| Chart.js | 4.4 | Charts |

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone the repo
```bash
git clone https://github.com/Karthik5299/TalentHub.git
cd TalentHub
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://your_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRE=30d
CLIENT_URL=http://localhost:3000
```

Start backend:
```bash
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm start
```

### 4. Create first admin account
```bash
POST http://localhost:5000/api/auth/bootstrap
{
  "name": "Admin",
  "email": "admin@company.com",
  "password": "Admin@1234"
}
```

App runs at `http://localhost:3000`

---

## 📁 Project Structure

```
TalentHub/
├── backend/
│   └── src/
│       ├── config/         # DB connection, env validation
│       ├── controllers/    # Route handlers
│       ├── middleware/      # Auth, error handling
│       ├── models/         # Mongoose schemas
│       ├── routes/         # Express routers
│       ├── utils/          # Helpers (apiResponse, notify, tokens)
│       └── socket.js       # Socket.io setup
│
└── frontend/
    └── src/
        ├── components/
        │   ├── admin/      # AdminSidebar
        │   ├── employee/   # EmpSidebar
        │   └── common/     # Layouts, NotificationBell
        ├── context/        # AuthContext, SocketContext
        ├── pages/
        │   ├── admin/      # Dashboard, Employees, Leaves, etc.
        │   └── employee/   # Dashboard, Attendance, Leaves, etc.
        └── services/       # Axios API client
```

---

## 🔌 API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/bootstrap` | Public | Create first admin |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Private | Get current user |
| GET | `/api/employees` | Admin | List employees |
| POST | `/api/employees` | Admin | Create employee |
| GET | `/api/attendance/today` | Private | Today's attendance |
| POST | `/api/attendance/clock-in` | Private | Clock in |
| GET | `/api/leaves` | Private | Get leaves |
| POST | `/api/leaves` | Private | Apply for leave |
| PUT | `/api/leaves/:id/review` | Admin | Approve/decline leave |
| GET | `/api/leaves/balance/me` | Employee | My leave balance |
| POST | `/api/payroll/generate` | Admin | Generate payroll |
| GET | `/api/notifications` | Private | Get notifications |

---

## 🔐 Security Features

- JWT access tokens (7 day) + refresh tokens (30 day) via httpOnly cookies
- bcrypt password hashing (12 rounds)
- Account lockout after 5 failed login attempts (15 min)
- Rate limiting on all API routes
- Helmet security headers
- MongoDB injection sanitization
- Admin password reset with 24h expiring temp passwords

---

## 📡 Real-time Events (Socket.io)

| Event | Trigger | Recipients |
|-------|---------|------------|
| `leave:applied` | Employee applies leave | All admins |
| `leave:reviewed` | Admin approves/declines | Employee |
| `leave:cancelled` | Employee cancels | All admins |
| `attendance:clockIn` | Employee clocks in | All admins |
| `attendance:clockOut` | Employee clocks out | All admins |
| `payroll:generated` | Admin generates payroll | Each employee |
| `notification:new` | Any above event | Recipient |

---

## 🚢 Deployment

Deployed on **Render** (backend + frontend) with **MongoDB Atlas**.

- Backend: Render Web Service (Node)
- Frontend: Render Static Site (React build)
- Database: MongoDB Atlas (M0 free tier)

---

## 👨‍💻 Author

**Karthik**

---

## 📄 License

MIT License — free to use and modify.

## for user experience 
email:user@talenthub.com 
pass:11221822
