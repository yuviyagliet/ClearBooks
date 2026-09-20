# ClearBooks — Production Deployment (Supabase + Vercel)

This app is now production-ready multi-user. Local demo fallback only shows if env vars are missing; with env vars, all data uses Supabase with RLS isolation.

## 1) Supabase setup (2 min, free tier)
1. https://supabase.com → New project
2. SQL Editor → paste & run `supabase/schema.sql` (creates clients/income/expenses/invoices + RLS + storage bucket + delete_current_user() function)
3. Storage → confirm bucket `receipts` exists (public = true)
4. Auth → Configuration → Site URL = your Vercel URL (e.g. https://your-app.vercel.app)
   - Redirect URLs → add `https://your-app.vercel.app/update-password` and `http://localhost:5173/update-password` for local
   - Email → Disable “Confirm email” if you want instant signup→dashboard (per spec), or leave enabled for email confirmation
5. Project Settings → API → copy `URL` and `anon public` key

## 2) Local env
Copy `.env.example` → `.env`:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
`npm run dev` → test: signup → dashboard → add income/expense/client/invoice → PDF → Reports/CSV → logout → login → data persists.

Test isolation: sign up second account (different email) → dashboard must be empty. Password reset: Login → Forgot password → email → link → /update-password → sets new password.

## 3) Vercel deploy
Option A — Vercel CLI (from this folder):
```bash
vercel link --yes   # select team/project or create new "clearbooks"
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```
Option B — Dashboard:
1. vercel.com → Add New Project → Import GitHub repo
2. Settings → Environment Variables → Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (Production + Preview + Development)
3. Deploy → live URL will be https://<project>.vercel.app

Build command: `npm run build`  Output: `dist`  Framework: Vite

## 4) Verify live
- Open live URL → Landing shows “Sign Up Free” and “Your data is private and secured to your account.”
- Sign up → auto → /dashboard
- Add income/expense (receipt upload → path receipts/{user_id}/{filename} → clickable View)
- Reports → Export CSV
- Logout → login → data still there (proving Postgres persistence)
- Second account → empty (proving RLS: user_id = auth.uid() policies)
- Settings → shows email → Delete my account → removes rows + storage + auth user

## 5) Security notes
- Every table has `ENABLE RLS` + `FOR ALL USING (auth.uid() = user_id)` — no user can read another’s rows.
- Storage insert/select/delete policies check `(storage.foldername(name))[1] = auth.uid()::text` — scoped per user.
- Amounts >0, descriptions ≥2 chars, required dates — enforced in DB (CHECK) + UI with friendly errors.
- Never fail silently: all save/upload/auth actions throw with mapped messages (existing email, wrong password, weak password, etc.).

## 6) Current build status
`npm run build` ✓ — dist/index.html + assets, 741 kB main chunk.
If build fails in Vercel, check env vars are set and redeploy.
