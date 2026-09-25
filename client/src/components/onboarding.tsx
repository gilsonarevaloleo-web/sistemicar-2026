import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Zap, Eye, Sunrise, Heart } from "lucide-react";
import { SISTEMA_OFERTA, SISTEMA_RECINTOS, SISTEMA_DIA } from "@/content/sistemaRecintos";

interface OnboardingProps {
  isOpen: boolean;
  onComplete: () => void;
}

const GOLD = "#D4AF37";

const RECINTO_ICONS = {
  espejo: Eye,
  deposito: Sunrise,
  jornada: Heart,
  umbral: Zap,
} as const;

const steps = [
  {
    id: 1,
    title: "Bienvenido a SISTEMICAR",
    subtitle: SISTEMA_OFERTA.headline,
    content: SISTEMA_OFERTA.subhead,
  },
  {
    id: 2,
    title: "Los cuatro recintos",
    subtitle: "El ofrecimiento actual — no el de la versión anterior",
    content: null,
    isAreasStep: true,
  },
  {
    id: 3,
    title: "Un día en el sistema",
    subtitle: SISTEMA_OFERTA.puente,
    content: null,
    isDayStep: true,
  },
  {
    id: 4,
    title: "Empieza por lo que duele",
    subtitle: "No hay tour. Hay un gesto.",
    content:
      "Si hay interferencia, entra al Espejo. Si el día ya ocurrió, volcá en Depósito. Si hay que producir, lanza Jornada. Si el obstáculo se repite, Umbral.",
  },
];

export function Onboarding({ isOpen, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-lg rounded-2xl p-4 relative max-h-[85vh] overflow-y-auto"
          style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(212, 175, 55, 0.2)" }}
        >
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            data-testid="button-skip-onboarding"
          >
            <X size={20} />
          </button>

          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className="h-1 w-8 rounded-full transition-all"
                style={{
                  backgroundColor: idx <= currentStep ? GOLD : "rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </div>

          <h2 className="text-xl font-bold text-center text-white mb-1">{step.title}</h2>
          <p className="text-xs text-center mb-4" style={{ color: GOLD }}>
            {step.subtitle}
          </p>

          {step.content && (
            <p className="text-slate-300 text-center mb-4 leading-relaxed text-sm">
              {step.content}
            </p>
          )}

          {step.isAreasStep && (
            <div className="space-y-2 mb-4">
              {SISTEMA_RECINTOS.map((recinto) => {
                const AreaIcon = RECINTO_ICONS[recinto.id];
                return (
                  <div
                    key={recinto.id}
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: `${recinto.color}10`,
                      border: `1px solid ${recinto.color}30`,
                    }}
                    data-testid={`onboarding-recinto-${recinto.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <AreaIcon size={16} style={{ color: recinto.color }} />
                      <span className="font-bold text-sm" style={{ color: recinto.color }}>
                        {recinto.nameUpper}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{recinto.ritual}</p>
                    <p className="text-xs text-slate-400 mt-1">{recinto.oneLiner}</p>
                  </div>
                );
              })}
            </div>
          )}

          {step.isDayStep && (
            <div className="space-y-2 mb-4">
              {SISTEMA_DIA.map((paso) => (
                <div
                  key={paso.recinto}
                  className="flex items-start justify-between gap-3 p-2 rounded-lg"
                  style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                >
                  <div>
                    <p className="text-white text-xs font-bold">{paso.recinto}</p>
                    <p className="text-[11px] text-slate-400">{paso.cuando}</p>
                  </div>
                  <p className="text-[11px] text-amber-400/90 text-right max-w-[55%]">
                    {paso.gesto}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                data-testid="button-onboarding-prev"
              >
                <ChevronLeft size={18} />
                Anterior
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-black transition-all hover:scale-[1.02]"
              style={{ backgroundColor: GOLD }}
              data-testid="button-onboarding-next"
            >
              {currentStep === steps.length - 1 ? "Entrar" : "Siguiente"}
              {currentStep < steps.length - 1 && <ChevronRight size={18} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
