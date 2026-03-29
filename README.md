# Money Mentor

AI-powered personal finance assistant with a FastAPI backend and React + Vite frontend.

## Project Structure

```
Money_Mentor/
├─ backend/
│  ├─ main.py
│  ├─ config.py
│  ├─ requirements.txt
│  ├─ .env.example
│  ├─ agents/
│  │  ├─ behavior_agent.py
│  │  ├─ compliance_agent.py
│  │  ├─ explanation_agent.py
│  │  ├─ orshestrator.py
│  │  └─ ...
│  ├─ db/
│  │  ├─ supabase_client.py
│  │  └─ user_repository.py
│  ├─ services/
│  │  └─ gemini_services.py
│  └─ tools/
│     └─ sip_calculator.py
├─ frontend/
│  ├─ package.json
│  ├─ index.html
│  ├─ styles.css
│  ├─ src/
│  │  ├─ App.jsx
│  │  ├─ main.jsx
│  │  ├─ pages/
│  │  ├─ features/
│  │  └─ services/
├─ project setup/
│  ├─ start-dev.ps1
│  └─ start-dev.bat
└─ README.md
```

## Tech Stack

- Backend: FastAPI, Pydantic, python-dotenv, Google Gemini SDK, requests, pypdf
- Frontend: React 18, Vite 5, React Router, Axios
- Runtime: Python 3.10+ and Node.js 18+

## Backend Setup

1. Create and activate virtual environment:

```powershell
cd D:\VIT\ET_HACKATHON\CURRENT\Money_Mentor
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r backend\requirements.txt
```

3. Create environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

4. Update backend\.env with your keys (at minimum GEMINI_API_KEY).

5. Start backend server:

```powershell
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Backend URLs:

- API root: http://127.0.0.1:8000/
- Swagger docs: http://127.0.0.1:8000/docs

## Frontend Setup

1. Install dependencies:

```powershell
cd D:\VIT\ET_HACKATHON\CURRENT\Money_Mentor\frontend
npm install
```

2. Start dev server:

```powershell
npm run dev
```

Frontend URL:

- http://127.0.0.1:5173/

## One-Command Dev Start

From project root:

```powershell
.\project setup\start-dev.ps1
```

Or from cmd:

```bat
.\project setup\start-dev.bat
```

What start script does:

- Creates .venv if missing
- Installs backend and frontend dependencies (unless -SkipInstall is used)
- Starts backend and frontend in separate PowerShell windows
- Opens frontend automatically after it is reachable

Optional skip install:

```powershell
.\project setup\start-dev.ps1 -SkipInstall
```

## API Routes (Current)

Base URL: http://127.0.0.1:8000

- GET /
- POST /ask
- POST /feature/fire
- POST /feature/couple
- POST /feature/couple/import-profile

## Example Request Payloads

### 1) Ask AI

POST /ask

```json
{
  "user_id": 1,
  "query": "How can I optimize my monthly finances?"
}
```

### 2) FIRE Plan

POST /feature/fire

```json
{
  "user_id": 1,
  "retirement_age": 50,
  "current_age": 28,
  "monthly_income": 120000,
  "monthly_expenses": 60000,
  "current_investments": 850000,
  "risk_level": "moderate"
}
```

### 3) Couple Planner

POST /feature/couple

```json
{
  "user_id": 1,
  "partner1_income": 1800000,
  "partner1_expenses": 720000,
  "partner1_investments": 900000,
  "partner2_income": 1200000,
  "partner2_expenses": 540000,
  "partner2_investments": 550000,
  "shared_goals": "home down payment and travel",
  "risk_preference": "moderate"
}
```

### 4) Import Partner Profile (Couple Planner)

POST /feature/couple/import-profile

```json
{
  "email": "partner@example.com"
}
```

## Environment Variables

Use backend\.env (see backend\.env.example):

- GEMINI_API_KEY (required for Gemini-powered responses)
- GEMINI_MODEL (optional)
- FIRE_INFLATION_RATE (optional)
- FIRE_ANNUAL_RETURN (optional)
- FIRE_SAFE_WITHDRAWAL_RATE (optional)
- SUPABASE_URL (optional)
- SUPABASE_SECRET_KEY (optional)
- SUPABASE_PROFILE_TABLE (optional)

## Notes

- CORS is configured for frontend on localhost:5173.
- If Gemini key is missing, some responses fall back to deterministic guidance.
- Frontend uses VITE_API_BASE_URL if provided; otherwise defaults to http://127.0.0.1:8000.

## Quick Troubleshooting

1. Frontend cannot call backend:
- Ensure backend is running on port 8000.
- Ensure frontend is running on port 5173.

2. Gemini response not coming:
- Verify GEMINI_API_KEY in backend\.env.
- Restart backend after changing environment variables.

3. Partner profile import fails:
- Ensure partner has a registered account.
- Confirm partner email exists in `profiles` table.
