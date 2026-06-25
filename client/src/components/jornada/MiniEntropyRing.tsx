import { motion } from "framer-motion";
import { svgDropShadowFilter } from "@/lib/mobilePerf";

const PURPLE = "#8B5CF6";
const TRACK = "rgba(255,255,255,0.14)";

export interface MiniEntropyRingProps {
  cx: number;
  cy: number;
  innerR: number;
  strokeW: number;
  /** 0–100 del bloque activo (presencia en este segmento). */
  conquistaPct: number;
  conquistaPulse?: boolean;
}

/** Anillo interior: pista neutra + morado de conquista del bloque (sin rojo). */
export function MiniEntropyRing({
  cx,
  cy,
  innerR,
  strokeW,
  conquistaPct,
  conquistaPulse = false,
}: MiniEntropyRingProps) {
  const innerCirc = 2 * Math.PI * innerR;
  const pct = Math.min(100, Math.max(0, conquistaPct));
  const conquistaDash = (pct / 100) * innerCirc;

  return (
    <g data-testid="mini-entropy-ring">
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke={TRACK} strokeWidth={strokeW} />
      {pct > 0 && (
        <motion.circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="none"
          stroke={PURPLE}
          strokeWidth={conquistaPulse ? strokeW * 1.35 : strokeW}
          strokeLinecap="round"
          strokeDasharray={`${conquistaDash} ${innerCirc}`}
          transform={`rotate(90 ${cx} ${cy})`}
          animate={{
            strokeDasharray: `${conquistaDash} ${innerCirc}`,
            opacity: conquistaPulse ? [1, 0.65, 1] : 1,
          }}
          transition={{
            strokeDasharray: { duration: 0.8, ease: "easeOut" },
            opacity: conquistaPulse ? { duration: 0.8, repeat: Infinity } : { duration: 0 },
          }}
          style={{
            filter: svgDropShadowFilter(
              conquistaPulse
                ? `drop-shadow(0 0 10px ${PURPLE})`
                : `drop-shadow(0 0 4px ${PURPLE}60)`
            ),
          }}
        />
      )}
    </g>
  );
}
