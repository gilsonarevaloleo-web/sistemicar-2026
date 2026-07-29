import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Scan,
  Brain,
  Zap,
  DollarSign,
  Target,
  Users,
  Sparkles,
  ChevronRight,
  History,
  Eye,
  Loader2,
  Heart,
  ArrowRight,
} from "lucide-react";
import * as api from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";

const SCAN_QUESTION = "¿Cómo te sientes en este momento? Describe tu estado mental, emocional, físico y tus pensamientos sobre tu situación actual...";

const levelColors: Record<string, string> = {
  bajo: "from-red-500 to-red-600",
  medio: "from-amber-400 to-amber-500",
  alto: "from-amber-300 via-yellow-400 to-amber-500",
};

const levelGlow: Record<string, string> = {
  bajo: "shadow-red-500/50",
  medio: "shadow-amber-400/50",
  alto: "shadow-yellow-400/50",
};

function getScoreColor(score: number): string {
  if (score < 40) return "from-red-500 to-red-600";
  if (score < 70) return "from-amber-400 to-amber-500";
  return "from-amber-300 via-yellow-400 to-amber-500";
}

function getScoreGlow(score: number): string {
  if (score < 40) return "shadow-red-500/40";
  if (score < 70) return "shadow-amber-400/40";
  return "shadow-yellow-400/40";
}

function DimensionBar({ 
  label, 
  icon, 
  score, 
  analysis, 
  level, 
  delay 
}: { 
  label: string; 
  icon: React.ReactNode; 
  score: number; 
  analysis: string; 
  level: string;
  delay: number;
}) {
  const colorClass = levelColors[level] || levelColors.medio;
  const glowClass = levelGlow[level] || levelGlow.medio;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">{icon}</span>
          <span className="font-medium text-slate-200">{label}</span>
        </div>
        <span className={cn(
          "text-sm font-bold px-2 py-0.5 rounded-full uppercase text-[10px]",
          level === "bajo" && "bg-red-500/20 text-red-400",
          level === "medio" && "bg-amber-500/20 text-amber-400",
          level === "alto" && "bg-yellow-500/20 text-yellow-300"
        )}>
          {level}
        </span>
      </div>
      
      <div className="relative h-3 bg-slate-800/80 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ delay: delay + 0.2, duration: 1, ease: "easeOut" }}
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r",
            colorClass,
            "shadow-lg",
            glowClass
          )}
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0"
          />
        </motion.div>
        
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/80">
          {score}
        </span>
      </div>
      
      <p className="text-[11px] text-slate-400 leading-relaxed pl-1">
        {analysis}
      </p>
    </motion.div>
  );
}

