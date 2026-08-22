import { useEffect, useRef, useState } from "react";
import { Compass, Eye } from "lucide-react";
import { useAuthContext } from "@/App";
import {
  DESTINO_CIERRE_COPY,
  resolveProyectoChipId,
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

function ackGestoTap() {
  try {
    navigator.vibrate?.(14);
  } catch {
    /* desktop / iOS sin haptic */
  }
}

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
  const [optimisticPid, setOptimisticPid] = useState<string | null>(null);
  const [gapOpen, setGapOpen] = useState(false);
  const [held, setHeld] = useState<"presencia" | "peldano" | string | null>(null);
  const [pulse, setPulse] = useState<"presencia" | "peldano" | string | null>(null);
  const [acked, setAcked] = useState(false);
  const pulseTimer = useRef<number | null>(null);
  const { gates, abiertas } = useDireccionGates(user?.uid);

  useEffect(() => {
    setOptimistic(null);
  }, [value]);

  useEffect(() => {
    setOptimisticPid(null);
  }, [proyectoId]);

  useEffect(() => {
    return () => {
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    };
  }, []);

  const kick = (token: "presencia" | "peldano" | string) => {
    ackGestoTap();
    setAcked(true);
    setPulse(token);
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulse(null), 420);
  };

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
    setOptimisticPid(null);
    setGapOpen(false);
    kick("presencia");
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
      setOptimisticPid(null);
      setGapOpen(true);
      kick("peldano");
      return;
    }
    setOptimistic("peldano");
    setOptimisticPid(claimPid ?? null);
    setGapOpen(false);
    kick("peldano");
    onChange("peldano", claimPid);
  };

  const pickAbierta = (id: string) => {
    const gate = gates.find(g => g.proyectoId === id);
    if (!gate?.ok || blockedGate) {
      setGapOpen(true);
      kick(id);
      return;
    }
    setOptimistic("peldano");
    setOptimisticPid(id);
    setGapOpen(false);
    kick(id);
    onChange("peldano", id);
  };

  const presenciaOn = destino === "presencia";
  const peldanoOn = destino === "peldano";
  const hueco = blockedGate ?? (abiertas.length === 0 ? selectedGate : null);
  const showHueco = Boolean((gapOpen || peldanoOn) && (blockedGate || !peldanoOn || !selectedGate.ok));
  const showRiesgo = peldanoOn && selectedGate.ok && !blockedGate;
  const activePid = resolveProyectoChipId(
    optimisticPid,
    proyectoId,
    selectedGate.proyectoId
  );

  const rumboBtn = (
    kind: "presencia" | "peldano",
    on: boolean,
    onClick: () => void,
    testId: string
  ) => {
    const pressed = held === kind || pulse === kind;
    const color = kind === "presencia" ? CYAN : GOLD;
    const fillOn =
      kind === "presencia" ? "rgba(0,255,195,0.14)" : "rgba(212,175,55,0.2)";
    const fillOff =
      kind === "presencia" ? "rgba(0,255,195,0.04)" : "rgba(212,175,55,0.06)";
    const borderOn =
      kind === "presencia" ? `1.5px solid ${CYAN}` : `1.5px solid ${GOLD}`;
    const borderOff =
      kind === "presencia"
        ? "1px solid rgba(0,255,195,0.28)"
        : "1px dashed rgba(212,175,55,0.45)";
    const Icon = kind === "presencia" ? Eye : Compass;
    return (
      <button
        type="button"
        onPointerDown={() => setHeld(kind)}
        onPointerUp={() => setHeld(null)}
        onPointerCancel={() => setHeld(null)}
        onPointerLeave={() => setHeld(null)}
        onClick={onClick}
        className="rounded-xl px-2.5 py-2.5 text-left touch-manipulation select-none transition-[transform,box-shadow,background-color] duration-100"
        style={{
          backgroundColor: on || pressed ? fillOn : fillOff,
          border: on ? borderOn : borderOff,
          boxShadow: on || pressed ? `0 0 22px ${color}40` : "none",
          transform: pressed ? "scale(0.94)" : undefined,
        }}
        data-testid={testId}
        aria-pressed={on}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <Icon size={12} style={{ color: on || pressed ? color : `${color}cc` }} />
          <span
            className="text-[10px] font-black uppercase tracking-wider"
            style={{ color: on || pressed ? color : `${color}e0` }}
          >
            {DESTINO_CIERRE_COPY[kind].label}
          </span>
        </div>
        {!compact ? (
          <p className="text-[9px] leading-snug" style={{ color: MUTED }}>
            {DESTINO_CIERRE_COPY[kind].hint}
          </p>
        ) : kind === "peldano" ? (
          <p className="text-[8px] leading-snug mt-0.5" style={{ color: "rgba(212,175,55,0.7)" }}>
            {abiertas.length > 0 && !blockedGate ? "Rumbo abierto" : "Todavía no"}
          </p>
        ) : null}
      </button>
    );
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
      ) : (
        <p className="text-[8px] font-bold" style={{ color: MUTED }}>
          Presencia es rápida. Dirección pide rumbo vivo.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {rumboBtn("presencia", presenciaOn, pickPresencia, "destino-presencia")}
        {rumboBtn("peldano", peldanoOn, pickDireccion, "destino-peldano")}
      </div>

      {acked && !showHueco ? (
        <p
          className="text-[9px] font-bold leading-snug"
          style={{ color: peldanoOn ? GOLD : CYAN }}
          data-testid="destino-envio-ack"
        >
          {peldanoOn
            ? `Rumbo recibido · el envío va a «${selectedGate.titulo}»`
            : "Rumbo recibido · el envío cubre el día"}
        </p>
      ) : null}

      {showHueco && hueco ? (
        <p
          className="text-[9px] leading-snug"
          style={{ color: GOLD }}
          data-testid="destino-direccion-hueco"
        >
          {gapOpen ? "Toque recibido. " : ""}
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
            const active = g.proyectoId === activePid;
            const pressed = held === g.proyectoId || pulse === g.proyectoId;
            return (
              <button
                key={g.proyectoId}
                type="button"
                onPointerDown={() => setHeld(g.proyectoId)}
                onPointerUp={() => setHeld(null)}
                onPointerCancel={() => setHeld(null)}
                onPointerLeave={() => setHeld(null)}
                onClick={() => pickAbierta(g.proyectoId)}
                className="px-2 py-1.5 rounded-md text-[9px] font-bold truncate touch-manipulation select-none transition-[transform,background-color,box-shadow] duration-100 max-w-full"
                style={{
                  color: GOLD,
                  backgroundColor:
                    active || pressed ? "rgba(212,175,55,0.22)" : "transparent",
                  border: `1px solid ${active || pressed ? GOLD : "rgba(212,175,55,0.35)"}`,
                  boxShadow: active || pressed ? `0 0 12px ${GOLD}40` : undefined,
                  transform: pressed ? "scale(0.94)" : undefined,
                }}
                aria-pressed={active}
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
