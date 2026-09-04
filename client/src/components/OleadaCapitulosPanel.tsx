/**
 * Capítulos de oleada: campañas cerradas que se consultan sin estorbar el escritorio.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import type { ProyectoPeldano } from "@/lib/proyectos";
import {
  formatCuandoProduccion,
  formatDuracionTimon,
  ledgerVehiculosTimon,
  type TimonEpisodio,
} from "@/lib/timonHoras";
import { sortOleadaPuntos, summarizeOleadaPuntos } from "@/lib/oleadaPuntos";
import { OleadaDesglosePanel } from "@/components/OleadaDesglosePanel";

type Props = {
  oleadas: ProyectoPeldano[];
  tint: string;
  onReabrir: (peldanoId: string) => Promise<void> | void;
};

function noop() {}

function minutosDelCapitulo(pel: ProyectoPeldano): number {
  const cerrados = pel.timonCerrados ?? [];
  const fromCerrados = cerrados.reduce((s, e) => s + (e.minutosAcumulados ?? 0), 0);
  if (fromCerrados > 0) return fromCerrados;
  return pel.timonEpisodio?.minutosAcumulados ?? 0;
}

function episodiosDelCapitulo(pel: ProyectoPeldano): TimonEpisodio[] {
  const cerrados = pel.timonCerrados ?? [];
  if (cerrados.length > 0) return cerrados;
  return pel.timonEpisodio ? [pel.timonEpisodio] : [];
}

export function OleadaCapitulosPanel({ oleadas, tint, onReabrir }: Props) {
  const [openId, setOpenId] = useState<string | null>(oleadas[0]?.id ?? null);

  if (oleadas.length === 0) {
    return (
      <p className="text-[10px] text-slate-600 text-center py-6 border border-dashed border-white/10 rounded-xl">
        Cuando cierres una oleada, queda aquí como capítulo. El escritorio se
        libera para la siguiente; el camino se puede consultar cuando quieras.
      </p>
    );
  }

  return (
    <div className="space-y-2" data-testid="hub-oleada-capitulos">
      {oleadas.map(pel => {
        const puntos = sortOleadaPuntos(pel.oleadaPuntos ?? []);
        const summary = summarizeOleadaPuntos(puntos);
        const minutos = minutosDelCapitulo(pel);
        const episodios = episodiosDelCapitulo(pel);
        const open = openId === pel.id;
        return (
          <div
            key={pel.id}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: `${tint}28`, backgroundColor: "rgba(0,0,0,0.35)" }}
            data-testid={`hub-oleada-capitulo-${pel.id}`}
          >
            <button
              type="button"
              className="w-full p-3 flex items-center justify-between text-left gap-2"
              onClick={() => setOpenId(open ? null : pel.id)}
            >
              <div className="min-w-0">
                <p className="text-[8px] text-slate-500 uppercase tracking-wider">
                  Cerrada {formatCuandoProduccion(pel.cerradoAt)}
                  {summary.total > 0 ? ` · ${summary.cumplido}/${summary.total} puntos` : ""}
                  {minutos > 0 ? ` · ${formatDuracionTimon(minutos)}` : ""}
                </p>
                <p className="text-sm font-bold text-white truncate">{pel.titulo}</p>
              </div>
              {open ? (
                <ChevronUp size={14} className="text-slate-500 shrink-0" />
              ) : (
                <ChevronDown size={14} className="text-slate-500 shrink-0" />
              )}
            </button>
            {open ? (
              <div className="border-t border-white/5 p-3 space-y-3">
                <OleadaDesglosePanel
                  puntos={puntos}
                  puntoProduccionId={pel.puntoProduccionId}
                  timonEpisodio={episodios[episodios.length - 1] ?? pel.timonEpisodio}
                  tint={tint}
                  modo="capitulo"
                  onAdd={noop}
                  onUpdateTitulo={noop}
                  onCycleStatus={noop}
                  onDelete={noop}
                  onReorder={noop}
                  onSetPuntoProduccion={noop}
                />
                {episodios.length > 1
                  ? episodios.slice(0, -1).map(ep => {
                      const ledger = ledgerVehiculosTimon(ep);
                      if (ledger.length === 0) return null;
                      return (
                        <div
                          key={ep.id}
                          className="px-2.5 py-2 rounded-lg border border-white/8 space-y-1"
                        >
                          <p className="text-[8px] uppercase tracking-widest text-slate-500">
                            {ep.puntoTitulo} · {formatCuandoProduccion(ep.startedAt)}
                          </p>
                          <ul className="space-y-0.5">
                            {ledger.map(v => (
                              <li
                                key={v.vehicleId}
                                className="flex items-baseline justify-between gap-2 text-[9px] text-slate-300"
                              >
                                <span className="min-w-0">
                                  <span className="truncate block">{v.titulo}</span>
                                  <span className="text-[8px] text-slate-500">
                                    {formatCuandoProduccion(v.closedAt)}
                                  </span>
                                </span>
                                <span className="tabular-nums shrink-0" style={{ color: tint }}>
                                  {formatDuracionTimon(v.minutos)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })
                  : null}
                <button
                  type="button"
                  onClick={() => void onReabrir(pel.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${tint}14`,
                    color: tint,
                    border: `1px solid ${tint}35`,
                  }}
                  data-testid={`hub-oleada-reabrir-${pel.id}`}
                >
                  <RotateCcw size={12} /> Reabrir oleada
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
