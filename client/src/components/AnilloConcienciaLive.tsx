import { memo, useEffect, useMemo, useState } from "react";
import AnilloConciencia from "@/components/AnilloConciencia";
import AnilloConcienciaHorizon from "@/components/AnilloConcienciaHorizon";
import { AnilloRingErrorBoundary } from "@/components/AnilloRingErrorBoundary";
import {
  formatMinutosJornada,
  nowToClockDeg,
  nowToHalfDayLap,
  vehicleCoversConsciousnessAt,
  type SegmentoAnilloLite,
} from "@/engines/ConcienciaEngine";
import {
  useMiniBlockConquest,
  type SegmentoMiniRing,
} from "@/components/jornada/useMiniBlockConquest";
import { computeHorizonProjection } from "@/engines/ConcienciaHorizonEngine";
import { formatLimaTimeHM } from "@/lib/segmentTime";
import { getSharedAnilloLiveModel } from "@/lib/anilloLiveModelCache";
import {
  readAnilloViewMode,
  subscribeAnilloViewMode,
  writeAnilloViewMode,
  type AnilloViewMode,
} from "@/lib/anilloViewMode";
import { useConcienciaClockTick, useConcienciaMetricTick, isCoarseConcienciaDevice } from "@/lib/concienciaClock";
import { MOBILE_PERF } from "@/lib/mobilePerf";
import type { Vehicle } from "@/lib/persistence";

const BLOOD = "#FF3131";

function sanitizeSegmentos(segmentos: SegmentoAnilloLite[]): SegmentoAnilloLite[] {
  return segmentos.filter((s): s is SegmentoAnilloLite => !!s && typeof s === "object");
}

type SegmentoConEstado = SegmentoAnilloLite & { id?: string; estado?: string };

function resolveSegmentoActivo(segmentos: SegmentoAnilloLite[]): SegmentoMiniRing | null {
  const segs = sanitizeSegmentos(segmentos) as SegmentoConEstado[];
  const found = segs.find(s => s.estado === "activo");
  if (!found?.id || !found.horaInicio || !found.horaFin) return null;
  return { id: found.id, horaInicio: found.horaInicio, horaFin: found.horaFin };
}

function emptyAnilloModel(segs: SegmentoAnilloLite[]) {
  return {
    segs,
    segmentClockArcs: [] as ReturnType<typeof getSharedAnilloLiveModel>["segmentClockArcs"],
    segmentBattleArcs: [] as ReturnType<typeof getSharedAnilloLiveModel>["segmentBattleArcs"],
    segmentArcStats: [] as ReturnType<typeof getSharedAnilloLiveModel>["segmentArcStats"],
    horizonProjection: computeHorizonProjection({ segmentos: [], vehiculos: [] }),
    metricas: {
      planificacionPct: 0,
      conquistaMin: 0,
      entropiaMin: 0,
      jornadaMin: 0,
      conquistaArcPct: 0,
      entropiaArcPct: 0,
      fillPct: 0,
      horasCubiertas: 0,
    },
    anilloEstado: { mode: "libre" as const, centerGuide: "", deg: 0, umbralMin: 360, sinSegmentos: true },
    timelineArcs: [] as ReturnType<typeof getSharedAnilloLiveModel>["timelineArcs"],
    dayStats: { conquistaMin: 0, entropiaMin: 0, vacioMin: 0, centinelaMin: 0 },
    segConquistados: 0,
  };
}

export interface AnilloConcienciaLiveProps {
  segmentos: SegmentoAnilloLite[];
  vehicles: Vehicle[];
  conquistaPulse?: boolean;
  /** Solo el SVG del anillo (cockpit). */
  ringOnly?: boolean;
  size?: number;
  className?: string;
  /** Muestra conquista / entropía / segmentos bajo el anillo. */
  showDayStats?: boolean;
  /** Toggle Mapa / Horizonte (cockpit y tarjeta métricas). */
  showViewToggle?: boolean;
}

/**
 * Anillo + contador inconsciente en vivo. Aísla ticks del resto de Jornada.
 * Métricas pesadas: 1 s escritorio / ~5 s móvil. Puntero: cada 1 s (barato).
 */
