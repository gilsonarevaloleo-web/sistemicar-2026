import { cn } from "@/lib/utils";
import type { NidoPulso } from "@/lib/nidoPulso";

type Props = {
  pulso: NidoPulso;
  tint: string;
  compact?: boolean;
  testId?: string;
};

export function ProyectoPulso({ pulso, tint, compact = false, testId }: Props) {
  const ultimaColor = pulso.enCurso
    ? tint
    : pulso.stale
      ? "#F97316"
      : pulso.ultimaProduccionAt
        ? "#94a3b8"
        : "#64748b";

  if (compact) {
    return (
      <p
        className="text-[8px] font-bold uppercase tracking-wider truncate"
        style={{ color: pulso.stale ? "#F97316" : tint }}
        data-testid={testId ?? "hub-pulso-compact"}
        title={pulso.copy}
      >
        {pulso.copyCompact}
      </p>
    );
  }

  return (
    <div
      className="rounded-xl border px-3 py-2"
      style={{ backgroundColor: "#0a0a0a", borderColor: `${tint}35` }}
      data-testid={testId ?? "hub-pulso"}
    >
      <p
        className="text-[8px] font-bold uppercase tracking-widest mb-1.5"
        style={{ color: tint }}
      >
        Pulso
      </p>
      <div className="grid grid-cols-3 gap-2">
        <PulsoCell label="Desde el inicio" value={pulso.copyDias} color={tint} />
        <PulsoCell label="Enfoque puro" value={pulso.copyEnfoque} color={tint} />
        <PulsoCell
          label="Última producción"
          value={pulso.copyUltima}
          color={ultimaColor}
        />
      </div>
    </div>
  );
}

function PulsoCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[7px] font-bold uppercase tracking-wider text-slate-600 truncate">
        {label}
      </p>
      <p className={cn("text-[11px] font-black leading-tight truncate")} style={{ color }}>
        {value}
      </p>
    </div>
  );
}
