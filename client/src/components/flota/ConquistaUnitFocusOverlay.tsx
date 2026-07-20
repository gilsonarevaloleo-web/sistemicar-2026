/**
 * Overlay naranja: cronómetro de unidad para conquista.
 * Al cerrar se apaga (no corre en segundo plano). Cero persistencia.
 */
import { useEffect, useState, useCallback, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, X, Focus } from "lucide-react";
import { NARANJA } from "@/components/flota/vehicleCardShared";
import {
  formatUnitFocusElapsed,
  unitFocusElapsedMs,
} from "@/lib/conquistaUnitFocusClock";
import { hardwareClockNow } from "@/lib/hardwareClock";

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

  useEffect(() => {
    if (!open) {
      setStartedAt(null);
      return;
    }
    const t0 = hardwareClockNow();
    setStartedAt(t0);
    setNowMs(t0);
    const id = window.setInterval(() => setNowMs(hardwareClockNow()), 250);
    return () => window.clearInterval(id);
  }, [open]);

  const handleReset = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    const t0 = hardwareClockNow();
    setStartedAt(t0);
    setNowMs(t0);
  }, []);

  const handleClose = useCallback(
    (e?: MouseEvent) => {
      e?.stopPropagation();
      onClose();
    },
    [onClose]
  );

  const elapsed =
    startedAt != null ? unitFocusElapsedMs(startedAt, nowMs) : 0;
  const display = formatUnitFocusElapsed(elapsed);

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
            className="flex flex-col items-center gap-6 px-6"
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
              className="text-[10px] font-bold uppercase tracking-wider text-center max-w-[16rem]"
              style={{ color: "rgba(0,0,0,0.65)" }}
            >
              Mide esta unidad. Reinicia al terminar. Al salir se apaga.
            </p>

            <button
              type="button"
              onClick={handleReset}
              className="mt-2 flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider"
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
