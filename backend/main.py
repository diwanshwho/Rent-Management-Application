import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import inspect, text

from config import CORS_ORIGINS, ADMIN_EMAIL, ADMIN_PASSWORD
from database import engine, SessionLocal, Base
from models import User
from auth import hash_password

from routes.auth import router as auth_router
from routes.tenants import router as tenants_router
from routes.rents import router as rents_router
from routes.notifications import router as notifications_router
from routes.electricity import router as electricity_router

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

# App
app = FastAPI(title="Rent Manager", version="1.0.0", description="Simple PG Rent Management API")

# CORS (still useful for local dev if running frontend separately)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes (must be registered BEFORE static files)
app.include_router(auth_router, prefix="/api")
app.include_router(tenants_router, prefix="/api")
app.include_router(rents_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(electricity_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Rent Manager"}


@app.on_event("startup")
def startup():
    """Run migrations and create default admin user."""
    # Migration: add owner_id column to tenants if it doesn't exist
    insp = inspect(engine)
    if insp.has_table("tenants"):
        columns = [c["name"] for c in insp.get_columns("tenants")]
        if "owner_id" not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE tenants ADD COLUMN owner_id INTEGER"))
                conn.execute(text("UPDATE tenants SET owner_id = 1"))
                conn.commit()
            logger.info("Migration: added owner_id to tenants table")

    # Create default admin user
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not existing:
            admin = User(
                email=ADMIN_EMAIL,
                hashed_password=hash_password(ADMIN_PASSWORD),
                name="Admin",
            )
            db.add(admin)
            db.commit()
            logger.info(f"Admin user created: {ADMIN_EMAIL}")
        else:
            logger.info("Admin user already exists")
    finally:
        db.close()


# Serve frontend static files (AFTER API routes so /api/* takes priority)
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

if os.path.isdir(FRONTEND_DIR):
    # Serve static assets (css, js, images)
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")

    @app.get("/manifest.json")
    def serve_manifest():
        return FileResponse(os.path.join(FRONTEND_DIR, "manifest.json"), media_type="application/json")

    @app.get("/{page}.html")
    def serve_page(page: str):
        """Serve any .html page from the frontend folder."""
        file_path = os.path.join(FRONTEND_DIR, f"{page}.html")
        if not os.path.isfile(file_path):
            file_path = os.path.join(FRONTEND_DIR, "index.html")
        headers = {"Cache-Control": "no-cache, no-store, must-revalidate"}
        return FileResponse(file_path, headers=headers)

    @app.get("/")
    def serve_root():
        """Serve the login page at root."""
        headers = {"Cache-Control": "no-cache, no-store, must-revalidate"}
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"), headers=headers)
