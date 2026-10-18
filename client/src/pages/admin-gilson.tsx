import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, CheckCircle, Crown, Zap, Eye, EyeOff, RefreshCw, DollarSign, AlertTriangle, Database, ArrowRight, FlaskConical, Star, Trash2, Brain, Dna, X, Sprout } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { findAccountsWithData, grantModulesToUid, migrateDataToNewUid, modulesGrantedByPlan, subscribeToPrincipiosMaestros, addPrincipioMaestro, deletePrincipioMaestro, PrincipioMaestro, subscribeToEnergyLogs, EnergyLog, subscribeToVehicles, Vehicle, subscribeToGenomeLaws, saveGenomeLaw, updateGenomeLawStatus, deleteGenomeLaw, GenomeLaw, getAllProspectos, countAccountCollections } from "@/lib/persistence";
import { RECOVERY_FEATURE_LABELS, type RecoveryFeature } from "@shared/userDataCollections";
import { useAuthContext } from "@/App";
import { isOwner } from "@/lib/owner";
import { auth, getUserEmail, isFirebaseConfigured, isUserAnonymous, signInWithGoogle } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import { useDualKernelMotorsQuiet } from "@/lib/dualKernelQuiet";
import {
  buildClientAccountWhatsapp,
  displayNameForPlan,
  resolveClientAccountWhatsappKind,
} from "@shared/clientAccount";
import { gmailTypoCorrection } from "@shared/emailAliases";
import { explainFirebaseAdminError } from "@shared/firebaseServiceAccount";

const ADMIN_PASSWORD = "sistemicar2025";

interface User {
  id: string;
  username: string;
  email: string | null;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
}

interface Payment {
  id: string;
  userId: string;
  partnerId: string | null;
  plan: string;
  amount: string;
  commissionAmount: string | null;
  status: string;
  commissionPaidOut: number;
  createdAt: string;
}

const DEMO_USERS: User[] = [
  { id: "1", username: "usuario_demo", email: "demo@example.com", subscriptionPlan: "arquitecto", subscriptionStatus: "active", createdAt: new Date().toISOString() },
  { id: "2", username: "nuevo_usuario", email: "nuevo@example.com", subscriptionPlan: null, subscriptionStatus: "free", createdAt: new Date().toISOString() },
];

const DEMO_PAYMENTS: Payment[] = [
  { id: "1", userId: "1", partnerId: "partner1", plan: "arquitecto", amount: "24.99", commissionAmount: "7.50", status: "completed", commissionPaidOut: 0, createdAt: new Date().toISOString() },
];

interface AccountData {
  uid: string;
  totalCP: number;
  rank: string;
  lastUpdated: Date | null;
  activeModules?: string[];
  subscriptionPlan?: string | null;
  whatsapp?: string | null;
  email?: string;
  totalDocs?: number;
  sovereigntyPoints?: number;
  features?: Record<RecoveryFeature, number>;
}

type AdminUserLookup = {
  found: boolean;
  adminReady: boolean;
  parseError?: string | null;
  initError?: string | null;
  projectId?: string | null;
  suggestions?: Array<{ email: string; uid: string; reason: string }>;
  error?: string;
  uid?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string | null;
  providers?: string[];
  rank?: string;
  totalCP?: number;
  activeModules?: string[];
  subscriptionPlan?: string | null;
  whatsapp?: string | null;
};

const ADMIN_TABS = [
  "users",
  "payments",
  "recovery",
  "laboratorio",
  "adn",
  "creditos",
  "modulos",
  "vendedores",
] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

function tabFromUrl(): AdminTab {
  if (typeof window === "undefined") return "modulos";
  const raw = new URLSearchParams(window.location.search).get("tab");
  return raw && (ADMIN_TABS as readonly string[]).includes(raw)
    ? (raw as AdminTab)
    : "modulos";
}

function unlockAdminTouches(): void {
  if (typeof document === "undefined") return;
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
  document.body.style.pointerEvents = "";
  document.documentElement.style.pointerEvents = "";
}

const TAB_BTN =
  "relative z-20 min-h-11 px-4 py-2 rounded-lg text-sm font-bold transition touch-manipulation";

