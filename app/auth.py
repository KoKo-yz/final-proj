from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse

def is_authenticated(request: Request):
    return request.session.get("authenticated") == True

async def verify_auth(request: Request):
    if not is_authenticated(request):
        raise HTTPException(status_code=403, detail="Unauthorized access to API")
