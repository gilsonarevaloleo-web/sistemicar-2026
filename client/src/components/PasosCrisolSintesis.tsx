import { useState } from "react";
import type { ProyectoPasoEjecutado } from "@/lib/proyectos";
import { sintetizarPasosCrisol } from "@/lib/sintetizarPasosCrisol";
import { formatCuandoProduccion } from "@/lib/timonHoras";

const EMERALD = "#10b981";
const BLOOD = "#f87171";
const AMBER = "#F59E0B";
const CYAN = "#00FFC3";

function statusColor(status: ProyectoPasoEjecutado["status"]): string {
  if (status === "cumplido") return EMERALD;
  if (status === "fallado") return BLOOD;
  return AMBER;
}

const VISIBLE_INICIAL = 8;

type Props = {
  pasos: ProyectoPasoEjecutado[];
};

/**
 * Vista sintetizada del log del Crisol: familias, no enumeración infinita.
 */
export function PasosCrisolSintesis({ pasos }: Props) {
  const [visible, setVisible] = useState(VISIBLE_INICIAL);
  const sintesis = sintetizarPasosCrisol(pasos);
  if (sintesis.unicos === 0) return null;

  const familias = sintesis.familias.slice(0, visible);

  return (
    <div className="space-y-2" data-testid="hub-pasos-crisol">
      <p className="text-[8px] text-slate-500 leading-relaxed">
        {sintesis.unicos} camino{sintesis.unicos !== 1 ? "s" : ""}
        {sintesis.repetidos > 0
          ? ` · ${sintesis.total} ejecuciones sintetizadas`
          : ` · ${sintesis.total} paso${sintesis.total !== 1 ? "s" : ""}`}
        . Lo que se repite es masa, no una lista nueva.
      </p>
      <ol className="space-y-1">
        {familias.map(f => (
          <li
            key={f.key}
            className="flex items-baseline justify-between gap-2 rounded-lg border border-white/5 px-2 py-1.5"
            style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
            data-testid={`hub-pasos-crisol-familia-${f.key}`}
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-white leading-snug truncate">
                {f.texto}
              </span>
              <span
                className="text-[7px] uppercase tracking-wider"
                style={{ color: statusColor(f.lastStatus) }}
              >
                {f.lastStatus}
                {f.lastTs ? (
                  <span className="text-slate-600"> · {formatCuandoProduccion(f.lastTs)}</span>
                ) : null}
              </span>
            </span>
            <span
              className="tabular-nums shrink-0 text-[11px] font-black"
              style={{ color: f.count > 1 ? CYAN : "#64748b" }}
            >
              ×{f.count}
            </span>
          </li>
        ))}
      </ol>
      {sintesis.unicos > visible ? (
        <button
          type="button"
          onClick={() => setVisible(n => n + 12)}
          className="w-full py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider text-slate-500"
          data-testid="hub-pasos-crisol-mas"
        >
          Mostrar más ({sintesis.unicos - visible})
        </button>
      ) : null}
    </div>
  );
}
