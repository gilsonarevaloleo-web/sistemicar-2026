import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Target,
  Zap,
  Footprints,
  Shield,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Crown,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import { 
  subscribeToAcervo, 
  addAcervoEntry, 
  deleteAcervoEntry,
  clearAllAcervoEntries,
  AcervoEntry,
  subscribeToProgression,
  UserProgression,
  subscribeToEnergyLogs,
  EnergyLog,
  awardSovereigntyPoints,
  incrementModulePoints
} from "@/lib/persistence";
import { SeductionMessage } from "@/components/seduction-message";
import { ManualTriggerButton } from "@/components/master-manual-drawer";
import { CardLeyOpticaCodigo } from "@/components/deposito/CardLeyOpticaCodigo";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";
const EMERALD = "#50C878";
const VIOLET = "#9B59B6";

const AXIS_CONFIG = {
  enfoque: { 
    id: "CAPTURA", 
    points: 10, 
    label: "Captura", 
    icon: Target, 
    color: AZURE,
    description: "¿Qué lección técnica extraje?",
    structuredQuestion: "¿Qué aprendizaje específico quieres cristalizar en tu sistema operativo mental?",
    step: 1
  },
  conflicto: { 
    id: "CONTEXTO", 
    points: 20, 
    label: "Contexto", 
    icon: Zap, 
    color: EMERALD,
    description: "¿Cómo ordené el caos en ese momento?",
    structuredQuestion: "¿En qué escenarios, proyectos o áreas de tu vida aplicarías esto?",
    step: 2
  },
  pasos: { 
    id: "ACCIÓN", 
    points: 30, 
    label: "Acción", 
    icon: Footprints, 
    color: VIOLET,
    description: "¿Cuál fue la secuencia mecánica de acciones?",
    structuredQuestion: "¿Cómo traducirías esto en acciones concretas y medibles?",
    step: 3
  },
  limite: { 
    id: "TRANSMUTACIÓN", 
    points: 40, 
    label: "Transmutación", 
    icon: Shield, 
    color: GOLD,
    description: "¿Qué problema específico resolví y qué impacto tuvo?",
    structuredQuestion: "¿Qué capacidad nueva tienes ahora que no tenías antes?",
    step: 4
  },
};

type AxisType = keyof typeof AXIS_CONFIG;

const MODULE_THRESHOLDS_DEP = [
  { pts: 10, label: "Iniciado" },
  { pts: 50, label: "Centurión" },
  { pts: 150, label: "Guerrero" },
  { pts: 500, label: "Soberano" },
];

function getNextModuleThresholdDep(pts: number) {
  let currentLabel = "—";
  let currentPts = 0;
  for (const t of MODULE_THRESHOLDS_DEP) {
    if (pts >= t.pts) { currentLabel = t.label; currentPts = t.pts; }
  }
  const nextT = MODULE_THRESHOLDS_DEP.find(t => pts < t.pts) || null;
  const pct = nextT ? Math.min(((pts - currentPts) / (nextT.pts - currentPts)) * 100, 100) : 100;
  return { current: currentLabel, next: nextT?.label || null, ptsToNext: nextT ? nextT.pts - pts : 0, pct };
}

