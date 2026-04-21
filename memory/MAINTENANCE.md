# ArıCRM — Bakım & Yedekleme Rehberi

Bu dosya sisteminizin uzun yıllar sorunsuz çalışması için alınan önlemleri ve rutin bakım adımlarını özetler.

---

## ✅ Uygulanan Dayanıklılık Önlemleri

### 1. Performans — Server-side Pagination
- Müşteri ve teklif listeleri artık sadece ihtiyaç duyulan sayfayı getirir.
- 10.000+ kayıt olsa dahi sayfalar anında yüklenir.
- Tüm liste filtreleri (arama, durum, hazırlayan, tarih) veritabanında uygulanır.

### 2. Otomatik Veri Temizliği (TTL Indexes)
MongoDB TTL indeksleri sayesinde aşağıdaki collection'lar kendi kendini temizler (sonsuz büyüme yok):

| Collection | Otomatik Silme |
|-----------|----------------|
| `login_attempts` | 1 saat sonra |
| `quote_shares` (WhatsApp PDF linkleri) | 90 gün sonra |
| `sync_logs` | 60 gün sonra |
| `email_logs` | 1 yıl sonra |

### 3. Giriş Güvenliği (Brute-force Koruması)
- 15 dakika içinde **5 hatalı giriş** → IP için **15 dakika kilit**.
- Her giriş denemesi (başarılı/başarısız) `login_attempts` collection'ına log'lanır.
- Şifreler **bcrypt** ile hash'lenir, düz metin olarak asla saklanmaz.

### 4. Otomatik Teklif Süre Takibi
- Her saat başı scheduler çalışır.
- Geçerlilik tarihi geçmiş ve hâlâ "Taslak" / "Gönderildi" durumundaki teklifler otomatik olarak **"Süresi Doldu"** yapılır.

### 5. Cascade Silme Koruması
- Müşteri silinmeye çalışılırsa ve kayıtlı teklifi varsa, **409** hata döner.
- Kullanıcıya onay sorulur → onaylarsa müşteri ve tüm teklifleri birlikte silinir.

### 6. Hata Güvenlik Duvarı
- **Backend**: Global exception handler — stack trace sızmaz, yalnızca kullanıcı dostu mesaj döner.
- **Frontend**: ErrorBoundary — beyaz ekran yok, "Bir şeyler ters gitti" sayfası ve Ana sayfaya dönüş butonu.

### 7. Sağlık (Health) Endpoint
- `GET /api/health` — MongoDB bağlantısını ve API'yi kontrol eder.
- **UptimeRobot**, **Better Uptime**, vb. harici izleme servislerine 5 dakikada bir ping ettirerek sistem çökünce SMS/mail bildirimi alabilirsiniz.

### 8. Database Connection Pooling
- MongoDB bağlantısı pool ile yönetilir (max 50 concurrent).
- `retryWrites=true` — geçici ağ hataları otomatik tekrarlanır.

### 9. Indexes — Hızlı Sorgu
Aşağıdaki alanlarda indeks var, sorgular milisaniyeler içinde döner:
- `users.email` (unique), `users.id`
- `customers.id`, `company_name`, `tax_number`, `created_at`
- `products.id`, `code` + full-text arama
- `quotes.id`, `quote_no` (unique), `customer_id`, `created_by`, `status`, `created_at`, `valid_until`

---

## 🗄️ Veritabanı Yedekleme (Önerilir — En Az Haftalık)

MongoDB için **mongodump** kullanın. Sunucunuza SSH ile bağlanıp:

```bash
# Yedek al (data dump + index metadata)
mongodump --uri="mongodb://localhost:27017" --db=aricrm_db --out=/backup/aricrm-$(date +%Y%m%d)

# Eski yedekleri sil (30 günden eski)
find /backup -name "aricrm-*" -mtime +30 -exec rm -rf {} \;
```

Bu komutu `/etc/cron.daily/` altına script olarak ekleyebilirsiniz:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
mongodump --uri="mongodb://localhost:27017" --db=aricrm_db --out=/backup/aricrm-$DATE --quiet
find /backup -name "aricrm-*" -mtime +30 -exec rm -rf {} \;
```

**Geri yükleme:**
```bash
mongorestore --uri="mongodb://localhost:27017" --db=aricrm_db /backup/aricrm-20260421/aricrm_db
```

**Bulut yedek:** Daha güvenli olması için günlük dump'ı `rclone` veya `aws s3 sync` ile bulut (S3, Google Drive, Backblaze B2) depolamaya kopyalayın.

---

## 🔒 Şifre / Anahtar Yönetimi

`.env` dosyasındaki kritik değerler:
- `JWT_SECRET` — değiştirilirse tüm oturumlar kapanır (migration gerektirmez, sadece kullanıcılar yeniden giriş yapar).
- `ADMIN_PASSWORD` — kurulumda admin şifresi. Kuruldaktan sonra panelden Users sayfasından değiştirebilirsiniz; `.env`'deki değer sadece seed için kullanılır.
- `RESEND_API_KEY` — Ayarlar > E-posta sayfasından değiştirilebilir.

**Önemli:** `.env` dosyasını **git'e eklemeyin** (.gitignore'da olmalı).

---

## 📊 Performans İzleme

- Log'lar `/var/log/supervisor/backend.err.log` altında.
- `sudo tail -f /var/log/supervisor/backend.err.log` ile canlı takip.
- Feed sync hataları için: `curl http://localhost:8001/api/products/count` → son senkron bilgisi.

---

## 🔄 Ürün Feed Senkronizasyonu
- Her **24 saatte bir otomatik** çalışır (başlatmada da bir kez).
- Manuel: Ürünler sayfasındaki "Feed'i Güncelle" butonu.
- Feed erişilemezse sistem çökmez — hata loglanır, eski ürün verisi kullanılmaya devam eder.

---

## 🚨 Acil Durum Senaryoları

| Problem | Çözüm |
|---------|-------|
| Admin şifresi unutuldu | `.env`'deki `ADMIN_PASSWORD`'ı değiştir → backend restart; admin şifresi otomatik güncellenir |
| MongoDB çöktü | `sudo systemctl restart mongod`; `/api/health` ile doğrula |
| Backend cevap vermiyor | `sudo supervisorctl restart backend`; log'a bak |
| Feed güncellemesi çalışmıyor | Ayarlar > Ürünler > "Feed'i Güncelle" manuel dene; feed URL erişilebilir mi kontrol et |
| Resend e-posta hatası | Ayarlar > E-posta sekmesinden API key'i yenile veya SMTP'ye geç |
| Boyut aşımı (DB çok büyüdü) | TTL otomatik çalışır; manuel temizlik: `quote_shares`, `sync_logs`, `email_logs` collection'larını boşalt |

---

## 📈 Ölçeklendirme Notları
Bu sistem **tek sunucu** için optimize edilmiştir ve **~100.000 müşteri + ~500.000 teklif** rahatça barındırır. Daha büyük ölçek için:
- MongoDB replica set kurulması
- Redis ile rate limit + oturum cache
- Backend yatayda ölçeklenebilir (stateless, sadece cookie-based auth)

