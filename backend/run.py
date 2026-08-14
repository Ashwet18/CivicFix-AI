"""
Simple script to run the FastAPI backend server
Usage: python run.py
"""
import uvicorn

if __name__ == "__main__":
    print("🚀 Starting CivicFix AI Backend...")
    print("📍 Server will be available at: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("\n⚠️  Press CTRL+C to stop the server\n")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
