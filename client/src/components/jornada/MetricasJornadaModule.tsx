import { memo, useMemo } from "react";
import { Trophy, Zap } from "lucide-react";
import {
  computeDailyPsBarModel,
  type DailyPsBarModel,
} from "@/lib/dailyPsBar";
import type { VehicleHistoryEntry } from "@/lib/persistence";
import {
  computeBovedaRecordsFromHistory,
  computeJornadaVoltaje,
  type BovedaRecordView,
  type BovedaVoltaje,
} from "@/lib/bovedaRecords";

export {
  computeBovedaRecordsFromHistory,
  computeImprovementPct,
  computeJornadaVoltaje,
  voltajeFromImprovement,
  type BovedaRecordView,
  type BovedaVoltaje,
} from "@/lib/bovedaRecords";

// ─── Paleta tech-noir ───────────────────────────────────────────────────────

const COLORS = {
  charcoal: "#0a0a0a",
  pizarra: "#1e293b",
  gold: "#D4AF37",
  goldGlow: "rgba(212, 175, 55, 0.25)",
  cyan: "#00FFC3",
  cyanDim: "rgba(0, 255, 195, 0.12)",
  steel: "#64748b",
  emerald: "#50C878",
  azure: "#1E90FF",
} as const;

export interface MetricasJornadaModuleProps {
  todayPs: number;
  yesterdayPs: number;
  /** Historial consolidado (localStorage + Firebase merge). */
  vehicleHistory: VehicleHistoryEntry[];
  /** Filas máximas en el panel Bóveda (default 5). */
  maxBovedaRows?: number;
  className?: string;
  onRecordClick?: (record: BovedaRecordView) => void;
}

const VOLTAJE_TIER: Record<
  BovedaVoltaje,
  { color: string; glow: string; label: string; bg: string }
> = {
  Máximo: {
    color: COLORS.gold,
    glow: COLORS.goldGlow,
    label: "VOLTAJE MÁXIMO",
    bg: "rgba(212, 175, 55, 0.12)",
  },
  Alto: {
    color: COLORS.emerald,
    glow: "rgba(80, 200, 120, 0.22)",
    label: "VOLTAJE ALTO",
    bg: "rgba(80, 200, 120, 0.1)",
  },
  Medio: {
    color: COLORS.azure,
    glow: "rgba(30, 144, 255, 0.2)",
    label: "VOLTAJE MEDIO",
    bg: "rgba(30, 144, 255, 0.08)",
  },
  Bajo: {
    color: COLORS.steel,
    glow: "rgba(100, 116, 139, 0.18)",
    label: "VOLTAJE BAJO",
    bg: "rgba(100, 116, 139, 0.1)",
  },
};

function formatRecordDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

// ─── Subcomponentes memoizados ──────────────────────────────────────────────

type DailyPsBarPanelProps = {
  model: DailyPsBarModel;
};

