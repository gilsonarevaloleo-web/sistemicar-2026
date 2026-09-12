import { useId } from "react";
import { cn } from "@/lib/utils";
import type { FiguraEstado, FiguraMiembro } from "@/lib/figuraProyecto";
import { FIGURA_CUERPO_MAX, FIGURA_PAQUETE, figuraCapaLabel } from "@/lib/figuraProyecto";

const PIZARRA = "#0a0a0a";

const NODES: Record<string, { x: number; y: number }> = {
  cabeza: { x: 52, y: 28 },
  torso: { x: 52, y: 78 },
  brazoI: { x: 22, y: 80 },
  brazoD: { x: 82, y: 80 },
  piernaI: { x: 42, y: 138 },
  piernaD: { x: 62, y: 138 },
};

const EDGES: [string, string][] = [
  ["cabeza", "torso"],
  ["torso", "brazoI"],
  ["torso", "brazoD"],
  ["torso", "piernaI"],
  ["torso", "piernaD"],
  ["brazoI", "cabeza"],
  ["brazoD", "cabeza"],
];

type Props = {
  estado: FiguraEstado;
  tint: string;
  compact?: boolean;
  testId?: string;
};

function memberById(estado: FiguraEstado, id: string): FiguraMiembro | undefined {
  return estado.miembros.find(m => m.id === id);
}

function partStyle(
  m: FiguraMiembro | undefined,
  estado: FiguraEstado,
  tint: string
): {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity: number;
  className?: string;
} {
  const next = Boolean(m?.esSiguiente);
  const on = Boolean(m?.revelado);
  if (!on) {
    return {
      fill: "none",
      fillOpacity: 0,
      stroke: next ? tint : "rgba(255,255,255,0.16)",
      strokeWidth: next ? 1.6 : 1.4,
      strokeDasharray: "4 5",
      opacity: next ? 0.45 : 0.22,
      className: next ? "animate-pulse" : undefined,
    };
  }
  const mielina = estado.mielina;
  return {
    fill: tint,
    fillOpacity: 0.1 + estado.masaFill * 0.45,
    stroke: mielina > 0.66 ? "#D4AF37" : tint,
    strokeWidth: 1.8 + mielina * 1.2,
    opacity: 1,
  };
}

function NeuralMesh({
  estado,
  tint,
}: {
  estado: FiguraEstado;
  tint: string;
}) {
  const revealed = new Set(estado.miembros.filter(m => m.revelado).map(m => m.id));
  const width = 0.7 + estado.mielina * 1.6;
  const extra = Math.min(8, Math.max(0, estado.haces - 1));
  return (
    <g stroke={tint} strokeLinecap="round" fill="none">
      {EDGES.map(([a, b]) => {
        const na = NODES[a];
        const nb = NODES[b];
        if (!na || !nb) return null;
        const on = revealed.has(a) && revealed.has(b);
        if (!on && !(revealed.has(a) || revealed.has(b))) return null;
        return (
          <line
            key={`${a}-${b}`}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            strokeWidth={on ? width : 0.6}
            opacity={on ? 0.35 + estado.mielina * 0.4 : 0.12}
          />
        );
      })}
      {Array.from({ length: extra }, (_, i) => {
        const ang = (i / Math.max(1, extra)) * Math.PI * 2 - Math.PI / 2;
        const r = 36 + (i % 3) * 8;
        return (
          <circle
            key={`halo-${i}`}
            cx={52 + Math.cos(ang) * r}
            cy={88 + Math.sin(ang) * (r * 0.85)}
            r={1.4 + estado.mielina}
            fill={tint}
            stroke="none"
            opacity={0.25 + estado.mielina * 0.35}
          />
        );
      })}
    </g>
  );
}

