import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Compass, MessageCircle } from "lucide-react";
import {
  getTutorialSteps,
  markTutorialDone,
  profileLabel,
  type PlanificacionPlanProfile,
} from "@/lib/planificacionOnboarding";
import { JORNADA_MODULE } from "@/lib/jornadaBrand";

const GOLD = "#D4AF37";
const BLOOD = "#FF3131";

type Props = {
  uid: string;
  profile: PlanificacionPlanProfile;
  onComplete: () => void;
  onAskDoctor?: (prompt: string) => void;
};

/**
 * Overlay de primer usuario.
 * Porta a document.body: El Crisol también vive en body (z-250) y el
 * <main> del layout es z-10, así que un z-320 dentro de main no gana.
 * z-320 + portal: por encima de El Crisol y el nav (310).
 * Centrado + footer fijo: el botón de pasos no queda tapado abajo.
 */
export function PlanificacionTutorial({ uid, profile, onComplete, onAskDoctor }: Props) {
  const steps = getTutorialSteps(profile);
  const [step, setStep] = useState(0);

  const finish = () => {
    markTutorialDone(uid);
    onComplete();
  };

  const current = steps[step];
  const isLast = step >= steps.length - 1;

  const overlay = (
    <div
      className="fixed inset-0 z-[320] flex items-center justify-center px-4 bg-black/85"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
      data-testid="overlay-planificacion-tutorial"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border flex flex-col min-h-0"
        style={{
          borderColor: `${GOLD}40`,
          backgroundColor: "#0a0a0a",
          maxHeight: "min(32rem, calc(100dvh - 8rem))",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Compass size={18} style={{ color: GOLD }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Tutorial · {profileLabel(profile)}
            </span>
          </div>
          <button
            type="button"
            onClick={finish}
            className="p-1 rounded-lg hover:bg-white/5 text-slate-500"
            aria-label="Cerrar tutorial"
            data-testid="btn-skip-planificacion-tutorial"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 overflow-y-auto min-h-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
            >
              <h2 className="text-lg font-black text-white mb-2">{current.title}</h2>
              {step === 0 && (
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: GOLD }}>
                  {JORNADA_MODULE.tagline}
                </p>
              )}
              <p className="text-sm text-slate-400 leading-relaxed mb-3">{current.description}</p>
              {current.action && (
                <p className="text-xs font-bold rounded-lg px-3 py-2" style={{ color: GOLD, backgroundColor: `${GOLD}12` }}>
                  {current.action}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-5 pt-3 pb-5 shrink-0" data-testid="tutorial-plan-footer">
          <div className="flex gap-1.5 justify-center mb-4">
            {steps.map((_, i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full transition-transform"
                style={{
                  backgroundColor: i === step ? GOLD : "rgba(255,255,255,0.15)",
                  transform: i === step ? "scale(1.25)" : "scale(1)",
                }}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-slate-300 flex items-center justify-center gap-1"
                data-testid="btn-tutorial-plan-prev"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep(s => s + 1))}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-black flex items-center justify-center gap-1"
              style={{ background: GOLD }}
              data-testid="btn-tutorial-plan-next"
            >
              {isLast ? "¡Empezar!" : "Siguiente"}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>

          {isLast && onAskDoctor && (
            <button
              type="button"
              onClick={() => {
                finish();
                onAskDoctor(`¿Por dónde empiezo hoy en ${JORNADA_MODULE.title}?`);
              }}
              className="w-full mt-3 py-2 rounded-xl border text-[11px] text-slate-300 flex items-center justify-center gap-2"
              style={{ borderColor: `${BLOOD}40` }}
              data-testid="btn-tutorial-ask-doctor"
            >
              <MessageCircle size={14} style={{ color: BLOOD }} />
              Preguntar al Doctor IA
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
