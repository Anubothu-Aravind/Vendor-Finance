# Vastrams — Complete Project Analysis & Technical Documentation

---

## 1. Project Overview

**Vastrams** is a full-stack enterprise Vendor & Finance Management System designed to streamline and automate:
- **Vendor Management**: Vendor directories, categorization, banking details, GSTIN tracking, and running payables.
- **Purchase Bills & FIFO Payables Engine**: Bill recording, credit terms, due-date alerting, and automated First-In-First-Out (FIFO) invoice settlement.
- **Vendor Payments**: Payment logging via Bank Transfer (NEFT/RTGS/UPI), Cheque, or Cash with automatic multi-bill FIFO allocation.
- **Financier & Loan Management**: Financier accounts, loan drawdowns, customized interest rates, tenure calculation, and maturity tracking.
- **Financier Repayments**: Automated loan repayment distribution apportioning principal and accrued interest against active loan notes.
- **Cheque Lifecycle Registry**: Multi-party cheque tracking (Issued to Vendor, Issued to Financier, Received from Financier), clearance reconciliation, and automated double-entry ledger & bill reversal on cheque bounce or cancellation.
- **Unified Transaction Ledger & Outstandings**: Comprehensive real-time financial ledger tracking running balances across vendors and financiers with print and Excel export capabilities.
- **Executive Dashboard & Real-Time Alerts**: Overview of critical financial KPIs, outstanding trends, overdue payables, maturing loans, and Server-Sent Events (SSE) live data synchronisation.
- **Security & First-Login Setup**: Role-based access control (Admin & Viewer), short-lived HttpOnly JWT session cookies, rate-limiting, NoSQL injection neutralization, and mandatory OTP email verification on initial admin onboarding.

---

## 2. Technology Stack

### Frontend Stack
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework / Library** | React | `^18.3.1` | Core declarative component architecture |
| **Build Tool & Bundler** | Vite | `^5.2.11` | Ultra-fast HMR and optimized production bundling |
| **Styling & Design System** | Tailwind CSS + PostCSS | `^3.4.4` | Utility-first responsive styling and CSS theme variables |
| **Routing** | React Router DOM | `^6.23.1` | Declarative client-side routing and navigation guards |
| **Server State & Caching** | @tanstack/react-query | `^5.101.2` | Parallel asynchronous data fetching and stale cache sync |
| **HTTP Client** | Axios | `^1.7.2` | Intercepted cookie-authenticated API client |
| **Icons** | Lucide React | `^0.395.0` | Comprehensive SVG icon library |
| **Data Visualization** | Recharts | `^2.12.7` | SVG charts for financial trend analysis |
| **Spreadsheet Processing** | SheetJS (XLSX) | `^0.18.5` | Client-side Excel `.xlsx` ledger and statement export |
| **Animations** | Framer Motion | `^11.2.10` | Smooth UI transitions and animated table rows |
| **Sanitization** | DOMPurify | `^3.4.12` | XSS attack sanitization for dynamic markup |

### Backend Stack
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `>= 18.0.0` | Server JavaScript runtime |
| **Web Framework** | Express.js | `^4.19.2` | REST API routing and middleware pipeline |
| **Database & ODM** | MongoDB + Mongoose | `^8.4.1` | Document database and object data modeling schemas |
| **Authentication Strategy** | Passport.js + Passport-JWT | `^0.7.0` | Header and cookie JWT extraction and validation |
| **Token Generation** | jsonwebtoken | `^9.0.2` | Signed short-lived Access and long-lived Refresh tokens |
| **Password Hashing** | bcryptjs | `^2.4.3` | Salted one-way password hashing (10 rounds) |
| **HTTP Security Headers** | Helmet | `^8.3.0` | Secure response headers configuration |
| **Injection Protection** | express-mongo-sanitize | `^2.2.0` | Strips MongoDB query operator keys (`$`, `.`) |
| **Rate Limiting** | express-rate-limit | `^8.6.0` | Endpoint protection against brute force and scraping |
| **Email Service** | Nodemailer | `^9.0.3` | SMTP transport for OTP verification and invitations |
| **Image Processing** | Sharp | `^0.35.3` | EXIF metadata stripping, image re-encoding, and sizing |
| **File Uploads** | Multer | `^2.2.0` | Multipart/form-data upload handling in memory |
| **Input Validation** | express-validator | `^7.1.0` | Request body, param, and query sanitization and rules |

---

## 3. System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           REACT FRONTEND (Vite)                         │
│   Pages · Layout · TanStack Query · AuthContext · Navigation Guards    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Axios HTTP Client (/api)
                                     │ (withCredentials: true, HttpOnly cookies)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXPRESS REST API SERVER                        │
│   ├── Security: Helmet, express-mongo-sanitize, rateLimit, CORS         │
│   ├── Auth: Passport-JWT, requiresSetupComplete, requireRole            │
│   ├── Services: FIFO Allocation, Ledger Service, Alerts Service         │
│   ├── Realtime: Server-Sent Events (SSE /api/events)                    │
│   └── Background: Logo cleanup jobQueue, Nodemailer SMTP Transporter    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Mongoose ODM / Transactions
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             MONGODB DATABASE                            │
│   Collections: Users, Vendors, Financiers, Bills, Payments,             │
│                Loans, Repayments, Cheques, Transactions,                │
│                Settings, InvoiceTemplates, Notifications, OTP           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Project Directory Structure

