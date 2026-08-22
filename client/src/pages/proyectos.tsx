import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  startTransition,
  type ReactNode,
} from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  ArrowLeft,
  Trash2,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Link2,
  Pencil,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthContext } from "@/App";
import {
  getProyectos,
  getProyectosLocal,
  getProyectoById,
  getPeldanosByProyecto,
  getPeldanosByProyectoLocal,
  addProyecto,
  updateProyecto,
  deleteProyecto,
  resetProyecto,
  addPeldanoIdea,
  deletePeldanoIdea,
  reorderPeldano,
  reorderProyecto,
  computeProyectoStats,
  subscribeToProyectos,
  buildLaunchUrl,
  updateProyectoClaridadActiva,
  setOleadaComoDireccion,
  addOleadaPunto,
  updateOleadaPunto,
  deleteOleadaPunto,
  reorderOleadaPunto,
  setPuntoProduccion,
  type Proyecto,
  type ProyectoPeldano,
  type ProyectoEtiqueta,
  type OleadaPuntoStatus,
} from "@/lib/proyectos";
import {
  buildDefaultClaridadDireccion,
  getOleadaEnCurso,
  resolveClaridadParaProyecto,
  type RutasMentalesSet,
} from "@/lib/claridadDireccion";
import { resolvePuntoProduccion, sortOleadaPuntos } from "@/lib/oleadaPuntos";
import { RUTA_BANDA_META } from "@/lib/rutaEnfoque";
import { RutasMentalesGrafo } from "@/components/RutasMentalesGrafo";
import { RutasMentalesEditor } from "@/components/RutasMentalesEditor";
import { OleadaDesglosePanel } from "@/components/OleadaDesglosePanel";
import { PeldanoSituacionArbol } from "@/components/PeldanoSituacionArbol";
import { PeldanoDecisionesEnumeradas } from "@/components/PeldanoDecisionesEnumeradas";
import { PasosDadosCalendar } from "@/components/PasosDadosCalendar";
import { getJournalDateString } from "@/lib/segmentTime";
import { JORNADA_MODULE } from "@/lib/jornadaBrand";
import { useDualKernelMotorsQuiet } from "@/lib/dualKernelQuiet";
import { resolveMinutosNorteDisplay } from "@/lib/rutaMinutosSituacionProyecto";

const PIZARRA = "#0a0a0a";
const CYAN = "#00FFC3";
const GOLD = "#D4AF37";
const PLATA = "#C0C0C0";
const NARANJA = "#F97316";
const PROYECTO_COLORS = ["#38BDF8", "#A855F7", "#F97316", "#10b981", "#D4AF37", "#f87171"];

function formatFecha(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}

function formatTipoOrigen(tipo?: "tiempo" | "situacion") {
  if (tipo === "tiempo") return "Tiempo";
  if (tipo === "situacion") return "Situación";
  return "—";
}

function ackDireccionTap() {
  try {
    navigator.vibrate?.(14);
  } catch {
    /* desktop / iOS sin haptic */
  }
}

/** Flechas de orden: confirman el toque al instante (press + pulso) para que no se reiteren clics. */
function BotonesDireccion({
  tint,
  pulseDir,
  disabledUp,
  disabledDown,
  onUp,
  onDown,
  testIdUp,
  testIdDown,
  labelUp,
  labelDown,
  orientation = "vertical",
}: {
  tint: string;
  pulseDir?: "up" | "down" | null;
  disabledUp?: boolean;
  disabledDown?: boolean;
  onUp: () => void;
  onDown: () => void;
  testIdUp: string;
  testIdDown: string;
  labelUp: string;
  labelDown: string;
  orientation?: "vertical" | "horizontal";
}) {
  const [held, setHeld] = useState<"up" | "down" | null>(null);

  const renderBtn = (dir: "up" | "down") => {
    const disabled = dir === "up" ? !!disabledUp : !!disabledDown;
    const onClick = dir === "up" ? onUp : onDown;
    const testId = dir === "up" ? testIdUp : testIdDown;
    const label = dir === "up" ? labelUp : labelDown;
    const Icon = dir === "up" ? ChevronUp : ChevronDown;
    const on = held === dir || pulseDir === dir;
    return (
      <button
        type="button"
        disabled={disabled}
        onPointerDown={() => {
          if (disabled) return;
          setHeld(dir);
        }}
        onPointerUp={() => setHeld(null)}
        onPointerCancel={() => setHeld(null)}
        onPointerLeave={() => setHeld(null)}
        onClick={e => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          "flex items-center justify-center touch-manipulation select-none",
          "transition-[transform,background-color,box-shadow,color] duration-100 ease-out",
          "disabled:opacity-20 disabled:pointer-events-none",
          orientation === "vertical" ? "flex-1 min-h-[40px] min-w-[40px]" : "p-1.5 rounded-md",
          !on && "text-slate-500 hover:text-white hover:bg-white/10"
        )}
        style={{
          color: on ? tint : undefined,
          backgroundColor: on ? `${tint}30` : undefined,
          boxShadow: on ? `0 0 14px ${tint}55` : undefined,
          transform: on ? "scale(0.88)" : undefined,
        }}
        aria-label={label}
        aria-pressed={on}
        data-testid={testId}
      >
        <Icon size={orientation === "vertical" ? 16 : 14} />
      </button>
    );
  };

  return (
    <div
      className={
        orientation === "vertical"
          ? "flex flex-col border-r border-white/5 shrink-0 bg-white/[0.03]"
          : "flex items-center"
      }
    >
      {renderBtn("up")}
      {renderBtn("down")}
    </div>
  );
}

function ProyectoIcono({
  etiqueta,
  color,
  size = 22,
}: {
  etiqueta: ProyectoEtiqueta;
  color?: string;
  size?: number;
}) {
  const tint = color ?? (etiqueta === "centro" ? GOLD : CYAN);
  if (etiqueta === "centro") return <Sparkles size={size} style={{ color: tint }} />;
  return <Layers size={size} style={{ color: tint }} />;
}

