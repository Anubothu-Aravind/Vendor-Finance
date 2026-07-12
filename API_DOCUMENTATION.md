# Vastrams Trade Payables and Financier Loans API Documentation

This document describes all backend endpoints available in the Vastrams application, categorized by service/resource.

---

## Auth

### Endpoints
- POST /api/auth/register — [Who can access: Admin only]
- POST /api/auth/login — [Who can access: Currently: any authenticated user (role enforcement pending)]
- POST /api/auth/refresh — [Who can access: Currently: any authenticated user (role enforcement pending)]
- POST /api/auth/logout — [Who can access: Currently: any authenticated user (role enforcement pending)]
- GET /api/auth/me — [Who can access: Admin, Viewer]

### Example Usage

**Route**: Register User
**Endpoint**: `/api/auth/register`
**Method**: `POST`

**Parameters**: None

**Payload**:
```json
{
  "name": "Viewer User",
  "email": "viewer@vastrams.in",
  "password": "viewer123",
  "role": "Viewer"
}
```

---

**Route**: Login
**Endpoint**: `/api/auth/login`
**Method**: `POST`

**Parameters**: None

**Payload**:
```json
{
  "email": "admin@vastrams.in",
  "password": "admin123"
}
```

---

**Route**: Refresh Token
**Endpoint**: `/api/auth/refresh`
**Method**: `POST`

**Parameters**: None

**Payload**: None

---

**Route**: Get User Profile
**Endpoint**: `/api/auth/me`
**Method**: `GET`

**Parameters**: None

**Payload**: None

---

**Route**: Logout
**Endpoint**: `/api/auth/logout`
**Method**: `POST`

**Parameters**: None

**Payload**: None

### Do's
- Pass access token as Authorization Bearer header for protected endpoints
- Use silent token refresh on app startup and 5 minutes prior to access token expiry

### Don'ts
- Don't store the refresh token in localStorage (always keep it in HTTP-only secure cookie)
- Don't send passwords in plain text outside HTTPS protected connections

---

## Vendors

### Endpoints
- GET /api/vendors — [Who can access: Admin, Viewer]
- POST /api/vendors — [Who can access: Admin only]
- PUT /api/vendors/:id — [Who can access: Admin only]
- DELETE /api/vendors/:id — [Who can access: Admin only]

### Example Usage

**Route**: Create Vendor
**Endpoint**: `/api/vendors`
**Method**: `POST`

**Parameters**: None

**Payload**:
```json
{
  "name": "Ravi Textiles Pvt Ltd",
  "type": "bigVendor",
  "phone": "9876543210",
  "email": "ravi@textiles.com",
  "address": "Secunderabad, Hyderabad",
  "gstin": "36ABCDE1234F1Z5",
  "openingBalance": 0,
  "status": "Active"
}
```

---

**Route**: Get All Vendors
**Endpoint**: `/api/vendors`
**Method**: `GET`

**Parameters**: None

**Payload**: None

---

**Route**: Get Vendor By ID
**Endpoint**: `/api/vendors/:id`
**Method**: `GET`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the vendor

**Payload**: None

---

**Route**: Update Vendor
**Endpoint**: `/api/vendors/:id`
**Method**: `PUT`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the vendor

**Payload**:
```json
{
  "name": "Ravi Textiles Ltd",
  "type": "bigVendor",
  "phone": "9876543211",
  "email": "info@ravitextiles.com",
  "address": "Begumpet, Hyderabad",
  "gstin": "36ABCDE1234F1Z5",
  "status": "Active"
}
```

---

**Route**: Delete Vendor
**Endpoint**: `/api/vendors/:id`
**Method**: `DELETE`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the vendor

**Payload**: None

### Do's
- Validate email syntax and phone length before sending
- Query `status` parameter to filter directory entries in views

### Don'ts
- Don't send `outstandingBalance` directly. It is computed server-side
- Don't attempt to delete a vendor that has open unpaid bills

---

## Purchase Bills

### Endpoints
- GET /api/bills — [Who can access: Admin, Viewer]
- POST /api/bills — [Who can access: Admin only]
- GET /api/bills/:id — [Who can access: Admin, Viewer]
- DELETE /api/bills/:id — [Who can access: Admin only]

