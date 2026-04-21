"""Myikas Google Shopping feed sync."""
import os
import re
import asyncio
import logging
from datetime import datetime, timezone
import httpx
from lxml import etree

logger = logging.getLogger(__name__)

NS = {"g": "http://base.google.com/ns/1.0"}
CODE_PATTERNS = [
    re.compile(r"(?:Ür[üu]n\s*Kodu|Ürün Kodu|Ürün\s*Kod|Product\s*Code)[\s:]*\n?\s*([A-Z0-9][A-Z0-9.\-_\/]*)", re.IGNORECASE),
    re.compile(r"Kod[\s:]*\n?\s*([A-Z0-9][A-Z0-9.\-_\/]{3,})", re.IGNORECASE),
]


def _txt(el, tag: str) -> str:
    found = el.find(f"g:{tag}", NS)
    if found is not None and found.text:
        return found.text.strip()
    return ""


def _parse_price(raw: str):
    """Parse '18966.30TRY' -> (18966.30, 'TRY')."""
    if not raw:
        return 0.0, "TRY"
    m = re.match(r"([\d]+(?:[.,]\d+)?)\s*([A-Z]{3})?", raw.strip())
    if not m:
        return 0.0, "TRY"
    try:
        price = float(m.group(1).replace(",", "."))
    except ValueError:
        price = 0.0
    currency = (m.group(2) or "TRY").upper()
    return price, currency


def _extract_code(description: str, gtin: str, title: str) -> str:
    """Extract product code from HTML-encoded description."""
    import html
    txt = html.unescape(description or "")
    for pat in CODE_PATTERNS:
        m = pat.search(txt)
        if m:
            code = m.group(1).strip()
            if len(code) >= 3:
                return code
    if gtin:
        return gtin
    return ""


def parse_feed_xml(xml_bytes: bytes) -> list[dict]:
    root = etree.fromstring(xml_bytes)
    items = root.findall(".//item")
    parsed: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()
    for el in items:
        pid = _txt(el, "id")
        title = _txt(el, "title")
        description = _txt(el, "description")
        link = _txt(el, "link")
        image = _txt(el, "image_link")
        brand = _txt(el, "brand")
        ptype = _txt(el, "product_type")
        gtin = _txt(el, "gtin")
        price_raw = _txt(el, "price")
        price, currency = _parse_price(price_raw)

        # additional images (there can be multiple)
        additional = [
            (x.text or "").strip()
            for x in el.findall("g:additional_image_link", NS)
            if x is not None and x.text
        ]

        code = _extract_code(description, gtin, title)

        parsed.append({
            "id": pid,
            "code": code,
            "title": title,
            "description": description,
            "link": link,
            "image": image,
            "additional_images": additional,
            "price": price,
            "currency": currency,
            "brand": brand,
            "product_type": ptype,
            "gtin": gtin,
            "synced_at": now,
        })
    return parsed


async def fetch_feed(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


async def sync_products(db) -> dict:
    url = os.environ.get("PRODUCT_FEED_URL", "")
    if not url:
        return {"success": False, "error": "PRODUCT_FEED_URL tanımlı değil", "count": 0}
    try:
        xml_bytes = await fetch_feed(url)
        products = parse_feed_xml(xml_bytes)
        if not products:
            return {"success": False, "error": "Feed'de ürün bulunamadı", "count": 0}
        # upsert each
        ops = 0
        for p in products:
            await db.products.update_one(
                {"id": p["id"]},
                {"$set": p},
                upsert=True,
            )
            ops += 1
        # record sync info
        await db.sync_logs.insert_one({
            "type": "products_feed",
            "count": ops,
            "at": datetime.now(timezone.utc).isoformat(),
            "success": True,
        })
        logger.info(f"Product feed sync complete: {ops} products")
        return {"success": True, "count": ops, "synced_at": products[0]["synced_at"]}
    except Exception as e:
        logger.exception("Feed sync failed")
        await db.sync_logs.insert_one({
            "type": "products_feed",
            "count": 0,
            "at": datetime.now(timezone.utc).isoformat(),
            "success": False,
            "error": str(e),
        })
        return {"success": False, "error": str(e), "count": 0}


async def start_daily_scheduler(db):
    """Run feed sync immediately once, then every 24 hours."""
    async def _loop():
        # initial sync (non-blocking to startup)
        await asyncio.sleep(5)
        try:
            await sync_products(db)
        except Exception:
            logger.exception("Initial feed sync failed")
        while True:
            await asyncio.sleep(24 * 3600)
            try:
                await sync_products(db)
            except Exception:
                logger.exception("Scheduled feed sync failed")

    asyncio.create_task(_loop())
