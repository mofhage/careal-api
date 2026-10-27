# CAREAL fix package v9: login and dashboards (backend + frontend)

Only changed files are included, in your repo layout. Apply from the repo root:

    xcopy "careal-fix-dashboards-v9\Backend" "C:\Users\DELL\Desktop\careal-api\Backend" /E /I /Y
    xcopy "careal-fix-dashboards-v9\client"  "C:\Users\DELL\Desktop\careal-api\client"  /E /I /Y

Backend/ and client/ are separate git repos: commit and push each one separately.

## BEFORE you push, set these on Render (this is half of the fix)

Backend web service (careal-backend):
  NODE_ENV      = production
  FRONTEND_URLS = https://careal.org,https://www.careal.org,http://localhost:5173
  FRONTEND_URL  = https://www.careal.org       (used in reset-password / invite emails and the Flutterwave redirect)
  FLW_SECRET_HASH = a real value, identical to the one in the Flutterwave dashboard
  (plus the keys you already have: DATABASE_URL, SUPABASE_*, JWT_SECRET, STAFF_JWT_SECRET, RESEND_*, FLW_*)

Frontend static site (careal.org):
  VITE_API_BASE = https://careal-backend.onrender.com/api
  (it is also committed in client/.env.production; keep the two identical)
  Trigger a CLEAN build ("Clear build cache and deploy") so the new config is used.

## Quick proof after deploy
1. Browser: https://careal-backend.onrender.com/api/health  ->  {"status":"ok",...}
2. Browser: https://careal-backend.onrender.com/api/not-a-route  ->  JSON 404 (never HTML)
3. Postman: import CAREAL-backend-tests.postman_collection.json, set base_url to
   https://careal-backend.onrender.com/api, run folders 0 and 1.
4. Log in at /login and /staff/login; open all three staff dashboards.
5. DevTools > Network on /dashboard: requests go to careal-backend.onrender.com and return JSON.

First request after idle can take ~1 minute on Render's free tier (cold start), and a paused
Supabase project takes every endpoint down. Neither is a code fault.
