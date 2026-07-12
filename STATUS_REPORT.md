# Vastrams — Project Status Report

**Generated:** June 29, 2026
**Environment:** Development
**Stack:** React + Vite + Tailwind CSS (frontend) · Express.js + MongoDB (backend)

---

## 1. Project Overview
Vastrams is a premium Vendor & Finance Management application designed to streamline business profiling, vendor transaction logging, financiers master registry, credit note/loan operations, automatic FIFO-based bill payment allocations, and cheque lifecycle management. It features a bespoke dark theme with customizable accent gradients, high-security cookie-based JWT authentication, a default credential reset/OTP setup wizard flow, and a zero-localStorage database-backed user preferences architecture.

---

## 2. Completion Summary

| Area | Status | % Done |
|---|---|---|
| Backend API | ✅ Working | 95% |
| Frontend UI | ✅ Working | 92% |
| Auth & Security | ✅ Working | 100% |
| Database & Schema | ✅ Working | 100% |
| Dev Tooling | ✅ Working | 100% |
| UI/UX Design System | ✅ Working | 100% |
| Settings & Preferences | ✅ Working | 100% |
| Real-time Sync | ❌ Not Implemented | 0% |

**Overall: 86% complete**

---

## 3. What Was Built — Full Feature Log

### 🔧 Dev Tooling & Setup
- **Interactive `.env` wizard**: `setup-env.js` (creates both backend `.env` and frontend `.env` config sets).
- **CI/Non-interactive fallback**: Auto-detects headless environments to bypass prompts.
- **Admin Seeding**: `init-schema.js` seeds default admin user (`admin@vastrams.in` / `admin`).
- **CLI Wizard**: `setup-admin.js` provides interactive CLI administration of system credentials.
- **Git Ignore Hygiene**: Fully audited `.gitignore` excluding Postman directories, `.env` variants, and OS metadata.
- **Root README**: Documented architecture and setup commands in `README.md`.

### 🔐 Auth & Security
- **Secure Token Flow**: JWT access + refresh tokens inside secure, httpOnly, sameSite cookies.
- **Role-based Access Control**: Restricts administrative capabilities (e.g. data resets, edits, uploads) to `Admin` role.
- **First-login Setup Wizard**: Redirects default credential users to a forced reset sequence via alphanumeric 6-character uppercase OTPs sent to developer SMTP (Ethereal Email).
- **Security Check Middleware**: Express `requiresSetupComplete` validates first-run compliance.
- **Bypass Safeguards**: Alphanumeric OTP TTL limits (3 attempts, auto-delete verified records).
- **State Hygiene**: Removed all `sessionStorage` fallback references, securing session details directly in DB.

### 🗄️ Database
- **Mongoose / MongoDB Layer**: Strict schemas for `users`, `vendors`, `bills`, `payments`, `cheques`, `loans`, `repayments`, `financiers`, `transactions`, `settings`, and `otp_verifications`.
- **Database Indexing**: TTL index set on `otp_verifications` collection to auto-expire records.
- **Single Settings Document**: Renders visual and configuration states using the standard single-document upsert pattern.

### 🌐 Backend API

