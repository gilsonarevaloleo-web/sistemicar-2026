import { Switch, Route, Redirect, useLocation } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "./components/layout";
import { createContext, useContext, useState, useEffect, useMemo, type ReactNode, Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { JornadaShell } from "@/components/jornada/JornadaShell";
import { JornadaV3SuspenseFallback } from "@/components/jornada/JornadaV3SuspenseFallback";
import { JornadaErrorBoundary } from "@/components/jornada/JornadaErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToProgression, UserProgression, verificarAccesoProspecto, registrarActividadProspecto, hasPlanificacionBaseAccess, hasSoberaniaDiaAccess, hasOperativoAccess, hasUmbralAccess } from "@/lib/persistence";
import {
  consumePreviewOpsQueryUnlock,
  isPreviewOpsUnlocked,
} from "@/lib/previewOps";
import type { ModuleId } from "@shared/moduleAccess";

interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

import MenuPrincipal from "@/pages/menu-principal";
import Tutorial from "@/pages/tutorial";
import Console from "@/pages/console";
const JornadaV4 = lazyWithRetry(() => import("@/pages/jornadaV4"));
import Esperanza from "@/pages/esperanza";
import Rewards from "@/pages/rewards";
import Analytics from "@/pages/analytics";
import Acerca from "@/pages/acerca";
import Pagos from "@/pages/pagos";
import Socios from "@/pages/socios";
import AdminGilson from "@/pages/admin-gilson";
import Historial from "@/pages/historial";
import Alquimia from "@/pages/alquimia";
import Bienvenida from "@/pages/bienvenida";
import Radar from "@/pages/radar";
import Historia from "@/pages/historia";
import Codice from "@/pages/codice";
import Escaner from "@/pages/escaner";
import CamaraInmunidad from "@/pages/camara-inmunidad";
import ComoFunciona from "@/pages/como-funciona";
import Umbral from "@/pages/umbral";
import UmbralV2 from "@/pages/umbral-v2";
import UmbralMetricas from "@/pages/umbral-metricas";
import UmbralEntrada from "@/pages/umbral-entrada";
import Proyector from "@/pages/proyector";
import Proyectos from "@/pages/proyectos";
import TerminosCondiciones from "@/pages/terminos-condiciones";
import LibroReclamaciones from "@/pages/libro-reclamaciones";
import EmbudoSistemicar from "@/pages/embudo-sistemicar";
import Acceso from "@/pages/acceso";
import Documentos from "@/pages/documentos";
import Espejo from "@/pages/espejo";
import EspejoV2 from "@/pages/espejo-v2";
import EspejoExpedientes from "@/pages/espejo-expedientes";
import EspejoExpedienteDetalle from "@/pages/espejo-expediente-detalle";
import GraciasCompra from "@/pages/gracias-compra";
import UmbralLeads from "@/pages/umbral-leads";
import VentasEspejo from "@/pages/ventas-espejo";
import VentasJornada from "@/pages/ventas-jornada";
import MetricasDocumento from "@/pages/metricas-documento";
import MapaSistemicar from "@/pages/mapa-sistemicar";
import VendedoresPlanificacion from "@/pages/vendedores-planificacion";
import VendedorTriagePage from "@/pages/vendedor";
import { SellerRefCapture } from "./components/seller-ref-capture";
import Manuales from "@/pages/manuales";
import AdminSemillas from "@/pages/admin-semillas";
import Registros from "@/pages/registros";
import ApiCheckout from "@/pages/api-checkout";
import ApiDocs from "@/pages/api-docs";
import NotFound from "@/pages/not-found";
import { CierreJornadaModal } from "@/components/cierre-jornada-modal";
import { SegmentAttentionBackground } from "@/components/SegmentAttentionBackground";
import { ViewTransitionBootstrap } from "@/components/ViewTransitionBootstrap";
import { CentinelaEngine } from "@/components/centinela-engine";
import { useSovereigntyToast } from "@/components/sovereignty-toast";
import { DoctorIAChat } from "@/components/doctor-ia-chat";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { runStartupStorageHygiene } from "@/lib/storageHygiene";
import { unlockSpeechSynthesis } from "@/lib/speechQueue";
import { hardResetSpeechSystems, installSpeechStuckWatchdog } from "@/lib/speechRecovery";
import { ensureUbicacionVoiceRetryHub, retryAllPendingUbicacionVoice } from "@/lib/ubicacionVoiceReliable";
import { installVoiceLifecycleHub } from "@/lib/voiceLifecycle";
import {
  isCommercialEntryPath,
  isJornada4WindowPath,
  JORNADA_V4_PATH,
} from "@/lib/jornadaBrand";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuthContext = () => useContext(AuthContext);

function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, login, logout } = useAuth();
  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuthContext();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/bienvenida");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#020202" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Cargando SISTEMICAR...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <Component />;
}

