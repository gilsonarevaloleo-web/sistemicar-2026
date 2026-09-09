import { useId } from "react";
import { cn } from "@/lib/utils";
import type { FiguraEstado, FiguraMiembro } from "@/lib/figuraProyecto";
import { FIGURA_MIEMBROS_MAX, FIGURA_PAQUETE } from "@/lib/figuraProyecto";

const PIZARRA = "#0a0a0a";

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
      strokeDasharray: "4 5",
      opacity: next ? 0.9 : 0.28,
      className: next ? "animate-pulse" : undefined,
    };
  }
  return {
    fill: tint,
    fillOpacity: estado.deformacion === "hueca" ? 0.08 : 0.12 + estado.masaFill * 0.5,
    stroke: estado.deformacion === "hinchada" ? "#D4AF37" : tint,
    opacity: 1,
  };
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
  const swell = estado.deformacion === "hinchada" && estado.miembrosRevelados > 0;
  const glowId = `fig-glow-${uid}`;
  const parts = {
    cabeza: memberById(estado, "cabeza"),
    torso: memberById(estado, "torso"),
    brazoI: memberById(estado, "brazoI"),
    brazoD: memberById(estado, "brazoD"),
    piernaI: memberById(estado, "piernaI"),
    piernaD: memberById(estado, "piernaD"),
  };
  const w = compact ? 56 : 120;
  const h = compact ? 92 : 196;
  return (
    <svg
      viewBox="0 0 120 200"
      width={w}
      height={h}
      aria-hidden
      className={swell ? "origin-center" : undefined}
      style={swell ? { transform: "scale(1.06)" } : undefined}
    >
      <defs>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={estado.deformacion === "hueca" ? 0.6 : 1.8} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g
        fill="none"
        strokeWidth={compact ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      >
        <ellipse cx="60" cy="28" rx="16" ry="18" {...partStyle(parts.cabeza, estado, tint)} />
        <rect x="42" y="50" width="36" height="52" rx="12" {...partStyle(parts.torso, estado, tint)} />
        <rect x="16" y="54" width="22" height="50" rx="11" {...partStyle(parts.brazoI, estado, tint)} />
        <rect x="82" y="54" width="22" height="50" rx="11" {...partStyle(parts.brazoD, estado, tint)} />
        <rect x="42" y="106" width="16" height="62" rx="8" {...partStyle(parts.piernaI, estado, tint)} />
        <rect x="62" y="106" width="16" height="62" rx="8" {...partStyle(parts.piernaD, estado, tint)} />
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
            strokeWidth="1.8"
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
  const level = Math.min(1, estado.enviosRegistro / (FIGURA_MIEMBROS_MAX * FIGURA_PAQUETE));
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

export function ProyectoFigura({ estado, tint, compact = false, testId }: Props) {
  const deformLabel =
    estado.deformacion === "hinchada"
      ? "Hinchada"
      : estado.deformacion === "hueca"
        ? "Hueca"
        : null;

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
            {estado.modo === "consciencia"
              ? "Registro"
              : estado.modo === "control"
                ? "Sostén"
                : "Figura"}
            {deformLabel ? ` · ${deformLabel}` : ""}
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
            : "Figura del nido"}
        {deformLabel ? (
          <span className="ml-2 text-slate-500 font-bold">{deformLabel}</span>
        ) : null}
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
              : `Forma ${estado.enviosForma} · Masa ${estado.enviosMasa}`}
          </p>
          <HuecoBar estado={estado} tint={tint} />
        </div>
      </div>
    </div>
  );
}
