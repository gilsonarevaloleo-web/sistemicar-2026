import {
  forwardRef,
  memo,
  startTransition,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type Ref,
} from "react";
import { CheckCircle2, Target, XCircle } from "lucide-react";
import type { SubTarea, SubVehiculo, Vehicle } from "@/lib/persistence";
import type { SituacionReservaItem } from "@/lib/situacionReserva";
import { subTareaFromImanItem } from "@/lib/imanPensamientos";
import { RING_COPY, filtrarRingPendientes } from "@/lib/ringEnfoqueReal";
import {
  computeActiveSubClocks,
  computeSubCloseVerdict,
  desglosadorSubActiveIdKey,
  desglosadorSubTimerUiFromClocks,
  formatMMSS,
  SUB_APERTURA_MERGE_TOLERANCE_MS,
  suggestedSec,
  validateSubCloseCantidad,
  type SubCloseVerdict,
} from "@/lib/desglosadorClock";
import { getRutaBandaActual, RUTA_BANDA_META, type RutaBandaId } from "@/lib/rutaEnfoque";
import { situacionFilaCronometroPendiente } from "@/lib/situacionCupoDistrib";
import { useDomConcienciaClock } from "@/lib/domConcienciaClock";
import { computeSituacionTimerUi } from "@/components/planeacion/situacionRelojIsland";

// ─── Tokens ─────────────────────────────────────────────────────────────────

const RING_COLORS = {
  pizarra: "#0a0a0a",
  gold: "#D4AF37",
  emerald: "#00C851",
  blood: "#ef4444",
  cyan: "#00FFC3",
  plata: "#94a3b8",
} as const;

// ─── Tipos públicos ─────────────────────────────────────────────────────────

export type RingMode = "situacion" | "tiempo";

export type RingSubTareaClosePayload = {
  vehicleId: string;
  subId: string;
  status: "cumplido" | "fallado";
  sub: SubTarea;
  duracionRealSec?: number;
  origenImanId?: string;
  proyectoId?: string;
};

export type RingSubVehiculoClosePayload = {
  vehicleId: string;
  subId: string;
  status: "cumplido" | "fallado";
  sub: SubVehiculo;
  verdict: SubCloseVerdict;
  deltaSec: number;
  refSec: number | null;
  realSec: number | null;
  cantidadLograda?: number;
};

export interface RingEnfoqueModuleProps {
  mode: RingMode;
  vehicleId: string;
  /** Fuente viva del segundero (aperturaAt, pausas, subs activos). */
  vehiclesRef: MutableRefObject<Vehicle[]>;
  subTareas: SubTarea[];
  subVehiculos: SubVehiculo[];
  situacionCronometro?: Vehicle["situacionCronometro"];
  desglosadorPausa?: Vehicle["desglosadorPausa"];
  interrupcionActiva?: boolean;
  blockedByInterrupt?: boolean;
  /** Oculta paneles dinámicos de profundidad/PS mientras hay vehículo activo. */
  hayVehiculoActivo?: boolean;
  situacionCupoAnchor?: Vehicle["situacionCupoAnchor"];
  onSubTareasChange?: (subs: SubTarea[]) => void;
  onSubVehiculosChange?: (subs: SubVehiculo[]) => void;
  onSubTareaClose: (payload: RingSubTareaClosePayload) => void | Promise<void>;
  onSubVehiculoClose: (payload: RingSubVehiculoClosePayload) => void | Promise<void>;
  className?: string;
}

export type RingEnfoqueModuleHandle = {
  /** Inyecta ítem del Crisol en la cola activa del Ring (optimista, sin bloquear UI). */
  recibirItemDeCrisol: (item: SituacionReservaItem) => void;
};

// ─── Helpers puros ──────────────────────────────────────────────────────────

function isSubTareaTerminada(st: SubTarea): boolean {
  if (st.enDesgloseCronometro) {
    const r = st.resultadoSituacion ?? "pendiente";
    return r === "cumplido" || r === "fallado";
  }
  return st.completada;
}