### Example Usage

**Route**: Create Bill
**Endpoint**: `/api/bills`
**Method**: `POST`

**Parameters**: None

**Payload**:
```json
{
  "vendorId": "65f32a87c128f60012ab34cd",
  "billNumber": "BILL-2026-001",
  "amount": 85000,
  "billDate": "2026-06-30",
  "dueDate": "2026-07-30",
  "remarks": "Fabric raw material supply"
}
```

---

**Route**: Get All Bills
**Endpoint**: `/api/bills`
**Method**: `GET`

**Parameters**: None

**Payload**: None

---

**Route**: Get Bill By ID
**Endpoint**: `/api/bills/:id`
**Method**: `GET`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the bill

**Payload**: None

---

**Route**: Delete Bill
**Endpoint**: `/api/bills/:id`
**Method**: `DELETE`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the bill

**Payload**: None

### Do's
- Ensure `billNumber` is unique per vendor
- Provide appropriate ISO date format (YYYY-MM-DD)

### Don'ts
- Don't delete bills that have partial or complete payments allocated to them

---

## Vendor Payments

### Endpoints
- GET /api/payments — [Who can access: Admin, Viewer]
- POST /api/payments — [Who can access: Admin only]
- DELETE /api/payments/:id — [Who can access: Admin only]

### Example Usage

**Route**: Record Payment
**Endpoint**: `/api/payments`
**Method**: `POST`

**Parameters**: None

**Payload**:
```json
{
  "vendorId": "65f32a87c128f60012ab34cd",
  "amount": 85000,
  "paymentDate": "2026-06-30",
  "paymentMode": "BANK_TRANSFER",
  "referenceNumber": "TXN129384",
  "remarks": "Settled bill BILL-2026-001"
}
```

---

**Route**: Get All Payments
**Endpoint**: `/api/payments`
**Method**: `GET`

**Parameters**: None

**Payload**: None

---

**Route**: Delete Payment
**Endpoint**: `/api/payments/:id`
**Method**: `DELETE`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the payment record

**Payload**: None

### Do's
- Verify payment modes are valid (CASH, BANK_TRANSFER, CHEQUE)
- Retrieve updated outstanding bills list on payment success

### Don'ts
- Don't send manual allocations inside the payment request. FIFO logic calculates this on the backend.

---

## Financiers

### Endpoints
- GET /api/financiers — [Who can access: Admin, Viewer]
- POST /api/financiers — [Who can access: Admin only]
- GET /api/financiers/:id — [Who can access: Admin, Viewer]
- PUT /api/financiers/:id — [Who can access: Admin only]
- DELETE /api/financiers/:id — [Who can access: Admin only]

### Example Usage

**Route**: Create Financier
**Endpoint**: `/api/financiers`
**Method**: `POST`

**Parameters**: None

**Payload**:
```json
{
  "name": "Govindu",
  "phone": "9123456789",
  "address": "Ameerpet, Hyderabad",
  "notes": "Premium lender for long term notes",
  "defaultInterestRate": 12,
  "status": "Active"
}
```

---

**Route**: Get All Financiers
**Endpoint**: `/api/financiers`
**Method**: `GET`

**Parameters**: None

**Payload**: None

---

**Route**: Get Financier By ID
**Endpoint**: `/api/financiers/:id`
**Method**: `GET`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the financier

**Payload**: None

---

**Route**: Update Financier
**Endpoint**: `/api/financiers/:id`
**Method**: `PUT`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the financier

**Payload**:
```json
{
  "name": "Govindu Lenders",
  "phone": "9123456780",
  "address": "Madhapur, Hyderabad",
  "notes": "Premium lender for short term capital",
  "defaultInterestRate": 14,
  "status": "Active"
}
```

---

**Route**: Delete Financier
**Endpoint**: `/api/financiers/:id`
**Method**: `DELETE`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the financier

**Payload**: None

### Do's
- Enforce positive numeric interest rate parameters
- Check profile balances before deletion

### Don'ts
- Don't delete a financier that has active unpaid loans

---

## Loans