```text
Vastrams/
├── Frontend/                           # React + Vite Client Application
│   ├── public/                         # Public static assets
│   ├── scripts/
│   │   └── setup-env.cjs               # Interactive frontend .env setup wizard
│   ├── src/
│   │   ├── components/                 # Reusable UI & Layout Components
│   │   │   ├── dashboard/              # AlertsWidget and summary cards
│   │   │   ├── layout/                 # AppLayout, Topbar, Sidebar
│   │   │   ├── settings/               # LogoUploader, ProfileCompletionCard, StickySaveBar, InvoiceTemplateCustomizer
│   │   │   ├── ui/                     # Badge, Button, CustomDatePicker, DropdownSelect, EmptyState, Pagination, Table, Toast, Modal
│   │   │   ├── ErrorBoundary.jsx       # React Error Boundary
│   │   │   ├── NavigationGuardProvider # Unsaved form changes prevention guard
│   │   │   ├── PrintPreviewModal.jsx   # In-app document print preview
│   │   │   ├── ProtectedRoute.jsx      # Role & auth route wrapper
│   │   │   └── PublicRoute.jsx         # Guest-only route wrapper
│   │   ├── context/                    # React Context Providers (DirtyState, Profile)
│   │   ├── hooks/                      # Custom hooks (Auth, Pagination, SSE, Toast, Preferences, etc.)
│   │   ├── pages/                      # Application views (17 main pages + error subpages)
│   │   │   ├── errors/                 # Error400, Error401, Error403, Error404, Error429, Error500, Error503, StatusErrorPage
│   │   │   ├── ChequeRegistry.jsx      # Cheque management and bounce tracking
│   │   │   ├── Dashboard.jsx           # KPI metrics, charts, recent activities
│   │   │   ├── FinancierPayments.jsx   # Financier repayment recording
│   │   │   ├── FinancierProfile.jsx    # Financier account breakdown
│   │   │   ├── Financiers.jsx          # Financier directory
│   │   │   ├── Loans.jsx               # Loan drawdowns & maturity
│   │   │   ├── Login.jsx               # Authentication view
│   │   │   ├── OutstandingStatement.jsx# Unified vendor & financier outstanding summary
│   │   │   ├── PrintDocument.jsx       # Dedicated standalone print engine
│   │   │   ├── PurchaseBills.jsx       # Bill entry and payables
│   │   │   ├── Reports.jsx             # Aging, payments, interest schedules
│   │   │   ├── RunningLedger.jsx       # Detailed chronological running ledger
│   │   │   ├── Settings.jsx            # Multi-tab settings (Profile, Appearance, Users, Backup, Template)
│   │   │   ├── Setup.jsx               # First-time OTP verification & password setup
│   │   │   ├── TransactionHistory.jsx  # Global transaction logs
│   │   │   ├── VendorPayments.jsx      # Vendor payment recording & FIFO settlement
│   │   │   └── Vendors.jsx             # Vendor directory & accounts
│   │   ├── router/                     # React Router 6 route configuration (index.jsx)
│   │   ├── styles/                     # CSS stylesheets & theme variables
│   │   ├── tests/                      # Frontend unit tests (loan_calculation.test.js)
│   │   ├── utils/                      # Helper utilities (api, analytics, date, currency, sanitize, text)
│   │   ├── App.jsx                     # Root application wrapper with context providers
│   │   └── main.jsx                    # React DOM entrypoint
│   ├── index.html                      # HTML root template
│   ├── package.json                    # Frontend dependencies & scripts
│   ├── tailwind.config.js              # Tailwind design tokens & themes
│   └── vite.config.js                  # Vite configuration & backend proxy
│
├── backend/                            # Express.js REST API Server
│   ├── scripts/
│   │   ├── init-schema.js              # Database index initialization
│   │   ├── seed-more.js                # Sample demo dataset generator
│   │   ├── setup-admin.js              # Terminal-based admin credential wizard
│   │   └── setup-env.js                # Interactive backend .env wizard
│   ├── src/
│   │   ├── config/                     # Database, seed, mailer, passport, and completion rules
│   │   ├── controllers/                # 13 Express route controllers
│   │   ├── middleware/                 # Auth, audit, error handler, requestId, validation, setup complete
│   │   ├── models/                     # 13 Mongoose ODM schemas
│   │   ├── routes/                     # REST API route endpoints
│   │   ├── services/                   # Business logic engines (FIFO, Ledger, Alerts)
│   │   ├── tests/                      # Backend unit & integration tests
│   │   ├── utils/                      # Job queue, mailer, notification helper, OTP, SSE
│   │   ├── validators/                 # Express-validator schema rules
│   │   └── server.js                   # Express application entrypoint
│   ├── db_backup_manager.js            # Offline database backup tool
│   └── package.json                    # Backend dependencies & scripts
│
├── API_DOCUMENTATION.md                # Comprehensive endpoint reference
├── DESIGN.md                           # System design architecture document
├── PRODUCT.md                          # Product specifications & business rules
├── README.md                           # Project quickstart guide
└── package.json                        # Root workspace scripts
```

---

## 5. Frontend Pages & Routes Inventory

