"""
FastAPI main application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from config import settings
from routers import auth_router
from schemas import HealthResponse

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving uploaded images
uploads_dir = Path("uploads")
if uploads_dir.exists():
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth_router.router)

# Import and include issues router
from routers import issues_router
app.include_router(issues_router.router)

# Import and include admin router
from routers import admin_router
app.include_router(admin_router.router)


# Health check endpoint
@app.get("/api/health", response_model=HealthResponse)
def health_check():
    """
    Health check endpoint to verify API is running.
    """
    return {
        "status": "ok",
        "message": "CivicFix AI API is running",
        "version": settings.APP_VERSION
    }


# Root endpoint
@app.get("/")
def root():
    """
    Root endpoint with API information.
    """
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/health"
    }