function TotalScoreRing({ score, honestyBonus }: { score: number; honestyBonus: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const colorClass = getScoreColor(score);
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative flex items-center justify-center"
    >
      <svg width="180" height="180" className="transform -rotate-90">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="transparent"
          stroke="rgba(100, 116, 139, 0.2)"
          strokeWidth="10"
        />
        <motion.circle
          cx="90"
          cy="90"
          r={radius}
          fill="transparent"
          stroke="url(#scoreGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="drop-shadow-lg"
          style={{ filter: `drop-shadow(0 0 10px ${score < 40 ? '#ef4444' : score < 70 ? '#f59e0b' : '#fbbf24'})` }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {score < 40 ? (
              <>
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </>
            ) : score < 70 ? (
              <>
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </>
            )}
          </linearGradient>
        </defs>
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-5xl font-black text-white"
        >
          {score}
        </motion.span>
        <span className="text-xs text-slate-400 font-medium">ENERGÍA</span>
        {honestyBonus > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, type: "spring" }}
            className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30"
          >
            <Heart size={10} className="text-emerald-400" />
            <span className="text-[9px] font-bold text-emerald-400">+{honestyBonus} HONESTIDAD</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function LaserScanAnimation() {
  return (
    <div className="relative w-full h-48 flex items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-32 h-32 rounded-full border-2 border-cyan-500/30 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border border-cyan-400/50 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center"
            >
              <Brain className="w-8 h-8 text-cyan-400" />
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      <motion.div
        animate={{ 
          y: [-80, 80, -80],
          opacity: [0, 1, 0]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
        style={{ boxShadow: "0 0 20px 5px rgba(34, 211, 238, 0.4)" }}
      />
      
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute w-40 h-40"
      >
        <div className="absolute top-0 left-1/2 w-1 h-6 bg-gradient-to-b from-cyan-400 to-transparent transform -translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-1 h-6 bg-gradient-to-t from-cyan-400 to-transparent transform -translate-x-1/2" />
        <div className="absolute left-0 top-1/2 w-6 h-1 bg-gradient-to-r from-cyan-400 to-transparent transform -translate-y-1/2" />
        <div className="absolute right-0 top-1/2 w-6 h-1 bg-gradient-to-l from-cyan-400 to-transparent transform -translate-y-1/2" />
      </motion.div>
    </div>
  );
}

function OracleSuggestions({ 
  suggestions, 
  totalScore 
}: { 
  suggestions: string[]; 
  totalScore: number;
}) {
  const [, navigate] = useLocation();
  
  const getSuggestionAction = (suggestion: string) => {
    const lower = suggestion.toLowerCase();
    if (lower.includes("esperanza") || lower.includes("reconect")) {
      return { route: "/esperanza", label: "Ir a Esperanza", icon: <Heart size={14} /> };
    }
    if (lower.includes("plan") || lower.includes("estructur")) {
      return { route: "/jornada-v4", label: "Ir a Jornada", icon: <Target size={14} /> };
    }
    if (lower.includes("oráculo") || lower.includes("consult")) {
      return { route: "/oraculo", label: "Consultar Oráculo", icon: <Brain size={14} /> };
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-white/5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
          Sugerencias del Oráculo
        </h3>
      </div>
      
      <div className="space-y-3">
        {suggestions.map((suggestion, i) => {
          const action = getSuggestionAction(suggestion);
          
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.7 + i * 0.2 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 group"
            >
              <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-slate-300">{suggestion}</p>
                {action && (
                  <button
                    onClick={() => navigate(action.route)}
                    className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
                    data-testid={`button-suggestion-${i}`}
                  >
                    {action.icon}
                    {action.label}
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function Escaner() {
  const [inputText, setInputText] = useState("");
  const [scanResult, setScanResult] = useState<api.EnergyScanResult | null>(null);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: latestScan } = useQuery({
    queryKey: ["latest-energy-scan"],
    queryFn: api.getLatestEnergyScan,
  });

  const scanMutation = useMutation({
    mutationFn: api.performEnergyScan,
    onSuccess: (data) => {
      setScanResult(data);
      queryClient.invalidateQueries({ queryKey: ["latest-energy-scan"] });
      if (data.honestyDetected && data.honestyMessage) {
        toast.success(data.honestyMessage, { duration: 5000 });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al realizar el escaneo");
    },
  });

  const handleScan = () => {
    if (inputText.trim().length < 10) {
      toast.error("Escribe al menos 10 caracteres para un análisis preciso");
      return;
    }
    scanMutation.mutate(inputText.trim());
  };

  const handleNewScan = () => {
    setScanResult(null);
    setInputText("");
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto min-h-screen pb-32">
      <PageHeader />

      <AnimatePresence mode="wait">
        {scanMutation.isPending ? (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-8"
          >
            <LaserScanAnimation />
            <div className="text-center mt-4">
              <p className="text-cyan-400 font-medium animate-pulse">
                Escaneando patrones biopsíquicos...
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Analizando 4 dimensiones de conciencia
              </p>
            </div>
          </motion.div>
        ) : scanResult ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6 space-y-6"
          >
            <div className="flex justify-center">
              <TotalScoreRing 
                score={scanResult.totalScore} 
                honestyBonus={scanResult.honestyBonus} 
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
            >
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "{scanResult.oracleConclusion}"
              </p>
            </motion.div>

            <div className="space-y-5 p-4 rounded-2xl bg-card border border-white/5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Eye size={14} />
                Análisis por Dimensión
              </h3>
              
              <DimensionBar
                label="Social / Ego"
                icon={<Users size={16} />}
                score={scanResult.dimensionAnalysis.socialEgo.score}
                analysis={scanResult.dimensionAnalysis.socialEgo.analysis}
                level={scanResult.dimensionAnalysis.socialEgo.level}
                delay={0.3}
              />
              
              <DimensionBar
                label="Resistencia Biológica"
                icon={<Zap size={16} />}
                score={scanResult.dimensionAnalysis.biologicalResistance.score}
                analysis={scanResult.dimensionAnalysis.biologicalResistance.analysis}
                level={scanResult.dimensionAnalysis.biologicalResistance.level}
                delay={0.5}
              />
              
              <DimensionBar
                label="Frecuencia Financiera"
                icon={<DollarSign size={16} />}
                score={scanResult.dimensionAnalysis.financialFrequency.score}
                analysis={scanResult.dimensionAnalysis.financialFrequency.analysis}
                level={scanResult.dimensionAnalysis.financialFrequency.level}
                delay={0.7}
              />
              
              <DimensionBar
                label="Enfoque Arquitecto"
                icon={<Target size={16} />}
                score={scanResult.dimensionAnalysis.architectFocus.score}
                analysis={scanResult.dimensionAnalysis.architectFocus.analysis}
                level={scanResult.dimensionAnalysis.architectFocus.level}
                delay={0.9}
              />
            </div>

            <OracleSuggestions 
              suggestions={scanResult.oracleSuggestions} 
              totalScore={scanResult.totalScore}
            />

            <div className="flex gap-3">
              <button
                onClick={handleNewScan}
                className="flex-1 py-3 px-4 rounded-xl bg-primary/10 border border-primary/30 text-primary font-medium hover:bg-primary/20 transition-colors"
                data-testid="button-new-scan"
              >
                <Scan className="w-4 h-4 inline mr-2" />
                Nuevo Escaneo
              </button>
              <button
                onClick={() => navigate("/espejo")}
                className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-colors"
                data-testid="button-go-console"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6 space-y-6"
          >
            <div className="p-4 rounded-2xl bg-card border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <Scan className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-200">
                  Iniciar Escaneo
                </h3>
              </div>
              
              <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                {SCAN_QUESTION}
              </p>
              
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe aquí tu estado actual... Sé honesto, el escaneo recompensa la transparencia."
                className="w-full h-40 p-4 rounded-xl bg-slate-900/50 border border-white/10 text-slate-200 placeholder:text-slate-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                data-testid="input-scan-text"
              />
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-slate-500">
                  {inputText.length} caracteres (mínimo 10)
                </span>
                <button
                  onClick={handleScan}
                  disabled={inputText.trim().length < 10 || scanMutation.isPending}
                  className={cn(
                    "flex items-center gap-2 py-2.5 px-5 rounded-xl font-medium transition-all",
                    inputText.trim().length >= 10
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  )}
                  data-testid="button-start-scan"
                >
                  {scanMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Scan className="w-4 h-4" />
                  )}
                  Escanear
                </button>
              </div>
            </div>

            {latestScan && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Último Escaneo
                  </h4>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center text-lg font-black",
                    "bg-gradient-to-br",
                    getScoreColor(latestScan.totalScore),
                    "shadow-lg",
                    getScoreGlow(latestScan.totalScore)
                  )}>
                    {latestScan.totalScore}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-300 line-clamp-2">
                      {latestScan.oracleConclusion}
                    </p>
                    {latestScan.createdAt && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        {new Date(latestScan.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
              <h4 className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                ¿Qué analiza el Escáner?
              </h4>
              <ul className="space-y-2 text-[11px] text-slate-400">
                <li className="flex items-center gap-2">
                  <Users size={12} className="text-slate-500" />
                  <span><strong className="text-slate-300">Social/Ego:</strong> Lenguaje de víctima vs responsabilidad</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap size={12} className="text-slate-500" />
                  <span><strong className="text-slate-300">Resistencia:</strong> Cansancio como derrota vs desafío</span>
                </li>
                <li className="flex items-center gap-2">
                  <DollarSign size={12} className="text-slate-500" />
                  <span><strong className="text-slate-300">Financiera:</strong> Mentalidad de escasez vs abundancia</span>
                </li>
                <li className="flex items-center gap-2">
                  <Target size={12} className="text-slate-500" />
                  <span><strong className="text-slate-300">Arquitecto:</strong> Caos mental vs enfoque estratégico</span>
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-emerald-400/80 flex items-center gap-1">
                <Heart size={10} />
                +5 puntos bonus por sinceridad consciente
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
