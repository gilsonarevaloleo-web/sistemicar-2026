/**
 * Overlay naranja: cronómetro de unidad para conquista.
 * Sonido al segundo (Tik) + vueltas. Al cerrar se apaga (no corre en segundo plano).
 * Cero persistencia — el naranja es borrador.
 *
 * Ring: unidades del vehículo (van al récord) vs vueltas del naranja,
 * con reloj de ganancia anclado para que no salte de sitio.
 */
import { useEffect, useMemo, useState, useCallback, useRef, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, X, Focus, Timer, Trophy, TrendingDown, TrendingUp } from "lucide-react";
import { NARANJA } from "@/components/flota/vehicleCardShared";
import {
  buildUnitFocusLap,
  buildUnitFocusRingView,
  formatUnitFocusElapsed,
  unitFocusCurrentLapMs,
  unitFocusElapsedMs,
  type UnitFocusLap,
  type UnitFocusVehicleClock,
} from "@/lib/conquistaUnitFocusClock";
import { hardwareClockNow } from "@/lib/hardwareClock";
import { playTikTapTone } from "@/lib/tikTapTone";
import { isTikSoundEnabled } from "@/lib/tikSound";

type Props = {
  open: boolean;
  onClose: () => void;
  accentColor?: string;
  /**
   * Reserva inferior (px) para no tapar El Crisol / nav mientras el
   * cronómetro de unidad está activo.
   */
  bottomInsetPx?: number;
  /** Reloj del sub activo (récord + ganancia). Display-only. */
  vehicleClock?: UnitFocusVehicleClock | null;
};

