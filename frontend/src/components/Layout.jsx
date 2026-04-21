import React from "react";
import Sidebar from "./Sidebar";
import { Toaster } from "sonner";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