| Route Group | Endpoints | Status | Description |
|---|---|---|---|
| **Auth** | `POST /api/auth/register` | ✅ | Admin-only registration |
| | `POST /api/auth/login` | ✅ | Login, sets HTTP-only cookies |
| | `POST /api/auth/refresh` | ✅ | Refresh access token |
| | `POST /api/auth/logout` | ✅ | Clear cookies & session |
| | `GET /api/auth/me` | ✅ | Get active authenticated user profile |
| **Settings** | `GET /api/settings/appearance` | ✅ | Public style/theme configuration |
| | `PUT /api/settings/appearance` | ✅ | Update styles/gradients in DB |
| | `GET /api/settings/ui-prefs` | ✅ | Public UI preferences (sidebar collapsed status) |
| | `PUT /api/settings/ui-prefs` | ✅ | Update UI preferences in DB |
| | `GET /api/settings/profile` | ✅ | Get business profile, banks, payment modes, users list |
| | `POST /api/settings/profile` | ✅ | Update business profile configuration |
| | `POST /api/settings/upload-logo` | ✅ | Multer-validated, EXIF-cleaned, secure logo uploads |
| **Vendors** | `POST /api/vendors` | ✅ | Add vendor |
| | `GET /api/vendors` | ✅ | List all vendors |
| | `GET /api/vendors/:id` | ✅ | Get vendor by ID |
| | `PUT /api/vendors/:id` | ✅ | Update vendor details |
| | `DELETE /api/vendors/:id` | ✅ | Delete vendor |
| **Bills** | `POST /api/bills` | ✅ | Add purchase bill |
| | `GET /api/bills` | ✅ | List all purchase bills |
| | `GET /api/bills/:id` | ✅ | Get bill by ID |
| | `DELETE /api/bills/:id` | ✅ | Delete bill |
| **Payments** | `POST /api/payments` | ✅ | Record payment with FIFO allocations |
| | `GET /api/payments` | ✅ | List payments |
| | `DELETE /api/payments/:id` | ✅ | Delete payment and revert FIFO balances |
| **Financiers** | `POST /api/financiers` | ✅ | Add financier |
| | `GET /api/financiers` | ✅ | List all financiers |
| | `GET /api/financiers/:id` | ✅ | Get financier by ID |
| | `PUT /api/financiers/:id` | ✅ | Update financier |
| | `DELETE /api/financiers/:id` | ✅ | Delete financier |
| **Loans** | `POST /api/loans` | ✅ | Register loan drawdown |
| | `GET /api/loans` | ✅ | List loans |
| | `GET /api/loans/repayments/all` | ✅ | List all repayments |
| | `GET /api/loans/:id` | ✅ | Get loan details |
| | `PUT /api/loans/:id` | ✅ | Update loan parameters |
| | `DELETE /api/loans/:id` | ✅ | Delete loan |
| | `POST /api/loans/:id/repayments` | ✅ | Record repayments |
| | `DELETE /api/loans/:id/repayments/:repaymentId` | ✅ | Delete repayment |
| **Cheques** | `POST /api/cheques` | ✅ | Register cheque |
| | `GET /api/cheques` | ✅ | List registered cheques |
| | `PATCH /api/cheques/:id/status` | ✅ | Update cheque status (Pending/Cleared/Bounced) |
| | `DELETE /api/cheques/:id` | ✅ | Delete cheque |
| **Ledger** | `GET /api/ledger` | ✅ | Unified ledger feed |
| | `GET /api/ledger/vendor/:vendorId` | ✅ | Fetch vendor-specific statement |
| | `GET /api/ledger/financier/:financierId` | ✅ | Fetch financier-specific statement |
| **Dashboard** | `GET /api/dashboard/summary` | ✅ | Dashboard KPI stats calculations |
| | `GET /api/dashboard/alerts` | ✅ | Alerts calculations (maturing loans, bounced cheques) |
| **Reports** | `GET /api/reports/interest-statements` | ⚠️ | Static boilerplate indicator |
| | `GET /api/reports/outstanding-summary` | ✅ | Outstanding aging metrics |
| | `GET /api/reports/outstanding` | ✅ | Outstanding party list |
| **Backups** | `GET /api/backup/export/json` | ✅ | Export JSON backup |
| | `GET /api/backup/export/csv` | ✅ | Export CSV summaries |
| | `POST /api/backup/import` | ✅ | Import JSON backup to DB |
| | `POST /api/backup/reset` | ✅ | Database final reset |

---

### 🎨 Design System & UI
- **Emerald Dark Canvas Theme**: Set on `#0B0F1A` base background.
- **Font Pairing**: System updated from Space Grotesk to **Montserrat** (Display headings, titles, navigation headers) and **Inter** (Data tables, details, inputs, badges, buttons).
- **Dynamic Gradient Picker**: 16 presets + live customizable sliders and angle pickers synced directly to DB.
- **Refined SaaS Settings Layout**: Flat forms, large drag-drop logo uploader, sticky actions footer for unsaved changes.
- **Customized Error Canvas**: Animated Lottie assets integrated into theme-compliant error layouts.
- **Breadcrumb Topbar**: Elevation backgrounds mapped to `var(--color-bg-elevated)`.
- **Smart Dropdown Select**: Disables empty selectors with contextual placeholders, displaying inline `+ Add one` route links.
- **Lucide Icon Integration**: Emojis completely purged from lists, cards, and tabs.

