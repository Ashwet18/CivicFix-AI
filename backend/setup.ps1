# Backend Setup Script for Windows PowerShell

Write-Host "🚀 Setting up CivicFix AI Backend..." -ForegroundColor Cyan

# Create virtual environment
Write-Host "`n📦 Creating Python virtual environment..." -ForegroundColor Yellow
python -m venv venv

if (-Not (Test-Path "venv")) {
    Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Virtual environment created" -ForegroundColor Green

# Activate virtual environment and install dependencies
Write-Host "`n📥 Installing dependencies..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Initialize database
Write-Host "`n🗄️ Initializing database..." -ForegroundColor Yellow
python init_db.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to initialize database" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Backend setup complete!" -ForegroundColor Green
Write-Host "`n📝 To start the backend server:" -ForegroundColor Cyan
Write-Host "   1. Activate venv: .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "   2. Run server: uvicorn main:app --reload" -ForegroundColor White
Write-Host "`n🌐 Server will be available at: http://localhost:8000" -ForegroundColor Cyan