export function ConquistaUnitFocusOverlay({
  open,
  onClose,
  accentColor = NARANJA,
  bottomInsetPx = 0,
  vehicleClock = null,
}: Props) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => hardwareClockNow());
  const [laps, setLaps] = useState<UnitFocusLap[]>([]);
  const lastTickSecRef = useRef<number>(-1);

  useEffect(() => {
    if (!open) {
      setStartedAt(null);
      setLaps([]);
      lastTickSecRef.current = -1;
      return;
    }
    const t0 = hardwareClockNow();
    setStartedAt(t0);
    setNowMs(t0);
    setLaps([]);
    lastTickSecRef.current = 0;
    // Unlock audio en el gesto de apertura.
    if (isTikSoundEnabled()) playTikTapTone();
    // 1s basta para el cronómetro visible; 250ms peleaba con Crisol/ticks J4 en móvil.
    const id = window.setInterval(() => setNowMs(hardwareClockNow()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const elapsed =
    startedAt != null ? unitFocusElapsedMs(startedAt, nowMs) : 0;
  const elapsedSec = Math.floor(elapsed / 1000);
  const lastLapAbs = laps.length > 0 ? laps[laps.length - 1]!.absoluteMs : 0;
  const currentLapMs = unitFocusCurrentLapMs(elapsed, lastLapAbs);

  const ring = useMemo(
    () =>
      buildUnitFocusRingView({
        vehicleElapsedMs: (vehicleClock?.elapsedSec ?? 0) * 1000,
        recordMinPerUnit: vehicleClock?.recordMinPerUnit,
        unitsTarget: vehicleClock?.unitsTarget,
        orangeUnits: laps.length,
        orangeCurrentLapMs: currentLapMs,
        gananciaDeltaSec: vehicleClock?.gananciaDeltaSec ?? 0,
        hasProjection: vehicleClock?.hasProjection === true,
        vehicleTimerDisplay: vehicleClock?.timerDisplay,
        vehicleTimerExpired: vehicleClock?.timerExpired,
      }),
    [
      vehicleClock?.elapsedSec,
      vehicleClock?.recordMinPerUnit,
      vehicleClock?.unitsTarget,
      vehicleClock?.gananciaDeltaSec,
      vehicleClock?.hasProjection,
      vehicleClock?.timerDisplay,
      vehicleClock?.timerExpired,
      laps.length,
      currentLapMs,
    ]
  );

  useEffect(() => {
    if (!open || startedAt == null) return;
    if (elapsedSec <= 0) {
      lastTickSecRef.current = 0;
      return;
    }
    if (elapsedSec === lastTickSecRef.current) return;
    lastTickSecRef.current = elapsedSec;
    playTikTapTone();
  }, [open, startedAt, elapsedSec]);

  const handleReset = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    const t0 = hardwareClockNow();
    setStartedAt(t0);
    setNowMs(t0);
    setLaps([]);
    lastTickSecRef.current = 0;
  }, []);

  const handleLap = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (startedAt == null) return;
      const abs = unitFocusElapsedMs(startedAt, hardwareClockNow());
      if (abs < 200) return;
      setLaps(prev => {
        const prevAbs = prev.length > 0 ? prev[prev.length - 1]!.absoluteMs : 0;
        const lap = buildUnitFocusLap(prev.length + 1, abs, prevAbs);
        return [...prev, lap];
      });
    },
    [startedAt]
  );

  const handleClose = useCallback(
    (e?: MouseEvent) => {
      e?.stopPropagation();
      onClose();
    },
    [onClose]
  );

  const display = formatUnitFocusElapsed(elapsed);
  const lapsNewestFirst = [...laps].reverse();

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="conquista-unit-focus"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-x-0 top-0 z-[230] flex flex-col overflow-y-auto"
          style={{
            backgroundColor: accentColor,
            bottom: Math.max(0, bottomInsetPx),
          }}
          onClick={() => handleClose()}
          data-testid="conquista-unit-focus-overlay"
          role="dialog"
          aria-label="Cronómetro de unidad"
        >
          <button
            type="button"
            onClick={e => handleClose(e)}
            className="absolute top-4 right-4 p-3 rounded-full z-10"
            style={{ backgroundColor: "rgba(0,0,0,0.25)", color: "#000" }}
            data-testid="conquista-unit-focus-close"
            aria-label="Cerrar cronómetro"
          >
            <X size={22} strokeWidth={2.5} />
          </button>

          <div
            className="flex flex-col items-center gap-4 px-5 w-full max-w-md mx-auto my-auto py-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 opacity-80">
              <Focus size={16} color="#000" strokeWidth={2.5} />
              <p
                className="text-[11px] font-black uppercase tracking-[0.2em]"
                style={{ color: "#000" }}
              >
                Foco unidad
              </p>
            </div>

            <p
              className="font-black tabular-nums leading-none select-none"
              style={{
                color: "#000",
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
                fontSize: "clamp(3.6rem, 18vw, 6.5rem)",
                letterSpacing: "-0.04em",
              }}
              data-testid="conquista-unit-focus-display"
            >
              {display}
            </p>

            <UnitFocusRing
              ring={ring}
              currentLapDisplay={formatUnitFocusElapsed(currentLapMs)}
            />

            <p
              className="text-[10px] font-bold uppercase tracking-wider text-center max-w-[20rem]"
              style={{ color: "rgba(0,0,0,0.65)" }}
            >
              Tik cada segundo. Vuelta marca el tramo. Al salir se apaga.
            </p>

            <div className="flex items-center gap-3 mt-0.5">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider"
                style={{
                  backgroundColor: "rgba(0,0,0,0.88)",
                  color: accentColor,
                }}
                data-testid="conquista-unit-focus-reset"
              >
                <RotateCcw size={16} strokeWidth={2.5} />
                Reiniciar
              </button>
              <button
                type="button"
                onClick={handleLap}
                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider"
                style={{
                  backgroundColor: "rgba(0,0,0,0.55)",
                  color: "#000",
                  border: "2px solid rgba(0,0,0,0.75)",
                }}
                data-testid="conquista-unit-focus-lap"
              >
                <Timer size={16} strokeWidth={2.5} />
                Vuelta
              </button>
            </div>

            {lapsNewestFirst.length > 0 && (
              <div
                className="w-full max-h-[22vh] overflow-y-auto rounded-2xl px-3 py-2 space-y-1"
                style={{ backgroundColor: "rgba(0,0,0,0.18)" }}
                data-testid="conquista-unit-focus-laps"
              >
                {lapsNewestFirst.map(lap => (
                  <div
                    key={lap.n}
                    className="flex items-center justify-between gap-3 py-1.5 border-b last:border-b-0"
                    style={{ borderColor: "rgba(0,0,0,0.12)" }}
                  >
                    <span
                      className="text-[11px] font-black uppercase tracking-wider"
                      style={{ color: "rgba(0,0,0,0.7)" }}
                    >
                      Vuelta {lap.n}
                    </span>
                    <span
                      className="text-sm font-black tabular-nums"
                      style={{
                        color: "#000",
                        fontFamily: "JetBrains Mono, ui-monospace, monospace",
                      }}
                    >
                      {formatUnitFocusElapsed(lap.splitMs)}
                    </span>
                    <span
                      className="text-[10px] font-bold tabular-nums"
                      style={{ color: "rgba(0,0,0,0.5)" }}
                    >
                      {formatUnitFocusElapsed(lap.absoluteMs)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={e => handleClose(e)}
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "rgba(0,0,0,0.55)" }}
              data-testid="conquista-unit-focus-tap-close"
            >
              Toca fuera o aquí para salir
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function UnitFocusRing({
  ring,
  currentLapDisplay,
}: {
  ring: ReturnType<typeof buildUnitFocusRingView>;
  currentLapDisplay: string;
}) {
  const gananciaColor =
    ring.gananciaKind === "ganando"
      ? "#14532d"
      : ring.gananciaKind === "perdiendo"
        ? "#7f1d1d"
        : "rgba(0,0,0,0.55)";
  const GananciaIcon =
    ring.gananciaKind === "ganando"
      ? TrendingDown
      : ring.gananciaKind === "perdiendo"
        ? TrendingUp
        : Timer;

  return (
    <div className="w-full space-y-2" data-testid="conquista-unit-focus-ring">
      <div
        className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 rounded-2xl px-2 py-2.5"
        style={{ backgroundColor: "rgba(0,0,0,0.22)" }}
      >
        <div className="min-w-0 text-center" data-testid="conquista-unit-focus-record">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Trophy size={11} strokeWidth={2.5} color="rgba(0,0,0,0.72)" />
            <p
              className="text-[8px] font-black uppercase tracking-[0.16em]"
              style={{ color: "rgba(0,0,0,0.68)" }}
            >
              Récord
            </p>
          </div>
          <p
            className="text-[28px] font-black tabular-nums leading-none"
            style={{
              color: "#000",
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
            }}
            data-testid="conquista-unit-focus-record-units"
          >
            {ring.hasRecord ? ring.recordUnitsDone : "—"}
          </p>
          <p
            className="text-[9px] font-black uppercase tracking-wider mt-0.5"
            style={{ color: "rgba(0,0,0,0.62)" }}
          >
            {ring.hasRecord
              ? ring.recordUnitsTarget != null
                ? `u · obj ${ring.recordUnitsTarget}`
                : "unidades"
              : "sin récord"}
          </p>
          <p
            className="text-[10px] font-black tabular-nums mt-1"
            style={{
              color: ring.vehicleTimerExpired ? "#7f1d1d" : "#000",
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
            }}
            data-testid="conquista-unit-focus-record-timer"
          >
            {ring.vehicleTimerDisplay ?? "—"}
          </p>
          <p
            className="text-[8px] font-bold mt-0.5"
            style={{ color: "rgba(0,0,0,0.55)" }}
          >
            {ring.recordPaceLabel ?? "primer ciclo"}
          </p>
          {ring.hasRecord ? (
            <RaceBar frac={ring.recordUnitFrac} label={formatUnitFocusElapsed(ring.recordUnitRemainMs)} />
          ) : (
            <RaceBar frac={0} label="—" muted />
          )}
        </div>

        <div className="flex flex-col items-center justify-center px-0.5">
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: "rgba(0,0,0,0.5)" }}
          >
            vs
          </span>
        </div>

        <div className="min-w-0 text-center" data-testid="conquista-unit-focus-orange">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Focus size={11} strokeWidth={2.5} color="rgba(0,0,0,0.72)" />
            <p
              className="text-[8px] font-black uppercase tracking-[0.16em]"
              style={{ color: "rgba(0,0,0,0.68)" }}
            >
              Unidad
            </p>
          </div>
          <p
            className="text-[28px] font-black tabular-nums leading-none"
            style={{
              color: "#000",
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
            }}
            data-testid="conquista-unit-focus-orange-units"
          >
            {ring.orangeUnits}
          </p>
          <p
            className="text-[9px] font-black uppercase tracking-wider mt-0.5"
            style={{ color: "rgba(0,0,0,0.62)" }}
          >
            vueltas
          </p>
          <p
            className="text-[10px] font-black tabular-nums mt-1"
            style={{
              color: "#000",
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
            }}
            data-testid="conquista-unit-focus-orange-lap"
          >
            {currentLapDisplay}
          </p>
          <p
            className="text-[8px] font-bold mt-0.5"
            style={{ color: "rgba(0,0,0,0.55)" }}
          >
            {ring.recordPaceDisplay ? `vs ${ring.recordPaceDisplay}` : "borrador"}
          </p>
          {ring.orangeLapFrac != null ? (
            <RaceBar
              frac={Math.min(1, ring.orangeLapFrac)}
              label={ring.orangeLapFrac >= 1 ? "pasó" : "dentro"}
              hot={ring.orangeLapFrac >= 1}
            />
          ) : (
            <RaceBar frac={0} label="—" muted />
          )}
        </div>
      </div>

      {ring.matchLabel ? (
        <p
          className="text-center text-[9px] font-black uppercase tracking-[0.14em]"
          style={{ color: "rgba(0,0,0,0.72)" }}
          data-testid="conquista-unit-focus-match"
        >
          {ring.matchLabel}
        </p>
      ) : (
        <p
          className="text-center text-[9px] font-black uppercase tracking-[0.14em]"
          style={{ color: "rgba(0,0,0,0.4)" }}
          data-testid="conquista-unit-focus-match"
        >
          {ring.hasRecord ? " " : "Sin récord · no ensucia la bóveda"}
        </p>
      )}

      <div
        className="flex items-center justify-center gap-2 rounded-2xl px-3 py-2 min-h-[44px]"
        style={{
          backgroundColor:
            ring.gananciaKind === "ganando"
              ? "rgba(20,83,45,0.22)"
              : ring.gananciaKind === "perdiendo"
                ? "rgba(127,29,29,0.22)"
                : "rgba(0,0,0,0.16)",
        }}
        data-testid="conquista-unit-focus-ganancia"
      >
        <GananciaIcon size={14} strokeWidth={2.5} color={gananciaColor} />
        <span
          className="text-[9px] font-black uppercase tracking-[0.16em]"
          style={{ color: gananciaColor }}
        >
          Ganancia
        </span>
        {ring.showGananciaClock ? (
          <>
            <span
              className="text-[15px] font-black tabular-nums"
              style={{
                color: gananciaColor,
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
              }}
            >
              {ring.gananciaLabel}
            </span>
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: gananciaColor }}
            >
              {ring.gananciaPhrase}
            </span>
          </>
        ) : (
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "rgba(0,0,0,0.45)" }}
          >
            en espera
          </span>
        )}
      </div>
    </div>
  );
}

