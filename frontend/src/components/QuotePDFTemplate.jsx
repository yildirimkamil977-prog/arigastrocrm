import React from "react";
import { formatDate, formatMoney } from "../lib/api";

/**
 * Printable / PDF quote template.
 * Keeps itself print-friendly; uses inline styles for html2canvas reliability.
 */
export default function QuotePDFTemplate({ quote, customer, company }) {
  const {
    quote_no, issue_date, valid_until, currency, items = [],
    subtotal = 0, vat_amount = 0, total_with_vat = 0,
    discount_amount = 0, grand_total = 0, vat_rate = 0, discount_rate = 0,
    notes,
  } = quote || {};

  return (
    <div
      className="pdf-root"
      id="quote-pdf-root"
      style={{
        padding: "24mm 18mm",
        width: "210mm",
        minHeight: "297mm",
        background: "#ffffff",
        color: "#0f172a",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0073c4", paddingBottom: 16 }}>
        <div style={{ maxWidth: "55%" }}>
          {company?.logo_url ? (
            <img src={company.logo_url} alt="logo" style={{ maxHeight: 60, maxWidth: 240, objectFit: "contain" }} crossOrigin="anonymous" />
          ) : (
            <div style={{ fontSize: 22, fontFamily: "Outfit, sans-serif", fontWeight: 700, color: "#0073c4" }}>
              {company?.company_name || "Arıgastro"}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>
            {company?.tagline}
          </div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 8, lineHeight: 1.5 }}>
            {company?.address}
            {company?.phone && <><br />Tel: {company.phone}</>}
            {company?.email && <><br />E-posta: {company.email}</>}
            {company?.website && <><br />{company.website}</>}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 28, fontWeight: 700, color: "#0073c4", letterSpacing: 2 }}>
            TEKLİF
          </div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 8 }}>
            <div><b>Teklif No:</b> {quote_no}</div>
            <div><b>Tarih:</b> {formatDate(issue_date)}</div>
            <div><b>Geçerlilik:</b> {formatDate(valid_until)}</div>
          </div>
        </div>
      </div>

      {/* Parties */}
      <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
        <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#94a3b8" }}>Sayın Müşteri</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{customer?.company_name || "-"}</div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>
            {customer?.contact_person && <>{customer.contact_person}<br /></>}
            {customer?.address}
            {customer?.tax_number && <><br />VN: {customer.tax_number} {customer.tax_office ? `/ ${customer.tax_office}` : ""}</>}
            {customer?.phone && <><br />Tel: {customer.phone}</>}
            {customer?.email && <><br />{customer.email}</>}
          </div>
        </div>
        <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 6, padding: 12, background: "#f8fafc" }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#94a3b8" }}>Firma Bilgileri</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{company?.company_name}</div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>
            {company?.tax_number && <>VN: {company.tax_number} {company.tax_office ? `/ ${company.tax_office}` : ""}<br /></>}
            {company?.phone}{company?.email && <> · {company.email}</>}
          </div>
        </div>
      </div>

      {/* Items */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20, fontSize: 10 }}>
        <thead>
          <tr style={{ background: "#0073c4", color: "#fff" }}>
            <th style={{ padding: "8px 6px", textAlign: "left", width: 40 }}>#</th>
            <th style={{ padding: "8px 6px", textAlign: "left", width: 70 }}>Görsel</th>
            <th style={{ padding: "8px 6px", textAlign: "left" }}>Ürün</th>
            <th style={{ padding: "8px 6px", textAlign: "right", width: 50 }}>Adet</th>
            <th style={{ padding: "8px 6px", textAlign: "right", width: 90 }}>Birim Fiyat</th>
            <th style={{ padding: "8px 6px", textAlign: "right", width: 50 }}>İnd.%</th>
            <th style={{ padding: "8px 6px", textAlign: "right", width: 100 }}>Tutar</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const line = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
            const after = line - line * ((Number(it.discount_percent) || 0) / 100);
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 6px", verticalAlign: "top" }}>{i + 1}</td>
                <td style={{ padding: "6px", verticalAlign: "top" }}>
                  {it.image ? (
                    <img src={it.image} alt="" style={{ width: 60, height: 60, objectFit: "contain", background: "#fff", border: "1px solid #e2e8f0" }} crossOrigin="anonymous" />
                  ) : null}
                </td>
                <td style={{ padding: "8px 6px", verticalAlign: "top" }}>
                  {it.code && <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b", textTransform: "uppercase" }}>#{it.code}</div>}
                  <div style={{ fontWeight: 600 }}>{it.title}</div>
                  {it.description && <div style={{ color: "#475569", marginTop: 2 }}>{it.description}</div>}
                </td>
                <td style={{ padding: "8px 6px", textAlign: "right", verticalAlign: "top" }}>{Number(it.quantity) || 0}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", verticalAlign: "top" }}>{formatMoney(it.unit_price, currency)}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", verticalAlign: "top" }}>{Number(it.discount_percent) || 0}%</td>
                <td style={{ padding: "8px 6px", textAlign: "right", verticalAlign: "top", fontWeight: 600 }}>{formatMoney(after, currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <table style={{ fontSize: 11, minWidth: 280 }}>
          <tbody>
            <tr><td style={{ padding: "4px 10px", color: "#475569" }}>Ara Toplam</td><td style={{ padding: "4px 10px", textAlign: "right" }}>{formatMoney(subtotal, currency)}</td></tr>
            <tr><td style={{ padding: "4px 10px", color: "#475569" }}>KDV (%{vat_rate})</td><td style={{ padding: "4px 10px", textAlign: "right" }}>{formatMoney(vat_amount, currency)}</td></tr>
            <tr style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={{ padding: "6px 10px", fontWeight: 600 }}>KDV Dahil Toplam</td>
              <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>{formatMoney(total_with_vat, currency)}</td>
            </tr>
            {Number(discount_rate) > 0 && (
              <tr>
                <td style={{ padding: "4px 10px", color: "#b91c1c" }}>İskonto (%{discount_rate})</td>
                <td style={{ padding: "4px 10px", textAlign: "right", color: "#b91c1c" }}>- {formatMoney(discount_amount, currency)}</td>
              </tr>
            )}
            <tr style={{ background: "#0073c4", color: "#fff" }}>
              <td style={{ padding: "10px", fontWeight: 700 }}>GENEL TOPLAM</td>
              <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, fontSize: 13 }}>{formatMoney(grand_total, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {notes && (
        <div style={{ marginTop: 24, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#94a3b8", marginBottom: 4 }}>Notlar</div>
          <div style={{ fontSize: 10, color: "#334155", whiteSpace: "pre-wrap" }}>{notes}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 28, borderTop: "1px solid #e2e8f0", paddingTop: 14, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#64748b" }}>
        <div>
          {company?.bank_name && <div><b>Banka:</b> {company.bank_name}</div>}
          {company?.bank_account_holder && <div><b>Hesap Sahibi:</b> {company.bank_account_holder}</div>}
          {company?.bank_iban && <div style={{ fontFamily: "JetBrains Mono, monospace" }}>{company.bank_iban}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div>Bu teklif {formatDate(valid_until)} tarihine kadar geçerlidir.</div>
          <div style={{ marginTop: 14, borderTop: "1px solid #94a3b8", paddingTop: 3, display: "inline-block", minWidth: 160 }}>
            Yetkili İmza
          </div>
        </div>
      </div>

      {/* Social media */}
      <SocialStrip company={company} />
    </div>
  );
}

function SocialStrip({ company }) {
  const links = [
    { key: "social_instagram", label: "Instagram" },
    { key: "social_facebook", label: "Facebook" },
    { key: "social_twitter", label: "X" },
    { key: "social_linkedin", label: "LinkedIn" },
    { key: "social_youtube", label: "YouTube" },
    { key: "social_tiktok", label: "TikTok" },
  ].filter((l) => (company?.[l.key] || "").trim());

  if (links.length === 0 && !company?.website) return null;

  const display = (url) => {
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      return `${u.hostname.replace(/^www\./, "")}${u.pathname !== "/" ? u.pathname : ""}`;
    } catch {
      return url;
    }
  };

  return (
    <div
      style={{
        marginTop: 18,
        padding: "10px 14px",
        background: "#0073c4",
        color: "#ffffff",
        borderRadius: 6,
        display: "flex",
        flexWrap: "wrap",
        gap: 14,
        rowGap: 6,
        alignItems: "center",
        justifyContent: "center",
        fontSize: 9,
      }}
    >
      {company?.website && (
        <span style={{ fontWeight: 600 }}>{display(company.website)}</span>
      )}
      {links.map((l, i) => (
        <span key={l.key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {(company?.website || i > 0) && (
            <span style={{ opacity: 0.5, marginRight: 6 }}>·</span>
          )}
          <b>{l.label}:</b>
          <span>{display(company[l.key])}</span>
        </span>
      ))}
    </div>
  );
}
