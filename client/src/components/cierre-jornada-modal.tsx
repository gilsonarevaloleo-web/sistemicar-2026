import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, X } from "lucide-react";
import { useAuthContext } from "@/App";
import { JORNADA_V4_PATH } from "@/lib/jornadaBrand";
import { getLocalVehicles, readLocalCierreJornadaByFecha } from "@/lib/persistence";
import { shouldMountAutoCierreJornada } from "@/lib/jornadaConsciousGuard";
import { useAppShellMotorsQuiet } from "@/lib/dualKernelQuiet";
import { debeRecordarSello } from "@shared/selloOperador";
import { getJournalDateString } from "@/lib/segmentTime";

const GOLD = "#D4AF37";
const SNOOZE_KEY = "sistemicar_sello_snooze_until";
const SNOOZE_MS = 30 * 60_000;

function snoozeUntil(): number {
  try {
    const n = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeSnooze(untilMs: number): void {
  try {
    localStorage.setItem(SNOOZE_KEY, String(untilMs));
  } catch {
    /* noop */
  }
}

/**
 * Recordatorio. No sella. No llama a Gemini.
 * El operador firma en Jornada (SelloOperadorCard).
 */
export function CierreJornadaModal() {
  const { user } = useAuthContext();
  const [location, setLocation] = useLocation();
  const motorsQuiet = useAppShellMotorsQuiet();
  const [isOpen, setIsOpen] = useState(false);

  const fecha = getJournalDateString();
  const yaSellado = readLocalCierreJornadaByFecha(fecha)?.selloEmitido === true;

  const vehicles = useMemo(() => getLocalVehicles(), [isOpen]);

  useEffect(() => {
    if (motorsQuiet || !user) return;
    const check = () => {
      if (readLocalCierreJornadaByFecha(getJournalDateString())?.selloEmitido) {
        setIsOpen(false);
        return;
      }
      if (Date.now() < snoozeUntil()) return;
      if (!debeRecordarSello(Date.now(), false)) return;
      if (!shouldMountAutoCierreJornada(getLocalVehicles(), location)) return;
      setIsOpen(true);
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [user, motorsQuiet, location]);

  const posponer = () => {
    writeSnooze(Date.now() + SNOOZE_MS);
    setIsOpen(false);
  };

  if (motorsQuiet || yaSellado) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
          data-testid="sello-recordatorio-modal"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md rounded-3xl border overflow-hidden"
            style={{ backgroundColor: "#0a0a0a", borderColor: `${GOLD}30` }}
          >
            <div
              className="p-4 flex items-center justify-between"
              style={{ backgroundColor: `${GOLD}10`, borderBottom: `1px solid ${GOLD}20` }}
            >
              <div className="flex items-center gap-3">
                <Moon size={20} style={{ color: GOLD }} />
                <div>
                  <h2 className="text-lg font-black text-white">El día no está sellado</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                    Recordatorio · no es un cierre
                  </p>
                </div>
              </div>
              <button
                onClick={posponer}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Aún no"
                data-testid="sello-recordatorio-x"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-200 leading-snug">
                El sistema avisa. No firma. El sello solo cuenta si lo emites tú en Jornada, con
                los números del día ya clavados.
              </p>
              {vehicles.length > 0 ? (
                <p className="text-[11px] text-slate-500">
                  Hay rastro de flota en este dispositivo. Entra a Jornada y sella.
                </p>
              ) : null}
            </div>
            <div className="p-4 border-t space-y-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setLocation(`${JORNADA_V4_PATH}?sello=1`);
                }}
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={{ backgroundColor: `${GOLD}20`, color: GOLD }}
                data-testid="sello-recordatorio-ir"
              >
                Ir a sellar en Jornada
              </button>
              <button
                type="button"
                onClick={posponer}
                className="w-full py-2 text-[11px] uppercase tracking-wider text-slate-500"
                data-testid="sello-recordatorio-luego"
              >
                Aún no · recordar en 30 min
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