### Endpoints
- GET /api/loans — [Who can access: Admin, Viewer]
- POST /api/loans — [Who can access: Admin only]
- GET /api/loans/:id — [Who can access: Admin, Viewer]
- PUT /api/loans/:id — [Who can access: Admin only]
- DELETE /api/loans/:id — [Who can access: Admin only]

### Example Usage

**Route**: Create Loan
**Endpoint**: `/api/loans`
**Method**: `POST`

**Parameters**: None

**Payload**:
```json
{
  "financierId": "65f32b87c128f60012ab34ef",
  "principalAmount": 100000,
  "interestRate": 12,
  "drawdownDate": "2026-06-30",
  "maturityDate": "2027-06-30",
  "loanReference": "LN-200",
  "remarks": "Capital expansion funding"
}
```

---

**Route**: Get All Loans
**Endpoint**: `/api/loans`
**Method**: `GET`

**Parameters**: None

**Payload**: None

---

**Route**: Get Loan By ID
**Endpoint**: `/api/loans/:id`
**Method**: `GET`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the loan

**Payload**: None

---

**Route**: Update Loan
**Endpoint**: `/api/loans/:id`
**Method**: `PUT`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the loan

**Payload**:
```json
{
  "interestRate": 14,
  "maturityDate": "2027-06-30",
  "loanReference": "LN-200B",
  "remarks": "Updated terms"
}
```

---

**Route**: Delete Loan
**Endpoint**: `/api/loans/:id`
**Method**: `DELETE`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the loan

**Payload**: None

### Do's
- Set maturity date to exactly 12 months after drawdown date if standard note
- Ensure loanReference is descriptive

### Don'ts
- Don't update principal amount once drawdown has been completed

---

## Repayments

### Endpoints
- POST /api/loans/:id/repayments — [Who can access: Admin only]
- DELETE /api/loans/:id/repayments/:repaymentId — [Who can access: Admin only]
- GET /api/loans/repayments/all — [Who can access: Admin, Viewer]

### Example Usage

**Route**: Record Repayment
**Endpoint**: `/api/loans/:id/repayments`
**Method**: `POST`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the loan

**Payload**:
```json
{
  "amount": 5000,
  "repaymentDate": "2026-06-30",
  "repaymentMode": "BANK_TRANSFER",
  "referenceNumber": "REP-102",
  "principalPaid": 5000,
  "interestPaid": 0
}
```

---

**Route**: Delete Repayment
**Endpoint**: `/api/loans/:id/repayments/:repaymentId`
**Method**: `DELETE`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the loan
- `repaymentId` (path, required) — MongoDB ObjectId of the repayment

**Payload**: None

---

**Route**: Get All Repayments
**Endpoint**: `/api/loans/repayments/all`
**Method**: `GET`

**Parameters**: None

**Payload**: None

### Do's
- Calculate interest paid vs principal paid accurately before sending
- Supply reference number for bank transactions

### Don'ts
- Don't submit negative repayment amounts

---

## Cheques

### Endpoints
- GET /api/cheques — [Who can access: Admin, Viewer]
- POST /api/cheques — [Who can access: Admin only]
- PATCH /api/cheques/:id/status — [Who can access: Admin only]
- DELETE /api/cheques/:id — [Who can access: Admin only]

### Example Usage

**Route**: Create Cheque
**Endpoint**: `/api/cheques`
**Method**: `POST`

**Parameters**: None

**Payload**:
```json
{
  "chequeNumber": "004521",
  "type": "ISSUED_VENDOR",
  "partyName": "sirivinayaka",
  "amount": 65000,
  "chequeDate": "2026-06-30",
  "vendorId": "65f32a87c128f60012ab34cd"
}
```

---

**Route**: Get All Cheques
**Endpoint**: `/api/cheques`
**Method**: `GET`

**Parameters**: None

**Payload**: None

---

**Route**: Update Cheque Status
**Endpoint**: `/api/cheques/:id/status`
**Method**: `PATCH`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the cheque

**Payload**:
```json
{
  "status": "CLEARED"
}
```

---

**Route**: Delete Cheque
**Endpoint**: `/api/cheques/:id`
**Method**: `DELETE`

