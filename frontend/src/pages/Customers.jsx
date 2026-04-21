import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError, formatDate } from "../lib/api";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "../components/ui/dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY = {
  company_name: "", tax_number: "", tax_office: "", contact_person: "",
  phone: "", whatsapp: "", email: "", address: "", city: "", notes: "",
};
const PAGE_SIZE = 20;

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/customers", { params: { search, date_from: dateFrom, date_to: dateTo } });
      setRows(r.data);
      setPage(1);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search, dateFrom, dateTo]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...EMPTY, ...c }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, form);
        toast.success("Müşteri güncellendi");
      } else {
        await api.post("/customers", form);
        toast.success("Müşteri eklendi");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success("Müşteri silindi");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div>
      <PageHeader title="Müşteriler" subtitle="Müşterilerinizi yönetin, arayın ve filtreleyin">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand hover:bg-brand-hover" onClick={openNew} data-testid="new-customer-btn">
              <Plus size={16} className="mr-2" /> Yeni Müşteri
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editing ? "Müşteri Düzenle" : "Yeni Müşteri"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>İşletme / Firma Adı *</Label>
                <Input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} data-testid="customer-company-name" />
              </div>
              <div><Label>Vergi No / TC</Label><Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} data-testid="customer-tax-number" /></div>
              <div><Label>Vergi Dairesi</Label><Input value={form.tax_office} onChange={(e) => setForm({ ...form, tax_office: e.target.value })} /></div>
              <div><Label>Yetkili Kişi</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
              <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>WhatsApp (ülke kodu ile)</Label><Input placeholder="+905xxxxxxxxx" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
              <div><Label>E-posta</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Şehir</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Adres</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Notlar</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <DialogFooter className="md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                <Button type="submit" className="bg-brand hover:bg-brand-hover" data-testid="save-customer-btn">
                  {editing ? "Güncelle" : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Firma, vergi no, isim, telefon veya e-posta ile ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="customer-search-input"
          />
        </div>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-3">Firma</th>
                <th className="px-6 py-3">Vergi No</th>
                <th className="px-6 py-3">Yetkili</th>
                <th className="px-6 py-3">Telefon</th>
                <th className="px-6 py-3">Şehir</th>
                <th className="px-6 py-3">Kayıt</th>
                <th className="px-6 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Yükleniyor…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Müşteri bulunamadı.</td></tr>
              )}
              {pagedRows.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3">
                    <Link to={`/musteriler/${c.id}`} className="font-medium text-slate-900 hover:text-brand" data-testid={`customer-link-${c.id}`}>
                      {c.company_name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-slate-600">{c.tax_number || "-"}</td>
                  <td className="px-6 py-3 text-slate-600">{c.contact_person || "-"}</td>
                  <td className="px-6 py-3 text-slate-600">{c.phone || "-"}</td>
                  <td className="px-6 py-3 text-slate-600">{c.city || "-"}</td>
                  <td className="px-6 py-3 text-slate-500">{formatDate(c.created_at)}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)} data-testid={`edit-customer-${c.id}`}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(c.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid={`delete-customer-${c.id}`}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
      </div>
    </div>
  );
}