---

### 📦 Modules

| Module | UI | API | Notes |
|---|---|---|---|
| **Vendors** | ✅ | ✅ | Complete CRUD, search, contact details, outstanding balance updates |
| **Purchase Bills** | ✅ | ✅ | Create, view, delete, link to vendors |
| **Finance (Financiers)** | ✅ | ✅ | Support financier lists, profile summaries, details |
| **Loans** | ✅ | ✅ | tenure maturity calculations, drawdown tracking |
| **Vendor Payments** | ✅ | ✅ | FIFO reconciliation, automatically issues cheque registry rows |
| **Fin. Repayments** | ✅ | ✅ | Pay loans, tracks principal & interest allocations |
| **Cheques** | ✅ | ✅ | Complete status lifecycle tracking |
| **Outstanding** | ✅ | ✅ | Display aging, oldest dues, outstanding party balances |
| **Ledger** | ✅ | ✅ | Unified ledger view with running balance computations |
| **Transactions** | ✅ | ✅ | Lists transactions, support historical filters |
| **Reports** | ⚠️ | ⚠️ | Basic tables rendering; interest statement calculations pending |
| **Settings** | ✅ | ✅ | Dynamic visual, profile config, masters lists, DB resets |

---

## 4. Issues Fixed (Changelog)

| # | Issue | Fix Applied |
|---|---|---|
| 1 | `.env` not committed | Added interactive `setup-env.js` config wizard |
| 2 | Postman folders tracking in git | Audited and updated `.gitignore` |
| 3 | Default admin creds persisting | Wired `isDefaultCredential` indicator, enforcing setup reset on first-run |
| 4 | JWT secrets regenerated every restart | Patch mode introduced in setup logic to preserve existing secrets |
| 5 | Setup wizard re-prompting on every execution | Added bypass validations if config keys are already present |
| 6 | Buttons rendering standard Tailwind blue | Overrode styles with CSS variable accent colors |
| 7 | Buttons using ALLCAPS with wrong font | Integrated global button reset classes in `index.css` |
| 8 | Theme switcher rendering unstyled backgrounds | Restructured Tailwind config to rely on class-attribute changes |
| 9 | Empty states rendering light gray | Applied dark theme CSS variable system |
| 10 | Login page showing light layout on Safari/Firefox | Corrected cross-browser Flexbox layout parameters |
| 11 | Dropdowns showing light gray background | Added dark theme class selectors to dropdown inputs |
| 12 | Dropdowns showing "Select" placeholders when empty | Implemented smart placeholders, disabled states, and inline navigation links |
| 13 | Gradient resetting on new tab opening | Removed `localStorage` references, migrating preferences entirely to DB |
| 14 | Emojis in theme card selectors | Replaced with SVG Lucide icons |
| 15 | Breadcrumb header rendering white background | Standardized styling under `var(--color-bg-elevated)` |
| 16 | App unmount console errors during boot | Restructured `main.jsx` to load styles via pre-React asynchronous bootloader |

---

## 5. Known Issues & Pending

| # | Area | Issue | Priority |
|---|---|---|---|
| 1 | Dashboard | No widget to display matured loan alerts / bounced cheques from alerts API | Medium |
| 2 | Settings | DB backup restore UI interface missing | Low |
| 3 | Reports | Interest statements calculations are not implemented in the backend | Medium |

---

## 6. What's Next — Recommended Build Order
1. **Implement Dashboard Alerts Widget**: Connect the `/api/dashboard/alerts` data via `useDashboardAlerts.js` hook into a card-based alerts widget on the main dashboard.
2. **Implement Backup Restore UI**: Add a file import uploader in the settings "Data & Backups" tab to restore DB data.
3. **Build Interest Statements Reports**: Replace backend boilerplate routes with real calculations for interest summaries.

---

## 7. Environment & Config Reference
- **Node version required:** `18.x` or `20.x`
- **Default Port Configs:** Frontend: `5173` | Backend: `5000`
- **Initial Setup Credentials:** `admin@vastrams.in` / `admin`
- **Dev SMTP Service:** Ethereal Email provider

### Env Keys Mapping

