from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import os

from routers import auth, patients, appointments, symptoms, medications, calendar, search
from routers import setup
import secrets_manager

app = FastAPI(title="MedVault", version="1.0.0")


@app.middleware("http")
async def setup_guard(request: Request, call_next):
    """
    Before setup is complete, block all API calls except /api/setup/*.
    Static files and the SPA shell pass through so the browser can render
    the setup wizard.
    """
    if not secrets_manager.is_configured():
        path = request.url.path
        if path.startswith("/api/") and not path.startswith("/api/setup"):
            return JSONResponse(
                {"detail": "Setup required", "setup_required": True},
                status_code=503,
            )
    return await call_next(request)


# Setup (must be first so it works before the app is configured)
app.include_router(setup.router)

# Auth & application routers
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(appointments.router)
app.include_router(symptoms.router)
app.include_router(medications.router)
app.include_router(calendar.router)
app.include_router(search.router)

# Serve frontend static files
frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.isdir(frontend_path):
    app.mount("/css", StaticFiles(directory=os.path.join(frontend_path, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(frontend_path, "js")), name="js")
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        index = os.path.join(frontend_path, "index.html")
        return FileResponse(index)