// Email del owner que siempre tiene acceso completo
const OWNER_EMAIL = "gilsonarevalo.leo@gmail.com";

const isOwnerEmail = (email: string | null | undefined): boolean => {
  return email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
};

// Ruta protegida por módulo activo (Planificación modular)
function ModuleRoute({
  component: Component,
  requiredModule,
  loadingFallback,
}: {
  component: React.ComponentType;
  requiredModule: ModuleId;
  loadingFallback?: ReactNode;
}) {
  const { user, loading } = useAuthContext();
  const [, navigate] = useLocation();
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [checkingTier, setCheckingTier] = useState(true);
  const [previewOps, setPreviewOps] = useState(() => isPreviewOpsUnlocked());

  const ownerBypass = isOwnerEmail(user?.email);
  const previewBypass = previewOps || isPreviewOpsUnlocked();

  useEffect(() => {
    const sync = () => setPreviewOps(isPreviewOpsUnlocked());
    sync();
    window.addEventListener("sistemicar-preview-ops", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sistemicar-preview-ops", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const hasAccess = (prog: UserProgression | null): boolean => {
    if (ownerBypass || previewBypass || isPreviewOpsUnlocked()) return true;
    const args = [prog?.subscriptionPlan, user?.email, prog?.rank, prog?.activeModules] as const;
    if (requiredModule === "planificacion_base") return hasPlanificacionBaseAccess(...args);
    if (requiredModule === "operativo") return hasOperativoAccess(...args);
    if (requiredModule === "soberania_dia") return hasSoberaniaDiaAccess(...args);
    if (requiredModule === "umbral") return hasUmbralAccess(...args);
    return false;
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/bienvenida");
      return;
    }

    if (ownerBypass || previewBypass || isPreviewOpsUnlocked()) {
      setCheckingTier(false);
      return;
    }

    if (user?.uid) {
      const unsub = subscribeToProgression(
        user.uid,
        (prog) => {
          setProgression(prog);
          setCheckingTier(false);
          if (!isPreviewOpsUnlocked() && !hasAccess(prog)) {
            navigate(
              requiredModule === "umbral" ? "/pagos?plan=umbral" : "/pagos",
            );
          }
        },
        () => {
          setCheckingTier(false);
          if (!ownerBypass && !isPreviewOpsUnlocked()) {
            navigate(
              requiredModule === "umbral" ? "/pagos?plan=umbral" : "/pagos",
            );
          }
        }
      );
      return () => unsub();
    }
  }, [user, loading, navigate, ownerBypass, previewBypass, requiredModule, previewOps]);

  useEffect(() => {
    if (!checkingTier) return;
    const id = window.setTimeout(() => setCheckingTier(false), 8000);
    return () => clearTimeout(id);
  }, [checkingTier]);

  const tierLoadingUi = loadingFallback ?? (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#020202" }}>
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Verificando acceso...</p>
      </div>
    </div>
  );

  if ((ownerBypass || previewBypass || isPreviewOpsUnlocked()) && !loading && user) {
    return <Component />;
  }

  if (loading || checkingTier) {
    return tierLoadingUi;
  }

  if (!user || !hasAccess(progression)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#020202" }}>
        <p className="text-sm text-slate-500">Redirigiendo…</p>
      </div>
    );
  }

  return <Component />;
}

/** @deprecated Usar ModuleRoute con módulo específico */
function ArquitectoRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuthContext();
  const [, navigate] = useLocation();
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [checkingTier, setCheckingTier] = useState(true);
  
  // El owner siempre tiene acceso
  const ownerBypass = isOwnerEmail(user?.email);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/bienvenida");
      return;
    }
    
    // Si es owner, dar acceso inmediato sin verificar nada
    if (ownerBypass) {
      setCheckingTier(false);
      return;
    }
    
    if (user?.uid) {
      const unsub = subscribeToProgression(
        user.uid,
        (prog) => {
          setProgression(prog);
          setCheckingTier(false);
          // Redirigir si no es arquitecto (pero owner siempre pasa)
          if (prog.rank !== "arquitecto" && !isOwnerEmail(user.email)) {
            navigate("/menu");
          }
        },
        () => {
          // En caso de error, solo redirigir si NO es owner
          setCheckingTier(false);
          if (!isOwnerEmail(user?.email)) {
            navigate("/menu");
          }
        }
      );
      return () => unsub();
    }
  }, [user, loading, navigate, ownerBypass]);

  // Owner siempre tiene acceso inmediato
  if (ownerBypass && !loading) {
    return <Component />;
  }

  if (loading || checkingTier) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#020202" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Owner bypass: siempre tiene acceso
  if (ownerBypass) {
    return <Component />;
  }

  if (!user || progression?.rank !== "arquitecto") return null;

  return <Component />;
}

