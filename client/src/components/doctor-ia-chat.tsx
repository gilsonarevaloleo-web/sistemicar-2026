import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { DOCTOR_IA_OPEN_EVENT } from "@/lib/doctorIaBridge";
import { PLANIFICACION_DOCTOR_QUICK_PROMPTS } from "@/lib/planificacionOnboarding";
import {
  resolvePlanificacionProfile,
  type PlanificacionPlanProfile,
} from "@/lib/planificacionProfile";
import { useAuthContext } from "@/App";
import { isOwner } from "@/lib/owner";
import {
  subscribeToPrincipiosMaestros, addPrincipioMaestro, PrincipioMaestro,
  subscribeToGenomeLaws, GenomeLaw,
  subscribeToEnergyLogs, EnergyLog,
  subscribeToVehicles, Vehicle,
  subscribeToMisiones, Mision,
  subscribeToAlquimiaEntries, AlquimiaEntry,
  subscribeToBossStep, BossStep,
  subscribeToChispazos, Chispazo,
  subscribeToHopeLogs, HopeLog,
  subscribeToCodices, SavedCodice,
  subscribeToExpedientes, ExpedienteClinico,
  loadVehicleHistoryFromFirebase, VehicleHistoryEntry,
  subscribeToDailyPoints,
  subscribeToProgression, UserProgression,
  loadBossStepsHistory,
  loadSovereigntyPointsSemana, DailyPS,
  subscribeToAllCapitulosLibro, getNotasEvolucionParaDoctor, type NotaEvolucion,
} from "@/lib/persistence";
import { MessageCircle, X, Send, Stamp, Loader2, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { registrarEvento, COMPONENTES } from "@/lib/evento-universal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  canSeal?: boolean;
}

const MODULE_NAMES: Record<string, string> = {
  "/espejo": "Espejo",
  "/jornada-v4": "Jornada",
  "/alquimia": "Alquimia",
  "/esperanza": "Depósito de Esperanza",
  "/historial": "Historial",
  "/analytics": "Analíticas",
  "/rewards": "Recompensas",
  "/radar": "Radar IA",
  "/menu": "Menú Principal",
};

