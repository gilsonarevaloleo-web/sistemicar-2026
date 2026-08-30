/**
 * Espejo de Operar — revelación GLOBAL del plan (no de un proyecto).
 * Antes del término: espera. Tras horaFin: sello congelado.
 * Sin tick 1s, sin recharts.
 */
import { TRIADA_META } from "@/lib/concienciaTriadaOperador";
import {
  formatMinutosHoras,
  type RevelacionPlanDia,
} from "@/jornada4/revelacionPlanDia";
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, MUTED, INK, GOLD } = J4_COLORS;
const POR_CONQUISTAR = "#94a3b8";

export type Jornada4RevelacionCardProps = {
  revelacion: RevelacionPlanDia | null;
  planEndLabel: string | null;
};

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.round((part / total) * 100));
}

export function Jornada4RevelacionCard({
  revelacion,
  planEndLabel,
}: Jornada4RevelacionCardProps) {
  if (!planEndLabel && !revelacion) return null;

  if (!revelacion) {
    return (
      <section
        className="mx-3 mb-3 sm:mx-4 rounded-xl border px-3 py-2.5"
        style={{
          backgroundColor: PIZARRA,
          borderColor: "rgba(212,175,55,0.22)",
        }}
        data-testid="jornada4-revelacion-espera"
      >
        <p
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: GOLD }}
        >
          Revelación del plan
        </p>
        <p className="text-[11px] mt-1 leading-snug" style={{ color: INK }}>
          Se sella a las {planEndLabel}. Ahí verás en horas el inconsciente, la
          presencia, la dirección y lo por conquistar — de todo el día, no de un
          proyecto.
        </p>
        <p className="text-[8px] mt-1.5 leading-relaxed" style={{ color: MUTED }}>
          La tríada viva (se mueve con el reloj) sigue en Métricas. Esto es el
          corte al término: el efecto darse cuenta.
        </p>
      </section>
    );
  }

  const total = Math.max(revelacion.minutosPlan, 1);
  const buckets = [
    {
      id: "inconsciente",
      label: "Inconsciente",
      min: revelacion.minutosInconsciente,
      color: TRIADA_META.inconsciente.color,
    },
    {
      id: "presencia",
      label: "Presencia",
      min: revelacion.minutosPresencia,
      color: TRIADA_META.presencia.color,
    },
    {
      id: "direccion",
      label: "Dirección",
      min: revelacion.minutosDireccion,
      color: TRIADA_META.direccion.color,
    },
    {
      id: "por_conquistar",
      label: "Por conquistar",
      min: revelacion.minutosPorConquistar,
      color: POR_CONQUISTAR,
    },
  ] as const;
  const widths = buckets.map(b => pct(b.min, total));

  return (
    <section
      className="mx-3 mb-3 sm:mx-4 rounded-xl border p-3 space-y-3"
      style={{
        backgroundColor: PIZARRA,
        borderColor: "rgba(212,175,55,0.35)",
        boxShadow: "0 0 16px rgba(212,175,55,0.08)",
      }}
      data-testid="jornada4-revelacion"
    >
      <div>
        <p
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: GOLD }}
        >
          Revelación del plan · {revelacion.planEndLabel}
        </p>
        <p
          className="text-[12px] font-semibold mt-1 leading-snug"
          style={{ color: INK }}
          data-testid="jornada4-revelacion-headline"
        >
          {revelacion.headline}
        </p>
      </div>

      <div
        className="h-2.5 w-full rounded-full overflow-hidden flex"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        data-testid="jornada4-revelacion-bar"
      >
        {buckets.map((b, i) =>
          widths[i] > 0 ? (
            <div
              key={b.id}
              style={{ width: `${widths[i]}%`, backgroundColor: b.color }}
              title={`${b.label} ${formatMinutosHoras(b.min)}`}
            />
          ) : null
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {buckets.map(b => (
          <div key={b.id} className="text-center" data-testid={`jornada4-revelacion-${b.id}`}>
            <p className="text-[12px] font-black tabular-nums leading-tight" style={{ color: b.color }}>
              {formatMinutosHoras(b.min)}
            </p>
            <p className="text-[7px] uppercase tracking-wider mt-0.5" style={{ color: MUTED }}>
              {b.label}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[8px] leading-relaxed" style={{ color: MUTED }}>
        100% = {formatMinutosHoras(revelacion.minutosPlan)} de línea de todos los
        proyectos. Lo no planificado no es deuda. El hueco ya ocurrido es
        inconsciente; lo que aún no ocurría era por conquistar — al término queda
        en cero.
      </p>
    </section>
  );
}
