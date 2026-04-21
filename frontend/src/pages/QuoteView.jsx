import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import QuotePDFTemplate from "../components/QuotePDFTemplate";
import { Button } from "../components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  Download, Pencil, Trash2, Send, MessageCircle, Mail, GitBranch, ArrowLeft, Loader2, Printer,
} from "lucide-react";
import { toast } from "sonner";

export default function QuoteView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [waOpen, setWaOpen] = useState(false);
  const [waNumber, setWaNumber] = useState("");
  const [waMessage, setWaMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [q, c] = await Promise.all([api.get(`/quotes/${id}`), api.get("/settings")]);
      setQuote(q.data);
      setCustomer(q.data.customer);
      setCompany(c.data);
      setEmailTo(q.data.customer?.email || "");
      setEmailSubject(`${c.data.company_name || "Arıgastro"} - Teklif ${q.data.quote_no}`);
      setEmailMessage(`Sayın ${q.data.customer?.contact_person || q.data.customer?.company_name || ""},

${q.data.quote_no} numaralı teklifimizi ekte bulabilirsiniz. İnceledikten sonra soru veya görüşleriniz olursa lütfen bize ulaşın.

Saygılarımızla,
${c.data.company_name || "Arıgastro"}`);
      setWaNumber(q.data.customer?.whatsapp || q.data.customer?.phone || "");
      setWaMessage(`Merhaba, ${q.data.quote_no} numaralı teklifimizi ilettik. İyi günler dileriz.`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const node = pdfRef.current?.querySelector("#quote-pdf-root");
      if (!node) throw new Error("PDF şablonu bulunamadı");

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: false,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      return pdf;
    } finally {
      setGenerating(false);
    }
  };

  const downloadPdf = async () => {
    try {
      const pdf = await generatePdf();
      pdf.save(`Teklif-${quote.quote_no}.pdf`);
    } catch (e) {
      toast.error("PDF oluşturulamadı: " + e.message);
    }
  };

  const sendEmail = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const pdf = await generatePdf();
      const base64 = pdf.output("datauristring");
      await api.post(`/quotes/${id}/email`, {
        recipient_email: emailTo,
        subject: emailSubject,
        message: `<div style="font-family:sans-serif;line-height:1.6;white-space:pre-wrap">${emailMessage.replace(/</g, "&lt;")}</div>`,
        pdf_base64: base64,
      });
      toast.success("E-posta gönderildi");
      setEmailOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSending(false);
    }
  };

  const openWhatsApp = () => {
    const clean = (waNumber || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
    const url = `https://wa.me/${clean}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, "_blank");
    // Mark as sent if currently draft
    if (quote.status === "taslak") {
      api.put(`/quotes/${id}`, { status: "gonderildi" }).then(load).catch(() => {});
    }
    setWaOpen(false);
  };

  const updateStatus = async (s) => {
    try {
      await api.put(`/quotes/${id}`, { status: s });
      toast.success("Durum güncellendi");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const revise = async () => {
    try {
      const r = await api.post(`/quotes/${id}/revise`);
      toast.success(`${r.data.quote_no} oluşturuldu`);
      navigate(`/teklifler/${r.data.id}/duzenle`);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const remove = async () => {
    if (!window.confirm("Bu teklifi silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/quotes/${id}`);
      toast.success("Teklif silindi");
      navigate("/teklifler");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Yükleniyor…</div>;
  if (!quote) return <div className="p-8 text-slate-400">Teklif bulunamadı.</div>;

  return (
    <div>
      <button onClick={() => navigate("/teklifler")} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-3" data-testid="back-to-quotes">
        <ArrowLeft size={14} /> Tekliflere dön
      </button>

      <PageHeader
        title={`Teklif ${quote.quote_no}`}
        subtitle={customer ? customer.company_name : ""}
      >
        <StatusBadge status={quote.status} />
        <Select value={quote.status} onValueChange={updateStatus}>
          <SelectTrigger className="w-40 h-9" data-testid="quote-status-change"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="taslak">Taslak</SelectItem>
            <SelectItem value="gonderildi">Gönderildi</SelectItem>
            <SelectItem value="kabul">Kabul</SelectItem>
            <SelectItem value="red">Red</SelectItem>
            <SelectItem value="suresi_doldu">Süresi Doldu</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link to={`/teklifler/${id}/duzenle`}>
          <Button variant="outline" data-testid="edit-quote-btn"><Pencil size={14} className="mr-2" /> Düzenle</Button>
        </Link>
        <Button onClick={downloadPdf} disabled={generating} className="bg-brand hover:bg-brand-hover" data-testid="download-pdf-btn">
          {generating ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Download size={14} className="mr-2" />}
          PDF İndir
        </Button>
        <Button variant="outline" onClick={() => window.print()} data-testid="print-btn"><Printer size={14} className="mr-2" /> Yazdır</Button>

        {/* Email */}
        <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="email-btn"><Mail size={14} className="mr-2" /> E-posta ile Gönder</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-heading">E-posta ile Teklif Gönder</DialogTitle></DialogHeader>
            <form onSubmit={sendEmail} className="space-y-3">
              <div><Label>Alıcı E-posta</Label><Input type="email" required value={emailTo} onChange={(e) => setEmailTo(e.target.value)} data-testid="email-to-input" /></div>
              <div><Label>Konu</Label><Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} /></div>
              <div><Label>Mesaj</Label><Textarea rows={6} value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} /></div>
              <div className="text-xs text-slate-500">PDF eki otomatik olarak eklenir.</div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEmailOpen(false)}>İptal</Button>
                <Button type="submit" disabled={sending} className="bg-brand hover:bg-brand-hover" data-testid="send-email-submit">
                  {sending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Send size={14} className="mr-2" />}
                  Gönder
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* WhatsApp */}
        <Dialog open={waOpen} onOpenChange={setWaOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" data-testid="whatsapp-btn">
              <MessageCircle size={14} className="mr-2" /> WhatsApp'tan İlet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-heading">WhatsApp Gönder</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Numara (ülke kodu ile)</Label><Input value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="+905xxxxxxxxx" data-testid="wa-number-input" /></div>
              <div><Label>Mesaj</Label><Textarea rows={4} value={waMessage} onChange={(e) => setWaMessage(e.target.value)} /></div>
              <p className="text-xs text-slate-500">WhatsApp Web/uygulamasında sohbet açılır. Teklif PDF'inizin indirme bağlantısı mesajın sonuna otomatik eklenir; müşteri tek tıkla PDF'i açabilir.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setWaOpen(false)}>İptal</Button>
                <Button onClick={openWhatsApp} className="bg-green-600 hover:bg-green-700" data-testid="wa-send-btn">
                  <MessageCircle size={14} className="mr-2" /> Aç ve Gönder
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={revise} data-testid="revise-btn"><GitBranch size={14} className="mr-2" /> Yeni Revizyon</Button>
        <Button variant="ghost" onClick={remove} className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid="delete-quote-btn"><Trash2 size={14} className="mr-2" /> Sil</Button>
      </div>

      {quote.revisions && quote.revisions.length > 1 && (
        <div className="mb-4 bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Revizyonlar</div>
          <div className="flex flex-wrap gap-2">
            {quote.revisions.map((r) => (
              <Link key={r.id} to={`/teklifler/${r.id}`} className={`px-3 py-1 rounded-full text-xs font-medium border ${r.id === id ? "bg-brand text-white border-brand" : "bg-white text-slate-700 border-slate-200 hover:border-brand/40"}`}>
                {r.quote_no} <span className="opacity-60 ml-1">R{r.revision_number}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* PDF preview */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div ref={pdfRef} className="flex justify-center p-4 overflow-auto" style={{ background: "#e2e8f0" }}>
          <QuotePDFTemplate quote={quote} customer={customer} company={company} />
        </div>
      </div>
    </div>
  );
}