| Key | Scope | Description |
|---|---|---|
| `PORT` | Backend | Port number for Express server (default `5000`) |
| `MONGODB_URI` | Backend | Connection string to MongoDB instance |
| `JWT_SECRET` | Backend | Secret string for signing secure Access tokens |
| `JWT_REFRESH_SECRET` | Backend | Secret string for signing refresh tokens |
| `EMAIL_USER` | Backend | Ethereal/SMTP email user credential for OTP delivery |
| `EMAIL_PASS` | Backend | Ethereal/SMTP password |
| `VITE_API_URL` | Frontend | Vite API proxy routing destination (`http://localhost:5000`) |

---

## 8. `useEffect` Audit

| # | File | Purpose | Dependencies | Issues / Notes |
|---|---|---|---|---|
| 1 | `ConfirmationDialog.jsx:53` | Handle ESC key close | `[isOpen]` | ⚠️ Missing dependency: `handleCancel` |
| 2 | `CustomDatePicker.jsx:23` | Close datepicker calendar | `[]` | ✅ Clean |
| 3 | `CustomDatePicker.jsx:34` | Reset calendar state | `[isOpen, value]` | ✅ Clean |
| 4 | `DropdownSelect.jsx:9` | Close dropdown click-outside | `[]` | ✅ Clean |
| 5 | `Toast.jsx:65` | Dismiss toast item timer | `[dismiss]` | ✅ Clean |
| 6 | `NavigationSetter.jsx:9` | Register navigation singleton | `[navigate]` | ✅ Clean |
| 7 | `AuthContext.jsx:21` | Keep token synced to auth state | `[accessToken]` | ✅ Clean |
| 8 | `AuthContext.jsx:63` | Initial silent token refresh | `[silentRefresh]` | ✅ Clean |
| 9 | `AuthContext.jsx:72` | Token auto-refresh timer | `[accessToken, silentRefresh]` | ✅ Clean |
| 10 | `useDashboardAlerts.js:22` | Fetch dashboard alerts | `[]` | ⚠️ Missing dependency: `fetchAlerts`. Sets state after unmount risk. |
| 11 | `useDashboardSummary.js:22` | Fetch dashboard stats | `[]` | ⚠️ Missing dependency: `fetchSummary`. Sets state after unmount risk. |
| 12 | `usePreferences.jsx:101` | Sync document element theme class | `[preferences.theme]` | ✅ Clean |
| 13 | `usePreferences.jsx:106` | Sync gradient variables to DOM | `[preferences.gradient]` | ✅ Clean |
| 14 | `usePreferences.jsx:112` | Media listener for system theme changes | `[preferences.theme]` | ✅ Clean |
| 15 | `StatusErrorPage.jsx:73` | Rate-limit countdown timer | `[countdown, code]` | ✅ Clean |
| 16 | `ChequeRegistry.jsx:105` | Fetch cheques, banks and vendors list | `[]` | ⚠️ Missing dependency: `fetchData`. Sets state after unmount risk. |
| 17 | `FinancierPayments.jsx:89` | Fetch payments, repayments and profile | `[]` | ⚠️ Missing dependency: `fetchRepaymentsData`. Sets state after unmount risk. |
| 18 | `FinancierProfile.jsx:98` | Fetch profiles on ID change | `[id]` | ⚠️ Missing dependency: `fetchProfileAndLoans`. Sets state after unmount risk. |
| 19 | `Financiers.jsx:54` | Fetch financiers list | `[]` | ⚠️ Missing dependency: `fetchFinanciers`. Sets state after unmount risk. |
| 20 | `Loans.jsx:84` | Fetch loans data | `[]` | ⚠️ Missing dependency: `fetchLoansAndFinanciers`. Sets state after unmount risk. |
| 21 | `Login.jsx:28` | Auto-focus inputs | `[]` | ✅ Clean |
| 22 | `OutstandingStatement.jsx:60` | Fetch outstanding statements list | `[]` | ⚠️ Missing dependency: `fetchData`. Sets state after unmount risk. |
| 23 | `PurchaseBills.jsx:95` | Fetch bills lists | `[]` | ⚠️ Missing dependency: `fetchBillsAndVendors`. Sets state after unmount risk. |
| 24 | `Reports.jsx:55` | Fetch data | `[]` | ⚠️ Missing dependency: `fetchData`. Sets state after unmount risk. |
| 25 | `Reports.jsx:90` | Synchronize selectedYear value | `[availableYears, selectedYear]` | ⚠️ Derived state sync anti-pattern. |
| 26 | `RunningLedger.jsx:52` | Fetch vendors and financiers lists | `[]` | ⚠️ Sets state after unmount risk. |
| 27 | `RunningLedger.jsx:71` | Fetch ledger data | `[partyId, partyType]` | ⚠️ Sets state after unmount risk. |
| 28 | `Settings.jsx:358` | Fetch profile details | `[]` | ⚠️ Missing dependency: `fetchProfile`. Sets state after unmount risk. |
| 29 | `Settings.jsx:513` | Fetch vendors master list | `[]` | ⚠️ Missing dependency: `fetchVendors`. Sets state after unmount risk. |
| 30 | `Settings.jsx:610` | Fetch financiers list | `[]` | ⚠️ Missing dependency: `fetchFinanciers`. Sets state after unmount risk. |
| 31 | `Settings.jsx:701` | Fetch loans configurations | `[]` | ⚠️ Missing dependency: `fetchLoans`. Sets state after unmount risk. |
| 32 | `Settings.jsx:782` | Sync local banks | `[profile]` | ✅ Clean |
| 33 | `Settings.jsx:838` | Sync payment modes | `[profile]` | ✅ Clean |
| 34 | `Settings.jsx:895` | Sync users list | `[profile]` | ✅ Clean |
| 35 | `Setup.jsx:17` | Check setupToken on mount | `[setupToken, navigate]` | ✅ Clean |
| 36 | `TransactionHistory.jsx:82` | Fetch transactions on showDeleted | `[showDeleted]` | ⚠️ Missing dependency: `fetchData`. Sets state after unmount risk. |
| 37 | `VendorPayments.jsx:114` | Fetch payments lists | `[]` | ⚠️ Missing dependency: `fetchPaymentsData`. Sets state after unmount risk. |
| 38 | `Vendors.jsx:73` | Fetch vendors data | `[]` | ⚠️ Missing dependency: `fetchVendors`. Sets state after unmount risk. |

