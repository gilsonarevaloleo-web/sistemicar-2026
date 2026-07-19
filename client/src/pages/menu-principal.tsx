import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, 
  Lock, 
  Sparkles, 
  History, 
  CreditCard, 
  Users,
  RotateCcw,
  Shield,
  Database,
  Flame,
  User,
  Link2,
  RefreshCw,
  Moon,
  Quote,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sunrise,
  Wand2,
  Heart,
  MessageCircle,
  Crown,
  BookOpen,
  HelpCircle,
  Map,
  Zap,
  Rocket,
  Layers,
  Scale,
  FileText,
  LogIn,
  Sprout,
  Radio,
} from "lucide-react";
import { Link } from "wouter";
import { DataStatusPanel } from "@/components/data-status";
import { StatusAlianza } from "@/components/status-alianza";
import { ResumenDiario } from "@/components/resumen-diario";
import { TooltipOrientacion } from "@/components/tooltip-orientacion";
import { Onboarding } from "@/components/onboarding";
import { clearAllLocalData, subscribeToProgression, UserProgression, updateProgression, subscribeToCodices, SavedCodice, migrateDataToNewUid, saveMigrationPending, getMigrationPending, clearMigrationPending, subscribeToManualProgress, UserCertification, CERTIFICATION_LEVELS, hasPlanificacionBaseAccess, hasSoberaniaDiaAccess } from "@/lib/persistence";
import {
  isDeployPreviewHost,
  isPreviewOpsUnlocked,
  setPreviewOpsUnlocked,
} from "@/lib/previewOps";
import { MODULOS_EN_CAMINO, BADGE_EN_CAMINO } from "@shared/moduleCatalog";
import { toast } from "sonner";
import {
  auth,
  isUserAnonymous,
  getUserEmail,
  isFirebaseConfigured,
  logOut,
  signInAnonymousUser,
  startGoogleSignInRedirect,
} from "@/lib/firebase";
import { useAuthContext } from "@/App";
import logoSistemicar from "@/assets/logo-sistemicar.png";
import { PageContainer } from "@/components/page-container";
import { isOwner } from "@/lib/owner";
import { JORNADA_MODULE, JORNADA_V3_PATH } from "@/lib/jornadaBrand";
import { prefetchJornadaChunk } from "@/lib/lazyWithRetry";
import { resetVoicePlaybackCache } from "@/lib/voicePlaybackCacheReset";

// ESPECTRO CROMÁTICO DE CONCIENCIA
const SPECTRUM = {
  ROJO: "#EF4444",      // Base - Espejo
  NARANJA: "#F97316",   // Fuego - Depósito  
  AMARILLO: "#EAB308",  // Oro - Alquimia
  VERDE: "#22C55E",     // Corazón - Jornada
  AZUL: "#3B82F6",      // Voz - IA/Diagnóstico
  VIOLETA: "#8B5CF6",   // Espíritu - Perfil/Alianza
};

const GOLD = "#D4AF37";

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;
  route: string;
  color: string;
  enCamino?: boolean;
}

const MODULO_ICONS: Record<string, MenuItem["icon"]> = {
  alquimia: Wand2,
  umbral: Zap,
  deposito: Sunrise,
  proyector: Rocket,
  mentor: MessageCircle,
  alianza: Crown,
  radar: Radio,
  manuales: BookOpen,
  proximo: Sparkles,
};

