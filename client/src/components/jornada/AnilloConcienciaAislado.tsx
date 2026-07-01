import {
  memo,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import type { Vehicle } from "@/lib/persistence";
import {
  buildConcienciaTimeline,
  computeSegmentBattleArcs,
  computeSegmentClockArcs,
  limaNowToClockDeg,
  limaNowToHalfDayLap,
  vehicleCoversConsciousnessAt,
  type AnilloPointerMode,
  type MetricasAnilloConciencia,
  type SegmentoAnilloLite,
  type TimelineClockArc,
  type VehiculoAnilloLite,
} from "@/engines/ConcienciaEngine";
import {
  computeHorizonProjection,
  type HorizonArc,
} from "@/engines/ConcienciaHorizonEngine";
import { formatLimaTimeHM, segmentDurationMinutes } from "@/lib/segmentTime";
import { hardwareElapsedSec } from "@/lib/hardwareClock";

// ─── Paleta tech-noir ───────────────────────────────────────────────────────

const COLORS = {
  charcoal: "#0a0a0a",
  track: "rgba(30, 35, 48, 0.95)",
  trackDim: "rgba(30, 35, 48, 0.7)",
  gold: "#D4AF37",
  cyan: "#00FFC3",
  purple: "#8B5CF6",
  blood: "#FF3131",
  plata: "#94a3b8",
  steel: "rgba(148, 163, 184, 0.55)",
  segmentIdle: "rgba(255,255,255,0.18)",
} as const;

const POINTER_COLORS: Record<AnilloPointerMode, string> = {
  libre: COLORS.steel,
  conquista: COLORS.purple,
  entropia: COLORS.blood,
};

const TICK_MS = 1000;

// ─── Tipos públicos ─────────────────────────────────────────────────────────

export type AnilloViewMode = "mapa" | "horizonte";

export interface AnilloConcienciaAisladoProps {
  segmentos: SegmentoAnilloLite[];
  vehicles: Vehicle[];
  /** Firma primitiva de la flota — evita recomputar cuando la referencia del array cambia sin datos nuevos. */
  vehiclesSig?: string;
  viewMode: AnilloViewMode;
  size?: number;
  /** ID del segmento activo — al cambiar, el micro-ring resetea fillPct en memoria volátil. */
  activeSegmentId?: string | null;
  hayVehiculoActivo?: boolean;
  /** Se dispara al detectar cambio de segmento activo (sin persistencia). */
  onSegmentChange?: (segmentId: string | null) => void;
  /**
   * Sello de revisión de métricas del orquestador (~3–5 s).
   * Evita recomputar timeline en cada render del padre.
   */
  metricsRevision?: number;
  className?: string;
}

type RingGeometry = {
  cx: number;
  cy: number;
  segR: number;
  segR2: number;
  segSW: number;
  timelineR: number;
  timelineR2: number;
  timelineSW: number;
  outerR: number;
  innerR: number;
  boxingR: number;
  strokeW: number;
};

type VolatileBlock = {
  segmentId: string | null;
  startedAt: number | null;
};

// ─── Fórmulas heredadas (ConcienciaEngine — computeInnerRingMetrics) ─────────

function roundArcPct(value: number): number {
  return Math.min(100, Math.round(value * 10) / 10);
}

function computeInnerRingMetrics(params: {
  jornadaMin: number;
  conquistaMin: number;
  entropiaMin: number;
  modoBatallaAnillo: boolean;
}): Pick<MetricasAnilloConciencia, "conquistaArcPct" | "entropiaArcPct" | "fillPct"> {
  const { jornadaMin, conquistaMin, entropiaMin, modoBatallaAnillo } = params;
  const conquistaArcPct = jornadaMin > 0 ? roundArcPct((conquistaMin / jornadaMin) * 100) : 0;

  if (modoBatallaAnillo) {
    const terrenoRestanteMin = Math.round(Math.max(0, jornadaMin - conquistaMin) * 10) / 10;
    const entropiaArcPct =
      jornadaMin > 0 ? roundArcPct((terrenoRestanteMin / jornadaMin) * 100) : 0;
    return { conquistaArcPct, entropiaArcPct, fillPct: 100 };
  }

  const entropiaArcPct = jornadaMin > 0 ? roundArcPct((entropiaMin / jornadaMin) * 100) : 0;
  return {
    conquistaArcPct,
    entropiaArcPct,
    fillPct: Math.min(100, conquistaArcPct + entropiaArcPct),
  };
}

// ─── Helpers SVG puros ──────────────────────────────────────────────────────

const toRad = (deg: number) => (deg * Math.PI) / 180;

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  let span = endDeg - startDeg;
  if (span <= 0) span += 360;
  if (span >= 360) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`;
  }
  const start = toRad(startDeg - 90);
  const end = toRad(endDeg - 90);
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const large = span > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function ringGeometry(size: number): RingGeometry {
  const segSW = size * 0.05;
  const timelineSW = size * 0.048;
  const segR = size * 0.455;
  const timelineR = size * 0.405;
  return {
    cx: size / 2,
    cy: size / 2,
    segR,
    segR2: segR - segSW * 1.25,
    segSW,
    timelineR,
    timelineR2: timelineR - timelineSW * 1.25,
    timelineSW,
    outerR: size * 0.375,
    innerR: size * 0.265,
    boxingR: size * 0.18,
    strokeW: size * 0.055,
  };
}

function segmentArcColor(estado?: string): { color: string; opacity: number } {
  if (estado === "cerrado_manual" || estado === "entropia") {
    return { color: COLORS.gold, opacity: 1 };
  }
  if (estado === "activo") {
    return { color: COLORS.cyan, opacity: 1 };
  }
  return { color: COLORS.segmentIdle, opacity: 0.85 };
}

function vehiclesToLite(vehicles: Vehicle[]): VehiculoAnilloLite[] {
  return vehicles.map(v => ({
    autoVerdad: v.autoVerdad,
    status: v.status,
    tipoFlota: v.tipoFlota,
    tipoReloj: v.tipoReloj,
    tipoDescanso: v.tipoDescanso,
    interrupcionActiva: v.interrupcionActiva,
    desglosadorPausa: v.desglosadorPausa,
    puntoCero: v.puntoCero,
    aperturaAt: v.aperturaAt,
    createdAt: v.createdAt,
    primerAccionAt: v.primerAccionAt,
    cierreAt: v.cierreAt,
    duracionFinal: v.duracionFinal,
    completedAt: v.completedAt,
  }));
}

function applyDashOffset(
  el: SVGCircleElement | null,
  pct: number,
  circumference: number,
  rotateCx: number,
  rotateCy: number
): void {
  if (!el) return;
  const clamped = Math.min(100, Math.max(0, pct));
  const dash = (clamped / 100) * circumference;
  el.setAttribute("stroke-dasharray", `${dash.toFixed(2)} ${circumference.toFixed(2)}`);
  el.setAttribute("transform", `rotate(-90 ${rotateCx} ${rotateCy})`);
}

function filterHorizonForActiveSegment(
  arcs: HorizonArc[],
  segmentos: SegmentoAnilloLite[],
  activeSegmentId?: string | null
): HorizonArc[] {
  if (!activeSegmentId) return arcs;
  const idx = segmentos.findIndex(s => (s as { id?: string }).id === activeSegmentId);
  const ordinal = idx >= 0 ? idx + 1 : -1;
  if (ordinal < 0) return arcs;
  return arcs.filter(
    a =>
      a.kind === "fondo" ||
      a.kind === "conquista" ||
      a.kind === "entropia" ||
      (a.kind === "segmento" && a.ordinal === ordinal)
  );
}

// ─── Componente ─────────────────────────────────────────────────────────────

function AnilloConcienciaAisladoInner({
  segmentos,
  vehicles,
  vehiclesSig = "",
  viewMode,
  size = 140,
  activeSegmentId = null,
  hayVehiculoActivo = false,
  onSegmentChange,
  metricsRevision = 0,
  className = "",
}: AnilloConcienciaAisladoProps) {
  const geom = useMemo(() => ringGeometry(size), [size]);
  const vehiculosLite = useMemo(() => vehiclesToLite(vehicles), [vehiclesSig]);

  const segmentSig = useMemo(
    () =>
      segmentos
        .map(s => {
          const seg = s as SegmentoAnilloLite & { id?: string; estado?: string; nombre?: string };
          return `${seg.id ?? ""}:${seg.estado ?? ""}:${seg.horaInicio ?? ""}:${seg.horaFin ?? ""}`;
        })
        .join("|"),
    [segmentos]
  );

  const model = useMemo(() => {
    void metricsRevision;
    const now = Date.now();
    try {
      const timeline = buildConcienciaTimeline({
        segmentos,
        vehiculos: vehiculosLite,
        now,
      });
      const segmentClockArcs = computeSegmentClockArcs(
        segmentos as Array<SegmentoAnilloLite & { estado?: string; nombre?: string }>,
        now
      );
      const segmentBattleArcs = computeSegmentBattleArcs({
        segmentos,
        vehiculos: vehiculosLite,
        now,
      });
      const horizonProjection = computeHorizonProjection({
        segmentos: segmentos as Array<SegmentoAnilloLite & { estado?: string; nombre?: string }>,
        vehiculos: vehiculosLite,
        now,
      });
      const modoBatalla = segmentos.length > 0 && timeline.metricas.jornadaMin > 0;
      const inner = computeInnerRingMetrics({
        jornadaMin: timeline.metricas.jornadaMin,
        conquistaMin: timeline.metricas.conquistaMin,
        entropiaMin: timeline.metricas.entropiaMin,
        modoBatallaAnillo: modoBatalla,
      });
      return {
        timeline,
        segmentClockArcs,
        segmentBattleArcs,
        horizonProjection,
        inner,
        modoBatalla,
      };
    } catch {
      return null;
    }
  }, [segmentSig, vehiclesSig, metricsRevision]);

  const pointerNeedleRef = useRef<SVGLineElement>(null);
  const pointerCapRef = useRef<SVGCircleElement>(null);
  const pointerHubRef = useRef<SVGCircleElement>(null);
  const clockLabelRef = useRef<SVGTextElement>(null);
  const ampmLabelRef = useRef<SVGTextElement>(null);
  const boxingConquistaRef = useRef<SVGCircleElement>(null);
  const boxingEntropiaRef = useRef<SVGCircleElement>(null);
  const boxingBlockRef = useRef<SVGCircleElement>(null);
  const planRingRef = useRef<SVGCircleElement>(null);

  const pointerModeRef = useRef<AnilloPointerMode>("libre");
  const consciousCachedRef = useRef(true);
  const volatileBlockRef = useRef<VolatileBlock>({ segmentId: null, startedAt: null });
  const prevSegmentRef = useRef<string | null>(null);
  const innerMetricsRef = useRef({ conquistaArcPct: 0, entropiaArcPct: 0, fillPct: 0 });
  const geomRef = useRef(geom);
  const segmentDurSecRef = useRef(0);
  const onSegmentChangeRef = useRef(onSegmentChange);
  const hayVehiculoActivoRef = useRef(hayVehiculoActivo);
  const activeSegmentIdRef = useRef(activeSegmentId);
  const segmentosRef = useRef(segmentos);

  geomRef.current = geom;
  onSegmentChangeRef.current = onSegmentChange;
  hayVehiculoActivoRef.current = hayVehiculoActivo;
  activeSegmentIdRef.current = activeSegmentId;
  segmentosRef.current = segmentos;

  useEffect(() => {
    if (!model) return;
    pointerModeRef.current = model.timeline.anilloEstado.mode;
    innerMetricsRef.current = model.inner;
    consciousCachedRef.current =
      vehiculosLite.length === 0
        ? false
        : vehiculosLite.some(v => vehicleCoversConsciousnessAt(v, Date.now()));

    const g = geomRef.current;
    const planCirc = 2 * Math.PI * g.outerR;
    const planPct = model.timeline.metricas.planificacionPct;
    applyDashOffset(planRingRef.current, planPct, planCirc, g.cx, g.cy);

    const boxCirc = 2 * Math.PI * g.boxingR;
    applyDashOffset(boxingConquistaRef.current, model.inner.conquistaArcPct, boxCirc, g.cx, g.cy);

    const entStart = model.inner.conquistaArcPct;
    const entEl = boxingEntropiaRef.current;
    if (entEl) {
      const entPct = model.inner.entropiaArcPct;
      const entDash = (entPct / 100) * boxCirc;
      const offset = (entStart / 100) * boxCirc;
      entEl.setAttribute(
        "stroke-dasharray",
        `${entDash.toFixed(2)} ${boxCirc.toFixed(2)}`
      );
      entEl.setAttribute("stroke-dashoffset", `${(-offset).toFixed(2)}`);
      entEl.setAttribute("transform", `rotate(-90 ${g.cx} ${g.cy})`);
    }

    applyDashOffset(boxingBlockRef.current, 0, boxCirc, g.cx, g.cy);
  }, [model]);

  useEffect(() => {
    const seg = segmentos.find(
      s => (s as { id?: string }).id === activeSegmentId
    ) as (SegmentoAnilloLite & { horaInicio?: string; horaFin?: string }) | undefined;

    if (activeSegmentId !== prevSegmentRef.current) {
      prevSegmentRef.current = activeSegmentId;
      volatileBlockRef.current = {
        segmentId: activeSegmentId,
        startedAt: hayVehiculoActivo && activeSegmentId ? Date.now() : null,
      };
      const g = geomRef.current;
      const boxCirc = 2 * Math.PI * g.boxingR;
      applyDashOffset(boxingBlockRef.current, 0, boxCirc, g.cx, g.cy);
      onSegmentChangeRef.current?.(activeSegmentId);
    }

    if (seg?.horaInicio && seg?.horaFin) {
      try {
        segmentDurSecRef.current = Math.max(
          1,
          Math.round(segmentDurationMinutes(seg.horaInicio, seg.horaFin) * 60)
        );
      } catch {
        segmentDurSecRef.current = 0;
      }
    } else {
      segmentDurSecRef.current = 0;
    }
  }, [activeSegmentId, hayVehiculoActivo, segmentSig]);

  useEffect(() => {
    if (!hayVehiculoActivo || !activeSegmentId) return;
    const block = volatileBlockRef.current;
    if (block.segmentId === activeSegmentId && block.startedAt != null) return;
    volatileBlockRef.current = {
      segmentId: activeSegmentId,
      startedAt: Date.now(),
    };
    const g = geomRef.current;
    const boxCirc = 2 * Math.PI * g.boxingR;
    applyDashOffset(boxingBlockRef.current, 0, boxCirc, g.cx, g.cy);
  }, [hayVehiculoActivo, activeSegmentId]);

  useEffect(() => {
    consciousCachedRef.current =
      vehiculosLite.length === 0
        ? false
        : vehiculosLite.some(v => vehicleCoversConsciousnessAt(v, Date.now()));
  }, [vehiclesSig, vehiculosLite]);

  useEffect(() => {
    let deferId: ReturnType<typeof setTimeout> | null = null;

    const runTick = () => {
      const now = Date.now();
      const g = geomRef.current;
      const segs = segmentosRef.current;
      const hayActivo = hayVehiculoActivoRef.current;
      const segId = activeSegmentIdRef.current;
      const deg = limaNowToClockDeg(now);
      const lap = limaNowToHalfDayLap(now);
      const railR = lap === 1 ? g.timelineR2 : g.timelineR;
      const railSW = lap === 1 ? g.timelineSW * 0.9 : g.timelineSW;
      const rad = toRad(deg - 90);
      const needleLen = railR - railSW * 0.5;

      const consciousNow = consciousCachedRef.current;
      let mode = pointerModeRef.current;
      if (!consciousNow && segs.length > 0) {
        mode = "libre";
      }

      const color = POINTER_COLORS[mode];
      const holeInPlanned = mode === "libre" && segs.length > 0;

      const needle = pointerNeedleRef.current;
      if (needle) {
        needle.setAttribute("x1", String(g.cx));
        needle.setAttribute("y1", String(g.cy));
        needle.setAttribute("x2", String(g.cx + needleLen * Math.cos(rad)));
        needle.setAttribute("y2", String(g.cy + needleLen * Math.sin(rad)));
        needle.setAttribute("stroke", color);
        needle.setAttribute("stroke-width", holeInPlanned ? "1.6" : "1.1");
        if (holeInPlanned) {
          needle.setAttribute("stroke-dasharray", "3 2");
        } else {
          needle.removeAttribute("stroke-dasharray");
        }
      }

      const cap = pointerCapRef.current;
      if (cap) {
        cap.setAttribute("cx", String(g.cx + railR * Math.cos(rad)));
        cap.setAttribute("cy", String(g.cy + railR * Math.sin(rad)));
        cap.setAttribute("r", String(railSW * (holeInPlanned ? 0.72 : 0.55)));
        cap.setAttribute("stroke", color);
        cap.setAttribute("opacity", holeInPlanned ? "0.92" : "0.35");
      }

      const hub = pointerHubRef.current;
      if (hub) hub.setAttribute("fill", color);

      if (clockLabelRef.current) {
        clockLabelRef.current.textContent = formatLimaTimeHM(now);
      }
      if (ampmLabelRef.current) {
        ampmLabelRef.current.textContent = lap === 1 ? "PM" : "AM";
      }

      const block = volatileBlockRef.current;
      if (
        hayActivo &&
        block.startedAt &&
        block.segmentId === segId &&
        segmentDurSecRef.current > 0
      ) {
        const elapsed = Math.min(segmentDurSecRef.current, hardwareElapsedSec(block.startedAt));
        const blockPct = Math.min(100, Math.round((elapsed / segmentDurSecRef.current) * 100));
        const boxCirc = 2 * Math.PI * g.boxingR;
        applyDashOffset(boxingBlockRef.current, blockPct, boxCirc, g.cx, g.cy);
      }
    };

    const tick = () => {
      deferId = globalThis.setTimeout(runTick, 0);
    };

    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => {
      window.clearInterval(id);
      if (deferId != null) globalThis.clearTimeout(deferId);
    };
  }, []);

  const mapaSegArcs = useMemo(() => {
    if (!model) return [];
    return model.segmentClockArcs.map(arc => {
      const r = arc.lap === 0 ? geom.segR : geom.segR2;
      const { color, opacity } = segmentArcColor(arc.estado);
      return {
        key: `seg-${arc.ordinal}-${arc.lap}-${arc.startDeg.toFixed(1)}`,
        d: arcPath(geom.cx, geom.cy, r, arc.startDeg, arc.endDeg),
        color,
        opacity: arc.lap === 0 ? opacity : opacity * 0.82,
        strokeWidth: arc.isActive && arc.isNowInside ? geom.segSW * 1.15 : arc.lap === 0 ? geom.segSW : geom.segSW * 0.9,
        isLive: Boolean(arc.isActive && arc.isNowInside),
      };
    });
  }, [model, geom]);

  const renderTimelineArcs = (
    arcs: TimelineClockArc[],
    lap: 0 | 1,
    r: number,
    sw: number,
    kind: "entropia" | "conquista"
  ) =>
    arcs
      .filter(a => (a.lap ?? 0) === lap && a.kind === kind)
      .map((arc, i) => (
        <path
          key={`tl-${kind}-${lap}-${i}`}
          d={arcPath(geom.cx, geom.cy, r, arc.startDeg, arc.endDeg)}
          fill="none"
          stroke={kind === "entropia" ? COLORS.blood : COLORS.purple}
          strokeWidth={sw}
          strokeLinecap="butt"
          strokeOpacity={lap === 1 ? 0.85 : 1}
        />
      ));

  const horizonArcs = useMemo(() => {
    if (!model || viewMode !== "horizonte") return [];
    return filterHorizonForActiveSegment(
      model.horizonProjection.arcs,
      segmentos,
      activeSegmentId
    );
  }, [model, viewMode, segmentos, activeSegmentId]);

  const wrapperStyle: CSSProperties =
    viewMode === "horizonte"
      ? {
          transform: "scale(1.32)",
          transformOrigin: "center center",
          transition: "transform 0.45s ease-out",
        }
      : {
          transform: "scale(1)",
          transition: "transform 0.45s ease-out",
        };

  const planPct = model?.timeline.metricas.planificacionPct ?? 0;
  const planColor =
    planPct >= 70 ? COLORS.cyan : planPct >= 40 ? COLORS.gold : "#6b7280";
  const boxCirc = 2 * Math.PI * geom.boxingR;
  const outerCirc = 2 * Math.PI * geom.outerR;

  return (
    <div
      className={`flex flex-col items-center ${className}`.trim()}
      data-testid="anillo-conciencia-aislado"
    >
      <div className="relative" style={{ width: size, height: size, ...wrapperStyle }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
          {/* Pista segmentos AM / PM */}
          <circle
            cx={geom.cx}
            cy={geom.cy}
            r={geom.segR}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={geom.segSW}
          />
          <circle
            cx={geom.cx}
            cy={geom.cy}
            r={geom.segR2}
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth={geom.segSW * 0.9}
          />

          {viewMode === "mapa" ? (
            <>
              <text
                x={geom.cx - geom.segR - size * 0.04}
                y={geom.cy + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.28)"
                fontSize={size * 0.055}
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
              >
                AM
              </text>
              <text
                x={geom.cx - geom.segR2 - size * 0.02}
                y={geom.cy + size * 0.12}
                textAnchor="end"
                fill="rgba(255,255,255,0.2)"
                fontSize={size * 0.05}
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
              >
                PM
              </text>

              {mapaSegArcs.map(arc => (
                <path
                  key={arc.key}
                  d={arc.d}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={arc.strokeWidth}
                  strokeLinecap="butt"
                  strokeOpacity={arc.opacity}
                />
              ))}

              {model?.segmentBattleArcs.map((arc, i) => {
                const r =
                  arc.lap === 0
                    ? geom.segR - geom.segSW * 0.38
                    : geom.segR2 - geom.segSW * 0.38;
                return (
                  <path
                    key={`bat-${arc.kind}-${arc.lap}-${i}`}
                    d={arcPath(geom.cx, geom.cy, r, arc.startDeg, arc.endDeg)}
                    fill="none"
                    stroke={arc.kind === "entropia" ? COLORS.blood : COLORS.purple}
                    strokeWidth={geom.segSW * 0.52}
                    strokeLinecap="butt"
                    strokeOpacity={arc.lap === 0 ? 0.95 : 0.82}
                  />
                );
              })}

              <circle
                cx={geom.cx}
                cy={geom.cy}
                r={geom.timelineR}
                fill="none"
                stroke={COLORS.track}
                strokeWidth={geom.timelineSW}
              />
              <circle
                cx={geom.cx}
                cy={geom.cy}
                r={geom.timelineR2}
                fill="none"
                stroke={COLORS.trackDim}
                strokeWidth={geom.timelineSW * 0.9}
              />

              {model &&
                renderTimelineArcs(model.timeline.timelineArcs, 0, geom.timelineR, geom.timelineSW, "entropia")}
              {model &&
                renderTimelineArcs(
                  model.timeline.timelineArcs,
                  1,
                  geom.timelineR2,
                  geom.timelineSW * 0.9,
                  "entropia"
                )}
              {model &&
                renderTimelineArcs(model.timeline.timelineArcs, 0, geom.timelineR, geom.timelineSW, "conquista")}
              {model &&
                renderTimelineArcs(
                  model.timeline.timelineArcs,
                  1,
                  geom.timelineR2,
                  geom.timelineSW * 0.9,
                  "conquista"
                )}
            </>
          ) : (
            <>
              {horizonArcs.map((arc, i) => {
                const r = geom.segR - (arc.kind === "entropia" ? geom.segSW * 0.35 : 0);
                const color =
                  arc.kind === "segmento"
                    ? segmentArcColor(arc.estado).color
                    : arc.kind === "entropia"
                      ? COLORS.blood
                      : arc.kind === "conquista"
                        ? COLORS.purple
                        : COLORS.track;
                return (
                  <path
                    key={`hz-${arc.kind}-${arc.ordinal ?? i}`}
                    d={arcPath(geom.cx, geom.cy, r, arc.startDeg, arc.endDeg)}
                    fill="none"
                    stroke={color}
                    strokeWidth={
                      arc.kind === "entropia" ? geom.segSW * 0.55 : geom.segSW
                    }
                    strokeOpacity={arc.strokeOpacity ?? 0.85}
                    strokeLinecap="butt"
                  />
                );
              })}
              <line
                x1={geom.cx}
                y1={geom.cy - geom.segR}
                x2={geom.cx}
                y2={geom.cy - geom.segR + geom.segSW * 2}
                stroke={COLORS.cyan}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            </>
          )}

          {/* Planificación exterior */}
          <circle
            cx={geom.cx}
            cy={geom.cy}
            r={geom.outerR}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={geom.strokeW}
          />
          <circle
            ref={planRingRef}
            cx={geom.cx}
            cy={geom.cy}
            r={geom.outerR}
            fill="none"
            stroke={planColor}
            strokeWidth={geom.strokeW}
            strokeLinecap="round"
            strokeDasharray={`0 ${outerCirc.toFixed(2)}`}
          />

          {/* Micro-ring de boxeo (Conquista vs Entropía) */}
          <circle
            cx={geom.cx}
            cy={geom.cy}
            r={geom.boxingR}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={geom.strokeW * 0.85}
          />
          <circle
            ref={boxingConquistaRef}
            cx={geom.cx}
            cy={geom.cy}
            r={geom.boxingR}
            fill="none"
            stroke={COLORS.gold}
            strokeWidth={geom.strokeW * 0.85}
            strokeLinecap="round"
            strokeDasharray={`0 ${boxCirc.toFixed(2)}`}
          />
          <circle
            ref={boxingEntropiaRef}
            cx={geom.cx}
            cy={geom.cy}
            r={geom.boxingR}
            fill="none"
            stroke={COLORS.blood}
            strokeWidth={geom.strokeW * 0.75}
            strokeLinecap="round"
            strokeDasharray={`0 ${boxCirc.toFixed(2)}`}
          />
          <circle
            ref={boxingBlockRef}
            cx={geom.cx}
            cy={geom.cy}
            r={geom.boxingR}
            fill="none"
            stroke={COLORS.purple}
            strokeWidth={geom.strokeW * 0.65}
            strokeLinecap="round"
            strokeDasharray={`0 ${boxCirc.toFixed(2)}`}
            opacity={0.9}
          />

          {/* Puntero — mutado por intervalo, sin useState */}
          {viewMode === "mapa" && (
            <>
              <line
                ref={pointerNeedleRef}
                x1={geom.cx}
                y1={geom.cy}
                x2={geom.cx}
                y2={geom.cy - geom.timelineR * 0.5}
                stroke={COLORS.steel}
                strokeWidth={1.1}
                strokeLinecap="round"
              />
              <circle
                ref={pointerCapRef}
                cx={geom.cx}
                cy={geom.cy - geom.timelineR}
                r={geom.timelineSW * 0.55}
                fill="none"
                stroke={COLORS.steel}
                strokeWidth={0.8}
                opacity={0.35}
              />
            </>
          )}
          <circle ref={pointerHubRef} cx={geom.cx} cy={geom.cy} r={2.5} fill={COLORS.steel} opacity={0.85} />

          <text
            ref={clockLabelRef}
            x={geom.cx}
            y={geom.cy + (size < 90 ? 2 : 4)}
            textAnchor="middle"
            fill="rgba(255,255,255,0.88)"
            fontSize={size * (size < 90 ? 0.1 : 0.085)}
            fontFamily="JetBrains Mono, monospace"
            fontWeight="bold"
          >
            --:--
          </text>
          <text
            ref={ampmLabelRef}
            x={geom.cx}
            y={geom.cy + size * 0.14}
            textAnchor="middle"
            fill="rgba(148,163,184,0.55)"
            fontSize={size * 0.055}
            fontFamily="JetBrains Mono, monospace"
            fontWeight="bold"
          >
            AM
          </text>
        </svg>
      </div>

      {model && (
        <p className="mt-1 text-[7px] text-slate-600 text-center font-mono">
          {viewMode === "mapa" ? "MAPA 24h" : "HORIZONTE"} · C {model.inner.conquistaArcPct}% · E{" "}
          {model.inner.entropiaArcPct}%
        </p>
      )}
    </div>
  );
}

export const AnilloConcienciaAislado = memo(AnilloConcienciaAisladoInner);
export default AnilloConcienciaAislado;

export type { SegmentoAnilloLite, MetricasAnilloConciencia };
