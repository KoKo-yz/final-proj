"""
Page router - serves HTML templates for the website
"""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path

from app.auth import is_authenticated

router = APIRouter()

# Setup templates with disabled cache to avoid Jinja2/starlette incompatibility
BASE_DIR = Path(__file__).resolve().parent.parent
env = Environment(
    loader=FileSystemLoader(str(BASE_DIR / "templates")),
    autoescape=select_autoescape(['html', 'xml']),
    cache_size=0  # Disable cache so edits are picked up immediately
)

# Configuration
SITE_PASSWORD = "jordanfire2026"  # CHANGE THIS PASSWORD HERE

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """Serve the specialized login page"""
    if is_authenticated(request):
        return RedirectResponse(url="/", status_code=303)
    template = env.get_template("login.html")
    return HTMLResponse(template.render(request=request))

@router.post("/login")
async def login_submit(request: Request):
    """Handle login form submission"""
    form_data = await request.form()
    password = form_data.get("password")
    
    if password == SITE_PASSWORD:
        request.session["authenticated"] = True
        return RedirectResponse(url="/", status_code=303)
    
    # Reload login page with error
    template = env.get_template("login.html")
    return HTMLResponse(template.render(request=request, error="Invalid password. Please try again."))

@router.get("/logout")
async def logout(request: Request):
    """Clear session and logout"""
    request.session.clear()
    return RedirectResponse(url="/login")

@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Landing / intro page"""
    if not is_authenticated(request):
        return RedirectResponse(url="/login")
    template = env.get_template("intro.html")
    return HTMLResponse(template.render(request=request))

@router.get("/map", response_class=HTMLResponse)
async def map_page(request: Request, embed: int = 0):
    """Interactive fire incident map"""
    if not is_authenticated(request):
        return RedirectResponse(url="/login")
    template = env.get_template("index.html")
    return HTMLResponse(template.render(request=request, embed=embed))

@router.get("/explorer", response_class=HTMLResponse)
async def explorer_page(request: Request, embed: int = 0):
    """Legacy interactive fire explorer map"""
    if not is_authenticated(request):
        return RedirectResponse(url="/login")
    template = env.get_template("explorer.html")
    return HTMLResponse(template.render(request=request, embed=embed))

@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Risk prediction dashboard page"""
    if not is_authenticated(request):
        return RedirectResponse(url="/login")
    template = env.get_template("dashboard.html")
    return HTMLResponse(template.render(request=request))

@router.get("/models", response_class=HTMLResponse)
async def models_page(request: Request):
    """Redirect old models URL to dashboard"""
    return RedirectResponse(url="/dashboard")

@router.get("/about", response_class=HTMLResponse)
async def about_page(request: Request):
    """About page - project info and team"""
    if not is_authenticated(request):
        return RedirectResponse(url="/login")
    template = env.get_template("about.html")
    return HTMLResponse(template.render(request=request))
