/**
 * Barra de gasto de conciencia en el Hub: mismos 4 cubos del día + registros
 * de cada vehículo (calendario). Presencia se enumera sin sellar peldaño.
 */
import { useMemo, useState } from "react";
import { NO_CONQUISTADO_META, TRIADA_META } from "@/lib/concienciaTriadaOperador";
import {
  computeGastoConcienciaDia,
  formatDuracionTimon,
  MINUTOS_DIA_JORNADA,
  readLocalPlanillaSegmentos,
  type GastoVehiculoRegistro,
} from "@/lib/gastoConcienciaEngine";
import { getJournalDateString } from "@/lib/segmentTime";
import {
  formatHoraLabel,
  horasDeEpisodio,
  hydratePresenciaEpisodio,
  type TimonEpisodio,
} from "@/lib/timonHoras";
import type { Vehicle } from "@/lib/persistence";

const PIZARRA = "#0a0a0a";
const MUTED = "#64748b";
const INK = "#f1f5f9";
const GOLD = "#D4AF37";

type Horizon = "dia" | "semana";

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(ts: number): number {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function labelBucket(start: number, horizon: Horizon): string {
  const d = new Date(start);
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  if (horizon === "dia") {
    return `${dias[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
  }
  return `Sem ${d.getDate()}/${d.getMonth() + 1}`;
}

function groupRegistros(registros: GastoVehiculoRegistro[], horizon: Horizon) {
  const keyOf = horizon === "dia" ? startOfDay : startOfWeek;
  const map = new Map<
    number,
    { start: number; presencia: number; direccion: number; n: number; recientes: string[] }
  >();
  for (const r of registros) {
    const k = keyOf(r.a);
    const cur = map.get(k) ?? { start: k, presencia: 0, direccion: 0, n: 0, recientes: [] };
    if (r.dest === "presencia") cur.presencia += r.minutos;
    else cur.direccion += r.minutos;
    cur.n += 1;
    if (cur.recientes.length < 3) cur.recientes.push(r.titulo);
    map.set(k, cur);
  }
  return [...map.values()].sort((a, b) => b.start - a.start);
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.round((part / total) * 100));
}

export type ProyectoGastoConcienciaCardProps = {
  proyectoId: string;
  vehicles: Vehicle[];
  presenciaEpisodio?: TimonEpisodio | null;
};

export function ProyectoGastoConcienciaCard({
  proyectoId,
  vehicles,
  presenciaEpisodio,
}: ProyectoGastoConcienciaCardProps) {
  const [horizon, setHorizon] = useState<Horizon>("dia");
  const fecha = getJournalDateString();
  const segmentos = useMemo(() => readLocalPlanillaSegmentos(fecha), [fecha]);
  const delProyecto = useMemo(
    () => vehicles.filter(v => (v.proyectoId ?? "").trim() === proyectoId),
    [vehicles, proyectoId]
  );

  const dia = useMemo(
    () =>
      computeGastoConcienciaDia({
        fecha,
        segmentos,
        vehicles,
        proyectoId,
      }),
    [fecha, segmentos, vehicles, proyectoId]
  );

  const presencia = useMemo(
    () =>
      hydratePresenciaEpisodio({
        episodio: presenciaEpisodio,
        proyectoId,
        vehicles: delProyecto,
      }),
    [presenciaEpisodio, proyectoId, delProyecto]
  );
  const horasPresencia = horasDeEpisodio(presencia);
  const propios = useMemo(
    () => dia.registros.filter(r => r.pid === proyectoId),
    [dia.registros, proyectoId]
  );
  const bucketsCal = useMemo(() => groupRegistros(propios, horizon), [propios, horizon]);

  const total = Math.max(dia.minutosDia || MINUTOS_DIA_JORNADA, 1);
  const bar = [
    { id: "i", min: dia.minutosInconsciente, color: TRIADA_META.inconsciente.color, label: "Inconsciente" },
    { id: "p", min: dia.minutosPresencia, color: TRIADA_META.presencia.color, label: "Presencia" },
    { id: "d", min: dia.minutosDireccion, color: TRIADA_META.direccion.color, label: "Dirección" },
    { id: "n", min: dia.minutosNoConquistado, color: NO_CONQUISTADO_META.color, label: "No conquistado" },
  ];

  return (
    <div
      className="p-3 rounded-xl border space-y-3"
      style={{ backgroundColor: PIZARRA, borderColor: "rgba(212,175,55,0.22)" }}
      data-testid="hub-gasto-conciencia"
    >
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>
        En qué se gasta el tiempo
      </p>
      <p className="text-[8px] leading-relaxed" style={{ color: MUTED }}>
        La barra es del día-jornada (24 h). Abajo, solo los vehículos de este
        proyecto — presencia en enumeración infinita; dirección ordenada por el timón.
      </p>

      <div
        className="h-2.5 w-full rounded-full overflow-hidden flex"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        data-testid="hub-gasto-conciencia-bar"
      >
        {bar.map(b => {
          const w = pct(b.min, total);
          return w > 0 ? (
            <div key={b.id} style={{ width: `${w}%`, backgroundColor: b.color }} title={`${b.label} ${formatDuracionTimon(b.min)}`} />
          ) : null;
        })}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {bar.map(b => (
          <div key={b.id} className="text-center">
            <p className="text-[11px] font-black tabular-nums" style={{ color: b.color }}>
              {formatDuracionTimon(b.min)}
            </p>
            <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>
              {b.label}
            </p>
          </div>
        ))}
      </div>

      {presencia.minutosAcumulados > 0 ? (
        <div data-testid="hub-presencia-enumeracion">
          <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: TRIADA_META.presencia.color }}>
            Presencia · {formatHoraLabel(horasPresencia[horasPresencia.length - 1]?.numero ?? 1)} · enumeración infinita
          </p>
          <ul className="space-y-0.5">
            {horasPresencia.filter(h => h.vehiculos.length > 0).map(h => (
              <li key={h.numero} className="text-[9px] text-slate-400">
                <span className="font-bold" style={{ color: TRIADA_META.presencia.color }}>
                  {formatHoraLabel(h.numero)}
                </span>
                {" · "}
                {h.vehiculos.map(v => `${v.titulo} (${formatDuracionTimon(v.minutos)})`).join(" · ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex gap-1">
        {(["dia", "semana"] as const).map(h => (
          <button
            key={h}
            type="button"
            onClick={() => setHorizon(h)}
            className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
            style={{
              color: horizon === h ? GOLD : MUTED,
              border: `1px solid ${horizon === h ? `${GOLD}55` : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {h === "dia" ? "Día" : "Semana"}
          </button>
        ))}
      </div>

      {bucketsCal.length === 0 ? (
        <p className="text-[9px]" style={{ color: MUTED }}>
          Aún no hay registros de vehículos en este proyecto.
        </p>
      ) : (
        <ul className="space-y-1.5" data-testid="hub-gasto-conciencia-calendario">
          {bucketsCal.map(b => (
            <li
              key={b.start}
              className="rounded-lg px-2 py-1.5 border border-white/10"
            >
              <p className="text-[9px] font-bold" style={{ color: INK }}>
                {labelBucket(b.start, horizon)}
              </p>
              <p className="text-[8px]" style={{ color: MUTED }}>
                {formatDuracionTimon(b.direccion)} dirección · {formatDuracionTimon(b.presencia)} presencia · {b.n} vehículo{b.n === 1 ? "" : "s"}
              </p>
              {b.recientes.length > 0 ? (
                <p className="text-[8px] text-slate-500 truncate">{b.recientes.join(" · ")}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
