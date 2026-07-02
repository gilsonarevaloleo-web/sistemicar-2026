import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Compass, Target, Zap } from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  saveVehicleHistoryFirebase,
  updateVehicle,
  type SegmentoV5,
  type SubTarea,
  type SubVehiculo,
  type Vehicle,
  type VehicleHistoryEntry,
} from "@/lib/persistence";
import type { VehicleHistoryOpts } from "@/components/flota/vehicleCardShared";
import { burstConcienciaClockTick, dispatchConcienciaClockTick } from "@/lib/concienciaClock";
import { scheduleSaveLocalVehicles } from "@/lib/deferredVehicleSave";
import { hardwareClockNow } from "@/lib/hardwareClock";
import { shouldAllowJornadaVoice } from "@/lib/mobilePerf";
import { runSegmentAttentionTickNow } from "@/lib/segmentAttentionCycle";
import { flushMissedPuertaVoiceOnVisible } from "@/lib/backgroundAttentionAlerts";
import {
  recoverSpeechQueue,
  warmupSpeechSynthesis,
} from "@/lib/speechQueue";
import { onJornadaVisibilityReturn } from "@/services/jornadaFlotaFetch";
import { JORNADA_MODULE, JORNADA_V3_PATH } from "@/lib/jornadaBrand";
import { NavTransitionLink } from "@/components/NavTransitionLink";
import type { ReservaTacticaRuta, SituacionReservaItem } from "@/lib/situacionReserva";
import type { ImanProyectoOpcion } from "@/lib/imanPensamientos";
import { CrisolModule, type CrisolAterrizarPayload } from "@/components/jornada/CrisolModule";
import {
  RingEnfoqueModule,
  type RingEnfoqueModuleHandle,
  type RingMode,
  type RingSubTareaClosePayload,
  type RingSubVehiculoClosePayload,
} from "@/components/jornada/RingEnfoqueModule";
import { AnilloConcienciaAislado, type AnilloViewMode } from "@/components/jornada/AnilloConcienciaAislado";
import MetricasJornadaModule from "@/components/jornada/MetricasJornadaModule";

// ─── Paleta tech-noir industrial ────────────────────────────────────────────

const SHELL_COLORS = {
  charcoal: "#0a0a0a",
  gold: "#D4AF37",
  cyan: "#00FFC3",
  plata: "#94a3b8",
  emerald: "#00C851",
} as const;

type JornadaTab = "operar" | "fe";

const EMPTY_SUB_TAREAS: SubTarea[] = [];
const EMPTY_SUB_VEHICULOS: SubVehiculo[] = [];
const EMPTY_SEGMENTOS: SegmentoV5[] = [];

function buildVehiclesAnilloSig(vehicles: Vehicle[]): string {
  return vehicles
    .map(
      v =>
        `${v.id}:${v.status}:${v.tipoFlota ?? ""}:${v.tipoReloj ?? ""}:${v.aperturaAt ?? 0}:${v.interrupcionActiva ? 1 : 0}:${v.desglosadorPausa?.pausadoAt ?? 0}`
    )
    .join("|");
}

function buildSegmentosSig(segmentos: SegmentoV5[]): string {
  return segmentos
    .map(s => `${s.id}:${s.estado}:${s.horaInicio}:${s.horaFin}`)
    .join("|");
}

// ─── Hooks de salida para audio / segundo plano ─────────────────────────────

export type JornadaShellSpeechHooks = {
  warmupSpeech?: () => void;
  recoverSpeech?: () => void;
  /** Reproduce avisos de puertas perdidos en background; retorna cantidad. */
  flushBackgroundVoice?: () => number;
  onSegmentChange?: (segmentId: string | null) => void;
  onForegroundResume?: () => void;
};

const DEFAULT_SPEECH_HOOKS: JornadaShellSpeechHooks = {
  warmupSpeech: () => {
    if (shouldAllowJornadaVoice()) warmupSpeechSynthesis();
  },
  recoverSpeech: () => {
    if (shouldAllowJornadaVoice()) recoverSpeechQueue();
  },
  flushBackgroundVoice: () => {
    if (!shouldAllowJornadaVoice()) return 0;
    return flushMissedPuertaVoiceOnVisible();
  },
};

// ─── Persistencia Bóveda (réplica mínima de planeacion / useDesglosadorManager) ─

