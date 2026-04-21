"""Auth endpoints."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from models import LoginRequest
from auth import (
    verify_password,
    create_access_token,
    create_refresh_token,
    set_auth_cookies,
    clear_auth_cookies,
    get_current_user_from_request,
)

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def build_auth_router(db):
    router = APIRouter(prefix="/auth", tags=["auth"])

    async def current_user(request: Request):
        return await get_current_user_from_request(request, db)

    @router.post("/login")
    async def login(body: LoginRequest, request: Request, response: Response):
        email = body.email.lower().strip()
        ip = (request.client.host if request.client else "?")
        now = datetime.now(timezone.utc)

        # brute-force lockout check
        window_start = now - timedelta(minutes=LOCKOUT_MINUTES)
        recent_failures = await db.login_attempts.count_documents({
            "email": email,
            "success": False,
            "at": {"$gte": window_start.isoformat()},
        })
        if recent_failures >= MAX_FAILED_ATTEMPTS:
            raise HTTPException(
                status_code=429,
                detail=f"Çok fazla başarısız giriş denemesi. Lütfen {LOCKOUT_MINUTES} dakika sonra tekrar deneyin.",
            )

        user = await db.users.find_one({"email": email}, {"_id": 0})
        ok = user is not None and verify_password(body.password, user.get("password_hash", ""))

        # log attempt
        await db.login_attempts.insert_one({
            "email": email,
            "ip": ip,
            "success": ok,
            "at": now.isoformat(),
            "at_dt": now,
        })

        if not ok:
            raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")

        access = create_access_token(user["id"], user["email"], user["role"])
        refresh = create_refresh_token(user["id"])
        set_auth_cookies(response, access, refresh)
        user.pop("password_hash", None)
        return {"user": user, "access_token": access}

    @router.post("/logout")
    async def logout(response: Response, user=Depends(current_user)):
        clear_auth_cookies(response)
        return {"ok": True}

    @router.get("/me")
    async def me(user=Depends(current_user)):
        return user

    return router
