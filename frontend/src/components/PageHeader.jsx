import React from "react";

export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-semibold tracking-tight text-slate-900 break-words">
          {title}
        </h1>
        {subtitle && <div className="text-sm text-slate-500 mt-1">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}