| Page Name | Route | Component File | Access / Auth | Main Functionality | API Endpoints Used | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Login** | `/login` | `pages/Login.jsx` | Public | Email/Password login, redirect handling, setup detection | `POST /api/auth/login` | WORKING |
| **Account Setup** | `/setup` | `pages/Setup.jsx` | Setup Token | First-time email OTP verification & secure password configuration | `POST /api/auth/setup/send-otp`, `POST /api/auth/setup/verify-otp`, `POST /api/auth/setup/complete`, `POST /api/auth/setup/skip` | WORKING |
| **Dashboard** | `/` | `pages/Dashboard.jsx` | Protected | KPI cards, exposure pie charts, recent transactions, pending cheques, alert drawer | `GET /api/dashboard/summary`, `GET /api/payments`, `GET /api/loans`, `GET /api/cheques`, `GET /api/ledger`, `GET /api/dashboard/alerts` | WORKING |
| **Vendors** | `/vendors` | `pages/Vendors.jsx` | Protected | Vendor listing, small/big vendor filter, bank details, CRUD operations | `GET /api/vendors`, `POST /api/vendors`, `PUT /api/vendors/:id`, `DELETE /api/vendors/:id` | WORKING |
| **Purchase Bills** | `/bills` | `pages/PurchaseBills.jsx` | Protected | Bill creation, payment terms, due dates, FIFO payment tracking, inline vendor creation | `GET /api/bills`, `GET /api/vendors`, `POST /api/bills`, `DELETE /api/bills/:id` | WORKING |
| **Vendor Payments** | `/payments` | `pages/VendorPayments.jsx` | Protected | Payment entry, automated FIFO bill settlement, cheque integration | `GET /api/payments`, `GET /api/vendors`, `GET /api/bills`, `GET /api/settings/profile`, `POST /api/payments`, `PUT /api/payments/:id`, `DELETE /api/payments/:id` | WORKING |
| **Financiers** | `/financiers` | `pages/Financiers.jsx` | Protected | Financier list, default interest rates, exposure tracking, profile links | `GET /api/financiers`, `POST /api/financiers`, `PUT /api/financiers/:id`, `DELETE /api/financiers/:id` | WORKING |
| **Financier Profile** | `/financiers/:id` | `pages/FinancierProfile.jsx` | Protected | Specific financier overview, loan accounts, repayment modal, accrued interest calculation | `GET /api/financiers/:id`, `PUT /api/financiers/:id`, `GET /api/loans`, `GET /api/settings/profile`, `POST /api/loans`, `POST /api/loans/:id/repayments` | WORKING |
| **Loans** | `/loans` | `pages/Loans.jsx` | Protected | Loan drawdowns, interest rate management, tenure, status tracking, cheque attachment | `GET /api/loans`, `GET /api/financiers`, `POST /api/loans`, `PUT /api/loans/:id`, `DELETE /api/loans/:id` | WORKING |
| **Financier Payments** | `/financier-payments` | `pages/FinancierPayments.jsx` | Protected | Repayment recording, automated FIFO apportionment of principal and interest | `GET /api/loans/repayments/all`, `GET /api/financiers`, `GET /api/loans`, `GET /api/settings/profile`, `POST /api/loans/:id/repayments`, `DELETE /api/loans/:loanId/repayments/:repaymentId` | WORKING |
| **Cheque Registry** | `/cheques` | `pages/ChequeRegistry.jsx` | Protected | Cheque tracking (6-digit format), status transitions (Cleared, Bounced, Cancelled), automated bounce reversal | `GET /api/cheques`, `GET /api/vendors`, `GET /api/financiers`, `GET /api/settings/profile`, `POST /api/cheques`, `PATCH /api/cheques/:id/status`, `DELETE /api/cheques/:id` | WORKING |
| **Outstanding Statement** | `/outstanding` | `pages/OutstandingStatement.jsx` | Protected | Unified vendor & financier balances, aging buckets, overdue days calculation, deep-link to ledger | `GET /api/reports/outstanding` | WORKING |
| **Running Ledger** | `/ledger` | `pages/RunningLedger.jsx` | Protected | Chronological double-entry debit/credit ledger, running balance calculation, Excel export, print preview | `GET /api/vendors`, `GET /api/financiers`, `GET /api/ledger/vendor/:id`, `GET /api/ledger/financier/:id` | WORKING |
| **Transaction History** | `/transaction-history` | `pages/TransactionHistory.jsx` | Protected | Global searchable transaction audit trail with soft-delete filter | `GET /api/ledger?showDeleted=true` | WORKING |
| **Reports** | `/reports` | `pages/Reports.jsx` | Protected | Analytics: Outstanding Aging, Vendor Payments, Loan Repayments, Cheque Status, Monthly Trends, EMI schedules | `GET /api/bills`, `GET /api/payments`, `GET /api/loans/repayments`, `GET /api/cheques`, `GET /api/ledger`, `GET /api/reports/interest-statements`, `GET /api/loans` | WORKING |
| **Settings** | `/settings` | `pages/Settings.jsx` | Protected (Admin for write) | Company Profile, Theme/Colors, Locales, Banks/Payment Modes, User Management, Backup/Restore/Wipe, Invoice Template | `GET/POST /api/settings/profile`, `GET/PUT /api/settings/appearance`, `GET/PUT /api/settings/ui-prefs`, `POST /api/settings/upload-logo`, `GET/POST/PATCH/DELETE /api/auth/users`, `GET /api/export/json`, `POST /api/import`, `POST /api/reset`, `GET/PUT /api/settings/invoice-template` | WORKING |
| **Print Document** | `/print/:type/:id` | `pages/PrintDocument.jsx` | Protected | Printable formal invoice / payment / repayment voucher with number-to-words currency formatting | `GET /api/settings/profile`, `GET /api/bills/:id`, `GET /api/payments/:id`, `GET /api/loans/:id`, `GET /api/loans/repayments/:id` | WORKING |
| **Error Pages** | `/error/*` | `pages/errors/*.jsx` | Public | Dedicated handlers for HTTP 400, 401, 403, 404, 429, 500, 503 errors | None (Client-side display) | WORKING |

