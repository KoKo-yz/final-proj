from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse

def is_authenticated(request: Request):
    return True # Authentication disabled for now

async def verify_auth(request: Request):
    pass # Authentication disabled for now
