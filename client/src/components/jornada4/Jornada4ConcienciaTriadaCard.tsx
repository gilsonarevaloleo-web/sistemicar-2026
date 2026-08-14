/**
 * Métricas — evolución de conciencia del operador (triada).
 * Solo montar en pestaña Métricas (idle). Sin motores pesados en este archivo.
 */
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TRIADA_META,
  type ConcienciaTriadaModel,
  type TriadaDaySnapshot,
} from "@/lib/concienciaTriadaOperador";
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, MUTED, INK } = J4_COLORS;

export type Jornada4ConcienciaTriadaCardProps = {
  model: ConcienciaTriadaModel;
  series: TriadaDaySnapshot[];
};

export function Jornada4ConcienciaTriadaCard({
  model,
  series,
}: Jornada4ConcienciaTriadaCardProps) {
  const chartData = series
    .filter(s => s.hasPlanificacion)
    .slice(-14)
    .map(s => ({
      label: s.label,
      Inconsciente: s.pctInconsciente,
      Presencia: s.pctPresencia,
      Dirección: s.pctDireccion,
    }));

  return (
    <div
      className="mx-1 mb-2 rounded-xl border p-3 space-y-3"
      style={{ backgroundColor: PIZARRA, borderColor: "rgba(255,255,255,0.08)" }}
      data-testid="jornada4-conciencia-triada"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>
            Conciencia del operador
          </p>
          <p className="text-[11px] font-semibold mt-0.5" style={{ color: INK }}>
            {model.hasPlanificacion
              ? model.headline
              : "Sin planificación — no hay huecos que medir."}
          </p>
        </div>
        {model.hasPlanificacion && model.minutosPlanMedible > 0 ? (
          <p className="text-[9px] tabular-nums shrink-0" style={{ color: MUTED }}>
            {Math.round(model.minutosPlanMedible)} min
          </p>
        ) : null}
      </div>

      {model.hasPlanificacion ? (
        <>
          <div className="h-2.5 w-full rounded-full overflow-hidden flex" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
            {model.pctInconsciente > 0 && (
              <div
                style={{
                  width: `${model.pctInconsciente}%`,
                  backgroundColor: TRIADA_META.inconsciente.color,
                }}
                title={`Inconsciente ${model.pctInconsciente}%`}
              />
            )}
            {model.pctPresencia > 0 && (
              <div
                style={{
                  width: `${model.pctPresencia}%`,
                  backgroundColor: TRIADA_META.presencia.color,
                }}
                title={`Presencia ${model.pctPresencia}%`}
              />
            )}
            {model.pctDireccion > 0 && (
              <div
                style={{
                  width: `${model.pctDireccion}%`,
                  backgroundColor: TRIADA_META.direccion.color,
                }}
                title={`Dirección ${model.pctDireccion}%`}
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["inconsciente", "presencia", "direccion"] as const).map(id => {
              const meta = TRIADA_META[id];
              const pct =
                id === "inconsciente"
                  ? model.pctInconsciente
                  : id === "presencia"
                    ? model.pctPresencia
                    : model.pctDireccion;
              const min =
                id === "inconsciente"
                  ? model.minutosInconsciente
                  : id === "presencia"
                    ? model.minutosPresencia
                    : model.minutosDireccion;
              return (
                <div key={id} className="text-center">
                  <p className="text-base font-black tabular-nums" style={{ color: meta.color }}>
                    {pct}%
                  </p>
                  <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>
                    {meta.label}
                  </p>
                  <p className="text-[8px] tabular-nums" style={{ color: MUTED }}>
                    {Math.round(min)} min
                  </p>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {chartData.length >= 2 ? (
        <div className="pt-1" data-testid="jornada4-conciencia-triada-chart">
          <p className="text-[8px] uppercase tracking-widest mb-2" style={{ color: MUTED }}>
            Evolución · {chartData.length} días
          </p>
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: MUTED, fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: MUTED, fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: PIZARRA,
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Inconsciente"
                  stackId="1"
                  stroke={TRIADA_META.inconsciente.color}
                  fill={TRIADA_META.inconsciente.color}
                  fillOpacity={0.45}
                />
                <Area
                  type="monotone"
                  dataKey="Presencia"
                  stackId="1"
                  stroke={TRIADA_META.presencia.color}
                  fill={TRIADA_META.presencia.color}
                  fillOpacity={0.5}
                />
                <Area
                  type="monotone"
                  dataKey="Dirección"
                  stackId="1"
                  stroke={TRIADA_META.direccion.color}
                  fill={TRIADA_META.direccion.color}
                  fillOpacity={0.55}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : model.hasPlanificacion ? (
        <p className="text-[9px] leading-relaxed" style={{ color: MUTED }}>
          El gráfico aparece tras dos días con plan medible. Hoy alimenta la serie en idle.
        </p>
      ) : null}
    </div>
  );
}