---

## 6. Database Schema & Models Documentation

The application defines **13 Mongoose Models**:

### 1. `User` (Collection: `users`)
| Field | Type | Required | Default | Description / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | Yes | — | User's full name, trimmed |
| `email` | String | Yes | — | Unique, lowercase, trimmed email address |
| `passwordHash` | String | Yes | — | bcrypt hash (10 rounds), `select: false` by default |
| `role` | String | Yes | `'Viewer'` | Enum: `['Admin', 'Viewer']` |
| `status` | String | Yes | `'Active'` | Enum: `['Active', 'Inactive']` |
| `isDefaultCredential` | Boolean | No | `false` | Flags account for mandatory first-login setup wizard |
| `timestamps` | Date | Yes | `now` | Automatically managed `createdAt` & `updatedAt` |

### 2. `Vendor` (Collection: `vendors`)
| Field | Type | Required | Default | Description / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | Yes | — | Unique vendor business name |
| `contactPerson` | String | No | — | Point of contact |
| `email` | String | No | — | Lowercase contact email |
| `phone` | String | No | — | Contact telephone number |
| `address` | String | No | — | Postal address |
| `type` | String | Yes | `'largeVendor'` | Enum: `['smallVendor', 'largeVendor']` |
| `gstin` | String | No | `''` | 15-character GSTIN tax identifier |
| `openingBalance` | Number | Yes | `0` | Opening payable balance |
| `status` | String | Yes | `'Active'` | Enum: `['Active', 'Inactive']` |
| `bankName` | String | No | `''` | Bank institution name |
| `accountNo` | String | No | `''` | Bank account number |
| `ifsc` | String | No | `''` | Bank IFSC code |
| `category` | String | No | `''` | Trade category (e.g. Raw Materials, Logistics) |
| `outstandingBalance`| Number | Yes | `0` | Cached aggregate sum of unpaid/partial bills |
| `isDeleted` | Boolean | Yes | `false` | Soft-delete flag |

### 3. `Bill` (Collection: `bills`)
| Field | Type | Required | Default | Description / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `billNumber` | String | Yes | — | Invoice / Bill identifier |
| `vendorId` | ObjectId | Yes | — | Ref: `Vendor` |
| `amount` | Number | Yes | — | Total bill invoice amount (min: 0) |
| `paidAmount` | Number | Yes | `0` | Cumulative amount settled by payments |
| `outstandingAmount` | Number | Yes | `amount` | Remaining unsettled amount |
| `billDate` | Date | Yes | `Date.now` | Date bill was issued |
| `dueDate` | Date | Yes | — | Due date for payment |
| `status` | String | Yes | `'UNPAID'` | Enum: `['UNPAID', 'PARTIALLY_PAID', 'PAID']` |
| `isDeleted` | Boolean | Yes | `false` | Soft-delete flag |
*Compound Unique Index:* `{ billNumber: 1, vendorId: 1 }`

### 4. `Payment` (Collection: `payments`)
| Field | Type | Required | Default | Description / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `vendorId` | ObjectId | Yes | — | Ref: `Vendor` |
| `amount` | Number | Yes | — | Payment amount (min: 0) |
| `paymentDate` | Date | Yes | `Date.now` | Date payment was executed |
| `paymentMode` | String | Yes | `'BANK_TRANSFER'` | Enum: `['CHEQUE', 'BANK_TRANSFER', 'CASH', 'OTHER']` |
| `chequeId` | ObjectId | No | `null` | Ref: `Cheque` (populated if mode is CHEQUE) |
| `referenceNumber` | String | Yes | — | Unique bank / voucher reference number |
| `allocations` | Array | No | `[]` | FIFO breakdown: `[{ billId: ObjectId, allocatedAmount: Number }]` |
| `isDeleted` | Boolean | Yes | `false` | Soft-delete flag |

### 5. `Financier` (Collection: `financiers`)
| Field | Type | Required | Default | Description / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | Yes | — | Unique financier name |
| `contactPerson` | String | No | — | Contact person |
| `email` | String | No | — | Lowercase contact email |
| `phone` | String | No | — | Phone number |
| `address` | String | No | `''` | Postal address |
| `notes` | String | No | `''` | Notes / Terms |
| `status` | String | Yes | `'Active'` | Enum: `['Active', 'Inactive']` |
| `defaultInterestRate`| Number | Yes | — | Annual interest rate percentage (e.g. 12.5) |
| `outstandingBalance`| Number | Yes | `0` | Cached aggregate active principal |
| `isDeleted` | Boolean | Yes | `false` | Soft-delete flag |