function buildMenuItems(progression: UserProgression | null, email: string | null): MenuItem[] {
  const accessArgs = [progression?.subscriptionPlan, email, progression?.rank, progression?.activeModules] as const;
  const items: MenuItem[] = [
    {
      id: "espejo",
      title: "ESPEJO",
      subtitle: "Vaciado mental · $17 pago único",
      icon: Eye,
      route: "/espejo",
      color: SPECTRUM.ROJO,
    },
  ];

  if (hasPlanificacionBaseAccess(...accessArgs)) {
    items.push({
      id: "planificacion",
      title: JORNADA_MODULE.titleUpper,
      subtitle: JORNADA_MODULE.tagline,
      icon: Heart,
      route: "/planeacion",
      color: SPECTRUM.VERDE,
    });
    items.push({
      id: "jornada-v3",
      title: `${JORNADA_MODULE.titleUpper} V3`,
      subtitle: "Laboratorio modular · motor nuevo",
      icon: Zap,
      route: JORNADA_V3_PATH,
      color: "#D4AF37",
    });
  }

  if (hasSoberaniaDiaAccess(...accessArgs)) {
    items.push({
      id: "proyectos",
      title: "PROYECTOS",
      subtitle: "Escalera de peldaños",
      icon: Layers,
      route: "/proyectos",
      color: "#38BDF8",
    });
  }

  for (const mod of MODULOS_EN_CAMINO) {
    items.push({
      id: mod.id,
      title: mod.nombre.toUpperCase(),
      subtitle: BADGE_EN_CAMINO,
      icon: MODULO_ICONS[mod.id] ?? Sparkles,
      route: mod.route ?? "/pagos",
      color: mod.color ?? "#64748b",
      enCamino: true,
    });
  }

  return items;
}

// Items secundarios
const secondaryItems = [
  { id: "historia", title: "Historia", icon: History, route: "/historial", color: "#64748b" },
  { id: "registros", title: "Registros", icon: Database, route: "/registros", color: "#64748b" },
  { id: "codice", title: "Códice", icon: BookOpen, route: "/codice", color: "#64748b" },
  { id: "ayuda", title: "¿Cómo funciona?", icon: HelpCircle, route: "/como-funciona", color: "#64748b" },
  { id: "mapa", title: "Mapa del Sistema", icon: Map, route: "/mapa", color: "#D4AF37" },
];

// Email del propietario - siempre tiene acceso completo
const OWNER_EMAIL = "gilsonarevalo.leo@gmail.com";

