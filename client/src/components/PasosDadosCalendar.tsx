/**
 * Calendario retrospectivo de pasos dados.
 * Muestra pasos YA EJECUTADOS agrupados por horizonte temporal.
 * NO es un planificador de futuro — es historial de ejecución.
 */
import { useState } from "react";
import { TrendingUp } from "lucide-react";
import type { ProyectoPasoEjecutado } from "@/lib/proyectos";
import {
  groupPasosDados,
  resumePasosDados,
  type CalendarHorizon,
} from "@/lib/pasosDadosCalendar";

const EMERALD = "#10b981";
const AMBER = "#F59E0B";
const BLOOD = "#f87171";
const MUTED = "#64748b";
const INK = "#f1f5f9";
const CYAN = "#00FFC3";
const PIZARRA = "#0a0a0a";

const HORIZONS: { key: CalendarHorizon; label: string }[] = [
  { key: "dia",    label: "Día" },
  { key: "semana", label: "Semana" },
  { key: "mes",    label: "Mes" },
  { key: "anio",   label: "Año" },
];

type Props = {
  pasos: ProyectoPasoEjecutado[];
};

export function PasosDadosCalendar({ pasos }: Props) {
  const [horizon, setHorizon] = useState<CalendarHorizon>("semana");

  if (pasos.length === 0) {
    return (
      <div
        className="p-4 rounded-xl border border-dashed text-center space-y-1"
        style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: PIZARRA }}
      >
        <TrendingUp size={20} className="mx-auto mb-2" style={{ color: MUTED }} />
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>
          Aún no hay pasos dados
        </p>
        <p className="text-[9px]" style={{ color: MUTED }}>
          Cada vez que cierras una fila en el ring o lista libre, aparece aquí.
        </p>
      </div>
    );
  }

  const buckets = groupPasosDados(pasos, horizon);
  const resumen = resumePasosDados(pasos);

  return (
    <div className="space-y-3">
      {/* Resumen total */}
      <div className="flex gap-3 flex-wrap">
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: EMERALD }}>
          ✓ {resumen.cumplido} cumplido{resumen.cumplido !== 1 ? "s" : ""}
        </span>
        {resumen.avance > 0 && (
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: AMBER }}>
            ↗ {resumen.avance} avance{resumen.avance !== 1 ? "s" : ""}
          </span>
        )}
        {resumen.fallado > 0 && (
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: BLOOD }}>
            ✗ {resumen.fallado} fallado{resumen.fallado !== 1 ? "s" : ""}
          </span>
        )}
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
          · {resumen.total} total
        </span>
      </div>

      {/* Toggle horizonte */}
      <div className="flex gap-1">
        {HORIZONS.map(h => (
          <button
            key={h.key}
            type="button"
            onClick={() => setHorizon(h.key)}
            className="flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
            style={
              horizon === h.key
                ? { backgroundColor: `${CYAN}22`, color: CYAN, border: `1px solid ${CYAN}45` }
                : { backgroundColor: "rgba(255,255,255,0.04)", color: MUTED, border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            {h.label}
          </button>
        ))}
      </div>

      {/* Buckets */}
      {buckets.length === 0 ? (
        <p className="text-[10px] text-center py-4" style={{ color: MUTED }}>
          Sin pasos en este horizonte
        </p>
      ) : (
        <div className="space-y-2">
          {buckets.map(bucket => (
            <div
              key={bucket.startMs}
              className="p-3 rounded-xl border"
              style={{ backgroundColor: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[10px] font-bold" style={{ color: INK }}>
                  {bucket.label}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {bucket.cumplido > 0 && (
                    <span className="text-[8px] font-bold" style={{ color: EMERALD }}>
                      ✓{bucket.cumplido}
                    </span>
                  )}
                  {bucket.avance > 0 && (
                    <span className="text-[8px] font-bold" style={{ color: AMBER }}>
                      ↗{bucket.avance}
                    </span>
                  )}
                  {bucket.fallado > 0 && (
                    <span className="text-[8px] font-bold" style={{ color: BLOOD }}>
                      ✗{bucket.fallado}
                    </span>
                  )}
                  <span
                    className="text-[7px] font-black px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", color: MUTED }}
                  >
                    {bucket.total}
                  </span>
                </div>
              </div>
              {bucket.recientes.length > 0 && (
                <ul className="space-y-0.5">
                  {bucket.recientes.map((texto, i) => (
                    <li key={i} className="text-[9px] truncate" style={{ color: MUTED }}>
                      · {texto}
                    </li>
                  ))}
                  {bucket.total > bucket.recientes.length && (
                    <li className="text-[8px]" style={{ color: MUTED }}>
                      … y {bucket.total - bucket.recientes.length} más
                    </li>
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
