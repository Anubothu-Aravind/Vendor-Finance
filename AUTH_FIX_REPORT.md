# Vastrams — Authentication & Bootstrap Fix Report

---

## 1. Executive Summary

This report documents the resolution of the authentication bootstrap failure and spurious 500 error screens in the **Vastrams — Vendor & Finance Management System**.

---

## 2. Exact Root Causes Identified & Fixed

### A. Hardcoded `secure: true` on Cookies in Development (HTTP)
- **Problem**: In `backend/src/controllers/auth.controller.js` and `backend/src/routes/auth/setup.js`, `res.cookie` calls hardcoded `secure: true`.
- **Root Cause Impact**: When developing over plain HTTP (`http://localhost:3000`), modern web browsers discard or reject cookies marked with the `Secure` flag. As a result, the browser never stored or sent `refreshToken` or `accessToken`. On page reload, the session could not be refreshed and `/api/auth/refresh` returned 401.
- **Fix**: Replaced hardcoded `secure: true` and `sameSite: 'strict'` with environment-aware flags:
  ```javascript
  const isProd = process.env.NODE_ENV === 'production'
  const sameSiteMode = isProd ? 'strict' : 'lax'

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: sameSiteMode,
    maxAge: 15 * 60 * 1000 // 15 minutes
  })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: sameSiteMode,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  })
  ```

### B. Unauthenticated Eager Probing in `ProfileProvider`
- **Problem**: `ProfileProvider` in `Frontend/src/context/ProfileContext.jsx` unconditionally called `GET /api/settings/profile` on initial application boot.
- **Root Cause Impact**: Because `/api/settings/profile` requires JWT authentication, unauthenticated users encountered repeated 401 responses on page load. The Axios interceptor attempted automatic silent refresh on each 401, creating cascading 401 errors in the console.
- **Fix**: Connected `ProfileProvider` to `useAuth()` so that `fetchCompanyProfile()` only executes when an authenticated `user` is present:
  ```javascript
  const { user } = useAuth()
  ...
  const fetchCompanyProfile = useCallback(async () => {
    if (!user) {
      setLoadingProfile(false)
      return
    }
    try {
      const res = await api.get('/settings/profile')
      if (res.success && res.data) {
        setCompanyProfile(prev => ({
          ...prev,
          ...res.data,
          businessName: res.data.businessName || 'Vastrams',
          logo: res.data.logo || '',
        }))
      }
    } catch {
      // Silently keep default fallback
    } finally {
      setLoadingProfile(false)
    }
  }, [user])
  ```

### C. 500 Error Screen on Unauthenticated Startup
- **Root Cause**: The browser was previously navigated to `/error/500` during an earlier database disconnection test. 401 Unauthorized responses do not trigger error page navigation; `ProtectedRoute` routes unauthenticated users directly to `/login`.
- **Validation**: Verified that a fresh, unauthenticated browser visiting `http://localhost:3000/` immediately transitions to `/login` without triggering error screens or console error cascades.

---

## 3. Files Modified

| # | File Modified | Location of Change | Description of Fix |
| :--- | :--- | :--- | :--- |
| **1** | [backend/src/controllers/auth.controller.js](file:///c:/Users/purus/Desktop/Project/backend/src/controllers/auth.controller.js) | Lines 126–142, 186–196 | Configured `secure: isProd` and `sameSite: sameSiteMode` on `login` and `refresh` cookies |
| **2** | [backend/src/routes/auth/setup.js](file:///c:/Users/purus/Desktop/Project/backend/src/routes/auth/setup.js) | Lines 135–150, 195–210 | Configured `secure: isProd` and `sameSite: sameSiteMode` on `/complete` and `/skip` setup cookies |
| **3** | [Frontend/src/context/ProfileContext.jsx](file:///c:/Users/purus/Desktop/Project/Frontend/src/context/ProfileContext.jsx) | Lines 1–40 | Gated `fetchCompanyProfile()` with `useAuth()` to prevent unauthenticated 401 API calls |
| **4** | [Frontend/src/pages/errors/ErrorPage.jsx](file:///c:/Users/purus/Desktop/Project/Frontend/src/pages/errors/ErrorPage.jsx) | Lines 8–35, 185–190 | Added safe navigation fallback for `useNavigate()` when rendered outside of `RouterProvider` context |

---

## 4. Verification Test Matrix

| Step / Scenario | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- |
| **1. Unauthenticated Startup** | No 500 page; redirects cleanly to `/login` | `ProtectedRoute` redirects to `/login`; 0 console 401 cascades | **PASSED** |
| **2. Login (`POST /api/auth/login`)** | Returns `HTTP 200`; sets `accessToken` & `refreshToken` cookies with `secure: false` in dev | `HTTP 200 OK`; both cookies stored with `HttpOnly; SameSite=Lax` | **PASSED** |
| **3. Authenticated Profile (`GET /api/settings/profile`)** | Returns `HTTP 200` with company profile payload | `HTTP 200 OK` (`businessName: 'Vastrams'`) | **PASSED** |
| **4. Page Reload Session Refresh (`POST /api/auth/refresh`)** | Re-authenticates session via `refreshToken` cookie; returns `HTTP 200` | `HTTP 200 OK`; new `accessToken` cookie issued | **PASSED** |
| **5. Logout (`POST /api/auth/logout`)** | Clears session cookies; returns `HTTP 200` | `HTTP 200 OK`; all auth cookies cleared | **PASSED** |
| **6. Post-Logout Reload** | Unauthenticated state; returns `401` on refresh; stays on `/login` | `HTTP 401 Unauthorized`; clean redirect to `/login` | **PASSED** |
| **7. Production Build Verification** | Zero bundling or syntax errors | Built cleanly (`dist/` generated with 2,842 modules transformed) | **PASSED** |