function DepositoModuleMilestoneBar({ pts }: { pts: number }) {
  const { current, next, ptsToNext, pct } = getNextModuleThresholdDep(pts);
  const color = "#10B981";
  return (
    <div className="px-3 py-2.5 rounded-xl border" style={{ backgroundColor: `${color}08`, borderColor: `${color}20` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
          {current} — DEPÓSITO
        </span>
        {next ? (
          <span className="text-[9px] text-slate-500">
            Faltan <span className="font-bold text-white">{ptsToNext}</span> pts → {next}
          </span>
        ) : (
          <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>
            nivel máximo
          </span>
        )}
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}50`, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
}

function AnimatedCounter({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) => Math.round(current));
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    spring.set(value);
    const unsubscribe = display.on("change", (v) => setDisplayValue(v));
    return () => unsubscribe();
  }, [value, spring, display]);

  return <span>{displayValue}</span>;
}

function PremiumToast({ points }: { points: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-xl"
      style={{ 
        background: `linear-gradient(135deg, ${GOLD}25 0%, ${VIOLET}15 100%)`,
        borderColor: `${GOLD}50`,
        boxShadow: `0 0 30px ${GOLD}30, 0 0 60px ${GOLD}15`
      }}
    >
      <Crown size={22} style={{ color: GOLD }} />
      <div>
        <p className="text-white font-black text-sm tracking-wide">
          Soberanía Incrementada
        </p>
        <p className="text-xs font-bold" style={{ color: GOLD }}>
          +{points} PTS
        </p>
      </div>
    </motion.div>
  );
}

const ALLIANCE_THRESHOLD = 85;

const AXIS_ORDER: AxisType[] = ["enfoque", "conflicto", "pasos", "limite"];

export default function Esperanza() {
  const { user } = useAuthContext();
  const [entries, setEntries] = useState<AcervoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedAxis, setSelectedAxis] = useState<AxisType | null>(null);
  const [saving, setSaving] = useState(false);
  const [progressGlow, setProgressGlow] = useState(false);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [energyLogs, setEnergyLogs] = useState<EnergyLog[]>([]);
  
  // Modo estructurado - guía paso a paso con persistencia
  const STORAGE_KEY = user ? `deposito_draft_${user.uid}` : null;
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOwner = user?.email?.toLowerCase() === "gilsonarevalo.leo@gmail.com";
  const [resetting, setResetting] = useState(false);
  
  const [isStructuredMode, setIsStructuredMode] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [structuredTexts, setStructuredTexts] = useState<Record<AxisType, string>>({
    enfoque: "",
    conflicto: "",
    pasos: "",
    limite: ""
  });
  const [showSummary, setShowSummary] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [activeMode, setActiveMode] = useState<"none" | "libre" | "estructurado">("none");
  
  // Cargar borrador guardado al montar
  useEffect(() => {
    if (!STORAGE_KEY) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.texts && draft.step !== undefined) {
          setStructuredTexts(draft.texts);
          setCurrentStep(draft.step);
          setShowSummary(draft.showSummary || false);
          setIsFormOpen(true);
          setHasDraft(true);
        }
      }
    } catch (e) {
      console.error("Error loading draft:", e);
    }
  }, [STORAGE_KEY]);
  
  // Guardar borrador cuando cambie el progreso — debounced 400ms para no bloquear el teclado
  useEffect(() => {
    if (!STORAGE_KEY) return;
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      const hasContent = Object.values(structuredTexts).some(t => t.trim().length > 0);
      if (hasContent) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            texts: structuredTexts,
            step: currentStep,
            showSummary,
            savedAt: Date.now()
          }));
        } catch (e) {
          console.error("Error saving draft:", e);
        }
      }
    }, 400);
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, [structuredTexts, currentStep, showSummary, STORAGE_KEY]);
  
  const clearDraft = () => {
    if (STORAGE_KEY) {
      localStorage.removeItem(STORAGE_KEY);
      setHasDraft(false);
    }
  };
  
  // Nota: Acervo está abierto para TODOS - es la herramienta de transformación
  // La restricción del 85% solo aplica para la Propuesta de Alianza (30% comisión)

  const toggleExpanded = (id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const [showPremiumToast, setShowPremiumToast] = useState<{ points: number } | null>(null);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const handleLocalUpdate = () => {
      const unsubscribe = subscribeToAcervo(
        user.uid,
        (data) => {
          setEntries(data);
          setLoading(false);
        },
        (error) => {
          console.error("Error listening to acervo:", error);
          setLoading(false);
        }
      );
      return unsubscribe;
    };

    const unsubscribe = handleLocalUpdate();
    
    const localHandler = () => handleLocalUpdate();
    window.addEventListener("acervo-updated", localHandler);

    return () => {
      unsubscribe();
      window.removeEventListener("acervo-updated", localHandler);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToProgression(
      user.uid,
      (prog) => setProgression(prog),
      (error) => console.error(error)
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToEnergyLogs(
      user.uid,
      (data) => setEnergyLogs(data),
      (error) => console.error(error)
    );
    return unsubscribe;
  }, [user]);

  const totalPoints = entries.reduce((sum, e) => sum + e.points, 0);

  const ACERVO_LEVELS = [
    { name: "Iniciado", min: 0, max: 100, color: AZURE },
    { name: "Activo", min: 100, max: 300, color: EMERALD },
    { name: "Comprometido", min: 300, max: 700, color: VIOLET },
    { name: "Maestría", min: 700, max: 1400, color: GOLD },
    { name: "Soberano", min: 1400, max: Infinity, color: "#FF3131" },
  ];
  const currentLevelIdx = ACERVO_LEVELS.findIndex((l, i) =>
    totalPoints >= l.min && (i === ACERVO_LEVELS.length - 1 || totalPoints < l.max)
  );
  const currentLevel = ACERVO_LEVELS[Math.max(currentLevelIdx, 0)];
  const nextLevel = currentLevelIdx < ACERVO_LEVELS.length - 1 ? ACERVO_LEVELS[currentLevelIdx + 1] : null;
  const levelProgressPct = nextLevel
    ? Math.min(((totalPoints - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100, 100)
    : 100;
  const ptsToNext = nextLevel ? currentLevel.max - totalPoints : 0;

  const handleSave = async () => {
    if (!user || !inputText.trim() || !selectedAxis) return;
    
    setSaving(true);
    try {
      const axisConfig = AXIS_CONFIG[selectedAxis];
      const newId = await addAcervoEntry(user.uid, {
        text: inputText.trim(),
        axis: selectedAxis,
        points: axisConfig.points,
      });
      
      await awardSovereigntyPoints(user.uid, 2, "Depósito: " + axisConfig.label);
      await incrementModulePoints(user.uid, "deposito", 1).catch(() => {});
      
      setProgressGlow(true);
      setTimeout(() => setProgressGlow(false), 2000);
      
      setShowPremiumToast({ points: axisConfig.points });
      setTimeout(() => setShowPremiumToast(null), 3000);
      
      setNewEntryId(newId);
      setTimeout(() => setNewEntryId(null), 2500);
      
      setInputText("");
      setSelectedAxis(null);
      setIsFormOpen(false);
    } catch (error) {
      toast.error("Error al guardar el hito");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!user) return;
    try {
      await deleteAcervoEntry(user.uid, entryId);
      toast.success("Hito eliminado");
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const entriesByAxis = Object.keys(AXIS_CONFIG).reduce((acc, axis) => {
    acc[axis as AxisType] = entries.filter(e => e.axis === axis);
    return acc;
  }, {} as Record<AxisType, AcervoEntry[]>);

  // Funciones del modo estructurado
  const currentAxis = AXIS_ORDER[currentStep];
  const currentAxisConfig = currentAxis ? AXIS_CONFIG[currentAxis] : null;
  
  const handleStructuredNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowSummary(true);
    }
  };
  
  const handleStructuredBack = () => {
    if (showSummary) {
      setShowSummary(false);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleStructuredTextChange = (text: string) => {
    if (currentAxis) {
      setStructuredTexts(prev => ({ ...prev, [currentAxis]: text }));
    }
  };
  
  const handleSaveStructured = async () => {
    if (!user) return;
    
    setSaving(true);
    let totalPointsEarned = 0;
    
    try {
      for (const axis of AXIS_ORDER) {
        const text = structuredTexts[axis].trim();
        if (text) {
          const axisConfig = AXIS_CONFIG[axis];
          await addAcervoEntry(user.uid, {
            text,
            axis,
            points: axisConfig.points,
          });
          totalPointsEarned += axisConfig.points;
        }
      }
      
      if (totalPointsEarned > 0) {
        await awardSovereigntyPoints(user.uid, 10, "Depósito: Ciclo Completo");
        incrementModulePoints(user.uid, "deposito", 3).catch(() => {});
        
        setProgressGlow(true);
        setTimeout(() => setProgressGlow(false), 2000);
        
        setShowPremiumToast({ points: totalPointsEarned });
        setTimeout(() => setShowPremiumToast(null), 3000);
        
        toast.success(`¡Ciclo de transformación completado! +${totalPointsEarned} PS`);
      }
      
      // Reset y limpiar borrador
      clearDraft();
      setStructuredTexts({ enfoque: "", conflicto: "", pasos: "", limite: "" });
      setCurrentStep(0);
      setShowSummary(false);
      setIsFormOpen(false);
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };
  
  const handleDiscardDraft = () => {
    clearDraft();
    setStructuredTexts({ enfoque: "", conflicto: "", pasos: "", limite: "" });
    setCurrentStep(0);
    setShowSummary(false);
    toast.success("Borrador descartado");
  };

  const handleResetAcervo = async () => {
    if (!user || !isOwner) return;
    if (!window.confirm("¿Eliminar TODAS las entradas del Acervo? Esta acción no se puede deshacer.")) return;
    setResetting(true);
    try {
      await clearAllAcervoEntries(user.uid);
      setEntries([]);
      toast.success("Acervo reseteado — empezando de cero");
    } catch {
      toast.error("Error al resetear el Acervo");
    } finally {
      setResetting(false);
    }
  };
  
  const filledSteps = AXIS_ORDER.filter(axis => structuredTexts[axis].trim().length > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#020202" }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 pb-32 relative" style={{ backgroundColor: "#020202" }}>
      <AnimatePresence>
        {showPremiumToast && (
          <div className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <PremiumToast points={showPremiumToast.points} />
          </div>
        )}
      </AnimatePresence>
      
      <div className="max-w-lg mx-auto">
        <header className="mb-8 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${GOLD}20`, border: `1px solid ${GOLD}40` }}>
                <Lock size={28} style={{ color: GOLD }} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">
                  DEPÓSITO
                </h1>
                <p className="text-xs uppercase tracking-widest" style={{ color: AZURE }}>
                  Óptica-Código · ¿Qué aprendí hoy?
                </p>
              </div>
            </div>
            <ManualTriggerButton manualType="deposito" />
          </div>
        </header>

        <CardLeyOpticaCodigo />

        <SeductionMessage 
          progression={progression} 
          energyLogs={energyLogs}
          extraContext="Recargando en el Depósito"
          className="mb-4"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl border mb-6 relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${currentLevel.color}12 0%, #0a0a0a 100%)`,
            borderColor: `${currentLevel.color}30`
          }}
        >
          {/* Pts + nivel */}
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: currentLevel.color }}>
                Acervo de Conquistas
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">
                  <AnimatedCounter value={totalPoints} />
                </span>
                <span className="text-xs text-slate-500 font-bold">pts</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest" style={{ backgroundColor: `${currentLevel.color}20`, color: currentLevel.color, border: `1px solid ${currentLevel.color}40` }}>
                {currentLevel.name}
              </span>
              {nextLevel && (
                <p className="text-[8px] text-slate-500 mt-1.5">{ptsToNext} pts → {nextLevel.name}</p>
              )}
              {!nextLevel && (
                <p className="text-[8px] mt-1.5" style={{ color: currentLevel.color }}>Nivel máximo</p>
              )}
            </div>
          </div>

          {/* Barra de progreso dentro del nivel */}
          <motion.div 
            className="mb-4"
            animate={progressGlow ? {
              boxShadow: [`0 0 0px ${currentLevel.color}00`, `0 0 20px ${currentLevel.color}60`, `0 0 0px ${currentLevel.color}00`]
            } : {}}
            transition={{ duration: 1.5 }}
          >
            <div className="flex justify-between text-[9px] mb-1.5">
              <span className="text-slate-500 font-mono">{currentLevel.min} pts</span>
              <span className="font-bold" style={{ color: currentLevel.color }}>
                {nextLevel ? `${Math.round(levelProgressPct)}% hacia ${nextLevel.name}` : "SOBERANO COMPLETO"}
              </span>
              <span className="text-slate-500 font-mono">{nextLevel ? `${currentLevel.max} pts` : "∞"}</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelProgressPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: currentLevel.color, boxShadow: `0 0 8px ${currentLevel.color}60` }}
              />
            </div>
          </motion.div>

          {/* Contador por eje */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {Object.entries(AXIS_CONFIG).map(([key, config]) => (
              <div key={key} className="p-2 rounded-xl" style={{ backgroundColor: `${config.color}10` }}>
                <p className="text-lg font-black" style={{ color: config.color }}>
                  {entriesByAxis[key as AxisType]?.length || 0}
                </p>
                <p className="text-[8px] text-slate-500 uppercase tracking-widest">{config.label}</p>
              </div>
            ))}
          </div>

          {/* Botón reset — solo owner */}
          {isOwner && (
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
              <button
                onClick={handleResetAcervo}
                disabled={resetting || entries.length === 0}
                className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{ backgroundColor: "rgba(153,27,27,0.15)", color: "#ef4444", border: "1px solid rgba(153,27,27,0.3)" }}
                data-testid="button-reset-acervo"
              >
                {resetting ? "Reseteando..." : "↺ Resetear Acervo"}
              </button>
            </div>
          )}
        </motion.div>

        {/* BÓVEDA DE LOGROS — HITO DEPÓSITO */}
        <div className="mb-6">
          <DepositoModuleMilestoneBar pts={progression?.ptsDeposito || 0} />
        </div>

        {/* Selector de Modos */}
        <div className="space-y-3 mb-6">
          {/* Modo Libre */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border overflow-hidden"
            style={{ 
              backgroundColor: "#0a0a0a", 
              borderColor: activeMode === "libre" ? `${EMERALD}60` : `${EMERALD}20` 
            }}
          >
            <button
              onClick={() => setActiveMode(activeMode === "libre" ? "none" : "libre")}
              className="w-full p-4 flex items-center justify-between transition-colors hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${EMERALD}20` }}
                >
                  <Plus size={18} style={{ color: EMERALD }} />
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold text-white">Modo Libre</span>
                  <p className="text-[10px] text-slate-500">Elige un eje y registra tu aprendizaje</p>
                </div>
              </div>
              {activeMode === "libre" ? (
                <ChevronUp size={20} style={{ color: EMERALD }} />
              ) : (
                <ChevronDown size={20} className="text-slate-500" />
              )}
            </button>

            <AnimatePresence>
              {activeMode === "libre" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 pt-0 space-y-5 border-t" style={{ borderColor: `${EMERALD}10` }}>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest mb-3 block" style={{ color: EMERALD }}>
                        Elige tu Eje
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(AXIS_CONFIG).map(([key, config]) => {
                          const Icon = config.icon;
                          const isSelected = selectedAxis === key;
                          return (
                            <motion.button
                              key={key}
                              onClick={() => setSelectedAxis(key as AxisType)}
                              className={cn(
                                "p-4 rounded-xl border-2 transition-all text-left",
                                isSelected ? "scale-[1.02]" : "hover:scale-[1.01]"
                              )}
                              animate={isSelected ? {
                                boxShadow: [
                                  `0 0 0px ${config.color}00`,
                                  `0 0 20px ${config.color}60`,
                                  `0 0 10px ${config.color}40`,
                                ]
                              } : { boxShadow: "none" }}
                              transition={{ duration: 0.8, repeat: isSelected ? Infinity : 0, repeatType: "reverse" }}
                              style={{
                                borderColor: isSelected ? config.color : "rgba(255,255,255,0.1)",
                                backgroundColor: isSelected ? `${config.color}15` : "transparent"
                              }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Icon size={18} style={{ color: config.color }} />
                                <span 
                                  className="text-[10px] font-black px-2 py-0.5 rounded"
                                  style={{ backgroundColor: `${config.color}30`, color: config.color }}
                                >
                                  +{config.points}
                                </span>
                              </div>
                              <p className="text-sm font-bold" style={{ color: config.color }}>{config.label}</p>
                              <p className="text-[9px] text-slate-500 mt-1">{config.description}</p>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest mb-3 block text-slate-500">
                        Tu Aprendizaje
                      </label>
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="¿Qué aprendizaje quieres registrar?"
                        rows={4}
                        className="w-full border rounded-xl px-4 py-4 text-white placeholder:text-slate-600 focus:outline-none transition-colors resize-none"
                        style={{ 
                          backgroundColor: "#050505", 
                          borderColor: inputText ? (selectedAxis ? AXIS_CONFIG[selectedAxis].color : EMERALD) : "rgba(255,255,255,0.1)",
                        }}
                      />
                      <p className="text-[10px] text-slate-600 mt-2 text-right">
                        {inputText.length} caracteres
                      </p>
                    </div>

                    <button
                      onClick={handleSave}
                      disabled={!inputText.trim() || !selectedAxis || saving}
                      className="w-full py-4 rounded-xl text-black font-black text-sm uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ 
                        background: `linear-gradient(135deg, ${EMERALD} 0%, ${AZURE} 100%)`,
                      }}
                    >
                      <Sparkles size={18} />
                      {saving ? "Guardando..." : "Registrar"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Modo Estructurado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border overflow-hidden"
            style={{ 
              backgroundColor: "#0a0a0a", 
              borderColor: activeMode === "estructurado" ? `${GOLD}60` : `${GOLD}20`,
              boxShadow: hasDraft ? `0 0 20px ${GOLD}20` : "none"
            }}
          >
            <button
              onClick={() => setActiveMode(activeMode === "estructurado" ? "none" : "estructurado")}
              className="w-full p-4 flex items-center justify-between transition-colors hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${GOLD}30 0%, ${VIOLET}30 100%)` }}
                >
                  <Crown size={18} style={{ color: GOLD }} />
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold text-white">
                    {hasDraft ? "Continuar Ciclo" : "Ciclo de Transformación"}
                  </span>
                  <p className="text-[10px] text-slate-500">
                    {hasDraft 
                      ? `Borrador guardado · ${filledSteps}/4 pasos` 
                      : "4 ejes guiados paso a paso (+100 PS)"
                    }
                  </p>
                </div>
              </div>
              {activeMode === "estructurado" ? (
                <ChevronUp size={20} style={{ color: GOLD }} />
              ) : (
                <ChevronDown size={20} className="text-slate-500" />
              )}
            </button>

            <AnimatePresence>
              {activeMode === "estructurado" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 pt-0 space-y-5 border-t" style={{ borderColor: `${GOLD}10` }}>
                  {/* Indicador de progreso */}
                  <div className="flex items-center justify-between gap-2 pt-4">
                    {AXIS_ORDER.map((axis, index) => {
                      const config = AXIS_CONFIG[axis];
                      const isCurrent = currentStep === index && !showSummary;
                      const isFilled = structuredTexts[axis].trim().length > 0;
                      const isPast = index < currentStep;
                      return (
                        <div key={axis} className="flex-1 flex flex-col items-center">
                          <motion.div
                            animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 1, repeat: isCurrent ? Infinity : 0 }}
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center border-2 mb-1 transition-all",
                              isCurrent && "ring-2 ring-offset-2 ring-offset-black",
                              isFilled || isPast ? "border-transparent" : "border-slate-700"
                            )}
                            style={{
                              backgroundColor: isFilled || isPast ? `${config.color}30` : "transparent",
                              borderColor: isCurrent ? config.color : undefined
                            }}
                          >
                            {isFilled ? (
                              <Sparkles size={16} style={{ color: config.color }} />
                            ) : (
                              <span className="text-xs font-bold" style={{ color: isCurrent ? config.color : "#666" }}>
                                {index + 1}
                              </span>
                            )}
                          </motion.div>
                          <span className={cn(
                            "text-[8px] uppercase tracking-wide font-bold text-center",
                            isCurrent ? "text-white" : "text-slate-600"
                          )} style={{ color: isCurrent ? config.color : undefined }}>
                            {config.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Contenido del paso actual o resumen */}
                  {showSummary ? (
                    <div className="space-y-4">
                      <h3 className="text-center text-lg font-black text-white mb-4">
                        Resumen de Transformación
                      </h3>
                      {AXIS_ORDER.map((axis) => {
                        const config = AXIS_CONFIG[axis];
                        const text = structuredTexts[axis].trim();
                        if (!text) return null;
                        return (
                          <div 
                            key={axis}
                            className="p-4 rounded-xl border"
                            style={{ borderColor: `${config.color}30`, backgroundColor: `${config.color}10` }}
                          >
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: config.color }}>
                              {config.label}: +{config.points} PS
                            </p>
                            <p className="text-sm text-white">{text}</p>
                          </div>
                        );
                      })}
                      <p className="text-center text-xs text-slate-500">
                        Total: +{AXIS_ORDER.reduce((sum, axis) => sum + (structuredTexts[axis].trim() ? AXIS_CONFIG[axis].points : 0), 0)} PS
                      </p>
                    </div>
                  ) : currentAxisConfig && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div 
                          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                          style={{ backgroundColor: `${currentAxisConfig.color}20` }}
                        >
                          {(() => {
                            const Icon = currentAxisConfig.icon;
                            return <Icon size={28} style={{ color: currentAxisConfig.color }} />;
                          })()}
                        </div>
                        <h3 className="text-lg font-black" style={{ color: currentAxisConfig.color }}>
                          {currentAxisConfig.label}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                          {currentAxisConfig.structuredQuestion}
                        </p>
                      </div>
                      
                      <textarea
                        value={structuredTexts[currentAxis]}
                        onChange={(e) => handleStructuredTextChange(e.target.value)}
                        placeholder="Escribe tu respuesta aquí..."
                        rows={4}
                        className="w-full border rounded-xl px-4 py-4 text-white placeholder:text-slate-600 focus:outline-none transition-colors resize-none"
                        style={{ 
                          backgroundColor: "#050505", 
                          borderColor: structuredTexts[currentAxis] ? currentAxisConfig.color : "rgba(255,255,255,0.1)",
                          minHeight: "120px"
                        }}
                      />
                      <p className="text-[10px] text-slate-600 text-right">
                        {structuredTexts[currentAxis].length} caracteres
                      </p>
                    </div>
                  )}

                  {/* Botones de navegación */}
                  <div className="flex gap-3">
                    {(currentStep > 0 || showSummary) && (
                      <button
                        onClick={handleStructuredBack}
                        className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold text-sm hover:bg-white/5 transition-colors"
                      >
                        Anterior
                      </button>
                    )}
                    
                    {showSummary ? (
                      <button
                        onClick={handleSaveStructured}
                        disabled={filledSteps === 0 || saving}
                        className="flex-1 py-3 rounded-xl text-black font-black text-sm uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ 
                          background: `linear-gradient(135deg, ${GOLD} 0%, ${VIOLET} 100%)`,
                        }}
                      >
                        <Sparkles size={16} />
                        {saving ? "Guardando..." : "Completar Ciclo"}
                      </button>
                    ) : (
                      <button
                        onClick={handleStructuredNext}
                        disabled={!structuredTexts[currentAxis]?.trim()}
                        className="flex-1 py-3 rounded-xl text-black font-black text-sm uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ 
                          background: structuredTexts[currentAxis]?.trim() 
                            ? `linear-gradient(135deg, ${currentAxisConfig?.color || GOLD} 0%, ${VIOLET} 100%)`
                            : "#333",
                        }}
                      >
                        {currentStep === 3 ? "Ver Resumen" : "Siguiente"}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-600">
                      Paso {showSummary ? "Resumen" : `${currentStep + 1} de 4`} · {filledSteps}/4 completados
                    </p>
                    {filledSteps > 0 && (
                      <button
                        onClick={handleDiscardDraft}
                        className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        Descartar
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
        </div>

        {entries.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
              Conquistas Registradas
            </h3>
            <div className="space-y-3">
              {entries.map((entry) => {
                const config = AXIS_CONFIG[entry.axis];
                const Icon = config?.icon || Lock;
                const isNew = entry.id === newEntryId;
                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, x: 80, scale: 0.95 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0, 
                      scale: 1,
                      boxShadow: isNew 
                        ? [`0 0 0px ${config?.color || GOLD}00`, `0 0 25px ${config?.color || GOLD}60`, `0 0 0px ${config?.color || GOLD}00`]
                        : "none"
                    }}
                    transition={{ 
                      duration: 0.5, 
                      ease: "easeOut",
                      boxShadow: { duration: 1.5, repeat: 0 }
                    }}
                    className="p-4 rounded-2xl border-l-4 relative group"
                    style={{ 
                      backgroundColor: "#0a0a0a",
                      borderLeftColor: config?.color || GOLD
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="p-2 rounded-lg shrink-0"
                        style={{ backgroundColor: `${config?.color || GOLD}20` }}
                      >
                        <Icon size={16} style={{ color: config?.color || GOLD }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span 
                            className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest"
                            style={{ 
                              backgroundColor: `${config?.color || GOLD}30`, 
                              color: config?.color || GOLD 
                            }}
                          >
                            [{config?.id || "HITO"}]
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: config?.color || GOLD }}>
                            +{entry.points}
                          </span>
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.p 
                            key={expandedEntries.has(entry.id) ? "expanded" : "collapsed"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                              "text-white text-sm leading-relaxed",
                              !expandedEntries.has(entry.id) && "line-clamp-2"
                            )}
                          >
                            {entry.text}
                          </motion.p>
                        </AnimatePresence>
                        {entry.text.length > 100 && (
                          <button
                            onClick={() => toggleExpanded(entry.id)}
                            className="flex items-center gap-1 mt-2 text-[10px] font-bold transition-colors hover:opacity-80"
                            style={{ color: config?.color || GOLD }}
                          >
                            {expandedEntries.has(entry.id) ? (
                              <>
                                <ChevronUp size={12} />
                                Contraer
                              </>
                            ) : (
                              <>
                                <ChevronDown size={12} />
                                Expandir
                              </>
                            )}
                          </button>
                        )}
                        <p className="text-[9px] text-slate-600 mt-2">
                          {entry.createdAt.toLocaleDateString("es-ES", { 
                            day: "numeric", 
                            month: "short", 
                            year: "numeric" 
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        style={{ backgroundColor: "rgba(239,68,68,0.2)" }}
                      >
                        <X size={12} className="text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {entries.length === 0 && !isFormOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div 
              className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: `${GOLD}10`, border: `1px solid ${GOLD}20` }}
            >
              <Lock size={36} style={{ color: GOLD, opacity: 0.5 }} />
            </div>
            <p className="text-slate-500">Tu bóveda aguarda tu primera victoria.</p>
            <p className="text-xs text-slate-600 mt-1">
              Inscribe tu primera conquista sobre la realidad.
            </p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="mt-4 px-6 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ backgroundColor: `${GOLD}20`, color: GOLD }}
            >
              Comenzar
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
