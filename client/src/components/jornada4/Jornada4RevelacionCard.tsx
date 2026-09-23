/**
 * Banner superior colapsable — revelación GLOBAL del día-jornada.
 * Una línea por defecto. El detalle vive expandido.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { NO_CONQUISTADO_META, TRIADA_META } from "@/lib/concienciaTriadaOperador";
import { MINUTOS_DIA_JORNADA } from "@/lib/gastoConcienciaEngine";
import {
  formatMinutosHoras,
  type RevelacionPlanDia,
} from "@/jornada4/revelacionPlanDia";
import { J4_TRIADA_NEON, J4_UI } from "./jornada4Ui";

export type Jornada4RevelacionCardProps = {
  revelacion: RevelacionPlanDia | null;
  planEndLabel: string | null;
};

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.round((part / total) * 100));
}

const BUCKET_NEON = {
  inconsciente: J4_TRIADA_NEON.inconsciente,
  presencia: J4_TRIADA_NEON.presencia,
  direccion: J4_TRIADA_NEON.direccion,
  por_conquistar: J4_TRIADA_NEON.noConquistado,
} as const;

export function Jornada4RevelacionCard({
  revelacion,
  planEndLabel,
}: Jornada4RevelacionCardProps) {
  const [open, setOpen] = useState(false);

  if (!planEndLabel && !revelacion) return null;

  const line = revelacion
    ? revelacion.headline
    : `Se sella a las ${planEndLabel}`;

  return (
    <section
      className={`mx-3 mb-3 sm:mx-4 ${J4_UI.cardCompact}`}
      data-testid={revelacion ? "jornada4-revelacion" : "jornada4-revelacion-espera"}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left touch-manipulation"
        aria-expanded={open}
        data-testid="jornada4-revelacion-toggle"
      >
        <div className="min-w-0 flex-1">
          <p className={J4_UI.label}>
            Revelación del día
            {revelacion?.planEndLabel ? ` · ${revelacion.planEndLabel}` : ""}
          </p>
          <p
            className="text-xs text-neutral-300 truncate mt-0.5"
            data-testid="jornada4-revelacion-headline"
          >
            {line}
          </p>
        </div>
        {open ? (
          <ChevronUp size={14} className="shrink-0 text-neutral-500" />
        ) : (
          <ChevronDown size={14} className="shrink-0 text-neutral-500" />
        )}
      </button>

      {open && !revelacion ? (
        <p className={`${J4_UI.hint} px-4 pb-3`}>
          Ahí verás en horas el inconsciente, la presencia, la dirección y lo no
          conquistado. Si planificas 24 h, la conquista es el 100% del día.
        </p>
      ) : null}

      {open && revelacion ? (
        <RevelacionDetalle revelacion={revelacion} />
      ) : null}
    </section>
  );
}

function RevelacionDetalle({ revelacion }: { revelacion: RevelacionPlanDia }) {
  const total = Math.max(revelacion.minutosDia || MINUTOS_DIA_JORNADA, 1);
  const buckets = [
    {
      id: "inconsciente",
      label: TRIADA_META.inconsciente.label,
      min: revelacion.minutosInconsciente,
      color: BUCKET_NEON.inconsciente,
    },
    {
      id: "presencia",
      label: TRIADA_META.presencia.label,
      min: revelacion.minutosPresencia,
      color: BUCKET_NEON.presencia,
    },
    {
      id: "direccion",
      label: TRIADA_META.direccion.label,
      min: revelacion.minutosDireccion,
      color: BUCKET_NEON.direccion,
    },
    {
      id: "por_conquistar",
      label: NO_CONQUISTADO_META.label,
      min: revelacion.minutosPorConquistar,
      color: BUCKET_NEON.por_conquistar,
    },
  ] as const;
  const widths = buckets.map(b => pct(b.min, total));

  return (
    <div className="px-4 pb-4 space-y-3 border-t border-white/10">
      <div
        className="h-2 w-full rounded-full overflow-hidden flex mt-3"
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
            <p className="font-mono text-sm font-bold tabular-nums" style={{ color: b.color }}>
              {formatMinutosHoras(b.min)}
            </p>
            <p className="text-[9px] uppercase tracking-wider mt-0.5 text-neutral-500">
              {b.label}
            </p>
          </div>
        ))}
      </div>

      <p className={J4_UI.hint}>
        100% = 24 h. Plan = {formatMinutosHoras(revelacion.minutosPlan)}.
        Inconsciente = sin vehículo. Presencia = voluntad sin rumbo. Dirección =
        proyecto o centro. No conquistado = lo no planificado
        {revelacion.minutosPorConquistar > 0
          ? ` (${formatMinutosHoras(revelacion.minutosPorConquistar)})`
          : " — si cubres las 24 h, queda en cero"}
        .
      </p>
    </div>
  );
}
