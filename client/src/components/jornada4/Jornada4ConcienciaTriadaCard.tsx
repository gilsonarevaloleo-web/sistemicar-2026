/**
 * Métricas — dashboard de conciencia (triada) en Bento 2×2.
 * Barra de cobertura neón + números mono. El detalle vive colapsado.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  NO_CONQUISTADO_META,
  TRIADA_META,
  type ConcienciaTriadaModel,
  type TriadaDaySnapshot,
} from "@/lib/concienciaTriadaOperador";
import { J4_TRIADA_NEON, J4_UI } from "./jornada4Ui";

function formatPlanMin(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} h ${r} min` : `${h} h`;
}

function pctOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.round((part / total) * 100));
}

export type Jornada4ConcienciaTriadaCardProps = {
  model: ConcienciaTriadaModel;
  series: TriadaDaySnapshot[];
};

const BLOCKS = [
  {
    id: "inconsciente",
    label: TRIADA_META.inconsciente.label,
    color: J4_TRIADA_NEON.inconsciente,
    key: "minutosInconsciente" as const,
  },
  {
    id: "presencia",
    label: TRIADA_META.presencia.label,
    color: J4_TRIADA_NEON.presencia,
    key: "minutosPresencia" as const,
  },
  {
    id: "direccion",
    label: TRIADA_META.direccion.label,
    color: J4_TRIADA_NEON.direccion,
    key: "minutosDireccion" as const,
  },
  {
    id: "no_conquistado",
    label: NO_CONQUISTADO_META.label,
    color: J4_TRIADA_NEON.noConquistado,
    key: "minutosNoConquistado" as const,
  },
] as const;

export function Jornada4ConcienciaTriadaCard({
  model,
  series,
}: Jornada4ConcienciaTriadaCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const chartData = series
    .filter(s => s.hasPlanificacion)
    .slice(-14)
    .map(s => ({
      label: s.label,
      Inconsciente: s.pctInconsciente,
      Presencia: s.pctPresencia,
      Dirección: s.pctDireccion,
    }));

  const total = Math.max(model.minutosDia || 24 * 60, 1);
  const barParts = [
    { w: pctOf(model.minutosInconsciente, total), color: J4_TRIADA_NEON.inconsciente },
    { w: pctOf(model.minutosPresencia, total), color: J4_TRIADA_NEON.presencia },
    { w: pctOf(model.minutosDireccion, total), color: J4_TRIADA_NEON.direccion },
    { w: pctOf(model.minutosNoConquistado, total), color: J4_TRIADA_NEON.noConquistado },
  ];

  return (
    <div className="space-y-3" data-testid="jornada4-conciencia-triada">
      <section className={`mx-3 sm:mx-4 ${J4_UI.card}`} data-testid="jornada4-cobertura-bar">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <p className={J4_UI.label}>Cobertura del día</p>
          <p className="font-mono text-sm font-bold tabular-nums text-neutral-100">
            {model.hasPlanificacion
              ? `${Math.max(0, 100 - model.pctNoConquistado)}%`
              : "—"}
          </p>
        </div>
        <div
          className="h-2.5 w-full rounded-full overflow-hidden flex"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        >
          {model.hasPlanificacion
            ? barParts.map((p, i) =>
                p.w > 0 ? (
                  <div
                    key={i}
                    style={{
                      width: `${p.w}%`,
                      backgroundColor: p.color,
                      boxShadow: `0 0 10px ${p.color}66`,
                    }}
                  />
                ) : null
              )
            : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {BLOCKS.map(b => (
            <span key={b.id} className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: b.color, boxShadow: `0 0 6px ${b.color}` }}
              />
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                {b.label}
              </span>
            </span>
          ))}
        </div>
      </section>

      {model.hasPlanificacion ? (
        <div
          className="mx-3 sm:mx-4 grid grid-cols-2 gap-2"
          data-testid="jornada4-conciencia-bento"
        >
          {BLOCKS.map(b => (
            <article
              key={b.id}
              className={J4_UI.card}
              data-testid={
                b.id === "no_conquistado"
                  ? "jornada4-conciencia-no-conquistado"
                  : `jornada4-conciencia-${b.id}`
              }
            >
              <p className={J4_UI.label} style={{ color: b.color }}>
                {b.label}
              </p>
              <p className={`${J4_UI.value} mt-2`} style={{ color: b.color }}>
                {formatPlanMin(model[b.key])}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className={`${J4_UI.hint} mx-3 sm:mx-4`}>
          {model.headline}
        </p>
      )}

      <div className={`mx-3 sm:mx-4 ${J4_UI.cardCompact}`}>
        <button
          type="button"
          onClick={() => setDetailOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left touch-manipulation"
          aria-expanded={detailOpen}
        >
          <span className={J4_UI.label}>Detalle y evolución</span>
          {detailOpen ? (
            <ChevronUp size={14} className="text-neutral-500" />
          ) : (
            <ChevronDown size={14} className="text-neutral-500" />
          )}
        </button>
        {detailOpen ? (
          <div className="px-4 pb-4 space-y-3 border-t border-white/10">
            {model.hasPlanificacion ? (
              <>
                <p className={`${J4_UI.hint} pt-3`}>{model.headline}</p>
                {model.paraleloMeritorio ? (
                  <div
                    className="rounded-lg px-2 py-1.5 border border-white/10"
                    data-testid="jornada4-conciencia-paralelo"
                  >
                    <p className={J4_UI.label}>
                      Paralelo meritorio · {model.hilosAvanzando} hilos
                    </p>
                    <p className={`${J4_UI.hint} mt-0.5`}>
                      {model.minutosParaleloEnJuego > 0
                        ? `${Math.round(model.minutosParaleloEnJuego)} min extra en juego — cuenta si ambos cumplen.`
                        : "Dos hilos avanzan de verdad. La dopamina es al cumplir los dos."}
                    </p>
                  </div>
                ) : model.interruptCubreLinea ? (
                  <p className={J4_UI.hint} data-testid="jornada4-conciencia-interrupt">
                    Interrupt: el enfoque cubre la línea; la conquista está pausada.
                  </p>
                ) : model.minutosParaleloGanado > 0 ? (
                  <p className={J4_UI.hint}>
                    Paralelo ganado hoy: {Math.round(model.minutosParaleloGanado)} min extra.
                  </p>
                ) : null}
              </>
            ) : null}

            {chartData.length >= 2 ? (
              <div className="pt-1" data-testid="jornada4-conciencia-triada-chart">
                <p className={`${J4_UI.label} mb-2`}>
                  Evolución · {chartData.length} días
                </p>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#737373", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: "#737373", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a0a",
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
                        stroke={J4_TRIADA_NEON.inconsciente}
                        fill={J4_TRIADA_NEON.inconsciente}
                        fillOpacity={0.45}
                      />
                      <Area
                        type="monotone"
                        dataKey="Presencia"
                        stackId="1"
                        stroke={J4_TRIADA_NEON.presencia}
                        fill={J4_TRIADA_NEON.presencia}
                        fillOpacity={0.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="Dirección"
                        stackId="1"
                        stroke={J4_TRIADA_NEON.direccion}
                        fill={J4_TRIADA_NEON.direccion}
                        fillOpacity={0.55}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : model.hasPlanificacion ? (
              <p className={J4_UI.hint}>
                El gráfico aparece tras dos jornadas con plan.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
