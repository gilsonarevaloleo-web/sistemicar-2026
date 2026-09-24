import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Sparkles, Shield, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import { signInWithGoogle, isFirebaseConfigured, getGoogleAuthErrorMessage, isUserAnonymous } from "@/lib/firebase";
import { sendWelcomeEmail } from "@/lib/emailApi";
import { clearMigrationPending } from "@/lib/persistence";
import { claimPendingPurchases } from "@/lib/claimPurchases";
import { safePostLoginPath } from "@shared/clientAccount";
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
  const googleReady = Boolean(user?.email) && !isUserAnonymous();

  useEffect(() => {
    if (!googleReady) return;
    void claimPendingPurchases();
    navigate(resolveAccesoNext());
  }, [googleReady, navigate]);

  if (googleReady) {
    return null;
  }

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
        sendWelcomeEmail(result.user.email, result.user.displayName || undefined);
        toast.success("Cuenta creada. Si ya pagaste, tu plan se activa ahora.");
      } else {
        toast.success("¡Bienvenido de vuelta!");
      }
      void claimPendingPurchases();
      navigate(resolveAccesoNext());
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

  if (loading) {
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

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Fondo con gradiente sutil */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse at center, ${COBALT}40 0%, transparent 70%)`
        }}
      />

      {/* Contenido principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
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

        {/* Título */}
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
            Accede a tu Comando
          </h1>
          <p className="text-gray-400 text-lg">
            Aquí se crea tu cuenta: Continuar con Google
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Usa el mismo Gmail del pago (Yape / PayPal). No hay usuario y contraseña.
          </p>
        </motion.div>

        {/* Card de acceso */}
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
          {/* Beneficios */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-gray-300">
              <Shield className="w-5 h-5" style={{ color: COBALT }} />
              <span>Guarda tu progreso de forma segura</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
              <span>Sincroniza tus Puntos de Soberanía</span>
            </div>
          </div>

          {/* Botón de Google */}
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

          {/* Mensaje de seguridad */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Tu información está protegida con Google
          </p>
        </motion.div>

        {/* Link para volver */}
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