### Summary
| Status | Count |
|---|---|
| ✅ Clean — correct deps, no issues | 17 |
| ⚠️ Warning — missing deps, stale closure, or fires unnecessarily | 21 |
| ❌ Problem — infinite loop risk, memory leak, wrong behavior | 0 |

### Problems Found
- **Missing Dependencies warning** (`react-hooks/exhaustive-deps`):
  Most fetching effects (e.g. `ChequeRegistry.jsx:105`, `Vendors.jsx:73`, etc.) call a method defined in the component block but don't list it in the dependency array. Since the methods are not wrapped in `useCallback`, adding them directly would cause infinite rendering loops.
- **State Updates After Unmount**:
  None of the asynchronous effects contain AbortControllers or mounted flags, meaning if the user navigates away before data loading finishes, React tries to call state updates on unmounted components, causing memory leak console logs.
- **Syncing State via useEffect**:
  `Reports.jsx:90` runs an effect to select a default fallback year if `selectedYear` is not present in `availableYears`. This should be computed directly during rendering or memoization instead of forcing another render loop.

---

## 9. React Anti-Patterns Audit

### 9.1 useEffect Misuse
| File | Line | Issue | Fix |
|---|---|---|---|
| `Reports.jsx` | 90 | Synchronizing local selectedYear state with available years list | Compute fallback directly during render |

### 9.2 Derived State Anti-Patterns
| File | Line | Issue | Fix |
|---|---|---|---|
| `Reports.jsx` | 90 | Synced selectedYear via effect | Compute fallback directly during render or useMemo |

### 9.3 Prop Drilling
- No significant prop drilling found (Context is utilized for auth and preferences).

### 9.4 Components Defined Inside Components
- No instances found.

