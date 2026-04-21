import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, formatApiError, formatDate, formatMoney } from "../lib/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Plus, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, q] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/customers/${id}/quotes`),
      ]);
      setCustomer(c.data);
      setQuotes(q.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      const { id: _, created_at, updated_at, ...payload } = customer;
      await api.put(`/customers/${id}`, payload);
      toast.success("Müşteri bilgileri güncellendi");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Yükleniyor…</div>;
  if (!customer) return <div className="p-8 text-slate-400">Müşteri bulunamadı.</div>;

  return (
    <div>
      <button onClick={() => navigate("/musteriler")} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-3" data-testid="back-to-customers">
        <ArrowLeft size={14} /> Müşterilere dön
      </button>
      <PageHeader title={customer.company_name} subtitle={customer.tax_number ? `Vergi No: ${customer.tax_number}` : "Müşteri profili"}>
        <Link to={`/teklifler/yeni?customer=${customer.id}`}>
          <Button className="bg-brand hover:bg-brand-hover" data-testid="new-quote-for-customer-btn">
            <Plus size={16} className="mr-2" /> Bu Müşteri İçin Teklif
          </Button>
        </Link>
        <Button onClick={save} disabled={saving} variant="outline" data-testid="save-customer-detail-btn">
          <Save size={16} className="mr-2" /> Kaydet
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="font-heading font-semibold">Firma Bilgileri</h3>
          <Row label="Firma Adı"><Input value={customer.company_name || ""} onChange={(e) => setCustomer({ ...customer, company_name: e.target.value })} /></Row>
          <Row label="Vergi No"><Input value={customer.tax_number || ""} onChange={(e) => setCustomer({ ...customer, tax_number: e.target.value })} /></Row>
          <Row label="Vergi Dairesi"><Input value={customer.tax_office || ""} onChange={(e) => setCustomer({ ...customer, tax_office: e.target.value })} /></Row>
          <Row label="Yetkili Kişi"><Input value={customer.contact_person || ""} onChange={(e) => setCustomer({ ...customer, contact_person: e.target.value })} /></Row>
          <Row label="Telefon"><Input value={customer.phone || ""} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></Row>
          <Row label="WhatsApp"><Input value={customer.whatsapp || ""} onChange={(e) => setCustomer({ ...customer, whatsapp: e.target.value })} /></Row>
          <Row label="E-posta"><Input type="email" value={customer.email || ""} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></Row>
          <Row label="Şehir"><Input value={customer.city || ""} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} /></Row>
          <Row label="Adres"><Textarea value={customer.address || ""} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} rows={2} /></Row>
          <Row label="Notlar"><Textarea value={customer.notes || ""} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} rows={3} /></Row>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-heading font-semibold">Teklifler <span className="text-slate-400 text-sm ml-2">({quotes.length})</span></h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3">Teklif No</th>
                  <th className="px-6 py-3">Tarih</th>
                  <th className="px-6 py-3">Hazırlayan</th>
                  <th className="px-6 py-3">Tutar</th>
                  <th className="px-6 py-3">Durum</th>
                </tr>
              </thead>
              <tbody>
                {quotes.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Henüz teklif yok.</td></tr>}
                {quotes.map((q) => (
                  <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs"><Link to={`/teklifler/${q.id}`} className="text-brand hover:underline font-medium">{q.quote_no}</Link></td>
                    <td className="px-6 py-3 text-slate-600">{formatDate(q.issue_date)}</td>
                    <td className="px-6 py-3 text-slate-600">{q.creator?.name || <span className="text-slate-400">-</span>}</td>
                    <td className="px-6 py-3 font-medium">{formatMoney(q.grand_total, q.currency)}</td>
                    <td className="px-6 py-3"><StatusBadge status={q.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
