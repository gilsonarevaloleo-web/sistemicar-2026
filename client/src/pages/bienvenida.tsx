import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import {
  Sparkles,
  LogIn,
  ArrowRight,
  Eye,
  Sunrise,
  Heart,
  Zap,
  Scale,
  FileText,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import { signInWithGoogle, isFirebaseConfigured } from "@/lib/firebase";
import { sendWelcomeEmail } from "@/lib/emailApi";
import { clearMigrationPending } from "@/lib/persistence";
import logoSistemicar from "@/assets/logo-sistemicar.png";
import {
  SISTEMA_OFERTA,
  SISTEMA_RECINTOS,
  SISTEMA_DIA,
  type SistemaRecinto,
} from "@/content/sistemaRecintos";

const GOLD = "#D4AF37";
const COBALT = "#0047AB";

const RECINTO_ICONS = {
  espejo: Eye,
  deposito: Sunrise,
  jornada: Heart,
  umbral: Zap,
} as const;

const ACTIVACION = [
  "Espejo: carga limpia",
  "Depósito: un ojo",
  "Jornada: unidades",
  "Umbral: criterio",
  "Sistema activo",
] as const;

export default function Bienvenida() {
  const [, navigate] = useLocation();
  const { user, login, loading } = useAuthContext();
  const [ctaLoading, setCtaLoading] = useState(false);
  const [ctaText, setCtaText] = useState("ENTRAR AL SISTEMA");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [abierto, setAbierto] = useState<SistemaRecinto["id"] | null>(null);

  useEffect(() => {
    if (user) {
      navigate("/menu");
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  const handleLogin = async () => {
    setCtaLoading(true);
    setCtaText("Abriendo recintos…");

    try {
      for (const linea of ACTIVACION) {
        setCtaText(linea);
        await new Promise((r) => setTimeout(r, linea === "Sistema activo" ? 420 : 320));
      }

      await login();
      toast.success("Bienvenido a SISTEMICAR");
      navigate("/menu");
    } catch {
      setCtaLoading(false);
      setCtaText("ENTRAR AL SISTEMA");
      toast.error("Error al iniciar sesión. Intenta de nuevo.");
    }
  };

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured()) {
      toast.error("Firebase no está configurado");
      return;
    }
    setGoogleLoading(true);
    try {
      clearMigrationPending();
      localStorage.setItem("sistemicar_google_redirect_pending", "true");
      const result = await signInWithGoogle();
      localStorage.removeItem("sistemicar_google_redirect_pending");
      if (!result?.user) {
        toast.info("Redirigiendo a Google…", { duration: 4000 });
        return;
      }

      const isNewUser =
        result.user.metadata?.creationTime === result.user.metadata?.lastSignInTime;
      if (isNewUser && result.user.email) {
        sendWelcomeEmail(result.user.email, result.user.displayName || undefined);
        toast.success("Bienvenido. Revisa tu correo.");
      } else {
        toast.success("Bienvenido de vuelta");
      }
      navigate("/menu");
    } catch (error: unknown) {
      console.error("Google login error:", error);
      localStorage.removeItem("sistemicar_google_redirect_pending");
      const code = typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code)
        : "";
      if (code === "auth/popup-closed-by-user") {
        toast.info("Inicio de sesión cancelado");
      } else {
        toast.error("Error al iniciar sesión con Google");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-start justify-center px-4 py-8 relative"
      style={{ backgroundColor: "#020202" }}
      data-testid="bienvenida-page"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${GOLD}08 0%, transparent 50%, ${COBALT}08 100%)`,
        }}
      />
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] pointer-events-none"
        style={{ backgroundColor: `${GOLD}15` }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
        style={{ backgroundColor: `${COBALT}15` }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center space-y-5">
          <div className="space-y-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-20 h-20 mx-auto"
              style={{ filter: `drop-shadow(0 0 30px ${GOLD}40)` }}
            >
              <img
                src={logoSistemicar}
                alt="SISTEMICAR Logo"
                className="w-full h-full object-contain"
              />
            </motion.div>
            <p
              className="text-[11px] uppercase tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              {SISTEMA_OFERTA.eyebrow}
            </p>
            <h1
              className="text-[1.65rem] font-black leading-tight text-white sm:text-3xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              data-testid="bienvenida-headline"
            >
              {SISTEMA_OFERTA.headline}
            </h1>
            <p className="text-sm max-w-sm mx-auto leading-relaxed text-white/55">
              {SISTEMA_OFERTA.subhead}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left" data-testid="bienvenida-recintos">
            {SISTEMA_RECINTOS.map((recinto) => {
              const Icon = RECINTO_ICONS[recinto.id];
              const open = abierto === recinto.id;
              return (
                <button
                  key={recinto.id}
                  type="button"
                  onClick={() => setAbierto(open ? null : recinto.id)}
                  className="rounded-xl p-3 text-left transition-colors"
                  style={{
                    backgroundColor: open ? `${recinto.color}18` : `${recinto.color}0d`,
                    border: `1px solid ${recinto.color}${open ? "66" : "33"}`,
                  }}
                  data-testid={`bienvenida-recinto-${recinto.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${recinto.color}22`,
                        border: `1px solid ${recinto.color}55`,
                      }}
                    >
                      <Icon size={16} style={{ color: recinto.color }} />
                    </div>
                    <span
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: recinto.color }}
                    >
                      {recinto.nameUpper}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/80 leading-snug font-medium">
                    {recinto.ritual}
                  </p>
                  <p className="text-[10px] text-white/45 leading-snug mt-1">
                    {recinto.oneLiner}
                  </p>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[11px] text-white/70 leading-relaxed mt-2 overflow-hidden"
                      >
                        {recinto.detail}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-white/40 leading-relaxed px-2">
            {SISTEMA_OFERTA.puente}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleLogin}
              disabled={loading || ctaLoading}
              className="w-full py-4 rounded-full text-white font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-80"
              style={{
                background: ctaLoading
                  ? `linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)`
                  : `linear-gradient(135deg, ${GOLD} 0%, ${COBALT} 100%)`,
                boxShadow: ctaLoading
                  ? `0 4px 30px rgba(59, 130, 246, 0.5)`
                  : `0 4px 20px ${GOLD}40`,
                fontSize: "16px",
                letterSpacing: "0.05em",
              }}
              data-testid="button-google-login"
            >
              {!ctaLoading && <Sparkles size={22} />}
              {ctaLoading && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {ctaText}
            </button>

            <p className="text-[11px] text-slate-600 text-center">
              Al continuar, aceptas que tus datos se almacenan de forma segura y privada
            </p>

            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all hover:bg-white/10"
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              data-testid="button-google-existing"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {googleLoading ? "Conectando..." : "Iniciar sesión con Google"}
            </button>

            <div className="grid grid-cols-3 gap-2">
              {SISTEMA_RECINTOS.filter((r) => r.publicExplore).map((recinto) => (
                <button
                  key={recinto.id}
                  type="button"
                  onClick={() => navigate(recinto.exploreHref)}
                  className="py-2.5 px-1 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-0.5 hover:text-white transition-colors"
                  style={{
                    color: recinto.color,
                    border: `1px solid ${recinto.color}44`,
                    backgroundColor: `${recinto.color}0d`,
                  }}
                  data-testid={`bienvenida-explorar-${recinto.id}`}
                >
                  {recinto.exploreLabel}
                  <ChevronRight size={11} />
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-3 text-left"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            data-testid="bienvenida-dia"
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2"
              style={{ color: GOLD }}
            >
              Un día en el sistema
            </p>
            <ul className="space-y-1.5">
              {SISTEMA_DIA.map((paso) => (
                <li key={paso.recinto} className="flex gap-3">
                  <span
                    className="text-[10px] font-black uppercase tracking-widest w-16 shrink-0 pt-0.5"
                    style={{ color: GOLD }}
                  >
                    {paso.recinto}
                  </span>
                  <span className="text-[11px] text-white/60 leading-snug">
                    <span className="text-white/80">{paso.cuando}.</span> {paso.gesto}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate("/acerca")}
              className="w-full py-2 text-slate-500 text-sm hover:text-white transition-colors flex items-center justify-center gap-1"
              data-testid="button-about"
            >
              El manifiesto
              <ArrowRight size={14} />
            </button>

            <div className="pt-3 border-t border-white/5">
              <div className="flex items-center justify-center gap-4 text-[10px] text-slate-600">
                <Link href="/terminos-condiciones">
                  <span className="flex items-center gap-1 hover:text-slate-400 transition-colors cursor-pointer">
                    <Scale size={10} />
                    Términos
                  </span>
                </Link>
                <span className="text-slate-700">•</span>
                <Link href="/libro-reclamaciones">
                  <span className="flex items-center gap-1 hover:text-slate-400 transition-colors cursor-pointer">
                    <FileText size={10} />
                    Reclamaciones
                  </span>
                </Link>
              </div>
              <p className="text-center text-[9px] text-slate-700 mt-2">
                © 2026 SISTEMICAR • Lima, Perú
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
