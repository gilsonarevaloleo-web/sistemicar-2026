import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Cloud, LogIn, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import {
  getGoogleAuthErrorMessage,
  isFirebaseConfigured,
  isUserAnonymous,
  signInWithGoogle,
} from "@/lib/firebase";
import { clearMigrationPending } from "@/lib/persistence";
import { isOwner } from "@/lib/owner";
import logoSistemicar from "@/assets/logo-sistemicar.png";

const GOLD = "#D4AF37";

export default function Recuperar() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuthContext();
  const [googleLoading, setGoogleLoading] = useState(false);
  const anonymous = !user?.email || isUserAnonymous();
  const owner = isOwner(user?.email);

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured()) {
      toast.error("Firebase no está configurado");
      return;
    }
    setGoogleLoading(true);
    try {
      clearMigrationPending();
      const result = await signInWithGoogle();
      if (!result?.user) {
        toast.info("Redirigiendo a Google…", { duration: 4000 });
        return;
      }
      toast.success("Sesión recuperada. Abre Crisol, Récord, Rutina y Depósito.");
      navigate("/menu");
    } catch (error: unknown) {
      const msg = getGoogleAuthErrorMessage(error);
      if ((error as { code?: string })?.code === "auth/popup-closed-by-user") {
        toast.info(msg);
      } else {
        toast.error(msg, { duration: 16000 });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-5 py-8 pb-24">
      <div className="mx-auto max-w-lg space-y-6">
        <Link href="/menu" className="inline-flex items-center gap-2 text-sm text-zinc-400">
          <ArrowLeft size={16} /> Volver al menú
        </Link>

        <div className="flex justify-center">
          <img src={logoSistemicar} alt="Sistemicar" className="h-20 w-20 object-contain" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 text-center"
        >
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: GOLD }}>
            Recuperar cuenta
          </p>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif", color: GOLD }}
          >
            Esta nube nunca guardó los 9000
          </h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            En sistemicar-app no hay Cloud Firestore. Los 9000, Crisol, Récord y Rutina
            estaban en el teléfono. Crear la base ahora no los trae: queda vacía y sirve
            para no perder lo que hagas de hoy en adelante.
          </p>
        </motion.div>

        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Cloud className="mt-0.5 shrink-0 text-sky-400" size={22} />
            <ol className="space-y-2 text-sm text-zinc-200">
              <li>1. En Firebase, solo Cloud Firestore → Crear base. No toques Realtime Database.</li>
              <li>2. Modo Native / estándar. Ubicación la que ofrezca (nam5 o southamerica).</li>
              <li>3. Arriba a la izquierda, cambia de proyecto (misma cuenta gilsonarevalo.leo@gmail.com): busca si existe otro con datos, p. ej. sistemicar-8375c.</li>
              <li>4. Si otro celular o computadora todavía tiene Sistemicar abierto, no lo limpies: ahí sí están los 9000.</li>
            </ol>
          </div>
        </div>

        {anonymous ? (
          <button
            type="button"
            onClick={() => void handleGoogleLogin()}
            disabled={googleLoading || loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl py-4 text-lg font-bold text-white disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4)",
            }}
            data-testid="button-recuperar-google"
          >
            <LogIn size={22} />
            {googleLoading ? "Conectando..." : "Entrar con Google"}
          </button>
        ) : (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3">
            <p className="text-sm text-emerald-300">
              Ya estás con <span className="font-bold">{user?.email}</span>.
              Recarga Crisol, Récord, Rutina y Depósito. Si siguen vacíos, no están en esta nube.
            </p>
            <button
              type="button"
              onClick={() => navigate("/menu")}
              className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white"
              data-testid="button-recuperar-ir-menu"
            >
              Ir al menú y revisar
            </button>
          </div>
        )}

        {owner && !anonymous && (
          <Link
            href="/admin-gilson?tab=recovery"
            className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-sm font-bold text-amber-300"
            data-testid="link-recuperar-admin"
          >
            <Shield size={16} />
            Panel: buscar UID viejo y copiar Crisol / Récord / Rutina / Depósito
          </Link>
        )}

        <p className="text-center text-xs text-zinc-600">
          No pulses «Reiniciar datos». Eso solo borra lo que queda en este dispositivo.
        </p>
      </div>
    </div>
  );
}