function CasaGlyph({
  tint,
  mielina,
  compact,
}: {
  tint: string;
  mielina: number;
  compact?: boolean;
}) {
  const x = compact ? 88 : 92;
  const y = compact ? 18 : 16;
  return (
    <g
      fill="none"
      stroke={tint}
      strokeWidth={1.4 + mielina}
      opacity={0.55 + mielina * 0.35}
      strokeLinejoin="round"
    >
      <path d={`M ${x} ${y + 18} L ${x + 10} ${y + 8} L ${x + 20} ${y + 18} Z`} />
      <rect x={x + 3} y={y + 18} width={14} height={12} />
      <line x1={52} y1={28} x2={x + 10} y2={y + 10} strokeWidth={0.8} opacity={0.4} />
    </g>
  );
}

function LinajeGlyphs({
  count,
  tint,
}: {
  count: number;
  tint: string;
}) {
  const n = Math.min(4, Math.max(0, count));
  return (
    <g fill={tint} stroke={tint} strokeWidth="1">
      {Array.from({ length: n }, (_, i) => {
        const x = 96 + (i % 2) * 12;
        const y = 150 + Math.floor(i / 2) * 22;
        return (
          <g key={`lin-${i}`} opacity={0.55}>
            <circle cx={x} cy={y} r={3} fill={tint} />
            <line x1={x} y1={y + 3} x2={x} y2={y + 11} />
            <line x1={x - 4} y1={y + 6} x2={x + 4} y2={y + 6} />
          </g>
        );
      })}
    </g>
  );
}

function CrecimientoSvg({
  estado,
  tint,
  compact,
}: {
  estado: FiguraEstado;
  tint: string;
  compact?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const glowId = `fig-glow-${uid}`;
  const parts = {
    cabeza: memberById(estado, "cabeza"),
    torso: memberById(estado, "torso"),
    brazoI: memberById(estado, "brazoI"),
    brazoD: memberById(estado, "brazoD"),
    piernaI: memberById(estado, "piernaI"),
    piernaD: memberById(estado, "piernaD"),
  };
  const w = compact ? 64 : 132;
  const h = compact ? 96 : 200;
  return (
    <svg viewBox="0 0 124 200" width={w} height={h} aria-hidden>
      <defs>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={estado.mielina > 0.5 ? 1.6 : 0.7} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      >
        <NeuralMesh estado={estado} tint={tint} />
        <ellipse cx="52" cy="28" rx="14" ry="16" {...partStyle(parts.cabeza, estado, tint)} />
        <rect x="36" y="50" width="32" height="48" rx="11" {...partStyle(parts.torso, estado, tint)} />
        <rect x="12" y="54" width="20" height="46" rx="10" {...partStyle(parts.brazoI, estado, tint)} />
        <rect x="72" y="54" width="20" height="46" rx="10" {...partStyle(parts.brazoD, estado, tint)} />
        <rect x="36" y="102" width="14" height="58" rx="7" {...partStyle(parts.piernaI, estado, tint)} />
        <rect x="54" y="102" width="14" height="58" rx="7" {...partStyle(parts.piernaD, estado, tint)} />
        {estado.casaRevelada ? (
          <CasaGlyph tint={tint} mielina={estado.mielina} compact={compact} />
        ) : null}
        {estado.linajeRevelados > 0 ? (
          <LinajeGlyphs count={estado.linajeRevelados} tint={tint} />
        ) : null}
      </g>
    </svg>
  );
}

function ControlSvg({
  estado,
  tint,
  compact,
}: {
  estado: FiguraEstado;
  tint: string;
  compact?: boolean;
}) {
  const w = compact ? 40 : 88;
  const h = compact ? 92 : 196;
  const rings = estado.miembros;
  return (
    <svg viewBox="0 0 80 200" width={w} height={h} aria-hidden>
      {rings.map((m, i) => {
        const y = 18 + i * 28;
        const style = partStyle(m, estado, tint);
        const rx = 18 - i * 1.2;
        return (
          <rect
            key={m.id}
            x={40 - rx}
            y={y}
            width={rx * 2}
            height={22}
            rx="8"
            fill={style.fill}
            fillOpacity={style.fillOpacity}
            stroke={style.stroke}
            strokeDasharray={style.strokeDasharray}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
            className={style.className}
          />
        );
      })}
    </svg>
  );
}

function ConscienciaSvg({
  estado,
  tint,
  compact,
}: {
  estado: FiguraEstado;
  tint: string;
  compact?: boolean;
}) {
  const level = Math.min(1, estado.enviosRegistro / (FIGURA_CUERPO_MAX * FIGURA_PAQUETE));
  const size = compact ? 56 : 120;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
      <circle
        cx="60"
        cy="60"
        r="48"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
      />
      <circle
        cx="60"
        cy="60"
        r={18 + level * 22}
        fill={tint}
        fillOpacity={0.08 + level * 0.28}
        stroke={tint}
        strokeWidth="1.6"
        opacity={0.35 + level * 0.55}
      />
      <circle cx="60" cy="60" r="6" fill={tint} opacity={0.25 + level * 0.7} />
    </svg>
  );
}

