# Vastrams

Vendor & Finance Management System — full-stack web app for managing vendors, payments, cheques, financiers, and reconciliation workflows.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Express.js + MongoDB + Mongoose
- Auth: JWT (access + refresh tokens, httpOnly cookies)

## Project Structure
vendor-finance/
├── backend/
├── frontend/
├── .gitignore
└── README.md

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas URI)

### 1. Clone the repo
```bash
git clone <repo-url>
cd vendor-finance
```

### 2. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Start (auto-configures .env on first run)
# Backend
```bash
cd backend && npm run dev
```

# Frontend
```bash
cd frontend && npm run dev
```

> On first run, both will launch an interactive terminal wizard to configure .env.
> You'll be prompted for required values. Secrets are auto-generated if left empty.
> MongoDB URI is validated live before saving.

### 4. Default ports
| Service   | URL                        |
|-----------|----------------------------|
| Frontend  | http://localhost:5173       |
| Backend   | http://localhost:5000       |
| API Base  | http://localhost:5000/api   |

## Environment Variables

### backend/.env
| Variable             | Required | Description                  |
|----------------------|----------|------------------------------|
| PORT                 | No       | Server port (default 5000)   |
| MONGO_URI            | Yes      | MongoDB connection string     |
| JWT_SECRET           | No       | Auto-generated if empty       |
| JWT_REFRESH_SECRET   | No       | Auto-generated if empty       |
| SETUP_TOKEN_SECRET   | No       | Auto-generated if empty       |
| CLIENT_URL           | No       | Frontend URL for CORS         |
| SMTP_HOST            | Prod Only| SMTP server host             |
| SMTP_PORT            | Prod Only| SMTP server port (default 587)|
| SMTP_USER            | Prod Only| SMTP login username          |
| SMTP_PASS            | Prod Only| SMTP login password          |

### frontend/.env
| Variable         | Required | Description                        |
|------------------|----------|------------------------------------|
| VITE_API_URL     | No       | Backend API base URL               |
| VITE_APP_NAME    | No       | App display name (default Vastrams)|

## First-Login Account Setup Wizard
For security reasons, the default seeded admin account (`admin@vastrams.com` / `Admin@123`) is flagged. On first login, the user will be forced to complete a setup wizard:
1. **Email verification**: Verify a secure email using a case-insensitive 6-character alphanumeric OTP. (In development mode, OTP emails are sent to a pre-configured Ethereal Email sandbox with the inbox viewable at `ethereal.email/messages` using user `rowan.gerhold@ethereal.email`).
2. **New password**: Set a new, strong password matching security validation criteria.
3. **Bypass (Dev only)**: A "Skip Setup" option is available in development mode.

## Scripts
| Command              | Description                        |
|----------------------|------------------------------------|
| npm run dev          | Start with auto .env setup         |
| npm run setup-env    | Run env wizard manually            |
| npm run setup-admin  | Run admin account setup wizard CLI |

## License
Private / Internal use