function sortTrabajoPrimero(items: SubTarea[]): SubTarea[] {
  const pendientes = items.filter(s => !isSubTareaTerminada(s));
  const cerradas = items.filter(s => isSubTareaTerminada(s));
  return [...pendientes, ...cerradas];
}

function subVehiculoFromCrisolItem(item: SituacionReservaItem): SubVehiculo {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id: `sv_${suffix}`,
    titulo: item.texto,
    status: "pendiente",
  };
}

function verdictLabel(verdict: SubCloseVerdict, deltaSec: number): string {
  if (verdict === "gain") return `+${formatMMSS(Math.abs(deltaSec))} ganancia`;
  if (verdict === "loss") return `+${formatMMSS(deltaSec)} pérdida`;
  if (verdict === "neutral") return "±0 neutral";
  return "sin ref.";
}

function verdictColor(verdict: SubCloseVerdict): string {
  if (verdict === "gain") return RING_COLORS.emerald;
  if (verdict === "loss") return RING_COLORS.blood;
  if (verdict === "neutral") return RING_COLORS.plata;
  return "#64748b";
}

function bandaActualFromSub(sub: SubVehiculo): RutaBandaId | null {
  const ruta = sub.rutaEnfoque;
  if (!ruta?.activa) return null;
  const restantes =
    sub.cantidadObjetivo != null && sub.cantidadLograda != null
      ? Math.max(0, sub.cantidadObjetivo - sub.cantidadLograda)
      : ruta.N;
  return getRutaBandaActual(restantes, ruta.umbrales);
}

/** Ignora drift de aperturaAt dentro de tolerancia — evita reset de inputs al sync remoto ~2 s. */
function subsStructuralEqual(a: SubVehiculo[], b: SubVehiculo[]): boolean {
  if (a.length !== b.length) return false;
  const tol = SUB_APERTURA_MERGE_TOLERANCE_MS;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x.id !== y.id || x.status !== y.status || x.titulo !== y.titulo) return false;
    if (x.cantidadObjetivo !== y.cantidadObjetivo) return false;
    if (x.status === "activo" && y.status === "activo" && x.aperturaAt != null && y.aperturaAt != null) {
      if (Math.abs(x.aperturaAt - y.aperturaAt) > tol) return false;
    } else if (x.aperturaAt !== y.aperturaAt) {
      return false;
    }
  }
  return true;
}

// ─── Reloj DOM-only (cero re-render del Ring por tick) ──────────────────────

type RingDomClockProps = {
  vehicleId: string;
  vehiclesRef: MutableRefObject<Vehicle[]>;
  clockKey: string;
  activeSubTitulo: string;
};