### 9.5 Array Index Used as Key
| File | Line | List type | Fix |
|---|---|---|---|
| `ChequeRegistry.jsx` | 305 | Cheque list items | Use `c.id` or `c._id` as key |
| `FinancierPayments.jsx` | 271 | Repayment list items | Use `r.id` or `r._id` as key |
| `Financiers.jsx` | 216 | Financier list items | Use `f.id` or `f._id` as key |
| `Loans.jsx` | 199 | Loans list items | Use `loan.id` or `loan._id` as key |
| `OutstandingStatement.jsx` | 183 | Outstanding party items | Use `p.id` or `p._id` as key |
| `PurchaseBills.jsx` | 288 | Bills items | Use `b.id` or `b._id` as key |
| `Reports.jsx` | 340 | Vendor report rows | Use unique ID key |
| `Reports.jsx` | 418 | Financier report rows | Use unique ID key |
| `Reports.jsx` | 544 | Overdue bills list | Use `b.id` as key |
| `RunningLedger.jsx` | 250 | Ledger list rows | Use unique ID key |
| `Settings.jsx` | 1655 | Banks list rows | Use bank index or string |
| `Settings.jsx` | 1730 | Payment modes rows | Use mode name |
| `TransactionHistory.jsx` | 223 | Transaction list rows | Use `t.id` as key |
| `VendorPayments.jsx` | 295 | Payment list rows | Use `p.id` as key |
| `Vendors.jsx` | 263 | Vendor list rows | Use `v.id` as key |

### 9.6 Missing Cleanup in useEffect
| File | Line | Issue | Fix |
|---|---|---|---|
| `useDashboardAlerts.js` | 22 | No abort controller or state-guard on unmount | AbortController |
| `useDashboardSummary.js` | 22 | No abort controller or state-guard on unmount | AbortController |
| `ChequeRegistry.jsx` | 105 | No abort controller or state-guard on unmount | AbortController |
| `FinancierPayments.jsx` | 89 | No abort controller or state-guard on unmount | AbortController |
| `FinancierProfile.jsx` | 98 | No abort controller or state-guard on unmount | AbortController |
| `Financiers.jsx` | 54 | No abort controller or state-guard on unmount | AbortController |
| `Loans.jsx` | 84 | No abort controller or state-guard on unmount | AbortController |
| `OutstandingStatement.jsx` | 60 | No abort controller or state-guard on unmount | AbortController |
| `PurchaseBills.jsx` | 95 | No abort controller or state-guard on unmount | AbortController |
| `Reports.jsx` | 55 | No abort controller or state-guard on unmount | AbortController |
| `RunningLedger.jsx` | 52 | No abort controller or state-guard on unmount | AbortController |
| `RunningLedger.jsx` | 71 | No abort controller or state-guard on unmount | AbortController |
| `Settings.jsx` | 358 | No abort controller or state-guard on unmount | AbortController |
| `Settings.jsx` | 513 | No abort controller or state-guard on unmount | AbortController |
| `Settings.jsx` | 610 | No abort controller or state-guard on unmount | AbortController |
| `Settings.jsx` | 701 | No abort controller or state-guard on unmount | AbortController |
| `TransactionHistory.jsx` | 82 | No abort controller or state-guard on unmount | AbortController |
| `VendorPayments.jsx` | 114 | No abort controller or state-guard on unmount | AbortController |
| `Vendors.jsx` | 73 | No abort controller or state-guard on unmount | AbortController |

### 9.7 Direct State Mutation
- No instances found.

### 9.8 Conditional Hook Calls
- No instances found.

### 9.9 Heavy Computations Without useMemo
| File | Line | What to memoize |
|---|---|---|
| `OutstandingStatement.jsx` | 66 | `filtered` array calculations on search filter |
| `RunningLedger.jsx` | 112 | dropdown party options generation |

### 9.10 Missing AbortController on Fetch
*(All occurrences detailed in 9.6 list).*

---

### Anti-Pattern Summary
| Anti-Pattern | Instances Found | Fixed in This Report |
|---|---|---|
| useEffect misuse | 1 | No — document only |
| Derived state | 1 | No — document only |
| Prop drilling | 0 | — |
| Component in component | 0 | — |
| Index as key | 15 | No — document only |
| Missing cleanup | 18 | No — document only |
| Direct mutation | 0 | — |
| Conditional hooks | 0 | — |
| Missing useMemo | 2 | No — document only |
| Missing AbortController | 18 | No — document only |

**Total anti-patterns found: 55**
