import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import type {
  AnilloPointerMode,
  SegmentArcStats,
  SegmentBattleArc,
  SegmentClockArc,
  TimelineClockArc,
} from "@/engines/ConcienciaEngine";
import { clockMinutesToDeg } from "@/engines/ConcienciaEngine";
import { MiniEntropyRing } from "@/components/jornada/MiniEntropyRing";
import { svgDropShadowFilter } from "@/lib/mobilePerf";

interface SegmentoLite {
  horaInicio: string;
  horaFin: string;
  estado: string;
  nombre?: string;
}

interface AnilloConcienciaProps {
  planificacionPct: number;
  /** Presencia en el plan nombrado del día (conquistaMin / jornadaMin). */
  planPresentePct?: number;
  /** Progreso del bloque activo (mini-anillo). */
  blockConquestPct?: number;
  hasSegmentoActivo?: boolean;
  timelineArcs?: TimelineClockArc[];
  segmentClockArcs?: SegmentClockArc[];
  segmentBattleArcs?: SegmentBattleArc[];
  segmentArcStats?: SegmentArcStats[];
  conquistaArcPct?: number;
  entropiaArcPct?: number;
  conquistaPct?: number;
  entropiaPct?: number;
  conquistaPulse?: boolean;
  size?: number;
  segmentos?: SegmentoLite[];
  pointerDeg?: number;
  pointerLap?: 0 | 1;
  pointerMode?: AnilloPointerMode;
  centerGuide?: string;
  /** Hora Lima (HH:mm) alineada con el puntero del anillo. */
  limaClockLabel?: string;
}

type HalfDayLap = 0 | 1;

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

const TRACK_BG = "rgba(30, 35, 48, 0.95)";
const PURPLE = "#8B5CF6";
const BLOOD = "#FF3131";
const GOLD = "#D4AF37";
const CYAN = "#00FFC3";
const NEUTRAL_GRAY = "rgba(148, 163, 184, 0.55)";

const POINTER_COLORS: Record<AnilloPointerMode, string> = {
  libre: NEUTRAL_GRAY,
  conquista: PURPLE,
  entropia: BLOOD,
};

function segmentArcColor(estado: string): { color: string; glow: string } {
  if (estado === "cerrado_manual" || estado === "entropia") {
    return { color: GOLD, glow: `${GOLD}80` };
  }
  if (estado === "activo") {
    return { color: CYAN, glow: `${CYAN}90` };
  }
  return { color: "rgba(255,255,255,0.18)", glow: "transparent" };
}