const RingDomClock = memo(function RingDomClock({
  vehicleId,
  vehiclesRef,
  clockKey,
  activeSubTitulo,
}: RingDomClockProps) {
  const displayRef = useRef<HTMLSpanElement>(null);
  const expiredRef = useRef(false);
  const activeSubIdRef = useRef<string | null>(null);
  const vehicleIdRef = useRef(vehicleId);
  vehicleIdRef.current = vehicleId;

  const runTick = useCallback(() => {
    const node = displayRef.current;
    if (!node) return;

    const vehicle = vehiclesRef.current.find(v => v.id === vehicleIdRef.current);
    if (!vehicle) {
      node.textContent = "00:00";
      return;
    }

    const sub = vehicle.subVehiculos?.find(s => s.status === "activo");
    if (!sub?.aperturaAt) {
      node.textContent = "00:00";
      return;
    }

    if (activeSubIdRef.current !== sub.id) {
      activeSubIdRef.current = sub.id;
      expiredRef.current = false;
    }

    const now = Date.now();
    const clocks = computeActiveSubClocks(now, vehicle, sub);
    const objSecs = suggestedSec(sub);
    const ui = desglosadorSubTimerUiFromClocks(clocks, objSecs);
    node.textContent = ui.display;
    if (ui.expired !== expiredRef.current) {
      expiredRef.current = ui.expired;
      node.style.color = ui.expired ? RING_COLORS.blood : RING_COLORS.cyan;
    }
  }, [vehiclesRef]);

  useDomConcienciaClock(runTick, Boolean(clockKey));

  useEffect(() => {
    if (!clockKey) return;
    if (activeSubIdRef.current === clockKey) return;
    activeSubIdRef.current = clockKey;
    expiredRef.current = false;
    runTick();
  }, [clockKey, runTick]);

  return (
    <div
      className="rounded-xl border px-3 py-2 flex items-center justify-between gap-2"
      style={{
        backgroundColor: "rgba(0,255,195,0.04)",
        borderColor: `${RING_COLORS.cyan}30`,
      }}
      data-testid="ring-dom-clock"
    >
      <div className="min-w-0">
        <p className="text-[7px] font-black uppercase tracking-widest text-slate-500">Sub activo</p>
        <p className="text-[10px] text-slate-200 truncate">{activeSubTitulo}</p>
      </div>
      <span
        ref={displayRef}
        className="text-lg font-mono font-black tabular-nums shrink-0"
        style={{ color: RING_COLORS.cyan }}
        data-testid="ring-clock-display"
      >
        00:00
      </span>
    </div>
  );
});

type SituacionDomClockProps = {
  vehicleId: string;
  vehiclesRef: MutableRefObject<Vehicle[]>;
  clockKey: string;
};

const SituacionDomClock = memo(function SituacionDomClock({
  vehicleId,
  vehiclesRef,
  clockKey,
}: SituacionDomClockProps) {
  const displayRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const expiredRef = useRef(false);
  const vehicleIdRef = useRef(vehicleId);
  vehicleIdRef.current = vehicleId;

  const runTick = useCallback(() => {
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleIdRef.current);
    const ui = computeSituacionTimerUi(vehicle ?? ({} as Vehicle), Date.now());
    const display = displayRef.current;
    const target = targetRef.current;
    if (!display) return;
    if (!ui.visible) {
      display.textContent = "--:--:--";
      if (target) target.textContent = "";
      return;
    }
    display.textContent = ui.display;
    if (target) target.textContent = ui.targetLabel ? `Obj: ${ui.targetLabel}` : "";
    if (ui.expired !== expiredRef.current) {
      expiredRef.current = ui.expired;
      display.style.color = ui.expired ? RING_COLORS.blood : RING_COLORS.gold;
    }
  }, [vehiclesRef]);

  useDomConcienciaClock(runTick, Boolean(clockKey));

  useEffect(() => {
    expiredRef.current = false;
    runTick();
  }, [clockKey, runTick]);

  return (
    <div
      className="rounded-xl border px-3 py-2 flex items-center justify-between gap-2"
      style={{
        backgroundColor: "rgba(212,175,55,0.04)",
        borderColor: `${RING_COLORS.gold}30`,
      }}
      data-testid="ring-situacion-dom-clock"
    >
      <div className="min-w-0">
        <p className="text-[7px] font-black uppercase tracking-widest text-slate-500">Fila en foco</p>
        <span
          ref={targetRef}
          className="text-[8px] text-slate-500 truncate block"
          data-testid="ring-situacion-clock-target"
        />
      </div>
      <span
        ref={displayRef}
        className="text-lg font-mono font-black tabular-nums shrink-0"
        style={{ color: RING_COLORS.gold }}
        data-testid="ring-situacion-clock-display"
      >
        --:--:--
      </span>
    </div>
  );
});

// ─── Filas memoizadas ───────────────────────────────────────────────────────

type RingSubTareaRowProps = {
  sub: SubTarea;
  vehicleId: string;
  ringActivo: boolean;
  onClose: (payload: RingSubTareaClosePayload) => void;
};

