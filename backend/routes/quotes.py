"""Quote endpoints: CRUD, revisions, stats, email, public share."""
import asyncio
import base64
import logging
import os
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Request, Response, HTTPException, Depends, Query
from pydantic import BaseModel
import resend

from models import QuoteCreate, QuoteUpdate, SendQuoteEmailRequest, uid
from auth import get_current_user_from_request
from routes.settings import get_settings_doc

logger = logging.getLogger(__name__)

VALID_STATUSES = {"taslak", "gonderildi", "kabul", "red", "suresi_doldu"}


class PdfShareRequest(BaseModel):
    pdf_base64: str


def compute_totals(items, vat_rate: float, discount_rate: float) -> dict:
    subtotal = 0.0
    for it in items:
        q = float(getattr(it, "quantity", None) or it.get("quantity", 0) or 0) if not isinstance(it, dict) else float(it.get("quantity", 0) or 0)
        p = float(getattr(it, "unit_price", None) or it.get("unit_price", 0) or 0) if not isinstance(it, dict) else float(it.get("unit_price", 0) or 0)
        d = float(getattr(it, "discount_percent", None) or it.get("discount_percent", 0) or 0) if not isinstance(it, dict) else float(it.get("discount_percent", 0) or 0)
        line = q * p
        line -= line * (d / 100.0)
        subtotal += line
    vat_amount = subtotal * (vat_rate / 100.0)
    total_with_vat = subtotal + vat_amount
    discount_amount = total_with_vat * (discount_rate / 100.0)
    grand_total = total_with_vat - discount_amount
    return {
        "subtotal": round(subtotal, 2),
        "vat_amount": round(vat_amount, 2),
        "total_with_vat": round(total_with_vat, 2),
        "discount_amount": round(discount_amount, 2),
        "grand_total": round(grand_total, 2),
    }


async def generate_quote_no(db, parent: dict | None = None, revision_number: int = 0) -> str:
    """Generate AR-YYYYMM-NNNN; revisions append -Rx."""
    now = datetime.now(timezone.utc)
    prefix = f"AR-{now.year}{now.month:02d}-"
    if parent and revision_number > 0:
        return f"{parent['quote_no']}-R{revision_number}"
    # find last with prefix
    last = await db.quotes.find_one(
        {"quote_no": {"$regex": f"^{prefix}\\d+$"}},
        sort=[("quote_no", -1)],
        projection={"_id": 0, "quote_no": 1},
    )
    if last:
        try:
            seq = int(last["quote_no"].split("-")[-1]) + 1
        except Exception:
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


