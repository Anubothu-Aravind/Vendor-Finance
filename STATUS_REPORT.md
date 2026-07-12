# System Status & Audit Report

This document serves as the comprehensive audit log, database architecture guide, API catalog, and codebase optimization blueprint for the **Vastrams Vendor & Finance Management** platform.

---

## 1. Audit Log of Resolved Issues & Optimizations

### 🚀 Setup Wizard Skip Logic Bypass
- **Problem**: Skipping setup wizard in dev mode mutated database flags, bypassing setup globally instead of just per-session, which caused conflicts in production scenarios.
- **Solution**: Encoded `setupBypassed: true` into the session JWT access and refresh tokens. Modified the `requiresSetupComplete.js` middleware to decode the Authorization header directly and bypass setup check if this flag is present in the token payload.

### 🧹 React List Key Cleanups (Index-as-Key Anti-Pattern)
- **Problem**: Numerous map renders were using `key={idx}` or virtual `key={item.id}` which caused DOM performance issues and state mismatch.
- **Solution**: Swapped to exact database `_id` values across the following components:
  - `ChequeRegistry.jsx`
  - `FinancierPayments.jsx`
  - `PurchaseBills.jsx`
  - `Vendors.jsx`
  - `Financiers.jsx`
  - `Loans.jsx`
  - `OutstandingStatement.jsx`
  - `FinancierProfile.jsx`
  - `Settings.jsx`

### 🛡️ Asynchronous Fetch Cleanup & Memory Leak Avoidance
- **Problem**: 18 instances of asynchronous API calls inside `useEffect` hook blocks lacked AbortController cleanup triggers, causing stale closure execution and unmounted component state updates.
- **Solution**: Standardized and refactored all fetch structures in:
  - `useDashboardAlerts.js`
  - `useDashboardSummary.js`
  - `ChequeRegistry.jsx`
  - `FinancierPayments.jsx`
  - `FinancierProfile.jsx`
  - `Financiers.jsx`
  - `Loans.jsx`
  - `OutstandingStatement.jsx`
  - `PurchaseBills.jsx`
  - `Reports.jsx`
  - `RunningLedger.jsx` (2 hooks)
  - `Settings.jsx` (4 hooks: profile, vendors, financiers, loans)
  - `TransactionHistory.jsx`
  - `VendorPayments.jsx`
  - `Vendors.jsx`

### 📊 Reports Module Complete Redesign
- **Problem**: Reports page lacked advanced segmentation, date filtering, and detailed amortized interest statements.
- **Solution**: Rewrote the module to feature:
  - Global From/To Date filter at the layout top applying client-side across all datasets.
  - **Outstanding Aging Report**: Grouped unpaid bills by age buckets (0-30, 31-60, 61-90, 90+ days) and vendor list.
  - **Vendor Payment Summary**: Grouped payments by vendor, with a Recharts distribution bar chart.
  - **Loan Repayments**: Grouped financier principal borrowing vs. repayment splits with an interactive bar comparison, combined with monthly amortized interest accrual schedules.
  - **Cheque Status**: Cheques grouped by PENDING, CLEARED, and BOUNCED states.
  - **Monthly Transactions**: Cash inflow (debits) vs. outflow (credits) over months.

### 🔔 System Notifications Engine
- **Problem**: Bell icon `🔔` was non-functional and lacked system alerts integration.
- **Solution**: Built an end-to-end database-backed notification system:
  - Created Mongoose model `Notification` tracking read/unread statuses.
  - Created endpoints for fetching, reading, marking-all, and deleting alerts.
  - Integrated hooks in event controllers to auto-generate alerts on:
    - Vendor addition (Info)
    - Payment recorded (Success)
    - Cheque bounced (Alert)
    - Loan maturing within 30 days (Warning - dynamically scanned and stored on notification list fetch)
  - Interactive topbar dropdown panel with Relative Time indicators and navigation links.

---

## 2. API Endpoints Catalog

### Authentication
- `POST /api/auth/register` - Create user.
- `POST /api/auth/login` - User sign-in.
- `POST /api/auth/refresh` - Refresh access token.
- `POST /api/auth/setup/email` - Record setup emails.
- `POST /api/auth/setup/verify-otp` - Verify setup OTP.
- `POST /api/auth/setup/skip` - Generate tokens with session setup bypass.

### Notifications
- `GET /api/notifications` - Get all user notifications (triggers 30-day loan maturity warnings check).
- `PUT /api/notifications/:id/read` - Mark notification as read.
- `PUT /api/notifications/read-all` - Mark all notifications as read.
- `DELETE /api/notifications/:id` - Delete notification.

### Reports
- `GET /api/reports/outstanding` - Summarize overall payables.
- `GET /api/reports/interest-statements` - Amortized interest/principal split scheduler for active loans.

### General Modules (CRUD)
- `GET / POST / PUT / DELETE` endpoints for `/api/vendors`, `/api/bills`, `/api/payments`, `/api/financiers`, `/api/loans`, `/api/cheques`, `/api/ledger`.

---

## 3. Database Schema Blueprint

### 1. User
- `name`, `email`, `password`, `role` (Admin/Viewer), `isDefaultCredential` (Boolean), `status` (Active/Inactive).

### 2. Vendor
- `name`, `email`, `phone`, `outstandingBalance`, `gstin`, `category`, `status`.

### 3. Bill
- `billNumber`, `vendorId`, `amount`, `outstandingAmount`, `dueDate`, `paymentType` (Credit/Cash/Loan), `status` (PAID, PARTIALLY_PAID, UNPAID).

### 4. Payment
- `vendorId`, `amount`, `paymentDate`, `paymentMode`, `chequeId`, `referenceNumber`, `allocations` (FIFO bills matched).

### 5. Financier
- `name`, `outstandingBalance`, `defaultInterestRate`, `status`.

### 6. Loan
- `loanReference`, `financierId`, `principalAmount`, `interestRate`, `outstandingPrincipal`, `drawdownDate`, `maturityDate`, `status` (ACTIVE, SETTLED, OVERDUE).

### 7. Cheque
- `chequeNumber`, `type` (ISSUED_VENDOR, REPAYMENT_FINANCIER), `partyName`, `amount`, `chequeDate`, `status` (PENDING, CLEARED, BOUNCED).

### 8. Transaction (Ledger)
- `type`, `amount`, `vendorId`, `financierId`, `referenceType`, `referenceId`, `runningBalance`, `date`.

### 9. Notification
- `userId`, `type` (alert/info/warning/success), `title`, `message`, `link`, `read`, `createdAt`.

---

## 4. Known Configuration Reference

### Backend `.env`
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/vendor-finance
JWT_SECRET=supersecretjwtkey
JWT_REFRESH_SECRET=supersecretjwtrefreshkey
DEV_BYPASS_FLAG=true
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000/api
```