const RingSubTareaRow = memo(function RingSubTareaRow({
  sub,
  vehicleId,
  ringActivo,
  onClose,
}: RingSubTareaRowProps) {
  const terminada = isSubTareaTerminada(sub);
  const enRing = Boolean(sub.enDesgloseCronometro);
  const resultado = sub.resultadoSituacion ?? "pendiente";

  const handleClose = useCallback(
    (status: "cumplido" | "fallado") => {
      const now = Date.now();
      const duracionRealSec =
        enRing && sub.creadaAt ? Math.max(0, Math.floor((now - sub.creadaAt) / 1000)) : undefined;
      const closed: SubTarea = {
        ...sub,
        completada: status === "cumplido",
        ...(enRing
          ? {
              resultadoSituacion: status,
              cerradaAt: now,
              duracionRealSec,
            }
          : {}),
      };
      onClose({
        vehicleId,
        subId: sub.id,
        status,
        sub: closed,
        duracionRealSec,
        origenImanId: sub.origenImanId,
        proyectoId: sub.proyectoId,
      });
    },
    [sub, vehicleId, enRing, onClose]
  );

  return (
    <div
      className="rounded-lg p-2 flex flex-col gap-1.5"
      style={{
        backgroundColor: terminada ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.28)",
        border: `1px solid ${terminada ? "rgba(255,255,255,0.04)" : "rgba(0,255,195,0.12)"}`,
        opacity: terminada ? 0.72 : 1,
      }}
      data-testid={`ring-subtarea-${sub.id}`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <span
          className="text-[7px] font-black px-1 py-0.5 rounded shrink-0 uppercase"
          style={{
            backgroundColor: enRing ? "rgba(0,255,195,0.12)" : "rgba(148,163,184,0.1)",
            color: enRing ? RING_COLORS.cyan : RING_COLORS.plata,
          }}
        >
          {enRing ? "RING" : "LISTA"}
        </span>
        <span className="text-[10px] text-slate-200 flex-1 leading-tight break-words">{sub.texto}</span>
        {sub.minutosCupo != null && sub.minutosCupo > 0 && (
          <span className="text-[7px] font-mono text-slate-500 shrink-0">{sub.minutosCupo}′</span>
        )}
      </div>

      {terminada && enRing && (
        <p
          className="text-[7px] font-black uppercase pl-5"
          style={{ color: resultado === "cumplido" ? RING_COLORS.emerald : RING_COLORS.blood }}
        >
          {resultado === "cumplido" ? "Cumplido" : "Fallado"}
          {sub.duracionRealSec != null ? ` · ${formatMMSS(sub.duracionRealSec)}` : ""}
        </p>
      )}

      {!terminada && enRing && ringActivo && (
        <div className="grid grid-cols-2 gap-1.5 pl-5">
          <button
            type="button"
            onClick={() => handleClose("cumplido")}
            className="py-2 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 touch-manipulation"
            style={{
              backgroundColor: "rgba(0,200,81,0.12)",
              color: RING_COLORS.emerald,
              border: "1px solid rgba(0,200,81,0.28)",
            }}
            data-testid={`ring-st-cumplido-${sub.id}`}
          >
            <CheckCircle2 size={11} /> Cumplido
          </button>
          <button
            type="button"
            onClick={() => handleClose("fallado")}
            className="py-2 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 touch-manipulation"
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              color: RING_COLORS.blood,
              border: "1px solid rgba(239,68,68,0.25)",
            }}
            data-testid={`ring-st-fallado-${sub.id}`}
          >
            <XCircle size={11} /> Fallado
          </button>
        </div>
      )}
    </div>
  );
});

type RingSubVehiculoRowProps = {
  sub: SubVehiculo;
  vehicleId: string;
  isActive: boolean;
  blocked: boolean;
  cantidadValuesRef: MutableRefObject<Record<string, string>>;
  onClose: (payload: RingSubVehiculoClosePayload) => void;
  frozenVerdict?: { verdict: SubCloseVerdict; deltaSec: number };
};

