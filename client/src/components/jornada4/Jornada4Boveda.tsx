import { useMemo, useState } from "react";
import {
  Award,
  ChevronLeft,
  Trophy,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  computeBovedaRecordsFromHistory,
  computeJornadaVoltaje,
  type BovedaRecordView,
  type BovedaVoltaje,
} from "@/components/jornada/MetricasJornadaModule";
import {
  readVehicleHistoryLocal,
} from "@/lib/vehicleHistoryStore";
import type { VehicleHistoryEntry } from "@/lib/persistence";
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, INK, MUTED, GOLD } = J4_COLORS;
const EMERALD = "#50C878";
const AZURE = "#1E90FF";

const VOLTAJE: Record<
  BovedaVoltaje,
  { color: string; glow: string; label: string }
> = {
  Máximo: { color: GOLD, glow: "rgba(212,175,55,0.25)", label: "VOLTAJE MÁXIMO" },
  Alto: { color: EMERALD, glow: "rgba(80,200,120,0.22)", label: "VOLTAJE ALTO" },
  Medio: { color: AZURE, glow: "rgba(30,144,255,0.2)", label: "VOLTAJE MEDIO" },
  Bajo: { color: MUTED, glow: "rgba(100,116,139,0.18)", label: "VOLTAJE BAJO" },
};

function historyForTitulo(
  all: VehicleHistoryEntry[],
  titulo: string
): VehicleHistoryEntry[] {
  const key = titulo.toLowerCase().trim();
  return all
    .filter(
      h =>
        h?.titulo?.toLowerCase().trim() === key &&
        Number.isFinite(h.minPerUnit) &&
        h.minPerUnit > 0
    )
    .sort((a, b) => a.fecha - b.fecha);
}

type DetailProps = {
  record: BovedaRecordView;
  series: VehicleHistoryEntry[];
  onBack: () => void;
};

