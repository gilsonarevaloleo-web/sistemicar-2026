import { useEffect, useState } from "react";
import { Compass, Eye } from "lucide-react";
import { useAuthContext } from "@/App";
import {
  DESTINO_CIERRE_COPY,
  type DestinoCierre,
  resolveDestinoCierre,
} from "@/lib/destinoCierre";
import {
  DIRECCION_SIN_PROYECTO,
  noPuedesLlegarADireccion,
  resolveClaimDestinoCierre,
  rumboChipLabel,
} from "@/lib/direccionElegibilidad";
import { useDireccionGates } from "@/hooks/useDireccionGates";

const GOLD = "#D4AF37";
const CYAN = "#00FFC3";
const MUTED = "#64748b";

type Props = {
  value?: DestinoCierre | null;
  proyectoId?: string | null;
  onChange: (destino: DestinoCierre, proyectoId?: string) => void;
  compact?: boolean;
  /**
   * Hueco forzado (lista libre, etc.): Dirección se ve, no se reclama.
   * Empieza por «todavía…»
   */
  blockedPorqueTodavia?: string | null;
};

/**
 * Presencia vs Dirección.
 * Presencia: un toque, siempre abierta.
 * Dirección: no es un gemelo clickeable. Si no hay oleada+punto, el toque
 * enseña el hueco — no pinta oro.
 */
export function DestinoCierreToggle({
  value,
  proyectoId,
  onChange,
  compact = false,
  blockedPorqueTodavia = null,
}: Props) {
  const { user } = useAuthContext();
  const propDestino = blockedPorqueTodavia
    ? "presencia"
    : resolveDestinoCierre(value);
  const [optimistic, setOptimistic] = useState<DestinoCierre | null>(null);
  const [gapOpen, setGapOpen] = useState(false);
  const { gates, abiertas } = useDireccionGates(user?.uid);

  useEffect(() => {
    setOptimistic(null);
  }, [value]);

  const currentGate = proyectoId
    ? gates.find(g => g.proyectoId === proyectoId)
    : undefined;
  const selectedGate =
    (currentGate?.ok ? currentGate : undefined) ??
    abiertas[0] ??
    currentGate ??
    DIRECCION_SIN_PROYECTO;
  const blockedGate = blockedPorqueTodavia
    ? {
        ...DIRECCION_SIN_PROYECTO,
        porqueTodavia: blockedPorqueTodavia,
      }
    : null;

  const storedDestino = blockedPorqueTodavia
    ? "presencia"
    : (optimistic ?? propDestino);
  const destino =
    storedDestino === "peldano" && selectedGate.ok && !blockedGate
      ? "peldano"
      : "presencia";

  const pickPresencia = () => {
    setOptimistic("presencia");
    setGapOpen(false);
    onChange("presencia", proyectoId ?? undefined);
  };

  const pickDireccion = () => {
    const gate = blockedGate ?? selectedGate;
    const claimPid = (currentGate?.ok ? proyectoId : undefined) ?? gate.proyectoId;
    const claim = resolveClaimDestinoCierre({
      requested: "peldano",
      proyectoId: claimPid,
      gate: blockedGate ? { ...gate, ok: false } : gate,
    });
    if (!claim.accepted) {
      setOptimistic("presencia");
      setGapOpen(true);
      return;
    }
    setOptimistic("peldano");
    setGapOpen(false);
    onChange("peldano", claimPid);
  };

  const pickAbierta = (id: string) => {
    const gate = gates.find(g => g.proyectoId === id);
    if (!gate?.ok || blockedGate) {
      setGapOpen(true);
      return;
    }
    setOptimistic("peldano");
    setGapOpen(false);
    onChange("peldano", id);
  };

  const presenciaOn = destino === "presencia";
  const peldanoOn = destino === "peldano";
  const hueco = blockedGate ?? (abiertas.length === 0 ? selectedGate : null);
  const showHueco = Boolean((gapOpen || peldanoOn) && (blockedGate || !peldanoOn || !selectedGate.ok));
  const showRiesgo = peldanoOn && selectedGate.ok && !blockedGate;

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
          Presencia es rápida. Dirección pide rumbo vivo.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={pickPresencia}
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
          onClick={pickDireccion}
          className="rounded-xl px-2.5 py-2.5 text-left touch-manipulation transition-transform active:scale-[0.98]"
          style={{
            backgroundColor: peldanoOn
              ? "rgba(212,175,55,0.2)"
              : "rgba(212,175,55,0.06)",
            border: peldanoOn
              ? `1.5px solid ${GOLD}`
              : `1px dashed rgba(212,175,55,0.45)`,
            boxShadow: peldanoOn ? `0 0 22px rgba(212,175,55,0.35)` : "none",
          }}
          data-testid="destino-peldano"
          aria-pressed={peldanoOn}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <Compass
              size={12}
              style={{ color: peldanoOn ? GOLD : "rgba(212,175,55,0.8)" }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-wider"
              style={{ color: peldanoOn ? GOLD : "rgba(212,175,55,0.88)" }}
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
              {abiertas.length > 0 && !blockedGate ? "Rumbo abierto" : "Todavía no"}
            </p>
          )}
        </button>
      </div>

      {showHueco && hueco ? (
        <p
          className="text-[9px] leading-snug"
          style={{ color: GOLD }}
          data-testid="destino-direccion-hueco"
        >
          {noPuedesLlegarADireccion(hueco)} Presencia cubre el día.
        </p>
      ) : null}

      {showRiesgo ? (
        <p
          className="text-[8px] leading-snug"
          style={{ color: "rgba(212,175,55,0.85)" }}
          data-testid="destino-direccion-riesgo"
        >
          {selectedGate.riesgoEnsuciar}
        </p>
      ) : null}

      {peldanoOn && !blockedGate && abiertas.length > 0 ? (
        <div className="flex flex-wrap gap-1" data-testid="destino-proyecto-picker">
          {abiertas.map(g => {
            const active = g.proyectoId === (proyectoId || selectedGate.proyectoId);
            return (
              <button
                key={g.proyectoId}
                type="button"
                onClick={() => pickAbierta(g.proyectoId)}
                className="px-2 py-1 rounded-md text-[9px] font-bold truncate touch-manipulation active:scale-[0.99] max-w-full"
                style={{
                  color: GOLD,
                  backgroundColor: active ? "rgba(212,175,55,0.16)" : "transparent",
                  border: `1px solid ${active ? GOLD : "rgba(212,175,55,0.35)"}`,
                }}
                data-testid={`destino-proyecto-${g.proyectoId}`}
              >
                {rumboChipLabel(g)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