const DailyPsBarPanel = memo(function DailyPsBarPanel({ model }: DailyPsBarPanelProps) {
  const fillGradient = model.atOrAbove100
    ? `linear-gradient(90deg, ${COLORS.cyan}99 0%, ${COLORS.cyan} 70%, ${COLORS.gold} 100%)`
    : `linear-gradient(90deg, ${COLORS.cyan}55, ${COLORS.cyan})`;

  return (
    <section
      className="rounded-xl border p-3"
      style={{
        backgroundColor: COLORS.charcoal,
        borderColor: `${COLORS.cyan}22`,
        boxShadow: `0 0 14px ${COLORS.cyanDim}`,
      }}
      data-testid="metricas-ps-bar"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
          Inyección de Fe · PS del día
        </span>
        <span className="text-sm font-black tabular-nums" style={{ color: COLORS.cyan }}>
          {model.todayPs} PS
          <span className="text-[10px] font-bold ml-1.5 opacity-80">{model.pctOfReference}%</span>
        </span>
      </div>

      <p className="text-[7px] text-slate-500 mb-1 leading-snug">{model.referenceLabel}</p>

      <p
        className="text-[8px] font-bold mb-1.5 leading-snug"
        style={{ color: model.atOrAbove100 ? COLORS.gold : COLORS.cyan }}
        data-testid="daily-ps-status"
      >
        {model.statusText}
      </p>

      <div
        className="relative h-3 rounded-full overflow-visible mb-1"
        style={{ backgroundColor: COLORS.cyanDim }}
        data-testid="daily-ps-bar-track"
      >
        <div
          className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none"
          style={{
            left: `${model.marker100WidthPct}%`,
            backgroundColor: model.atOrAbove100 ? `${COLORS.gold}90` : "rgba(255,255,255,0.45)",
            boxShadow: model.atOrAbove100 ? `0 0 6px ${COLORS.gold}80` : "none",
          }}
          title="100% = referencia de ayer"
        />
        <div
          className="absolute top-0 bottom-0 left-0 rounded-full z-10 transition-[width] duration-500 ease-out"
          style={{
            width: `${model.fillWidthPct}%`,
            background: fillGradient,
            boxShadow: model.atOrAbove120 ? `0 0 12px ${COLORS.goldGlow}` : `0 0 8px ${COLORS.cyanDim}`,
          }}
          data-testid="daily-ps-bar-fill"
        />
      </div>

      <div className="relative h-3 mb-0.5">
        <span className="absolute left-0 top-0 text-[7px] text-slate-600">0</span>
        <span
          className="absolute top-0 text-[7px] font-bold -translate-x-1/2"
          style={{
            left: `${model.marker100WidthPct}%`,
            color: model.atOrAbove100 ? COLORS.gold : "rgba(255,255,255,0.45)",
          }}
        >
          100%
        </span>
        <span className="absolute right-0 top-0 text-[7px] text-slate-600">120%</span>
      </div>

      <div className="flex justify-between gap-2 mt-1 text-[7px] font-mono">
        <span style={{ color: model.atOrAbove100 ? COLORS.steel : COLORS.cyan }}>
          {model.atOrAbove100
            ? "100% alcanzado"
            : `−${model.remainingTo100} PS → 100%`}
        </span>
        <span style={{ color: model.atOrAbove120 ? COLORS.gold : COLORS.steel }}>
          {model.atOrAbove120
            ? "120% conquistado"
            : `−${model.remainingTo120} PS → 120%`}
        </span>
      </div>
    </section>
  );
});

type VoltajeBadgeProps = {
  voltaje: BovedaVoltaje;
  improvementPct?: number;
  compact?: boolean;
};

const VoltajeBadge = memo(function VoltajeBadge({
  voltaje,
  improvementPct,
  compact = false,
}: VoltajeBadgeProps) {
  const cfg = VOLTAJE_TIER[voltaje];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-black uppercase tracking-wider ${
        compact ? "text-[7px] px-1.5 py-0.5" : "text-[8px] px-2 py-1"
      }`}
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}35`,
        boxShadow: `0 0 8px ${cfg.glow}`,
      }}
      data-testid={`voltaje-badge-${voltaje}`}
    >
      <Zap size={compact ? 8 : 10} aria-hidden />
      {cfg.label}
      {improvementPct != null && improvementPct > 0 && (
        <span className="opacity-80">+{improvementPct}%</span>
      )}
    </span>
  );
});

type BovedaRecordRowProps = {
  record: BovedaRecordView;
  onClick?: () => void;
};

const BovedaRecordRow = memo(function BovedaRecordRow({ record, onClick }: BovedaRecordRowProps) {
  const cfg = VOLTAJE_TIER[record.voltaje];
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="w-full p-2.5 rounded-lg border flex items-center gap-2.5 text-left touch-manipulation"
      style={{
        backgroundColor: COLORS.pizarra,
        borderColor: `${cfg.color}28`,
        boxShadow: `0 0 8px ${cfg.glow}`,
      }}
      data-testid={`boveda-row-${record.titulo.toLowerCase().slice(0, 24)}`}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: cfg.bg }}
      >
        <Trophy size={14} style={{ color: cfg.color }} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-white truncate">{record.titulo}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <VoltajeBadge voltaje={record.voltaje} compact />
          <span className="text-[7px] text-slate-600">{record.count} ejec.</span>
          {record.improvementPct > 0 && (
            <span className="text-[7px] font-mono" style={{ color: cfg.color }}>
              {record.firstMinPerUnit.toFixed(1)} → {record.bestMinPerUnit.toFixed(1)} min/u
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-base font-black tabular-nums" style={{ color: cfg.color }}>
          {record.bestMinPerUnit.toFixed(1)}
        </p>
        <p className="text-[7px] text-slate-500 uppercase">min/u · {formatRecordDate(record.bestDate)}</p>
      </div>
    </Tag>
  );
});