function BovedaDetail({ record, series, onBack }: DetailProps) {
  const cfg = VOLTAJE[record.voltaje];
  const chartData = series.map((h, i) => ({
    name: `#${i + 1}`,
    valor: Number(h.minPerUnit.toFixed(2)),
    fecha: new Date(h.fecha).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
    }),
  }));
  const trendDown =
    series.length >= 2 &&
    series[series.length - 1]!.minPerUnit < series[0]!.minPerUnit;

  return (
    <div className="space-y-4" data-testid="jornada4-boveda-detail">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-xs transition-colors"
        style={{ color: MUTED }}
      >
        <ChevronLeft size={14} /> Volver a la Bóveda
      </button>

      <div
        className="p-4 rounded-xl border-2 relative overflow-hidden"
        style={{
          backgroundColor: PIZARRA,
          borderColor: cfg.color,
          boxShadow: `0 0 25px ${cfg.glow}`,
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-black" style={{ color: INK }}>
              {record.titulo}
            </h3>
            <p
              className="text-[9px] uppercase tracking-widest mt-0.5"
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-2xl font-black"
              style={{ color: cfg.color, textShadow: `0 0 15px ${cfg.glow}` }}
            >
              {record.bestMinPerUnit.toFixed(1)}
            </p>
            <p className="text-[8px] uppercase" style={{ color: MUTED }}>
              min/unidad
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div
            className="p-2 rounded-lg text-center"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <p className="text-sm font-black" style={{ color: GOLD }}>
              {record.count}
            </p>
            <p className="text-[7px] uppercase" style={{ color: MUTED }}>
              Ejecuciones
            </p>
          </div>
          <div
            className="p-2 rounded-lg text-center"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <p className="text-sm font-black" style={{ color: EMERALD }}>
              {record.bestTotalMin}m
            </p>
            <p className="text-[7px] uppercase" style={{ color: MUTED }}>
              Mejor tiempo
            </p>
          </div>
          <div
            className="p-2 rounded-lg text-center"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <p className="text-sm font-black" style={{ color: AZURE }}>
              {new Date(record.bestDate).toLocaleDateString("es-PE", {
                day: "2-digit",
                month: "short",
              })}
            </p>
            <p className="text-[7px] uppercase" style={{ color: MUTED }}>
              Fecha récord
            </p>
          </div>
        </div>

        {record.improvementPct !== 0 ? (
          <div
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg mb-3"
            style={{
              backgroundColor: record.improvementPct > 0
                ? "rgba(80,200,120,0.1)"
                : "rgba(255,49,49,0.08)",
              border: `1px solid ${
                record.improvementPct > 0
                  ? "rgba(80,200,120,0.3)"
                  : "rgba(255,49,49,0.25)"
              }`,
            }}
          >
            {record.improvementPct > 0 ? (
              <TrendingDown size={12} style={{ color: EMERALD }} />
            ) : (
              <TrendingUp size={12} style={{ color: "#FF3131" }} />
            )}
            <p
              className="text-[10px] font-bold"
              style={{ color: record.improvementPct > 0 ? EMERALD : "#FF3131" }}
            >
              {record.firstMinPerUnit.toFixed(1)} → {record.bestMinPerUnit.toFixed(1)} min/u
              {" · "}
              {record.improvementPct > 0 ? "bajada" : "subida"}{" "}
              {Math.abs(record.improvementPct).toFixed(1)}%
            </p>
          </div>
        ) : null}

        <div
          className="p-3 rounded-xl border"
          style={{
            backgroundColor: "rgba(0,0,0,0.3)",
            borderColor: `${cfg.color}20`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Award size={10} style={{ color: GOLD }} />
            <p
              className="text-[8px] font-black uppercase tracking-widest"
              style={{ color: GOLD }}
            >
              Certificado por SISTEMICAR
            </p>
          </div>
          <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>
            Energía Real Verificada ·{" "}
            {new Date(record.bestDate).toLocaleDateString("es-PE", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {chartData.length >= 2 ? (
        <div
          className="p-4 rounded-xl border"
          style={{ backgroundColor: PIZARRA, borderColor: `${GOLD}20` }}
        >
          <div className="flex items-center gap-2 mb-3">
            {trendDown ? (
              <TrendingDown size={12} style={{ color: EMERALD }} />
            ) : (
              <TrendingUp size={12} style={{ color: GOLD }} />
            )}
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: GOLD }}
            >
              Gráfica · bajada / subida
            </span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  domain={["dataMin - 0.5", "dataMax + 0.5"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: PIZARRA,
                    border: `1px solid ${GOLD}30`,
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: GOLD, fontWeight: 800, fontSize: 10 }}
                  formatter={(value: number) => [`${value} min/u`, "Eficiencia"]}
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as { fecha?: string } | undefined)?.fecha || ""
                  }
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke={GOLD}
                  strokeWidth={2}
                  dot={{ fill: GOLD, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: GOLD, stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[8px] text-center mt-2" style={{ color: MUTED }}>
            Evolución min/unidad · línea descendente = más eficiencia (bajada)
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-center" style={{ color: MUTED }}>
          Necesitas ≥2 ejecuciones para ver la gráfica de tendencia.
        </p>
      )}
    </div>
  );
}

/** Bóveda Dual Kernel — lista + detalle con gráfica (misma data que Jornada clásica). */
export function Jornada4Boveda() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<BovedaRecordView | null>(null);
  const [tick, setTick] = useState(0);

  const history = useMemo(() => {
    void tick;
    return readVehicleHistoryLocal();
  }, [tick]);

  const records = useMemo(
    () => computeBovedaRecordsFromHistory(history),
    [history]
  );
  const jornadaVoltaje = useMemo(() => computeJornadaVoltaje(records), [records]);
  const cfg = VOLTAJE[jornadaVoltaje];

  const selectedSeries = useMemo(
    () => (selected ? historyForTitulo(history, selected.titulo) : []),
    [selected, history]
  );

  return (
    <div className="px-4 pb-2" data-testid="jornada4-boveda">
      <button
        type="button"
        onClick={() => {
          setTick(t => t + 1);
          setSelected(null);
          setOpen(true);
        }}
        className="w-full p-3 rounded-xl border flex items-center justify-between touch-manipulation"
        style={{
          backgroundColor: `${GOLD}08`,
          borderColor: `${GOLD}35`,
          boxShadow: `0 0 14px ${GOLD}12`,
        }}
        data-testid="jornada4-boveda-open"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${GOLD}15` }}
          >
            <Trophy size={14} style={{ color: GOLD }} />
          </div>
          <div className="text-left">
            <p
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: GOLD }}
            >
              Bóveda de Récords
            </p>
            <p className="text-[8px]" style={{ color: MUTED }}>
              {records.length > 0
                ? `${records.length} unidad${records.length !== 1 ? "es" : ""} · ${cfg.label}`
                : "Tiempos de oro · energía real"}
            </p>
          </div>
        </div>
        <Trophy size={14} style={{ color: GOLD }} className="opacity-50" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[230] flex items-start justify-center overflow-y-auto"
          style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
          data-testid="jornada4-boveda-modal"
        >
          <div className="w-full max-w-lg mx-4 my-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `${GOLD}20`,
                    boxShadow: `0 0 20px ${GOLD}30`,
                  }}
                >
                  <Trophy size={20} style={{ color: GOLD }} />
                </div>
                <div>
                  <h2 className="text-lg font-black" style={{ color: INK }}>
                    BÓVEDA DE RÉCORDS
                  </h2>
                  <p
                    className="text-[9px] uppercase tracking-widest"
                    style={{ color: MUTED }}
                  >
                    Tiempos de Oro · Certificados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSelected(null);
                }}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10"
                data-testid="jornada4-boveda-close"
              >
                <X size={16} style={{ color: MUTED }} />
              </button>
            </div>

            {selected ? (
              <BovedaDetail
                record={selected}
                series={selectedSeries}
                onBack={() => setSelected(null)}
              />
            ) : records.length === 0 ? (
              <div
                className="py-10 px-4 rounded-xl border text-center"
                style={{
                  backgroundColor: PIZARRA,
                  borderColor: `${GOLD}20`,
                }}
              >
                <Trophy
                  size={36}
                  className="mx-auto mb-3 opacity-25"
                  style={{ color: GOLD }}
                />
                <p className="text-sm" style={{ color: MUTED }}>
                  La Bóveda está vacía
                </p>
                <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                  Cierra unidades de Conquista (Cumplido) para registrar min/u
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {records.map(record => {
                  const tier = VOLTAJE[record.voltaje];
                  return (
                    <button
                      key={`${record.titulo}-${record.bestDate}`}
                      type="button"
                      onClick={() => setSelected(record)}
                      className="w-full p-3 rounded-xl border flex items-center gap-3 text-left touch-manipulation"
                      style={{
                        backgroundColor: PIZARRA,
                        borderColor: `${tier.color}30`,
                        boxShadow: `0 0 10px ${tier.glow}`,
                      }}
                      data-testid={`jornada4-boveda-row-${record.titulo.slice(0, 20)}`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${tier.color}18` }}
                      >
                        <Trophy size={16} style={{ color: tier.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate" style={{ color: INK }}>
                          {record.titulo}
                        </p>
                        <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>
                          {record.count} ejecucion{record.count !== 1 ? "es" : ""}
                          {record.improvementPct !== 0
                            ? ` · ${record.firstMinPerUnit.toFixed(1)}→${record.bestMinPerUnit.toFixed(1)}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className="text-lg font-black tabular-nums"
                          style={{ color: tier.color }}
                        >
                          {record.bestMinPerUnit.toFixed(1)}
                        </p>
                        <p className="text-[7px] uppercase" style={{ color: MUTED }}>
                          min/u
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