function readVehicleHistoryLocal(): VehicleHistoryEntry[] {
  try {
    const raw = localStorage.getItem("sistemicar_vehicle_history");
    return raw ? (JSON.parse(raw) as VehicleHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function persistVehicleHistoryEntry(
  titulo: string,
  minPerUnit: number,
  totalMin: number,
  tipoReloj: string,
  userId: string,
  opts?: VehicleHistoryOpts
): void {
  if (opts?.excluirDeHistorial) return;
  try {
    const history = readVehicleHistoryLocal();
    const newEntry: VehicleHistoryEntry = {
      titulo,
      minPerUnit,
      totalMin,
      tipoReloj,
      fecha: hardwareClockNow(),
      ...opts,
    };
    history.push(newEntry);
    if (history.length > 200) history.splice(0, history.length - 200);
    localStorage.setItem("sistemicar_vehicle_history", JSON.stringify(history));
    void saveVehicleHistoryFirebase(userId, history).catch(e =>
      console.warn("[JornadaShellV3] vehicleHistory Firebase:", e)
    );
    const currentUser = auth?.currentUser;
    if (currentUser) {
      void currentUser
        .getIdToken()
        .then(token =>
          fetch("/api/vehicle-history", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              entries: [
                {
                  titulo: newEntry.titulo,
                  minPerUnit: newEntry.minPerUnit,
                  totalMin: newEntry.totalMin,
                  tipoReloj: newEntry.tipoReloj,
                  fecha: newEntry.fecha,
                  status: newEntry.status,
                  subResumen: newEntry.subResumen
                    ? JSON.stringify(newEntry.subResumen)
                    : undefined,
                },
              ],
            }),
          })
        )
        .catch(e => console.warn("[JornadaShellV3] vehicleHistory backend:", e));
    }
  } catch {
    /* quota / parse */
  }
}

// ─── Resolución del vehículo activo del Ring ────────────────────────────────

type RingContext = {
  mode: RingMode;
  vehicle: Vehicle;
};

function resolveRingContext(vehicles: Vehicle[], expandedId: string | null): RingContext | null {
  const situacionActivos = vehicles.filter(
    v => v.status === "activo" && v.tipoFlota === "situacion"
  );
  const tiempoActivos = vehicles.filter(
    v => v.status === "activo" && v.tipoReloj === "desglosador"
  );

  const pick = (pool: Vehicle[]) => {
    if (expandedId) {
      const ex = pool.find(v => v.id === expandedId);
      if (ex) return ex;
    }
    return pool[0];
  };

  const situacion = pick(situacionActivos);
  if (situacion) return { mode: "situacion", vehicle: situacion };

  const tiempo = pick(tiempoActivos);
  if (tiempo) return { mode: "tiempo", vehicle: tiempo };

  return null;
}

// ─── Props del orquestador (inyectadas desde planeacion.tsx) ─────────────────

export interface JornadaShellV3Props {
  userId: string;
  segmentos: SegmentoV5[];
  segmentoActivoId: string | null;
  vehicles: Vehicle[];
  vehiclesRef: MutableRefObject<Vehicle[]>;
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;

  todayPs: number;
  yesterdayPs: number | null;

  situacionReserva: SituacionReservaItem[];
  imanProyectos: ImanProyectoOpcion[];
  defaultProyectoId?: string;

  onAterrizarReserva: (payload: CrisolAterrizarPayload) => void | Promise<void>;
  onReservaRutaChange: (reservaId: string, ruta: ReservaTacticaRuta) => void | Promise<void>;
  onEnviarReservaASituacion: (reservaId: string) => void | Promise<void>;

  handleSituacionCronometroCumplido: (vehicleId: string, subTareaId: string) => void | Promise<void>;
  handleSituacionCronometroFallado: (vehicleId: string, subTareaId: string) => void | Promise<void>;
  handleToggleSubTarea: (vehicleId: string, subTareaId: string) => void | Promise<void>;
  handleDesglosadorUpdate: (
    vehicleId: string,
    subs: SubVehiculo[],
    opts?: { resetDepth?: boolean; silentDepth?: boolean; force?: boolean }
  ) => void;
  volcarMetricasAlHub: (vehicle: Vehicle, opts: { minutos: number }) => void | Promise<void>;

  rehydrateFlotaFromLocalRef?: MutableRefObject<(() => void) | undefined>;
  setupFlotaSubscription?: () => void;
  speechHooks?: JornadaShellSpeechHooks;

  initialTab?: JornadaTab;
  className?: string;
}