export default function AdminGilson() {
  const { user } = useAuthContext();
  const [, navigate] = useLocation();
  // Si venimos de Dual Kernel, diferir lab Firebase hasta el soft-start.
  const motorsQuiet = useDualKernelMotorsQuiet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>(tabFromUrl);
  const [loginLoading, setLoginLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [searchingAccounts, setSearchingAccounts] = useState(false);
  const [migratingUid, setMigratingUid] = useState<string | null>(null);
  const [inspectingUid, setInspectingUid] = useState<string | null>(null);
  const [recoveryQuery, setRecoveryQuery] = useState("");
  const [recoverySearchHint, setRecoverySearchHint] = useState<string | null>(null);
  const [googleLinking, setGoogleLinking] = useState(false);
  const [restoringHighest, setRestoringHighest] = useState(false);
  const [inventories, setInventories] = useState<Record<string, {
    features: Record<RecoveryFeature, number>;
    total: number;
  }>>({});
  const [grantingUid, setGrantingUid] = useState<string | null>(null);
  const [creditEmail, setCreditEmail] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditSearchResult, setCreditSearchResult] = useState<{ uid: string; email: string; rank: string; totalCP: number } | null>(null);
  const [creditSearching, setCreditSearching] = useState(false);
  const [creditSaving, setCreditSaving] = useState(false);
  const [principios, setPrincipios] = useState<PrincipioMaestro[]>([]);
  const [mineriaLoading, setMineriaLoading] = useState(false);
  const [mineriaResults, setMineriaResults] = useState<any[]>([]);
  const [doctorText, setDoctorText] = useState("");
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorResponse, setDoctorResponse] = useState<any>(null);
  const [labEnergyLogs, setLabEnergyLogs] = useState<EnergyLog[]>([]);
  const [labVehicles, setLabVehicles] = useState<Vehicle[]>([]);
  const [genomeLaws, setGenomeLaws] = useState<GenomeLaw[]>([]);
  const [adnText, setAdnText] = useState("");
  const [adnModulo, setAdnModulo] = useState("espejo");
  const [adnCategoria, setAdnCategoria] = useState("productividad");
  const [adnLoading, setAdnLoading] = useState(false);
  const [adnResult, setAdnResult] = useState<any>(null);
  const [showCreditFallback, setShowCreditFallback] = useState(false);
  const [creditSource, setCreditSource] = useState<"yape" | "paypal" | "manual">("yape");
  const [creditReference, setCreditReference] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [creditMode, setCreditMode] = useState<"add" | "set">("add");
  const [creditDeliveries, setCreditDeliveries] = useState<Array<{
    id: number;
    buyerEmail: string;
    credits: number;
    status: string;
    source: string;
    createdAt: string;
    adminNote: string | null;
  }>>([]);
  const [creditDeliveriesLoading, setCreditDeliveriesLoading] = useState(false);
  const [moduleEmail, setModuleEmail] = useState("");
  const [moduleUid, setModuleUid] = useState("");
  const [modulePlanId, setModulePlanId] = useState("planificacion_base");
  const [moduleSource, setModuleSource] = useState<"yape" | "paypal" | "manual">("yape");
  const [moduleNote, setModuleNote] = useState("");
  const [moduleSaving, setModuleSaving] = useState(false);
  const [moduleSearchResult, setModuleSearchResult] = useState<AdminUserLookup | null>(null);
  const [moduleSearching, setModuleSearching] = useState(false);
  const [moduleNotFound, setModuleNotFound] = useState(false);
  const [moduleServerBlind, setModuleServerBlind] = useState(false);
  const [moduleClientWhatsapp, setModuleClientWhatsapp] = useState("");
  const [moduleGrants, setModuleGrants] = useState<Array<{
    id: number;
    buyerEmail: string;
    planId: string;
    status: string;
    source: string;
    createdAt: string;
  }>>([]);
  const [moduleGrantsLoading, setModuleGrantsLoading] = useState(false);
  const [authClients, setAuthClients] = useState<Array<{
    uid: string;
    email: string;
    displayName: string | null;
    totalCP: number;
    sovereigntyPoints?: number;
    rank: string;
    activeModules: string[];
  }>>([]);
  const [authClientsLoading, setAuthClientsLoading] = useState(false);
  const [authClientsError, setAuthClientsError] = useState<string | null>(null);
  const [sellerSales, setSellerSales] = useState<Array<{
    id: string;
    sellerRef: string;
    planId: string;
    planName: string;
    amountUsd: number;
    commissionUsd: number;
    buyerEmail?: string;
    mpPaymentId: string;
    createdAt: string;
    commissionPaidOut: boolean;
  }>>([]);
  const [sellerSalesLoading, setSellerSalesLoading] = useState(false);
  const [newSellerCode, setNewSellerCode] = useState("");
  const [newSellerName, setNewSellerName] = useState("");
  const [vendedorCalls, setVendedorCalls] = useState<Array<{
    id: string;
    telefono: string;
    whatsapp: string | null;
    codigo: number;
    planeta: string;
    sellerRef: string | null;
    adVideo?: string | null;
    status: string;
    canalUsado: string | null;
    intentos: number;
    error: string | null;
    guionResumen: string;
    createdAt: string;
  }>>([]);
  const [vendedorCallsLoading, setVendedorCallsLoading] = useState(false);
  const [vendedorCallsDaily, setVendedorCallsDaily] = useState<{
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    await new Promise(r => setTimeout(r, 500));
    
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem("adminAuth", "true");
      toast.success("¡Bienvenido, Arquitecto Gilson!");
      setUsers(DEMO_USERS);
      setPayments(DEMO_PAYMENTS);
    } else {
      toast.error("Contraseña incorrecta");
    }
    setLoginLoading(false);
  };

  const activateUser = async (userId: string, plan: string) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, subscriptionPlan: plan, subscriptionStatus: "active" } : u
    ));
    toast.success(`¡Usuario activado con plan ${plan}!`);
  };

  const settleCommission = async (paymentId: string) => {
    setPayments(payments.map(p => 
      p.id === paymentId ? { ...p, commissionPaidOut: 1 } : p
    ));
    toast.success("¡Comisión marcada como pagada!");
  };

  const searchAccounts = async (opts?: { silent?: boolean; query?: string }) => {
    setSearchingAccounts(true);
    setRecoverySearchHint(null);
    try {
      const headers = await getAdminHeaders();
      if (!headers.Authorization) {
        if (!opts?.silent) {
          toast.error("Entra con Google (gilsonarevalo.leo@gmail.com). La clave del panel no ve Firebase.");
        }
        setRecoverySearchHint("Sin Google el botón no puede listar cuentas. Entra con el mismo Gmail.");
        return;
      }
      const q = (opts?.query ?? recoveryQuery).trim();
      const url = q
        ? `/api/admin/recovery/accounts?q=${encodeURIComponent(q)}`
        : "/api/admin/recovery/accounts";
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (res.status === 403) {
        if (!opts?.silent) {
          toast.error("Entra con tu Google gilsonarevalo.leo@gmail.com. Este anónimo no es tu cuenta.");
        }
        setRecoverySearchHint("La sesión actual no es el Gmail del arquitecto. Entra con Google y busca otra vez.");
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || "Error buscando cuentas");
      }
      if (data.adminReady === false) {
        setRecoverySearchHint(
          explainFirebaseAdminError(data.parseError, data.initError) ||
            "El servidor no tiene FIREBASE_SERVICE_ACCOUNT_JSON. Sin eso no lista las cuentas viejas.",
        );
      }
      const found: AccountData[] = (data.accounts || []).map((a: AccountData & { totalDocs?: number }) => ({
        ...a,
        lastUpdated: a.lastUpdated ? new Date(a.lastUpdated) : null,
      }));
      if (found.length === 0 && !q) {
        const fallback = await findAccountsWithData();
        setAccounts(fallback);
        if (!opts?.silent) {
          toast.info(
            fallback.length === 0
              ? "Firebase no devolvió cuentas. Entra con Google y busca tu Gmail, no dejes el recuadro vacío."
              : `Se encontraron ${fallback.length} cuentas (búsqueda local)`,
          );
        }
        return;
      }
      setAccounts(found);
      const inventoriesFromSearch: Record<string, { features: Record<RecoveryFeature, number>; total: number }> = {};
      for (const a of found) {
        if (a.features && typeof a.totalDocs === "number") {
          inventoriesFromSearch[a.uid] = { features: a.features, total: a.totalDocs };
        }
      }
      if (Object.keys(inventoriesFromSearch).length > 0) {
        setInventories((prev) => ({ ...prev, ...inventoriesFromSearch }));
      }
      if (opts?.silent) return;
      if (found.length === 0) {
        toast.info("Ese Gmail o UID no tiene documentos. Prueba el Gmail de siempre o deja el recuadro y busca todas.");
      } else {
        toast.success(`Se encontraron ${found.length} cuentas`);
      }
    } catch (error) {
      if (!opts?.silent) {
        toast.error(error instanceof Error ? error.message : "Error buscando cuentas");
      }
    } finally {
      setSearchingAccounts(false);
    }
  };

  const restoreHighestAccount = async () => {
    if (!user?.uid) {
      toast.error("Entra con Google primero");
      return;
    }
    const confirmed = confirm(
      "Esto busca la cuenta con MÁS puntos (la de ~9000 PS) y la copia a ESTE Gmail. No borra el origen. ¿Seguir?"
    );
    if (!confirmed) return;
    setRestoringHighest(true);
    try {
      const headers = await getAdminHeaders();
      if (!headers.Authorization) {
        toast.error("Entra con Google (gilsonarevalo.leo@gmail.com).");
        return;
      }
      const res = await fetch("/api/admin/recovery/restore-highest", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ toUid: user.uid }),
      });
      const data = await res.json();
      if (res.status === 403) {
        toast.error("Entra con tu Google gilsonarevalo.leo@gmail.com");
        return;
      }
      if (!res.ok) throw new Error(data.error || "No se pudo restaurar");
      toast.success(data.message || "Restauración lista. Recarga Crisol y Récord.");
      if (data.migrated > 0) {
        window.location.reload();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error restaurando la cuenta de 9000");
    } finally {
      setRestoringHighest(false);
    }
  };

  const handleAdminGoogle = async () => {
    if (!isFirebaseConfigured()) {
      toast.error("Firebase no está configurado");
      return;
    }
    setGoogleLinking(true);
    try {
      await signInWithGoogle();
      toast.success("Google conectado. Ahora busca cuentas.");
    } catch (error) {
      toast.error("No se pudo entrar con Google");
      console.error(error);
    } finally {
      setGoogleLinking(false);
    }
  };

  const migrateFromAccount = async (oldUid: string) => {
    if (!user?.uid) {
      toast.error("No hay usuario activo");
      return;
    }
    if (oldUid === user.uid) {
      toast.info("Esta ya es tu cuenta actual");
      return;
    }
    const confirmed = confirm(
      "Esto copia Crisol, Récord, Rutina, Depósito y Umbral de esa cuenta a TU sesión actual. No borra el origen. ¿Seguir?"
    );
    if (!confirmed) return;
    setMigratingUid(oldUid);
    try {
      const headers = await getAdminHeaders();
      if (headers.Authorization) {
        const res = await fetch("/api/admin/recovery/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ fromUid: oldUid, toUid: user.uid }),
        });
        const data = await res.json();
        if (res.ok && typeof data.migrated === "number") {
          if (data.migrated > 0) {
            toast.success(data.message || `Se copiaron ${data.migrated} registros`);
            window.location.reload();
            return;
          }
          toast.info(data.message || "No se encontraron datos para migrar");
          return;
        }
      }
      const result = await migrateDataToNewUid(oldUid, user.uid);
      if (result.migrated > 0) {
        toast.success(`¡Migración exitosa! ${result.migrated} registros transferidos`);
        window.location.reload();
      } else {
        toast.info("No se encontraron datos para migrar");
      }
    } catch (error) {
      toast.error("Error en la migración");
    } finally {
      setMigratingUid(null);
    }
  };

  const inspectAccount = async (uid: string) => {
    setInspectingUid(uid);
    try {
      const headers = await getAdminHeaders();
      if (headers.Authorization) {
        const res = await fetch(
          `/api/admin/recovery/inventory?uid=${encodeURIComponent(uid)}`,
          { headers },
        );
        const data = await res.json();
        if (res.ok && data.inventory) {
          setInventories((prev) => ({
            ...prev,
            [uid]: {
              features: data.inventory.features,
              total: data.inventory.total,
            },
          }));
          toast.success(
            data.inventory.total > 0
              ? `${data.inventory.total} documentos en esa cuenta`
              : "Esa cuenta no tiene documentos",
          );
          return;
        }
      }
      const local = await countAccountCollections(uid);
      setInventories((prev) => ({
        ...prev,
        [uid]: { features: local.features, total: local.total },
      }));
    } catch {
      toast.error("No se pudo inspeccionar esa cuenta");
    } finally {
      setInspectingUid(null);
    }
  };

  const grantPlanOnUid = async (
    targetUid: string,
    planId = "planificacion_base",
    email?: string,
  ): Promise<boolean> => {
    if (!targetUid.trim()) {
      toast.error("Falta el UID de la cuenta");
      return false;
    }
    setGrantingUid(targetUid);
    try {
      const headers = await getAdminHeaders();
      const res = await fetch("/api/admin/modules/grant-uid", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          uid: targetUid.trim(),
          planId,
          source: moduleSource,
          note: moduleNote.trim() || `encender-uid:${targetUid.slice(0, 8)}`,
          email: email?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.warning(data.error || "Esta referencia ya fue activada");
        return true;
      }
      if (data.granted || data.activated) {
        toast.success(data.message || "Jornada encendida en esa cuenta. Que abra el menú.");
        setAccounts((prev) =>
          prev.map((a) =>
            a.uid === targetUid
              ? {
                  ...a,
                  activeModules: Array.from(
                    new Set([...(a.activeModules || []), ...modulesGrantedByPlan(planId)]),
                  ),
                  subscriptionPlan: planId,
                }
              : a,
          ),
        );
        void loadModuleGrants();
        void loadAuthClients();
        return true;
      }
      const local = await grantModulesToUid(targetUid, modulesGrantedByPlan(planId), {
        subscriptionPlan: planId,
      });
      if (local.ok) {
        toast.success("Jornada escrita en esa cuenta. Que recargue el menú — no cree otra.");
        setAccounts((prev) =>
          prev.map((a) =>
            a.uid === targetUid
              ? { ...a, activeModules: local.activeModules, subscriptionPlan: planId }
              : a,
          ),
        );
        void loadModuleGrants();
        return true;
      }
      if (data.pending) {
        toast.success(
          "Pago pegado a ese UID. Dile que abra Jornada en su celular — el plan se enciende ahí.",
        );
        void loadModuleGrants();
        return true;
      }
      if (!res.ok) throw new Error(data.error || "Error encendiendo el plan");
      toast.error(data.message || "No se pudo encender Jornada en esa cuenta");
      return false;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error encendiendo Jornada");
      return false;
    } finally {
      setGrantingUid(null);
    }
  };

  const getAdminHeaders = async (): Promise<Record<string, string>> => {
    const idToken = auth?.currentUser ? await getIdToken(auth.currentUser, false).catch(() => "") : "";
    return idToken ? { Authorization: `Bearer ${idToken}` } : {};
  };

  const lookupUserAdmin = async (targetEmail: string): Promise<AdminUserLookup | null> => {
    const headers = await getAdminHeaders();
    if (!headers.Authorization) {
      toast.error("Inicia sesión con tu cuenta Gilson (Google) para buscar usuarios en Firebase Auth.");
      return null;
    }
    const res = await fetch(
      `/api/admin/users/lookup?email=${encodeURIComponent(targetEmail.trim())}`,
      { headers }
    );
    const data = (await res.json()) as AdminUserLookup & { error?: string };
    if (res.status === 404) {
      return {
        found: false,
        adminReady: data.adminReady ?? false,
        parseError: data.parseError,
        initError: data.initError,
        projectId: data.projectId,
        suggestions: data.suggestions,
        error: data.error,
      };
    }
    if (!res.ok) {
      throw new Error(data.error || "Error buscando usuario");
    }
    return data;
  };

  const loadCreditDeliveries = async () => {
    setCreditDeliveriesLoading(true);
    try {
      const headers = await getAdminHeaders();
      const res = await fetch("/api/admin/espejo/deliveries?limit=30", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error cargando entregas");
      setCreditDeliveries(data.deliveries || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error cargando historial";
      toast.error(msg);
    } finally {
      setCreditDeliveriesLoading(false);
    }
  };

  const loadModuleGrants = async () => {
    setModuleGrantsLoading(true);
    try {
      const headers = await getAdminHeaders();
      const res = await fetch("/api/admin/modules/grants?limit=30", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error cargando activaciones");
      setModuleGrants(data.grants || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error cargando historial";
      toast.error(msg);
    } finally {
      setModuleGrantsLoading(false);
    }
  };

  const loadAuthClients = async () => {
    setAuthClientsLoading(true);
    setAuthClientsError(null);
    try {
      const headers = await getAdminHeaders();
      const res = await fetch("/api/admin/users/clients?limit=80", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error listando cuentas");
      setAuthClients(data.clients || []);
      if (data.adminReady === false) {
        setAuthClientsError(
          data.parseError
            ? `JSON de Firebase: ${data.parseError}. Revisa FIREBASE_SERVICE_ACCOUNT_JSON y redeploy.`
            : "El servidor aún no lee Firebase Auth. Variable en Functions + redeploy.",
        );
      }
    } catch (e: unknown) {
      setAuthClientsError(e instanceof Error ? e.message : "Error listando cuentas");
    } finally {
      setAuthClientsLoading(false);
    }
  };

  const grantModuleAdmin = async (targetEmail: string) => {
    if (moduleUid.trim()) {
      setModuleSaving(true);
      try {
        await grantPlanOnUid(moduleUid.trim(), modulePlanId, targetEmail.trim() || undefined);
      } finally {
        setModuleSaving(false);
      }
      return;
    }
    if (!targetEmail.trim()) {
      toast.error("Pega el correo del comprador y pulsa Registrar");
      return;
    }
    setModuleSaving(true);
    try {
      const headers = await getAdminHeaders();
      if (!headers.Authorization) {
        toast.error("Entra con tu Google gilsonarevalo.leo@gmail.com. La clave del panel no registra el pago.");
        return;
      }
      const res = await fetch("/api/admin/modules/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          email: targetEmail.trim(),
          planId: modulePlanId,
          source: moduleSource,
          note: moduleNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.warning(data.error || "Esta referencia ya fue activada");
        return;
      }
      if (res.status === 403) {
        toast.error("Entra con tu Google gilsonarevalo.leo@gmail.com para registrar.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Error activando módulo");
      const whatsapp =
        typeof data.clientWhatsapp === "string" && data.clientWhatsapp
          ? data.clientWhatsapp
          : buildClientAccountWhatsapp(
              targetEmail.trim(),
              displayNameForPlan(modulePlanId),
              resolveClientAccountWhatsappKind({
                granted: Boolean(data.activated || data.granted),
                accountExists: Boolean(data.uid || data.activated || data.granted),
              }),
            );
      setModuleClientWhatsapp(whatsapp);
      if (data.activated || data.granted) {
        toast.success(data.message || "Módulo activado. Dile que entre con el mismo Gmail — no cree otra cuenta.");
      } else if (data.pending && (data.uid || moduleSearchResult?.uid || moduleServerBlind)) {
        toast.success("Pago registrado. Dile que abra Jornada en su celular — el plan se enciende ahí.");
      } else if (data.pending) {
        toast.success("Pago registrado. El cliente aún debe crear su cuenta en /acceso.");
      } else {
        toast.success(data.message || "Módulo activado");
      }
      setModuleNote("");
      void loadModuleGrants();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error activando módulo");
    } finally {
      setModuleSaving(false);
    }
  };

  const grantEspejoCreditsAdmin = async (targetEmail: string) => {
    const amount = parseInt(creditAmount, 10);
    if (!amount || amount <= 0) {
      toast.error("Ingresa una cantidad valida de creditos");
      return;
    }
    if (!targetEmail.trim()) {
      toast.error("Ingresa el email del comprador");
      return;
    }
    setCreditSaving(true);
    try {
      const headers = await getAdminHeaders();
      const res = await fetch("/api/admin/espejo/grant-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          email: targetEmail.trim(),
          credits: amount,
          mode: creditMode,
          source: creditSource,
          reference: creditReference.trim() || undefined,
          note: creditNote.trim() || undefined,
          sendEmail: true,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.warning(data.error || "Esta referencia ya fue acreditada");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Error acreditando creditos");
      if (data.pending) {
        toast.success(
          `${amount} creditos registrados para ${targetEmail}. Se activaran al iniciar sesion con ese correo.`
        );
      } else {
        toast.success(data.message || `+${amount} creditos activados`);
      }
      setCreditAmount("");
      setCreditReference("");
      setCreditNote("");
      setCreditSearchResult(null);
      setShowCreditFallback(false);
      void loadCreditDeliveries();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error asignando creditos");
    } finally {
      setCreditSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab === "creditos" && isAuthenticated) {
      void loadCreditDeliveries();
    }
    if (activeTab === "modulos" && isAuthenticated) {
      void loadModuleGrants();
      void loadAuthClients();
      void searchAccounts({ silent: true });
    }
    if (activeTab === "vendedores" && isAuthenticated) {
      void loadSellerSales();
      void loadVendedorCalls();
    }
  }, [activeTab, isAuthenticated]);

  const loadVendedorCalls = async () => {
    setVendedorCallsLoading(true);
    try {
      const headers = await getAdminHeaders();
      const res = await fetch("/api/admin/vendedor-calls?limit=50", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setVendedorCalls(data.calls || []);
      setVendedorCallsDaily(data.daily || null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error cargando llamadas");
    } finally {
      setVendedorCallsLoading(false);
    }
  };

  const loadSellerSales = async () => {
    setSellerSalesLoading(true);
    try {
      const headers = await getAdminHeaders();
      const res = await fetch("/api/admin/seller-sales?limit=50", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setSellerSales(data.sales || []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error cargando ventas");
    } finally {
      setSellerSalesLoading(false);
    }
  };

  const markSellerCommissionPaid = async (id: string) => {
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`/api/admin/seller-sales/${id}/paid`, { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      toast.success("Comisión marcada como pagada");
      void loadSellerSales();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const registerSellerCode = async () => {
    if (!newSellerCode.trim() || !newSellerName.trim()) {
      toast.error("Nombre y código requeridos");
      return;
    }
    try {
      const headers = await getAdminHeaders();
      const res = await fetch("/api/admin/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ seller_name: newSellerName, seller_code: newSellerCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      toast.success(`Link: ${data.seller?.link || ""}`);
      setNewSellerCode("");
      setNewSellerName("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("adminAuth");
    if (saved === "true") {
      setIsAuthenticated(true);
      setUsers(DEMO_USERS);
      setPayments(DEMO_PAYMENTS);
    }
    const email = getUserEmail();
    if (isOwner(email)) {
      setIsAuthenticated(true);
      sessionStorage.setItem("adminAuth", "true");
      setUsers(DEMO_USERS);
      setPayments(DEMO_PAYMENTS);
    }
    unlockAdminTouches();
  }, []);

  const goToTab = (tab: AdminTab) => {
    setActiveTab(tab);
    const next = `/admin-gilson?tab=${tab}`;
    if (typeof window !== "undefined" && window.location.search !== `?tab=${tab}`) {
      window.history.replaceState({}, "", next);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user || motorsQuiet) return;
    const unsubs: (() => void)[] = [];
    unsubs.push(subscribeToPrincipiosMaestros(
      (items) => setPrincipios(items),
      (err) => console.error("Principios error:", err)
    ));
    unsubs.push(subscribeToEnergyLogs(user.uid,
      (logs) => setLabEnergyLogs(logs),
      (err) => console.error(err)
    ));
    unsubs.push(subscribeToVehicles(user.uid,
      (v) => setLabVehicles(v),
      (err) => console.error(err)
    ));
    unsubs.push(subscribeToGenomeLaws(
      (items) => setGenomeLaws(items),
      (err) => console.error("Genome error:", err)
    ));
    return () => unsubs.forEach(u => { try { u(); } catch {} });
  }, [isAuthenticated, user, motorsQuiet]);

  const runMineria = async () => {
    setMineriaLoading(true);
    try {
      const logsSerializados = labEnergyLogs.map(l => ({
        text: l.text, type: l.type, points: l.points,
        fecha: l.timestamp?.toISOString?.() || String(l.timestamp)
      }));
      const vehiclesSerializados = labVehicles.map(v => ({
        titulo: v.titulo, status: v.status, criterioFin: v.criterioFin,
        criterioDetalle: v.criterioDetalle,
        ejes: v.ejes ? {
          enfoque: v.ejes.enfoque?.text,
          conflicto: v.ejes.conflicto?.text,
          pasos: v.ejes.pasos?.text,
          limite: v.ejes.limite?.text
        } : null,
        fecha: v.createdAt?.toISOString?.() || String(v.createdAt)
      }));

      let alquimiasSerializadas: any[] = [];
      let hopeSerializados: any[] = [];
      try {
        const alqRaw = localStorage.getItem("sistemicar_alquimia");
        if (alqRaw) alquimiasSerializadas = JSON.parse(alqRaw).slice(0, 20).map((a: any) => ({
          observacion: a.observacion, crisis: a.crisis, leccion: a.leccion, maestria: a.maestria, oro: a.oro
        }));
      } catch {}
      try {
        const hopeRaw = localStorage.getItem("sistemicar_hope");
        if (hopeRaw) hopeSerializados = JSON.parse(hopeRaw).slice(0, 15).map((h: any) => ({
          text: h.text, type: h.type
        }));
      } catch {}

      const principiosExistentes = principios.map((p: any) => p.texto).filter(Boolean);

      const resp = await fetch("/api/mineria-consciencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          energyLogs: logsSerializados,
          vehicles: vehiclesSerializados,
          alquimias: alquimiasSerializadas,
          hopeLogs: hopeSerializados,
          principiosExistentes
        })
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText);
      }
      const data = await resp.json();
      setMineriaResults(data.patrones || []);
      toast.success(`${data.patrones?.length || 0} patrones encontrados`);
    } catch (err: any) {
      console.error("Minería error:", err);
      toast.error(`Error en la minería: ${err?.message || "desconocido"}`);
    } finally {
      setMineriaLoading(false);
    }
  };

  const sellarComoPrincipio = async (ley: string, categoria: string) => {
    try {
      await addPrincipioMaestro({ texto: ley, fuente: "destilacion", moduloOrigen: categoria });
      toast.success("Principio Maestro sellado");
    } catch {
      toast.error("Error al sellar principio");
    }
  };

  const consultarDoctor = async () => {
    if (!doctorText.trim()) return;
    setDoctorLoading(true);
    try {
      const resp = await fetch("/api/doctor-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: doctorText, principiosMaestros: principios, userName: "Gilson" })
      });
      const data = await resp.json();
      setDoctorResponse(data);
    } catch {
      toast.error("Error al consultar Doctor IA");
    } finally {
      setDoctorLoading(false);
    }
  };

  const procesarADN = async () => {
    if (!adnText.trim()) return;
    setAdnLoading(true);
    setAdnResult(null);
    try {
      const resp = await fetch("/api/filtro-adn-soberano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textoOriginal: adnText, moduloOrigen: adnModulo, categoria: adnCategoria })
      });
      const data = await resp.json();
      setAdnResult(data);
      if (data.veredicto === "validado" && data.ley_sistemicar) {
        await saveGenomeLaw({
          tesis_convencional: data.tesis_convencional,
          antitesis_gilson: data.antitesis_gilson,
          ley_sistemicar: data.ley_sistemicar,
          texto_original: adnText,
          fuente_modulo: adnModulo,
          categoria: adnCategoria,
          identidad_sugerida: data.identidad_sugerida || "Observador",
          status: "validado",
          persistencia_perpetua: true
        });
        toast.success("¡Ley Soberana validada y sellada en el Genoma!");
        setAdnText("");
      } else {
        toast.info("Candidato rechazado por el filtro");
      }
    } catch {
      toast.error("Error en el Filtro ADN Soberano");
    } finally {
      setAdnLoading(false);
    }
  };

  const getPlanBadge = (plan: string | null, status: string | null) => {
    if (status === "active") {
      const colors: Record<string, string> = {
        arquitecto: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        dominio: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        elite: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      };
      return (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${colors[plan || ""] || "bg-green-500/20 text-green-400 border-green-500/30"}`}>
          {plan?.toUpperCase() || "ACTIVO"}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[10px] font-bold">
        GRATIS
      </span>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#020202" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 mx-auto mb-4 flex items-center justify-center">
              <Shield className="text-amber-500" size={32} />
            </div>
            <h1 className="text-3xl font-black italic text-white mb-2">
              PANEL <span className="text-amber-500">ADMIN</span>
            </h1>
            <p className="text-sm text-slate-400">
              Acceso restringido para Gilson
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña de administrador"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold disabled:opacity-50"
            >
              {loginLoading ? "Verificando..." : "Entrar al Panel"}
            </button>
          </form>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-400 flex-shrink-0" size={20} />
              <div>
                <p className="text-xs text-amber-400 font-bold mb-1">MODO DEMOSTRACIÓN</p>
                <p className="text-[11px] text-slate-400">
                  Esta versión usa Firebase sin backend. Los datos mostrados son de demostración.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-28 relative z-20" style={{ backgroundColor: "#020202" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="text-amber-500" size={24} />
            <h1 className="text-xl font-black text-white">Panel Admin</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("adminAuth");
              setIsAuthenticated(false);
            }}
            className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-bold touch-manipulation"
          >
            Salir
          </button>
        </div>

        <div className="relative z-20 flex gap-2 mb-6 flex-wrap">
          <button
            type="button"
            onClick={() => goToTab("users")}
            className={`${TAB_BTN} ${
              activeTab === "users" ? "bg-amber-500 text-white" : "bg-white/5 text-slate-400"
            }`}
          >
            <Users size={16} className="inline mr-2" />
            Usuarios ({users.length})
          </button>
          <button
            type="button"
            onClick={() => goToTab("payments")}
            className={`${TAB_BTN} ${
              activeTab === "payments" ? "bg-amber-500 text-white" : "bg-white/5 text-slate-400"
            }`}
          >
            <DollarSign size={16} className="inline mr-2" />
            Pagos ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => goToTab("recovery")}
            className={`${TAB_BTN} ${
              activeTab === "recovery" ? "bg-green-500 text-white" : "bg-white/5 text-slate-400"
            }`}
          >
            <Database size={16} className="inline mr-2" />
            Recuperar Datos
          </button>
          <button
            type="button"
            onClick={() => goToTab("laboratorio")}
            className={`${TAB_BTN} ${
              activeTab === "laboratorio" ? "bg-purple-500 text-white" : "bg-white/5 text-slate-400"
            }`}
          >
            <FlaskConical size={16} className="inline mr-2" />
            Laboratorio
          </button>
            <button
              type="button"
              onClick={() => goToTab("adn")}
              className={`${TAB_BTN} ${
                activeTab === "adn" ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-400"
              }`}
              data-testid="tab-adn"
            >
              ADN Soberano
            </button>
            <button
              type="button"
              onClick={() => goToTab("creditos")}
              className={`${TAB_BTN} ${
                activeTab === "creditos" ? "bg-cyan-500 text-white" : "bg-white/5 text-slate-400"
              }`}
              data-testid="tab-creditos"
            >
              <DollarSign size={14} className="inline mr-1" />
              Créditos Espejo
            </button>
            <button
              type="button"
              onClick={() => goToTab("modulos")}
              className={`${TAB_BTN} ${
                activeTab === "modulos" ? "bg-sky-500 text-white" : "bg-white/5 text-slate-400"
              }`}
              data-testid="tab-modulos"
            >
              <Zap size={14} className="inline mr-1" />
              Módulos
            </button>
            <button
              type="button"
              onClick={() => goToTab("vendedores")}
              className={`${TAB_BTN} ${
                activeTab === "vendedores" ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400"
              }`}
              data-testid="tab-vendedores"
            >
              <Users size={14} className="inline mr-1" />
              Vendedores
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin-semillas")}
              className={`${TAB_BTN} bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/30`}
              data-testid="btn-admin-semillas"
            >
              <Sprout size={14} className="inline mr-1" />
              Semillas / Fábrica
            </button>
        </div>

        {activeTab === "users" && (
          <div className="space-y-3">
            {users.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold">{user.username}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPlanBadge(user.subscriptionPlan, user.subscriptionStatus)}
                    {user.subscriptionStatus !== "active" && (
                      <div className="flex gap-1">
                        {["arquitecto", "dominio", "elite"].map((plan) => (
                          <button
                            key={plan}
                            onClick={() => activateUser(user.id, plan)}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          >
                            {plan.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-3">
            {payments.map((payment) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold">${payment.amount} - {payment.plan.toUpperCase()}</p>
                    <p className="text-xs text-slate-500">Comisión: ${payment.commissionAmount}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {payment.commissionPaidOut ? (
                      <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px] font-bold">PAGADO</span>
                    ) : (
                      <button
                        onClick={() => settleCommission(payment.id)}
                        className="px-3 py-1 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold hover:bg-amber-500/30"
                      >
                        MARCAR PAGADO
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === "recovery" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 break-words font-sans">
              <h3 className="text-amber-300 font-bold mb-1">Si limpiaste el teléfono</h3>
              <p className="text-xs text-slate-400 leading-relaxed whitespace-normal">
                La clave del panel no alcanza. Primero entra con Google
                (gilsonarevalo.leo@gmail.com). Después busca ese mismo Gmail.
                El botón de antes miraba solo el teléfono y por eso decía que no había cuentas.
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                Sesión ahora: {user?.email || getUserEmail() || "anónima / vacía"} · UID {user?.uid?.slice(0, 10) || "—"}
              </p>
              {(!user?.email || isUserAnonymous()) && (
                <button
                  type="button"
                  onClick={() => void handleAdminGoogle()}
                  disabled={googleLinking}
                  className="mt-3 w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
                  data-testid="button-recovery-google"
                >
                  {googleLinking ? "Conectando..." : "Entrar con Google para ver Firebase"}
                </button>
              )}
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-start gap-3 mb-4">
                <Database className="text-green-400 flex-shrink-0" size={24} />
                <div>
                  <h3 className="text-green-400 font-bold mb-1">Cuentas con datos en Firebase</h3>
                  <p className="text-xs text-slate-400">
                    Pega tu Gmail o un UID. Vacío = lista todas las que tengan Crisol, Récord, Rutina, Depósito o Umbral.
                  </p>
                </div>
              </div>
              <input
                type="text"
                value={recoveryQuery}
                onChange={(e) => setRecoveryQuery(e.target.value)}
                placeholder="gilsonarevalo.leo@gmail.com o UID"
                className="mb-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white"
                data-testid="input-recovery-query"
              />
              <button
                type="button"
                onClick={() => void searchAccounts()}
                disabled={searchingAccounts}
                className="w-full py-3 rounded-xl bg-green-500 text-white font-bold disabled:opacity-50"
                data-testid="button-search-accounts"
              >
                {searchingAccounts ? "Buscando cuentas..." : "Buscar en la nube"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecoveryQuery("");
                  void searchAccounts({ query: "" });
                }}
                disabled={searchingAccounts}
                className="mt-2 w-full py-2 rounded-xl bg-white/5 text-slate-300 text-sm font-bold disabled:opacity-50"
                data-testid="button-search-all-accounts"
              >
                Listar todas las cuentas con datos
              </button>
              {recoverySearchHint && (
                <p className="mt-3 text-xs text-amber-300 break-words whitespace-normal font-sans">
                  {recoverySearchHint}
                </p>
              )}
              <button
                type="button"
                onClick={() => void restoreHighestAccount()}
                disabled={restoringHighest}
                className="mt-3 w-full py-3 rounded-xl bg-amber-500 text-black font-bold disabled:opacity-50"
                data-testid="button-restore-highest"
              >
                {restoringHighest ? "Copiando la cuenta de 9000..." : "Traer mis 9000 puntos a este Gmail"}
              </button>
            </div>

            {accounts.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 mb-2">
                  {accounts.length} cuentas. Los 9000 están en PS (puntos de soberanía), no en CP. La tarjeta amarilla es la llena. Tu UID: <span className="text-green-400 font-mono">{user?.uid?.slice(0, 12)}...</span>
                </p>
                {(() => {
                  const richest = accounts.reduce((best, a) => {
                    const score = Math.max(a.sovereigntyPoints ?? 0, a.totalCP, a.totalDocs ?? 0);
                    const bestScore = Math.max(best.sovereigntyPoints ?? 0, best.totalCP, best.totalDocs ?? 0);
                    return score > bestScore ? a : best;
                  });
                  const richestHasData =
                    (richest.sovereigntyPoints ?? 0) + richest.totalCP + (richest.totalDocs ?? 0) > 0;
                  return accounts.map((account) => {
                  const jornadaOn = Boolean(account.activeModules?.includes("planificacion_base"));
                  const isRichest = richestHasData && account.uid === richest.uid;
                  return (
                  <motion.div
                    key={account.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-4 rounded-xl border ${
                      isRichest
                        ? "bg-amber-500/15 border-amber-400/50"
                        : account.uid === user?.uid 
                        ? "bg-green-500/10 border-green-500/30" 
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white font-mono text-sm break-all">
                          {account.email || account.uid.slice(0, 20) + "..."}
                          {account.uid === user?.uid && (
                            <span className="ml-2 text-green-400 text-xs">(TU SESIÓN)</span>
                          )}
                          {isRichest && (
                            <span className="ml-2 text-amber-300 text-xs font-bold">← ESTA ES LA LLENA</span>
                          )}
                        </p>
                        {account.email && (
                          <p className="text-[10px] text-slate-500 font-mono break-all">{account.uid}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="text-amber-400 font-bold">
                            {account.sovereigntyPoints ?? 0} PS · {account.totalCP} CP
                          </span>
                          <span className="text-xs text-slate-500">Rango: {account.rank.toUpperCase()}</span>
                          {jornadaOn ? (
                            <span className="text-xs text-emerald-400 font-bold">Jornada on</span>
                          ) : (
                            <span className="text-xs text-rose-400">Jornada off</span>
                          )}
                          {account.whatsapp && (
                            <span className="text-xs text-slate-500">{account.whatsapp}</span>
                          )}
                          {account.lastUpdated && (
                            <span className="text-xs text-slate-600">
                              {account.lastUpdated.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {(inventories[account.uid] || account.features) && (
                          <p className="mt-2 text-[11px] text-slate-400">
                            {(inventories[account.uid]?.total ?? account.totalDocs ?? 0)} docs ·{" "}
                            {(Object.keys(RECOVERY_FEATURE_LABELS) as RecoveryFeature[])
                              .map((key) => `${RECOVERY_FEATURE_LABELS[key]} ${(inventories[account.uid]?.features ?? account.features)?.[key] ?? 0}`)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => void inspectAccount(account.uid)}
                            disabled={inspectingUid === account.uid}
                            className="px-3 py-1 rounded-lg bg-white/10 text-slate-200 text-[10px] font-bold disabled:opacity-50"
                            data-testid={`button-inspeccionar-${account.uid.slice(0, 6)}`}
                          >
                            {inspectingUid === account.uid ? "Contando..." : "Ver Crisol / Récord / Rutina"}
                          </button>
                      {account.uid !== user?.uid && (
                        <>
                          <button
                            type="button"
                            onClick={() => void grantPlanOnUid(account.uid)}
                            disabled={grantingUid === account.uid || jornadaOn}
                            className="px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2"
                            data-testid={`button-encender-jornada-${account.uid.slice(0, 6)}`}
                          >
                            {grantingUid === account.uid ? (
                              "Encendiendo..."
                            ) : jornadaOn ? (
                              "Jornada on"
                            ) : (
                              <>
                                <Zap size={16} /> Encender Jornada Base
                              </>
                            )}
                          </button>
                          <p className="text-[10px] text-slate-500 max-w-[9rem]">
                            Encender no copies los datos a tu cuenta Gilson. Para los 9000 usa Copiar o Traer.
                          </p>
                          <button
                            type="button"
                            onClick={() => migrateFromAccount(account.uid)}
                            disabled={migratingUid === account.uid}
                            className="px-3 py-1 rounded-lg bg-white/5 text-slate-500 text-[10px] font-bold disabled:opacity-50 flex items-center gap-1"
                          >
                            {migratingUid === account.uid ? (
                              "Copiando..."
                            ) : (
                              <>
                                Copiar a tu Gilson <ArrowRight size={12} />
                              </>
                            )}
                          </button>
                        </>
                      )}
                      </div>
                    </div>
                  </motion.div>
                  );
                });
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === "laboratorio" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                <FlaskConical size={18} /> Minería de Consciencia
              </h3>
              <p className="text-xs text-slate-400 mb-4">Analiza tu historial y extrae leyes de comportamiento ocultas</p>
              <button
                onClick={runMineria}
                disabled={mineriaLoading}
                className="w-full py-3 rounded-xl bg-purple-500 text-white font-bold disabled:opacity-50"
                data-testid="button-run-mineria"
              >
                {mineriaLoading ? "Destilando patrones..." : "Ejecutar Minería"}
              </button>

              {mineriaResults.length > 0 && (
                <div className="mt-4 space-y-3">
                  {mineriaResults.map((p: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-white text-sm font-bold mb-1">{p.ley}</p>
                      <p className="text-xs text-slate-400 mb-2">{p.evidencia}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-purple-400">{p.categoria}</span>
                        <button
                          onClick={() => sellarComoPrincipio(p.ley, p.categoria)}
                          className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/30 flex items-center gap-1"
                          data-testid={`button-sellar-principio-${i}`}
                        >
                          <Star size={12} /> Sellar como Principio
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                <Star size={18} /> Principios Maestros ({principios.length})
              </h3>
              {principios.length === 0 ? (
                <p className="text-xs text-slate-500">No hay principios registrados aún</p>
              ) : (
                <div className="space-y-2 mt-3">
                  {principios.map((p) => (
                    <div key={p.id} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-start gap-3" data-testid={`card-principio-${p.id}`}>
                      <Star size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{p.texto}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] uppercase font-bold text-slate-500">{p.moduloOrigen}</span>
                          <span className="text-[9px] text-slate-600">{p.fuente}</span>
                          <span className="text-[9px] text-slate-600">{new Date(p.createdAt).toLocaleDateString("es")}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deletePrincipioMaestro(p.id)}
                        className="p-1 text-red-400/50 hover:text-red-400"
                        data-testid={`button-delete-principio-${p.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                <Brain size={18} /> Doctor IA
              </h3>
              <p className="text-xs text-slate-400 mb-3">Consulta clínica basada en tus Principios Maestros</p>
              <textarea
                value={doctorText}
                onChange={(e) => setDoctorText(e.target.value)}
                placeholder="Escribe lo que sientes o piensas..."
                className="w-full h-24 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm resize-none"
                data-testid="input-doctor-text"
              />
              <button
                onClick={consultarDoctor}
                disabled={doctorLoading || !doctorText.trim()}
                className="w-full mt-2 py-3 rounded-xl bg-blue-500 text-white font-bold disabled:opacity-50"
                data-testid="button-consultar-doctor"
              >
                {doctorLoading ? "Diagnosticando..." : "Consultar Doctor IA"}
              </button>

              {doctorResponse && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-[10px] uppercase font-bold text-red-400 mb-1">Diagnóstico</p>
                    <p className="text-sm text-white" data-testid="text-diagnostico">{doctorResponse.diagnostico}</p>
                  </div>
                  {doctorResponse.leyAplicada && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[10px] uppercase font-bold text-amber-400 mb-1">Ley Aplicada</p>
                      <p className="text-sm text-white italic" data-testid="text-ley-aplicada">"{doctorResponse.leyAplicada}"</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Receta</p>
                    <p className="text-sm text-white" data-testid="text-receta">{doctorResponse.receta}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-[10px] uppercase font-bold text-purple-400 mb-1">Pregunta Espejo</p>
                    <p className="text-sm text-white font-bold" data-testid="text-pregunta-espejo">{doctorResponse.preguntaEspejo}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "adn" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                <Dna size={18} /> Filtro ADN Soberano
              </h3>
              <p className="text-xs text-slate-400 mb-4">Ingresa un descubrimiento para validarlo como Ley de Sistemicar</p>
              
              <textarea
                value={adnText}
                onChange={(e) => setAdnText(e.target.value)}
                placeholder="Escribe tu descubrimiento, insight o principio..."
                className="w-full h-28 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm resize-none mb-3"
                data-testid="input-adn-text"
              />
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <select
                  value={adnModulo}
                  onChange={(e) => setAdnModulo(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                  data-testid="select-adn-modulo"
                >
                  <option value="espejo">Espejo</option>
                  <option value="alquimia">Alquimia</option>
                  <option value="planificacion">Planificación</option>
                  <option value="deposito">Depósito</option>
                  <option value="introspección">Introspección</option>
                  <option value="general">General</option>
                </select>
                <select
                  value={adnCategoria}
                  onChange={(e) => setAdnCategoria(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                  data-testid="select-adn-categoria"
                >
                  <option value="productividad">Productividad</option>
                  <option value="emocional">Emocional</option>
                  <option value="relacional">Relacional</option>
                  <option value="financiero">Financiero</option>
                  <option value="existencial">Existencial</option>
                </select>
              </div>
              
              <button
                onClick={procesarADN}
                disabled={adnLoading || !adnText.trim()}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold disabled:opacity-50"
                data-testid="button-procesar-adn"
              >
                {adnLoading ? "Analizando ADN..." : "Procesar con Filtro ADN"}
              </button>
              
              {adnResult && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">Tesis Convencional</p>
                    <p className="text-sm text-slate-300">{adnResult.tesis_convencional}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-[10px] uppercase font-bold text-amber-400 mb-1">Antítesis de Gilson</p>
                    <p className="text-sm text-slate-300">{adnResult.antitesis_gilson}</p>
                  </div>
                  {adnResult.veredicto === "validado" ? (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Ley de Sistemicar (Validada)</p>
                      <p className="text-sm text-white font-bold">{adnResult.ley_sistemicar}</p>
                      <p className="text-[9px] text-slate-500 mt-1">Identidad: {adnResult.identidad_sugerida}</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-[10px] uppercase font-bold text-red-400 mb-1">Rechazado</p>
                      <p className="text-sm text-slate-300">{adnResult.razon_rechazo}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                <Dna size={18} /> Genoma SISTEMICAR ({genomeLaws.filter(g => g.status === "validado").length} Leyes)
              </h3>
              {genomeLaws.filter(g => g.status === "validado").length === 0 ? (
                <p className="text-xs text-slate-500">No hay leyes validadas en el genoma aún</p>
              ) : (
                <div className="space-y-3 mt-3">
                  {genomeLaws.filter(g => g.status === "validado").map((law) => (
                    <div key={law.id} className="p-3 rounded-lg bg-white/5 border border-emerald-500/20" data-testid={`card-genome-${law.id}`}>
                      <div className="flex items-start gap-3">
                        <Dna size={14} className="text-emerald-400 shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-bold">{law.ley_sistemicar}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-[9px] text-blue-400"><span className="font-bold">TESIS:</span> {law.tesis_convencional}</p>
                            <p className="text-[9px] text-amber-400"><span className="font-bold">ANTÍTESIS:</span> {law.antitesis_gilson}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[8px] uppercase font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/20">{law.identidad_sugerida}</span>
                            <span className="text-[8px] text-slate-500">{law.fuente_modulo}</span>
                            <span className="text-[8px] text-slate-600">{new Date(law.createdAt).toLocaleDateString("es")}</span>
                            {law.persistencia_perpetua && <span className="text-[8px] text-emerald-500 font-bold">PERPETUA</span>}
                          </div>
                        </div>
                        {!law.persistencia_perpetua && (
                          <button
                            onClick={() => deleteGenomeLaw(law.id)}
                            className="p-1 text-red-400/50 hover:text-red-400"
                            data-testid={`button-delete-genome-${law.id}`}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "creditos" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <h3 className="text-cyan-400 font-bold mb-3">Asignar Créditos de Claridad</h3>
              <p className="text-xs text-slate-400 mb-4">Yape, PayPal o manual: acredita por servidor con auditoria. Usa referencia para no duplicar el mismo pago.</p>
              <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {(["yape", "paypal", "manual"] as const).map((src) => (
                  <button key={src} type="button" onClick={() => setCreditSource(src)}
                    className={`px-2 py-2 rounded-lg text-xs font-bold uppercase ${creditSource === src ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50" : "bg-white/5 text-slate-400 border border-white/10"}`}>
                    {src}
                  </button>
                ))}
                <button type="button" onClick={() => { setCreditAmount("10"); setCreditMode("add"); }}
                  className="px-2 py-2 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">Pack +10</button>
              </motion.div>
              <motion.div className="flex flex-wrap gap-4 mb-3 text-xs text-slate-400">
                <label className="flex items-center gap-2"><input type="radio" checked={creditMode === "add"} onChange={() => setCreditMode("add")} /> Sumar</label>
                <label className="flex items-center gap-2"><input type="radio" checked={creditMode === "set"} onChange={() => setCreditMode("set")} /> Establecer saldo</label>
              </motion.div>
              <motion.div className="grid sm:grid-cols-2 gap-2 mb-3">
                <input type="text" value={creditReference} onChange={(e) => setCreditReference(e.target.value)}
                  placeholder="Ref. pago (opcional)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" data-testid="input-credit-reference" />
                <input type="text" value={creditNote} onChange={(e) => setCreditNote(e.target.value)}
                  placeholder="Nota interna" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" />
              </motion.div>
              <div className="flex gap-2 mb-3">
                <input
                  type="email"
                  value={creditEmail}
                  onChange={(e) => setCreditEmail(e.target.value)}
                  placeholder="Email del usuario"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  data-testid="input-credit-email"
                />
                <button
                  onClick={async () => {
                    if (!creditEmail.trim()) return;
                    setCreditSearching(true);
                    setCreditSearchResult(null);
                    try {
                      const result = await lookupUserAdmin(creditEmail.trim());
                      if (result?.found && result.uid) {
                        setCreditSearchResult({
                          uid: result.uid,
                          email: result.email ?? creditEmail.trim(),
                          rank: result.rank ?? "iniciado",
                          totalCP: result.totalCP ?? 0,
                        });
                        setShowCreditFallback(false);
                        toast.success("Usuario encontrado en Firebase Auth");
                      } else {
                        setShowCreditFallback(true);
                        toast.info(
                          result?.adminReady === false
                            ? "No encontrado. Además: FIREBASE_SERVICE_ACCOUNT_JSON no está en el servidor — activación limitada."
                            : "No hay cuenta con ese correo en Firebase Auth. Debe iniciar sesión con Google usando ese email exacto."
                        );
                      }
                    } catch {
                      toast.error("Error buscando usuario");
                    }
                    setCreditSearching(false);
                  }}
                  disabled={creditSearching}
                  className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-sm hover:bg-cyan-500/30 disabled:opacity-50"
                  data-testid="button-search-credit-user"
                >
                  {creditSearching ? "Buscando..." : "Buscar"}
                </button>
              </div>
              {creditSearchResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-sm">{creditSearchResult.email}</p>
                      <p className="text-xs text-slate-400">UID: {creditSearchResult.uid.slice(0, 12)}...</p>
                      <p className="text-xs text-slate-400">Rango: {creditSearchResult.rank} | CP: {creditSearchResult.totalCP}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="Cantidad de créditos"
                      min="1"
                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                      data-testid="input-credit-amount"
                    />
                    <button
                      onClick={() => grantEspejoCreditsAdmin(creditSearchResult!.email)}
                      disabled={creditSaving}
                      className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 font-bold text-sm hover:bg-green-500/30 disabled:opacity-50"
                      data-testid="button-assign-credits"
                    >
                      {creditSaving ? "Guardando..." : "Acreditar"}
                    </button>
                  </div>
                </motion.div>
              )}
              {showCreditFallback && !creditSearchResult && creditEmail.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-amber-400 font-bold text-sm">Usuario no encontrado</p>
                      <p className="text-xs text-slate-400">Puedes asignar créditos directamente al email <span className="text-white">{creditEmail.trim()}</span>. Se creará un registro automáticamente.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="Cantidad de créditos"
                      min="1"
                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                      data-testid="input-credit-amount-fallback"
                    />
                    <button
                      onClick={() => grantEspejoCreditsAdmin(creditEmail.trim())}
                      disabled={creditSaving}
                      className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-sm hover:bg-amber-500/30 disabled:opacity-50"
                      data-testid="button-assign-credits-fallback"
                    >
                      {creditSaving ? "Guardando..." : "Acreditar por Email"}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-500/10 border border-slate-500/20 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-300 font-bold text-sm">Historial entregas</h3>
                <button type="button" onClick={() => void loadCreditDeliveries()} className="text-xs text-cyan-400" disabled={creditDeliveriesLoading}>Actualizar</button>
              </div>
              {creditDeliveries.length === 0 ? (
                <p className="text-xs text-slate-500">Sin entregas.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto text-[10px]">
                  {creditDeliveries.map((row) => (
                    <div key={row.id} className="p-2 rounded bg-black/30">
                      <span className="text-white">{row.buyerEmail}</span>
                      <span className="text-slate-500"> +{row.credits} {row.source} {row.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <h3 className="text-indigo-400 font-bold mb-3">Enviar Correos</h3>
              <p className="text-xs text-slate-400 mb-4">Envía correos de bienvenida (compradores) o de ofrecimiento (prospectos sin compra).</p>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    id="emailTarget"
                    placeholder="Email del destinatario"
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                    data-testid="input-email-target"
                  />
                  <input
                    type="text"
                    id="emailName"
                    placeholder="Nombre (opcional)"
                    className="w-36 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                    data-testid="input-email-name"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const email = (document.getElementById("emailTarget") as HTMLInputElement)?.value;
                      const name = (document.getElementById("emailName") as HTMLInputElement)?.value;
                      if (!email) { toast.error("Ingresa un email"); return; }
                      try {
                        const res = await fetch("/api/send-welcome-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email, userName: name || undefined })
                        });
                        const data = await res.json();
                        if (data.success) toast.success("Correo de bienvenida enviado");
                        else toast.error(data.error || "Error enviando correo");
                      } catch { toast.error("Error de conexión"); }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs hover:bg-indigo-500/30"
                    data-testid="button-send-welcome"
                  >
                    Enviar Bienvenida (comprador)
                  </button>
                  <button
                    onClick={async () => {
                      const email = (document.getElementById("emailTarget") as HTMLInputElement)?.value;
                      const name = (document.getElementById("emailName") as HTMLInputElement)?.value;
                      if (!email) { toast.error("Ingresa un email"); return; }
                      try {
                        const res = await fetch("/api/send-offer-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email, userName: name || undefined })
                        });
                        const data = await res.json();
                        if (data.success) toast.success("Correo de ofrecimiento enviado");
                        else toast.error(data.error || "Error enviando correo");
                      } catch { toast.error("Error de conexión"); }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs hover:bg-amber-500/30"
                    data-testid="button-send-offer"
                  >
                    Enviar Ofrecimiento (prospecto)
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-4">
              <div>
                <h3 className="text-amber-400 font-bold mb-3">Envío Masivo a Prospectos</h3>
                <p className="text-xs text-slate-400 mb-4">Envía el correo de ofrecimiento a todos los prospectos que NO han confirmado pago.</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const prospectos = await getAllProspectos();
                    const sinPago = prospectos.filter(p => !p.pagoConfirmado && p.correo);
                    if (sinPago.length === 0) {
                      toast.info("No hay prospectos sin pago registrados");
                      return;
                    }
                    const confirmed = window.confirm(`Se enviarán ${sinPago.length} correos de ofrecimiento a prospectos sin pago. ¿Continuar?`);
                    if (!confirmed) return;
                    let enviados = 0;
                    let errores = 0;
                    for (const p of sinPago) {
                      try {
                        await fetch("/api/send-offer-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: p.correo, userName: p.nombre || undefined })
                        });
                        enviados++;
                      } catch {
                        errores++;
                      }
                      await new Promise(r => setTimeout(r, 500));
                    }
                    toast.success(`${enviados} correos enviados${errores > 0 ? `, ${errores} errores` : ""}`);
                  } catch {
                    toast.error("Error obteniendo prospectos");
                  }
                }}
                className="w-full px-4 py-3 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-sm hover:bg-amber-500/30 transition-all"
                data-testid="button-mass-offer"
              >
                Enviar Ofrecimiento a TODOS los Prospectos sin Pago
              </button>

              <div className="pt-3 border-t border-amber-500/10">
                <h4 className="text-slate-300 font-bold text-sm mb-2">Exportar Conocimiento SISTEMICAR</h4>
                <p className="text-xs text-slate-500 mb-3">Genera un documento con toda la base de conocimiento (leyes, genoma, módulos) para alimentar agentes externos como Retell.</p>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/knowledge-export", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({})
                      });
                      const data = await res.json();
                      if (data.success) {
                        const blob = new Blob([data.document], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `SISTEMICAR_Knowledge_${new Date().toISOString().split("T")[0]}.md`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`Documento exportado (${data.stats.totalCharacters} caracteres)`);
                      }
                    } catch { toast.error("Error exportando conocimiento"); }
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-slate-500/20 text-slate-300 font-bold text-xs hover:bg-slate-500/30 transition-all"
                  data-testid="button-export-knowledge"
                >
                  Descargar Documento de Conocimiento (.md)
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "modulos" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <h3 className="text-sky-400 font-bold mb-3">Registrar pago (Yape / manual)</h3>
              <p className="text-xs text-slate-400 mb-4">
                Pega el correo del pago y pulsa Registrar. No hace falta Buscar ni el JSON. El plan se enciende cuando ella abre Jornada.
              </p>
              {(authClients.length > 0 || accounts.length > 0 || authClientsLoading || searchingAccounts) && (
              <div className="mb-4 p-3 rounded-lg bg-black/30 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">
                    Cuentas — busca ~9000 PS, no CP
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void loadAuthClients();
                      void searchAccounts({ silent: true });
                    }}
                    className="text-xs text-sky-400"
                    disabled={authClientsLoading || searchingAccounts}
                  >
                    {authClientsLoading || searchingAccounts ? "…" : "Actualizar"}
                  </button>
                </div>
                {(() => {
                  const byUid = new Map<
                    string,
                    {
                      uid: string;
                      email: string;
                      totalCP: number;
                      sovereigntyPoints: number;
                      totalDocs: number;
                      rank: string;
                      activeModules: string[];
                    }
                  >();
                  for (const c of authClients) {
                    byUid.set(c.uid, {
                      uid: c.uid,
                      email: c.email || "",
                      totalCP: c.totalCP,
                      sovereigntyPoints: c.sovereigntyPoints ?? 0,
                      totalDocs: 0,
                      rank: c.rank,
                      activeModules: c.activeModules || [],
                    });
                  }
                  for (const a of accounts) {
                    const prev = byUid.get(a.uid);
                    byUid.set(a.uid, {
                      uid: a.uid,
                      email: prev?.email || a.email || "",
                      totalCP: Math.max(prev?.totalCP ?? 0, a.totalCP),
                      sovereigntyPoints: Math.max(prev?.sovereigntyPoints ?? 0, a.sovereigntyPoints ?? 0),
                      totalDocs: Math.max(prev?.totalDocs ?? 0, a.totalDocs ?? 0),
                      rank: a.rank || prev?.rank || "observador",
                      activeModules:
                        a.activeModules && a.activeModules.length > 0
                          ? a.activeModules
                          : prev?.activeModules || [],
                    });
                  }
                  const list = [...byUid.values()].sort(
                    (a, b) =>
                      (b.sovereigntyPoints - a.sovereigntyPoints) ||
                      (b.totalDocs - a.totalDocs) ||
                      (b.totalCP - a.totalCP),
                  );
                  const richest = list[0];
                  const richestHasData =
                    richest &&
                    (richest.sovereigntyPoints > 0 || richest.totalDocs > 0 || richest.totalCP > 0);
                  return (
                    <>
                      {list.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          {authClientsLoading || searchingAccounts
                            ? "Cargando cuentas…"
                            : "La lista es extra. Abajo registras con el correo."}
                        </p>
                      ) : (
                        <>
                        <p className="text-[11px] text-amber-200 mb-2">
                          Encender no recupera datos. Si ves ~9000 PS, esa es la cuenta vieja. Si todas siguen en 0, abre la pestaña Recuperar Datos.
                        </p>
                        <button
                          type="button"
                          onClick={() => void restoreHighestAccount()}
                          disabled={restoringHighest}
                          className="mb-2 w-full py-2 rounded-lg bg-amber-500 text-black text-xs font-bold disabled:opacity-50"
                          data-testid="button-restore-highest-modulos"
                        >
                          {restoringHighest ? "Copiando la cuenta llena…" : "Traer los 9000 PS a este Gmail"}
                        </button>
                        <div className="space-y-1 max-h-56 overflow-y-auto">
                          {list.map((c) => {
                            const jornadaOn = c.activeModules.includes("planificacion_base");
                            const isGilson = c.uid === user?.uid;
                            const isRichest = richestHasData && c.uid === richest.uid;
                            return (
                              <div
                                key={c.uid}
                                className={`flex items-center gap-2 px-2 py-2 rounded-lg text-xs ${
                                  isRichest
                                    ? "bg-amber-500/20 border border-amber-400/50"
                                    : moduleUid === c.uid
                                    ? "bg-sky-500/20 border border-sky-500/40"
                                    : "bg-white/5"
                                }`}
                              >
                                <button
                                  type="button"
                                  data-testid={`button-pick-client-${c.uid.slice(0, 6)}`}
                                  onClick={() => {
                                    setModuleUid(c.uid);
                                    setModuleEmail(c.email);
                                    setModuleNotFound(false);
                                    setModuleServerBlind(false);
                                    toast.success(
                                      `Elegida ${c.email || c.uid.slice(0, 8) + "…"} · ${c.sovereigntyPoints} PS`,
                                    );
                                  }}
                                  className="flex-1 text-left min-w-0"
                                >
                                  <span className="text-white font-bold">
                                    {c.email || (isGilson ? "tu Gilson" : `${c.uid.slice(0, 8)}…`)}
                                  </span>
                                  <span className={isRichest ? "text-amber-300 font-bold" : "text-slate-400"}>
                                    {" "}
                                    · {c.sovereigntyPoints} PS · {c.totalCP} CP · {c.rank}
                                  </span>
                                  {isRichest ? (
                                    <span className="text-amber-300 font-bold"> · ESTA ES LA LLENA</span>
                                  ) : null}
                                  {c.totalDocs > 0 ? (
                                    <span className="text-slate-400"> · {c.totalDocs} docs</span>
                                  ) : null}
                                  {jornadaOn ? (
                                    <span className="text-emerald-400"> · Jornada on</span>
                                  ) : (
                                    <span className="text-rose-400"> · Jornada off</span>
                                  )}
                                </button>
                                {!isGilson && !jornadaOn ? (
                                  <button
                                    type="button"
                                    disabled={grantingUid === c.uid}
                                    onClick={() => void grantPlanOnUid(c.uid, modulePlanId, c.email || undefined)}
                                    className="shrink-0 px-2 py-1 rounded-md bg-sky-500 text-white font-bold"
                                    data-testid={`button-encender-modulo-${c.uid.slice(0, 6)}`}
                                  >
                                    {grantingUid === c.uid ? "…" : "Encender"}
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
              )}
              <div className="flex flex-wrap gap-2 mb-3">
                {(["yape", "paypal", "manual"] as const).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setModuleSource(src)}
                    className={`px-2 py-2 rounded-lg text-xs font-bold uppercase ${
                      moduleSource === src
                        ? "bg-sky-500/30 text-sky-300 border border-sky-500/50"
                        : "bg-white/5 text-slate-400 border border-white/10"
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>
              <select
                value={modulePlanId}
                onChange={(e) => setModulePlanId(e.target.value)}
                className="w-full mb-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                data-testid="select-module-plan"
              >
                <option value="planificacion_base">Jornada Base</option>
                <option value="operativo">Ritmo del día</option>
                <option value="soberania_dia">Norte</option>
                <option value="umbral">Umbral</option>
                <option value="deposito_matricula">Universidad Matrícula</option>
                <option value="deposito_carrera">Universidad Carrera</option>
                <option value="deposito_titulo">Universidad Título</option>
              </select>
              <input
                type="text"
                value={moduleNote}
                onChange={(e) => setModuleNote(e.target.value)}
                placeholder="Nota (ej. Yape 02/06, S/ XX)"
                className="w-full mb-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              />
              <div className="flex gap-2 mb-3">
                <input
                  type="email"
                  value={moduleEmail}
                  onChange={(e) => {
                    setModuleEmail(e.target.value);
                    setModuleUid("");
                    setModuleNotFound(false);
                    setModuleServerBlind(false);
                  }}
                  placeholder="Email del comprador"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  data-testid="input-module-email"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!moduleEmail.trim()) return;
                    setModuleSearching(true);
                    setModuleSearchResult(null);
                    try {
                      const result = await lookupUserAdmin(moduleEmail.trim());
                      if (result?.found && result.uid) {
                        setModuleSearchResult(result);
                        setModuleUid(result.uid);
                        setModuleNotFound(false);
                        setModuleServerBlind(false);
                        setModuleClientWhatsapp(
                          buildClientAccountWhatsapp(
                            result.email || moduleEmail.trim(),
                            displayNameForPlan(modulePlanId),
                            "existing_pending",
                          ),
                        );
                        toast.success("Usuario encontrado. Registrar enciende el plan en esa cuenta.");
                      } else {
                        const blind = result?.adminReady === false;
                        setModuleSearchResult(result);
                        setModuleNotFound(true);
                        setModuleServerBlind(blind);
                        setModuleClientWhatsapp(
                          buildClientAccountWhatsapp(
                            moduleEmail.trim(),
                            displayNameForPlan(modulePlanId),
                            "existing_pending",
                          ),
                        );
                        const suggested = result?.suggestions?.[0]?.email;
                        if (suggested) {
                          toast.info(`No está como lo escribiste. ¿Es ${suggested}?`);
                        }
                      }
                    } catch {
                      setModuleNotFound(true);
                    }
                    setModuleSearching(false);
                  }}
                  disabled={moduleSearching}
                  className="px-4 py-2 rounded-lg bg-white/10 text-slate-300 font-bold text-sm hover:bg-white/15 disabled:opacity-50"
                  data-testid="button-search-module-user"
                >
                  {moduleSearching ? "..." : "Buscar"}
                </button>
              </div>
              {moduleSearchResult?.suggestions && moduleSearchResult.suggestions.length > 0 && (
                <div className="text-xs text-emerald-200 mb-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <p className="font-bold">Ese orden del nombre no está en Firebase. ¿Es este?</p>
                  {moduleSearchResult.suggestions.map((s) => (
                    <button
                      key={s.uid}
                      type="button"
                      className="block w-full text-left text-white font-bold underline"
                      data-testid="button-use-suggested-email"
                      onClick={() => {
                        setModuleEmail(s.email);
                        setModuleUid(s.uid);
                        setModuleNotFound(false);
                        setModuleServerBlind(false);
                        void lookupUserAdmin(s.email).then((again) => {
                          if (again?.found && again.uid) {
                            setModuleSearchResult(again);
                            setModuleUid(again.uid);
                            toast.success(`Encontrada: ${s.email}`);
                          }
                        });
                      }}
                    >
                      {s.email}
                    </button>
                  ))}
                </div>
              )}
              {gmailTypoCorrection(moduleEmail) && (
                <p className="text-xs text-amber-300 mb-3" data-testid="admin-gmail-typo">
                  Ese dominio no es Gmail. Se activará en{" "}
                  <span className="text-white font-bold">
                    {gmailTypoCorrection(moduleEmail)}
                  </span>
                  .
                </p>
              )}
              {moduleSearchResult?.found && moduleSearchResult.uid && (
                <div className="text-xs text-slate-400 mb-3 space-y-1">
                  <p>
                    {moduleSearchResult.email} · uid {moduleSearchResult.uid.slice(0, 8)}… ·{" "}
                    {moduleSearchResult.rank} · CP {moduleSearchResult.totalCP ?? 0}
                  </p>
                  {moduleSearchResult.providers?.length ? (
                    <p>Login: {moduleSearchResult.providers.join(", ")}</p>
                  ) : null}
                  {moduleSearchResult.activeModules?.length ? (
                    <p>Módulos: {moduleSearchResult.activeModules.join(", ")}</p>
                  ) : null}
                  <p>
                    WhatsApp:{" "}
                    {moduleSearchResult.whatsapp
                      ? moduleSearchResult.whatsapp
                      : "aún no lo dejó en /acceso"}
                  </p>
                </div>
              )}
              {moduleUid && (
                <p className="text-xs text-sky-300 mb-3" data-testid="admin-selected-uid">
                  UID elegido: <span className="font-mono text-white">{moduleUid.slice(0, 16)}…</span>
                  {moduleEmail ? ` · ${moduleEmail}` : " · sin Gmail — se enciende por UID"}
                </p>
              )}
              <button
                type="button"
                onClick={() => void grantModuleAdmin(moduleEmail)}
                disabled={moduleSaving || (!moduleEmail.trim() && !moduleUid.trim())}
                className="w-full px-4 py-3 rounded-lg bg-sky-500 text-white font-bold text-sm hover:bg-sky-600 disabled:opacity-50"
                data-testid="button-grant-module"
              >
                {moduleSaving
                  ? "Registrando..."
                  : moduleUid
                    ? `Encender ${displayNameForPlan(modulePlanId)} en este UID`
                    : `Registrar ${displayNameForPlan(modulePlanId)}`}
              </button>
              {moduleClientWhatsapp && (
                <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">
                    Mensaje para el cliente (WhatsApp)
                  </p>
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans mb-2">
                    {moduleClientWhatsapp}
                  </pre>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(moduleClientWhatsapp);
                        toast.success("Mensaje copiado");
                      } catch {
                        toast.error("No se pudo copiar");
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold"
                    data-testid="button-copy-client-acceso"
                  >
                    Copiar para WhatsApp
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-sm">Activaciones (Yape / MP)</h3>
                <button
                  type="button"
                  onClick={() => void loadModuleGrants()}
                  className="text-xs text-sky-400"
                  disabled={moduleGrantsLoading}
                >
                  Actualizar
                </button>
              </div>
              {moduleGrantsLoading ? (
                <p className="text-xs text-slate-500">Cargando...</p>
              ) : moduleGrants.length === 0 ? (
                <p className="text-xs text-slate-500">Sin activaciones registradas aún.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {moduleGrants.map((g) => (
                    <div key={g.id} className="p-3 rounded-lg bg-black/30 border border-white/5 text-xs">
                      <div className="flex justify-between gap-2 mb-1">
                        <span className="font-black text-sky-400">{displayNameForPlan(g.planId)}</span>
                        <span className={g.status === "granted" ? "text-emerald-400" : "text-amber-400"}>
                          {g.status === "granted" ? "activado" : "pendiente de /acceso"}
                        </span>
                      </div>
                      <p className="text-white">{g.buyerEmail}</p>
                      <p className="text-slate-500">
                        {g.source} · {new Date(g.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "vendedores" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <h3 className="text-emerald-400 font-bold mb-2">Registrar vendedor</h3>
              <p className="text-xs text-slate-400 mb-3">Genera código y comparte link: sistemicar.app/pagos?ref=CODIGO</p>
              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <input
                  value={newSellerName}
                  onChange={(e) => setNewSellerName(e.target.value)}
                  placeholder="Nombre vendedor"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                />
                <input
                  value={newSellerCode}
                  onChange={(e) => setNewSellerCode(e.target.value.toUpperCase())}
                  placeholder="CODIGO"
                  className="w-32 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => void registerSellerCode()}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-bold text-sm"
                >
                  Crear link
                </button>
              </div>
              <a href="/vendedores-planificacion" className="text-xs text-emerald-400 underline">Ver kit de vendedores</a>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-sm">Ventas atribuidas (MercadoPago)</h3>
                <button type="button" onClick={() => void loadSellerSales()} className="text-xs text-emerald-400" disabled={sellerSalesLoading}>
                  Actualizar
                </button>
              </div>
              {sellerSalesLoading ? (
                <p className="text-xs text-slate-500">Cargando...</p>
              ) : sellerSales.length === 0 ? (
                <p className="text-xs text-slate-500">Sin ventas registradas aún. Log: data/seller-sales.json</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {sellerSales.map((s) => (
                    <div key={s.id} className="p-3 rounded-lg bg-black/30 border border-white/5 text-xs">
                      <div className="flex justify-between gap-2 mb-1">
                        <span className="font-black text-emerald-400">{s.sellerRef}</span>
                        <span className="text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-white">{s.planName} · ${s.amountUsd} · comisión <span className="text-emerald-400">${s.commissionUsd}</span></p>
                      <p className="text-slate-500">{s.buyerEmail || "sin email"} · MP {s.mpPaymentId}</p>
                      {!s.commissionPaidOut ? (
                        <button
                          type="button"
                          onClick={() => void markSellerCommissionPaid(s.id)}
                          className="mt-2 px-2 py-1 rounded bg-amber-500/20 text-amber-400 font-bold"
                        >
                          Marcar comisión pagada
                        </button>
                      ) : (
                        <span className="text-emerald-500 mt-1 inline-block">Comisión pagada</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <div className="flex items-center justify-between mb-3 gap-2">
                <div>
                  <h3 className="text-sky-400 font-bold text-sm">Llamadas Vendedor Algorítmico</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Cupo hoy:{" "}
                    {vendedorCallsDaily
                      ? `${vendedorCallsDaily.used}/${vendedorCallsDaily.limit} (quedan ${vendedorCallsDaily.remaining})`
                      : "—"}
                    {" · "}Teléfono → WhatsApp · solo admin
                  </p>
                  <p className="text-[10px] text-amber-500/70 mt-1">
                    Trial Twilio: geo no basta — el destino debe estar en Verified
                    Caller IDs (error 21219) o la cuenta debe estar pagada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadVendedorCalls()}
                  className="text-xs text-sky-400 shrink-0"
                  disabled={vendedorCallsLoading}
                >
                  Actualizar
                </button>
              </div>
              {vendedorCallsLoading ? (
                <p className="text-xs text-slate-500">Cargando...</p>
              ) : vendedorCalls.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Sin llamadas. Se generan desde /vendedor con «Llámame». Log: data/vendedor-calls.json
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {vendedorCalls.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg bg-black/30 border border-white/5 text-xs">
                      <div className="flex justify-between gap-2 mb-1">
                        <span className="font-black text-sky-400">
                          C{c.codigo} · {c.planeta}
                        </span>
                        <span className="text-slate-500">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-white">
                        {c.telefono}
                        {c.sellerRef ? ` · ref ${c.sellerRef}` : ""}
                        {c.adVideo ? ` · ${c.adVideo}` : ""}
                      </p>
                      <p className="text-slate-400 mt-0.5">
                        status <span className="text-sky-300">{c.status}</span>
                        {c.canalUsado ? ` · canal ${c.canalUsado}` : ""}
                        {` · intentos ${c.intentos}`}
                      </p>
                      {c.error && (
                        <p className="text-amber-500/80 mt-1 break-all">{c.error}</p>
                      )}
                      <p className="text-slate-600 mt-1 line-clamp-2">{c.guionResumen}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