function AnilloConcienciaLiveInner({
  segmentos,
  vehicles,
  conquistaPulse = false,
  ringOnly = false,
  size = 130,
  className,
  showDayStats = false,
  showViewToggle = true,
}: AnilloConcienciaLiveProps) {
  const [viewMode, setViewMode] = useState<AnilloViewMode>(() => readAnilloViewMode());
  const pointerTick = useConcienciaClockTick();
  const metricTick = useConcienciaMetricTick();

  useEffect(() => subscribeAnilloViewMode(setViewMode), []);

  const [heavyReady, setHeavyReady] = useState(() => !isCoarseConcienciaDevice());

  useEffect(() => {
    if (heavyReady) return;
    let cancelled = false;
    const start = () => {
      if (!cancelled) setHeavyReady(true);
    };
    const deferMs = isCoarseConcienciaDevice() ? MOBILE_PERF.ANILLO_DEFER_MS : 1500;
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(start, { timeout: deferMs });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(start, deferMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [heavyReady]);

  const model = useMemo(() => {
    void metricTick;
    const segs = sanitizeSegmentos(segmentos);
    if (!heavyReady) return emptyAnilloModel(segs);
    try {
      return getSharedAnilloLiveModel(segmentos, vehicles, Date.now());
    } catch (err) {
      console.error("[AnilloConcienciaLive] model", err);
      return emptyAnilloModel(segs);
    }
  }, [segmentos, vehicles, metricTick, heavyReady]);

  const pointerDeg = useMemo(() => {
    void pointerTick;
    return nowToClockDeg(Date.now());
  }, [pointerTick]);

  const pointerLap = useMemo(() => {
    void pointerTick;
    return nowToHalfDayLap(Date.now());
  }, [pointerTick]);

  const limaClockLabel = useMemo(() => {
    void pointerTick;
    return formatLimaTimeHM(Date.now());
  }, [pointerTick]);

  const segmentoActivo = useMemo(
    () => resolveSegmentoActivo(segmentos),
    [segmentos]
  );

  const hayVehiculoActivo = useMemo(() => {
    void pointerTick;
    const now = Date.now();
    return vehicles.some(v => vehicleCoversConsciousnessAt(v, now));
  }, [vehicles, pointerTick]);

  const blockConquestPct = useMiniBlockConquest(segmentoActivo, hayVehiculoActivo, pointerTick);

  const planPresentePct = useMemo(() => {
    const jornada = model.metricas.jornadaMin;
    if (jornada <= 0) return 0;
    return Math.min(100, Math.round((model.dayStats.conquistaMin / jornada) * 100));
  }, [model.metricas.jornadaMin, model.dayStats.conquistaMin]);

  const libreMin = useMemo(
    () => Math.max(0, 1440 - model.metricas.jornadaMin),
    [model.metricas.jornadaMin]
  );

  const toggle = showViewToggle ? (
    <div
      className="flex rounded-lg border overflow-hidden mb-1"
      style={{ borderColor: "rgba(255,255,255,0.1)" }}
      role="tablist"
      aria-label="Vista del anillo"
    >
      {(["mapa", "horizonte"] as const).map(mode => {
        const active = viewMode === mode;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`anillo-view-${mode}`}
            className="px-2 py-0.5 text-[7px] font-black uppercase tracking-widest transition-colors"
            style={{
              backgroundColor: active ? "rgba(0,255,195,0.12)" : "transparent",
              color: active ? "#00FFC3" : "rgba(148,163,184,0.7)",
            }}
            onClick={() => {
              writeAnilloViewMode(mode);
              setViewMode(mode);
            }}
          >
            {mode === "mapa" ? "Mapa" : "Horizonte"}
          </button>
        );
      })}
    </div>
  ) : null;

  const ring = (
    <AnilloRingErrorBoundary size={size}>
      {viewMode === "horizonte" ? (
        <AnilloConcienciaHorizon
          projection={model.horizonProjection}
          planificacionPct={model.metricas.planificacionPct}
          planPresentePct={planPresentePct}
          blockConquestPct={blockConquestPct}
          hasSegmentoActivo={segmentoActivo != null}
          size={size}
          conquistaPulse={conquistaPulse}
        />
      ) : (
        <AnilloConciencia
          planificacionPct={model.metricas.planificacionPct}
          planPresentePct={planPresentePct}
          blockConquestPct={blockConquestPct}
          hasSegmentoActivo={segmentoActivo != null}
          timelineArcs={model.timelineArcs}
          conquistaPulse={conquistaPulse}
          size={size}
          segmentClockArcs={model.segmentClockArcs}
          segmentBattleArcs={model.segmentBattleArcs}
          segmentArcStats={model.segmentArcStats}
          segmentos={model.segs}
          pointerDeg={pointerDeg}
          pointerLap={pointerLap}
          pointerMode={model.anilloEstado.mode}
          centerGuide={model.anilloEstado.centerGuide}
          limaClockLabel={limaClockLabel}
        />
      )}
    </AnilloRingErrorBoundary>
  );

  if (ringOnly) {
    return (
      <div className={className}>
        {toggle}
        {ring}
      </div>
    );
  }

  return (
    <div className={className}>
      {toggle}
      {ring}
      {showDayStats && (
        <div className="mt-2 grid grid-cols-3 gap-1 w-full text-center">
          <div>
            <p className="text-[7px] uppercase font-bold" style={{ color: "#8B5CF6" }}>
              Consciente
            </p>
            <p className="text-xs font-black" style={{ color: "#8B5CF6" }}>
              {formatMinutosJornada(model.dayStats.conquistaMin)}
            </p>
          </div>
          <div>
            <p className="text-[7px] uppercase font-bold" style={{ color: BLOOD }}>
              Inconsciente
            </p>
            <p
              className="text-xs font-black"
              style={{
                color:
                  model.dayStats.entropiaMin > 0 ? BLOOD : "rgba(148,163,184,0.5)",
              }}
            >
              {formatMinutosJornada(model.dayStats.entropiaMin)}
            </p>
          </div>
          <div>
            <p className="text-[7px] text-slate-500 uppercase">Seg. cerrados</p>
            <p className="text-xs font-black" style={{ color: "#00FFC3" }}>
              {model.segConquistados}/{model.segs.length}
            </p>
          </div>
        </div>
      )}
      {showDayStats && model.metricas.jornadaMin > 0 && (
        <p className="mt-1.5 text-[7px] text-slate-600 text-center leading-snug px-1">
          Nombraste {formatMinutosJornada(model.metricas.jornadaMin)}
          {libreMin > 0 ? ` · ${formatMinutosJornada(libreMin)} tiempo abierto` : ""}
        </p>
      )}
    </div>
  );
}

const AnilloConcienciaLive = memo(AnilloConcienciaLiveInner);
export default AnilloConcienciaLive;