// ─── Sincronización hardware-clock al volver de background ───────────────────

function useJornadaHardwareSync(params: {
  rehydrateFlotaFromLocalRef?: MutableRefObject<(() => void) | undefined>;
  setupFlotaSubscription?: () => void;
  speechHooks: JornadaShellSpeechHooks;
  /** Sello primitivo — recomputar métricas del anillo solo cuando cambia la flota/segmentos. */
  timelineSig: string;
  hayVehiculoActivo?: boolean;
}): { metricsRevision: number } {
  const [metricsRevision, setMetricsRevision] = useState(0);
  const speechRef = useRef(params.speechHooks);
  speechRef.current = params.speechHooks;
  const timelineSigRef = useRef(params.timelineSig);
  const rehydrateRef = useRef(params.rehydrateFlotaFromLocalRef);
  rehydrateRef.current = params.rehydrateFlotaFromLocalRef;
  const setupFlotaRef = useRef(params.setupFlotaSubscription);
  setupFlotaRef.current = params.setupFlotaSubscription;
  const hayVehiculoActivoRef = useRef(params.hayVehiculoActivo ?? false);
  hayVehiculoActivoRef.current = params.hayVehiculoActivo ?? false;

  useEffect(() => {
    if (timelineSigRef.current === params.timelineSig) return;
    timelineSigRef.current = params.timelineSig;
    setMetricsRevision(r => r + 1);
  }, [params.timelineSig]);

  const bumpMetricsRevision = useCallback(() => {
    setMetricsRevision(r => r + 1);
  }, []);

  const reconcileGenRef = useRef(0);

  const reconcileFromTimestamps = useCallback(() => {
    const gen = ++reconcileGenRef.current;

    globalThis.setTimeout(() => {
      if (gen !== reconcileGenRef.current) return;

      void hardwareClockNow();
      rehydrateRef.current?.current?.();
      setupFlotaRef.current?.();

      if (hayVehiculoActivoRef.current) {
        burstConcienciaClockTick(1);
      } else {
        burstConcienciaClockTick(4, 80);
      }

      const hooks = speechRef.current;
      hooks.warmupSpeech?.();
      hooks.recoverSpeech?.();
      hooks.flushBackgroundVoice?.();
      hooks.onForegroundResume?.();

      globalThis.setTimeout(() => {
        if (gen !== reconcileGenRef.current) return;
        runSegmentAttentionTickNow();
        bumpMetricsRevision();
      }, 80);
    }, 0);
  }, [bumpMetricsRevision]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      reconcileFromTimestamps();
    };
    document.addEventListener("visibilitychange", onVisible);
    const unsub = onJornadaVisibilityReturn(onVisible);
    return () => {
      reconcileGenRef.current += 1;
      document.removeEventListener("visibilitychange", onVisible);
      unsub();
    };
  }, [reconcileFromTimestamps]);

  useEffect(() => {
    speechRef.current.warmupSpeech?.();
  }, []);

  return { metricsRevision };
}

// ─── UI: pestañas tech-noir ─────────────────────────────────────────────────

type TabBarProps = {
  active: JornadaTab;
  onChange: (tab: JornadaTab) => void;
};

const TabBar = memo(function TabBar({ active, onChange }: TabBarProps) {
  const tabs: { id: JornadaTab; label: string; icon: typeof Target }[] = [
    { id: "operar", label: "Operar", icon: Target },
    { id: "fe", label: "Fe · 120%", icon: Zap },
  ];

  return (
    <nav
      className="flex gap-1.5 p-1 rounded-xl border"
      style={{
        backgroundColor: "rgba(0,0,0,0.45)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
      role="tablist"
      aria-label="Secciones Jornada"
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest touch-manipulation transition-colors"
            style={{
              backgroundColor: selected ? `${SHELL_COLORS.emerald}18` : "transparent",
              color: selected ? SHELL_COLORS.emerald : SHELL_COLORS.plata,
              border: selected ? `1px solid ${SHELL_COLORS.emerald}40` : "1px solid transparent",
            }}
            data-testid={`jornada-v3-tab-${id}`}
          >
            <Icon size={11} aria-hidden />
            {label}
          </button>
        );
      })}
    </nav>
  );
});

// ─── Componente principal ─────────────────────────────────────────────────────