/** Sección colapsable del detalle Hub — acorta el scroll largo. */
function HubCollapsible({
  title,
  tint,
  icon,
  count,
  defaultOpen = false,
  children,
  testId,
}: {
  title: string;
  tint: string;
  icon?: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="mb-4 rounded-xl border overflow-hidden"
      style={{ backgroundColor: PIZARRA, borderColor: "rgba(255,255,255,0.1)" }}
      data-testid={testId}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full p-3 flex items-center justify-between gap-2 text-left"
      >
        <span
          className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5"
          style={{ color: tint }}
        >
          {icon}
          {title}
          {count != null ? (
            <span
              className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-black"
              style={{ backgroundColor: `${tint}18`, color: tint }}
            >
              {count}
            </span>
          ) : null}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-slate-500 shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-slate-500 shrink-0" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="p-3">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Formulario aislado: el tipado no pelea con re-renders del listado/sync del Hub. */
function NuevoProyectoForm({
  creating,
  onCancel,
  onCreate,
}: {
  creating: boolean;
  onCancel: () => void;
  onCreate: (data: { titulo: string; etiqueta: ProyectoEtiqueta; nota: string }) => void | Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [etiqueta, setEtiqueta] = useState<ProyectoEtiqueta>("proyecto");
  const [nota, setNota] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="p-4 rounded-xl border border-white/10 mb-4 space-y-3"
      style={{ backgroundColor: PIZARRA }}
    >
      <input
        value={titulo}
        onChange={e => setTitulo(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            void onCreate({ titulo, etiqueta, nota });
          }
        }}
        placeholder="Nombre (ej: Costura, Salud…)"
        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none"
        autoFocus
        autoComplete="off"
        data-testid="input-nuevo-proyecto-titulo"
      />
      <div className="flex gap-2">
        {(["proyecto", "centro"] as const).map(e => (
          <button
            key={e}
            type="button"
            onClick={() => setEtiqueta(e)}
            className={cn(
              "flex-1 py-2 rounded-lg text-[9px] font-bold uppercase",
              etiqueta === e ? "text-white" : "text-slate-500"
            )}
            style={
              etiqueta === e
                ? { backgroundColor: `${CYAN}25`, border: `1px solid ${CYAN}50` }
                : { border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            {e}
          </button>
        ))}
      </div>
      <textarea
        value={nota}
        onChange={e => setNota(e.target.value)}
        placeholder="Opcional: qué tiempo te libera esto…"
        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-slate-300 text-[11px] resize-none min-h-[50px] focus:outline-none"
        data-testid="input-nuevo-proyecto-nota"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={creating}
          className="flex-1 py-2 text-[10px] font-bold text-slate-500 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void onCreate({ titulo, etiqueta, nota })}
          disabled={creating || !titulo.trim()}
          className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase disabled:opacity-50"
          style={{ backgroundColor: CYAN, color: "#000" }}
          data-testid="btn-crear-proyecto"
        >
          {creating ? "Creando…" : "Crear"}
        </button>
      </div>
    </motion.div>
  );
}

export default function ProyectosPage() {
  const { user } = useAuthContext();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const detailId = params.get("id");
  // Ring→Hub: diferir Firestore hasta soft-start (mismo patrón que Admin/Espejo/Menú).
  const motorsQuiet = useDualKernelMotorsQuiet();

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [peldanos, setPeldanos] = useState<ProyectoPeldano[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newIdeaTitulo, setNewIdeaTitulo] = useState("");
  const [expandedConq, setExpandedConq] = useState<string | null>(null);
  const [notaEdit, setNotaEdit] = useState("");
  const [claridadEdit, setClaridadEdit] = useState<RutasMentalesSet | null>(null);
  const [oleadaTituloEdit, setOleadaTituloEdit] = useState("");
  const [guardandoClaridad, setGuardandoClaridad] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [creatingProyecto, setCreatingProyecto] = useState(false);
  /** Diferir editor/calendario: abrir detalle no debe montar todo el árbol de golpe. */
  const [detailHeavyReady, setDetailHeavyReady] = useState(false);
  /** Escalera: mostrar solo los N más recientes; el resto bajo “mostrar más”. */
  const [conquistadosVisible, setConquistadosVisible] = useState(5);
  /** Detalle Hub: pestañas para separar Enfoque / Jornada / Escalera. */
  const [detailTab, setDetailTab] = useState<"enfoque" | "jornada" | "escalera">("enfoque");
  /** Dirección: lectura limpia por defecto; inputs detrás de [Editar Dirección]. */
  const [editandoDireccion, setEditandoDireccion] = useState(false);
  const [focoBusy, setFocoBusy] = useState<"reset" | "delete" | null>(null);
  /** Pulso breve en la flecha + tarjeta para confirmar que el orden ya se aplicó. */
  const [ordenPulse, setOrdenPulse] = useState<{ id: string; dir: "up" | "down" } | null>(null);
  const ordenPulseTimerRef = useRef<number | null>(null);
  const detailIdRef = useRef(detailId);
  detailIdRef.current = detailId;
  const proyectosLenRef = useRef(0);
  proyectosLenRef.current = proyectos.length;
  const motorsQuietRef = useRef(motorsQuiet);
  motorsQuietRef.current = motorsQuiet;

  const ackOrden = useCallback((id: string, dir: "up" | "down") => {
    ackDireccionTap();
    setOrdenPulse({ id, dir });
    if (ordenPulseTimerRef.current) window.clearTimeout(ordenPulseTimerRef.current);
    ordenPulseTimerRef.current = window.setTimeout(() => setOrdenPulse(null), 480);
  }, []);

  const applyDetailState = useCallback((p: Proyecto | null, pel: ProyectoPeldano[]) => {
    setProyecto(p);
    setPeldanos(pel);
    setNotaEdit(p?.nota ?? "");
    setOleadaTituloEdit(p?.oleadaTitulo ?? "");
    if (p) {
      const claridad = resolveClaridadParaProyecto(p, pel) ?? buildDefaultClaridadDireccion({
        tituloProyecto: p.titulo,
        etiqueta: p.etiqueta,
        focoTitulo: p.oleadaTitulo ?? p.titulo,
      });
      setClaridadEdit(claridad);
    } else {
      setClaridadEdit(null);
    }
  }, []);

  const syncListFromRemote = useCallback(async () => {
    if (!user) return;
    setProyectos(await getProyectos(user.uid));
  }, [user]);

  const reloadDetail = useCallback(async () => {
    if (!user || !detailId) return;
    const localP = getProyectosLocal(user.uid).find(p => p.id === detailId) ?? null;
    const localPel = getPeldanosByProyectoLocal(user.uid, detailId);
    if (localP) {
      applyDetailState(localP, localPel);
      setDetailLoading(false);
      void Promise.all([
        getProyectoById(user.uid, detailId),
        getPeldanosByProyecto(user.uid, detailId),
      ]).then(([p, pel]) => applyDetailState(p, pel));
      return;
    }
    setDetailLoading(true);
    try {
      const [p, pel] = await Promise.all([
        getProyectoById(user.uid, detailId),
        getPeldanosByProyecto(user.uid, detailId),
      ]);
      applyDetailState(p, pel);
    } finally {
      setDetailLoading(false);
    }
  }, [user, detailId, applyDetailState]);

  useEffect(() => {
    if (!user) return;
    // Liberar overflow residual del sheet de lanzamiento (bloqueo táctil en móvil).
    if (document.body.style.overflow === "hidden") {
      document.body.style.overflow = "";
    }
    const local = getProyectosLocal(user.uid);
    setProyectos(local);
    // Listado local al instante: la UI debe responder aunque el soft-start aún corra.
    setLoading(false);
    // Solo leer local en el evento: re-fetch remoto aquí martillaba Firestore y el hilo principal.
    const unsub = subscribeToProyectos(user.uid, () => {
      startTransition(() => {
        setProyectos(getProyectosLocal(user.uid));
      });
      if (detailIdRef.current && !motorsQuietRef.current) void reloadDetail();
    });
    return () => {
      unsub();
    };
  }, [user, reloadDetail]);

  useEffect(() => {
    if (!user || motorsQuiet) return;
    setLoading(proyectosLenRef.current === 0);
    void syncListFromRemote().finally(() => setLoading(false));
  }, [user, motorsQuiet, syncListFromRemote]);

  useEffect(() => {
    if (!detailId) {
      setProyecto(null);
      setPeldanos([]);
      setDetailLoading(false);
      setDetailHeavyReady(false);
      return;
    }
    // Detalle: pintar local al instante (el gesto de abrir no espera red).
    if (user) {
      const localP = getProyectosLocal(user.uid).find(p => p.id === detailId) ?? null;
      const localPel = getPeldanosByProyectoLocal(user.uid, detailId);
      if (localP) applyDetailState(localP, localPel);
    }
  }, [detailId, user, applyDetailState]);

  useEffect(() => {
    if (!detailId) {
      setDetailHeavyReady(false);
      return;
    }
    setDetailHeavyReady(false);
    setConquistadosVisible(5);
    setExpandedConq(null);
    setDetailTab("enfoque");
    setEditandoDireccion(false);
    const heavyId = window.setTimeout(() => setDetailHeavyReady(true), 120);
    return () => window.clearTimeout(heavyId);
  }, [detailId]);

  useEffect(() => {
    return () => {
      if (ordenPulseTimerRef.current) window.clearTimeout(ordenPulseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!detailId || motorsQuiet) return;
    const remoteId = window.setTimeout(() => {
      void reloadDetail();
    }, 280);
    return () => window.clearTimeout(remoteId);
  }, [detailId, motorsQuiet, reloadDetail]);

  const openProyectoDetalle = useCallback(
    (id: string) => {
      if (!user) return;
      // Sembrar detalle ANTES del navigate: el primer paint ya es interactivo.
      // Sin startTransition: con hilo saturado la transición diferida nunca pintaba.
      const fromList = proyectos.find(p => p.id === id) ?? null;
      const localP =
        fromList ?? getProyectosLocal(user.uid).find(p => p.id === id) ?? null;
      const localPel = getPeldanosByProyectoLocal(user.uid, id);
      if (localP) {
        applyDetailState(localP, localPel);
        setDetailHeavyReady(false);
      }
      navigate(`/proyectos?id=${encodeURIComponent(id)}`);
    },
    [user, proyectos, applyDetailState, navigate]
  );

  const stats = useMemo(() => computeProyectoStats(peldanos), [peldanos]);
  const minutosNorte = resolveMinutosNorteDisplay(
    stats.minutosTotales,
    proyecto?.segundosNorteSituacion
  );
  // Ideas reales — nunca sombras de segmento (evita ruido "Desarrollo personal" × N).
  const ideas = useMemo(
    () => peldanos.filter(p => p.estado === "idea" && !p.origenSegmento),
    [peldanos]
  );
  const conquistados = useMemo(
    () =>
      peldanos
        .filter(p => p.estado === "conquistado")
        .sort((a, b) => (b.cerradoAt ?? 0) - (a.cerradoAt ?? 0)),
    [peldanos]
  );
  const hoyFecha = useMemo(() => getJournalDateString(), []);
  const enCursoPlan = useMemo(
    () =>
      peldanos.filter(
        p =>
          p.estado === "en_curso" &&
          p.origenSegmento &&
          p.planillaFecha === hoyFecha
      ),
    [peldanos, hoyFecha]
  );
  const oleadaActiva = useMemo(() => getOleadaEnCurso(peldanos), [peldanos]);
  const oleadaPeldano = useMemo(
    () =>
      peldanos.find(
        p =>
          p.estado === "en_curso" &&
          !p.origenSegmento &&
          (oleadaActiva?.id ? p.id === oleadaActiva.id : p.titulo === oleadaActiva?.titulo)
      ) ?? null,
    [peldanos, oleadaActiva]
  );

  const oleadaPuntos = useMemo(
    () => sortOleadaPuntos(oleadaPeldano?.oleadaPuntos ?? []),
    [oleadaPeldano]
  );
  const oleadaPuntoProduccion = useMemo(
    () =>
      resolvePuntoProduccion({
        puntoProduccionId: oleadaPeldano?.puntoProduccionId,
        oleadaPuntos: oleadaPuntos,
      }),
    [oleadaPeldano?.puntoProduccionId, oleadaPuntos]
  );

  const refreshOleadaPeldanoLocal = useCallback(
    (updated: ProyectoPeldano | null) => {
      if (!updated) return;
      setPeldanos(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    },
    []
  );

  const handleGuardarClaridad = async () => {
    if (!user || !detailId || !claridadEdit) return;
    setGuardandoClaridad(true);
    try {
      await updateProyectoClaridadActiva(user.uid, detailId, claridadEdit, oleadaTituloEdit);
      await reloadDetail();
      setEditandoDireccion(false);
    } finally {
      setGuardandoClaridad(false);
    }
  };

  const handleUsarIdeaComoOleada = async (peldanoId: string) => {
    if (!user || !detailId) return;
    await setOleadaComoDireccion(user.uid, detailId, peldanoId);
    await reloadDetail();
  };

  const handleAddOleadaPunto = async (titulo: string) => {
    if (!user || !oleadaPeldano) return;
    const updated = await addOleadaPunto(user.uid, oleadaPeldano.id, titulo);
    refreshOleadaPeldanoLocal(updated);
  };

  const handleUpdateOleadaPuntoTitulo = async (puntoId: string, titulo: string) => {
    if (!user || !oleadaPeldano) return;
    const updated = await updateOleadaPunto(user.uid, oleadaPeldano.id, puntoId, { titulo });
    refreshOleadaPeldanoLocal(updated);
  };

  const handleCycleOleadaPuntoStatus = async (puntoId: string, next: OleadaPuntoStatus) => {
    if (!user || !oleadaPeldano) return;
    const updated = await updateOleadaPunto(user.uid, oleadaPeldano.id, puntoId, { status: next });
    refreshOleadaPeldanoLocal(updated);
  };

  const handleDeleteOleadaPunto = async (puntoId: string) => {
    if (!user || !oleadaPeldano) return;
    const updated = await deleteOleadaPunto(user.uid, oleadaPeldano.id, puntoId);
    refreshOleadaPeldanoLocal(updated);
  };

  const handleReorderOleadaPunto = (puntoId: string, direction: "up" | "down") => {
    if (!user || !oleadaPeldano) return;
    ackOrden(puntoId, direction);
    void reorderOleadaPunto(user.uid, oleadaPeldano.id, puntoId, direction);
    const updated = getPeldanosByProyectoLocal(user.uid, oleadaPeldano.proyectoId).find(
      p => p.id === oleadaPeldano.id
    );
    refreshOleadaPeldanoLocal(updated ?? null);
  };

  const handleReorderProyecto = useCallback(
    (proyectoId: string, direction: "up" | "down") => {
      if (!user) return;
      void reorderProyecto(user.uid, proyectoId, direction);
      setProyectos(getProyectosLocal(user.uid));
      ackOrden(proyectoId, direction);
    },
    [user, ackOrden]
  );

  const handleReorderIdea = useCallback(
    (peldanoId: string, direction: "up" | "down") => {
      if (!user || !detailId) return;
      void reorderPeldano(user.uid, detailId, peldanoId, direction);
      setPeldanos(getPeldanosByProyectoLocal(user.uid, detailId));
      ackOrden(peldanoId, direction);
    },
    [user, detailId, ackOrden]
  );

  const handleSetPuntoProduccion = async (puntoId: string) => {
    if (!user || !oleadaPeldano) return;
    const updated = await setPuntoProduccion(user.uid, oleadaPeldano.id, puntoId);
    refreshOleadaPeldanoLocal(updated);
  };

  const handleCreateProyecto = useCallback(
    async (data: { titulo: string; etiqueta: ProyectoEtiqueta; nota: string }) => {
      if (!user || creatingProyecto) return;
      const titulo = data.titulo.trim();
      if (!titulo) {
        toast.error("Escribe un nombre para el proyecto o centro");
        return;
      }
      setCreatingProyecto(true);
      try {
        const color = PROYECTO_COLORS[proyectosLenRef.current % PROYECTO_COLORS.length];
        const p = await addProyecto(user.uid, {
          titulo,
          etiqueta: data.etiqueta,
          nota: data.nota.trim() || undefined,
          color,
        });
        const claridad =
          p.claridadActiva ??
          buildDefaultClaridadDireccion({
            tituloProyecto: p.titulo,
            etiqueta: p.etiqueta,
            focoTitulo: p.oleadaTitulo ?? p.titulo,
          });
        setProyectos(prev => [p, ...prev.filter(x => x.id !== p.id)]);
        setProyecto(p);
        setPeldanos([]);
        setClaridadEdit(claridad);
        setNotaEdit(p.nota ?? "");
        setOleadaTituloEdit(p.oleadaTitulo ?? "");
        setShowNew(false);
        navigate(`/proyectos?id=${p.id}`);
        toast.success(`"${p.titulo}" creado`);
      } catch {
        toast.error("No se pudo crear el proyecto. Intenta de nuevo.");
      } finally {
        setCreatingProyecto(false);
      }
    },
    [user, creatingProyecto, navigate]
  );

  const handleAddIdea = async () => {
    if (!user || !detailId || !newIdeaTitulo.trim()) return;
    await addPeldanoIdea(user.uid, detailId, newIdeaTitulo.trim());
    setNewIdeaTitulo("");
    void reloadDetail();
  };

  const handleSaveNota = async () => {
    if (!user || !detailId) return;
    await updateProyecto(user.uid, detailId, { nota: notaEdit.trim() || undefined });
    void reloadDetail();
  };

  const handleResetProyecto = async () => {
    if (!user || !detailId || !proyecto || focoBusy) return;
    const ok = window.confirm(
      `¿Reiniciar «${proyecto.titulo}»?\n\nSe borra la escalera, la oleada y los minutos. El nombre y el nido se quedan, para volver a enfocar. No se puede deshacer.`
    );
    if (!ok) return;
    setFocoBusy("reset");
    try {
      const reset = await resetProyecto(user.uid, detailId);
      if (!reset) {
        toast.error("No se pudo reiniciar. Intenta de nuevo.");
        return;
      }
      setProyectos(getProyectosLocal(user.uid));
      applyDetailState(reset, []);
      setEditandoDireccion(false);
      toast.success(`«${reset.titulo}» reiniciado — foco limpio`);
    } catch {
      toast.error("No se pudo reiniciar. Intenta de nuevo.");
    } finally {
      setFocoBusy(null);
    }
  };

  const handleDeleteProyecto = async () => {
    if (!user || !detailId || !proyecto || focoBusy) return;
    const ok = window.confirm(
      `¿Borrar «${proyecto.titulo}»?\n\nSale del Hub. Los pensamientos del Crisol van a aterrizaje pendiente. No se puede deshacer.`
    );
    if (!ok) return;
    setFocoBusy("delete");
    try {
      await deleteProyecto(user.uid, detailId);
      setProyectos(getProyectosLocal(user.uid));
      toast.success(`«${proyecto.titulo}» borrado`);
      navigate("/proyectos");
    } catch {
      toast.error("No se pudo borrar. Intenta de nuevo.");
    } finally {
      setFocoBusy(null);
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center text-slate-500 text-sm min-h-screen" style={{ backgroundColor: "#020202" }}>
        Inicia sesión para ver tus proyectos.
      </div>
    );
  }

  const detailReady = Boolean(detailId && proyecto && proyecto.id === detailId);

  if (detailId && !detailReady) {
    return (
      <div
        className="p-4 md:p-6 max-w-lg mx-auto min-h-screen pb-32 flex flex-col items-center justify-center"
        style={{ backgroundColor: "#020202" }}
      >
        {detailLoading ? (
          <p className="text-center text-slate-600 text-sm py-8">Cargando proyecto…</p>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">Proyecto no encontrado</p>
            <button
              type="button"
              onClick={() => navigate("/proyectos")}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500"
            >
              <ArrowLeft size={14} /> Volver al listado
            </button>
          </>
        )}
      </div>
    );
  }

  if (detailReady && proyecto) {
    const tint = proyecto.color ?? CYAN;
    const objetivoLabel =
      oleadaTituloEdit.trim() ||
      oleadaActiva?.titulo ||
      (proyecto.etiqueta === "centro" ? "Define el deber de esta oleada" : "Define el objetivo de esta oleada");

    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto min-h-screen pb-32" style={{ backgroundColor: "#020202" }}>
        <button
          type="button"
          onClick={() => navigate("/proyectos")}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3"
        >
          <ArrowLeft size={14} /> Todos los proyectos
        </button>

        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="min-w-0">
            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
              {proyecto.etiqueta}
            </span>
            <h1 className="text-lg font-black text-white truncate leading-tight">{proyecto.titulo}</h1>
          </div>
          <ProyectoIcono etiqueta={proyecto.etiqueta} color={tint} size={24} />
        </div>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            disabled={focoBusy !== null}
            onClick={() => void handleResetProyecto()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ color: tint, border: `1px solid ${tint}40`, backgroundColor: `${tint}10` }}
            data-testid="hub-reiniciar-proyecto"
          >
            <RotateCcw size={12} />
            {focoBusy === "reset" ? "Reiniciando…" : "Reiniciar"}
          </button>
          <button
            type="button"
            disabled={focoBusy !== null}
            onClick={() => void handleDeleteProyecto()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider disabled:opacity-50 text-red-400"
            style={{ border: "1px solid rgba(248,113,113,0.35)", backgroundColor: "rgba(248,113,113,0.08)" }}
            data-testid="hub-borrar-proyecto"
          >
            <Trash2 size={12} />
            {focoBusy === "delete" ? "Borrando…" : "Borrar"}
          </button>
        </div>

        <Tabs
          value={detailTab}
          onValueChange={v => setDetailTab(v as "enfoque" | "jornada" | "escalera")}
          className="w-full"
        >
          <TabsList
            className="grid w-full grid-cols-3 h-10 mb-4 rounded-xl p-1"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            data-testid="hub-detail-tabs"
          >
            <TabsTrigger
              value="enfoque"
              className="rounded-lg text-[10px] font-bold uppercase tracking-wider data-[state=active]:text-black"
              style={detailTab === "enfoque" ? { backgroundColor: tint, color: "#020202" } : undefined}
            >
              Enfoque
            </TabsTrigger>
            <TabsTrigger
              value="jornada"
              className="rounded-lg text-[10px] font-bold uppercase tracking-wider data-[state=active]:text-black gap-1"
              style={detailTab === "jornada" ? { backgroundColor: tint, color: "#020202" } : undefined}
            >
              Jornada
              {enCursoPlan.length > 0 ? (
                <span
                  className="inline-flex min-w-[16px] h-4 px-1 items-center justify-center rounded text-[8px] font-black"
                  style={{
                    backgroundColor: detailTab === "jornada" ? "rgba(0,0,0,0.25)" : `${CYAN}25`,
                    color: detailTab === "jornada" ? "#020202" : CYAN,
                  }}
                >
                  {enCursoPlan.length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="escalera"
              className="rounded-lg text-[10px] font-bold uppercase tracking-wider data-[state=active]:text-black"
              style={detailTab === "escalera" ? { backgroundColor: tint, color: "#020202" } : undefined}
            >
              Escalera
            </TabsTrigger>
          </TabsList>

          {/* ——— Enfoque: objetivo + dirección + sync ——— */}
          <TabsContent value="enfoque" className="mt-0 space-y-3 focus-visible:ring-0">
            <div
              className="p-3 rounded-xl border"
              style={{ backgroundColor: PIZARRA, borderColor: "rgba(255,255,255,0.08)" }}
              data-testid="hub-enfoque-glosario"
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                Orden de la conciencia
              </p>
              <ul className="text-[9px] text-slate-500 leading-relaxed space-y-0.5">
                <li>
                  <span className="text-slate-300">Oleada</span> — la campaña (acabar casacas small).
                </li>
                <li>
                  <span className="text-slate-300">Punto de producción</span> — el timón. Los envíos se
                  amontonan ahí. No caduca con el día.
                </li>
                <li>
                  <span className="text-slate-300">Escalera</span> — lo ya caminado.
                </li>
                <li>
                  <span className="text-slate-300">Presencia</span> — el día, no el rumbo.
                </li>
              </ul>
            </div>

            <div
              className="p-3 rounded-xl border"
              style={{ backgroundColor: PIZARRA, borderColor: `${tint}35` }}
              data-testid="hub-objetivo"
            >
              <p
                className="text-[9px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
                style={{ color: tint }}
              >
                <Target size={12} /> Objetivo actual
              </p>
              <p
                className={cn(
                  "text-base font-black leading-snug",
                  oleadaTituloEdit.trim() || oleadaActiva?.titulo ? "text-white" : "text-slate-600"
                )}
              >
                {objetivoLabel}
              </p>
              {oleadaActiva && !oleadaActiva.origenSegmento && oleadaActiva.titulo !== oleadaTituloEdit.trim() ? (
                <p className="text-[8px] text-slate-500 mt-1">
                  Oleada en curso: <span className="text-slate-300">{oleadaActiva.titulo}</span>
                </p>
              ) : null}
            </div>

            {oleadaPeldano ? (
              <OleadaDesglosePanel
                puntos={oleadaPuntos}
                puntoProduccionId={oleadaPeldano.puntoProduccionId}
                tint={tint}
                pulseId={ordenPulse?.id}
                pulseDir={ordenPulse?.dir}
                onAdd={handleAddOleadaPunto}
                onUpdateTitulo={handleUpdateOleadaPuntoTitulo}
                onCycleStatus={handleCycleOleadaPuntoStatus}
                onDelete={handleDeleteOleadaPunto}
                onReorder={handleReorderOleadaPunto}
                onSetPuntoProduccion={handleSetPuntoProduccion}
              />
            ) : (
              <div
                className="p-3 rounded-xl border border-dashed border-white/10"
                data-testid="hub-oleada-desglose-sin-oleada"
              >
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Activa una oleada en Escalera y marca un punto de producción. Hasta entonces
                  los vehículos no pueden llegar a Dirección: presencia cubre el día sin ensuciar
                  el proyecto.
                </p>
              </div>
            )}

            {claridadEdit ? (
              <div
                className="p-3 rounded-xl border space-y-3"
                style={{ backgroundColor: PIZARRA, borderColor: "rgba(56,189,248,0.22)" }}
                data-testid="hub-direccion-claridad"
              >
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Dirección de claridad
                </p>
                {detailHeavyReady ? (
                  <RutasMentalesGrafo rutas={claridadEdit} compact />
                ) : (
                  <p className="text-[9px] text-slate-600 py-2">Cargando dirección…</p>
                )}

                <button
                  type="button"
                  onClick={() => setEditandoDireccion(o => !o)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: editandoDireccion ? `${tint}18` : "rgba(255,255,255,0.03)",
                    color: editandoDireccion ? tint : "#94a3b8",
                    border: `1px solid ${editandoDireccion ? `${tint}40` : "rgba(255,255,255,0.1)"}`,
                  }}
                  data-testid="hub-editar-direccion"
                >
                  <Pencil size={12} />
                  {editandoDireccion ? "Cerrar edición" : "Editar Dirección"}
                  {editandoDireccion ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                <AnimatePresence initial={false}>
                  {editandoDireccion ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 pt-1">
                        <label className="text-[8px] font-bold uppercase tracking-widest text-slate-500 block">
                          Oleada / objetivo
                        </label>
                        <input
                          value={oleadaTituloEdit}
                          onChange={e => setOleadaTituloEdit(e.target.value)}
                          placeholder={
                            proyecto.etiqueta === "centro"
                              ? "Ej: Lote entrega viernes — 10 días"
                              : "Ej: Módulo pagos — sprint 10 días"
                          }
                          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none"
                          data-testid="input-oleada-titulo"
                        />
                        {detailHeavyReady ? (
                          <RutasMentalesEditor
                            rutas={claridadEdit}
                            onChange={setClaridadEdit}
                            etiqueta={proyecto.etiqueta}
                            desdeProyecto
                            ocultarGrafo
                          />
                        ) : null}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}

            <button
              type="button"
              disabled={guardandoClaridad || !detailHeavyReady || !claridadEdit}
              onClick={() => void handleGuardarClaridad()}
              className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
              style={{
                backgroundColor: `${tint}18`,
                color: tint,
                border: `1px solid ${tint}40`,
              }}
              data-testid="hub-sincronizar-direccion"
            >
              {guardandoClaridad ? "Guardando…" : "Sincronizar dirección"}
            </button>

            {oleadaPeldano && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      buildLaunchUrl(
                        proyecto.id,
                        oleadaPeldano.id,
                        "desglosador_tiempo",
                        oleadaPuntoProduccion?.id
                      )
                    )
                  }
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold uppercase"
                  style={{ backgroundColor: `${NARANJA}15`, color: NARANJA, border: `1px solid ${NARANJA}35` }}
                >
                  <Clock size={12} /> Tiempo sobre oleada
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      buildLaunchUrl(
                        proyecto.id,
                        oleadaPeldano.id,
                        "desglosador_situacion",
                        oleadaPuntoProduccion?.id
                      )
                    )
                  }
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold uppercase"
                  style={{ backgroundColor: `${PLATA}15`, color: PLATA, border: `1px solid ${PLATA}35` }}
                >
                  <Flag size={12} /> Situación sobre oleada
                </button>
              </div>
            )}
          </TabsContent>

          {/* ——— Jornada: accesos compactos a bloques de hoy ——— */}
          <TabsContent value="jornada" className="mt-0 space-y-3 focus-visible:ring-0">
            <p className="text-[9px] text-slate-500 leading-relaxed">
              Bloques de tiempo de hoy vinculados a este {proyecto.etiqueta}. La dirección vive en Enfoque —
              aquí solo el acceso al hueco.
            </p>
            {enCursoPlan.length === 0 ? (
              <div
                className="py-10 text-center rounded-xl border border-dashed border-white/10"
                data-testid="hub-jornada-vacio"
              >
                <Clock size={18} className="mx-auto mb-2 text-slate-600" />
                <p className="text-[10px] text-slate-600">
                  No hay bloques de {JORNADA_MODULE.title} vinculados hoy.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5" data-testid="hub-jornada-lista">
                {enCursoPlan.map(pel => {
                  const horario =
                    pel.horaInicio && pel.horaFin
                      ? `${pel.horaInicio}-${pel.horaFin}`
                      : pel.horaInicio
                        ? pel.horaInicio
                        : null;
                  const label = horario ? `${pel.titulo} ${horario}` : pel.titulo;
                  return (
                    <li key={pel.id}>
                      <button
                        type="button"
                        onClick={() => navigate("/jornada-v4")}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
                        style={{
                          border: `1px solid ${CYAN}28`,
                          backgroundColor: "rgba(0,255,195,0.03)",
                        }}
                      >
                        <Link2 size={14} className="shrink-0" style={{ color: CYAN }} aria-hidden />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[12px] font-semibold text-white truncate">{label}</span>
                          <span className="block text-[8px] text-slate-500 mt-0.5">
                            Vinculado · abrir en {JORNADA_MODULE.title}
                          </span>
                        </span>
                        <Clock size={12} className="shrink-0 text-slate-600" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          {/* ——— Escalera: peldaños, ideas e historial ——— */}
          <TabsContent value="escalera" className="mt-0 space-y-3 focus-visible:ring-0">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-lg font-black text-white">{stats.conquistados}</p>
                <p className="text-[7px] uppercase text-slate-500 tracking-wider">Peldaños</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-lg font-black" style={{ color: RUTA_BANDA_META[stats.profundidadMaxima].color }}>
                  {RUTA_BANDA_META[stats.profundidadMaxima].label}
                </p>
                <p className="text-[7px] uppercase text-slate-500 tracking-wider">Profundidad</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-lg font-black text-white">{minutosNorte}</p>
                <p className="text-[7px] uppercase text-slate-500 tracking-wider">Min norte</p>
              </div>
            </div>

            <HubCollapsible
              title="Por qué te emociona"
              tint={GOLD}
              icon={<Sparkles size={12} />}
              defaultOpen={false}
              testId="hub-nota-emocion"
            >
              <textarea
                value={notaEdit}
                onChange={e => setNotaEdit(e.target.value)}
                onBlur={() => void handleSaveNota()}
                placeholder="Ej: Cada bloque de costura me deja más tiempo libre al atardecer…"
                className="w-full bg-transparent text-[11px] text-slate-300 placeholder:text-slate-600 resize-none min-h-[60px] focus:outline-none"
              />
            </HubCollapsible>

            {(proyecto.pasosEjecutadosLog?.length ?? 0) > 0 && (
              <HubCollapsible
                title="Pasos desde el Crisol"
                tint={GOLD}
                icon={<Sparkles size={12} />}
                count={proyecto.pasosEjecutadosLog!.length}
                defaultOpen={false}
                testId="hub-pasos-crisol"
              >
                <div className="max-h-56 overflow-y-auto pr-1">
                  <PeldanoDecisionesEnumeradas
                    decisiones={proyecto.pasosEjecutadosLog!}
                    titulo="Pasos desde el Crisol"
                  />
                </div>
              </HubCollapsible>
            )}

            <HubCollapsible
              title="Calendario de pasos dados"
              tint={CYAN}
              icon={<TrendingUp size={12} />}
              defaultOpen={false}
              testId="hub-calendario-pasos"
            >
              <p className="text-[8px] mb-3 leading-relaxed" style={{ color: NARANJA }}>
                Historial de ejecución — pasos ya realizados. No es un planificador.
              </p>
              {detailHeavyReady ? (
                <PasosDadosCalendar pasos={proyecto.pasosEjecutadosLog ?? []} />
              ) : (
                <p className="text-[9px] text-slate-600 py-2">Cargando calendario…</p>
              )}
            </HubCollapsible>

            <HubCollapsible
              title="Desglosar ideas"
              tint={CYAN}
              icon={<Layers size={12} />}
              count={ideas.length}
              defaultOpen={ideas.length > 0 && ideas.length <= 4}
              testId="hub-ideas"
            >
              <p className="text-[8px] text-slate-500 mb-3 leading-relaxed">
                Próximas oleadas — no son el punto de producción ni el bloque del día.
                Actívalas como oleada para que la conciencia tome el timón.
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  value={newIdeaTitulo}
                  onChange={e => setNewIdeaTitulo(e.target.value)}
                  placeholder="Nueva idea / oleada…"
                  className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none"
                  onKeyDown={e => e.key === "Enter" && void handleAddIdea()}
                />
                <button
                  onClick={() => void handleAddIdea()}
                  className="px-3 py-2 rounded-lg font-bold"
                  style={{ backgroundColor: `${CYAN}20`, color: CYAN, border: `1px solid ${CYAN}40` }}
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {ideas.length === 0 && (
                  <p className="text-[10px] text-slate-600 text-center py-4">
                    Añade ideas de oleada — no son el bloque del día; son el camino a caminar.
                  </p>
                )}
                {ideas.map((pel, ideaIdx) => (
                  <div
                    key={pel.id}
                    className="p-3 rounded-xl border border-white/10 transition-[border-color,box-shadow] duration-200"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.03)",
                      borderColor:
                        ordenPulse?.id === pel.id ? `${CYAN}55` : "rgba(255,255,255,0.1)",
                      boxShadow:
                        ordenPulse?.id === pel.id ? `0 0 16px ${CYAN}28` : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-bold text-white">{pel.titulo}</span>
                      <div className="flex items-center gap-1">
                        <BotonesDireccion
                          tint={CYAN}
                          pulseDir={ordenPulse?.id === pel.id ? ordenPulse.dir : null}
                          disabledUp={ideaIdx === 0}
                          disabledDown={ideaIdx === ideas.length - 1}
                          onUp={() => handleReorderIdea(pel.id, "up")}
                          onDown={() => handleReorderIdea(pel.id, "down")}
                          testIdUp={`idea-up-${pel.id}`}
                          testIdDown={`idea-down-${pel.id}`}
                          labelUp="Subir idea"
                          labelDown="Bajar idea"
                          orientation="horizontal"
                        />
                        <button
                          onClick={() => void deletePeldanoIdea(user!.uid, pel.id).then(() => reloadDetail())}
                          className="p-1 text-slate-600 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {pel.plantillaSubTareas && pel.plantillaSubTareas.length > 0 && (
                      <p className="text-[8px] text-slate-500 mb-2 leading-relaxed">
                        {pel.plantillaSubTareas.length} detalle
                        {pel.plantillaSubTareas.length !== 1 ? "s" : ""} pendiente
                        {pel.plantillaSubTareas.length !== 1 ? "s" : ""} de profundidad
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleUsarIdeaComoOleada(pel.id)}
                      className="w-full mb-2 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider text-slate-400 border border-white/10 hover:border-white/20"
                    >
                      Usar como oleada activa
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(buildLaunchUrl(proyecto.id, pel.id, "desglosador_tiempo"))}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold uppercase"
                        style={{ backgroundColor: `${NARANJA}15`, color: NARANJA, border: `1px solid ${NARANJA}35` }}
                      >
                        <Clock size={12} /> Tiempo
                      </button>
                      <button
                        onClick={() => navigate(buildLaunchUrl(proyecto.id, pel.id, "desglosador_situacion"))}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold uppercase"
                        style={{ backgroundColor: `${PLATA}15`, color: PLATA, border: `1px solid ${PLATA}35` }}
                      >
                        <Flag size={12} /> Situación
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </HubCollapsible>

            <HubCollapsible
              title="Tu escalera — conquistados"
              tint={GOLD}
              icon={<TrendingUp size={12} />}
              count={conquistados.length}
              defaultOpen={conquistados.length > 0}
              testId="hub-escalera"
            >
              {conquistados.length === 0 ? (
                <p className="text-[10px] text-slate-600 text-center py-6 border border-dashed border-white/10 rounded-xl">
                  Cierra un vehículo como Peldaño — aquí aparece el avance serio.
                </p>
              ) : (
                <div className="space-y-2">
                  {conquistados.slice(0, conquistadosVisible).map((pel, i) => (
                    <div
                      key={pel.id}
                      className="rounded-xl border overflow-hidden"
                      style={{ borderColor: `${GOLD}25`, backgroundColor: "rgba(0,0,0,0.35)" }}
                    >
                      <button
                        className="w-full p-3 flex items-center justify-between text-left"
                        onClick={() => setExpandedConq(expandedConq === pel.id ? null : pel.id)}
                      >
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase">
                            Peldaño {conquistados.length - i} · {formatFecha(pel.cerradoAt)} ·{" "}
                            {formatTipoOrigen(pel.tipoOrigen)}
                          </p>
                          <p className="text-sm font-bold text-white">{pel.titulo}</p>
                        </div>
                        {expandedConq === pel.id ? (
                          <ChevronUp size={14} className="text-slate-500 shrink-0" />
                        ) : (
                          <ChevronDown size={14} className="text-slate-500 shrink-0" />
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedConq === pel.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-white/5"
                          >
                            <div className="p-3 text-[10px] text-slate-400 space-y-2">
                              {pel.rutasMentales && (
                                <RutasMentalesGrafo rutas={pel.rutasMentales} compact />
                              )}
                              {pel.resumen?.segmentoResumen?.rutaMentalLabel && (
                                <p className="text-[9px]" style={{ color: CYAN }}>
                                  Ruta: {pel.resumen.segmentoResumen.rutaMentalLabel}
                                  {pel.resumen.segmentoResumen.faseAtencional
                                    ? ` · ${pel.resumen.segmentoResumen.faseAtencional}`
                                    : ""}
                                </p>
                              )}
                              {pel.resumen?.subsCumplidos != null && (
                                <p>
                                  Bloques: {pel.resumen.subsCumplidos}/{pel.resumen.subsTotal} ·{" "}
                                  {pel.resumen.duracionMin ?? 0} min · {pel.resumen.psGanados ?? 0} PS
                                  {(pel.resumen.totalDecisiones ?? 0) > 0 && (
                                    <span style={{ color: CYAN }}>
                                      {" "}
                                      · {pel.resumen.totalDecisiones} decisión
                                      {pel.resumen.totalDecisiones !== 1 ? "es" : ""}
                                    </span>
                                  )}
                                  {(pel.resumen.minutosGanados ?? 0) > 0 && (
                                    <span style={{ color: CYAN }}>
                                      {" "}
                                      · +{pel.resumen.minutosGanados} min recuperados
                                    </span>
                                  )}
                                </p>
                              )}
                              {pel.resumen?.decisionesEnumeradas &&
                                pel.resumen.decisionesEnumeradas.length > 0 && (
                                  <PeldanoDecisionesEnumeradas
                                    decisiones={pel.resumen.decisionesEnumeradas}
                                    compact
                                  />
                                )}
                              {pel.resumen?.subResumen?.map((s, j) => (
                                <p key={j} className="pl-2 text-slate-500">
                                  • {s.titulo} ({s.status})
                                </p>
                              ))}
                              {pel.resumen?.subTareasResumen && pel.resumen.subTareasResumen.length > 0 && (
                                <PeldanoSituacionArbol
                                  subTareas={pel.resumen.subTareasResumen}
                                  compact
                                />
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                  {conquistados.length > conquistadosVisible ? (
                    <button
                      type="button"
                      onClick={() => setConquistadosVisible(n => n + 8)}
                      className="w-full py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: GOLD, border: `1px solid ${GOLD}35` }}
                      data-testid="hub-escalera-mas"
                    >
                      Mostrar más ({conquistados.length - conquistadosVisible})
                    </button>
                  ) : null}
                </div>
              )}
            </HubCollapsible>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto min-h-screen pb-32" style={{ backgroundColor: "#020202" }}>
      <header className="mb-6">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Hub de Proyectos</p>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Layers size={22} style={{ color: CYAN }} />
          Proyectos y Centros
        </h1>
        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
          Construye tu futuro peldaño a peldaño. Si un proyecto cambia o se amontona, ábrelo y
          reinícialo o bórralo — el Hub es foco, no archivo.
        </p>
      </header>

      <button
        onClick={() => setShowNew(true)}
        className="w-full mb-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
        style={{ backgroundColor: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}40` }}
      >
        <Plus size={16} /> Nuevo proyecto o centro
      </button>

      <AnimatePresence>
        {showNew && (
          <NuevoProyectoForm
            creating={creatingProyecto}
            onCancel={() => setShowNew(false)}
            onCreate={handleCreateProyecto}
          />
        )}
      </AnimatePresence>

      {loading ? (
        <p className="text-center text-slate-600 text-sm py-8">Cargando…</p>
      ) : proyectos.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
          <Layers size={32} className="mx-auto mb-3 text-slate-600" />
          <p className="text-sm text-slate-500">Sin proyectos aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proyectos.map((p, idx) => {
            const tintCard = p.color ?? CYAN;
            const pulsing = ordenPulse?.id === p.id;
            return (
            <motion.div
              key={p.id}
              layout
              transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.65 }}
              className="rounded-xl border overflow-hidden transition-[border-color,box-shadow] duration-200"
              style={{
                backgroundColor: PIZARRA,
                borderColor: pulsing ? `${tintCard}85` : `${tintCard}30`,
                boxShadow: pulsing ? `0 0 22px ${tintCard}40` : undefined,
              }}
              data-testid={`proyecto-card-${p.id}`}
            >
              <div className="flex">
                <BotonesDireccion
                  tint={tintCard}
                  pulseDir={pulsing ? ordenPulse?.dir : null}
                  disabledUp={idx === 0}
                  disabledDown={idx === proyectos.length - 1}
                  onUp={() => handleReorderProyecto(p.id, "up")}
                  onDown={() => handleReorderProyecto(p.id, "down")}
                  testIdUp={`proyecto-up-${p.id}`}
                  testIdDown={`proyecto-down-${p.id}`}
                  labelUp="Subir proyecto"
                  labelDown="Bajar proyecto"
                />
                <button
                  type="button"
                  onClick={() => openProyectoDetalle(p.id)}
                  className="flex-1 p-4 text-left transition-all hover:bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[8px] font-bold uppercase text-slate-500">{p.etiqueta}</span>
                      <p className="text-base font-black text-white">{p.titulo}</p>
                    </div>
                    <ProyectoIcono etiqueta={p.etiqueta} color={p.color} />
                  </div>
                  <div className="flex gap-4 mt-3 text-[9px] font-bold uppercase tracking-wider">
                    <span style={{ color: GOLD }}>{p.peldanosConquistados} peldaños</span>
                    {p.profundidadMaxima && (
                      <span style={{ color: RUTA_BANDA_META[p.profundidadMaxima].color }}>
                        {RUTA_BANDA_META[p.profundidadMaxima].label}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
