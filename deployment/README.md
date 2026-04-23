# ArıCRM — Hetzner VPS Üretim Kurulumu

Bu rehber, **Ubuntu 24.04** üzerinde ArıCRM'i canlıya almak için adım adım tüm işlemleri içerir. Süre: ~15–20 dakika.

**Mimari:** MongoDB + FastAPI + React + **Caddy** (otomatik Let's Encrypt SSL)

**Gerekenler:**
- ✅ Hetzner sunucu (IP: `91.98.43.11`, root şifresi e-postada)
- ✅ Domain `arigastrocrm.com` (A kaydını yönlendirmeniz gerekecek — Adım 1)
- ✅ Resend hesabı (domain doğrulanmış) + API Key

---

## Adım 1 — Domain A kaydı (DNS)

Domain sağlayıcınızın panelinde (ör. GoDaddy, Namecheap, Cloudflare, vb.) **arigastrocrm.com** için iki A kaydı ekleyin:

| Type | Name | Value          | TTL |
|------|------|----------------|-----|
| A    | @    | `91.98.43.11`  | 300 |
| A    | www  | `91.98.43.11`  | 300 |

> Kaydın yayılması 5–30 dakika sürer. Kontrol:
> ```
> dig +short arigastrocrm.com
> ```
> `91.98.43.11` dönmeli.

---

## Adım 2 — Sunucuya SSH ile bağlanın

Kendi bilgisayarınızın terminalinde (Mac/Linux Terminal veya Windows PowerShell):

```bash
ssh root@91.98.43.11
```

- İlk seferde "Are you sure you want to continue?" → `yes`
- Şifre: Hetzner e-postasındaki (`WMnNKH9uTFctaxM9xrib`)
- **İlk girişte yeni şifre isteyecek** — güçlü bir şifre belirleyin ve bir yere not edin.

---

## Adım 3 — Kodu sunucuya aktarın

İki seçeneğiniz var:

### 3A — GitHub (önerilen)
Emergent'te sohbet kutusundaki **"Save to GitHub"** butonuyla projeyi kendi GitHub hesabınıza push edin. Sonra sunucuda:

```bash
mkdir -p /opt/aricrm
cd /opt
git clone https://github.com/KULLANICI_ADIN/REPO_ADI.git aricrm
```

> Private repo ise `https://TOKEN@github.com/...` formatında personal access token kullanın.

### 3B — Manuel (scp)
Yerel makinenizden (proje `/app` dizininizde olduğunda):
```bash
scp -r ./backend ./frontend ./deployment root@91.98.43.11:/opt/aricrm/
```

---

## Adım 4 — .env dosyasını hazırlayın

Sunucuda:

```bash
cd /opt/aricrm/deployment
cp .env.example .env
nano .env
```

**Doldurmanız gerekenler:**

```dotenv
DOMAIN=arigastrocrm.com
ACME_EMAIL=sizin-email@arigastro.com   # Let's Encrypt uyarıları buraya gider

MONGO_URL=mongodb://mongo:27017
DB_NAME=aricrm_db

CORS_ORIGINS=https://arigastrocrm.com

# Güçlü bir rastgele anahtar üretin, bir kez:
#   openssl rand -hex 32
JWT_SECRET=BURAYA_64_KARAKTERLIK_RASTGELE_STRING

ADMIN_EMAIL=admin@arigastro.com
ADMIN_PASSWORD=GÜÇLÜ_ŞIFRE_BELIRLE
ADMIN_NAME=Sistem Yöneticisi

PRODUCT_FEED_URL=https://api.myikas.com/api/admin/ms/149e1ffa-f004-4044-b059-10d86865ebab/5f782569-de17-4d4e-88a4-c65bd533ac9f/google/feed.xml

PUBLIC_BASE_URL=https://arigastrocrm.com
```

Kaydedip çıkmak için: `CTRL+O` → `Enter` → `CTRL+X`.

> JWT_SECRET oluşturmak için sunucuda: `openssl rand -hex 32` komutunu çalıştırın, çıkan string'i dosyaya yapıştırın.

---

## Adım 5 — Tek komutla deploy

```bash
cd /opt/aricrm/deployment
bash deploy.sh
```

Bu script:
1. Sunucuyu günceller, firewall açar (22, 80, 443).
2. Docker + Docker Compose kurar.
3. Backend, Frontend, MongoDB, Caddy image'lerini build eder.
4. Tüm servisleri başlatır.
5. Caddy otomatik olarak **Let's Encrypt SSL** sertifikası alır.

**İlk build ~5–8 dakika sürer** (frontend yarn install uzun).

---

## Adım 6 — Doğrulama

Tarayıcıda açın:

👉 **https://arigastrocrm.com**

Beklenen:
- 🔒 Yeşil kilit (geçerli SSL sertifikası)
- ArıCRM login ekranı
- Email: `admin@arigastro.com` + .env'deki `ADMIN_PASSWORD` ile giriş

---

## Adım 7 — Resend Email ayarı

Girişten sonra: **Ayarlar → Email Sağlayıcısı**
- Resend API Key'inizi girin
- Gönderen: `teklif@arigastrocrm.com`
- Kaydet → Test maili gönder

---

## Günlük Komutlar (cheat sheet)

| Komut | Ne yapar |
|-------|---------|
| `cd /opt/aricrm/deployment && docker compose ps` | Servis durumu |
| `docker compose logs -f backend` | Backend canlı log |
| `docker compose logs -f caddy` | Caddy/SSL log |
| `docker compose restart backend` | Backend yeniden başlat |
| `docker compose down && docker compose up -d --build` | Kod güncellendi → yeniden build |

**Kod güncellemesi (GitHub'dan çekerek):**
```bash
cd /opt/aricrm && git pull
cd deployment && docker compose up -d --build
```

---

## MongoDB Yedekleme (önerilen — haftalık cron)

```bash
# Manuel yedek
docker exec $(docker compose ps -q mongo) mongodump --archive=/tmp/aricrm_$(date +%F).gz --gzip
docker cp $(docker compose ps -q mongo):/tmp/aricrm_$(date +%F).gz /root/backups/
```

Otomatik: `/root/backups/` dizininde tutun, haftada bir cron ile dışarı kopyalayın (S3, başka sunucu, vb.).

---

## Sorun Giderme

**SSL sertifikası gelmiyor:**
- `docker compose logs caddy` bakın.
- DNS A kaydı 80/443'e erişilebilir olmalı — firewall kontrol: `ufw status`
- DNS yayılmadıysa Caddy rate limit yiyebilir (saat başına 5 deneme). 30 dk bekleyip tekrar deneyin.

**Backend 502 hatası:**
- `docker compose logs backend` — import hatası, .env eksik değişkeni olabilir.

**Frontend "Cannot GET /":**
- `docker compose ps` → frontend-builder `Exited (0)` olmalı. Değilse: `docker compose logs frontend-builder`.

**MongoDB bağlanmıyor:**
- `docker compose logs mongo` — ilk başlatmada disk yetersizliği olabilir. `df -h` ile kontrol.

---

## Güvenlik Önerileri (production sonrası)

- [ ] SSH key-based login'e geçin, root login'i kapatın (`PermitRootLogin no`).
- [ ] `fail2ban` zaten kurulu (deploy.sh ile) — izleyin: `fail2ban-client status`.
- [ ] ADMIN_PASSWORD'u deploy sonrası Ayarlar → Kullanıcılar'dan değiştirin.
- [ ] Haftalık yedek cron job'u.
- [ ] Hetzner Snapshot: panelden aylık bir snapshot alın (ücretli ama ucuz).

İyi satışlar! 🚀
