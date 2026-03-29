# Supabase Integration Steps (Hybrid Architecture)

This project uses a hybrid model:
- Direct frontend Supabase access for auth and basic CRUD.
- Backend API routes for AI and complex planning features.

## 1. Run SQL in Supabase

1. Open Supabase dashboard -> SQL Editor.
2. Run your schema SQL (tables, indexes, RLS, policies).
3. Confirm these tables exist at minimum:
   - profiles
   - onboarding_profiles
   - transactions
4. Confirm RLS is enabled and owner-only policies are active.

## 2. Frontend env setup

1. Create file `frontend/.env` from `frontend/.env.example`.
2. Set values:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

## 3. Backend env setup

1. Create file `backend/.env` from `backend/.env.example`.
2. Set values:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key
SUPABASE_PROFILE_TABLE=expense_profiles
```

Notes:
- Backend uses secret key only on server side.
- Frontend must use publishable key only.

## 4. Install frontend dependencies

From repository root:

```bash
cd frontend
npm install
```

## 5. Start backend

From repository root:

```bash
cd backend
uvicorn main:app --reload
```

## 6. Start frontend

From repository root:

```bash
cd frontend
npm run dev
```

## 7. Verify auth flow

1. Sign up from UI.
2. Check Supabase Authentication -> Users.
3. Check `profiles` table for upserted row.
4. Log out and log in.

## 8. Verify onboarding sync

1. Fill onboarding fields in UI.
2. Confirm row in `onboarding_profiles` is created/updated.

## 9. Verify basic transactions CRUD

1. Add transactions from dashboard.
2. Confirm inserts in `transactions` table.

## 10. Verify backend feature routes

Ensure frontend feature pages still call backend endpoints:
- /feature/fire
- /feature/tax
- /feature/life-event
- /feature/couple
- /feature/portfolio-xray

These stay backend-driven for business logic and AI orchestration.