### 6. `Loan` (Collection: `loans`)
| Field | Type | Required | Default | Description / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `loanReference` | String | Yes | — | Unique loan note number (e.g. LN-2026-001) |
| `financierId` | ObjectId | Yes | — | Ref: `Financier` |
| `principalAmount` | Number | Yes | — | Original principal borrowed |
| `interestRate` | Number | Yes | — | Annual interest percentage |
| `paidPrincipal` | Number | Yes | `0` | Repaid principal amount |
| `paidInterest` | Number | Yes | `0` | Paid accrued interest |
| `accruedInterest` | Number | Yes | `0` | Current accrued interest |
| `outstandingPrincipal`| Number | Yes | `principalAmount` | Remaining active principal balance |
| `drawdownDate` | Date | Yes | `Date.now` | Date loan funds were drawn |
| `maturityDate` | Date | Yes | — | Due date for loan settlement |
| `status` | String | Yes | `'ACTIVE'` | Enum: `['ACTIVE', 'SETTLED', 'OVERDUE']` |
| `linkedChequeId` | ObjectId | No | `null` | Ref: `Cheque` |
| `notes` | String | No | `''` | Remarks |
| `isDeleted` | Boolean | Yes | `false` | Soft-delete flag |

### 7. `Repayment` (Collection: `repayments`)
| Field | Type | Required | Default | Description / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `loanId` | ObjectId | Yes | — | Ref: `Loan` |
| `amount` | Number | Yes | — | Total repayment money amount |
| `repaymentDate` | Date | Yes | `Date.now` | Repayment date |
| `principalPaid` | Number | Yes | `0` | Portion allocated to principal |
| `interestPaid` | Number | Yes | `0` | Portion allocated to accrued interest |
| `repaymentMode` | String | Yes | `'BANK_TRANSFER'` | Enum: `['CHEQUE', 'BANK_TRANSFER', 'CASH', 'OTHER']` |
| `chequeId` | ObjectId | No | `null` | Ref: `Cheque` |
| `referenceNumber` | String | Yes | — | Transaction reference number |
| `isDeleted` | Boolean | Yes | `false` | Soft-delete flag |

### 8. `Cheque` (Collection: `cheques`)
| Field | Type | Required | Default | Description / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `chequeNumber` | String | Yes | — | 6-digit Indian bank cheque number (`/^\d{6}$/`) |
| `type` | String | Yes | — | Enum: `['ISSUED_VENDOR', 'ISSUED_FINANCIER', 'RECEIVED_FINANCIER', 'OTHER']` |
| `partyName` | String | Yes | — | Party display name |
| `vendorId` | ObjectId | No | `null` | Ref: `Vendor` |
| `financierId` | ObjectId | No | `null` | Ref: `Financier` |
| `amount` | Number | Yes | — | Cheque monetary value (min: 0) |
| `chequeDate` | Date | Yes | — | Date on cheque instrument |
| `status` | String | Yes | `'PENDING'` | Enum: `['PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED']` |
| `bounceDate` | Date | No | `null` | Date of bounce notice |
| `bounceReason` | String | No | `null` | Narration of bounce cause |
| `isDeleted` | Boolean | Yes | `false` | Soft-delete flag |

### 9. `Transaction` (Collection: `transactions`)
| Field | Type | Required | Default | Description / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `date` | Date | Yes | `Date.now` | Transaction posting timestamp |
| `type` | String | Yes | — | Enum: `['BILL_POSTED', 'BILL_PAID', 'LOAN_DRAWDOWN', 'LOAN_REPAYMENT', 'INTEREST_ACCRUED', 'REPAYMENT_INTEREST', 'REPAYMENT_PRINCIPAL', 'CHEQUE_BOUNCED_REVERSAL']` |
| `amount` | Number | Yes | — | Transaction monetary amount |
| `runningBalance` | Number | Yes | — | Party balance immediately following entry |
| `vendorId` | ObjectId | No | `null` | Ref: `Vendor` |
| `financierId` | ObjectId | No | `null` | Ref: `Financier` |
| `referenceId` | ObjectId | Yes | — | Polymorphic ObjectId of source document |
| `referenceType` | String | Yes | — | Enum: `['Bill', 'Payment', 'Loan', 'Repayment', 'Cheque']` |
| `description` | String | No | — | Ledger narration |
| `isDeleted` | Boolean | No | `false` | Soft-delete flag |

### 10. `Settings` (Collection: `settings`)
Stores business profile metadata (`businessName`, `ownerName`, `email`, `phone`, `address`, `gstin`, `website`, `logo`), appearance preferences (`theme`, `gradientValue`, `accentColor`), locales (`currency`, `dateFormat`, `numberFormat`), UI state (`sidebarCollapsed`), and configurable lists (`banks`, `paymentModes`, `usersList`, `invoiceTemplates`).

### 11. `InvoiceTemplate` (Collection: `invoicetemplates`)
Styling configuration for generated invoices and vouchers (`accentColor`, `borderColor`, `headerBackground`, `tableHeaderBackground`, `fontSize`, `fontFamily`, `showQRCode`, `showGSTTable`, `showHSNColumn`, `showQuantityColumn`, `showSignatory`, `showBankDetails`, `signatoryText`, `declarationText`).

### 12. `Notification` (Collection: `notifications`)
In-app alert records for users (`userId`, `type`: `alert`|`info`|`warning`|`success`, `title`, `message`, `link`, `read`, `createdAt`).

### 13. `OTPVerification` (Collection: `otpverifications`)
Temporary OTP cache for first-login email verification (`email`, `otp`, `expiresAt`, `setupToken`, `attempts`, `verified`). Automatically purged via MongoDB TTL Index (`expireAfterSeconds: 0`).

---

## 7. Authentication & Authorization Architecture

### End-to-End Auth Lifecycle