function JornadaV4ModuleRoute() {
  return (
    <JornadaErrorBoundary>
      <Suspense fallback={<JornadaV3SuspenseFallback />}>
        <ModuleRoute
          component={JornadaV4}
          requiredModule="planificacion_base"
          loadingFallback={<JornadaShell statusLine="Dual Kernel · verificando acceso…" />}
        />
      </Suspense>
    </JornadaErrorBoundary>
  );
}

function Router() {
  const [location] = useLocation();
  // Embudos comerciales sin chrome de app (sidebar / bottom nav).
  if (location === "/vendedor" || location.startsWith("/vendedor/")) {
    return (
      <>
        <SellerRefCapture />
        <VendedorTriagePage />
      </>
    );
  }
  if (location === "/ventas-jornada" || location.startsWith("/ventas-jornada")) {
    return (
      <>
        <SellerRefCapture />
        <VentasJornada />
      </>
    );
  }

  return (
    <Layout>
      <ViewTransitionBootstrap />
      <SellerRefCapture />
      <Switch>
        <Route path="/menu">
          <ProtectedRoute component={MenuPrincipal} />
        </Route>
        <Route path="/tutorial">
          <ProtectedRoute component={Tutorial} />
        </Route>
        <Route path="/console">
          {() => { window.location.replace("/espejo"); return null; }}
        </Route>
        <Route path="/planeacion">
          <Redirect to={JORNADA_V4_PATH} />
        </Route>
        <Route path="/jornada-v3">
          <Redirect to={JORNADA_V4_PATH} />
        </Route>
        <Route path="/planeacion-v3">
          <Redirect to={JORNADA_V4_PATH} />
        </Route>
        <Route path="/jornada-v4">
          <JornadaV4ModuleRoute />
        </Route>
        <Route path="/proyectos">
          <ModuleRoute component={Proyectos} requiredModule="soberania_dia" />
        </Route>
        <Route path="/esperanza">
          <ProtectedRoute component={Esperanza} />
        </Route>
        <Route path="/rewards">
          <ProtectedRoute component={Rewards} />
        </Route>
        <Route path="/analytics">
          <ProtectedRoute component={Analytics} />
        </Route>
        <Route path="/acerca">
          <ProtectedRoute component={Acerca} />
        </Route>
        <Route path="/pagos" component={Pagos} />
        <Route path="/socios">
          <ProtectedRoute component={Socios} />
        </Route>
        <Route path="/admin-gilson">
          <ProtectedRoute component={AdminGilson} />
        </Route>
        <Route path="/admin-semillas">
          <ProtectedRoute component={AdminSemillas} />
        </Route>
        <Route path="/manifiesto">
          <Redirect to="/acerca" />
        </Route>
        <Route path="/historial" component={Historial} />
        <Route path="/alquimia">
          <ProtectedRoute component={Alquimia} />
        </Route>
        <Route path="/radar">
          <ProtectedRoute component={Radar} />
        </Route>
        <Route path="/historia">
          <ProtectedRoute component={Historia} />
        </Route>
        <Route path="/codice">
          <ProtectedRoute component={Codice} />
        </Route>
        <Route path="/escaner">
          <ProtectedRoute component={Escaner} />
        </Route>
        <Route path="/inmunidad">
          <ProtectedRoute component={CamaraInmunidad} />
        </Route>
        <Route path="/como-funciona">
          <ProtectedRoute component={ComoFunciona} />
        </Route>
        <Route path="/manuales">
          <ProtectedRoute component={Manuales} />
        </Route>
        <Route path="/umbral/entrada" component={UmbralEntrada} />
        <Route path="/umbral/v2">
          <ProtectedRoute component={UmbralV2} />
        </Route>
        <Route path="/umbral/metricas">
          <ModuleRoute component={UmbralMetricas} requiredModule="umbral" />
        </Route>
        <Route path="/umbral">
          <ProtectedRoute component={Umbral} />
        </Route>
        <Route path="/proyector">
          <ProtectedRoute component={Proyector} />
        </Route>
        <Route path="/bienvenida" component={Bienvenida} />
        <Route path="/acceso" component={Acceso} />
        <Route path="/terminos-condiciones" component={TerminosCondiciones} />
        <Route path="/libro-reclamaciones" component={LibroReclamaciones} />
        <Route path="/embudo" component={EmbudoSistemicar} />
        <Route path="/documentos" component={Documentos} />
        <Route path="/vendedores-planificacion" component={VendedoresPlanificacion} />
        <Route path="/espejo/v2" component={EspejoV2} />
        <Route path="/espejo" component={Espejo} />
        <Route path="/espejo/expedientes/:id" component={EspejoExpedienteDetalle} />
        <Route path="/espejo/expedientes" component={EspejoExpedientes} />
        <Route path="/gracias-compra" component={GraciasCompra} />
        <Route path="/umbral-leads" component={UmbralLeads} />
        <Route path="/ventas-espejo" component={VentasEspejo} />
        <Route path="/metricas">
          <ProtectedRoute component={MetricasDocumento} />
        </Route>
        <Route path="/mapa">
          <ProtectedRoute component={MapaSistemicar} />
        </Route>
        <Route path="/registros">
          <ProtectedRoute component={Registros} />
        </Route>
        <Route path="/api-checkout" component={ApiCheckout} />
        <Route path="/api-docs" component={ApiDocs} />
        <Route path="/">
          <Redirect to="/menu" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function SovereigntyListener() {
  useSovereigntyToast();
  return null;
}

function VoiceBootstrap() {
  useEffect(() => {
    const stopLifecycle = installVoiceLifecycleHub();
    ensureUbicacionVoiceRetryHub();
    const stopWatchdog = installSpeechStuckWatchdog();
    /** Una sola vez: unlock TTS en gesto; Dual Kernel / Hub no lo necesitan. */
    let unlocked = false;
    const detachUnlockListeners = () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
    };
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return true;
      }
      return !!target.closest("input, textarea, [contenteditable='true'], [role='textbox']");
    };
    const isVoiceQuietPath = (): boolean => {
      if (isJornada4WindowPath()) return true;
      const p = window.location.pathname;
      // Hub de proyectos + Centro de Comando: sin TTS en el primer toque
      // (el unlock robaba el hilo y las tarjetas no abrían).
      // /vendedor y entradas comerciales: mismo problema en Android.
      // /umbral/*: misma robada en consola V2 (modos, códigos, links).
      return (
        p === "/proyectos" ||
        p.startsWith("/proyectos/") ||
        p === "/menu" ||
        p.startsWith("/menu/") ||
        p === "/vendedor" ||
        p.startsWith("/vendedor/") ||
        p === "/ventas-jornada" ||
        p.startsWith("/ventas-jornada") ||
        p === "/umbral" ||
        p.startsWith("/umbral/") ||
        p === "/pagos" ||
        p.startsWith("/pagos")
      );
    };
    const unlock = (e: Event) => {
      // Dual Kernel + Hub /proyectos + /menu: sin unlock TTS en el gesto.
      if (isVoiceQuietPath()) return;
      // Otros forms: no despertar voz al tipar.
      if (isTypingTarget(e.target)) return;
      if (unlocked) return;
      unlocked = true;
      detachUnlockListeners();
      unlockSpeechSynthesis(true);
      // Reintentos de puerta fuera del gesto crítico.
      window.setTimeout(() => {
        retryAllPendingUbicacionVoice();
      }, 0);
    };
    const onRecoveryShortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        hardResetSpeechSystems(true);
      }
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    window.addEventListener("keydown", onRecoveryShortcut, { capture: true });
    return () => {
      stopLifecycle();
      stopWatchdog();
      detachUnlockListeners();
      window.removeEventListener("keydown", onRecoveryShortcut, { capture: true });
    };
  }, []);
  return null;
}

