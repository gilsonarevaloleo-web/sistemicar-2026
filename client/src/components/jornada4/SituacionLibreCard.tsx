import { useState } from "react";
import { Check, Plus, TrendingUp, X as XIcon } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import { FLOTA_CONFIG, PLATA } from "@/components/flota/vehicleCardShared";
import type { DestinoCierre } from "@/lib/destinoCierre";
import { DestinoCierreToggle } from "./DestinoCierreToggle";

const OK = "#00C851";
const BAD = "#FF2A2A";
const MUTED = "#64748b";
const INK = "#f1f5f9";
const AMBER = "#F59E0B";
const flotaColor = FLOTA_CONFIG.situacion.color;

type Props = {
  vehicle: Vehicle;
  onCumplido: (subTareaId: string) => void;
  onAvance: (subTareaId: string) => void;
  onFallado: (subTareaId: string) => void;
  onCerrar: () => void;
  onDestinoChange?: (destino: DestinoCierre, proyectoId?: string) => void;
  onAddFila: (texto: string) => void;
};

/**
 * Lista libre de Enfoque — primera lista.
 * Filas directas, sin meta, sin cupos, sin presión de tiempo.
 */
export function SituacionLibreCard({
  vehicle,
  onCumplido,
  onAvance,
  onFallado,
  onCerrar,
  onDestinoChange,
  onAddFila,
}: Props) {
  const [draft, setDraft] = useState("");
  const rows = vehicle.subTareas ?? [];
  const pending = rows.filter(
    r => (r.resultadoSituacion ?? (r.completada ? "cumplido" : "pendiente")) === "pendiente"
  );
  const done = rows.length - pending.length;
  const allDone = rows.length > 0 && pending.length === 0;

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onAddFila(t);
    setDraft("");
  };

  return (
    <article
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#0a0a0a", borderColor: `${flotaColor}35` }}
      data-testid={`jornada4-situacion-libre-${vehicle.id}`}
    >
      <div className="p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PLATA }} />
              <p className="text-sm font-bold truncate" style={{ color: INK }}>
                {vehicle.titulo}
              </p>
              <span
                className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: `${flotaColor}20`, color: flotaColor }}
              >
                {FLOTA_CONFIG.situacion.label}
              </span>
              <span
                className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: MUTED }}
              >
                Lista libre
              </span>
            </div>
            <p className="text-[10px] mt-1" style={{ color: MUTED }}>
              Sin ring · sin meta · {done}/{rows.length} hechas
            </p>
          </div>
        </div>

        <div className="space-y-1.5" data-testid="j4-situacion-libre-rows">
          {rows.map((row, idx) => {
            const resultado =
              row.resultadoSituacion ?? (row.completada ? "cumplido" : "pendiente");
            const isDone = resultado === "cumplido";
            const isFail = resultado === "fallado";
            const isAvance = resultado === "avance";
            const isPending = resultado === "pendiente";
            return (
              <div
                key={row.id}
                className="px-2.5 py-2 rounded-lg border space-y-2"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                    style={{
                      backgroundColor: isDone
                        ? `${OK}25`
                        : isFail
                          ? `${BAD}25`
                          : isAvance
                            ? `${AMBER}25`
                            : `${flotaColor}20`,
                      color: isDone ? OK : isFail ? BAD : isAvance ? AMBER : flotaColor,
                    }}
                  >
                    {isDone ? <Check size={10} /> : isFail ? <XIcon size={10} /> : isAvance ? <TrendingUp size={9} /> : idx + 1}
                  </span>
                  <p
                    className="text-xs font-semibold flex-1 truncate"
                    style={{ color: isPending ? INK : MUTED }}
                  >
                    {row.texto || `Fila ${idx + 1}`}
                  </p>
                </div>
                {isPending ? (
                  <div className="flex gap-1.5 pl-7">
                    <button
                      type="button"
                      className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase"
                      style={{ backgroundColor: `${OK}18`, color: OK, border: `1px solid ${OK}40` }}
                      onClick={() => onCumplido(row.id)}
                      data-testid={`j4-libre-cumplido-${row.id}`}
                    >
                      Cumplido
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-0.5"
                      style={{ backgroundColor: `${AMBER}15`, color: AMBER, border: `1px solid ${AMBER}45` }}
                      onClick={() => onAvance(row.id)}
                      data-testid={`j4-libre-avance-${row.id}`}
                    >
                      <TrendingUp size={9} />
                      Avance
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase"
                      style={{ color: BAD, border: `1px solid ${BAD}40` }}
                      onClick={() => onFallado(row.id)}
                      data-testid={`j4-libre-fallado-${row.id}`}
                    >
                      Fallado
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Añadir tarea…"
            className="flex-1 p-2.5 rounded-xl bg-black/40 border text-sm focus:outline-none"
            style={{ color: INK, borderColor: "rgba(255,255,255,0.12)" }}
            data-testid="j4-libre-add-input"
          />
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={add}
            className="px-3 rounded-xl disabled:opacity-40"
            style={{
              backgroundColor: `${flotaColor}18`,
              color: flotaColor,
              border: `1px solid ${flotaColor}40`,
            }}
            data-testid="j4-libre-add-btn"
          >
            <Plus size={14} />
          </button>
        </div>

        {allDone || rows.length > 0 ? (
          <div className="space-y-2">
            {onDestinoChange ? (
              <DestinoCierreToggle
                value={vehicle.destinoCierre}
                proyectoId={vehicle.proyectoId}
                onChange={onDestinoChange}
              />
            ) : null}
            <button
              type="button"
              onClick={onCerrar}
              className="w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider"
              style={{
                color: allDone ? OK : MUTED,
                border: `1px solid ${allDone ? `${OK}40` : "rgba(255,255,255,0.1)"}`,
                backgroundColor: allDone ? `${OK}12` : "transparent",
              }}
              data-testid="j4-libre-cerrar"
            >
              {allDone ? "Cerrar lista" : "Cerrar lista (con pendientes)"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