type BovedaPanelProps = {
  records: BovedaRecordView[];
  jornadaVoltaje: BovedaVoltaje;
  maxRows: number;
  onRecordClick?: (record: BovedaRecordView) => void;
};

const BovedaPanel = memo(function BovedaPanel({
  records,
  jornadaVoltaje,
  maxRows,
  onRecordClick,
}: BovedaPanelProps) {
  const cfg = VOLTAJE_TIER[jornadaVoltaje];
  const visible = records.slice(0, maxRows);
  const bestImprovement = records.reduce((m, r) => Math.max(m, r.improvementPct), 0);

  return (
    <section
      className="rounded-xl border p-3"
      style={{
        backgroundColor: COLORS.charcoal,
        borderColor: `${cfg.color}22`,
        boxShadow: `0 0 14px ${cfg.glow}`,
      }}
      data-testid="metricas-boveda-panel"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            Bóveda de Récords
          </p>
          <p className="text-[7px] text-slate-600 mt-0.5">Energía real verificada · min/unidad</p>
        </div>
        <VoltajeBadge voltaje={jornadaVoltaje} improvementPct={bestImprovement || undefined} />
      </div>

      {visible.length === 0 ? (
        <div
          className="py-6 px-3 rounded-lg border text-center"
          style={{ backgroundColor: "rgba(0,0,0,0.25)", borderColor: `${COLORS.gold}15` }}
        >
          <Trophy size={28} className="mx-auto mb-2 opacity-20" style={{ color: COLORS.gold }} />
          <p className="text-[10px] text-slate-400">Bóveda vacía</p>
          <p className="text-[8px] text-slate-600 mt-1">
            Cierra subs de producción para registrar récords
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {visible.map(record => (
            <BovedaRecordRow
              key={`${record.titulo}-${record.bestDate}`}
              record={record}
              onClick={onRecordClick ? () => onRecordClick(record) : undefined}
            />
          ))}
          {records.length > maxRows && (
            <p className="text-[7px] text-center text-slate-600 pt-1">
              +{records.length - maxRows} récords más en la bóveda
            </p>
          )}
        </div>
      )}
    </section>
  );
});

// ─── Componente principal ───────────────────────────────────────────────────

function MetricasJornadaModuleInner({
  todayPs,
  yesterdayPs,
  vehicleHistory,
  maxBovedaRows = 5,
  className = "",
  onRecordClick,
}: MetricasJornadaModuleProps) {
  const dailyModel = useMemo(
    () => computeDailyPsBarModel(todayPs, yesterdayPs),
    [todayPs, yesterdayPs]
  );

  const bovedaRecords = useMemo(
    () => computeBovedaRecordsFromHistory(vehicleHistory),
    [vehicleHistory]
  );

  const jornadaVoltaje = useMemo(
    () => computeJornadaVoltaje(bovedaRecords),
    [bovedaRecords]
  );

  return (
    <div
      className={`space-y-2 ${className}`.trim()}
      data-testid="metricas-jornada-module"
      data-history-count={vehicleHistory.length}
    >
      <DailyPsBarPanel model={dailyModel} />
      <BovedaPanel
        records={bovedaRecords}
        jornadaVoltaje={jornadaVoltaje}
        maxRows={maxBovedaRows}
        onRecordClick={onRecordClick}
      />
    </div>
  );
}

export const MetricasJornadaModule = memo(MetricasJornadaModuleInner);
export default MetricasJornadaModule;

export type { DailyPsBarModel, VehicleHistoryEntry };
