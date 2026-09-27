import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Sparkles, Shield, ArrowLeft, Phone } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import { signInWithGoogle, isFirebaseConfigured, getGoogleAuthErrorMessage, isUserAnonymous } from "@/lib/firebase";
import { sendWelcomeEmail } from "@/lib/emailApi";
import {
  clearMigrationPending,
  saveJornadaBaseContact,
  subscribeToProgression,
} from "@/lib/persistence";
import { claimPendingPurchases } from "@/lib/claimPurchases";
import { trackCompleteRegistration, trackJornadaLead } from "@/lib/metaPixel";
import { safePostLoginPath } from "@shared/clientAccount";
import { isOwnerEmail } from "@shared/moduleAccess";
import {
  JORNADA_BASE_TRIAL_COPY,
  resolveJornadaBaseRegistroStep,
} from "@shared/jornadaBaseAccess";
import { normalizeClientPhone, pickClientPhone } from "@shared/phone";
import logoSistemicar from "@/assets/logo-sistemicar.png";

const GOLD = "#D4AF37";
const COBALT = "#0047AB";

function resolveAccesoNext(): string {
  if (typeof window === "undefined") return "/menu";
  return safePostLoginPath(new URLSearchParams(window.location.search).get("next"));
}

export default function Acceso() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuthContext();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [whatsappSaved, setWhatsappSaved] = useState<string | null | undefined>(undefined);
  const googleReady = Boolean(user?.email) && !isUserAnonymous();
  const nextPath = resolveAccesoNext();

  useEffect(() => {
    if (!googleReady || !user?.uid) {
      setWhatsappSaved(undefined);
      return;
    }
    const unsub = subscribeToProgression(
      user.uid,
      (prog) => {
        setWhatsappSaved((prev) => pickClientPhone(prog.whatsapp, prev) ?? null);
      },
      () => {
        setWhatsappSaved((prev) => pickClientPhone(prev, null));
      },
    );
    return () => unsub();
  }, [googleReady, user?.uid]);

  const step = resolveJornadaBaseRegistroStep({
    firebaseConfigured: isFirebaseConfigured(),
    isOwner: isOwnerEmail(user?.email),
    isAnonymous: !googleReady,
    email: user?.email,
    whatsapp: whatsappSaved ?? null,
    progressionReady: whatsappSaved !== undefined,
  });

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    if (step !== "ready") return;
    void claimPendingPurchases();
    navigate(nextPath);
  }, [step, navigate, nextPath]);

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

      const isNewUser = result?.user?.metadata?.creationTime === result?.user?.metadata?.lastSignInTime;
      if (isNewUser && result?.user?.email) {
        trackCompleteRegistration({
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
          method: "google",
        });
        sendWelcomeEmail(result.user.email, result.user.displayName || undefined);
        toast.success("Cuenta creada. Ahora deja tu WhatsApp.");
      } else {
        toast.success("¡Bienvenido de vuelta!");
      }
      void claimPendingPurchases();
    } catch (error: unknown) {
      console.error("Error en login con Google:", error);
      localStorage.removeItem("sistemicar_google_redirect_pending");
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

  const handleSavePhone = async () => {
    if (!user?.uid || !user.email) {
      toast.error("Primero entra con Google.");
      return;
    }
    const normalized = normalizeClientPhone(phone);
    if (!normalized) {
      toast.error("Ingresa un WhatsApp válido (9 dígitos en Perú).");
      return;
    }
    setPhoneSaving(true);
    try {
      const saved = await saveJornadaBaseContact(user.uid, {
        email: user.email,
        nombre: user.displayName,
        whatsapp: phone,
      });
      setWhatsappSaved(saved);
      trackJornadaLead("acceso-registro");
      toast.success("Listo. Ya puedes entrar.");
      void claimPendingPurchases();
      navigate(nextPath);
    } catch {
      toast.error("No se pudo guardar el número. Intenta de nuevo.");
    } finally {
      setPhoneSaving(false);
    }
  };

  if (
    loading ||
    (isFirebaseConfigured() && (step === "loading" || step === "ready"))
  ) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-8 h-8" style={{ color: GOLD }} />
        </motion.div>
      </div>
    );
  }

  const askingPhone = step === "phone";

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse at center, ${COBALT}40 0%, transparent 70%)`
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <img
            src={logoSistemicar}
            alt="Sistemicar"
            className="w-32 h-32 object-contain"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h1
            className="text-3xl font-bold mb-3"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: GOLD
            }}
          >
            {askingPhone ? "Deja tu WhatsApp" : "Accede a tu Comando"}
          </h1>
          <p className="text-gray-400 text-lg">
            {askingPhone
              ? JORNADA_BASE_TRIAL_COPY.register
              : "Aquí se crea tu cuenta: Continuar con Google"}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {askingPhone
              ? "Así te avisamos y no pierdes los 7 días de Base."
              : "Usa el mismo Gmail del pago (Yape / PayPal). No hay usuario y contraseña."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)'
          }}
        >
          {askingPhone ? (
            <>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-gray-300">
                  <Phone className="w-5 h-5" style={{ color: GOLD }} />
                  <span>WhatsApp para avisarte del trial y del plan</span>
                </div>
                {user?.email && (
                  <p className="text-xs text-gray-500">Cuenta: {user.email}</p>
                )}
              </div>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="918 260 514"
                className="w-full mb-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-lg tracking-wider"
                data-testid="input-acceso-whatsapp"
              />
              <p className="text-[11px] text-gray-500 text-center mb-6">
                Perú: 9 dígitos. Si eres de otro país, incluye el código (+52, +1…).
              </p>
              <motion.button
                onClick={() => void handleSavePhone()}
                disabled={phoneSaving || !phone.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 px-6 rounded-xl font-semibold text-black flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                style={{
                  background: GOLD,
                  boxShadow: `0 4px 20px ${GOLD}40`
                }}
                data-testid="button-acceso-guardar-whatsapp"
              >
                {phoneSaving ? "Guardando…" : "Guardar y entrar"}
              </motion.button>
            </>
          ) : (
            <>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-gray-300">
                  <Shield className="w-5 h-5" style={{ color: COBALT }} />
                  <span>Guarda tu progreso de forma segura</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
                  <span>Sincroniza tus Puntos de Soberanía</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Phone className="w-5 h-5" style={{ color: GOLD }} />
                  <span>Deja tu WhatsApp para entrar a Base</span>
                </div>
              </div>

              <motion.button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${COBALT} 0%, #1E90FF 100%)`,
                  boxShadow: `0 4px 20px ${COBALT}40`
                }}
                data-testid="button-acceso-google"
              >
                {googleLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-lg">Continuar con Google</span>
                  </>
                )}
              </motion.button>

              <p className="text-center text-gray-500 text-sm mt-6">
                Tu información está protegida con Google
              </p>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <Link href="/">
            <a
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              data-testid="link-volver-inicio"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al inicio</span>
            </a>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
