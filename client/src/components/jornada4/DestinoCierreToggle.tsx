import { useEffect, useMemo, useState } from "react";
import { Eye, Footprints } from "lucide-react";
import { useAuthContext } from "@/App";
import {
  DESTINO_CIERRE_COPY,
  type DestinoCierre,
  resolveDestinoCierre,
} from "@/lib/destinoCierre";
import { getProyectosLocal, type Proyecto } from "@/lib/proyectos";

const GOLD = "#D4AF37";
const CYAN = "#00FFC3";
const MUTED = "#64748b";
const INK = "#f1f5f9";

type Props = {
  value?: DestinoCierre | null;
  proyectoId?: string | null;
  onChange: (destino: DestinoCierre, proyectoId?: string) => void;
  /** Compacto para cabecera de card; completo ante el sello. */
  compact?: boolean;
};

/**
 * Clasificador: Presencia (día) vs Peldaño (Hub).
 * Peldaño nunca se ve “apagado/disabled” — solo menos intenso cuando no está elegido.
 * Estado local optimista: el toque pinta al instante aunque el padre tarde un frame.
 */
export function DestinoCierreToggle({
  value,
  proyectoId,
  onChange,
  compact = false,
}: Props) {
  const { user } = useAuthContext();
  const propDestino = resolveDestinoCierre(value);
  const [optimistic, setOptimistic] = useState<DestinoCierre | null>(null);
  const destino = optimistic ?? propDestino;
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    // Padre confirmó (o revirtió): soltar optimismo.
    setOptimistic(null);
  }, [value]);

  const proyectos = useMemo(() => {
    if (!user) return [] as Proyecto[];
    return getProyectosLocal(user.uid);
  }, [user, destino, pickerOpen]);

  const selected = proyectos.find(p => p.id === proyectoId) ?? null;

  const pick = (next: DestinoCierre) => {
    setOptimistic(next);
    if (next === "presencia") {
      setPickerOpen(false);
      onChange("presencia", proyectoId ?? undefined);
      return;
    }
    // Peldaño siempre seleccionable — no está condicionado al sello final.
    if (!proyectoId && proyectos.length > 0) {
      setPickerOpen(true);
      onChange("peldano", proyectos[0]!.id);
      return;
    }
    onChange("peldano", proyectoId ?? undefined);
    if (!proyectoId) setPickerOpen(true);
  };

  const presenciaOn = destino === "presencia";
  const peldanoOn = destino === "peldano";

  return (
    <div
      className={compact ? "space-y-1.5" : "space-y-2"}
      data-testid="destino-cierre-toggle"
    >
      {!compact ? (
        <p
          className="text-[8px] font-black uppercase tracking-widest"
          style={{ color: MUTED }}
        >
          ¿Adónde cuenta este cierre?
        </p>
      ) : (
        <p className="text-[8px] font-bold" style={{ color: MUTED }}>
          Tocá para elegir destino · default Presencia
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => pick("presencia")}
          className="rounded-xl px-2.5 py-2.5 text-left touch-manipulation transition-transform active:scale-[0.98]"
          style={{
            backgroundColor: presenciaOn
              ? "rgba(0,255,195,0.14)"
              : "rgba(0,255,195,0.04)",
            border: presenciaOn
              ? `1.5px solid ${CYAN}`
              : `1px solid rgba(0,255,195,0.28)`,
            boxShadow: presenciaOn ? `0 0 16px ${CYAN}28` : "none",
          }}
          data-testid="destino-presencia"
          aria-pressed={presenciaOn}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <Eye size={12} style={{ color: presenciaOn ? CYAN : "rgba(0,255,195,0.7)" }} />
            <span
              className="text-[10px] font-black uppercase tracking-wider"
              style={{ color: presenciaOn ? CYAN : "rgba(0,255,195,0.75)" }}
            >
              {DESTINO_CIERRE_COPY.presencia.label}
            </span>
          </div>
          {!compact ? (
            <p className="text-[9px] leading-snug" style={{ color: MUTED }}>
              {DESTINO_CIERRE_COPY.presencia.hint}
            </p>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => pick("peldano")}
          className="rounded-xl px-2.5 py-2.5 text-left touch-manipulation transition-transform active:scale-[0.98]"
          style={{
            // Idle ya lleva oro: no debe leerse como disabled.
            backgroundColor: peldanoOn
              ? "rgba(212,175,55,0.2)"
              : "rgba(212,175,55,0.08)",
            border: peldanoOn
              ? `1.5px solid ${GOLD}`
              : `1px solid rgba(212,175,55,0.45)`,
            boxShadow: peldanoOn
              ? `0 0 22px rgba(212,175,55,0.35)`
              : `0 0 10px rgba(212,175,55,0.12)`,
          }}
          data-testid="destino-peldano"
          aria-pressed={peldanoOn}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <Footprints
              size={12}
              style={{ color: peldanoOn ? GOLD : "rgba(212,175,55,0.85)" }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-wider"
              style={{ color: peldanoOn ? GOLD : "rgba(212,175,55,0.9)" }}
            >
              {DESTINO_CIERRE_COPY.peldano.label}
            </span>
          </div>
          {!compact ? (
            <p className="text-[9px] leading-snug" style={{ color: MUTED }}>
              {DESTINO_CIERRE_COPY.peldano.hint}
            </p>
          ) : (
            <p className="text-[8px] leading-snug mt-0.5" style={{ color: "rgba(212,175,55,0.7)" }}>
              Sube la escalera
            </p>
          )}
        </button>
      </div>

      {peldanoOn ? (
        <div className="space-y-1.5">
          {selected ? (
            <p className="text-[9px] font-bold" style={{ color: GOLD }}>
              → {selected.titulo}
              <button
                type="button"
                className="ml-2 underline font-semibold"
                style={{ color: MUTED }}
                onClick={() => setPickerOpen(o => !o)}
                data-testid="destino-cambiar-proyecto"
              >
                {pickerOpen ? "cerrar" : "cambiar"}
              </button>
            </p>
          ) : (
            <p className="text-[9px]" style={{ color: GOLD }}>
              {proyectos.length === 0
                ? "Sin proyectos aún — créalo en el Hub para sellar como peldaño."
                : "Elige un proyecto para subir la escalera."}
            </p>
          )}
          {(pickerOpen || !proyectoId) && proyectos.length > 0 ? (
            <div
              className="max-h-28 overflow-y-auto rounded-lg border space-y-0.5 p-1"
              style={{ borderColor: `${GOLD}35`, backgroundColor: "rgba(0,0,0,0.35)" }}
              data-testid="destino-proyecto-picker"
            >
              {proyectos.map(p => {
                const active = p.id === proyectoId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setOptimistic("peldano");
                      onChange("peldano", p.id);
                      setPickerOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-md text-[10px] font-bold truncate touch-manipulation active:scale-[0.99]"
                    style={{
                      color: active ? GOLD : INK,
                      backgroundColor: active ? "rgba(212,175,55,0.12)" : "transparent",
                    }}
                    data-testid={`destino-proyecto-${p.id}`}
                  >
                    {p.titulo}
                    <span className="ml-1 font-semibold uppercase" style={{ color: MUTED }}>
                      {p.etiqueta}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