export default function MenuPrincipal() {
  const [, navigate] = useLocation();
  const { user } = useAuthContext();
  const [resetting, setResetting] = useState(false);
  const [showDataStatus, setShowDataStatus] = useState(false);
  const [showResumenDiario, setShowResumenDiario] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [codices, setCodices] = useState<SavedCodice[]>([]);
  const [codiceActual, setCodiceActual] = useState(0);
  const [codiceExpandido, setCodiceExpandido] = useState<SavedCodice | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [secretTaps, setSecretTaps] = useState(0);
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [certification, setCertification] = useState<UserCertification | null>(null);
  const [previewUnlocked, setPreviewUnlocked] = useState(() => isPreviewOpsUnlocked());

  useEffect(() => {
    if (isFirebaseConfigured()) {
      setIsAnonymous(isUserAnonymous());
      setUserEmail(getUserEmail());
    }
  }, [user]);

  useEffect(() => {
    resetVoicePlaybackCache();
  }, []);

  useEffect(() => {
    const checkPendingMigration = async () => {
      if (!user?.uid || isUserAnonymous()) return;
      
      const pending = getMigrationPending();
      if (pending && pending.oldUid !== user.uid) {
        setMigrating(true);
        toast.info("Migrando tus datos a la cuenta de Google...", { duration: 10000 });
        
        try {
          const result = await migrateDataToNewUid(pending.oldUid, user.uid);
          clearMigrationPending();
          
          if (result.migrated > 0) {
            toast.success(`¡Migración completada! ${result.migrated} registros transferidos.`, {
              style: { backgroundColor: "#052e16", border: "1px solid #22c55e", color: "#22c55e" },
              duration: 5000
            });
            window.location.reload();
          } else {
            toast.info("No se encontraron datos para migrar.");
          }
        } catch (error) {
          console.error("Migration error:", error);
          toast.error("Error en la migración. Intenta de nuevo.");
        } finally {
          setMigrating(false);
        }
      }
    };
    
    checkPendingMigration();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToProgression(
      user.uid,
      (prog) => {
        setProgression(prog);
        const onboardingKey = `sistemicar_onboarding_${user.uid}`;
        const hasSeenOnboarding = localStorage.getItem(onboardingKey);
        if (!hasSeenOnboarding && prog.totalCP === 0) {
          setShowOnboarding(true);
        }
      },
      (err) => console.error("Progression error:", err)
    );
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const args = [progression?.subscriptionPlan, userEmail, progression?.rank, progression?.activeModules] as const;
    if (!hasPlanificacionBaseAccess(...args)) return;
    const run = () => prefetchJornadaChunk();
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(run, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 400);
    return () => clearTimeout(t);
  }, [user?.uid, userEmail, progression?.subscriptionPlan, progression?.rank, progression?.activeModules]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToCodices(
      user.uid,
      (data) => {
        setCodices(data);
        setCodiceActual(0);
      },
      (err) => console.error("Codices error:", err)
    );
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToManualProgress(
      user.uid,
      (data: UserCertification) => setCertification(data),
      (err: Error) => console.error("Manual progress error:", err)
    );
    return () => unsub();
  }, [user?.uid]);

  const handleOnboardingComplete = () => {
    if (user?.uid) {
      const onboardingKey = `sistemicar_onboarding_${user.uid}`;
      localStorage.setItem(onboardingKey, "true");
    }
    setShowOnboarding(false);
  };

  const handleLinkGoogle = async () => {
    if (!user?.uid) return;

    setLinking(true);

    try {
      if (isFirebaseConfigured() && auth && !auth.currentUser) {
        try {
          await signInAnonymousUser();
        } catch (anonErr) {
          console.error("Anonymous sign-in before Google link failed:", anonErr);
          toast.error(
            "No hay sesión de Firebase activa. En Firebase Console → Authentication → Sign-in method, activa «Anónimo» y recarga la página.",
            { duration: 12000 }
          );
          return;
        }
      }

      if (!auth?.currentUser?.isAnonymous) {
        if (auth?.currentUser?.email) {
          toast.info("Ya iniciaste sesión con Google.");
        } else {
          toast.error("Estado de sesión inesperado. Recarga la página.");
        }
        return;
      }

      const anonUid = auth.currentUser.uid;
      saveMigrationPending(anonUid);
      toast.info(
        "Te llevamos a Google en esta misma ventana (sin popup bloqueado). Al volver, tu cuenta quedará conectada y tus datos se sincronizarán.",
        { duration: 9000 }
      );
      await logOut();
      await startGoogleSignInRedirect();
    } catch (error: any) {
      const currentDomain = window.location.hostname;
      clearMigrationPending();
      if (error.code === "auth/unauthorized-domain") {
        toast.error(`Dominio no autorizado: "${currentDomain}". Agrégalo en Firebase Console.`, {
          duration: 15000,
        });
      } else if (error.code === "auth/popup-closed-by-user") {
        toast.info("Conexión cancelada");
      } else {
        toast.error("Error al conectar con Google. Intenta de nuevo.");
      }
      console.error("Google redirect from menu error:", error);
      try {
        await signInAnonymousUser();
      } catch (anonRestoreErr) {
        console.error("Restaurar sesión anónima tras error:", anonRestoreErr);
      }
    } finally {
      setLinking(false);
    }
  };

  const handleReset = () => {
    if (confirm("¿Reiniciar todos los datos? Esta acción no se puede deshacer.")) {
      setResetting(true);
      clearAllLocalData();
      toast.success("Datos eliminados. Nuevo comienzo.");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleMigrateToGoogle = async () => {
    if (!user?.uid) return;
    
    const confirmed = confirm(
      "MIGRACIÓN DE DATOS A GOOGLE\n\n" +
      "Este proceso:\n" +
      "1. Guardará tu uid actual para migración\n" +
      "2. Cerrará tu sesión\n" +
      "3. Te pedirá iniciar sesión con Google\n" +
      "4. Copiará todos tus datos al nuevo uid de Google\n\n" +
      "¿Deseas continuar?"
    );
    
    if (!confirmed) return;
    
    try {
      saveMigrationPending(user.uid);
      toast.info("Cerrando sesión... Inicia sesión con Google para completar la migración.", { duration: 5000 });
      await logOut();
      await startGoogleSignInRedirect();
    } catch (error) {
      console.error("Migration start error:", error);
      toast.error("Error al iniciar migración. Intenta de nuevo.");
      clearMigrationPending();
    }
  };

  const handleSecretTap = () => {
    const newTaps = secretTaps + 1;
    setSecretTaps(newTaps);
    if (newTaps >= 5) {
      setShowSecretCode(true);
      setSecretTaps(0);
    }
  };

  const handleSecretCode = async () => {
    const OWNER_CODE = "GILSON2025";
    if (secretInput.toUpperCase() === OWNER_CODE && user?.uid) {
      await updateProgression(user.uid, { rank: "arquitecto", points: progression?.points || 0 });
      toast.success("¡ARQUITECTO ACTIVADO! Recarga para ver cambios.", {
        style: { backgroundColor: "#052e16", border: "1px solid #22c55e", color: "#22c55e" },
        duration: 5000
      });
      setShowSecretCode(false);
      setSecretInput("");
      window.location.reload();
    } else {
      toast.error("Código incorrecto");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24 md:pb-6" style={{ backgroundColor: "#050505" }}>
      <PageContainer>
        <motion.div 
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div 
            className="w-16 h-16 mx-auto mb-2 cursor-pointer"
            onClick={handleSecretTap}
            style={{ filter: `drop-shadow(0 0 20px ${GOLD}30)` }}
          >
            <img 
              src={logoSistemicar} 
              alt="SISTEMICAR" 
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-xs uppercase tracking-widest" style={{ color: SPECTRUM.VIOLETA }}>
            Centro de Comando
          </p>
        </motion.div>

        {/* Modal código secreto */}
        <AnimatePresence>
          {showSecretCode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setShowSecretCode(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="w-full max-w-sm p-6 rounded-2xl border"
                style={{ backgroundColor: "#0a0a0a", borderColor: `${GOLD}40` }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-center mb-4" style={{ color: GOLD }}>
                  CÓDIGO DE PROPIETARIO
                </h3>
                <input
                  type="password"
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  placeholder="Ingresa el código"
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-center mb-4"
                  autoFocus
                />
                <button
                  onClick={handleSecretCode}
                  className="w-full py-3 rounded-xl font-bold text-black"
                  style={{ backgroundColor: GOLD }}
                >
                  ACTIVAR
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="lg:grid lg:grid-cols-[minmax(260px,340px)_1fr] lg:gap-8 lg:items-start">
          <div className="space-y-6">
        {isFirebaseConfigured() && isAnonymous && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl border-2"
            style={{ 
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              borderColor: "#3b82f6",
              boxShadow: "0 0 30px rgba(59, 130, 246, 0.3)"
            }}
          >
            <div className="text-center">
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(59, 130, 246, 0.3)" }}
              >
                <LogIn size={32} className="text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Accede con tu Cuenta</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Inicia sesión con Google para ver todos tus puntos y progreso
              </p>
              <button
                onClick={handleLinkGoogle}
                disabled={linking}
                className="w-full py-4 px-6 rounded-xl text-white text-lg font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                style={{ 
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4)"
                }}
                data-testid="button-login-google-main"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {linking ? "Conectando..." : "Entrar con Google"}
              </button>
            </div>
          </motion.div>
        )}

        {isFirebaseConfigured() && !isAnonymous && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl border"
            style={{ 
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              borderColor: "rgba(34, 197, 94, 0.3)"
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(34, 197, 94, 0.2)" }}
                >
                  <User size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-400">
                    CUENTA VINCULADA
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {userEmail || "Google conectado"}
                  </p>
                </div>
              </div>
              {(
                <div className="flex gap-2">
                  <button
                    onClick={handleMigrateToGoogle}
                    disabled={migrating}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    data-testid="button-migrate-google"
                    title="Migrar datos a cuenta Google pura"
                  >
                    <Flame size={12} />
                    {migrating ? "..." : "Migrar"}
                  </button>
                  <button
                    onClick={async () => {
                      if (!user) return;
                      const { syncLocalDataToFirebase } = await import("@/lib/persistence");
                      const result = await syncLocalDataToFirebase(user.uid);
                      if (result.synced > 0) {
                        toast.success(`${result.synced} registros sincronizados`);
                      } else {
                        toast.info("No hay datos locales para sincronizar");
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-wider transition-all"
                    data-testid="button-sync-data"
                  >
                    <RefreshCw size={12} />
                    Sync
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {user?.uid && (
          <div>
            <StatusAlianza 
              progression={progression} 
              userId={user.uid}
              onRankUpgrade={() => {
                subscribeToProgression(
                  user.uid,
                  (prog) => setProgression(prog),
                  (err) => console.error(err)
                );
              }}
            />
          </div>
        )}

        {isOwner(userEmail) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl border"
            style={{
              backgroundColor: "rgba(212, 175, 55, 0.08)",
              borderColor: "rgba(212, 175, 55, 0.35)",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: GOLD }}>
              Panel creador
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => navigate("/admin-semillas")}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]"
                style={{ backgroundColor: GOLD, color: "#000" }}
                data-testid="menu-admin-semillas"
              >
                <Sprout size={16} />
                Taller de libros / Semillas
              </button>
              <button
                onClick={() => navigate("/admin-gilson")}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all hover:bg-white/5"
                style={{ borderColor: `${GOLD}40`, color: GOLD }}
                data-testid="menu-admin-gilson"
              >
                <Shield size={16} />
                Admin
              </button>
            </div>
          </motion.div>
        )}

        {/* Certificación de Manuales */}
        {certification && certification.manualsRead.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-3 rounded-xl border"
            style={{ 
              backgroundColor: "rgba(212, 175, 55, 0.05)",
              borderColor: "rgba(212, 175, 55, 0.2)"
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(212, 175, 55, 0.15)" }}
                >
                  <BookOpen size={16} style={{ color: GOLD }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: GOLD }}>
                    {CERTIFICATION_LEVELS[certification.certificationLevel]?.name || "Observador"}
                  </p>
                  <p className="text-[9px] text-zinc-500">
                    {certification.manualsRead.length}/5 manuales · {certification.totalChecklistCompleted} items completados
                  </p>
                </div>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: level <= certification.certificationLevel 
                        ? GOLD 
                        : "rgba(255,255,255,0.1)"
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

          </div>

          <div>
        {/* Grid principal del espectro - filtrado por tier */}
        {(() => {
          const menuItems = buildMenuItems(progression, userEmail);
          const tienePlanificacion =
            previewUnlocked ||
            hasPlanificacionBaseAccess(
              progression?.subscriptionPlan,
              userEmail,
              progression?.rank,
              progression?.activeModules
            );
          const showPreviewUnlock = isDeployPreviewHost() && !tienePlanificacion;

          return (
            <>
              {showPreviewUnlock && (
                <div
                  className="mb-4 p-4 rounded-xl border text-center"
                  style={{
                    backgroundColor: "rgba(212, 175, 55, 0.08)",
                    borderColor: "rgba(212, 175, 55, 0.35)",
                  }}
                  data-testid="preview-ops-banner"
                >
                  <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                    Este preview de Netlify no trae tu sesión de{" "}
                    <span style={{ color: GOLD }}>sistemicar.app</span>. Por eso no ves Jornada —
                    no es que falte construir.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewOpsUnlocked(true);
                      setPreviewUnlocked(true);
                      toast.success("Jornada desbloqueada en este preview", {
                        description: "Entra a Jornada o Jornada V3 para probar.",
                        style: {
                          backgroundColor: "#0a0a0a",
                          border: "1px solid #D4AF37",
                          color: "#D4AF37",
                        },
                      });
                    }}
                    className="w-full py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: GOLD, color: "#000" }}
                    data-testid="button-preview-unlock-jornada"
                  >
                    Desbloquear Jornada en este preview
                  </button>
                </div>
              )}
              {previewUnlocked && isDeployPreviewHost() && (
                <p
                  className="mb-3 text-center text-[9px] uppercase tracking-wider"
                  style={{ color: GOLD }}
                  data-testid="preview-ops-active"
                >
                  Preview ops activo · sesión de prueba
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {menuItems.map((item, i) => (
                  <motion.button
                    key={item.id}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => item.id !== "proximo" && navigate(item.route)}
                    onPointerEnter={() => {
                      if (
                        item.id === "planificacion" ||
                        item.id === "jornada-v3" ||
                        item.route === "/planeacion" ||
                        item.route === JORNADA_V3_PATH
                      ) {
                        prefetchJornadaChunk();
                      }
                    }}
                    className={`group relative p-4 rounded-xl border text-center transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] ${item.enCamino ? "opacity-80" : ""}`}
                    style={{ 
                      backgroundColor: "#0a0a0a",
                      borderColor: `${item.color}25`,
                      boxShadow: `0 0 20px ${item.color}15`,
                      cursor: item.id === "proximo" ? "default" : "pointer",
                    }}
                    data-testid={`menu-${item.id}`}
                  >
                    {item.enCamino && (
                      <span className="absolute top-1.5 right-1.5 text-[6px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full z-20" style={{ backgroundColor: "rgba(100,116,139,0.3)", color: "#94a3b8" }}>
                        En camino
                      </span>
                    )}
                    <div 
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ 
                        background: `radial-gradient(circle at center, ${item.color}20 0%, transparent 70%)`,
                        boxShadow: `inset 0 0 30px ${item.color}10`
                      }}
                    />
                    <div className="relative z-10">
                      <item.icon 
                        size={22} 
                        strokeWidth={1.2}
                        className="mx-auto mb-2"
                        style={{ color: item.color }}
                      />
                      <h3 
                        className="text-[11px] font-bold tracking-wide mb-0.5"
                        style={{ color: item.color }}
                      >
                        {item.title}
                      </h3>
                      <p className="text-[9px] text-slate-500 leading-tight">
                        {item.subtitle}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {!tienePlanificacion && (
                <div className="mt-4 text-center">
                  <Link href="/pagos">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all hover:scale-[1.02]" style={{ borderColor: `${GOLD}40`, color: GOLD }}>
                      <CreditCard size={12} />
                      Ver módulos y precios
                    </span>
                  </Link>
                </div>
              )}
            </>
          );
        })()}

        {/* Acceso a Registros - todos los usuarios */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="mt-3 flex justify-center"
        >
          <button
            onClick={() => navigate("/registros")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors border border-white/6"
            style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
            data-testid="menu-registros"
          >
            <Database size={14} strokeWidth={1.2} className="text-slate-500" />
            <span className="text-[10px] text-slate-500">Mis Registros</span>
          </button>
        </motion.div>

        {/* Items secundarios */}
        {user && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 flex justify-center gap-3"
          >
            {secondaryItems.filter(i => i.id !== "registros").map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.route)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                data-testid={`menu-secondary-${item.id}`}
              >
                <item.icon size={16} strokeWidth={1.2} className="text-slate-500" />
                <span className="text-[8px] text-slate-500">{item.title}</span>
              </button>
            ))}
          </motion.div>
        )}

        {/* Historias de Guerreros - Códices del usuario */}
        {codices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-4 rounded-2xl border"
            style={{ backgroundColor: "rgba(212, 175, 55, 0.05)", borderColor: "rgba(212, 175, 55, 0.2)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield size={16} style={{ color: GOLD }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                  Historias de Guerreros
                </span>
              </div>
              <span className="text-[10px] text-slate-500">{codices.length} alquimias</span>
            </div>
            
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={codiceActual}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 rounded-xl cursor-pointer hover:bg-black/50 transition-colors"
                  style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                  onClick={() => setCodiceExpandido(codices[codiceActual])}
                >
                  <Quote size={14} className="mb-2 opacity-40" style={{ color: GOLD }} />
                  <p className="text-xs text-slate-300 leading-relaxed mb-3 italic line-clamp-3">
                    "{codices[codiceActual]?.contenido}"
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px]">
                      <span className="font-bold uppercase" style={{ color: GOLD }}>
                        {codices[codiceActual]?.titulo}
                      </span>
                      <span className="text-slate-500 ml-2">
                        • {codices[codiceActual]?.nivel}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-600">
                      {codices[codiceActual]?.createdAt?.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[9px] text-center mt-2" style={{ color: GOLD }}>Toca para ver completo</p>
                </motion.div>
              </AnimatePresence>
              
              {codices.length > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={() => setCodiceActual((prev) => (prev - 1 + codices.length) % codices.length)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    data-testid="button-codice-prev"
                  >
                    <ChevronLeft size={16} className="text-slate-400" />
                  </button>
                  <div className="flex gap-1">
                    {codices.slice(0, 5).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCodiceActual(idx)}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{ 
                          backgroundColor: idx === codiceActual ? GOLD : "rgba(255,255,255,0.2)"
                        }}
                      />
                    ))}
                    {codices.length > 5 && (
                      <span className="text-[9px] text-slate-500 ml-1">+{codices.length - 5}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setCodiceActual((prev) => (prev + 1) % codices.length)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    data-testid="button-codice-next"
                  >
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={() => navigate("/alquimia")}
              className="mt-3 w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:bg-amber-900/30"
              style={{ color: GOLD, backgroundColor: "rgba(212, 175, 55, 0.1)" }}
              data-testid="button-ir-alquimia"
            >
              + Nueva Alquimia
            </button>
          </motion.div>
        )}

        {/* Acciones rápidas */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-6 flex gap-2"
        >
          <button
            onClick={() => setShowResumenDiario(true)}
            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all hover:scale-[1.02]"
            style={{ 
              backgroundColor: "rgba(139, 92, 246, 0.1)", 
              border: "1px solid rgba(139, 92, 246, 0.25)",
              color: SPECTRUM.VIOLETA
            }}
            data-testid="button-cerrar-jornada"
          >
            <Moon size={16} strokeWidth={1.2} />
            CERRAR JORNADA
          </button>
          <button
            onClick={() => setShowDataStatus(true)}
            className="p-3 rounded-xl transition-all hover:bg-white/5"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}
            data-testid="menu-data-status"
          >
            <Database size={16} strokeWidth={1.2} className="text-slate-500" />
          </button>
        </motion.div>

        <DataStatusPanel isOpen={showDataStatus} onClose={() => setShowDataStatus(false)} />

        <button
          onClick={handleReset}
          disabled={resetting}
          className="mt-4 w-full py-2 flex items-center justify-center gap-2 text-[10px] text-slate-600 hover:text-red-400 transition-colors"
        >
          <RotateCcw size={12} className={resetting ? "animate-spin" : ""} />
          {resetting ? "Reiniciando..." : "Reiniciar Datos"}
        </button>

      <div className="mt-12 mb-6 border-t border-zinc-800 pt-6">
        <div className="flex items-center justify-center gap-6 text-[10px] text-zinc-600">
          <Link href="/terminos-condiciones">
            <span className="flex items-center gap-1 hover:text-zinc-400 transition-colors cursor-pointer">
              <Scale size={10} />
              Términos y Condiciones
            </span>
          </Link>
          <span className="text-zinc-700">•</span>
          <Link href="/libro-reclamaciones">
            <span className="flex items-center gap-1 hover:text-zinc-400 transition-colors cursor-pointer">
              <FileText size={10} />
              Libro de Reclamaciones
            </span>
          </Link>
        </div>
        <p className="text-center text-[9px] text-zinc-700 mt-2">
          SISTEMICAR © 2026 • Lima, Perú
        </p>
      </div>

          </div>
        </div>
      </PageContainer>

      {/* Barra de navegación flotante — solo móvil (desktop usa sidebar) */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        className="md:hidden fixed bottom-4 left-4 right-4 mx-auto max-w-md z-40"
      >
        <div
          className="flex justify-around items-center py-3 px-4 rounded-2xl backdrop-blur-xl"
          style={{
            backgroundColor: "rgba(10, 10, 10, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
          }}
        >
          {(() => {
            const accessArgs = [progression?.subscriptionPlan, userEmail, progression?.rank, progression?.activeModules] as const;
            const navItems = [
              { icon: Eye, color: SPECTRUM.ROJO, route: "/espejo", label: "Espejo" },
              ...(hasPlanificacionBaseAccess(...accessArgs)
                ? [{ icon: Heart, color: SPECTRUM.VERDE, route: "/planeacion", label: JORNADA_MODULE.title }]
                : [{ icon: CreditCard, color: GOLD, route: "/pagos", label: "Módulos" }]),
              ...(hasSoberaniaDiaAccess(...accessArgs)
                ? [{ icon: Layers, color: "#38BDF8", route: "/proyectos", label: "Proyectos" }]
                : []),
            ];

            return navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all hover:bg-white/5"
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon size={20} strokeWidth={1.2} style={{ color: item.color }} />
                <span className="text-[9px]" style={{ color: item.color }}>
                  {item.label}
                </span>
              </button>
            ));
          })()}
        </div>
      </motion.div>

      {user?.uid && (
        <>
          <ResumenDiario 
            isOpen={showResumenDiario} 
            onClose={() => setShowResumenDiario(false)} 
            userId={user.uid} 
          />
          <TooltipOrientacion inactivityMs={120000} />
          <Onboarding 
            isOpen={showOnboarding} 
            onComplete={handleOnboardingComplete} 
          />
        </>
      )}

      <AnimatePresence>
        {codiceExpandido && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setCodiceExpandido(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg p-6 rounded-2xl border max-h-[80vh] overflow-y-auto"
              style={{ backgroundColor: "#0a0a0a", borderColor: `${GOLD}40` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield size={20} style={{ color: GOLD }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                    {codiceExpandido.categoria}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {codiceExpandido.createdAt?.toLocaleDateString()}
                </span>
              </div>
              
              <h2 className="text-xl font-black mb-4" style={{ color: GOLD }}>
                {codiceExpandido.titulo}
              </h2>
              
              <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: "rgba(212, 175, 55, 0.05)" }}>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {codiceExpandido.contenido}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-4">
                <span>Nivel: <span style={{ color: GOLD }}>{codiceExpandido.nivel}</span></span>
                <div className="flex gap-3">
                  <span>E:{codiceExpandido.ejes.enfoque}</span>
                  <span>C:{codiceExpandido.ejes.conflicto}</span>
                  <span>P:{codiceExpandido.ejes.pasos}</span>
                  <span>A:{codiceExpandido.ejes.alcance}</span>
                </div>
              </div>
              
              <button
                onClick={() => setCodiceExpandido(null)}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
                style={{ backgroundColor: GOLD, color: "#000" }}
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
