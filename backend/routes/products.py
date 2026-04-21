"""Products endpoints."""
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from auth import get_current_user_from_request
from feed_sync import sync_products


def build_products_router(db):
    router = APIRouter(prefix="/products", tags=["products"])

    async def current_user(request: Request):
        return await get_current_user_from_request(request, db)

    @router.get("")
    async def list_products(
        search: str = Query(""),
        limit: int = Query(100),
        user=Depends(current_user),
    ):
        q: dict = {}
        if search:
            q["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"code": {"$regex": search, "$options": "i"}},
                {"gtin": {"$regex": search, "$options": "i"}},
                {"brand": {"$regex": search, "$options": "i"}},
            ]
        items = await db.products.find(q, {"_id": 0}).sort("title", 1).limit(limit).to_list(limit)
        return items

    @router.get("/count")
    async def count_products(user=Depends(current_user)):
        count = await db.products.count_documents({})
        last = await db.sync_logs.find_one({"type": "products_feed"}, {"_id": 0}, sort=[("at", -1)])
        return {"count": count, "last_sync": last}

    @router.post("/sync")
    async def manual_sync(user=Depends(current_user)):
        result = await sync_products(db)
        return result

    @router.get("/{product_id}")
    async def get_product(product_id: str, user=Depends(current_user)):
        p = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not p:
            raise HTTPException(status_code=404, detail="Ürün bulunamadı")
        return p

    return router
