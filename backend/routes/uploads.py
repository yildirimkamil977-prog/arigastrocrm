"""File upload endpoint — saves images to shared /app/uploads volume."""
import os
import secrets
from pathlib import Path

from fastapi import APIRouter, Request, Depends, UploadFile, File, HTTPException
from auth import get_current_user_from_request

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB


def build_uploads_router(db):
    router = APIRouter(prefix="/uploads", tags=["uploads"])

    async def current_user(request: Request):
        return await get_current_user_from_request(request, db)

    @router.post("")
    async def upload_file(file: UploadFile = File(...), user=Depends(current_user)):
        filename = file.filename or "upload"
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXT:
            raise HTTPException(
                status_code=400,
                detail=f"Desteklenmeyen format. İzinli: {', '.join(sorted(ALLOWED_EXT))}",
            )
        content = await file.read()
        if len(content) > MAX_BYTES:
            raise HTTPException(status_code=400, detail="Dosya 5 MB'den büyük olamaz")

        new_name = f"{secrets.token_hex(8)}{ext}"
        dest = UPLOAD_DIR / new_name
        dest.write_bytes(content)

        base = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
        url = f"{base}/uploads/{new_name}" if base else f"/uploads/{new_name}"
        return {"url": url, "filename": new_name, "size": len(content)}

    return router