function JornadaShellV3Inner({
  userId,
  segmentos,
  segmentoActivoId,
  vehicles,
  vehiclesRef,
  setVehicles,
  expandedId,
  todayPs,
  yesterdayPs,
  situacionReserva,
  imanProyectos,
  defaultProyectoId = "",
  onAterrizarReserva,
  onReservaRutaChange,
  onEnviarReservaASituacion,
  handleSituacionCronometroCumplido,
  handleSituacionCronometroFallado,
  handleToggleSubTarea,
  handleDesglosadorUpdate,
  volcarMetricasAlHub,
  rehydrateFlotaFromLocalRef,
  setupFlotaSubscription,
  speechHooks: speechHooksProp,
  initialTab = "operar",
  className = "",
}: JornadaShellV3Props) {
  const ringRef = useRef<RingEnfoqueModuleHandle | null>(null);
  const [activeTab, setActiveTab] = useState<JornadaTab>(initialTab);
  const [anilloView, setAnilloView] = useState<AnilloViewMode>("mapa");
  const [vehicleHistory, setVehicleHistory] = useState<VehicleHistoryEntry[]>(() =>
    readVehicleHistoryLocal()
  );

  const speechHooksRef = useRef(speechHooksProp);
  speechHooksRef.current = speechHooksProp;

  const vehiclesSig = useMemo(() => buildVehiclesAnilloSig(vehicles), [vehicles]);
  const segmentosSig = useMemo(
    () => buildSegmentosSig(segmentos),
    [segmentos]
  );
  const timelineSig = `${segmentosSig}::${vehiclesSig}`;

  const hayVehiculoActivo = useMemo(
    () => vehicles.some(v => v.status === "activo"),
    [vehicles]
  );

  const { metricsRevision } = useJornadaHardwareSync({
    rehydrateFlotaFromLocalRef,
    setupFlotaSubscription,
    speechHooks: DEFAULT_SPEECH_HOOKS,
    timelineSig,
    hayVehiculoActivo,
  });

  const ringContext = useMemo(
    () => resolveRingContext(vehicles, expandedId),
    [vehicles, expandedId]
  );

  const ringVehicleId = ringContext?.vehicle.id ?? null;
  const ringMode = ringContext?.mode;
  const ringVehicle = ringContext?.vehicle;
  const ringSubTareas = ringVehicle?.subTareas ?? EMPTY_SUB_TAREAS;
  const ringSubVehiculos = ringVehicle?.subVehiculos ?? EMPTY_SUB_VEHICULOS;

  const handleTabChange = useCallback((tab: JornadaTab) => {
    startTransition(() => {
      setActiveTab(tab);
      if (tab === "operar") {
        dispatchConcienciaClockTick();
      }
    });
  }, []);

  const refreshHistory = useCallback(() => {
    setVehicleHistory(readVehicleHistoryLocal());
  }, []);

  useEffect(() => {
    const onAward = () => refreshHistory();
    window.addEventListener("sovereignty-points-awarded", onAward);
    return () => window.removeEventListener("sovereignty-points-awarded", onAward);
  }, [refreshHistory]);

  const patchVehicleSubs = useCallback(
    (vehicleId: string, patch: Partial<Vehicle>) => {
      setVehicles(prev =>
        prev.map(v => (v.id === vehicleId ? { ...v, ...patch } : v))
      );
      vehiclesRef.current = vehiclesRef.current.map(v =>
        v.id === vehicleId ? { ...v, ...patch } : v
      );
      scheduleSaveLocalVehicles(vehiclesRef.current);
    },
    [setVehicles, vehiclesRef]
  );

  const handleDespacharToRing = useCallback(
    (item: SituacionReservaItem) => {
      ringRef.current?.recibirItemDeCrisol(item);
      void Promise.resolve(onEnviarReservaASituacion(item.id));
    },
    [onEnviarReservaASituacion]
  );

  const handleSubTareasChange = useCallback(
    (subs: SubTarea[]) => {
      if (!ringVehicleId) return;
      patchVehicleSubs(ringVehicleId, { subTareas: subs });
    },
    [ringVehicleId, patchVehicleSubs]
  );

  const handleSubVehiculosChange = useCallback(
    (subs: SubVehiculo[]) => {
      if (!ringVehicleId) return;
      patchVehicleSubs(ringVehicleId, { subVehiculos: subs });
    },
    [ringVehicleId, patchVehicleSubs]
  );

  const handleSubTareaClose = useCallback(
    async (payload: RingSubTareaClosePayload) => {
      const { vehicleId, subId, status, sub } = payload;
      const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
      if (!vehicle) return;

      if (sub.enDesgloseCronometro) {
        const primed = (vehicle.subTareas ?? []).map(st =>
          st.id === subId
            ? {
                ...st,
                resultadoSituacion: "pendiente" as const,
                completada: false,
              }
            : st
        );
        patchVehicleSubs(vehicleId, { subTareas: primed });
        if (status === "cumplido") {
          await handleSituacionCronometroCumplido(vehicleId, subId);
        } else {
          await handleSituacionCronometroFallado(vehicleId, subId);
        }
        return;
      }

      if (status === "cumplido") {
        const primed = (vehicle.subTareas ?? []).map(st =>
          st.id === subId ? { ...st, completada: false } : st
        );
        patchVehicleSubs(vehicleId, { subTareas: primed });
        await handleToggleSubTarea(vehicleId, subId);
        return;
      }

      const nextSubs = (vehicle.subTareas ?? []).map(st => (st.id === subId ? sub : st));
      patchVehicleSubs(vehicleId, { subTareas: nextSubs });
      try {
        await updateVehicle(userId, vehicleId, { subTareas: nextSubs });
      } catch (e) {
        console.warn("[JornadaShellV3] lista libre fallado:", e);
      }
    },
    [
      vehiclesRef,
      patchVehicleSubs,
      handleSituacionCronometroCumplido,
      handleSituacionCronometroFallado,
      handleToggleSubTarea,
      userId,
    ]
  );

  const handleSubVehiculoClose = useCallback(
    async (payload: RingSubVehiculoClosePayload) => {
      const { vehicleId, sub, status, realSec, cantidadLograda } = payload;
      const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
      if (!vehicle) return;

      const updatedSubs = (vehicle.subVehiculos ?? []).map(s =>
        s.id === sub.id ? sub : s
      );
      handleDesglosadorUpdate(vehicleId, updatedSubs, { force: true });

      if (
        status === "cumplido" &&
        cantidadLograda != null &&
        cantidadLograda > 0 &&
        realSec != null &&
        realSec > 0
      ) {
        const totalMin = Math.max(1, Math.round(realSec / 60));
        const minPerUnit = totalMin / cantidadLograda;
        persistVehicleHistoryEntry(sub.titulo, minPerUnit, totalMin, "desglosador", userId, {
          status: "cumplido",
        });
        refreshHistory();
      }

      if (status === "cumplido" && !vehicle.autoVerdad) {
        const duracionMin = sub.duracionFinal
          ? Math.max(1, Math.round(sub.duracionFinal / 60))
          : realSec
            ? Math.max(1, Math.round(realSec / 60))
            : 1;
        void volcarMetricasAlHub({ ...vehicle, subVehiculos: updatedSubs }, { minutos: duracionMin });
      }
    },
    [vehiclesRef, handleDesglosadorUpdate, userId, refreshHistory, volcarMetricasAlHub]
  );

  const handleSegmentChange = useCallback((segmentId: string | null) => {
    const hooks = { ...DEFAULT_SPEECH_HOOKS, ...speechHooksRef.current };
    hooks.onSegmentChange?.(segmentId);
  }, []);

  const anilloSize = useMemo(() => {
    if (typeof window === "undefined") return 220;
    return Math.min(240, Math.max(180, window.innerWidth - 48));
  }, []);

  return (
    <div
      className={`min-h-0 pb-6 ${className}`.trim()}
      style={{ backgroundColor: SHELL_COLORS.charcoal }}
      data-testid="jornada-shell-v3"
    >
      <header
        className="sticky top-0 z-40 px-3 pt-2 pb-2"
        style={{
          backgroundColor: "rgba(2,2,2,0.94)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-lg mx-auto space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                {JORNADA_MODULE.titleUpper} · V3
              </p>
              <p className="text-[7px] text-slate-600 truncate">{JORNADA_MODULE.taglineShort}</p>
            </div>
            <div className="flex gap-1 shrink-0 items-center">
              <NavTransitionLink href="/planeacion">
                <span
                  className="text-[7px] font-bold uppercase px-2 py-1 rounded-lg touch-manipulation"
                  style={{
                    color: SHELL_COLORS.plata,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  data-testid="jornada-v3-back-classic"
                >
                  Clásica
                </span>
              </NavTransitionLink>
              {(["mapa", "horizonte"] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAnilloView(mode)}
                  className="text-[7px] font-black uppercase px-2 py-1 rounded-lg touch-manipulation"
                  style={{
                    backgroundColor:
                      anilloView === mode ? `${SHELL_COLORS.gold}15` : "rgba(255,255,255,0.04)",
                    color: anilloView === mode ? SHELL_COLORS.gold : SHELL_COLORS.plata,
                    border: `1px solid ${anilloView === mode ? `${SHELL_COLORS.gold}35` : "rgba(255,255,255,0.06)"}`,
                  }}
                  data-testid={`jornada-v3-anillo-${mode}`}
                >
                  <Compass size={10} className="inline mr-0.5 -mt-px" aria-hidden />
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <TabBar active={activeTab} onChange={handleTabChange} />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-3 pt-3 space-y-3">
        <section
          className="flex flex-col items-center rounded-2xl border py-3"
          style={{
            borderColor: `${SHELL_COLORS.gold}18`,
            backgroundColor: "rgba(0,0,0,0.35)",
            boxShadow: `0 0 24px ${SHELL_COLORS.gold}06`,
          }}
          data-testid="jornada-v3-brujula"
        >
          <AnilloConcienciaAislado
            segmentos={segmentos.length > 0 ? segmentos : EMPTY_SEGMENTOS}
            vehicles={vehicles}
            vehiclesSig={vehiclesSig}
            viewMode={anilloView}
            size={anilloSize}
            activeSegmentId={segmentoActivoId}
            hayVehiculoActivo={hayVehiculoActivo}
            metricsRevision={metricsRevision}
            onSegmentChange={handleSegmentChange}
          />
        </section>

        <div
          className={`space-y-3 ${activeTab !== "operar" ? "hidden" : ""}`}
          role="tabpanel"
          aria-hidden={activeTab !== "operar"}
          hidden={activeTab !== "operar"}
          data-testid="jornada-v3-panel-operar"
        >
          <CrisolModule
            items={situacionReserva}
            proyectos={imanProyectos}
            userId={userId}
            defaultProyectoId={defaultProyectoId}
            onAterrizar={onAterrizarReserva}
            onDespacharToRing={handleDespacharToRing}
            onRutaChange={onReservaRutaChange}
          />

          {ringVehicleId && ringMode && ringVehicle ? (
            <RingEnfoqueModule
              ref={ringRef}
              mode={ringMode}
              vehicleId={ringVehicleId}
              vehiclesRef={vehiclesRef}
              subTareas={ringSubTareas}
              subVehiculos={ringSubVehiculos}
              situacionCronometro={ringVehicle.situacionCronometro}
              situacionCupoAnchor={ringVehicle.situacionCupoAnchor}
              desglosadorPausa={ringVehicle.desglosadorPausa}
              interrupcionActiva={ringVehicle.interrupcionActiva}
              blockedByInterrupt={Boolean(ringVehicle.interrupcionActiva)}
              hayVehiculoActivo={hayVehiculoActivo}
              onSubTareasChange={handleSubTareasChange}
              onSubVehiculosChange={handleSubVehiculosChange}
              onSubTareaClose={handleSubTareaClose}
              onSubVehiculoClose={handleSubVehiculoClose}
            />
          ) : (
            <section
              className="rounded-2xl border p-6 text-center"
              style={{
                borderColor: `${SHELL_COLORS.gold}20`,
                backgroundColor: "rgba(0,0,0,0.25)",
              }}
              data-testid="jornada-v3-ring-empty"
            >
              <Target
                size={28}
                className="mx-auto mb-2 opacity-25"
                style={{ color: SHELL_COLORS.gold }}
              />
              <p className="text-[10px] font-bold text-slate-400">Ring en espera</p>
              <p className="text-[8px] text-slate-600 mt-1 max-w-xs mx-auto">
                Abre un vehículo de enfoque (situación o desglosador) para activar el cableado
                Crisol → Ring.
              </p>
            </section>
          )}
        </div>

        <div
          role="tabpanel"
          aria-hidden={activeTab !== "fe"}
          hidden={activeTab !== "fe"}
          className={activeTab !== "fe" ? "hidden" : ""}
          data-testid="jornada-v3-panel-fe"
        >
          <MetricasJornadaModule
            todayPs={todayPs}
            yesterdayPs={yesterdayPs ?? 0}
            vehicleHistory={vehicleHistory}
          />
        </div>
      </div>
    </div>
  );
}

export const JornadaShellV3 = memo(JornadaShellV3Inner);
export default JornadaShellV3;

export type { JornadaTab, RingContext };