/** Landings de anuncio: sin voz, Centinela ni cierre — el primer toque debe navegar. */
function AppShellMotors() {
  const [location] = useLocation();
  if (isCommercialEntryPath(location) || isCommercialEntryPath(window.location.pathname)) {
    return null;
  }
  return (
    <>
      <DoctorIAChat />
      <CierreJornadaModal />
      <SovereigntyListener />
      <VoiceBootstrap />
      <SegmentAttentionBackground />
      <CentinelaEngine />
    </>
  );
}

function App() {
  useEffect(() => {
    // Deploy preview: ?preview_ops=1 desbloquea ANTES de que ModuleRoute mande a /pagos.
    if (consumePreviewOpsQueryUnlock()) {
      if (window.location.pathname === "/menu" || window.location.pathname === "/") {
        window.location.replace(JORNADA_V4_PATH);
        return;
      }
    }
    if (isCommercialEntryPath(window.location.pathname)) return;
    const report = runStartupStorageHygiene();
    if (report && report.removedKeys > 0) {
      console.info(`[storage] Poda al inicio: ${report.removedKeys} claves (~${Math.round(report.freedBytesEstimate / 1024)} KB)`);
    }
  }, []);

  return (
    <AuthProvider>
      <AppErrorBoundary>
        <Router />
      </AppErrorBoundary>
      <AppShellMotors />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
