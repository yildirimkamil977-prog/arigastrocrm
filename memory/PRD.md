# ArıCRM — Product Requirements Document

## Original Problem Statement
CRM sistemi: Müşteri kayıt + filtre + profilde teklif görüntüleme. Google Shopping XML (api.myikas.com) ile otomatik ürün senkronu. Teklif formu: ürün seçimi, müşteri seçimi, kurumsal ayarlar, KDV/iskonto hesaplama. WhatsApp + E-posta (SMTP/Resend) + PDF dağıtımı. Admin + Satış temsilcisi rolleri. Marka: ArıCRM, renk #0073c4.

## Current State
Production'da canlı (Hetzner VPS, Docker Compose + Caddy). Preview: crm-turk-1.preview.emergentagent.com

## Implemented (Changelog)
- JWT auth, Admin/Sales roller
- XML feed senkronu (APScheduler + regex-ile kod çıkarma)
- Teklif CRUD, revizyon, durum yönetimi
- PDF (html2canvas + jsPDF) — satır ortasından kesmeyen akıllı sayfa sonu
- "İmzala" toggle (mavi el yazısı imza)
- "Fiyatsız İndir" — fiyat/müşteri/notlar/geçerlilik gizler
- WhatsApp + E-posta (Resend/SMTP) paylaşımı
- Logo/imza görsel yükleme, image-proxy (CORS fix)
- Google Translate `removeChild` crash fix
- **2026-02-17**: KDV hariç/dahil modu — yeni teklif varsayılan KDV hariç, KDV oranı girilip +KDV eklenir; "KDV Kaldır" toggle ile eski KDV-dahil moduna döner. Ayarlarda "Varsayılan KDV Oranı" tanımlanabilir.

## Roadmap (P1/P2)
- P1: Hetzner'da haftalık otomatik MongoDB backup cron'u (söz verildi, bekliyor)
- P2: Teklif listesinde gelişmiş arama/filtre, toplu WhatsApp gönderim
- P2: Teklif şablonları

## Tech Stack
- Backend: FastAPI + Motor + APScheduler + Resend + httpx
- Frontend: React + Tailwind + Shadcn + html2canvas + jsPDF
- DB: MongoDB
- Deploy: Docker Compose + Caddy (Let's Encrypt)
