# Auth-Gated App Testing Playbook (FixitZ — Emergent Google Auth)

Google OAuth co-exists with existing JWT email/password login.
- Session tokens stored in `user_sessions` collection: { user_id, session_token, expires_at }
- Users mapped by email in `users` collection (existing admins keep role=admin on Google login)
- Session token also returned in JSON and stored in localStorage `fixitz_token`; httpOnly cookie `session_token` also set.
- `get_current_user` accepts: cookie session_token, Bearer session_token, or Bearer JWT.

## Step 1: Create Test User & Session (Mongo)
Use the app's DB (DB_NAME from backend/.env). Insert a user + session:
- users: { id: "<uuid>", email, name, role: "user", created_at }
- user_sessions: { user_id: "<same id>", session_token: "test_session_...", expires_at: now+7d }

## Step 2: Test Backend API
curl -X GET "$REACT_APP_BACKEND_URL/api/auth/me" -H "Authorization: Bearer <session_token>"
Expect user JSON (not 401).

## Step 3: Browser Testing
Set cookie session_token (httpOnly, secure, sameSite None) OR set localStorage fixitz_token, then load app.

## Endpoints
- POST /api/auth/session   header X-Session-ID -> exchanges Emergent session_id, returns { token, user }, sets cookie
- POST /api/auth/logout    clears session + cookie
- GET  /api/auth/me        returns current user

## Success
- /api/auth/me returns user with correct role
- Google button redirects to auth.emergentagent.com then back to `/` with #session_id
- AuthCallback exchanges and routes to /admin (admin) or / (user)
