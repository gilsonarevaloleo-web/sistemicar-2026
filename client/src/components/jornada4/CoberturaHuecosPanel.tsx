import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Clock3 } from "lucide-react";
import {
  buildMetricaHuecoIntervals,
  formatCoberturaHuecosSummary,
  formatHuecoClock,
  formatHuecoDuration,
  sumCoberturaHuecosMinutes,
  type CoberturaHuecoInterval,
} from "@/jornada4/coberturaHuecosLog";
import type { Vehicle } from "@/lib/persistence";
import { J4_COLORS } from "./Jornada4Shell";

const { INK, MUTED, GOLD } = J4_COLORS;
const BLOOD = "#FF2A2A";
const EMERALD = "#50C878";

type Props = {
  /** Bump para releer localStorage tras launch/cierre. */
  refreshKey?: number;
  /** Flota del día: las pausas no justificadas entran como hueco. */
  vehicles?: Vehicle[];
};

function intervalLabel(it: CoberturaHuecoInterval, now: number): string {
  const start = formatHuecoClock(it.startMs);
  if (it.open) {
    return `${start}–ahora · ${formatHuecoDuration(it.startMs, now)} sin vehículo`;
  }
  const end = formatHuecoClock(it.endMs!);
  const dur = formatHuecoDuration(it.startMs, it.endMs!);
  return `${start}–${end} · ${dur} sin vehículo`;
}

/**
 * Revisión del día: cuándo se perdió cobertura.
 * Lista estática — sin tick, sin SVG, sin anillo.
 */
export function CoberturaHuecosPanel({ refreshKey = 0, vehicles = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [intervals, setIntervals] = useState<CoberturaHuecoInterval[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const reload = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setIntervals(buildMetricaHuecoIntervals({ vehicles, now: t }));
  }, [vehicles]);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  const openCount = intervals.filter(i => i.open).length;
  const summary = formatCoberturaHuecosSummary(intervals, now);
  const totalMin = sumCoberturaHuecosMinutes(intervals, now);
  const totalLabel =
    totalMin > 0 ? formatHuecoDuration(0, totalMin * 60_000) : null;

  return (
    <section className="px-4 pb-3" data-testid="jornada4-huecos">
      <div className="rounded-xl border border-white/10 bg-neutral-900/60 backdrop-blur-md overflow-hidden">
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
                Revisión · huecos de cobertura
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
                Aquí verás cortes entre bloques: ratos sin vehículo consciente.
                No es impuntualidad de puerta — eso vive en Puertas del día.
              </p>
            ) : (
              <>
                <p className="pt-2 text-[9px] leading-snug" style={{ color: MUTED }}>
                  Hueco = Inconsciente: plan ya ocurrido sin vehículo. Una pausa
                  sin otro hilo que la cubra cuenta igual. La tardanza de puerta no entra.
                </p>
                {totalLabel ? (
                  <p
                    className="text-[11px] font-black uppercase tracking-wider"
                    style={{ color: INK }}
                    data-testid="jornada4-huecos-total"
                  >
                    Total · {totalLabel} inconsciente
                  </p>
                ) : null}
                {intervals
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
                      ) : it.reason === "pausa_no_justificada" ? (
                        <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>
                          {it.open
                            ? "Pausa no justificada · sin cobertura ahora"
                            : "Pausa no justificada"}
                        </p>
                      ) : it.open ? (
                        <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>
                          Sin cobertura ahora
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