**Parameters**:
- `id` (path, required) — MongoDB ObjectId of the cheque

**Payload**: None

### Do's
- Verify cheque number is exactly 6 digits
- Map type correctly to ISSUED_VENDOR or ISSUED_FINANCIER

### Don'ts
- Don't bounce a cheque that has already been cleared

---

## Ledger

### Endpoints
- GET /api/ledger — [Who can access: Admin, Viewer]
- GET /api/ledger/vendor/:vendorId — [Who can access: Admin, Viewer]
- GET /api/ledger/financier/:financierId — [Who can access: Admin, Viewer]

### Example Usage

**Route**: Get All Ledger Entries
**Endpoint**: `/api/ledger`
**Method**: `GET`

**Parameters**:
- `showDeleted` (query, optional) — Set to 'true' to include soft-deleted records

**Payload**: None

---

**Route**: Get Vendor Ledger Statement
**Endpoint**: `/api/ledger/vendor/:vendorId`
**Method**: `GET`

**Parameters**:
- `vendorId` (path, required) — MongoDB ObjectId of the vendor

**Payload**: None

---

**Route**: Get Financier Ledger Statement
**Endpoint**: `/api/ledger/financier/:financierId`
**Method**: `GET`

**Parameters**:
- `financierId` (path, required) — MongoDB ObjectId of the financier

**Payload**: None

### Do's
- Pull ledger statements in chronological order to build running balance history

### Don'ts
- Don't add entries manually. The ledger updates automatically on bill/payment lifecycle hooks.

---

## Reports

### Endpoints
- GET /api/reports/outstanding-summary — [Who can access: Admin, Viewer]

### Example Usage

**Route**: Get Outstanding Summary Statement
**Endpoint**: `/api/reports/outstanding-summary`
**Method**: `GET`

**Parameters**: None

**Payload**: None

### Do's
- Query this endpoint periodically to populate dashboard KPIs

### Don'ts
- Don't rely on cached reports for real-time payments operations

---

## Settings

### Endpoints
- GET /api/settings/profile — [Who can access: Admin, Viewer]
- POST /api/settings/profile — [Who can access: Admin only]

### Example Usage

**Route**: Get Corporate Profile
**Endpoint**: `/api/settings/profile`
**Method**: `GET`

**Parameters**: None

**Payload**: None

---

**Route**: Update Corporate Profile
**Endpoint**: `/api/settings/profile`
**Method**: `POST`

**Parameters**: None

**Payload**:
```json
{
  "businessName": "Vastrams Corp",
  "ownerName": "Aravind",
  "email": "admin@vastrams.in",
  "phone": "9876543210",
  "address": "Hyderabad, Telangana",
  "gstin": "36ABCDE1234F1Z5"
}
```

### Do's
- Keep phone numbers and email active for backup receipts

### Don'ts
- Don't omit mandatory business identifiers like GSTIN

---

## Export & Import

### Endpoints
- GET /api/export/json — [Who can access: Admin, Viewer]
- GET /api/export/csv — [Who can access: Admin, Viewer]
- POST /api/import — [Who can access: Admin only]
- POST /api/reset — [Who can access: Admin only]

### Example Usage

**Route**: Export All JSON
**Endpoint**: `/api/export/json`
**Method**: `GET`

**Parameters**: None

**Payload**: None

---

**Route**: Export All CSV
**Endpoint**: `/api/export/csv`
**Method**: `GET`

**Parameters**: None

**Payload**: None

---

**Route**: Import Data JSON
**Endpoint**: `/api/import`
**Method**: `POST`

**Parameters**: None

**Payload**:
```json
{
  "vendors": [],
  "financiers": [],
  "bills": [],
  "loans": [],
  "payments": [],
  "repayments": [],
  "cheques": [],
  "transactions": []
}
```

---

**Route**: Reset Database Data
**Endpoint**: `/api/reset`
**Method**: `POST`

**Parameters**: None

**Payload**: None

### Do's
- Verify JSON formatting before triggering import
- Perform exports regularly prior to resets

### Don't
- Don't import corrupt files as it may disrupt referential integrity constraints
