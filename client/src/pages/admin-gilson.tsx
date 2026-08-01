import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, CheckCircle, Crown, Zap, Eye, EyeOff, RefreshCw, DollarSign, AlertTriangle, Database, ArrowRight, FlaskConical, Star, Trash2, Brain, Dna, X, Sprout } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { findAccountsWithData, migrateDataToNewUid, subscribeToPrincipiosMaestros, addPrincipioMaestro, deletePrincipioMaestro, PrincipioMaestro, subscribeToEnergyLogs, EnergyLog, subscribeToVehicles, Vehicle, subscribeToGenomeLaws, saveGenomeLaw, updateGenomeLawStatus, deleteGenomeLaw, GenomeLaw, getAllProspectos } from "@/lib/persistence";
import { useAuthContext } from "@/App";
import { isOwner } from "@/lib/owner";
import { auth, getUserEmail } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

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
}

type AdminUserLookup = {
  found: boolean;
  adminReady: boolean;
  uid?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string | null;
  providers?: string[];
  rank?: string;
  totalCP?: number;
  activeModules?: string[];
  subscriptionPlan?: string | null;
};

export default function AdminGilson() {
  const { user } = useAuthContext();
  const [, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "payments" | "recovery" | "laboratorio" | "adn" | "creditos" | "modulos" | "vendedores">("users");
  const [loginLoading, setLoginLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [searchingAccounts, setSearchingAccounts] = useState(false);
  const [migratingUid, setMigratingUid] = useState<string | null>(null);
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
  const [modulePlanId, setModulePlanId] = useState("planificacion_base");
  const [moduleSource, setModuleSource] = useState<"yape" | "paypal" | "manual">("yape");
  const [moduleNote, setModuleNote] = useState("");
  const [moduleSaving, setModuleSaving] = useState(false);
  const [moduleSearchResult, setModuleSearchResult] = useState<AdminUserLookup | null>(null);
  const [moduleSearching, setModuleSearching] = useState(false);
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

  const searchAccounts = async () => {
    setSearchingAccounts(true);
    try {
      const found = await findAccountsWithData();
      setAccounts(found);
      if (found.length === 0) {
        toast.info("No se encontraron cuentas con datos");
      } else {
        toast.success(`Se encontraron ${found.length} cuentas con datos`);
      }
    } catch (error) {
      toast.error("Error buscando cuentas");
    } finally {
      setSearchingAccounts(false);
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
    setMigratingUid(oldUid);
    try {
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
      return { found: false, adminReady: data.adminReady ?? false };
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

  const grantModuleAdmin = async (targetEmail: string) => {
    if (!targetEmail.trim()) {
      toast.error("Ingresa el email del comprador");
      return;
    }
    setModuleSaving(true);
    try {
      const headers = await getAdminHeaders();
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
      if (!res.ok) throw new Error(data.error || "Error activando módulo");
      toast.success(data.message || "Módulo activado");
      setModuleNote("");
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
    if (activeTab === "vendedores" && isAuthenticated) {
      void loadSellerSales();
    }
  }, [activeTab, isAuthenticated]);

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
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
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
  }, [isAuthenticated, user]);

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
    <div className="min-h-screen p-4" style={{ backgroundColor: "#020202" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="text-amber-500" size={24} />
            <h1 className="text-xl font-black text-white">Panel Admin</h1>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("adminAuth");
              setIsAuthenticated(false);
            }}
            className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-bold"
          >
            Salir
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeTab === "users" ? "bg-amber-500 text-white" : "bg-white/5 text-slate-400"
            }`}
          >
            <Users size={16} className="inline mr-2" />
            Usuarios ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeTab === "payments" ? "bg-amber-500 text-white" : "bg-white/5 text-slate-400"
            }`}
          >
            <DollarSign size={16} className="inline mr-2" />
            Pagos ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab("recovery")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeTab === "recovery" ? "bg-green-500 text-white" : "bg-white/5 text-slate-400"
            }`}
          >
            <Database size={16} className="inline mr-2" />
            Recuperar Datos
          </button>
          <button
            onClick={() => setActiveTab("laboratorio")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeTab === "laboratorio" ? "bg-purple-500 text-white" : "bg-white/5 text-slate-400"
            }`}
          >
            <FlaskConical size={16} className="inline mr-2" />
            Laboratorio
          </button>
            <button
              onClick={() => setActiveTab("adn")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "adn" ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-400"
              }`}
              data-testid="tab-adn"
            >
              ADN Soberano
            </button>
            <button
              onClick={() => setActiveTab("creditos")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "creditos" ? "bg-cyan-500 text-white" : "bg-white/5 text-slate-400"
              }`}
              data-testid="tab-creditos"
            >
              <DollarSign size={14} className="inline mr-1" />
              Créditos Espejo
            </button>
            <button
              onClick={() => setActiveTab("modulos")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "modulos" ? "bg-sky-500 text-white" : "bg-white/5 text-slate-400"
              }`}
              data-testid="tab-modulos"
            >
              <Zap size={14} className="inline mr-1" />
              Módulos
            </button>
            <button
              onClick={() => setActiveTab("vendedores")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "vendedores" ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400"
              }`}
              data-testid="tab-vendedores"
            >
              <Users size={14} className="inline mr-1" />
              Vendedores
            </button>
            <button
              onClick={() => navigate("/admin-semillas")}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/30"
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
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-start gap-3 mb-4">
                <Database className="text-green-400 flex-shrink-0" size={24} />
                <div>
                  <h3 className="text-green-400 font-bold mb-1">Recuperar Datos de Cuenta Anterior</h3>
                  <p className="text-xs text-slate-400">
                    Busca cuentas con datos y migra los registros a tu cuenta actual ({user?.email || user?.uid?.slice(0, 8) + "..."})
                  </p>
                </div>
              </div>
              <button
                onClick={searchAccounts}
                disabled={searchingAccounts}
                className="w-full py-3 rounded-xl bg-green-500 text-white font-bold disabled:opacity-50"
              >
                {searchingAccounts ? "Buscando cuentas..." : "Buscar Cuentas con Datos"}
              </button>
            </div>

            {accounts.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 mb-2">
                  Se encontraron {accounts.length} cuentas. Tu UID actual: <span className="text-green-400 font-mono">{user?.uid?.slice(0, 12)}...</span>
                </p>
                {accounts.map((account) => (
                  <motion.div
                    key={account.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-4 rounded-xl border ${
                      account.uid === user?.uid 
                        ? "bg-green-500/10 border-green-500/30" 
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-mono text-sm">
                          {account.uid.slice(0, 20)}...
                          {account.uid === user?.uid && (
                            <span className="ml-2 text-green-400 text-xs">(TU CUENTA ACTUAL)</span>
                          )}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-amber-400 font-bold">{account.totalCP} pts</span>
                          <span className="text-xs text-slate-500">Rango: {account.rank.toUpperCase()}</span>
                          {account.lastUpdated && (
                            <span className="text-xs text-slate-600">
                              {account.lastUpdated.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      {account.uid !== user?.uid && (
                        <button
                          onClick={() => migrateFromAccount(account.uid)}
                          disabled={migratingUid === account.uid}
                          className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2"
                        >
                          {migratingUid === account.uid ? (
                            "Migrando..."
                          ) : (
                            <>
                              Migrar <ArrowRight size={16} />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
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
              <h3 className="text-sky-400 font-bold mb-3">Activar Planificación (Yape / manual)</h3>
              <p className="text-xs text-slate-400 mb-4">
                Activa módulos en Firebase Auth + Firestore. El comprador debe haber iniciado sesión con Google usando el mismo correo que pagó por Yape.
              </p>
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
                  onChange={(e) => setModuleEmail(e.target.value)}
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
                        toast.success("Usuario encontrado en Firebase Auth");
                      } else {
                        setModuleSearchResult(null);
                        toast.info(
                          result?.adminReady === false
                            ? "No encontrado. Configura FIREBASE_SERVICE_ACCOUNT_JSON en el servidor para activar módulos."
                            : "No hay cuenta con ese correo en Firebase Auth. Debe iniciar sesión con Google al menos una vez."
                        );
                      }
                    } catch {
                      toast.error("Error buscando usuario");
                    }
                    setModuleSearching(false);
                  }}
                  disabled={moduleSearching}
                  className="px-4 py-2 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-sm hover:bg-sky-500/30 disabled:opacity-50"
                  data-testid="button-search-module-user"
                >
                  {moduleSearching ? "..." : "Buscar"}
                </button>
              </div>
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
                  {moduleSearchResult.adminReady === false && (
                    <p className="text-amber-400">
                      Servidor sin FIREBASE_SERVICE_ACCOUNT_JSON — la activación puede fallar.
                    </p>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => void grantModuleAdmin(moduleEmail)}
                disabled={moduleSaving || !moduleEmail.trim()}
                className="w-full px-4 py-3 rounded-lg bg-sky-500 text-white font-bold text-sm hover:bg-sky-600 disabled:opacity-50"
                data-testid="button-grant-module"
              >
                {moduleSaving ? "Activando..." : `Activar ${modulePlanId}`}
              </button>
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
          </div>
        )}
      </div>
    </div>
  );
}
