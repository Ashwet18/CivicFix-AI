# 🚀 Quick Setup Guide - CivicFix AI Phase 1

## Prerequisites Check

Before starting, verify you have:
- [ ] Python 3.10+ installed (`python --version`)
- [ ] Node.js 18+ installed (`node --version`) - Not needed for backend only
- [ ] Git installed (optional)

## Backend Setup (Required)

### Option 1: Automatic Setup (Recommended)

1. **Open PowerShell as Administrator**

2. **Navigate to backend directory:**
   ```powershell
   cd "c:\Users\ashwet\OneDrive\Documents\Project26\CivicFix-AI\backend"
   ```

3. **Allow script execution (if needed):**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

4. **Run setup script:**
   ```powershell
   .\setup.ps1
   ```

5. **Start the backend:**
   ```powershell
   .\venv\Scripts\Activate.ps1
   uvicorn main:app --reload
   ```

### Option 2: Manual Setup

1. **Navigate to backend:**
   ```powershell
   cd "c:\Users\ashwet\OneDrive\Documents\Project26\CivicFix-AI\backend"
   ```

2. **Create virtual environment:**
   ```powershell
   python -m venv venv
   ```

3. **Activate virtual environment:**
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   
   Note: You should see `(venv)` in your terminal prompt

4. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

5. **Initialize database:**
   ```powershell
   python init_db.py
   ```

6. **Start the server:**
   ```powershell
   uvicorn main:app --reload
   ```

### Verify Backend is Running

Open a browser and visit:
- **API:** http://localhost:8000
- **Health Check:** http://localhost:8000/api/health
- **API Docs:** http://localhost:8000/docs

You should see the API documentation page.

## Frontend Setup (For full testing)

**Note:** npm is not currently available in your environment. You'll need to install Node.js first or test with backend API only.

### If Node.js is installed:

1. **Open a NEW PowerShell window** (keep backend running)

2. **Navigate to frontend:**
   ```powershell
   cd "c:\Users\ashwet\OneDrive\Documents\Project26\CivicFix-AI\frontend"
   ```

3. **Install dependencies:**
   ```powershell
   npm install
   ```

4. **Start development server:**
   ```powershell
   npm run dev
   ```

5. **Open in browser:**
   http://localhost:5173

## Test Credentials

Once backend is running, use these accounts:

### Admin Account
```
Email: admin@civicfix.example
Password: admin123
```

### Citizen Account
```
Email: citizen@test.example
Password: test123
```

## Testing the Backend (Without Frontend)

### 1. Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/health" -Method Get
```

### 2. Register a New User
```powershell
$body = @{
    email = "test@example.com"
    password = "test123"
    full_name = "Test User"
    role = "citizen"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### 3. Login
```powershell
$credentials = @{
    email = "citizen@test.example"
    password = "test123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" `
    -Method Post `
    -Body $credentials `
    -ContentType "application/json"

$token = $response.access_token
Write-Host "Token: $token"
```

### 4. Get Current User (requires token from step 3)
```powershell
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/me" `
    -Method Get `
    -Headers $headers
```

## Common Issues

### Issue: "Python is not recognized"
**Solution:** Install Python 3.10+ from python.org and add to PATH

### Issue: "venv creation failed"
**Solution:** 
- Make sure you're in the backend directory
- Try: `python -m pip install virtualenv`
- Then: `python -m virtualenv venv`

### Issue: "pip install failed"
**Solution:**
- Upgrade pip: `python -m pip install --upgrade pip`
- Try installing packages one by one

### Issue: "Port 8000 already in use"
**Solution:**
- Find and kill the process: `Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process`
- Or use a different port: `uvicorn main:app --reload --port 8001`

### Issue: "database locked"
**Solution:**
- Close all terminals
- Delete `civicfix.db`
- Run `python init_db.py` again

### Issue: "Cannot activate venv"
**Solution:**
- Run PowerShell as Administrator
- Execute: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Try activating again

## Stopping the Servers

- **Backend:** Press `Ctrl+C` in the terminal
- **Frontend:** Press `Ctrl+C` in the terminal

## Next Steps

After Phase 1 is verified:
1. Backend API is working ✅
2. Database is initialized ✅
3. Authentication works ✅

You're ready for Phase 2:
- Issue submission with image upload
- AI analysis service
- Duplicate detection
- Priority scoring

## Need Help?

Check these resources:
- `README.md` - Complete project documentation
- `ARCHITECTURE.md` - System design and architecture
- http://localhost:8000/docs - Interactive API documentation
- Backend logs in terminal for error messages
