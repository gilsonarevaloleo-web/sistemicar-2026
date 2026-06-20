import { Switch, Route, Redirect, useLocation } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "./components/layout";
import { createContext, useContext, useState, useEffect, useMemo, ReactNode, lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToProgression, UserProgression, verificarAccesoProspecto, registrarActividadProspecto, hasPlanificacionBaseAccess, hasSoberaniaDiaAccess } from "@/lib/persistence";
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
const Planeacion = lazy(() => import("@/pages/planeacion"));
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
import Proyector from "@/pages/proyector";
import Proyectos from "@/pages/proyectos";
import TerminosCondiciones from "@/pages/terminos-condiciones";
import LibroReclamaciones from "@/pages/libro-reclamaciones";
import EmbudoSistemicar from "@/pages/embudo-sistemicar";
import Acceso from "@/pages/acceso";
import Documentos from "@/pages/documentos";
import Espejo from "@/pages/espejo";
import EspejoExpedientes from "@/pages/espejo-expedientes";
import EspejoExpedienteDetalle from "@/pages/espejo-expediente-detalle";
import GraciasCompra from "@/pages/gracias-compra";
import UmbralLeads from "@/pages/umbral-leads";
import VentasEspejo from "@/pages/ventas-espejo";
import MetricasDocumento from "@/pages/metricas-documento";
import MapaSistemicar from "@/pages/mapa-sistemicar";
import VendedoresPlanificacion from "@/pages/vendedores-planificacion";
import { SellerRefCapture } from "./components/seller-ref-capture";
import Manuales from "@/pages/manuales";
import AdminSemillas from "@/pages/admin-semillas";
import Registros from "@/pages/registros";
import ApiCheckout from "@/pages/api-checkout";
import ApiDocs from "@/pages/api-docs";
import NotFound from "@/pages/not-found";
import { CierreJornadaModal } from "@/components/cierre-jornada-modal";
import { SegmentAttentionBackground } from "@/components/SegmentAttentionBackground";
import { CentinelaEngine } from "@/components/centinela-engine";
import { useSovereigntyToast } from "@/components/sovereignty-toast";
import { DoctorIAChat } from "@/components/doctor-ia-chat";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { runStartupStorageHygiene } from "@/lib/storageHygiene";
import { unlockSpeechSynthesis } from "@/lib/speechQueue";
import { hardResetSpeechSystems, installSpeechStuckWatchdog } from "@/lib/speechRecovery";
import { ensureUbicacionVoiceRetryHub, retryAllPendingUbicacionVoice } from "@/lib/ubicacionVoiceReliable";

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
}: {
  component: React.ComponentType;
  requiredModule: ModuleId;
}) {
  const { user, loading } = useAuthContext();
  const [, navigate] = useLocation();
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [checkingTier, setCheckingTier] = useState(true);

  const ownerBypass = isOwnerEmail(user?.email);

  const hasAccess = (prog: UserProgression | null): boolean => {
    if (ownerBypass) return true;
    const args = [prog?.subscriptionPlan, user?.email, prog?.rank, prog?.activeModules] as const;
    if (requiredModule === "planificacion_base") return hasPlanificacionBaseAccess(...args);
    if (requiredModule === "soberania_dia") return hasSoberaniaDiaAccess(...args);
    return false;
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/bienvenida");
      return;
    }

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
          if (!hasAccess(prog)) {
            navigate("/pagos");
          }
        },
        () => {
          setCheckingTier(false);
          if (!ownerBypass) navigate("/pagos");
        }
      );
      return () => unsub();
    }
  }, [user, loading, navigate, ownerBypass, requiredModule]);

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

function Router() {
  return (
    <Layout>
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
          <Suspense
            fallback={(
              <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#020202" }}>
                <div className="text-center">
                  <div className="w-12 h-12 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400 text-sm">Cargando Jornada…</p>
                </div>
              </div>
            )}
          >
            <ModuleRoute component={Planeacion} requiredModule="planificacion_base" />
          </Suspense>
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
    ensureUbicacionVoiceRetryHub();
    const stopWatchdog = installSpeechStuckWatchdog();
    const unlock = () => {
      unlockSpeechSynthesis(true);
      retryAllPendingUbicacionVoice();
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
      stopWatchdog();
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      window.removeEventListener("keydown", onRecoveryShortcut, { capture: true });
    };
  }, []);
  return null;
}

function App() {
  useEffect(() => {
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
      <DoctorIAChat />
      <CierreJornadaModal />
      <SovereigntyListener />
      <VoiceBootstrap />
      <SegmentAttentionBackground />
      <CentinelaEngine />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
