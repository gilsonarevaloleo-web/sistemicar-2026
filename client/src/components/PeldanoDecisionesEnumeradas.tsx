import type { ProyectoDecisionEnumerada } from "@/lib/proyectos";

const EMERALD = "#10b981";
const BLOOD = "#f87171";
const CYAN = "#00FFC3";
const SLATE = "#64748b";
const AMBER = "#F59E0B";

function statusColor(status: ProyectoDecisionEnumerada["status"]): string {
  if (status === "cumplido") return EMERALD;
  if (status === "fallado") return BLOOD;
  if (status === "avance") return AMBER;
  return SLATE;
}

type Props = {
  decisiones: ProyectoDecisionEnumerada[];
  compact?: boolean;
  titulo?: string;
};

/** Lista numerada de decisiones ejecutadas (Crisol → ring → proyecto). */
export function PeldanoDecisionesEnumeradas({
  decisiones,
  compact = false,
  titulo = "Decisiones ejecutadas",
}: Props) {
  if (decisiones.length === 0) return null;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <p
        className="text-[8px] font-bold uppercase tracking-widest"
        style={{ color: CYAN }}
      >
        {titulo} ({decisiones.length})
      </p>
      <ol className="space-y-1">
        {decisiones.map(d => (
          <li
            key={d.key}
            className="flex items-start gap-2 rounded-lg border border-white/5 px-2 py-1.5"
            style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
          >
            <span
              className="shrink-0 font-black tabular-nums"
              style={{ color: CYAN, fontSize: compact ? 9 : 10, minWidth: 18 }}
            >
              {d.n}.
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`font-semibold text-white leading-snug ${compact ? "text-[9px]" : "text-[10px]"}`}
              >
                {d.texto}
              </p>
              <p
                className="text-[7px] uppercase tracking-wider mt-0.5"
                style={{ color: statusColor(d.status) }}
              >
                {d.status}
                {d.pasoEjecutadoNumero != null && (
                  <span className="text-slate-500"> · paso #{d.pasoEjecutadoNumero}</span>
                )}
                {d.origenImanId && (
                  <span className="text-slate-500"> · Crisol</span>
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
