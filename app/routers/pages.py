"""
Page router - serves HTML templates for the website
"""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path

router = APIRouter()

# Setup templates with disabled cache to avoid Jinja2/starlette incompatibility
BASE_DIR = Path(__file__).resolve().parent.parent
env = Environment(
    loader=FileSystemLoader(str(BASE_DIR / "templates")),
    autoescape=select_autoescape(['html', 'xml']),
    cache_size=0  # Disable cache so edits are picked up immediately
)


@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Landing / intro page"""
    template = env.get_template("intro.html")
    return HTMLResponse(template.render(request=request))


@router.get("/map", response_class=HTMLResponse)
async def map_page(request: Request):
    """Interactive fire incident map"""
    template = env.get_template("index.html")
    return HTMLResponse(template.render(request=request))


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Risk prediction dashboard page"""
    template = env.get_template("dashboard.html")
    return HTMLResponse(template.render(request=request))


@router.get("/models", response_class=HTMLResponse)
async def models_page(request: Request):
    """Redirect old models URL to dashboard"""
    return RedirectResponse(url="/dashboard")


@router.get("/about", response_class=HTMLResponse)
async def about_page(request: Request):
    """About page - project info and team"""
    template = env.get_template("about.html")
    return HTMLResponse(template.render(request=request))
