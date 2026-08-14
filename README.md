# CivicFix AI - 24-Hour MVP

A civic-tech platform where citizens can report damaged or destroyed public infrastructure by uploading a photo and location. The system analyzes the issue, estimates its severity, calculates a priority score, detects possible duplicate reports, and provides a government dashboard for managing and resolving issues.

## 🚀 Phase 1: Foundation (COMPLETED)

Phase 1 implements the core foundation:
- ✅ FastAPI backend with SQLite database
- ✅ JWT authentication (register, login, role-based access)
- ✅ React + TypeScript + Tailwind frontend
- ✅ Protected routes for citizen and admin
- ✅ Database models and seed data
- ✅ Basic responsive UI

## 📋 Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher (for frontend)
- Git

## 🛠️ Setup Instructions

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create Python virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment:**
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - Mac/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Initialize database with seed data:**
   ```bash
   python init_db.py
   ```

6. **Run the backend server:**
   ```bash
   uvicorn main:app --reload
   ```

The backend API will be available at: **http://localhost:8000**
API documentation (Swagger): **http://localhost:8000/docs**

### Frontend Setup

1. **Open a NEW terminal** (keep backend running)

2. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

The frontend will be available at: **http://localhost:5173**

## 🔐 Test Credentials

After running `init_db.py`, you can use these demo accounts:

### Admin Account
- **Email:** `admin@civicfix.example`
- **Password:** `admin123`
- **Access:** Admin dashboard, issue management, map view

### Citizen Accounts
- **Email:** `citizen@test.example`
- **Password:** `test123`
- **Access:** Report issues, view own issues

- **Email:** `jane@test.example`
- **Password:** `test123`
- **Access:** Report issues, view own issues

## 📁 Project Structure

```
CivicFix-AI/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── config.py               # Configuration settings
│   ├── database.py             # Database connection
│   ├── models.py               # SQLAlchemy models
│   ├── schemas.py              # Pydantic schemas
│   ├── auth.py                 # Authentication utilities
│   ├── init_db.py              # Database initialization script
│   ├── requirements.txt        # Python dependencies
│   └── routers/
│       └── auth_router.py      # Auth endpoints
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx           # Entry point
│   │   ├── App.tsx            # Main app with routing
│   │   ├── index.css          # Tailwind CSS
│   │   ├── types/
│   │   │   └── index.ts       # TypeScript types
│   │   ├── services/
│   │   │   ├── api.ts         # Axios configuration
│   │   │   └── authService.ts # Auth API calls
│   │   ├── context/
│   │   │   └── AuthContext.tsx # Auth state management
│   │   ├── components/
│   │   │   ├── Header.tsx     # Navigation header
│   │   │   └── ProtectedRoute.tsx # Route guard
│   │   └── pages/
│   │       ├── HomePage.tsx   # Landing page
│   │       ├── LoginPage.tsx  # Login form
│   │       ├── RegisterPage.tsx # Registration form
│   │       ├── CitizenDashboard.tsx # Citizen area
│   │       └── AdminDashboard.tsx # Admin area
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── ARCHITECTURE.md             # Complete system architecture
└── README.md                   # This file
```

## 🧪 Testing Phase 1

### 1. Health Check
```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "CivicFix AI API is running",
  "version": "1.0.0"
}
```

### 2. Test Registration
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "password": "test123",
    "full_name": "Test User",
    "role": "citizen"
  }'
```

### 3. Test Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen@test.example",
    "password": "test123"
  }'
```

### 4. Frontend Testing
1. Open http://localhost:5173 in your browser
2. Click "Login"
3. Use admin credentials: `admin@civicfix.example` / `admin123`
4. Verify you're redirected to admin dashboard placeholder
5. Logout and login as citizen: `citizen@test.example` / `test123`
6. Verify you're redirected to citizen dashboard placeholder

## 🔒 Database

- **Type:** SQLite
- **Location:** `backend/civicfix.db`
- **Tables:**
  - `users` - User accounts (citizens and admins)
  - `issues` - Reported infrastructure issues
  - `duplicate_groups` - Links between duplicate issues
  - `issue_history` - Status change logs

## 🎯 Phase 1 Checklist

- [x] Backend FastAPI structure
- [x] SQLite database with SQLAlchemy
- [x] User model with roles
- [x] Issue model (full schema ready)
- [x] DuplicateGroup and IssueHistory models
- [x] Database initialization with seed data
- [x] JWT authentication (register, login, current user)
- [x] Protected routes with role verification
- [x] CORS configuration
- [x] Health check endpoint
- [x] React + TypeScript + Vite frontend
- [x] Tailwind CSS configuration
- [x] React Router setup
- [x] Authentication context
- [x] Login/Register pages
- [x] Protected route component
- [x] Role-based routing (citizen/admin)
- [x] Responsive header with navigation
- [x] Landing page
- [x] Basic visual identity

## 🚧 Next Steps (Phase 2)

Phase 2 will implement:
- Issue submission with image upload
- Location picker (map integration)
- Rule-based AI analysis service
- Duplicate detection (GPS + category)
- Priority scoring
- "My Issues" page for citizens

## ⚠️ Important Notes

### MVP Constraints
- **NO ML libraries** in Phase 1 (CLIP, PyTorch, etc.)
- Database is SQLite (sufficient for MVP)
- Authentication is simple JWT (no OAuth)
- File storage is local (no S3)
- All dependencies are minimal and necessary

### Known Limitations
- No password reset (out of scope for MVP)
- No email verification (out of scope for MVP)
- Admin dashboard shows placeholder (Phase 3)
- Citizen features show placeholder (Phase 2)

## 📝 Environment Variables

Create a `.env` file in the backend directory (optional):

```env
SECRET_KEY=your-secret-key-change-in-production
DATABASE_URL=sqlite:///./civicfix.db
DEBUG=True
```

## 🐛 Troubleshooting

### Backend won't start
- Make sure virtual environment is activated
- Check if port 8000 is available
- Verify all dependencies are installed: `pip list`

### Frontend won't start
- Make sure Node.js is installed: `node --version`
- Delete `node_modules` and run `npm install` again
- Check if port 5173 is available

### Database errors
- Delete `civicfix.db` and run `python init_db.py` again
- Check database permissions

### CORS errors
- Verify backend is running on port 8000
- Check CORS configuration in `backend/config.py`

## 📖 API Documentation

Once the backend is running, visit:
- **Interactive Docs:** http://localhost:8000/docs
- **Alternative Docs:** http://localhost:8000/redoc

## 📞 Support

For issues or questions about this phase, refer to:
- `ARCHITECTURE.md` for detailed system design
- Backend API docs at `/docs`
- Console logs for debugging

---

**Status:** Phase 1 Complete ✅
**Next:** Awaiting approval for Phase 2 implementation