def build_quotes_router(db):
    router = APIRouter(prefix="/quotes", tags=["quotes"])

    async def current_user(request: Request):
        return await get_current_user_from_request(request, db)

    @router.get("")
    async def list_quotes(
        search: str = Query(""),
        status: str = Query(""),
        customer_id: str = Query(""),
        date_from: str = Query(""),
        date_to: str = Query(""),
        user=Depends(current_user),
    ):
        q: dict = {}
        if status:
            q["status"] = status
        if customer_id:
            q["customer_id"] = customer_id
        if date_from:
            q.setdefault("issue_date", {})["$gte"] = date_from
        if date_to:
            q.setdefault("issue_date", {})["$lte"] = date_to + "T23:59:59"
        if search:
            # match by quote_no; will additionally filter by customer name later
            q["$or"] = [
                {"quote_no": {"$regex": search, "$options": "i"}},
                {"notes": {"$regex": search, "$options": "i"}},
            ]
        quotes = await db.quotes.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)

        # If search provided, also include quotes whose customer matches
        if search:
            matching_customers = await db.customers.find(
                {
                    "$or": [
                        {"company_name": {"$regex": search, "$options": "i"}},
                        {"tax_number": {"$regex": search, "$options": "i"}},
                    ]
                },
                {"_id": 0, "id": 1},
            ).to_list(1000)
            customer_ids = [c["id"] for c in matching_customers]
            if customer_ids:
                extra_q = {"customer_id": {"$in": customer_ids}}
                if status:
                    extra_q["status"] = status
                extras = await db.quotes.find(extra_q, {"_id": 0}).to_list(2000)
                # merge unique
                existing_ids = {x["id"] for x in quotes}
                for e in extras:
                    if e["id"] not in existing_ids:
                        quotes.append(e)

        # attach minimal customer info
        cust_ids = list({q_.get("customer_id") for q_ in quotes if q_.get("customer_id")})
        if cust_ids:
            cust_map = {
                c["id"]: c
                for c in await db.customers.find(
                    {"id": {"$in": cust_ids}},
                    {"_id": 0, "id": 1, "company_name": 1, "tax_number": 1},
                ).to_list(len(cust_ids))
            }
            for q_ in quotes:
                q_["customer"] = cust_map.get(q_.get("customer_id"))

        # sort by created_at desc
        quotes.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return quotes

    @router.get("/stats")
    async def quote_stats(user=Depends(current_user)):
        pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
        result = await db.quotes.aggregate(pipeline).to_list(20)
        stats = {s: 0 for s in VALID_STATUSES}
        for r in result:
            if r["_id"] in stats:
                stats[r["_id"]] = r["count"]
        total = sum(stats.values())
        # recent quotes
        recent = await db.quotes.find({}, {"_id": 0}).sort("created_at", -1).limit(8).to_list(8)
        cust_ids = list({q.get("customer_id") for q in recent if q.get("customer_id")})
        cust_map = {}
        if cust_ids:
            cust_map = {
                c["id"]: c
                for c in await db.customers.find(
                    {"id": {"$in": cust_ids}},
                    {"_id": 0, "id": 1, "company_name": 1},
                ).to_list(len(cust_ids))
            }
        for q in recent:
            q["customer"] = cust_map.get(q.get("customer_id"))

        customer_count = await db.customers.count_documents({})
        product_count = await db.products.count_documents({})
        return {
            "by_status": stats,
            "total": total,
            "customer_count": customer_count,
            "product_count": product_count,
            "recent": recent,
        }

    @router.get("/{quote_id}")
    async def get_quote(quote_id: str, user=Depends(current_user)):
        q = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
        if not q:
            raise HTTPException(status_code=404, detail="Teklif bulunamadı")
        if q.get("customer_id"):
            cust = await db.customers.find_one({"id": q["customer_id"]}, {"_id": 0})
            q["customer"] = cust
        # revisions list
        revisions = await db.quotes.find(
            {"revision_of": q.get("revision_of") or quote_id},
            {"_id": 0, "id": 1, "quote_no": 1, "revision_number": 1, "created_at": 1, "status": 1},
        ).sort("revision_number", 1).to_list(100)
        q["revisions"] = revisions
        return q

    @router.post("")
    async def create_quote(body: QuoteCreate, user=Depends(current_user)):
        cust = await db.customers.find_one({"id": body.customer_id})
        if not cust:
            raise HTTPException(status_code=400, detail="Müşteri bulunamadı")
        if body.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Geçersiz durum")
        now = datetime.now(timezone.utc).isoformat()
        quote_no = await generate_quote_no(db)
        doc = body.model_dump()
        doc["id"] = uid()
        doc["quote_no"] = quote_no
        doc["issue_date"] = now
        doc["created_at"] = now
        doc["updated_at"] = now
        doc["created_by"] = user["id"]
        doc["revision_of"] = None
        doc["revision_number"] = 0
        totals = compute_totals(doc["items"], doc["vat_rate"], doc["discount_rate"])
        doc.update(totals)
        await db.quotes.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.put("/{quote_id}")
    async def update_quote(quote_id: str, body: QuoteUpdate, user=Depends(current_user)):
        existing = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Teklif bulunamadı")
        update = {k: v for k, v in body.model_dump().items() if v is not None}
        if "status" in update and update["status"] not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Geçersiz durum")
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        merged = {**existing, **update}
        totals = compute_totals(
            merged.get("items", []),
            merged.get("vat_rate", 0),
            merged.get("discount_rate", 0),
        )
        update.update(totals)
        await db.quotes.update_one({"id": quote_id}, {"$set": update})
        q = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
        return q

    @router.post("/{quote_id}/revise")
    async def create_revision(quote_id: str, user=Depends(current_user)):
        parent = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
        if not parent:
            raise HTTPException(status_code=404, detail="Teklif bulunamadı")
        # root quote ref
        root_id = parent.get("revision_of") or parent["id"]
        root = await db.quotes.find_one({"id": root_id}, {"_id": 0}) or parent
        # find max revision number among siblings
        siblings = await db.quotes.find({"revision_of": root_id}, {"_id": 0, "revision_number": 1}).to_list(100)
        max_rev = max([s.get("revision_number", 0) for s in siblings] + [0])
        new_rev = max_rev + 1
        now = datetime.now(timezone.utc).isoformat()
        new_doc = dict(parent)
        new_doc.pop("_id", None)
        new_doc["id"] = uid()
        new_doc["quote_no"] = f"{root['quote_no']}-R{new_rev}"
        new_doc["revision_of"] = root_id
        new_doc["revision_number"] = new_rev
        new_doc["status"] = "taslak"
        new_doc["issue_date"] = now
        new_doc["created_at"] = now
        new_doc["updated_at"] = now
        new_doc["created_by"] = user["id"]
        await db.quotes.insert_one(new_doc)
        new_doc.pop("_id", None)
        return new_doc

    @router.delete("/{quote_id}")
    async def delete_quote(quote_id: str, user=Depends(current_user)):
        res = await db.quotes.delete_one({"id": quote_id})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Teklif bulunamadı")
        return {"ok": True}

    @router.post("/{quote_id}/email")
    async def send_quote_email(quote_id: str, body: SendQuoteEmailRequest, user=Depends(current_user)):
        q = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
        if not q:
            raise HTTPException(status_code=404, detail="Teklif bulunamadı")
        settings = await get_settings_doc(db)
        provider = settings.get("email_provider", "resend")

        customer = await db.customers.find_one({"id": q["customer_id"]}, {"_id": 0})
        company_name = settings.get("company_name", "Arıgastro")
        subject = body.subject or f"{company_name} - Teklif {q['quote_no']}"
        html_body = body.message or (
            f"<p>Sayın {customer.get('contact_person') or customer.get('company_name', '') if customer else ''},</p>"
            f"<p>{q['quote_no']} numaralı teklifimizi ekte bulabilirsiniz.</p>"
            f"<p>Saygılarımızla,<br/>{company_name}</p>"
        )

        try:
            pdf_bytes = base64.b64decode(body.pdf_base64.split(",")[-1])
        except Exception:
            raise HTTPException(status_code=400, detail="Geçersiz PDF verisi")

        if provider == "resend":
            api_key = settings.get("resend_api_key", "")
            if not api_key:
                raise HTTPException(status_code=400, detail="Resend API anahtarı ayarlanmadı. Ayarlar'dan ekleyin.")
            resend.api_key = api_key
            company_email = settings.get("email", "").strip()
            params = {
                "from": settings.get("resend_from_email") or "onboarding@resend.dev",
                "to": [body.recipient_email],
                "subject": subject,
                "html": html_body,
                "attachments": [{
                    "filename": f"Teklif-{q['quote_no']}.pdf",
                    "content": list(pdf_bytes),
                }],
            }
            if company_email:
                params["reply_to"] = company_email
            try:
                result = await asyncio.to_thread(resend.Emails.send, params)
            except Exception as e:
                logger.exception("Resend gönderim hatası")
                raise HTTPException(status_code=500, detail=f"E-posta gönderilemedi: {e}")
            # update status & log
            await db.quotes.update_one(
                {"id": quote_id},
                {"$set": {"status": "gonderildi", "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            await db.email_logs.insert_one({
                "quote_id": quote_id, "recipient": body.recipient_email,
                "at": datetime.now(timezone.utc).isoformat(), "provider": "resend",
                "email_id": result.get("id"),
            })
            return {"ok": True, "email_id": result.get("id"), "provider": "resend"}
        elif provider == "smtp":
            # Simple SMTP
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            from email.mime.application import MIMEApplication

            host = settings.get("smtp_host", "")
            port = int(settings.get("smtp_port", 587))
            smtp_user = settings.get("smtp_user", "")
            smtp_pass = settings.get("smtp_password", "")
            from_email = settings.get("smtp_from_email") or smtp_user
            if not host or not smtp_user or not smtp_pass:
                raise HTTPException(status_code=400, detail="SMTP ayarları eksik")
            msg = MIMEMultipart()
            msg["From"] = from_email
            msg["To"] = body.recipient_email
            msg["Subject"] = subject
            company_email = settings.get("email", "").strip()
            if company_email:
                msg["Reply-To"] = company_email
            msg.attach(MIMEText(html_body, "html", "utf-8"))
            part = MIMEApplication(pdf_bytes, _subtype="pdf")
            part.add_header("Content-Disposition", "attachment", filename=f"Teklif-{q['quote_no']}.pdf")
            msg.attach(part)

            def _send():
                if settings.get("smtp_use_tls", True):
                    srv = smtplib.SMTP(host, port, timeout=30)
                    srv.starttls()
                else:
                    srv = smtplib.SMTP_SSL(host, port, timeout=30)
                srv.login(smtp_user, smtp_pass)
                srv.sendmail(from_email, [body.recipient_email], msg.as_string())
                srv.quit()
            try:
                await asyncio.to_thread(_send)
            except Exception as e:
                logger.exception("SMTP gönderim hatası")
                raise HTTPException(status_code=500, detail=f"SMTP hatası: {e}")
            await db.quotes.update_one(
                {"id": quote_id},
                {"$set": {"status": "gonderildi", "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            await db.email_logs.insert_one({
                "quote_id": quote_id, "recipient": body.recipient_email,
                "at": datetime.now(timezone.utc).isoformat(), "provider": "smtp",
            })
            return {"ok": True, "provider": "smtp"}
        else:
            raise HTTPException(status_code=400, detail="Desteklenmeyen e-posta sağlayıcı")

    @router.post("/{quote_id}/share-pdf")
    async def create_pdf_share(quote_id: str, body: PdfShareRequest, user=Depends(current_user)):
        """Upload generated PDF (base64) and create a public share token + URL."""
        q = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
        if not q:
            raise HTTPException(status_code=404, detail="Teklif bulunamadı")
        try:
            pdf_bytes = base64.b64decode(body.pdf_base64.split(",")[-1])
        except Exception:
            raise HTTPException(status_code=400, detail="Geçersiz PDF verisi")
        token = secrets.token_urlsafe(12)
        await db.quote_shares.insert_one({
            "token": token,
            "quote_id": quote_id,
            "quote_no": q.get("quote_no"),
            "pdf_b64": base64.b64encode(pdf_bytes).decode("ascii"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        public_base = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
        url = f"{public_base}/api/public/quotes/{token}/pdf" if public_base else f"/api/public/quotes/{token}/pdf"
        return {"token": token, "url": url, "filename": f"Teklif-{q.get('quote_no')}.pdf"}

    return router


def build_public_pdf_router(db):
    """Public (no-auth) router for serving shared PDFs via WhatsApp/email links."""
    router = APIRouter(prefix="/public/quotes", tags=["public"])

    @router.get("/{token}/pdf")
    async def get_public_pdf(token: str):
        doc = await db.quote_shares.find_one({"token": token}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Paylaşım bulunamadı veya süresi doldu")
        try:
            pdf_bytes = base64.b64decode(doc["pdf_b64"])
        except Exception:
            raise HTTPException(status_code=500, detail="PDF çözümlenemedi")
        filename = f"Teklif-{doc.get('quote_no') or token}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{filename}"'},
        )

    return router