function HuecoBar({ estado, tint }: { estado: FiguraEstado; tint: string }) {
  const pct = Math.round((estado.hueco.enPaquete / estado.hueco.paquete) * 100);
  return (
    <div className="mt-2" data-testid="hub-figura-hueco-bar">
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, backgroundColor: tint }}
        />
      </div>
    </div>
  );
}

function capaTitle(estado: FiguraEstado): string {
  if (estado.modo === "consciencia") return "Registro";
  if (estado.modo === "control") return "Sostén";
  return figuraCapaLabel(estado.capa);
}

export function ProyectoFigura({ estado, tint, compact = false, testId }: Props) {
  if (compact) {
    return (
      <div
        className="flex items-center gap-2 min-w-0"
        data-testid={testId ?? "hub-figura-compact"}
      >
        <div className="shrink-0" data-testid="hub-figura-glyph">
          {estado.modo === "consciencia" ? (
            <ConscienciaSvg estado={estado} tint={tint} compact />
          ) : estado.modo === "control" ? (
            <ControlSvg estado={estado} tint={tint} compact />
          ) : (
            <CrecimientoSvg estado={estado} tint={tint} compact />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-wider" style={{ color: tint }}>
            {capaTitle(estado)}
            {estado.conexiones > 0 ? ` · ${estado.conexiones} conex.` : ""}
          </p>
          <p className="text-[8px] text-slate-500 truncate">{estado.copyHueco}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-3 rounded-xl border"
      style={{ backgroundColor: PIZARRA, borderColor: `${tint}35` }}
      data-testid={testId ?? "hub-figura"}
    >
      <p
        className="text-[9px] font-bold uppercase tracking-widest mb-1.5"
        style={{ color: tint }}
      >
        {estado.modo === "consciencia"
          ? "Registro del nido"
          : estado.modo === "control"
            ? "Sostén del nido"
            : `Red del nido · ${figuraCapaLabel(estado.capa)}`}
      </p>
      <div className={cn("flex gap-3", "items-center")}>
        <div className="shrink-0 flex justify-center" data-testid="hub-figura-glyph">
          {estado.modo === "consciencia" ? (
            <ConscienciaSvg estado={estado} tint={tint} />
          ) : estado.modo === "control" ? (
            <ControlSvg estado={estado} tint={tint} />
          ) : (
            <CrecimientoSvg estado={estado} tint={tint} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-slate-300 leading-snug">{estado.copy}</p>
          <p className="text-[10px] font-bold mt-2 leading-snug" style={{ color: tint }}>
            {estado.copyHueco}
          </p>
          <p className="text-[8px] text-slate-600 mt-1.5 uppercase tracking-wider">
            {estado.modo === "consciencia"
              ? `Registro ${estado.enviosRegistro}`
              : `${estado.conexiones} conexiones · ${estado.haces} haces · enfoque ${estado.enviosForma} · conquista ${estado.enviosMasa}`}
          </p>
          <HuecoBar estado={estado} tint={tint} />
        </div>
      </div>
    </div>
  );
}
