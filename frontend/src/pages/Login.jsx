import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Loader2, Lock, Mail } from "lucide-react";

const LOGO = "https://customer-assets.emergentagent.com/job_quote-crm-1/artifacts/6y5mv5wn_image.png";
const BG = "https://images.pexels.com/photos/33210357/pexels-photo-33210357.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1200";

export default function Login() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@arigastro.com");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (ready && user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) navigate("/", { replace: true });
    else setErr(res.error || "Giriş başarısız");
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: brand panel */}
      <div
        className="hidden lg:flex relative items-end p-12 text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(0,77,133,0.85), rgba(0,115,196,0.7)), url(${BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white text-brand flex items-center justify-center font-heading font-bold">
              Arı
            </div>
            <span className="font-heading text-xl font-semibold">ArıCRM</span>
          </div>
          <h2 className="font-heading text-4xl font-semibold leading-tight max-w-md">
            Profesyonel teklif yönetimi, tek panelden.
          </h2>
          <p className="mt-4 text-white/80 max-w-md">
            Arıgastro müşterilerinize hızlıca profesyonel fiyat teklifleri hazırlayın,
            PDF olarak indirin, WhatsApp veya e-posta ile paylaşın.
          </p>
          <div className="mt-10 text-xs uppercase tracking-[0.2em] text-white/60">
            Endüstriyel Mutfak Ekipmanları
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 bg-white">
        <form onSubmit={submit} className="w-full max-w-md" data-testid="login-form">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-heading font-bold">Arı</div>
            <span className="font-heading text-xl font-semibold">ArıCRM</span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
            Hoş geldiniz
          </h1>
          <p className="text-slate-500 mt-2">
            Panele erişmek için hesabınıza giriş yapın.
          </p>

          <div className="space-y-4 mt-8">
            <div>
              <Label htmlFor="email">E-posta</Label>
              <div className="relative mt-1">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11"
                  placeholder="ornek@firma.com"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Şifre</Label>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-11"
                  placeholder="••••••••"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>
            {err && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" data-testid="login-error">
                {err}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-medium"
              data-testid="login-submit-button"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Giriş Yap"}
            </Button>
          </div>

          <div className="mt-10 text-xs text-slate-400">
            © {new Date().getFullYear()} Arıgastro · ArıCRM
          </div>
        </form>
      </div>
    </div>
  );
}
