import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.session import init_db
from app.api import routes_upload, routes_run, routes_approve, routes_export, routes_cost, routes_daos

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schemas on startup
    await init_db()
    os.makedirs(settings.WATCH_DIR, exist_ok=True)
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="SuperDocs DAO Treasury & Governance Conflict Analyst Agentic Backend API",
    lifespan=lifespan
)

# CORS middleware for React UI connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(routes_daos.router)
app.include_router(routes_upload.router)
app.include_router(routes_run.router)
app.include_router(routes_approve.router)
app.include_router(routes_export.router)
app.include_router(routes_cost.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "docs_url": "/docs",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
