/**
 * Secuencia vertical de la jornada — mismo riel, colores de puerta.
 * Rojo / dorado / verde + costado (puerta y cobertura).
 */
import { useMemo } from "react";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import { getSegmentCalendarDayStartMs } from "@/lib/segmentTime";
import { PUERTA_TIMELINE_COLORS } from "@/jornada4/puertaTimelineVisual";
import { buildSecuenciaJornadaNodes } from "@/jornada4/secuenciaJornada";
import { J4_NEON, J4_UI } from "./jornada4Ui";

const { BLOOD, GOLD, EMERALD, MUTED } = PUERTA_TIMELINE_COLORS;

type Props = {
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
};

export function Jornada4CoberturaTimeline({ segmentos, vehicles }: Props) {
  const tick = useJornada4Tick(segmentos.length > 0);
  const nowMs = useMemo(() => {
    void tick;
    return Date.now();
  }, [tick]);
  const dayStartMs = useMemo(() => getSegmentCalendarDayStartMs(nowMs), [nowMs]);
  const nodes = useMemo(
    () =>
      buildSecuenciaJornadaNodes({
        segmentos,
        vehicles,
        nowMs,
        dayStartMs,
      }),
    [segmentos, vehicles, nowMs, dayStartMs]
  );

  if (nodes.length === 0) {
    return (
      <section
        className={`mx-3 mb-3 sm:mx-4 ${J4_UI.card}`}
        data-testid="jornada4-cobertura-timeline"
      >
        <p className={J4_UI.label}>Secuencia de la jornada</p>
        <p className={`${J4_UI.hint} mt-2`}>
          Añade segmentos para ver las puertas del día.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`mx-3 mb-3 sm:mx-4 ${J4_UI.card}`}
      data-testid="jornada4-cobertura-timeline"
      aria-label="Secuencia de la jornada"
    >
      <style>{`
        @keyframes j4-secuencia-foco-pulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(212,175,55,0.35), 0 0 8px rgba(212,175,55,0.18); }
          50% { box-shadow: 0 0 0 3px rgba(212,175,55,0.55), 0 0 16px rgba(212,175,55,0.36); }
        }
      `}</style>
      <p className={J4_UI.label}>Secuencia de la jornada</p>
      <p className="text-[8px] mt-1 mb-3 leading-snug" style={{ color: MUTED }}>
        <span style={{ color: BLOOD }}>●</span> fracaso{" "}
        <span style={{ color: GOLD }}>●</span> foco{" "}
        <span style={{ color: EMERALD }}>●</span> logro
      </p>
      <ol className="space-y-0">
        {nodes.map((node, idx) => {
          const color = node.puerta.labelColor;
          const last = idx === nodes.length - 1;
          const filled = node.puertaKind !== "pendiente";
          return (
            <li
              key={node.id}
              className="flex gap-3"
              data-testid={`jornada4-cobertura-node-${node.segmentoId}`}
              data-cobertura-kind={node.kind}
              data-puerta-kind={node.puertaKind}
            >
              <div className="flex flex-col items-center w-4 shrink-0">
                <span
                  className="w-3 h-3 rounded-full border-2 mt-1 shrink-0"
                  style={{
                    borderColor: node.puerta.borderColor,
                    backgroundColor: filled
                      ? node.puertaKind === "foco"
                        ? GOLD
                        : node.puerta.backgroundColor
                      : "transparent",
                    animation: node.puerta.pulse
                      ? "j4-secuencia-foco-pulse 1.8s ease-in-out infinite"
                      : undefined,
                    boxShadow:
                      node.puertaKind === "foco"
                        ? `0 0 10px ${GOLD}`
                        : node.puertaKind === "fracaso"
                          ? `0 0 8px ${BLOOD}66`
                          : node.puertaKind === "logro"
                            ? `0 0 8px ${EMERALD}66`
                            : undefined,
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
                  data-testid={`jornada4-secuencia-status-${node.segmentoId}`}
                >
                  {node.statusLabel}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
