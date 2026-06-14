# 🏫 HostelDesk — Smart Complaint Management System

A full-stack complaint management system for colleges/hostels with AI-assisted categorization, real-time status tracking, and rich analytics.

## Tech Stack

- **Frontend**: React 18 + Vite, Tailwind CSS, Framer Motion, Recharts, React Query
- **Backend**: Node.js + Express.js
- **Database**: MySQL 8+
- **Auth**: Email OTP (no passwords)
- **Email**: Nodemailer (Gmail SMTP)
- **File Uploads**: Multer + Cloudinary (optional)
- **AI**: OpenAI GPT-3.5 for auto-categorization (optional)

## Features

- Email OTP authentication (no passwords)
- Raise complaints with category, priority, location, image
- Real-time status tracking (Pending → In Progress → Resolved)
- Upvote system & comment threads
- Admin dashboard with analytics charts
- AI-based auto-categorization & spam detection
- Role-based access (Student / Staff / Admin)
- Email notifications on status updates
- Feedback & star rating after resolution
- Dark/light mode, fully responsive

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8+
- Gmail account (for SMTP)

### 1. Clone & Install
```bash
git clone <repo-url>
cd hostel-complaint-system

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Database Setup
```bash
mysql -u root -p < backend/config/schema.sql
```

### 3. Environment Variables

**backend/.env**
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=hostel_complaints

JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

OPENAI_API_KEY=sk-... (optional, for AI features)

PORT=5000
FRONTEND_URL=http://localhost:5173
```

**frontend/.env**
```
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=HostelDesk
```

### 4. Run
```bash
# Backend
cd backend && npm run dev

# Frontend (new terminal)
cd frontend && npm run dev
```

Visit `http://localhost:5173`

## Folder Structure
```
hostel-complaint-system/
├── backend/
│   ├── config/         # DB connection, schema.sql
│   ├── controllers/    # Route handlers
│   ├── middleware/     # Auth, upload, validation
│   ├── models/         # DB query functions
│   ├── routes/         # Express routers
│   └── utils/          # Email, AI, helpers
├── frontend/
│   └── src/
│       ├── components/ # Reusable UI components
│       ├── context/    # React Context (auth, theme)
│       ├── hooks/      # Custom hooks
│       ├── pages/      # Page components
│       └── utils/      # API client, helpers
└── README.md
```

## Default Roles
| Role    | Access                                 |
|---------|----------------------------------------|
| Student | Raise, view, upvote, comment complaints|
| Staff   | Update status on assigned complaints   |
| Admin   | Full access, analytics, user management|

## API Documentation

| Method | Endpoint                        | Access  | Description                  |
|--------|---------------------------------|---------|------------------------------|
| POST   | /api/auth/send-otp              | Public  | Send OTP to email            |
| POST   | /api/auth/verify-otp            | Public  | Verify OTP, get JWT          |
| GET    | /api/complaints                 | Auth    | List complaints (with filters)|
| POST   | /api/complaints                 | Auth    | Create complaint             |
| GET    | /api/complaints/:id             | Auth    | Get single complaint         |
| PATCH  | /api/complaints/:id/status      | Admin   | Update status                |
| POST   | /api/complaints/:id/upvote      | Auth    | Upvote complaint             |
| POST   | /api/complaints/:id/comments    | Auth    | Add comment                  |
| POST   | /api/complaints/:id/rating      | Auth    | Submit rating                |
| GET    | /api/admin/analytics            | Admin   | Get analytics data           |
| GET    | /api/admin/users                | Admin   | List users                   |