export default function AnilloConciencia({
  planificacionPct,
  planPresentePct = 0,
  blockConquestPct = 0,
  hasSegmentoActivo = false,
  timelineArcs = [],
  segmentClockArcs = [],
  segmentBattleArcs = [],
  segmentArcStats = [],
  conquistaPulse = false,
  size = 140,
  segmentos = [],
  pointerDeg = 0,
  pointerLap = 0,
  pointerMode = "libre",
  centerGuide,
  limaClockLabel,
}: AnilloConcienciaProps) {
  const [tooltipOrdinal, setTooltipOrdinal] = useState<number | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback((ordinal: number) => {
    setTooltipOrdinal(ordinal);
  }, []);

  const hideTooltip = useCallback(() => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    setTooltipOrdinal(null);
  }, []);

  const bindSegmentPress = useCallback(
    (ordinal: number) => ({
      onMouseEnter: () => showTooltip(ordinal),
      onMouseLeave: hideTooltip,
      onTouchStart: () => {
        longPressRef.current = setTimeout(() => showTooltip(ordinal), 450);
      },
      onTouchEnd: hideTooltip,
      onTouchCancel: hideTooltip,
    }),
    [hideTooltip, showTooltip]
  );

  const tooltipStats =
    tooltipOrdinal != null ? segmentArcStats.find(s => s.ordinal === tooltipOrdinal) : null;

  const cx = size / 2;
  const cy = size / 2;

  const segR = size * 0.455;
  const timelineR = size * 0.405;
  const outerR = size * 0.375;
  const innerR = size * 0.265;

  const strokeW = size * 0.055;
  const segSW = size * 0.05;
  const timelineSW = size * 0.048;

  const outerCirc = 2 * Math.PI * outerR;
  const outerDash = (planificacionPct / 100) * outerCirc;

  const planLabel = Math.round(planificacionPct);
  const presenteLabel = Math.round(planPresentePct);
  const blockLabel = Math.round(blockConquestPct);
  const ampm = pointerLap === 1 ? "PM" : "AM";
  const compactCenter = size < 90;

  const planColor = planLabel >= 70 ? CYAN : planLabel >= 40 ? GOLD : "#6b7280";
  const presenteColor =
    presenteLabel >= 40 ? PURPLE : presenteLabel > 0 ? CYAN : "rgba(148,163,184,0.45)";
  const holeInPlannedSegment = pointerMode === "libre" && segmentos.length > 0;

  const fondoArcs = timelineArcs.filter(a => a.kind === "fondo");
  const entropiaTimelineArcs = timelineArcs.filter(a => a.kind === "entropia");
  const conquistaTimelineArcs = timelineArcs.filter(a => a.kind === "conquista");

  // Reloj 12h: marcas principales 12/3/6/9.
  const hourMarks = [0, 3, 6, 9];

  const lap0 = (a: TimelineClockArc) => (a.lap ?? 0) === 0;
  const lap1 = (a: TimelineClockArc) => (a.lap ?? 0) === 1;

  const fondoLap0 = fondoArcs.filter(lap0);
  const fondoLap1 = fondoArcs.filter(lap1);
  const entropiaLap0 = entropiaTimelineArcs.filter(lap0);
  const entropiaLap1 = entropiaTimelineArcs.filter(lap1);
  const conquistaLap0 = conquistaTimelineArcs.filter(lap0);
  const conquistaLap1 = conquistaTimelineArcs.filter(lap1);

  // Segunda vuelta: aro levemente más interno y más tenue.
  const timelineR2 = timelineR - timelineSW * 1.25;
  const segR2 = segR - segSW * 1.25;

  const segArcs = segmentClockArcs.map(arc => {
    const r = arc.lap === 0 ? segR : segR2;
    const { color, glow } = segmentArcColor(arc.estado);
    const isLiveActive = Boolean(arc.isActive && arc.isNowInside);
    return {
      key: `seg-${arc.ordinal}-${arc.lap}-${arc.startDeg.toFixed(1)}`,
      path: arcPath(cx, cy, r, arc.startDeg, arc.endDeg),
      color,
      glow,
      isActive: arc.estado === "activo",
      isLiveActive,
      lap: arc.lap as HalfDayLap,
      ordinal: arc.ordinal,
      nombre: arc.nombre,
      strokeOpacity: arc.lap === 0 ? 1 : 0.82,
      strokeWidth: isLiveActive ? segSW * 1.15 : arc.lap === 0 ? segSW : segSW * 0.9,
    };
  });

  const battleEntropia = segmentBattleArcs.filter(a => a.kind === "entropia");
  const battleConquista = segmentBattleArcs.filter(a => a.kind === "conquista");

  const battleRail = (lap: HalfDayLap) => (lap === 0 ? segR - segSW * 0.38 : segR2 - segSW * 0.38);
  const battleSW = segSW * 0.52;

  const activeRailR = pointerLap === 1 ? timelineR2 : timelineR;
  const activeRailSW = pointerLap === 1 ? timelineSW * 0.9 : timelineSW;
  const activeHourMarks = [6, 9, 12];

  const pointerRailR = pointerLap === 1 ? timelineR2 : timelineR;
  const pointerRailSW = pointerLap === 1 ? timelineSW * 0.9 : timelineSW;
  const needleColor = POINTER_COLORS[pointerMode];
  const needleRad = toRad(pointerDeg - 90);
  const needleLen = pointerRailR - pointerRailSW * 0.5;
  const noonRad = toRad(-90);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
          <circle cx={cx} cy={cy} r={segR} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={segSW} />
          <circle cx={cx} cy={cy} r={segR2} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={segSW * 0.9} />

          <line
            x1={cx + segR2 * Math.cos(noonRad)}
            y1={cy + segR2 * Math.sin(noonRad)}
            x2={cx + segR * Math.cos(noonRad)}
            y2={cy + segR * Math.sin(noonRad)}
            stroke="rgba(255,255,255,0.16)"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <path
            d={arcPath(cx, cy, (segR + segR2) / 2, -8, 8)}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={segSW * 0.35}
            strokeLinecap="round"
          />
          <text
            x={cx - segR - size * 0.04}
            y={cy + 3}
            textAnchor="end"
            fill="rgba(255,255,255,0.28)"
            fontSize={size * 0.055}
            fontFamily="JetBrains Mono, monospace"
            fontWeight="bold"
          >
            AM
          </text>
          <text
            x={cx - segR2 - size * 0.02}
            y={cy + size * 0.12}
            textAnchor="end"
            fill="rgba(255,255,255,0.2)"
            fontSize={size * 0.05}
            fontFamily="JetBrains Mono, monospace"
            fontWeight="bold"
          >
            PM
          </text>
          <text
            x={cx}
            y={cy - segR - size * 0.02}
            textAnchor="middle"
            fill="rgba(255,255,255,0.22)"
            fontSize={size * 0.045}
            fontFamily="JetBrains Mono, monospace"
          >
            12
          </text>

          {segArcs.map(arc => (
            <g key={arc.key} {...bindSegmentPress(arc.ordinal)}>
              <motion.path
                d={arc.path}
                fill="none"
                stroke={arc.color}
                strokeWidth={arc.strokeWidth}
                strokeLinecap="butt"
                strokeOpacity={arc.strokeOpacity}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: arc.strokeOpacity }}
                transition={{ duration: 0.8, delay: arc.ordinal * 0.04, ease: "easeOut" }}
                style={{
                  filter: svgDropShadowFilter(
                    arc.isLiveActive
                      ? `drop-shadow(0 0 8px ${arc.glow}) drop-shadow(0 0 14px ${CYAN}55)`
                      : arc.isActive
                        ? `drop-shadow(0 0 5px ${arc.glow})`
                        : arc.color !== "rgba(255,255,255,0.18)"
                          ? `drop-shadow(0 0 3px ${arc.glow})`
                          : undefined
                  ),
                }}
              />
              {arc.isLiveActive && (
                <text
                  x={cx}
                  y={cy - (arc.lap === 0 ? segR : segR2) - size * 0.04}
                  textAnchor="middle"
                  fill={CYAN}
                  fontSize={size * 0.055}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  {arc.nombre != null && String(arc.nombre).trim()
                    ? String(arc.nombre).slice(0, 8)
                    : `#${arc.ordinal}`}
                </text>
              )}
            </g>
          ))}

          {battleEntropia.map((arc, i) => (
            <motion.path
              key={`bat-ent-${arc.ordinal}-${arc.lap}-${i}`}
              d={arcPath(cx, cy, battleRail(arc.lap), arc.startDeg, arc.endDeg)}
              fill="none"
              stroke={BLOOD}
              strokeWidth={battleSW}
              strokeLinecap="butt"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: arc.lap === 0 ? 0.95 : 0.82 }}
              transition={{ duration: 0.45, delay: i * 0.02 }}
              style={{ filter: svgDropShadowFilter(`drop-shadow(0 0 2px ${BLOOD}70)`) }}
            />
          ))}
          {battleConquista.map((arc, i) => (
            <motion.path
              key={`bat-conq-${arc.ordinal}-${arc.lap}-${i}`}
              d={arcPath(cx, cy, battleRail(arc.lap), arc.startDeg, arc.endDeg)}
              fill="none"
              stroke={PURPLE}
              strokeWidth={battleSW}
              strokeLinecap="butt"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: arc.lap === 0 ? 0.95 : 0.82 }}
              transition={{ duration: 0.45, delay: i * 0.02 }}
              style={{ filter: svgDropShadowFilter(`drop-shadow(0 0 2px ${PURPLE}70)`) }}
            />
          ))}

          {fondoLap0.map((_, i) => (
            <circle
              key={`fondo0-${i}`}
              cx={cx}
              cy={cy}
              r={timelineR}
              fill="none"
              stroke={TRACK_BG}
              strokeWidth={timelineSW}
            />
          ))}
          {fondoLap1.map((_, i) => (
            <circle
              key={`fondo1-${i}`}
              cx={cx}
              cy={cy}
              r={timelineR2}
              fill="none"
              stroke="rgba(30, 35, 48, 0.7)"
              strokeWidth={timelineSW * 0.9}
            />
          ))}
          {hourMarks.map(h => {
            const deg = clockMinutesToDeg(h * 60);
            const rad = toRad(deg - 90);
            const inner = timelineR - timelineSW / 2 - 1;
            const outer = timelineR + timelineSW / 2 + 1;
            const isMain = h % 6 === 0;
            return (
              <line
                key={`h-am-${h}`}
                x1={cx + inner * Math.cos(rad)}
                y1={cy + inner * Math.sin(rad)}
                x2={cx + outer * Math.cos(rad)}
                y2={cy + outer * Math.sin(rad)}
                stroke={isMain ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)"}
                strokeWidth={isMain ? 1.2 : 0.6}
              />
            );
          })}
          {pointerLap === 1 &&
            activeHourMarks.map(h => {
              const civilH = h === 12 ? 12 : h;
              const deg = clockMinutesToDeg(civilH * 60);
              const rad = toRad(deg - 90);
              const inner = activeRailR - activeRailSW / 2 - 1;
              const outer = activeRailR + activeRailSW / 2 + 1;
              return (
                <g key={`h-pm-${h}`}>
                  <line
                    x1={cx + inner * Math.cos(rad)}
                    y1={cy + inner * Math.sin(rad)}
                    x2={cx + outer * Math.cos(rad)}
                    y2={cy + outer * Math.sin(rad)}
                    stroke="rgba(255,255,255,0.24)"
                    strokeWidth={1.1}
                  />
                  <text
                    x={cx + (outer + size * 0.03) * Math.cos(rad)}
                    y={cy + (outer + size * 0.03) * Math.sin(rad) + 2}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.28)"
                    fontSize={size * 0.042}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {h === 12 ? 12 : h + 12}
                  </text>
                </g>
              );
            })}
          {pointerLap === 0 &&
            activeHourMarks.map(h => {
              if (h === 12) return null;
              const deg = clockMinutesToDeg(h * 60);
              const rad = toRad(deg - 90);
              const outer = activeRailR + activeRailSW / 2 + size * 0.03;
              return (
                <text
                  key={`h-am-label-${h}`}
                  x={cx + outer * Math.cos(rad)}
                  y={cy + outer * Math.sin(rad) + 2}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.28)"
                  fontSize={size * 0.042}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {h}
                </text>
              );
            })}
          {entropiaLap0.map((arc, i) => (
            <motion.path
              key={`tl-ent-${i}`}
              d={arcPath(cx, cy, timelineR, arc.startDeg, arc.endDeg)}
              fill="none"
              stroke={BLOOD}
              strokeWidth={timelineSW}
              strokeLinecap="butt"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.03, ease: "easeOut" }}
              style={{ filter: svgDropShadowFilter(`drop-shadow(0 0 3px ${BLOOD}70)`) }}
            />
          ))}
          {entropiaLap1.map((arc, i) => (
            <motion.path
              key={`tl-ent2-${i}`}
              d={arcPath(cx, cy, timelineR2, arc.startDeg, arc.endDeg)}
              fill="none"
              stroke={`${BLOOD}AA`}
              strokeWidth={timelineSW * 0.9}
              strokeLinecap="butt"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.85 }}
              transition={{ duration: 0.5, delay: i * 0.03, ease: "easeOut" }}
              style={{ filter: svgDropShadowFilter(`drop-shadow(0 0 2px ${BLOOD}55)`) }}
            />
          ))}

          {conquistaLap0.map((arc, i) => (
            <motion.path
              key={`tl-conq-${i}`}
              d={arcPath(cx, cy, timelineR, arc.startDeg, arc.endDeg)}
              fill="none"
              stroke={PURPLE}
              strokeWidth={conquistaPulse ? timelineSW * 1.12 : timelineSW}
              strokeLinecap="butt"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: conquistaPulse ? [1, 0.7, 1] : 1 }}
              transition={{
                pathLength: { duration: 0.5, delay: i * 0.03, ease: "easeOut" },
                opacity: conquistaPulse ? { duration: 0.8, repeat: Infinity } : { duration: 0 },
              }}
              style={{ filter: svgDropShadowFilter(`drop-shadow(0 0 4px ${PURPLE}80)`) }}
            />
          ))}
          {conquistaLap1.map((arc, i) => (
            <motion.path
              key={`tl-conq2-${i}`}
              d={arcPath(cx, cy, timelineR2, arc.startDeg, arc.endDeg)}
              fill="none"
              stroke={`${PURPLE}B3`}
              strokeWidth={conquistaPulse ? timelineSW * 1.02 : timelineSW * 0.9}
              strokeLinecap="butt"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: conquistaPulse ? [0.95, 0.65, 0.95] : 0.9 }}
              transition={{
                pathLength: { duration: 0.5, delay: i * 0.03, ease: "easeOut" },
                opacity: conquistaPulse ? { duration: 0.8, repeat: Infinity } : { duration: 0 },
              }}
              style={{ filter: svgDropShadowFilter(`drop-shadow(0 0 3px ${PURPLE}66)`) }}
            />
          ))}

          <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
          <motion.circle
            cx={cx}
            cy={cy}
            r={outerR}
            fill="none"
            stroke={planColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${outerDash} ${outerCirc}`}
            transform={`rotate(-90 ${cx} ${cy})`}
            initial={{ strokeDasharray: `0 ${outerCirc}` }}
            animate={{ strokeDasharray: `${outerDash} ${outerCirc}` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ filter: svgDropShadowFilter(`drop-shadow(0 0 4px ${planColor}60)`) }}
          />

          <MiniEntropyRing
            cx={cx}
            cy={cy}
            innerR={innerR}
            strokeW={strokeW}
            conquistaPct={blockConquestPct}
            conquistaPulse={conquistaPulse}
          />

          <line
            x1={cx}
            y1={cy}
            x2={cx + needleLen * Math.cos(needleRad)}
            y2={cy + needleLen * Math.sin(needleRad)}
            stroke={needleColor}
            strokeWidth={holeInPlannedSegment ? 1.6 : 1.1}
            strokeLinecap="round"
            strokeDasharray={holeInPlannedSegment ? "3 2" : undefined}
            style={{
              filter: svgDropShadowFilter(
                pointerMode === "conquista"
                  ? `drop-shadow(0 0 4px ${PURPLE})`
                  : pointerMode === "entropia"
                    ? `drop-shadow(0 0 4px ${BLOOD})`
                    : holeInPlannedSegment
                      ? "drop-shadow(0 0 4px rgba(148,163,184,0.6))"
                      : undefined
              ),
            }}
          />

          <circle
            cx={cx + pointerRailR * Math.cos(needleRad)}
            cy={cy + pointerRailR * Math.sin(needleRad)}
            r={pointerRailSW * (holeInPlannedSegment ? 0.72 : 0.55)}
            fill={holeInPlannedSegment ? "rgba(148, 163, 184, 0.12)" : "none"}
            stroke={needleColor}
            strokeWidth={holeInPlannedSegment ? 1.4 : 0.8}
            strokeDasharray={holeInPlannedSegment ? "2 2" : undefined}
            opacity={holeInPlannedSegment ? 0.92 : 0.35}
            style={
              holeInPlannedSegment
                ? { filter: svgDropShadowFilter("drop-shadow(0 0 5px rgba(148,163,184,0.55))") }
                : undefined
            }
          />

          <circle cx={cx} cy={cy} r={2.5} fill={needleColor} opacity={0.85} />

          <g>
            <text
              x={cx}
              y={cy - (compactCenter ? 4 : 18)}
              textAnchor="middle"
              fill={presenteColor}
              fontSize={size * (compactCenter ? 0.11 : 0.12)}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="bold"
            >
              {presenteLabel}%
            </text>
            {!compactCenter && (
              <text
                x={cx}
                y={cy - 6}
                textAnchor="middle"
                fill="rgba(255,255,255,0.22)"
                fontSize={size * 0.045}
                fontFamily="JetBrains Mono, monospace"
              >
                PRESENTE
              </text>
            )}
            {!compactCenter && hasSegmentoActivo && (
              <>
                <text
                  x={cx}
                  y={cy + 12}
                  textAnchor="middle"
                  fill={PURPLE}
                  fontSize={size * 0.09}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  {blockLabel}%
                </text>
                <text
                  x={cx}
                  y={cy + 24}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.28)"
                  fontSize={size * 0.042}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  BLOQUE
                </text>
              </>
            )}
            <text
              x={cx}
              y={cy + (compactCenter ? 14 : hasSegmentoActivo ? 38 : 24)}
              textAnchor="middle"
              fill="rgba(255,255,255,0.32)"
              fontSize={size * 0.05}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="bold"
            >
              {ampm}
            </text>
            {limaClockLabel ? (
              <text
                x={cx}
                y={cy + (compactCenter ? 24 : hasSegmentoActivo ? 48 : 34)}
                textAnchor="middle"
                fill="rgba(255,255,255,0.38)"
                fontSize={size * 0.055}
                fontFamily="JetBrains Mono, monospace"
              >
                {limaClockLabel}
              </text>
            ) : null}
          </g>
        </svg>

        {tooltipStats && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-0 z-10 px-2 py-1.5 rounded-lg border text-center pointer-events-none"
            style={{
              backgroundColor: "rgba(10,12,18,0.95)",
              borderColor: "rgba(255,255,255,0.12)",
              minWidth: size * 0.85,
            }}
          >
            <p className="text-[8px] font-black text-white truncate">
              {tooltipStats.nombre != null && String(tooltipStats.nombre).trim()
                ? String(tooltipStats.nombre)
                : `Segmento ${tooltipStats.ordinal}`}
            </p>
            <p className="text-[7px] text-slate-500">
              {tooltipStats.horaInicio}–{tooltipStats.horaFin}
            </p>
            <div className="flex justify-center gap-3 mt-0.5">
              <span className="text-[7px] font-bold" style={{ color: PURPLE }}>
                +{tooltipStats.conquistaMin}m
              </span>
              <span className="text-[7px] font-bold" style={{ color: BLOOD }}>
                −{tooltipStats.entropiaMin}m
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center flex-wrap justify-center gap-2">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: planColor }} />
          <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">Plan</span>
        </div>
        {showEntropia && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BLOOD }} />
            <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: BLOOD }}>
              Entropía
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PURPLE }} />
          <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">Conquista</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full border border-white/10" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
          <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">Seg. plan</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: NEUTRAL_GRAY, border: "1px solid rgba(255,255,255,0.08)" }} />
          <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">Libre</span>
        </div>
      </div>
      <p className="text-[7px] text-slate-600 text-center max-w-[11rem] leading-relaxed">
        Caracol 24h: riel exterior AM · interior PM · puntero y segmento comparten ángulo
      </p>
    </div>
  );
}
