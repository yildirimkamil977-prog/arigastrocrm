import React, { useEffect, useState } from "react";
import { api, formatApiError, formatDate } from "../lib/api";
import PageHeader from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const EMPTY = { email: "", name: "", role: "sales", password: "" };

export default function Users() {
  const { user: currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/users");
      setRows(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ email: u.email, name: u.name, role: u.role, password: "" });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const payload = { email: form.email, name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing.id}`, payload);
        toast.success("Kullanıcı güncellendi");
      } else {
        if (!form.password) { toast.error("Şifre gerekli"); return; }
        await api.post("/users", form);
        toast.success("Kullanıcı eklendi");
      }
      setOpen(false); load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("Kullanıcı silindi");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div>
      <PageHeader title="Kullanıcılar" subtitle="Panel erişimi olan kullanıcıları yönetin">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand hover:bg-brand-hover" onClick={openNew} data-testid="new-user-btn"><Plus size={14} className="mr-2" /> Yeni Kullanıcı</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">{editing ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div><Label>Ad Soyad</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="user-name-input" /></div>
              <div><Label>E-posta</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="user-email-input" /></div>
              <div>
                <Label>Rol</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger data-testid="user-role-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Yönetici (Admin)</SelectItem>
                    <SelectItem value="sales">Satış Temsilcisi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Şifre {editing && <span className="text-xs text-slate-500">(değiştirmeyecekseniz boş bırakın)</span>}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="user-password-input" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                <Button type="submit" className="bg-brand hover:bg-brand-hover" data-testid="save-user-btn">Kaydet</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-3">Ad Soyad</th>
              <th className="px-6 py-3">E-posta</th>
              <th className="px-6 py-3">Rol</th>
              <th className="px-6 py-3">Kayıt</th>
              <th className="px-6 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Yükleniyor…</td></tr>}
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3 font-medium">{u.name}</td>
                <td className="px-6 py-3 text-slate-600">{u.email}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.role === "admin" ? "bg-brand-light text-brand border-brand/30" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                    {u.role === "admin" ? "Yönetici" : "Satış Temsilcisi"}
                  </span>
                </td>
                <td className="px-6 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                <td className="px-6 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(u)} data-testid={`edit-user-${u.id}`}><Pencil size={14} /></Button>
                  {u.id !== currentUser?.id && (
                    <Button size="sm" variant="ghost" onClick={() => remove(u.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid={`delete-user-${u.id}`}><Trash2 size={14} /></Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
