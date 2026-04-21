import React from "react";

const MAP = {
  taslak:       { label: "Taslak",       bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
  gonderildi:   { label: "Gönderildi",   bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  kabul:        { label: "Kabul",        bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  red:          { label: "Red",          bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
  suresi_doldu: { label: "Süresi Doldu", bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
};

export default function StatusBadge({ status }) {
  const s = MAP[status] || MAP.taslak;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
      data-testid={`status-badge-${status}`}
    >
      {s.label}
    </span>
  );
}

export { MAP as STATUS_MAP };