export function DoctorIAChat() {
  const { user } = useAuthContext();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(`chat_${Date.now()}`);
  const [principios, setPrincipios] = useState<PrincipioMaestro[]>([]);
  const [genomeLaws, setGenomeLaws] = useState<GenomeLaw[]>([]);
  const [energyLogs, setEnergyLogs] = useState<EnergyLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [alquimias, setAlquimias] = useState<AlquimiaEntry[]>([]);
  const [bossStep, setBossStep] = useState<BossStep | null>(null);
  const [chispazos, setChispazos] = useState<Chispazo[]>([]);
  const [hopeLogs, setHopeLogs] = useState<HopeLog[]>([]);
  const [codices, setCodices] = useState<SavedCodice[]>([]);
  const [expedientes, setExpedientes] = useState<ExpedienteClinico[]>([]);
  const [gordaRecord, setGordaRecord] = useState<VehicleHistoryEntry[]>([]);
  const [totalPsHoy, setTotalPsHoy] = useState<number>(0);
  const [totalPsAcumulados, setTotalPsAcumulados] = useState<number>(0);
  const [bossStepsHistory, setBossStepsHistory] = useState<BossStep[]>([]);
  const [dailyPointsSemana, setDailyPointsSemana] = useState<DailyPS[]>([]);
  const [notasActivasDoctor, setNotasActivasDoctor] = useState<NotaEvolucion[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isCreator = isOwner(user?.email);
  const currentModule = MODULE_NAMES[location] || null;
  const isPlanificacionModule = location === "/jornada-v4" || location.startsWith("/jornada-v4?");
  const [planificacionProfile, setPlanificacionProfile] =
    useState<PlanificacionPlanProfile>("base");

  useEffect(() => {
    const unsub = subscribeToPrincipiosMaestros(
      (items) => setPrincipios(items),
      (err) => console.error("Principios sub error:", err)
    );
    return () => unsub();
  }, []);

  // Cargar notas de evolución de la interfaz más activa del usuario
  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    let cancelled = false;
    const unsub = subscribeToAllCapitulosLibro(uid, async (allCaps) => {
      const counts: Record<string, number> = {};
      Object.values(allCaps).forEach(cap => {
        if (cap.interfazId) counts[cap.interfazId] = (counts[cap.interfazId] || 0) + 1;
      });
      const topInterfaz = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!topInterfaz) return;
      try {
        const notas = await getNotasEvolucionParaDoctor(uid, topInterfaz);
        if (!cancelled) setNotasActivasDoctor(notas);
      } catch { /* no bloqueante */ }
    }, () => {});
    return () => { cancelled = true; unsub(); };
  }, [user?.uid]);

  useEffect(() => {
    const unsub = subscribeToGenomeLaws(
      (items) => setGenomeLaws(items.filter(g => g.status === "validado")),
      (err) => console.error("Genome sub error:", err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    const noop = (err: Error) => console.error("Data sub error:", err);
    const unsubs = [
      subscribeToEnergyLogs(uid, (logs) => setEnergyLogs(logs.slice(0, 30)), noop),
      subscribeToVehicles(uid, (v) => setVehicles(v.slice(0, 30)), noop),
      subscribeToMisiones(uid, (m) => setMisiones(m.slice(0, 30)), noop),
      subscribeToAlquimiaEntries(uid, (a) => setAlquimias(a.slice(0, 20)), noop),
      subscribeToBossStep(uid, (b) => setBossStep(b), noop),
      subscribeToChispazos(uid, (c) => setChispazos(c.slice(0, 20)), noop),
      subscribeToHopeLogs(uid, (h) => setHopeLogs(h.slice(0, 15)), noop),
      subscribeToCodices(uid, (c) => setCodices(c.slice(0, 10)), noop),
      subscribeToExpedientes(uid, (e) => setExpedientes(e.slice(0, 5)), noop),
      subscribeToDailyPoints(uid, (d) => setTotalPsHoy(d.total), noop),
    ];
    return () => unsubs.forEach(u => u());
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    const noop = (err: Error) => console.error("Progression sub error:", err);
    const unsub = subscribeToProgression(uid, (prog) => {
      setTotalPsAcumulados(prog.sovereigntyPoints || 0);
      setPlanificacionProfile(
        resolvePlanificacionProfile(
          prog.subscriptionPlan,
          user.email,
          prog.rank,
          prog.activeModules
        )
      );
    }, noop);
    return () => unsub();
  }, [user?.uid, user?.email]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setIsOpen(true);
      if (detail?.message) setInput(detail.message);
    };
    window.addEventListener(DOCTOR_IA_OPEN_EVENT, handler);
    return () => window.removeEventListener(DOCTOR_IA_OPEN_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    loadVehicleHistoryFromFirebase(user.uid).then((history) => {
      setGordaRecord(history.slice(-15).reverse());
    }).catch(() => {});
    loadBossStepsHistory(user.uid).then((steps) => {
      setBossStepsHistory(steps);
    }).catch(() => {});
    loadSovereigntyPointsSemana(user.uid).then((series) => {
      setDailyPointsSemana(series);
    }).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading || !user) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      text: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const principiosToSend = isCreator
        ? principios
        : principios.filter((p) => !(p as any).privado);

      const espejoSesiones: any[] = [];

      const registrosCompletos = {
        energyLogs: energyLogs.map(l => ({
          text: l.text, type: l.type, points: l.points,
          fecha: l.timestamp?.toISOString?.() || l.timestamp
        })),
        vehicles: vehicles.map(v => ({
          titulo: v.titulo, status: v.status, criterioFin: v.criterioFin,
          criterioDetalle: v.criterioDetalle,
          intensidadEnergetica: v.intensidadEnergetica,
          ejes: v.ejes ? {
            enfoque: v.ejes.enfoque?.text,
            conflicto: v.ejes.conflicto?.text,
            pasos: v.ejes.pasos?.text,
            limite: v.ejes.limite?.text
          } : null,
          fecha: v.createdAt?.toISOString?.() || v.createdAt
        })),
        misiones: misiones.map(m => ({
          titulo: m.titulo, estado: m.estado,
          scores: m.scores, soberania: m.soberaniaMomento,
          comentario: m.comentario,
          fecha: m.createdAt?.toISOString?.() || m.createdAt
        })),
        alquimias: alquimias.map(a => ({
          observacion: a.observacion, crisis: a.crisis,
          leccion: a.leccion, maestria: a.maestria, oro: a.oro,
          score: a.alquimiaScore, puntos: a.totalPoints,
          fecha: a.createdAt?.toISOString?.() || a.createdAt
        })),
        bossStep: bossStep ? {
          text: bossStep.text, status: bossStep.status,
          fecha: bossStep.createdAt?.toISOString?.() || bossStep.createdAt
        } : null,
        chispazos: chispazos.map(c => ({
          text: c.text, deseoLoco: c.isDeseoLoco,
          fecha: c.createdAt?.toISOString?.() || c.createdAt
        })),
        hopeLogs: hopeLogs.map(h => ({
          text: h.text, type: h.type,
          fecha: h.createdAt?.toISOString?.() || h.createdAt
        })),
        codices: codices.slice(0, 10).map(c => ({
          titulo: c.titulo,
          contenido: c.contenido,
          tipo: c.categoria,
          nivel: c.nivel,
          fecha: c.createdAt?.toISOString?.() || ""
        })),
        expedientesClinico: expedientes.slice(0, 5).map(e => ({
          seccion: Array.isArray(e.seccion_afectada) ? e.seccion_afectada.join(", ") : e.seccion_afectada,
          codigo: e.codigo_diagnostico,
          interfaz: e.interfaz_primaria,
          interfazSec: e.interfaz_secundaria,
          vibracion: e.vibracion_final,
          estadoHabito: e.estado_habito,
          fecha: e.fecha?.toISOString?.() || ""
        })),
        gordaRecord: gordaRecord.slice(0, 15).map(g => ({
          titulo: g.titulo,
          minutos: g.totalMin,
          tipo: g.tipoReloj,
          status: g.status ?? "cumplido",
          fecha: g.fecha ? new Date(g.fecha).toLocaleDateString() : "",
          ...(g.cumplidos != null ? { cumplidos: g.cumplidos } : {}),
          ...(g.fallados != null ? { fallados: g.fallados } : {}),
          ...(g.totalSubs != null ? { totalSubs: g.totalSubs } : {}),
          ...(g.subResumen ? { subResumen: g.subResumen } : {}),
        })),
        bossSteps: bossStepsHistory.map(b => ({
          text: b.text,
          status: b.status,
          creado: b.createdAt?.toISOString?.() || "",
          completado: b.completedAt?.toISOString?.() || null
        })),
        dailyPointsSemana,
        totalPsHoy,
        totalPsAcumulados,
      };

      // Refrescar datos históricos que se cargan una sola vez para evitar contexto obsoleto
      try {
        const [freshGorda, freshBoss, freshPS] = await Promise.all([
          loadVehicleHistoryFromFirebase(user.uid),
          loadBossStepsHistory(user.uid),
          loadSovereigntyPointsSemana(user.uid),
        ]);
        if (freshGorda.length) setGordaRecord(freshGorda.slice(-15).reverse());
        if (freshBoss.length) setBossStepsHistory(freshBoss);
        if (freshPS.length) setDailyPointsSemana(freshPS);
      } catch { /* continuar con datos cacheados */ }

      registrarEvento(COMPONENTES.DOCTOR_IA);
      const res = await fetch("/api/doctor-ia-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText: userMsg.text,
          principiosMaestros: principiosToSend,
          genomeLaws,
          espejoSesiones,
          registrosCompletos,
          userName: user.displayName || "Usuario",
          userEmail: user.email,
          sessionId,
          moduleContext: currentModule,
          messageCount: messages.filter(m => m.role === "user").length + 1,
          notasEvolucionActiva: notasActivasDoctor,
          ...(isPlanificacionModule
            ? { planificacionProfile: planificacionProfile }
            : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok && !data.response) {
        throw new Error(data.error || data.detail || `HTTP ${res.status}`);
      }

      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
      }

      const hasLeyPropuesta = isCreator && data.response?.includes("LEY PROPUESTA:");

      const aiMsg: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: "assistant",
        text: data.response || data.error || "Error de conexión con Doctor IA.",
        timestamp: Date.now(),
        canSeal: hasLeyPropuesta,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_err`,
          role: "assistant",
          text: "Error de conexión. Intenta de nuevo.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    user,
    principios,
    genomeLaws,
    energyLogs,
    vehicles,
    misiones,
    alquimias,
    bossStep,
    chispazos,
    hopeLogs,
    codices,
    expedientes,
    gordaRecord,
    bossStepsHistory,
    dailyPointsSemana,
    totalPsHoy,
    totalPsAcumulados,
    isCreator,
    sessionId,
    currentModule,
    isPlanificacionModule,
    planificacionProfile,
    notasActivasDoctor,
    messages,
  ]);

  const sealAsLaw = async (messageText: string) => {
    const leyMatch = messageText.match(/LEY PROPUESTA:\s*(.+?)(?:\n|$)/);
    const textoLey = leyMatch ? leyMatch[1].trim() : messageText.slice(0, 200);

    try {
      await addPrincipioMaestro({
        texto: textoLey,
        fuente: "doctor_ia_chat",
        moduloOrigen: currentModule || "chat",
        contexto: "Sellada desde Diálogo Soberano por Gilson",
      });
      toast.success("Ley sellada como Principio Maestro", {
        style: { backgroundColor: "#1a1a1a", border: "1px solid #D4AF37", color: "#D4AF37" },
        duration: 4000,
      });
    } catch (err) {
      console.error("Seal error:", err);
      toast.error("Error al sellar ley");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const COBALT = "#1E40FF";
  const STEEL = "#6B7280";
  const GOLD = "#D4AF37";
  const borderColor = isCreator ? COBALT : isPlanificacionModule ? GOLD : STEEL;
  const accentGlow = isCreator
    ? "0 0 20px rgba(30,64,255,0.3)"
    : isPlanificacionModule
      ? "0 0 18px rgba(212,175,55,0.25)"
      : "0 0 15px rgba(107,114,128,0.2)";
  const chatTitle = isCreator
    ? "MODO CREADOR"
    : isPlanificacionModule
      ? "GUÍA PLANIFICACIÓN"
      : "DOCTOR IA - SISTEMICAR";

  const hiddenPages = [
    "/bienvenida",
    "/acceso",
    "/pagos",
    "/terminos-condiciones",
    "/libro-reclamaciones",
    "/embudo",
    "/gracias-compra",
    "/umbral-leads",
    "/ventas-espejo",
    "/ventas-jornada",
    "/vendedor",
    "/jornada-v4", // Dual Kernel: sin FAB ni ~10 listeners Firebase
    "/umbral/v2", // Consola: sin FAB robando toques sobre modos/códigos
    "/umbral/entrada",
    "/umbral/metricas",
  ];
  if (
    !user ||
    hiddenPages.includes(location) ||
    location.startsWith("/jornada-v4?") ||
    location.startsWith("/umbral/")
  ) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-6 z-50 p-4 rounded-full shadow-lg transition-all hover:scale-110"
            style={{
              backgroundColor: "#0a0a0a",
              border: `2px solid ${borderColor}`,
              boxShadow: accentGlow,
            }}
            data-testid="btn-open-doctor-ia"
          >
            <MessageCircle size={22} style={{ color: borderColor }} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[380px] max-w-[95vw] flex flex-col"
            style={{
              backgroundColor: "#080808",
              borderLeft: `2px solid ${borderColor}`,
              boxShadow: `-4px 0 30px rgba(0,0,0,0.8)`,
            }}
            data-testid="panel-doctor-ia"
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: `${borderColor}40` }}
            >
              <div className="flex items-center gap-2">
                {isCreator ? (
                  <Sparkles size={16} style={{ color: COBALT }} />
                ) : (
                  <MessageCircle size={16} style={{ color: STEEL }} />
                )}
                <div>
                  <h3
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: borderColor }}
                    data-testid="text-chat-title"
                  >
                    {chatTitle}
                  </h3>
                  {currentModule && (
                    <p className="text-[9px] text-slate-500">
                      Contexto: {currentModule}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                data-testid="btn-close-doctor-ia"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" data-testid="chat-messages-container">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      border: `1px solid ${borderColor}30`,
                      backgroundColor: `${borderColor}10`,
                    }}
                  >
                    <MessageCircle size={20} style={{ color: borderColor }} />
                  </div>
                  <p className="text-xs text-slate-400">
                    {isCreator
                      ? "Modo Entrenamiento activo. Analiza patrones, formula leyes, entrena al sistema."
                      : isPlanificacionModule
                        ? "Pregunta cómo usar segmentos, la flota o desglosadores. Respuestas cortas con un paso concreto."
                        : "Escribe tu situaci\u00f3n. El Doctor IA aplicar\u00e1 las leyes de SISTEMICAR a tu caso."}
                  </p>
                  {isPlanificacionModule && !isCreator && (
                    <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                      {PLANIFICACION_DOCTOR_QUICK_PROMPTS.map(q => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setInput(q)}
                          className="text-[9px] px-2 py-1 rounded-full border border-white/10 text-slate-400 hover:text-white hover:border-amber-500/40"
                          data-testid={`doctor-quick-${q.slice(0, 12)}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                  {currentModule && (
                    <p className="text-[10px] text-slate-500 mt-2">
                      Analizando desde: {currentModule}
                    </p>
                  )}
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                    msg.role === "user"
                      ? "ml-auto bg-white/5 text-white"
                      : "mr-auto text-slate-200"
                  )}
                  style={
                    msg.role === "assistant"
                      ? {
                          backgroundColor: `${borderColor}08`,
                          border: `1px solid ${borderColor}20`,
                        }
                      : undefined
                  }
                  data-testid={`chat-message-${msg.role}-${msg.id}`}
                >
                  {msg.role === "assistant" && (
                    <p
                      className="text-[9px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: borderColor }}
                    >
                      {isCreator ? "ARQUITECTO" : "DOCTOR IA"}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {msg.canSeal && isCreator && (
                    <button
                      onClick={() => sealAsLaw(msg.text)}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105"
                      style={{
                        backgroundColor: "#D4AF3720",
                        border: "1px solid #D4AF3740",
                        color: "#D4AF37",
                      }}
                      data-testid={`btn-seal-law-${msg.id}`}
                    >
                      <Stamp size={12} />
                      Sellar como Ley
                    </button>
                  )}
                </div>
              ))}

              {loading && (
                <div
                  className="mr-auto max-w-[90%] rounded-xl px-3 py-2 flex items-center gap-2"
                  style={{
                    backgroundColor: `${borderColor}08`,
                    border: `1px solid ${borderColor}20`,
                  }}
                >
                  <Loader2 size={14} className="animate-spin" style={{ color: borderColor }} />
                  <span className="text-[10px] text-slate-400">Analizando...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div
              className="px-4 py-3 border-t"
              style={{ borderColor: `${borderColor}20` }}
            >
              <div
                className="flex items-end gap-2 rounded-xl px-3 py-2"
                style={{
                  backgroundColor: "#0f0f0f",
                  border: `1px solid ${borderColor}20`,
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isCreator
                      ? "Analiza, formula, entrena..."
                      : isPlanificacionModule
                        ? "Ej: \u00bfPor d\u00f3nde empiezo hoy?"
                        : "Describe tu situaci\u00f3n..."
                  }
                  className="flex-1 bg-transparent text-white text-xs resize-none focus:outline-none placeholder:text-slate-600 max-h-20"
                  rows={1}
                  data-testid="input-doctor-ia-message"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="p-1.5 rounded-lg transition-all disabled:opacity-30 hover:bg-white/5"
                  data-testid="btn-send-doctor-ia"
                >
                  <Send size={14} style={{ color: borderColor }} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[9px] text-slate-600">
                  {isCreator ? "Gilson Ar\u00e9valo | Creador" : "Sesi\u00f3n privada"}
                </p>
                {messages.length > 0 && (
                  <button
                    onClick={() => {
                      setMessages([]);
                      setSessionId(`chat_${Date.now()}`);
                    }}
                    className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors"
                    data-testid="btn-clear-chat"
                  >
                    Limpiar chat
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
