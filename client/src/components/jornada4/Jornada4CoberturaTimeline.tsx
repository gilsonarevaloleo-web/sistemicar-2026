/**
 * Timeline vertical de cobertura — secuencia de la jornada.
 * Un riel, un nodo por segmento. Sin métricas de conciencia.
 */
import { useMemo } from "react";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import {
  buildCoberturaTimeline,
  COBERTURA_KIND_LABEL,
  type CoberturaTimelineKind,
} from "@/jornada4/coberturaTimeline";
import { J4_NEON, J4_UI } from "./jornada4Ui";

const KIND_COLOR: Record<CoberturaTimelineKind, string> = {
  activo: J4_NEON.emerald,
  cubierto: J4_NEON.violet,
  pendiente: "#737373",
  hueco: J4_NEON.mutedRed,
  cerrado: "#525252",
};

type Props = {
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
};

export function Jornada4CoberturaTimeline({ segmentos, vehicles }: Props) {
  const nodes = useMemo(
    () => buildCoberturaTimeline({ segmentos, vehicles }),
    [segmentos, vehicles]
  );

  if (nodes.length === 0) {
    return (
      <section
        className={`mx-3 mb-3 sm:mx-4 ${J4_UI.card}`}
        data-testid="jornada4-cobertura-timeline"
      >
        <p className={J4_UI.label}>Secuencia de la jornada</p>
        <p className={`${J4_UI.hint} mt-2`}>
          Añade segmentos para ver la cobertura en el tiempo.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`mx-3 mb-3 sm:mx-4 ${J4_UI.card}`}
      data-testid="jornada4-cobertura-timeline"
      aria-label="Timeline vertical de cobertura"
    >
      <p className={J4_UI.label}>Secuencia de la jornada</p>
      <ol className="mt-4 space-y-0">
        {nodes.map((node, idx) => {
          const color = KIND_COLOR[node.kind];
          const last = idx === nodes.length - 1;
          return (
            <li
              key={node.id}
              className="flex gap-3"
              data-testid={`jornada4-cobertura-node-${node.segmentoId}`}
              data-cobertura-kind={node.kind}
            >
              <div className="flex flex-col items-center w-4 shrink-0">
                <span
                  className="w-3 h-3 rounded-full border-2 mt-1 shrink-0"
                  style={{
                    borderColor: color,
                    backgroundColor:
                      node.kind === "activo" || node.kind === "hueco"
                        ? color
                        : "transparent",
                    boxShadow:
                      node.kind === "activo" ? `0 0 10px ${color}` : undefined,
                  }}
                />
                {!last ? (
                  <span
                    className="w-px flex-1 min-h-[1.75rem]"
                    style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                    aria-hidden
                  />
                ) : null}
              </div>
              <div className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-4"}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: J4_NEON.ink }}
                  >
                    {node.title}
                  </p>
                  <p className="font-mono text-[11px] tabular-nums shrink-0 text-neutral-400">
                    {node.timeLabel}
                  </p>
                </div>
                <p
                  className="text-[10px] uppercase tracking-wider mt-0.5"
                  style={{ color }}
                >
                  {COBERTURA_KIND_LABEL[node.kind]}
                  {node.detail ? ` · ${node.detail}` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
