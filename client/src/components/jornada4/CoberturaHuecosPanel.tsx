import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Clock3 } from "lucide-react";
import {
  buildCoberturaHuecoIntervals,
  formatHuecoClock,
  formatHuecoDuration,
  readCoberturaHuecosEvents,
  type CoberturaHuecoInterval,
} from "@/jornada4/coberturaHuecosLog";
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, INK, MUTED, GOLD } = J4_COLORS;
const BLOOD = "#FF2A2A";
const EMERALD = "#50C878";

type Props = {
  /** Bump para releer localStorage tras launch/cierre. */
  refreshKey?: number;
};

function intervalLabel(it: CoberturaHuecoInterval, now: number): string {
  const start = formatHuecoClock(it.startMs);
  if (it.open) {
    return `${start}–ahora · ${formatHuecoDuration(it.startMs, now)} sin vehículo`;
  }
  const end = formatHuecoClock(it.endMs!);
  const dur = formatHuecoDuration(it.startMs, it.endMs!);
  return `${start}–${end} · ${dur}`;
}

/**
 * Revisión del día: cuándo se perdió cobertura.
 * Lista estática — sin tick, sin SVG, sin anillo.
 */
export function CoberturaHuecosPanel({ refreshKey = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [intervals, setIntervals] = useState<CoberturaHuecoInterval[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const reload = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setIntervals(buildCoberturaHuecoIntervals(readCoberturaHuecosEvents(), t));
  }, []);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  const openCount = intervals.filter(i => i.open).length;
  const closedCount = intervals.length - openCount;
  const summary =
    intervals.length === 0
      ? "Sin huecos registrados hoy"
      : openCount > 0
        ? `${intervals.length} hueco${intervals.length === 1 ? "" : "s"} · 1 abierto`
        : `${closedCount} hueco${closedCount === 1 ? "" : "s"} cerrado${closedCount === 1 ? "" : "s"}`;

  return (
    <section className="px-4 pb-3" data-testid="jornada4-huecos">
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: PIZARRA,
          borderColor: openCount > 0 ? `${BLOOD}35` : "rgba(255,255,255,0.08)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) reload();
          }}
          className="w-full p-3 flex items-center justify-between gap-2 touch-manipulation"
          data-testid="jornada4-huecos-toggle"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Clock3 size={13} style={{ color: openCount > 0 ? BLOOD : GOLD }} />
            <div className="text-left min-w-0">
              <p
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: openCount > 0 ? BLOOD : GOLD }}
              >
                Revisión · huecos del día
              </p>
              <p className="text-[10px] truncate" style={{ color: MUTED }}>
                {summary}
              </p>
            </div>
          </div>
          {open ? (
            <ChevronUp size={14} style={{ color: MUTED }} />
          ) : (
            <ChevronDown size={14} style={{ color: MUTED }} />
          )}
        </button>

        {open ? (
          <div
            className="px-3 pb-3 space-y-2 border-t"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
            data-testid="jornada4-huecos-list"
          >
            {intervals.length === 0 ? (
              <p className="pt-2 text-[10px] leading-snug" style={{ color: MUTED }}>
                Aquí verás en qué momento del día no hubo vehículo consciente.
                Se registra al lanzar o cerrar — sin mapa del anillo.
              </p>
            ) : (
              intervals
                .slice()
                .reverse()
                .map((it, idx) => (
                  <div
                    key={`${it.startMs}-${idx}`}
                    className="pt-2 flex items-start gap-2"
                    data-testid={`jornada4-hueco-${idx}`}
                  >
                    <span
                      className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: it.open ? BLOOD : EMERALD }}
                    />
                    <div className="min-w-0">
                      <p
                        className="text-[11px] font-mono font-bold"
                        style={{ color: it.open ? BLOOD : INK }}
                      >
                        {intervalLabel(it, now)}
                      </p>
                      {it.closedByTitulo ? (
                        <p className="text-[9px] mt-0.5 truncate" style={{ color: MUTED }}>
                          Cubierto por · {it.closedByTitulo}
                        </p>
                      ) : it.open ? (
                        <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>
                          Sin cobertura ahora
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
