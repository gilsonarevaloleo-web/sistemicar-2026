/**
 * Overlay naranja: cronómetro de unidad para conquista.
 * Sonido al segundo (Tik) + vueltas. Al cerrar se apaga (no corre en segundo plano).
 * Cero persistencia.
 */
import { useEffect, useState, useCallback, useRef, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, X, Focus, Timer } from "lucide-react";
import { NARANJA } from "@/components/flota/vehicleCardShared";
import {
  buildUnitFocusLap,
  formatUnitFocusElapsed,
  unitFocusElapsedMs,
  type UnitFocusLap,
} from "@/lib/conquistaUnitFocusClock";
import { hardwareClockNow } from "@/lib/hardwareClock";
import { playTikTapTone } from "@/lib/tikTapTone";
import { isTikSoundEnabled } from "@/lib/tikSound";

type Props = {
  open: boolean;
  onClose: () => void;
  accentColor?: string;
};

export function ConquistaUnitFocusOverlay({
  open,
  onClose,
  accentColor = NARANJA,
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
    const id = window.setInterval(() => setNowMs(hardwareClockNow()), 250);
    return () => window.clearInterval(id);
  }, [open]);

  const elapsed =
    startedAt != null ? unitFocusElapsedMs(startedAt, nowMs) : 0;
  const elapsedSec = Math.floor(elapsed / 1000);

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
          className="fixed inset-0 z-[230] flex flex-col items-center justify-center"
          style={{ backgroundColor: accentColor }}
          onClick={() => handleClose()}
          data-testid="conquista-unit-focus-overlay"
          role="dialog"
          aria-label="Cronómetro de unidad"
        >
          <button
            type="button"
            onClick={e => handleClose(e)}
            className="absolute top-4 right-4 p-3 rounded-full"
            style={{ backgroundColor: "rgba(0,0,0,0.25)", color: "#000" }}
            data-testid="conquista-unit-focus-close"
            aria-label="Cerrar cronómetro"
          >
            <X size={22} strokeWidth={2.5} />
          </button>

          <div
            className="flex flex-col items-center gap-5 px-6 w-full max-w-md"
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
                fontSize: "clamp(4.5rem, 22vw, 8rem)",
                letterSpacing: "-0.04em",
              }}
              data-testid="conquista-unit-focus-display"
            >
              {display}
            </p>

            <p
              className="text-[10px] font-bold uppercase tracking-wider text-center max-w-[18rem]"
              style={{ color: "rgba(0,0,0,0.65)" }}
            >
              Tik cada segundo. Vuelta marca el tramo. Al salir se apaga.
            </p>

            <div className="flex items-center gap-3 mt-1">
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
                className="w-full max-h-[28vh] overflow-y-auto rounded-2xl px-3 py-2 space-y-1"
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