const RingSubVehiculoRow = memo(function RingSubVehiculoRow({
  sub,
  vehicleId,
  isActive,
  blocked,
  cantidadValuesRef,
  onClose,
  frozenVerdict,
}: RingSubVehiculoRowProps) {
  const terminado = sub.status === "cumplido" || sub.status === "fallado";
  const banda = bandaActualFromSub(sub);

  const handleClose = useCallback(
    (status: "cumplido" | "fallado") => {
      const cantidadInput = cantidadValuesRef.current[sub.id] ?? "";
      const validation = validateSubCloseCantidad(sub, cantidadInput, status);
      if (!validation.ok) return;

      const now = Date.now();
      const duracionSec = sub.aperturaAt ? Math.floor((now - sub.aperturaAt) / 1000) : 0;
      const closed: SubVehiculo = {
        ...sub,
        status,
        cierreAt: now,
        duracionFinal: duracionSec,
        cantidadLograda: validation.cantidad,
      };
      const { verdict, deltaSec, refSec, realSec } = computeSubCloseVerdict(closed);
      onClose({
        vehicleId,
        subId: sub.id,
        status,
        sub: closed,
        verdict,
        deltaSec,
        refSec,
        realSec,
        cantidadLograda: validation.cantidad,
      });
    },
    [sub, vehicleId, cantidadValuesRef, onClose]
  );

  const cantidadInput = cantidadValuesRef.current[sub.id] ?? "";
  const cumplidoOk = validateSubCloseCantidad(sub, cantidadInput, "cumplido").ok;
  const falladoOk = validateSubCloseCantidad(sub, cantidadInput, "fallado").ok;
  const needsCantidad = Boolean(sub.cantidadObjetivo && sub.cantidadObjetivo > 0);

  const displayVerdict =
    frozenVerdict ??
    (terminado && sub.duracionFinal != null ? computeSubCloseVerdict(sub) : null);

  return (
    <div
      className="rounded-lg p-2 flex flex-col gap-1.5"
      style={{
        backgroundColor: isActive ? "rgba(212,175,55,0.06)" : "rgba(0,0,0,0.28)",
        border: `1px solid ${isActive ? `${RING_COLORS.gold}35` : "rgba(255,255,255,0.05)"}`,
        opacity: terminado ? 0.75 : 1,
      }}
      data-testid={`ring-subvehiculo-${sub.id}`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <span
          className="text-[7px] font-black px-1 py-0.5 rounded shrink-0 uppercase"
          style={{
            backgroundColor:
              sub.status === "activo"
                ? `${RING_COLORS.gold}20`
                : terminado
                  ? "rgba(148,163,184,0.1)"
                  : "rgba(255,255,255,0.06)",
            color: sub.status === "activo" ? RING_COLORS.gold : RING_COLORS.plata,
          }}
        >
          {sub.status === "activo" ? "ACTIVO" : terminado ? sub.status : "COLA"}
        </span>
        <span className="text-[10px] text-slate-200 flex-1 leading-tight break-words">{sub.titulo}</span>
        {banda && (
          <span className="text-[6px] font-black uppercase shrink-0" style={{ color: RING_COLORS.plata }}>
            {RUTA_BANDA_META[banda].icon} {RUTA_BANDA_META[banda].label}
          </span>
        )}
      </div>

      {displayVerdict && displayVerdict.verdict !== "noRef" && (
        <p
          className="text-[7px] font-black uppercase pl-5"
          style={{ color: verdictColor(displayVerdict.verdict) }}
        >
          {verdictLabel(displayVerdict.verdict, displayVerdict.deltaSec)}
        </p>
      )}

      {isActive && !terminado && (
        <>
          {needsCantidad && (
            <input
              key={sub.id}
              type="text"
              inputMode="numeric"
              defaultValue={cantidadValuesRef.current[sub.id] ?? ""}
              onChange={e => {
                cantidadValuesRef.current[sub.id] = e.target.value;
              }}
              placeholder="Cant. lograda"
              className="ml-5 w-[calc(100%-1.25rem)] px-2 py-1 rounded bg-black/40 border border-white/10 text-[9px] text-white placeholder:text-slate-600 focus:outline-none focus:border-white/25"
              data-testid={`ring-sv-cantidad-${sub.id}`}
            />
          )}
          <div className="grid grid-cols-2 gap-1.5 pl-5">
            <button
              type="button"
              disabled={blocked || !cumplidoOk}
              onClick={() => handleClose("cumplido")}
              className="py-2 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 touch-manipulation disabled:opacity-35"
              style={{
                backgroundColor: "rgba(0,200,81,0.12)",
                color: RING_COLORS.emerald,
                border: "1px solid rgba(0,200,81,0.28)",
              }}
              data-testid={`ring-sv-cumplido-${sub.id}`}
            >
              <CheckCircle2 size={11} /> Cumplido
            </button>
            <button
              type="button"
              disabled={blocked || !falladoOk}
              onClick={() => handleClose("fallado")}
              className="py-2 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 touch-manipulation disabled:opacity-35"
              style={{
                backgroundColor: "rgba(239,68,68,0.1)",
                color: RING_COLORS.blood,
                border: "1px solid rgba(239,68,68,0.25)",
              }}
              data-testid={`ring-sv-fallado-${sub.id}`}
            >
              <XCircle size={11} /> Fallado
            </button>
          </div>
        </>
      )}
    </div>
  );
});

// ─── Componente principal ───────────────────────────────────────────────────

function RingEnfoqueModuleInner(
  {
    mode,
    vehicleId,
    vehiclesRef,
    subTareas,
    subVehiculos,
    situacionCronometro,
    desglosadorPausa,
    interrupcionActiva,
    blockedByInterrupt = false,
    hayVehiculoActivo = false,
    situacionCupoAnchor,
    onSubTareasChange,
    onSubVehiculosChange,
    onSubTareaClose,
    onSubVehiculoClose,
    className = "",
  }: RingEnfoqueModuleProps,
  ref: Ref<RingEnfoqueModuleHandle>
) {
  const [localSubTareas, setLocalSubTareas] = useState(subTareas);
  const [localSubVehiculos, setLocalSubVehiculos] = useState(subVehiculos);
  const cantidadValuesRef = useRef<Record<string, string>>({});
  const [closedVerdicts, setClosedVerdicts] = useState<
    Record<string, { verdict: SubCloseVerdict; deltaSec: number }>
  >({});

  useEffect(() => {
    setLocalSubTareas(subTareas);
  }, [subTareas]);

  useEffect(() => {
    setLocalSubVehiculos(prev =>
      subsStructuralEqual(prev, subVehiculos) ? prev : subVehiculos
    );
  }, [subVehiculos]);

  const ringActivo = situacionCronometro?.activo === true;
  const activeSubVehiculo = useMemo(
    () => localSubVehiculos.find(s => s.status === "activo"),
    [localSubVehiculos]
  );

  const desglosadorClockKey = desglosadorSubActiveIdKey(activeSubVehiculo);

  const situacionClockKey = useMemo(
    () =>
      `${situacionCronometro?.bloqueInicioAt ?? 0}:${situacionCupoAnchor?.subTareaId ?? ""}:${situacionCupoAnchor?.startedAt ?? 0}`,
    [situacionCronometro?.bloqueInicioAt, situacionCupoAnchor?.subTareaId, situacionCupoAnchor?.startedAt]
  );

  const sortedSubTareas = useMemo(() => sortTrabajoPrimero(localSubTareas), [localSubTareas]);
  const ringPendientes = useMemo(
    () => filtrarRingPendientes(localSubTareas),
    [localSubTareas]
  );
  const listaLibre = useMemo(
    () => sortedSubTareas.filter(st => !st.enDesgloseCronometro),
    [sortedSubTareas]
  );
  const colaRing = useMemo(
    () => sortedSubTareas.filter(st => st.enDesgloseCronometro),
    [sortedSubTareas]
  );

  const recibirItemDeCrisol = useCallback(
    (item: SituacionReservaItem) => {
      const ruta = item.ruta ?? "ejecucion";

      if (mode === "tiempo") {
        const newSub = subVehiculoFromCrisolItem(item);
        setLocalSubVehiculos(prev => {
          const next = [...prev, newSub];
          startTransition(() => {
            onSubVehiculosChange?.(next);
          });
          return next;
        });
        return;
      }

      let newSub = subTareaFromImanItem(item);
      if (ruta === "situacion_desglosador") {
        newSub = {
          ...newSub,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
          completada: false,
        };
      }

      setLocalSubTareas(prev => {
        const next = [...prev, newSub];
        startTransition(() => {
          onSubTareasChange?.(next);
        });
        return next;
      });
    },
    [mode, onSubTareasChange, onSubVehiculosChange]
  );

  useImperativeHandle(ref, () => ({ recibirItemDeCrisol }), [recibirItemDeCrisol]);

  const applySubTareaClose = useCallback(
    (payload: RingSubTareaClosePayload) => {
      setLocalSubTareas(prev => {
        const next = prev.map(st => (st.id === payload.subId ? payload.sub : st));
        startTransition(() => {
          onSubTareasChange?.(next);
        });
        return next;
      });
      void Promise.resolve(onSubTareaClose(payload));
    },
    [onSubTareaClose, onSubTareasChange]
  );

  const applySubVehiculoClose = useCallback(
    (payload: RingSubVehiculoClosePayload) => {
      setClosedVerdicts(prev => ({
        ...prev,
        [payload.subId]: { verdict: payload.verdict, deltaSec: payload.deltaSec },
      }));
      setLocalSubVehiculos(prev => {
        const next = prev.map(sv => (sv.id === payload.subId ? payload.sub : sv));
        startTransition(() => {
          onSubVehiculosChange?.(next);
        });
        return next;
      });
      void Promise.resolve(onSubVehiculoClose(payload));
    },
    [onSubVehiculoClose, onSubVehiculosChange]
  );

  const pendientesSv = localSubVehiculos.filter(
    s => s.status === "pendiente" || s.status === "activo"
  );
  const cerradosSv = localSubVehiculos.filter(
    s => s.status === "cumplido" || s.status === "fallado"
  );

  return (
    <section
      className={`rounded-2xl border overflow-hidden ${className}`.trim()}
      style={{
        backgroundColor: RING_COLORS.pizarra,
        borderColor: `${RING_COLORS.gold}28`,
        boxShadow: `0 0 20px ${RING_COLORS.gold}08`,
      }}
      data-testid="ring-enfoque-module"
      data-hay-vehiculo-activo={hayVehiculoActivo ? "true" : "false"}
    >
      <header
        className="px-3 py-2 flex items-center gap-2 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <Target size={14} style={{ color: RING_COLORS.gold }} />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: RING_COLORS.gold }}>
            {RING_COPY.ring}
          </p>
          <p className="text-[7px] text-slate-600 truncate">{RING_COPY.ringHint}</p>
        </div>
        <span
          className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: "rgba(212,175,55,0.1)", color: RING_COLORS.gold }}
        >
          {mode === "situacion"
            ? `${ringPendientes.length} ring`
            : `${pendientesSv.length} cola`}
        </span>
      </header>

      <div className="px-3 py-2 space-y-2 max-h-[min(50dvh,22rem)] overflow-y-auto overscroll-contain">
        {mode === "tiempo" && activeSubVehiculo?.aperturaAt && (
          <RingDomClock
            vehicleId={vehicleId}
            vehiclesRef={vehiclesRef}
            clockKey={desglosadorClockKey}
            activeSubTitulo={activeSubVehiculo.titulo}
          />
        )}

        {mode === "situacion" && ringActivo && (
          <SituacionDomClock
            vehicleId={vehicleId}
            vehiclesRef={vehiclesRef}
            clockKey={situacionClockKey}
          />
        )}

        {mode === "situacion" && (
          <>
            {colaRing.length > 0 && (
              <div className="space-y-1">
                <p className="text-[7px] font-black uppercase tracking-widest text-slate-500 px-0.5">
                  Ring sellado · {colaRing.length}
                  {!ringActivo && ringPendientes.length > 0 && (
                    <span className="text-slate-600"> · cronómetro pausado</span>
                  )}
                </p>
                {colaRing.map(st => (
                  <RingSubTareaRow
                    key={st.id}
                    sub={st}
                    vehicleId={vehicleId}
                    ringActivo={ringActivo || situacionFilaCronometroPendiente(st)}
                    onClose={applySubTareaClose}
                  />
                ))}
              </div>
            )}

            {listaLibre.length > 0 && (
              <div className="space-y-1">
                <p className="text-[7px] font-black uppercase tracking-widest text-slate-500 px-0.5">
                  Lista libre · {listaLibre.length}
                </p>
                {listaLibre.map(st => (
                  <RingSubTareaRow
                    key={st.id}
                    sub={st}
                    vehicleId={vehicleId}
                    ringActivo={false}
                    onClose={applySubTareaClose}
                  />
                ))}
              </div>
            )}

            {localSubTareas.length === 0 && (
              <p className="text-[9px] text-center text-slate-600 py-4">
                Cola vacía — despacha desde El Crisol.
              </p>
            )}
          </>
        )}

        {mode === "tiempo" && (
          <>
            {pendientesSv.length > 0 && (
              <div className="space-y-1">
                <p className="text-[7px] font-black uppercase tracking-widest text-slate-500 px-0.5">
                  Desglosador 3 bandas · {pendientesSv.length}
                </p>
                {pendientesSv.map(sv => (
                  <RingSubVehiculoRow
                    key={sv.id}
                    sub={sv}
                    vehicleId={vehicleId}
                    isActive={sv.status === "activo"}
                    blocked={blockedByInterrupt}
                    cantidadValuesRef={cantidadValuesRef}
                    onClose={applySubVehiculoClose}
                  />
                ))}
              </div>
            )}

            {cerradosSv.length > 0 && (
              <div className="space-y-1">
                <p className="text-[7px] font-black uppercase tracking-widest text-slate-500 px-0.5">
                  Liquidados · {cerradosSv.length}
                </p>
                {cerradosSv.map(sv => {
                  if (sv.cantidadLograda != null && cantidadValuesRef.current[sv.id] == null) {
                    cantidadValuesRef.current[sv.id] = String(sv.cantidadLograda);
                  }
                  return (
                  <RingSubVehiculoRow
                    key={sv.id}
                    sub={sv}
                    vehicleId={vehicleId}
                    isActive={false}
                    blocked
                    cantidadValuesRef={cantidadValuesRef}
                    onClose={applySubVehiculoClose}
                    frozenVerdict={closedVerdicts[sv.id]}
                  />
                  );
                })}
              </div>
            )}

            {localSubVehiculos.length === 0 && (
              <p className="text-[9px] text-center text-slate-600 py-4">
                Sin subs en cola — añade desde el desglosador o El Crisol.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export const RingEnfoqueModule = memo(forwardRef(RingEnfoqueModuleInner));
RingEnfoqueModule.displayName = "RingEnfoqueModule";

export default RingEnfoqueModule;

export type { SituacionReservaItem, SubTarea, SubVehiculo, SubCloseVerdict };
