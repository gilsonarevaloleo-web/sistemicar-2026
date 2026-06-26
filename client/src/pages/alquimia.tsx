import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Flame,
  Crown,
  Sparkles,
  Share2,
  Check,
  RotateCcw,
  Eye,
  Target,
  Zap,
  BookOpen,
  Trophy,
  Globe,
  Download,
  Loader2,
  Star
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import html2canvas from "html2canvas";
import { 
  subscribeToProgression, 
  UserProgression,
  subscribeToEnergyLogs,
  EnergyLog,
  addAlquimiaEntry,
  subscribeToAlquimiaEntries,
  subscribeToPublicAlquimia,
  AlquimiaEntry,
  addPrincipioMaestro,
  awardSovereigntyPoints
} from "@/lib/persistence";
import { cn } from "@/lib/utils";
import { ManualTriggerButton, MasterManualDrawer } from "@/components/master-manual-drawer";
import { useViewTransitionShield } from "@/hooks/useViewTransitionShield";
import { useJornadaActiveVehicleIds } from "@/hooks/useModularStoreSelectors";

const GOLD = "#D4AF37";
const VIOLET = "#7C3AED";
const PURPLE = "#A855F7";
const RED = "#EF4444";
const BLUE = "#3B82F6";

const AXES = [
  { 
    id: "observacion", 
    label: "OBSERVACIÓN", 
    color: PURPLE, 
    points: 8,
    icon: Eye,
    placeholder: "¿Qué observaste? Describe la situación con claridad...",
    description: "Enfoque - Puntería hacia la verdad"
  },
  { 
    id: "crisis", 
    label: "CRISIS", 
    color: RED, 
    points: 8,
    icon: Zap,
    placeholder: "¿Cuál fue el conflicto o tensión?",
    description: "Conflicto - La resistencia que enfrentaste"
  },
  { 
    id: "leccion", 
    label: "LECCIÓN", 
    color: BLUE, 
    points: 8,
    icon: BookOpen,
    placeholder: "¿Qué aprendiste de esta experiencia?",
    description: "Pasos - El conocimiento extraído"
  },
  { 
    id: "maestria", 
    label: "MAESTRÍA", 
    color: VIOLET, 
    points: 8,
    icon: Trophy,
    placeholder: "¿Cómo aplicarás esto en el futuro?",
    description: "Alcance - Tu nueva capacidad"
  }
];

interface FormData {
  observacion: string;
  crisis: string;
  leccion: string;
  maestria: string;
  oro: string;
}

