# ⚡ Quick Start - CivicFix AI

## Backend (Essential)

```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Initialize database with seed data
python init_db.py

# Start server
python run.py
```

**Backend running at:** http://localhost:8000
**API Docs:** http://localhost:8000/docs

## Frontend (Optional - requires Node.js)

```powershell
# Open NEW terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Frontend running at:** http://localhost:5173

## Test Accounts

**Admin:**
- Email: `admin@civicfix.example`
- Password: `admin123`

**Citizen:**
- Email: `citizen@test.example`
- Password: `test123`

## Quick Tests

### 1. Health Check
```powershell
Invoke-RestMethod http://localhost:8000/api/health
```

### 2. Login
```powershell
$body = '{"email":"citizen@test.example","password":"test123"}' | ConvertFrom-Json | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/api/auth/login -Method Post -Body $body -ContentType "application/json"
```

## Common Commands

**Stop server:** `Ctrl+C`
**Deactivate venv:** `deactivate`
**Reset database:** Delete `civicfix.db` and run `python init_db.py`

## Need Help?

- Full setup: `SETUP_GUIDE.md`
- Architecture: `ARCHITECTURE.md`
- Complete docs: `README.md`
- Phase 1 summary: `PHASE1_COMPLETE.md`
