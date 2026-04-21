import React, { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import PageHeader from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings").then((r) => setForm(r.data)).catch((e) => toast.error(formatApiError(e))).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings", form);
      toast.success("Ayarlar kaydedildi");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <div className="p-8 text-slate-400">Yükleniyor…</div>;

  return (
    <div>
      <PageHeader title="Ayarlar" subtitle="Firma bilgileriniz ve gönderim tercihleri">
        <Button onClick={save} disabled={saving} className="bg-brand hover:bg-brand-hover" data-testid="save-settings-btn">
          {saving ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
          Kaydet
        </Button>
      </PageHeader>

      <Tabs defaultValue="company">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="w-max">
            <TabsTrigger value="company" data-testid="tab-company">Firma</TabsTrigger>
            <TabsTrigger value="bank" data-testid="tab-bank">Banka</TabsTrigger>
            <TabsTrigger value="social" data-testid="tab-social">Sosyal Medya</TabsTrigger>
            <TabsTrigger value="email" data-testid="tab-email">E-posta</TabsTrigger>
            <TabsTrigger value="quote" data-testid="tab-quote">Teklif Varsayılanları</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="company">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." data-testid="settings-logo-url" /></div>
            {form.logo_url && <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg"><img src={form.logo_url} alt="logo" className="h-16 object-contain" /></div>}
            <div><Label>İşletme Adı</Label><Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} /></div>
            <div><Label>Slogan</Label><Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} /></div>
            <div><Label>Website</Label><Input value={form.website} onChange={(e) => set("website", e.target.value)} /></div>
            <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><Label>E-posta</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div><Label>Vergi Dairesi</Label><Input value={form.tax_office} onChange={(e) => set("tax_office", e.target.value)} /></div>
            <div><Label>Vergi Numarası</Label><Input value={form.tax_number} onChange={(e) => set("tax_number", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Adres</Label><Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Yetkili Kişi (Teklif PDF'inde imza olarak görünecek)</Label><Input value={form.authorized_person_name} onChange={(e) => set("authorized_person_name", e.target.value)} placeholder="Ad Soyad" data-testid="settings-authorized-person" /></div>
          </div>
        </TabsContent>

        <TabsContent value="bank">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Banka Adı</Label><Input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} /></div>
            <div><Label>Hesap Sahibi</Label><Input value={form.bank_account_holder} onChange={(e) => set("bank_account_holder", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>IBAN</Label><Input value={form.bank_iban} onChange={(e) => set("bank_iban", e.target.value)} /></div>
          </div>
        </TabsContent>

        <TabsContent value="social">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 text-sm text-slate-500">
              Sosyal medya hesaplarınızın tam URL'lerini girin. Girilen bağlantılar teklif PDF'inin alt kısmında gösterilir.
            </div>
            <div><Label>Instagram</Label><Input value={form.social_instagram} onChange={(e) => set("social_instagram", e.target.value)} placeholder="https://instagram.com/arigastro" data-testid="settings-social-instagram" /></div>
            <div><Label>Facebook</Label><Input value={form.social_facebook} onChange={(e) => set("social_facebook", e.target.value)} placeholder="https://facebook.com/arigastro" data-testid="settings-social-facebook" /></div>
            <div><Label>Twitter / X</Label><Input value={form.social_twitter} onChange={(e) => set("social_twitter", e.target.value)} placeholder="https://x.com/arigastro" data-testid="settings-social-twitter" /></div>
            <div><Label>LinkedIn</Label><Input value={form.social_linkedin} onChange={(e) => set("social_linkedin", e.target.value)} placeholder="https://linkedin.com/company/arigastro" data-testid="settings-social-linkedin" /></div>
            <div><Label>YouTube</Label><Input value={form.social_youtube} onChange={(e) => set("social_youtube", e.target.value)} placeholder="https://youtube.com/@arigastro" data-testid="settings-social-youtube" /></div>
            <div><Label>TikTok</Label><Input value={form.social_tiktok} onChange={(e) => set("social_tiktok", e.target.value)} placeholder="https://tiktok.com/@arigastro" data-testid="settings-social-tiktok" /></div>
          </div>
        </TabsContent>

        <TabsContent value="email">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <Label>Sağlayıcı</Label>
              <Select value={form.email_provider} onValueChange={(v) => set("email_provider", v)}>
                <SelectTrigger className="w-60" data-testid="settings-email-provider"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="resend">Resend (Önerilen · 3.000 e-posta/ay ücretsiz)</SelectItem>
                  <SelectItem value="smtp">Kendi SMTP sunucum</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">
                Resend için <a className="text-brand underline" href="https://resend.com" target="_blank" rel="noreferrer">resend.com</a> üzerinden ücretsiz hesap açın, API anahtarınızı buraya yapıştırın.
              </p>
              <div className="text-xs text-slate-500 mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <b>Yanıtlar size gelsin:</b> Gönderilen e-postalarda <code>Reply-To</code> başlığı otomatik olarak <b>Firma sekmesindeki e-posta adresinize</b> ayarlanır; müşteri "Yanıtla" dediğinde cevabı siz alırsınız.
                <br />
                <b>Gönderen adresini kendi alan adınız yapmak için:</b> Resend panelinde <b>Domains</b> bölümünden kendi domaininizi (ör. <code>arigastro.com</code>) doğrulayın, sonra aşağıdaki "Gönderen E-posta" alanına <code>teklif@arigastro.com</code> gibi bir adres yazın.
              </div>
            </div>

            {form.email_provider === "resend" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="md:col-span-2"><Label>Resend API Anahtarı</Label><Input type="password" value={form.resend_api_key} onChange={(e) => set("resend_api_key", e.target.value)} placeholder="re_..." data-testid="settings-resend-key" /></div>
                <div className="md:col-span-2"><Label>Gönderen E-posta (doğrulanmış domain)</Label><Input value={form.resend_from_email} onChange={(e) => set("resend_from_email", e.target.value)} placeholder="teklif@firmam.com" /></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div><Label>SMTP Sunucu</Label><Input value={form.smtp_host} onChange={(e) => set("smtp_host", e.target.value)} placeholder="mail.firmam.com" /></div>
                <div><Label>Port</Label><Input type="number" value={form.smtp_port} onChange={(e) => set("smtp_port", Number(e.target.value) || 587)} /></div>
                <div><Label>Kullanıcı</Label><Input value={form.smtp_user} onChange={(e) => set("smtp_user", e.target.value)} /></div>
                <div><Label>Şifre</Label><Input type="password" value={form.smtp_password} onChange={(e) => set("smtp_password", e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Gönderen E-posta</Label><Input value={form.smtp_from_email} onChange={(e) => set("smtp_from_email", e.target.value)} /></div>
                <div className="flex items-center gap-2"><Switch checked={form.smtp_use_tls} onCheckedChange={(v) => set("smtp_use_tls", v)} /> <span className="text-sm">STARTTLS kullan</span></div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="quote">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Varsayılan Geçerlilik (gün)</Label><Input type="number" value={form.default_validity_days} onChange={(e) => set("default_validity_days", Number(e.target.value) || 30)} /></div>
            <div className="md:col-span-2"><Label>Varsayılan Teklif Notları</Label><Textarea rows={4} value={form.default_quote_notes} onChange={(e) => set("default_quote_notes", e.target.value)} placeholder="Ödeme koşulları, teslimat süresi, garanti..." /></div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
