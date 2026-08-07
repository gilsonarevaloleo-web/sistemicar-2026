import { useMemo, useState } from "react";
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
 * Clasificador atractivo: Presencia (valor de estar) vs Peldaño (valor de avanzar).
 * Default visual = Presencia; Peldaño insiste al valor sin humillar lo demás.
 */
export function DestinoCierreToggle({
  value,
  proyectoId,
  onChange,
  compact = false,
}: Props) {
  const { user } = useAuthContext();
  const destino = resolveDestinoCierre(value);
  const [pickerOpen, setPickerOpen] = useState(false);

  const proyectos = useMemo(() => {
    if (!user) return [] as Proyecto[];
    return getProyectosLocal(user.uid);
  }, [user, destino, pickerOpen]);

  const selected = proyectos.find(p => p.id === proyectoId) ?? null;

  const pick = (next: DestinoCierre) => {
    if (next === "presencia") {
      setPickerOpen(false);
      onChange("presencia", proyectoId ?? undefined);
      return;
    }
    if (!proyectoId && proyectos.length > 0) {
      setPickerOpen(true);
      onChange("peldano", proyectos[0]!.id);
      return;
    }
    onChange("peldano", proyectoId ?? undefined);
    if (!proyectoId) setPickerOpen(true);
  };

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
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => pick("presencia")}
          className="rounded-xl px-2.5 py-2.5 text-left touch-manipulation transition-all"
          style={{
            backgroundColor:
              destino === "presencia" ? "rgba(0,255,195,0.12)" : "rgba(255,255,255,0.03)",
            border:
              destino === "presencia"
                ? `1px solid ${CYAN}70`
                : "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              destino === "presencia" ? `0 0 16px ${CYAN}22` : "none",
          }}
          data-testid="destino-presencia"
          aria-pressed={destino === "presencia"}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <Eye size={12} style={{ color: destino === "presencia" ? CYAN : MUTED }} />
            <span
              className="text-[10px] font-black uppercase tracking-wider"
              style={{ color: destino === "presencia" ? CYAN : MUTED }}
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
          className="rounded-xl px-2.5 py-2.5 text-left touch-manipulation transition-all"
          style={{
            backgroundColor:
              destino === "peldano" ? "rgba(212,175,55,0.16)" : "rgba(255,255,255,0.03)",
            border:
              destino === "peldano"
                ? `1px solid ${GOLD}`
                : "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              destino === "peldano"
                ? `0 0 22px rgba(212,175,55,0.28)`
                : "none",
          }}
          data-testid="destino-peldano"
          aria-pressed={destino === "peldano"}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <Footprints
              size={12}
              style={{ color: destino === "peldano" ? GOLD : MUTED }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-wider"
              style={{ color: destino === "peldano" ? GOLD : MUTED }}
            >
              {DESTINO_CIERRE_COPY.peldano.label}
            </span>
          </div>
          {!compact ? (
            <p className="text-[9px] leading-snug" style={{ color: MUTED }}>
              {DESTINO_CIERRE_COPY.peldano.hint}
            </p>
          ) : null}
        </button>
      </div>

      {destino === "peldano" ? (
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
            <p className="text-[9px]" style={{ color: MUTED }}>
              Elige un proyecto para subir la escalera.
              {proyectos.length === 0 ? " (crea uno en el Hub)" : ""}
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
                      onChange("peldano", p.id);
                      setPickerOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-md text-[10px] font-bold truncate"
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