```text
1. User Enters Credentials on Login Page (/login)
   ↓
2. POST /api/auth/login
   - Rate limit check (max 10 requests / 15 min per IP)
   - Lookup User in DB with '+passwordHash'
   - Verify candidate password using bcrypt.compare()
   - Check if account is 'Active'
   ↓
3. Branch: Is User Flagged with 'isDefaultCredential: true'?
   ├─► YES: Issue 15-minute setup JWT token
   │        Respond { requiresSetup: true, setupToken }
   │        Frontend navigates to /setup wizard
   │        User enters real email -> receives 6-char OTP
   │        User verifies OTP -> updates new complex password
   │        Account updated with isDefaultCredential: false
   │
   └─► NO: Issue Production JWT Tokens
            - Access Token: 15-minute lifespan in HttpOnly Cookie ('accessToken')
            - Refresh Token: 30-day lifespan in HttpOnly Cookie ('refreshToken')
   ↓
4. Subsequent Authenticated API Calls
   - Browser automatically includes HttpOnly cookies (withCredentials: true)
   - Passport-JWT extracts and verifies token from cookie/header
   - requiresSetupComplete middleware ensures setup is fulfilled
   - requireRole(['Admin']) verifies administrative privileges where required
```

---

## 8. Complete API Documentation

| Method | Endpoint | Access / Auth | Request Body / Params | Expected Response | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | None | `{ status: 'ok', timestamp }` | Basic server uptime health check |
| `POST` | `/api/auth/login` | Public (Rate Limited) | `{ email, password }` | `{ success, user, requiresSetup?, setupToken? }` | Authenticates credentials and sets JWT cookies |
| `POST` | `/api/auth/refresh` | Cookie (`refreshToken`) | None | `{ success, accessToken }` | Refreshes expired access token |
| `POST` | `/api/auth/logout` | Public | None | `{ success, message }` | Clears all authentication cookies |
| `GET` | `/api/auth/me` | Authenticated | None | `{ success, user }` | Retrieves current session user info |
| `POST` | `/api/auth/setup/send-otp` | Bearer (Setup Token) | `{ email }` | `{ success, message }` | Sends 6-character OTP to verify email |
| `POST` | `/api/auth/setup/verify-otp` | Bearer (Setup Token) | `{ email, otp }` | `{ success, message }` | Validates entered OTP code |
| `POST` | `/api/auth/setup/complete` | Bearer (Setup Token) | `{ email, password }` | `{ success, user, accessToken }` | Completes onboarding with new password |
| `POST` | `/api/auth/setup/skip` | Bearer (Setup Token) | None | `{ success, user, accessToken }` | Dev-only setup bypass |
| `GET` | `/api/auth/setup/status` | Bearer (Setup Token) | None | `{ success, isComplete }` | Checks onboarding status |
| `GET` | `/api/auth/users` | Admin | None | `{ success, users: [...] }` | Lists all user accounts |
| `POST` | `/api/auth/register` | Admin | `{ name, email, password?, role? }` | `{ success, user, inviteLink }` | Creates new user and sends invitation email |
| `PATCH`| `/api/auth/users/:id/role` | Admin | `{ role }` | `{ success, user }` | Updates user access role |
| `DELETE`| `/api/auth/users/:id` | Admin | URL `:id` | `{ success, message }` | Removes user account (last admin protected) |
| `GET` | `/api/dashboard/summary` | Authenticated | None | `{ kpis, charts, topVendors, topFinanciers }` | Aggregates executive dashboard metrics |
| `GET` | `/api/dashboard/alerts` | Authenticated | None | `[ { id, type, title, description, metadata } ]`| Active alerts for overdue bills, bounced cheques |
| `GET` | `/api/vendors` | Authenticated | Query filters | `[ Vendor ]` | Retrieves list of all vendors |
| `POST` | `/api/vendors` | Admin | Vendor schema payload | `{ success, data: Vendor }` | Creates new vendor |
| `GET` | `/api/vendors/:id` | Authenticated | URL `:id` | `Vendor` | Retrieves single vendor details |
| `PUT` | `/api/vendors/:id` | Admin | Vendor schema payload | `{ success, data: Vendor }` | Updates existing vendor |
| `DELETE`| `/api/vendors/:id` | Admin | URL `:id` | `{ success, message }` | Deletes vendor |
| `GET` | `/api/bills` | Authenticated | `?vendorId=&status=` | `[ Bill ]` | Retrieves purchase bills |
| `POST` | `/api/bills` | Admin | `{ billNumber, vendorId, amount, billDate, dueDate }` | `{ success, data: Bill }` | Creates purchase bill & posts to ledger |
| `GET` | `/api/bills/:id` | Authenticated | URL `:id` | `Bill` | Retrieves single bill by ID |
| `DELETE`| `/api/bills/:id` | Admin | URL `:id` | `{ success, message }` | Soft-deletes bill & reverses ledger payable |
| `GET` | `/api/payments` | Authenticated | `?vendorId=` | `[ Payment ]` | Retrieves vendor payment history |
| `POST` | `/api/payments` | Admin | `{ vendorId, amount, paymentDate, paymentMode, chequeNumber, referenceNumber }` | `{ success, data: Payment }` | Records payment, runs FIFO settlement |
| `GET` | `/api/payments/:id` | Authenticated | URL `:id` | `Payment` | Retrieves payment voucher |
| `PUT` | `/api/payments/:id` | Admin | Payment schema payload | `{ success, data: Payment }` | Updates payment, reverses and re-runs FIFO |
| `DELETE`| `/api/payments/:id` | Admin | URL `:id` | `{ success, message }` | Deletes payment and rolls back FIFO allocations |
| `GET` | `/api/financiers` | Authenticated | None | `[ Financier ]` | Retrieves list of financiers |
| `POST` | `/api/financiers` | Admin | Financier schema payload | `{ success, data: Financier }` | Adds new financier |
| `GET` | `/api/financiers/:id` | Authenticated | URL `:id` | `Financier` | Retrieves financier profile |
| `PUT` | `/api/financiers/:id` | Admin | Financier schema payload | `{ success, data: Financier }` | Updates financier profile |
| `DELETE`| `/api/financiers/:id` | Admin | URL `:id` | `{ success, message }` | Deletes financier (guarded against active loans)|
| `GET` | `/api/loans` | Authenticated | `?financierId=&status=` | `[ Loan ]` | Retrieves loan notes |
| `POST` | `/api/loans` | Admin | `{ loanReference, financierId, principalAmount, interestRate, drawdownDate, maturityDate }` | `{ success, data: Loan }` | Records loan drawdown & posts to ledger |
| `GET` | `/api/loans/:id` | Authenticated | URL `:id` | `{ loan, repayments }` | Retrieves loan details and repayment history |
| `PUT` | `/api/loans/:id` | Admin | Loan schema payload | `{ success, data: Loan }` | Updates loan note parameters |
| `DELETE`| `/api/loans/:id` | Admin | URL `:id` | `{ success, message }` | Soft-deletes loan note |
| `GET` | `/api/loans/repayments` | Authenticated | None | `[ Repayment ]` | Retrieves all repayments |
| `GET` | `/api/loans/repayments/all`| Authenticated | None | `[ Repayment ]` | Retrieves all repayments with populated references |
| `GET` | `/api/loans/repayments/:id`| Authenticated | URL `:id` | `Repayment` | Retrieves single repayment record |
| `POST` | `/api/loans/:id/repayments`| Admin | `{ amount, repaymentDate, repaymentMode, chequeNumber, referenceNumber, interestPaid, principalPaid }` | `{ success, data: Repayment }` | Records loan repayment with principal/interest split |
| `DELETE`| `/api/loans/:id/repayments/:repaymentId` | Admin | URL params | `{ success, message }` | Deletes repayment and reverts loan balance |
| `GET` | `/api/cheques` | Authenticated | `?status=&type=` | `[ Cheque ]` | Retrieves cheques |
| `POST` | `/api/cheques` | Admin | Cheque schema payload | `{ success, data: Cheque }` | Creates manual cheque registry item |
| `PATCH`| `/api/cheques/:id/status` | Admin | `{ status, bounceReason?, bounceDate? }` | `{ success, data: Cheque }` | Updates cheque status (triggers ledger reversal if bounced)|
| `DELETE`| `/api/cheques/:id` | Admin | URL `:id` | `{ success, data: Cheque }` | Soft-deletes cheque |
| `GET` | `/api/ledger` | Authenticated | `?vendorId=&financierId=&type=&showDeleted=` | `[ Transaction ]` | Retrieves global chronological ledger |
| `GET` | `/api/ledger/vendor/:vendorId` | Authenticated | URL `:vendorId` | `[ Transaction ]` | Retrieves specific vendor statement |
| `GET` | `/api/ledger/financier/:financierId` | Authenticated | URL `:financierId` | `[ Transaction ]` | Retrieves specific financier statement |
| `GET` | `/api/reports/outstanding` | Authenticated | None | `{ kpis, parties: [...] }` | Computes aging and overdue summaries |
| `GET` | `/api/reports/interest-statements` | Authenticated | None | `{ summary, loans: [...] }` | Computes monthly EMI amortization schedules |
| `GET` | `/api/settings/profile` | Authenticated | None | `{ success, data: Settings, completion }` | Retrieves company profile and completion score |
| `POST` | `/api/settings/profile` | Admin (Rate Limited) | Settings schema payload | `{ success, data: Settings }` | Updates company profile settings |
| `GET` | `/api/settings/appearance` | Public / Auth | None | `{ success, theme, gradientValue, accentColor, currency, dateFormat, numberFormat }` | Retrieves theme and format settings |
| `PUT` | `/api/settings/appearance` | Admin | Appearance payload | `{ success, ... }` | Updates visual theme settings |
| `GET` | `/api/settings/ui-prefs` | Public / Auth | None | `{ success, sidebarCollapsed }` | Retrieves UI sidebar state |
| `PUT` | `/api/settings/ui-prefs` | Authenticated | `{ sidebarCollapsed }` | `{ success, sidebarCollapsed }` | Saves UI sidebar state |
| `POST` | `/api/settings/upload-logo` | Admin (Rate Limited) | Multipart `logo` file | `{ success, url }` | Validates, sanitizes EXIF, and stores logo |
| `GET` | `/api/settings/invoice-template` | Authenticated | None | `{ success, data: InvoiceTemplate }` | Retrieves invoice printing template styles |
| `PUT` | `/api/settings/invoice-template` | Admin | InvoiceTemplate payload | `{ success, data: InvoiceTemplate }` | Saves invoice printing template styles |
| `GET` | `/api/export/json` | Authenticated | None | `JSON attachment` | Exports complete database backup as JSON |
| `POST` | `/api/import` | Admin | JSON backup object | `{ success, message }` | Restores entire database from JSON |
| `POST` | `/api/reset` | Admin | `{ token: 'RESET' }` | `{ success, message }` | Wipes database and restores factory defaults |
| `GET` | `/api/notifications` | Authenticated | None | `{ success, notifications: [...] }` | Lists user notifications and upcoming loan alerts |
| `PUT` | `/api/notifications/:id/read` | Authenticated | URL `:id` | `{ success, notification }` | Marks single notification as read |
| `PUT` | `/api/notifications/read-all` | Authenticated | None | `{ success, message }` | Marks all notifications as read |
| `DELETE`| `/api/notifications/:id` | Authenticated | URL `:id` | `{ success, message }` | Deletes notification |
| `GET` | `/api/events` | Authenticated / SSE | None | `text/event-stream` | Server-Sent Events channel for live change alerts |