function RaceBar({
  frac,
  label,
  muted = false,
  hot = false,
}: {
  frac: number;
  label: string;
  muted?: boolean;
  hot?: boolean;
}) {
  const width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  return (
    <div className="mt-1.5 px-1">
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: "rgba(0,0,0,0.18)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width,
            backgroundColor: muted ? "transparent" : hot ? "#7f1d1d" : "#000",
          }}
        />
      </div>
      <p
        className="text-[8px] font-black tabular-nums mt-0.5"
        style={{
          color: muted ? "rgba(0,0,0,0.35)" : hot ? "#7f1d1d" : "rgba(0,0,0,0.55)",
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
        }}
      >
        {label}
      </p>
    </div>
  );
}

/** Botón compacto para abrir el foco unidad (conquista). */
export function ConquistaUnitFocusButton({
  onOpen,
  accentColor = NARANJA,
}: {
  onOpen: () => void;
  accentColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onOpen();
      }}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider"
      style={{
        backgroundColor: `${accentColor}22`,
        color: accentColor,
        border: `1px solid ${accentColor}55`,
      }}
      data-testid="conquista-unit-focus-open"
      title="Cronómetro de unidad (no guarda récord)"
    >
      <Focus size={11} strokeWidth={2.5} />
      Foco
    </button>
  );
}
