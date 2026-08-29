/**
 * Métricas — evolución de conciencia del operador (triada).
 * 100% = plan del día en tiempo de línea. Interrupt no multiplica.
 * Solo montar en pestaña Métricas (idle).
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

function formatPlanMin(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} h ${r} min` : `${h} h`;
}

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
              : "Sin planificación — no hay conciencia que medir."}
          </p>
        </div>
        {model.hasPlanificacion && model.minutosPlan > 0 ? (
          <p className="text-[9px] tabular-nums shrink-0 text-right" style={{ color: MUTED }}>
            100% = {formatPlanMin(model.minutosPlan)}
            <span className="block normal-case tracking-normal">línea del plan</span>
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
          {model.paraleloMeritorio ? (
            <div
              className="rounded-lg px-2 py-1.5"
              style={{ backgroundColor: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.28)" }}
              data-testid="jornada4-conciencia-paralelo"
            >
              <p className="text-[8px] uppercase tracking-widest" style={{ color: "#D4AF37" }}>
                Paralelo meritorio · {model.hilosAvanzando} hilos
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: INK }}>
                {model.minutosParaleloEnJuego > 0
                  ? `${Math.round(model.minutosParaleloEnJuego)} min extra en juego — cuenta si ambos cumplen.`
                  : "Dos hilos avanzan de verdad. La dopamina es al cumplir los dos."}
              </p>
            </div>
          ) : model.interruptCubreLinea ? (
            <p className="text-[8px] leading-relaxed" style={{ color: MUTED }} data-testid="jornada4-conciencia-interrupt">
              Interrupt: el enfoque cubre la línea; la conquista está pausada. No es multiplicar tiempo.
            </p>
          ) : model.minutosParaleloGanado > 0 ? (
            <p className="text-[8px] leading-relaxed" style={{ color: MUTED }}>
              Paralelo ganado hoy: {Math.round(model.minutosParaleloGanado)} min extra (ambos cumplidos).
            </p>
          ) : null}
          <p className="text-[8px] leading-relaxed" style={{ color: MUTED }}>
            La copa es tiempo de línea: un hilo.
            {model.minutosPlanFuturo > 0 || model.minutosHueco > 0
              ? ` Lo no conquistado${
                  model.minutosPlanFuturo > 0
                    ? ` (${Math.round(model.minutosPlanFuturo)} min aún no ocurren — no es deuda)`
                    : ""
                }${
                  model.minutosHueco > 0
                    ? `${model.minutosPlanFuturo > 0 ? " y" : ""} ${Math.round(model.minutosHueco)} min de hueco inconsciente`
                    : ""
                }.`
              : ""}{" "}
            La meta es crecer Dirección por encima de Presencia.
          </p>
        </>
      ) : null}

      {chartData.length >= 2 ? (
        <div className="pt-1" data-testid="jornada4-conciencia-triada-chart">
          <p className="text-[8px] uppercase tracking-widest mb-2" style={{ color: MUTED }}>
            Evolución · % del plan · {chartData.length} días
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
                  formatter={(value: number, name: string) => [`${value}%`, name]}
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
          El gráfico compara los tres % día a día. Aparece tras dos jornadas con plan.
        </p>
      ) : null}
    </div>
  );
}
