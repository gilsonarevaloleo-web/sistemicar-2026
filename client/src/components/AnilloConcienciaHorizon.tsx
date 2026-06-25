import { motion } from "framer-motion";
import type { HorizonArc, HorizonProjection } from "@/engines/ConcienciaHorizonEngine";
import { HORIZON_VISIBLE_DEG } from "@/engines/ConcienciaHorizonEngine";
import { MiniEntropyRing } from "@/components/jornada/MiniEntropyRing";
import { svgDropShadowFilter } from "@/lib/mobilePerf";

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
const CYAN = "#00FFC3";
const GOLD = "#D4AF37";

function segmentColor(estado?: string): string {
  if (estado === "cerrado_manual" || estado === "entropia") return GOLD;
  if (estado === "activo") return CYAN;
  return "rgba(255,255,255,0.22)";
}

interface AnilloConcienciaHorizonProps {
  projection: HorizonProjection;
  planificacionPct: number;
  planPresentePct?: number;
  blockConquestPct?: number;
  hasSegmentoActivo?: boolean;
  conquistaPulse?: boolean;
  size?: number;
}

export default function AnilloConcienciaHorizon({
  projection,
  planificacionPct,
  planPresentePct = 0,
  blockConquestPct = 0,
  hasSegmentoActivo = false,
  conquistaPulse = false,
  size = 140,
}: AnilloConcienciaHorizonProps) {
  const cx = size / 2;
  const cy = size / 2;
  const railR = size * 0.42;
  const railSW = size * 0.05;
  const outerR = size * 0.34;
  const innerR = size * 0.24;
  const strokeW = size * 0.05;

  const outerCirc = 2 * Math.PI * outerR;
  const outerDash = (planificacionPct / 100) * outerCirc;

  const planLabel = Math.round(planificacionPct);
  const presenteLabel = Math.round(planPresentePct);
  const blockLabel = Math.round(blockConquestPct);
  const compactCenter = size < 90;
  const planColor = planLabel >= 70 ? CYAN : planLabel >= 40 ? GOLD : "#6b7280";
  const presenteColor =
    presenteLabel >= 40 ? PURPLE : presenteLabel > 0 ? CYAN : "rgba(148,163,184,0.45)";
  const halfWin = projection.windowMin / 2;

  const byKind = (kind: HorizonArc["kind"]) => projection.arcs.filter(a => a.kind === kind);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
          {byKind("fondo").map((arc, i) => (
            <path
              key={`hz-fondo-${i}`}
              d={arcPath(cx, cy, railR, arc.startDeg, arc.endDeg)}
              fill="none"
              stroke={TRACK_BG}
              strokeWidth={railSW}
            />
          ))}

          {byKind("segmento").map((arc, i) => (
            <motion.path
              key={`hz-seg-${arc.ordinal}-${i}`}
              d={arcPath(cx, cy, railR, arc.startDeg, arc.endDeg)}
              fill="none"
              stroke={segmentColor(arc.estado)}
              strokeWidth={railSW}
              strokeLinecap="butt"
              strokeOpacity={arc.strokeOpacity ?? 0.8}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: arc.strokeOpacity ?? 0.8 }}
              transition={{ duration: 0.5, delay: (arc.ordinal ?? i) * 0.03 }}
            />
          ))}

          {byKind("entropia").map((arc, i) => (
            <motion.path
              key={`hz-ent-${arc.ordinal}-${i}`}
              d={arcPath(cx, cy, railR - railSW * 0.35, arc.startDeg, arc.endDeg)}
              fill="none"
              stroke={BLOOD}
              strokeWidth={railSW * 0.55}
              strokeLinecap="butt"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.95 }}
              transition={{ duration: 0.4, delay: i * 0.02 }}
            />
          ))}

          {byKind("conquista").map((arc, i) => (
            <motion.path
              key={`hz-conq-${arc.ordinal}-${i}`}
              d={arcPath(cx, cy, railR - railSW * 0.35, arc.startDeg, arc.endDeg)}
              fill="none"
              stroke={PURPLE}
              strokeWidth={railSW * 0.55}
              strokeLinecap="butt"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.95 }}
              transition={{ duration: 0.4, delay: i * 0.02 }}
            />
          ))}

          <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
          <circle
            cx={cx}
            cy={cy}
            r={outerR}
            fill="none"
            stroke={planColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${outerDash} ${outerCirc}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />

          <MiniEntropyRing
            cx={cx}
            cy={cy}
            innerR={innerR}
            strokeW={strokeW}
            conquistaPct={blockConquestPct}
            conquistaPulse={conquistaPulse}
          />

          {/* Puntero fijo en Norte = ahora */}
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - railR + railSW}
            stroke={CYAN}
            strokeWidth={1.4}
            strokeLinecap="round"
            style={{ filter: svgDropShadowFilter(`drop-shadow(0 0 4px ${CYAN}80)`) }}
          />
          <circle cx={cx} cy={cy - railR} r={railSW * 0.45} fill="none" stroke={CYAN} strokeWidth={0.9} opacity={0.5} />
          <circle cx={cx} cy={cy} r={2.5} fill={CYAN} opacity={0.85} />

          <text
            x={cx}
            y={cy - (compactCenter ? 4 : 16)}
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
              y={cy - 4}
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
                fill="rgba(255,255,255,0.35)"
                fontSize={size * 0.042}
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
              >
                BLOQUE
              </text>
            </>
          )}
          {!compactCenter && !hasSegmentoActivo && (
            <text
              x={cx}
              y={cy + 14}
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize={size * 0.045}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="bold"
            >
              AHORA
            </text>
          )}
        </svg>
      </div>

      <p className="text-[7px] text-slate-600 text-center max-w-[11rem] leading-relaxed">
        Horizonte ±{halfWin}min · Norte = ahora · {HORIZON_VISIBLE_DEG}° visibles
      </p>
    </div>
  );
}