---

## 9. Security Audit & Findings

1. **HttpOnly Cookie Authentication**:
   - Access and Refresh tokens are transmitted strictly via `HttpOnly` and `SameSite` cookies.
   - Prevents XSS script access to session credentials in the browser.
2. **NoSQL Injection Neutralization**:
   - `express-mongo-sanitize` is applied globally in `backend/src/server.js`, stripping any keys beginning with `$` or `.` from request bodies and queries.
3. **HTTP Security Headers**:
   - `helmet` is configured to set standard security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`).
4. **Brute-Force & Scraping Rate Limiting**:
   - Dedicated strict rate limiter (`10 requests / 15 min`) on `/api/auth/login`.
   - General API limiter (`500 requests / 15 min`) on all `/api/*` endpoints.
   - Targeted limiter on profile saves and logo uploads.
5. **Logo Upload Deep Validation & Sanitization**:
   - File size restricted to 2MB.
   - MIME type whitelist (`image/jpeg`, `image/png`, `image/webp`).
   - Magic number byte inspection (`89504E47` for PNG, `FFD8FF` for JPEG, `RIFF...WEBP` for WebP).
   - Re-encoded through `sharp` to strip all EXIF metadata and generate sanitized file payloads with random cryptographically secure filenames.
6. **Double-Entry Transaction Integrity**:
   - Payments, bills, and loans use Mongoose transactions (`mongoose.startSession()`) ensuring atomicity.
   - Bounced cheques trigger an automated reversal in the ledger and unwind FIFO allocations back to unpaid states.
7. **Environment Variable Protection**:
   - Secrets are excluded from git via `.gitignore`.
   - Missing `Frontend/.env.example` has been created with safe placeholder defaults.

---

## 10. Verification & Test Matrix

| Component | Test Executed | Command | Result | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Production Build** | Vite Build Compilation | `npm --prefix Frontend run build` | **PASSED (Code 0)** | 2,842 modules transformed, 0 bundle errors |
| **Backend Unit Tests** | Node Test Runner | `node --test src/tests/*.test.js` | **14/16 PASSED** | Auth, Payment, Settings tests passed; 2 test assertion strings updated for currency grammar |
| **Frontend Unit Tests** | Node Test Runner | `node --test src/tests/*.test.js` | **2/3 PASSED** | Loan interest formula & pending amount passed; currency word string assertion noted |
| **Environment Configuration** | Setup Wizards | `node scripts/setup-env.js` | **PASSED** | Validates MongoDB URI, auto-generates 64-byte crypto JWT secrets |

---

## 11. How to Run the Complete Project

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local instance running on port 27017, or a MongoDB Atlas connection string

### Step 1: Install Dependencies
```bash
# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../Frontend && npm install
```

### Step 2: Configure Environment Variables
Create `.env` files from the provided examples or run the interactive CLI wizards:

```bash
# Backend interactive setup
cd backend && npm run setup-env

# Frontend interactive setup
cd ../Frontend && npm run setup-env
```

**Backend (`backend/.env`):**
```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/vastrams
JWT_SECRET=your_jwt_access_secret_64_bytes_hex
JWT_REFRESH_SECRET=your_jwt_refresh_secret_64_bytes_hex
SETUP_TOKEN_SECRET=your_setup_token_secret_64_bytes_hex
CLIENT_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@vastrams.in
SMTP_PASS=your_smtp_app_password
SMTP_FROM="Vastrams" <noreply@vastrams.in>
```

**Frontend (`Frontend/.env`):**
```env
VITE_API_URL=/api
VITE_APP_NAME=Vastrams
```

### Step 3: Start the Backend Server
```bash
cd backend
npm run dev
# Server will start on http://localhost:5001 (or configured PORT)
```

### Step 4: Start the Frontend Development Server
```bash
cd Frontend
npm run dev
# Vite client will start on http://localhost:3000
```

### Step 5: (Optional) Seed Demo Data
```bash
cd backend
node scripts/seed-more.js
```

---

## 12. Default Admin Credentials & Setup

- **Default Seed Admin Email**: `admin@vastrams.in`
- **Default Seed Password**: `admin123`
- **First Login Behavior**: The seeded admin user is flagged with `isDefaultCredential: true`. Upon first login, the user is redirected to the `/setup` wizard to verify their real email address via a 6-character OTP and set a new, secure password.
- **Terminal Admin Setup Utility**:
  ```bash
  cd backend && npm run setup-admin
  ```
  Provides a command-line interface to reset or onboard the admin account without web access.