function CircularProgress({ percentage, size = 120 }: { percentage: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(212, 175, 55, 0.1)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={GOLD}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${GOLD}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-3xl font-black"
          style={{ color: GOLD }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {Math.round(percentage)}%
        </motion.span>
        <span className="text-[8px] uppercase tracking-widest text-slate-500">
          Alquimia
        </span>
      </div>
    </div>
  );
}

function PointsCounter({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
      <Sparkles size={14} style={{ color: GOLD }} />
      <span className="text-sm font-black" style={{ color: GOLD }}>
        {current}/{total}
      </span>
      <span className="text-[10px] text-slate-500 uppercase">pts</span>
    </div>
  );
}

function WisdomCard({ entry, showUser = false }: { entry: AlquimiaEntry; showUser?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <motion.div 
      className="rounded-2xl border cursor-pointer overflow-hidden"
      style={{ backgroundColor: "#0a0a0a", borderColor: expanded ? `${GOLD}40` : `${GOLD}20` }}
      onClick={() => setExpanded(!expanded)}
      layout
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crown size={14} style={{ color: GOLD }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: GOLD }}>
              Frase de Oro
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${GOLD}20`, color: GOLD }}>
              {entry.alquimiaScore}%
            </span>
            <span className="text-[10px] text-slate-500">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>
        <p className="text-white text-sm font-medium italic mb-3">"{entry.oro}"</p>
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          {showUser && <span>@{entry.userName || "Alquimista"}</span>}
          <span>{new Date(entry.createdAt).toLocaleDateString('es-ES')}</span>
          <span className="font-bold" style={{ color: GOLD }}>+{entry.totalPoints} pts</span>
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t"
            style={{ borderColor: `${GOLD}20` }}
          >
            <div className="p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                Proceso de Transmutación
              </div>
              
              {entry.observacion && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${PURPLE}10`, borderLeft: `3px solid ${PURPLE}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Eye size={10} style={{ color: PURPLE }} />
                    <span className="text-[9px] font-bold uppercase" style={{ color: PURPLE }}>Observación</span>
                  </div>
                  <p className="text-xs text-slate-300">{entry.observacion}</p>
                </div>
              )}
              
              {entry.crisis && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${RED}10`, borderLeft: `3px solid ${RED}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={10} style={{ color: RED }} />
                    <span className="text-[9px] font-bold uppercase" style={{ color: RED }}>Crisis</span>
                  </div>
                  <p className="text-xs text-slate-300">{entry.crisis}</p>
                </div>
              )}
              
              {entry.leccion && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${BLUE}10`, borderLeft: `3px solid ${BLUE}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={10} style={{ color: BLUE }} />
                    <span className="text-[9px] font-bold uppercase" style={{ color: BLUE }}>Lección</span>
                  </div>
                  <p className="text-xs text-slate-300">{entry.leccion}</p>
                </div>
              )}
              
              {entry.maestria && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${VIOLET}10`, borderLeft: `3px solid ${VIOLET}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy size={10} style={{ color: VIOLET }} />
                    <span className="text-[9px] font-bold uppercase" style={{ color: VIOLET }}>Maestría</span>
                  </div>
                  <p className="text-xs text-slate-300">{entry.maestria}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Alquimia() {
  const { user } = useAuthContext();
  useViewTransitionShield();
  useJornadaActiveVehicleIds(user?.uid);
  const [formData, setFormData] = useState<FormData>({
    observacion: "",
    crisis: "",
    leccion: "",
    maestria: "",
    oro: ""
  });
  const [isValidating, setIsValidating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [alquimiaScore, setAlquimiaScore] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  const [marcarSello, setMarcarSello] = useState(false);
  const [copied, setCopied] = useState(false);
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [energyLogs, setEnergyLogs] = useState<EnergyLog[]>([]);
  const [myEntries, setMyEntries] = useState<AlquimiaEntry[]>([]);
  const [publicEntries, setPublicEntries] = useState<AlquimiaEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"crear" | "mis-oros" | "muro">("crear");
  const [savedEntry, setSavedEntry] = useState<AlquimiaEntry | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deducciones, setDeducciones] = useState<string | null>(null);
  const [ejeFlojo, setEjeFlojo] = useState<string | null>(null);
  const [showParticles, setShowParticles] = useState(false);
  const [showManualDrawer, setShowManualDrawer] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToAlquimiaEntries(
      user.uid,
      (data) => setMyEntries(data),
      (error) => console.error(error)
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const unsubscribe = subscribeToPublicAlquimia(
      (data) => setPublicEntries(data),
      (error) => console.error(error)
    );
    return unsubscribe;
  }, []);

  const calculateCurrentPoints = () => {
    let points = 0;
    if (formData.observacion.trim().length >= 10) points += 8;
    if (formData.crisis.trim().length >= 10) points += 8;
    if (formData.leccion.trim().length >= 10) points += 8;
    if (formData.maestria.trim().length >= 10) points += 8;
    if (formData.oro.trim().length >= 10) points += 8;
    return points;
  };

  const canTransmute = 
    formData.observacion.trim().length >= 10 &&
    formData.crisis.trim().length >= 10 &&
    formData.leccion.trim().length >= 10 &&
    formData.maestria.trim().length >= 10 &&
    formData.oro.trim().length >= 10;

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTransmute = async () => {
    if (!user || !canTransmute) return;

    setIsValidating(true);
    setFeedback(null);
    setDeducciones(null);
    setEjeFlojo(null);
    setShowParticles(false);

    try {
      const response = await fetch("/api/alquimia/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observacion: formData.observacion,
          crisis: formData.crisis,
          leccion: formData.leccion,
          maestria: formData.maestria,
          oro: formData.oro
        })
      });

      const data = await response.json();
      const rawScore = data.score;
      const score =
        typeof rawScore === "number" && Number.isFinite(rawScore)
          ? rawScore
          : typeof rawScore === "string" && rawScore.trim() !== "" && Number.isFinite(Number(rawScore))
            ? Number(rawScore)
            : null;

      if (!response.ok || score === null) {
        const msg =
          typeof data.feedback === "string" && data.feedback.trim()
            ? data.feedback
            : "El auditor no está disponible. Reintenta en unos minutos.";
        toast.error(msg, {
          style: { backgroundColor: "#1a1a1a", border: `1px solid ${GOLD}`, color: GOLD }
        });
        return;
      }

      setAlquimiaScore(score);
      setFeedback(data.feedback || null);
      setDeducciones(data.deducciones || null);
      setEjeFlojo(data.ejeFlojo || null);
      
      if (score === 100) {
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 5000);
      }

      const entry = await addAlquimiaEntry(user.uid, {
        observacion: formData.observacion,
        crisis: formData.crisis,
        leccion: formData.leccion,
        maestria: formData.maestria,
        oro: formData.oro,
        alquimiaScore: score,
        totalPoints: 20,
        isPublic: isPublic,
        userName: user.displayName || user.email?.split("@")[0] || "Alquimista"
      });

      setSavedEntry(entry);
      setShowResult(true);
      try {
        await awardSovereigntyPoints(user.uid, 20, "Alquimia: Transmutación completada");
      } catch {
        toast.error("Transmutación guardada; PS se sincronizarán al reconectar.", {
          style: { backgroundColor: "#1a1a1a", border: `1px solid ${GOLD}`, color: GOLD }
        });
      }
      if (marcarSello) {
        await addPrincipioMaestro({
          texto: formData.oro,
          fuente: "sello_soberania",
          moduloOrigen: "alquimia"
        });
      }
      toast.success(`¡Transmutación completada! +20 pts`, {
        style: { backgroundColor: "#1a1a1a", border: `1px solid ${GOLD}`, color: GOLD }
      });
    } catch (error) {
      console.error("Error validating:", error);
      toast.error("No se pudo conectar con el auditor. Comprueba tu conexión e inténtalo de nuevo.", {
        style: { backgroundColor: "#1a1a1a", border: `1px solid ${GOLD}`, color: GOLD }
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleExportImage = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        removeContainer: true,
        foreignObjectRendering: false,
        windowWidth: cardRef.current.scrollWidth,
        windowHeight: cardRef.current.scrollHeight
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `sistemicar-alquimia-${Date.now()}.png`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success("Imagen descargada");
        } else {
          toast.error("Error al generar imagen");
        }
      }, "image/png", 1.0);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error al generar imagen");
    }
  };

  const handleShare = async () => {
    const shareText = `✨ TRANSMUTACIÓN ALQUÍMICA | SISTEMICAR

👁️ OBSERVACIÓN:
${formData.observacion}

⚡ CRISIS:
${formData.crisis}

📖 LECCIÓN:
${formData.leccion}

🏆 MAESTRÍA:
${formData.maestria}

👑 EL ORO:
"${formData.oro}"

📊 Score: ${alquimiaScore}% | +20 pts
https://sistemicar.app

#Sistemicar #Alquimia #Transmutación`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "Mi Frase de Oro - Sistemicar", text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        toast.success("Texto copiado al portapapeles");
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Texto copiado al portapapeles");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const resetForm = () => {
    setFormData({ observacion: "", crisis: "", leccion: "", maestria: "", oro: "" });
    setShowResult(false);
    setAlquimiaScore(0);
    setIsPublic(false);
    setMarcarSello(false);
    setSavedEntry(null);
    setFeedback(null);
    setDeducciones(null);
    setEjeFlojo(null);
    setShowParticles(false);
  };

  const currentPoints = calculateCurrentPoints();

  return (
    <div className="min-h-screen p-4 pb-32" style={{ backgroundColor: "#020202" }}>
      <div className="max-w-lg mx-auto">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 pt-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame size={20} style={{ color: GOLD }} />
              <h1 className="text-2xl font-black text-white">ALQUIMIA</h1>
            </div>
            <p className="text-xs text-slate-500">Transmuta experiencia en sabiduría</p>
          </div>
          <div className="flex items-center gap-2">
            <ManualTriggerButton manualType="alquimia" />
            <PointsCounter current={currentPoints} total={20} />
          </div>
        </motion.div>

        {/* TABS */}
        <div className="flex gap-2 mb-6 p-1 rounded-xl bg-white/5">
          <button
            onClick={() => setActiveTab("crear")}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all",
              activeTab === "crear" 
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white" 
                : "text-slate-500 hover:text-white"
            )}
          >
            <Sparkles size={12} className="inline mr-1" /> Crear
          </button>
          <button
            onClick={() => setActiveTab("mis-oros")}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all",
              activeTab === "mis-oros" 
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white" 
                : "text-slate-500 hover:text-white"
            )}
          >
            <Crown size={12} className="inline mr-1" /> Mis Oros
          </button>
          <button
            onClick={() => setActiveTab("muro")}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all",
              activeTab === "muro" 
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white" 
                : "text-slate-500 hover:text-white"
            )}
          >
            <Globe size={12} className="inline mr-1" /> Muro
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "crear" && !showResult && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* 4 EJES */}
              {AXES.map((axis, index) => {
                const Icon = axis.icon;
                const value = formData[axis.id as keyof FormData];
                const isFilled = value.trim().length >= 10;
                
                return (
                  <motion.div
                    key={axis.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-2xl border p-4"
                    style={{ 
                      backgroundColor: "#0a0a0a",
                      borderColor: isFilled ? axis.color : "rgba(255,255,255,0.1)"
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{ color: axis.color }} />
                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: axis.color }}>
                          {axis.label}
                        </span>
                      </div>
                      <span 
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded transition-all",
                          isFilled ? "opacity-100" : "opacity-40"
                        )}
                        style={{ backgroundColor: `${axis.color}20`, color: axis.color }}
                      >
                        +{axis.points} pts
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-600 mb-2">{axis.description}</p>
                    <textarea
                      value={value}
                      onChange={(e) => handleFieldChange(axis.id as keyof FormData, e.target.value)}
                      placeholder={axis.placeholder}
                      rows={2}
                      className="w-full bg-transparent text-white text-sm placeholder:text-slate-600 focus:outline-none resize-none"
                    />
                  </motion.div>
                );
              })}

              {/* EL ORO */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl border p-4"
                style={{ 
                  backgroundColor: "#0a0a0a",
                  borderColor: formData.oro.trim().length >= 10 ? GOLD : "rgba(255,255,255,0.1)",
                  boxShadow: formData.oro.trim().length >= 10 ? `0 0 20px ${GOLD}30` : "none"
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown size={16} style={{ color: GOLD }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                      EL ORO — Frase de Síntesis
                    </span>
                  </div>
                  <span 
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded transition-all",
                      formData.oro.trim().length >= 10 ? "opacity-100" : "opacity-40"
                    )}
                    style={{ backgroundColor: `${GOLD}20`, color: GOLD }}
                  >
                    +4 pts
                  </span>
                </div>
                <p className="text-[9px] text-slate-600 mb-2">
                  Destila toda tu experiencia en una frase sabia y poderosa
                </p>
                <textarea
                  value={formData.oro}
                  onChange={(e) => handleFieldChange("oro", e.target.value)}
                  placeholder="Escribe tu frase de oro aquí... (mín. 10 caracteres)"
                  rows={2}
                  className="w-full bg-transparent text-white text-sm placeholder:text-slate-600 focus:outline-none resize-none font-medium"
                />
              </motion.div>

              {/* TOGGLE PÚBLICO */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-slate-400" />
                  <span className="text-xs text-slate-400">Publicar en el Muro de Sabiduría</span>
                </div>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    isPublic ? "bg-amber-500" : "bg-slate-700"
                  )}
                >
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all",
                      isPublic ? "left-5" : "left-0.5"
                    )}
                  />
                </button>
              </div>

              {/* SELLO DE SOBERANÍA */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-2">
                  <Star size={14} className={marcarSello ? "text-amber-400" : "text-slate-400"} fill={marcarSello ? "currentColor" : "none"} />
                  <span className="text-xs text-slate-400">Sellar como Principio Maestro</span>
                </div>
                <button
                  onClick={() => setMarcarSello(!marcarSello)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    marcarSello ? "bg-amber-500" : "bg-slate-700"
                  )}
                  data-testid="toggle-sello-alquimia"
                >
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all",
                      marcarSello ? "left-5" : "left-0.5"
                    )}
                  />
                </button>
              </div>

              {/* BOTÓN TRANSMUTAR */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={handleTransmute}
                disabled={!canTransmute || isValidating}
                className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ 
                  background: canTransmute 
                    ? `linear-gradient(135deg, ${GOLD} 0%, #B8860B 100%)`
                    : "rgba(255,255,255,0.1)",
                  color: canTransmute ? "#000" : "#666"
                }}
                whileHover={canTransmute ? { scale: 1.02 } : {}}
                whileTap={canTransmute ? { scale: 0.98 } : {}}
              >
                {isValidating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Validando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Transmutar ({currentPoints}/20 pts)
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {activeTab === "crear" && showResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 relative"
            >
              {showParticles && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                  {[...Array(50)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: GOLD,
                        left: `${Math.random() * 100}%`,
                        top: "-10px",
                        boxShadow: `0 0 10px ${GOLD}, 0 0 20px ${GOLD}`
                      }}
                      animate={{
                        y: ["0vh", "110vh"],
                        x: [0, (Math.random() - 0.5) * 100],
                        opacity: [1, 0.8, 0],
                        scale: [1, 0.5]
                      }}
                      transition={{
                        duration: 3 + Math.random() * 2,
                        delay: Math.random() * 2,
                        ease: "easeIn"
                      }}
                    />
                  ))}
                </div>
              )}
              {/* CARD EXPORTABLE - PROCESO COMPLETO */}
              <div 
                ref={cardRef}
                className="rounded-2xl border p-5"
                style={{ 
                  backgroundColor: "#0a0a0a",
                  borderColor: `${GOLD}30`
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flame size={16} style={{ color: GOLD }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                      Transmutación Alquímica
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black" style={{ color: GOLD }}>{alquimiaScore}%</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${PURPLE}10`, borderLeft: `3px solid ${PURPLE}` }}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Eye size={10} style={{ color: PURPLE }} />
                      <span className="text-[8px] font-bold uppercase" style={{ color: PURPLE }}>Observación</span>
                    </div>
                    <p className="text-[10px] text-slate-300">{formData.observacion}</p>
                  </div>
                  
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${RED}10`, borderLeft: `3px solid ${RED}` }}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Zap size={10} style={{ color: RED }} />
                      <span className="text-[8px] font-bold uppercase" style={{ color: RED }}>Crisis</span>
                    </div>
                    <p className="text-[10px] text-slate-300">{formData.crisis}</p>
                  </div>
                  
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${BLUE}10`, borderLeft: `3px solid ${BLUE}` }}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <BookOpen size={10} style={{ color: BLUE }} />
                      <span className="text-[8px] font-bold uppercase" style={{ color: BLUE }}>Lección</span>
                    </div>
                    <p className="text-[10px] text-slate-300">{formData.leccion}</p>
                  </div>
                  
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${VIOLET}10`, borderLeft: `3px solid ${VIOLET}` }}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Trophy size={10} style={{ color: VIOLET }} />
                      <span className="text-[8px] font-bold uppercase" style={{ color: VIOLET }}>Maestría</span>
                    </div>
                    <p className="text-[10px] text-slate-300">{formData.maestria}</p>
                  </div>
                </div>

                <div 
                  className="p-3 rounded-xl mb-3"
                  style={{ backgroundColor: `${GOLD}15`, border: `1px solid ${GOLD}40` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Crown size={14} style={{ color: GOLD }} />
                    <span className="text-[9px] font-bold uppercase" style={{ color: GOLD }}>El Oro — Frase de Síntesis</span>
                  </div>
                  <p className="text-white text-sm font-medium italic">"{formData.oro}"</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame size={10} style={{ color: GOLD }} />
                    <span className="text-[9px] text-slate-500">SISTEMICAR.APP</span>
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: GOLD }}>+20 pts</span>
                </div>
              </div>

              {(feedback || deducciones) && alquimiaScore < 90 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border"
                  style={{ 
                    backgroundColor: "#0a0a0a", 
                    borderColor: ejeFlojo ? `${RED}40` : `${GOLD}20` 
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={14} style={{ color: RED }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: RED }}>
                      Auditoría del Manómetro
                    </span>
                  </div>
                  
                  {deducciones && (
                    <div className="mb-3 p-2 rounded-lg bg-red-900/20 border border-red-500/20">
                      <p className="text-[10px] text-red-400 font-medium">{deducciones}</p>
                    </div>
                  )}
                  
                  {feedback && (
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${GOLD}10` }}>
                      <p className="text-xs text-slate-300">{feedback}</p>
                    </div>
                  )}
                  
                  {ejeFlojo && (
                    <div className="mt-3 text-center">
                      <span className="text-[9px] text-slate-500">Eje a fortalecer: </span>
                      <span className="text-xs font-bold uppercase" style={{ color: RED }}>{ejeFlojo}</span>
                    </div>
                  )}
                  
                  {alquimiaScore < 60 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mt-4 p-3 rounded-xl border text-center"
                      style={{ backgroundColor: `${GOLD}10`, borderColor: `${GOLD}30` }}
                    >
                      <p className="text-xs text-slate-400 mb-2">
                        Veo que la estructura está floja. ¿Deseas consultar el <strong style={{ color: GOLD }}>Manual de Maestría</strong> para elevar la pureza de tu registro?
                      </p>
                      <button
                        onClick={() => setShowManualDrawer(true)}
                        className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                        style={{ backgroundColor: `${GOLD}20`, color: GOLD }}
                      >
                        <BookOpen size={12} className="inline mr-1" />
                        Abrir Manual de Alquimia
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {alquimiaScore >= 90 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-2xl border text-center"
                  style={{ backgroundColor: `${GOLD}10`, borderColor: `${GOLD}40` }}
                >
                  <Crown size={24} className="mx-auto mb-2" style={{ color: GOLD }} />
                  <p className="text-sm font-bold text-white mb-1">Transmutación de Alta Calidad</p>
                  <p className="text-xs text-slate-400">{feedback || "Tu proceso alquímico demuestra coherencia y profundidad."}</p>
                </motion.div>
              )}

              {/* BOTONES DE ACCIÓN */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExportImage}
                  className="py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  style={{ backgroundColor: `${GOLD}20`, color: GOLD }}
                >
                  <Download size={16} />
                  Descargar
                </button>
                <button
                  onClick={handleShare}
                  className="py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  style={{ backgroundColor: `${GOLD}20`, color: GOLD }}
                >
                  {copied ? <Check size={16} /> : <Share2 size={16} />}
                  {copied ? "Copiado" : "Compartir"}
                </button>
              </div>

              <button
                onClick={resetForm}
                className="w-full py-3 rounded-xl text-sm text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                Nueva Transmutación
              </button>
            </motion.div>
          )}

          {activeTab === "mis-oros" && (
            <motion.div
              key="mis-oros"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {myEntries.length === 0 ? (
                <div className="text-center py-12">
                  <Crown size={40} className="mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-500 text-sm">Aún no tienes frases de oro</p>
                  <button
                    onClick={() => setActiveTab("crear")}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-bold"
                    style={{ backgroundColor: `${GOLD}20`, color: GOLD }}
                  >
                    Crear tu primera transmutación
                  </button>
                </div>
              ) : (
                myEntries.map((entry) => (
                  <WisdomCard key={entry.id} entry={entry} />
                ))
              )}
            </motion.div>
          )}

          {activeTab === "muro" && (
            <motion.div
              key="muro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-white">Muro de Sabiduría</h2>
                <p className="text-xs text-slate-500">Frases de oro de la comunidad</p>
              </div>

              {publicEntries.length === 0 ? (
                <div className="text-center py-12">
                  <Globe size={40} className="mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-500 text-sm">El muro está vacío</p>
                  <p className="text-slate-600 text-xs mt-2">Sé el primero en publicar tu sabiduría</p>
                </div>
              ) : (
                publicEntries.map((entry) => (
                  <WisdomCard key={entry.id} entry={entry} showUser />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <MasterManualDrawer
        isOpen={showManualDrawer}
        onClose={() => setShowManualDrawer(false)}
        manualType="alquimia"
        triggerSource="ia"
      />
    </div>
  );
}
