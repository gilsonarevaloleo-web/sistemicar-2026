import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  MessageSquare, 
  Zap, 
  Clock, 
  Sparkles, 
  ArrowRight,
  Crown,
  Sun,
  Save,
  RotateCcw,
  Volume2,
  VolumeX,
  Eye,
  MapPin,
  Activity,
  Maximize,
  Lock,
  CheckCircle,
  Star,
  Plus,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import { cn } from "@/lib/utils";
import { 
  addAliadoEntry,
  updateAliadoEntry,
  subscribeToAliados,
  AliadoEntry,
  awardSovereigntyPoints
} from "@/lib/persistence";
import { ManualTriggerButton } from "@/components/master-manual-drawer";
import { useViewTransitionShield } from "@/hooks/useViewTransitionShield";
import { useJornadaActiveVehicleIds } from "@/hooks/useModularStoreSelectors";

const GRAY = "#6B7280";
const GOLD = "#D4AF37";
const VIOLET = "#7C3AED";
const EMERALD = "#10B981";

const SHADOW_AXES = [
  { 
    id: "identidad", 
    label: "IDENTIDAD", 
    question: "¿Quién eres cuando este límite te domina?",
    placeholder: "El nombre de tu Sombra...",
    icon: User,
    points: 8
  },
  { 
    id: "lenguaje", 
    label: "LENGUAJE", 
    question: "¿Qué frase te repite este límite constantemente?",
    placeholder: "La sentencia que te paraliza...",
    icon: MessageSquare,
    points: 8
  },
  { 
    id: "accion", 
    label: "ACCIÓN", 
    question: "¿Qué te impide hacer o qué te obliga a repetir?",
    placeholder: "La parálisis o el patrón...",
    icon: Zap,
    points: 8
  },
  { 
    id: "tiempo", 
    label: "TIEMPO", 
    question: "¿A qué momento del pasado o miedo del futuro te ancla?",
    placeholder: "El ancla temporal...",
    icon: Clock,
    points: 8
  }
];

const EXPANSION_AXES = [
  { 
    id: "despierto", 
    label: "DESPIERTO", 
    questions: [
      { q: "¿Ahora quién eres?", placeholder: "Tu nombre de poder al despertar..." },
      { q: "¿Qué ves?", placeholder: "La visión que te recibe..." }
    ],
    icon: Eye,
    color: EMERALD,
    points: 10
  },
  { 
    id: "lugar", 
    label: "LUGAR", 
    questions: [
      { q: "¿Con quién estás?", placeholder: "Las personas que te rodean..." },
      { q: "¿Qué escuchas que dicen de ti?", placeholder: "Las palabras de poder sobre ti..." }
    ],
    icon: MapPin,
    color: "#3B82F6",
    points: 10
  },
  { 
    id: "accion", 
    label: "ACCIÓN", 
    questions: [
      { q: "¿Qué estás haciendo?", placeholder: "Tu actividad de conquista..." },
      { q: "¿Cómo sientes tu equilibrio?", placeholder: "Tu estado de armonía..." }
    ],
    icon: Activity,
    color: VIOLET,
    points: 10
  },
  { 
    id: "expansion", 
    label: "EXPANSIÓN", 
    questions: [
      { q: "¿Qué tamaño eres?", placeholder: "Tu magnitud en el universo..." },
      { q: "¿En qué lugar comparándote con los demás estás?", placeholder: "Tu posición de soberanía..." }
    ],
    icon: Maximize,
    color: GOLD,
    points: 10
  }
];

const PERSONIFICATION_CAPSULES = [
  {
    id: "despierto",
    label: "EJE DESPIERTO",
    icon: Eye,
    color: EMERALD,
    levels: [
      { nivel: 1, titulo: "Observador", pregunta: "¿Qué es lo primero que observas al despertar?", puntos: 5 },
      { nivel: 2, titulo: "Consciente", pregunta: "¿Qué pensamientos eliges al abrir los ojos?", puntos: 8 },
      { nivel: 3, titulo: "Intencional", pregunta: "¿Cuál es tu primera intención del día?", puntos: 12 },
      { nivel: 4, titulo: "Manifestador", pregunta: "¿Qué realidad declaras al despertar?", puntos: 15 },
      { nivel: 5, titulo: "Arquitecto del Alba", pregunta: "¿Cómo diseñas tu mañana antes de vivirla?", puntos: 20 }
    ]
  },
  {
    id: "lugar",
    label: "EJE LUGAR",
    icon: MapPin,
    color: "#3B82F6",
    levels: [
      { nivel: 1, titulo: "Presente", pregunta: "¿Dónde estás físicamente ahora?", puntos: 5 },
      { nivel: 2, titulo: "Conectado", pregunta: "¿Con quién compartes este espacio?", puntos: 8 },
      { nivel: 3, titulo: "Influyente", pregunta: "¿Cómo tu presencia cambia el ambiente?", puntos: 12 },
      { nivel: 4, titulo: "Centro", pregunta: "¿Por qué las personas gravitan hacia ti?", puntos: 15 },
      { nivel: 5, titulo: "Arquitecto del Espacio", pregunta: "¿Cómo diseñas los espacios que habitas?", puntos: 20 }
    ]
  },
  {
    id: "accion",
    label: "EJE ACCIÓN",
    icon: Activity,
    color: VIOLET,
    levels: [
      { nivel: 1, titulo: "Móvil", pregunta: "¿Qué acción básica estás tomando ahora?", puntos: 5 },
      { nivel: 2, titulo: "Decidido", pregunta: "¿Qué decisión importante tomaste hoy?", puntos: 8 },
      { nivel: 3, titulo: "Estratega", pregunta: "¿Cómo planificas tus próximos movimientos?", puntos: 12 },
      { nivel: 4, titulo: "Ejecutor", pregunta: "¿Qué acción de alto impacto estás ejecutando?", puntos: 15 },
      { nivel: 5, titulo: "Arquitecto del Movimiento", pregunta: "¿Cómo orquestas múltiples acciones hacia tu visión?", puntos: 20 }
    ]
  },
  {
    id: "expansion",
    label: "EJE EXPANSIÓN",
    icon: Maximize,
    color: GOLD,
    levels: [
      { nivel: 1, titulo: "Semilla", pregunta: "¿Cuál es tu potencial sin desarrollar?", puntos: 5 },
      { nivel: 2, titulo: "Brote", pregunta: "¿En qué área estás creciendo ahora?", puntos: 8 },
      { nivel: 3, titulo: "Árbol", pregunta: "¿Qué frutos estás dando a otros?", puntos: 12 },
      { nivel: 4, titulo: "Bosque", pregunta: "¿Cómo tu crecimiento inspira crecimiento en otros?", puntos: 15 },
      { nivel: 5, titulo: "Arquitecto de Reinos", pregunta: "¿Qué imperio estás construyendo?", puntos: 20 }
    ]
  }
];

const AVATAR_MODELS = [
  { name: "Marco Aurelio", category: "Filosofía", desc: "Emperador estoico, disciplina y sabiduría" },
  { name: "Leonardo da Vinci", category: "Creatividad", desc: "Genio renacentista, curiosidad infinita" },
  { name: "Miyamoto Musashi", category: "Estrategia", desc: "Samurai legendario, maestría total" },
  { name: "Marie Curie", category: "Ciencia", desc: "Pionera, persistencia ante adversidad" },
  { name: "Bruce Lee", category: "Disciplina", desc: "Artista marcial, filosofía del agua" },
  { name: "Steve Jobs", category: "Visión", desc: "Visionario, excelencia obsesiva" },
  { name: "Nikola Tesla", category: "Innovación", desc: "Inventor, mente ilimitada" },
  { name: "Sun Tzu", category: "Estrategia", desc: "Estratega, arte de la guerra" },
  { name: "Gandhi", category: "Liderazgo", desc: "Líder pacífico, fuerza interior" },
  { name: "Alejandro Magno", category: "Conquista", desc: "Conquistador, ambición sin límites" },
  { name: "Benjamin Franklin", category: "Versatilidad", desc: "Polímata, mejora continua" },
  { name: "Elon Musk", category: "Audacia", desc: "Emprendedor, pensamiento de primer principio" }
];

interface FormData {
  shadow: {
    identidad: string;
    lenguaje: string;
    accion: string;
    tiempo: string;
  };
  expansion: {
    despierto: { q1: string; q2: string };
    lugar: { q1: string; q2: string };
    accion: { q1: string; q2: string };
    expansion: { q1: string; q2: string };
  };
  personification: {
    [key: string]: { [nivel: number]: string };
  };
}

type Phase = "gallery" | "shadow" | "bridge" | "naming" | "expansion" | "personification" | "complete";

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percent = Math.min((current / total) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-slate-500">Puntos de Soberanía</span>
        <span style={{ color: GOLD }} className="font-bold">{current}/{total}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${GRAY} 0%, ${GOLD} 100%)` }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

function OcularBridge({ onComplete }: { onComplete: () => void }) {
  const [position, setPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const startAnimation = () => {
    setIsAnimating(true);
    setPosition(0);
    
    const duration = 4000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setPosition(progress * 100);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setIsAnimating(false);
          onComplete();
        }, 500);
      }
    };
    
    requestAnimationFrame(animate);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.95)" }}
    >
      <div className="w-full max-w-2xl p-8 text-center">
        <h2 className="text-2xl font-black text-white mb-4">CORTE DE ESTRUCTURA</h2>
        <p className="text-slate-400 text-sm mb-8">
          Sigue el estímulo con tus ojos. No muevas la cabeza. Rompe el vínculo.
        </p>
        
        <div className="relative h-4 rounded-full overflow-hidden mb-8" style={{ backgroundColor: GRAY }}>
          <motion.div
            className="absolute top-0 bottom-0 w-8 rounded-full"
            style={{ 
              left: `${position}%`,
              transform: "translateX(-50%)",
              backgroundColor: position < 50 ? GRAY : GOLD,
              boxShadow: `0 0 20px ${position < 50 ? GRAY : GOLD}`
            }}
          />
        </div>
        
        {!isAnimating ? (
          <button
            onClick={startAnimation}
            className="px-8 py-4 rounded-xl font-black text-sm uppercase tracking-wide"
            style={{ 
              background: `linear-gradient(135deg, ${GRAY} 0%, ${GOLD} 100%)`,
              color: "#000"
            }}
            data-testid="btn-iniciar-corte"
          >
            <Sparkles size={16} className="inline mr-2" />
            Iniciar Corte de Estructura
          </button>
        ) : (
          <p className="text-slate-500 text-xs animate-pulse">
            Sigue la luz con tus ojos...
          </p>
        )}
      </div>
    </motion.div>
  );
}

function calculateAvatarPoints(avatar: AliadoEntry): number {
  let points = 0;
  
  if (avatar.shadow) {
    Object.values(avatar.shadow).forEach(v => {
      if (v && v.trim().length >= 5) points += 8;
    });
  }
  
  if (avatar.power) {
    Object.values(avatar.power).forEach(v => {
      if (v && v.trim().length >= 5) points += 10;
    });
  }
  
  if (avatar.expansion) {
    Object.values(avatar.expansion).forEach(axis => {
      if (axis.q1?.trim().length >= 5) points += 5;
      if (axis.q2?.trim().length >= 5) points += 5;
    });
  }
  
  if (avatar.personification) {
    Object.entries(avatar.personification).forEach(([key, levels]) => {
      const capsule = PERSONIFICATION_CAPSULES.find(c => c.id === key);
      Object.entries(levels).forEach(([nivel, value]) => {
        if (value && value.trim().length >= 5) {
          const levelData = capsule?.levels.find(l => l.nivel === parseInt(nivel));
          points += levelData?.puntos || 0;
        }
      });
    });
  }
  
  return points;
}

function getAvatarCapsuleProgress(avatar: AliadoEntry): { [capsuleId: string]: number } {
  const progress: { [capsuleId: string]: number } = {
    despierto: 0,
    lugar: 0,
    accion: 0,
    expansion: 0
  };
  
  if (avatar.personification) {
    Object.entries(avatar.personification).forEach(([capsuleId, levels]) => {
      const completedLevels = Object.entries(levels).filter(
        ([_, value]) => value && value.trim().length >= 5
      ).length;
      progress[capsuleId] = completedLevels;
    });
  }
  
  if (avatar.personificationLevels) {
    Object.entries(avatar.personificationLevels).forEach(([capsuleId, level]) => {
      if (progress[capsuleId] < level - 1) {
        progress[capsuleId] = level - 1;
      }
    });
  }
  
  return progress;
}

export default function Umbral() {
  const { user } = useAuthContext();
  useViewTransitionShield();
  useJornadaActiveVehicleIds(user?.uid);
  const [phase, setPhase] = useState<Phase>("gallery");
  const [formData, setFormData] = useState<FormData>({
    shadow: { identidad: "", lenguaje: "", accion: "", tiempo: "" },
    expansion: {
      despierto: { q1: "", q2: "" },
      lugar: { q1: "", q2: "" },
      accion: { q1: "", q2: "" },
      expansion: { q1: "", q2: "" }
    },
    personification: {
      despierto: {},
      lugar: {},
      accion: {},
      expansion: {}
    }
  });
  const [avatares, setAvatares] = useState<AliadoEntry[]>([]);
  const [currentAvatar, setCurrentAvatar] = useState<AliadoEntry | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<{ [key: string]: number }>({
    despierto: 1,
    lugar: 1,
    accion: 1,
    expansion: 1
  });
  const [expandedAvatar, setExpandedAvatar] = useState<AliadoEntry | null>(null);
  const [avatarName, setAvatarName] = useState("");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToAliados(
      user.uid,
      (data) => setAvatares(data),
      (error) => console.error(error)
    );
    return unsubscribe;
  }, [user]);

  const calculatePoints = () => {
    let points = 0;
    Object.values(formData.shadow).forEach(v => {
      if (v.trim().length >= 5) points += 8;
    });
    Object.values(formData.expansion).forEach(axis => {
      if (axis.q1.trim().length >= 5) points += 5;
      if (axis.q2.trim().length >= 5) points += 5;
    });
    Object.entries(formData.personification).forEach(([key, levels]) => {
      const capsule = PERSONIFICATION_CAPSULES.find(c => c.id === key);
      Object.entries(levels).forEach(([nivel, value]) => {
        if (value && value.trim().length >= 5) {
          const levelData = capsule?.levels.find(l => l.nivel === parseInt(nivel));
          points += levelData?.puntos || 0;
        }
      });
    });
    return points;
  };

  const shadowComplete = Object.values(formData.shadow).every(v => v.trim().length >= 5);
  const expansionComplete = Object.values(formData.expansion).every(axis => 
    axis.q1.trim().length >= 5 && axis.q2.trim().length >= 5
  );

  const handleShadowChange = (field: keyof typeof formData.shadow, value: string) => {
    setFormData(prev => ({
      ...prev,
      shadow: { ...prev.shadow, [field]: value }
    }));
  };

  const handleExpansionChange = (axisId: string, qKey: "q1" | "q2", value: string) => {
    setFormData(prev => ({
      ...prev,
      expansion: {
        ...prev.expansion,
        [axisId]: { ...prev.expansion[axisId as keyof typeof prev.expansion], [qKey]: value }
      }
    }));
  };

  const handlePersonificationChange = (capsuleId: string, nivel: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      personification: {
        ...prev.personification,
        [capsuleId]: {
          ...prev.personification[capsuleId],
          [nivel]: value
        }
      }
    }));
  };

  const completeLevelAndAdvance = async (capsuleId: string, nivel: number) => {
    const value = formData.personification[capsuleId]?.[nivel];
    if (!value || value.trim().length < 5) {
      toast.error("Completa la reflexión (mínimo 5 caracteres)");
      return;
    }
    
    const capsule = PERSONIFICATION_CAPSULES.find(c => c.id === capsuleId);
    const levelData = capsule?.levels.find(l => l.nivel === nivel);
    
    if (currentAvatar && user) {
      const newPersonification = {
        ...currentAvatar.personification,
        ...formData.personification
      };
      const newLevels = {
        ...currentAvatar.personificationLevels,
        [capsuleId]: nivel < 5 ? nivel + 1 : 5
      };
      
      await updateAliadoEntry(user.uid, currentAvatar.id, {
        personification: newPersonification,
        personificationLevels: newLevels,
        totalPoints: calculateAvatarPoints({ ...currentAvatar, personification: newPersonification })
      });
      
      setCurrentAvatar(prev => prev ? {
        ...prev,
        personification: newPersonification,
        personificationLevels: newLevels
      } : null);
    }

    const pts = levelData?.puntos || 0;
    if (user && pts > 0) {
      awardSovereigntyPoints(user.uid, pts, `Umbral: ${capsule?.label || capsuleId} N${nivel}`)
        .catch(() => toast.error("Nivel guardado; PS se sincronizarán al reconectar."));
    }
    
    toast.success(`¡Nivel ${nivel} completado! +${pts} PS`);
    
    if (nivel < 5) {
      setCurrentLevel(prev => ({
        ...prev,
        [capsuleId]: nivel + 1
      }));
    } else {
      setSelectedCapsule(null);
      toast.success(`¡${capsule?.label} DOMINADO! Eres ${levelData?.titulo}`);
    }
  };

  const handleBridgeComplete = () => {
    setPhase("naming");
    toast.success("¡Estructura cortada! Ahora elige a tu modelo");
  };

  const handleSaveNewAvatar = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const totalPoints = calculatePoints();
      const finalName = avatarName.trim() || formData.expansion.despierto.q1 || formData.shadow.identidad || "Avatar";
      
      const newAvatar = await addAliadoEntry(user.uid, {
        nombre: finalName,
        shadow: formData.shadow,
        power: {
          identidad: formData.expansion.despierto.q1,
          lenguaje: formData.expansion.lugar.q2,
          accion: formData.expansion.accion.q1,
          tiempo: formData.expansion.expansion.q2
        },
        expansion: formData.expansion,
        personification: formData.personification,
        personificationLevels: currentLevel,
        totalPoints,
        createdAt: new Date()
      });
      
      setCurrentAvatar(newAvatar);
      setPhase("personification");
      if (totalPoints > 0) {
        await awardSovereigntyPoints(user.uid, totalPoints, `Umbral: Avatar "${finalName}" creado`);
      }
      toast.success(`¡Avatar "${avatarName}" creado! Continúa desarrollando tus cápsulas.`);
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const openExistingAvatar = (avatar: AliadoEntry) => {
    setCurrentAvatar(avatar);
    
    if (avatar.personification) {
      setFormData(prev => ({
        ...prev,
        personification: avatar.personification || prev.personification
      }));
    }
    
    if (avatar.personificationLevels) {
      setCurrentLevel(avatar.personificationLevels);
    }
    
    setPhase("personification");
  };

  const startNewAvatar = () => {
    setFormData({
      shadow: { identidad: "", lenguaje: "", accion: "", tiempo: "" },
      expansion: {
        despierto: { q1: "", q2: "" },
        lugar: { q1: "", q2: "" },
        accion: { q1: "", q2: "" },
        expansion: { q1: "", q2: "" }
      },
      personification: {
        despierto: {},
        lugar: {},
        accion: {},
        expansion: {}
      }
    });
    setCurrentLevel({
      despierto: 1,
      lugar: 1,
      accion: 1,
      expansion: 1
    });
    setAvatarName("");
    setSelectedModel(null);
    setCurrentAvatar(null);
    setPhase("shadow");
  };

  const backToGallery = () => {
    setPhase("gallery");
    setSelectedCapsule(null);
    setCurrentAvatar(null);
  };

  const currentPoints = currentAvatar ? calculateAvatarPoints(currentAvatar) : calculatePoints();
  const maxPoints = 32 + 40 + 200;

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "#020202" }}>
      
      {phase === "bridge" && (
        <OcularBridge onComplete={handleBridgeComplete} />
      )}

      <div className="p-4 max-w-lg mx-auto">
        
        <div className="flex items-center justify-between mb-6 pt-4">
          <div>
            <h1 className="text-2xl font-black text-white">UMBRAL</h1>
            <p className="text-xs text-slate-500">Galería de Avatares</p>
          </div>
          <div className="flex items-center gap-2">
            <ManualTriggerButton manualType="umbral" />
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-white/5"
            >
              {soundEnabled ? <Volume2 size={16} className="text-slate-400" /> : <VolumeX size={16} className="text-slate-600" />}
            </button>
          </div>
        </div>

        {phase !== "gallery" && (
          <div className="mb-6">
            <ProgressBar current={currentPoints} total={maxPoints} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {phase === "gallery" && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startNewAvatar}
                className="w-full p-6 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 transition-all hover:border-solid"
                style={{ borderColor: `${GOLD}40`, backgroundColor: "#0a0a0a" }}
                data-testid="btn-nuevo-avatar"
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${GOLD}20` }}
                >
                  <Plus size={24} style={{ color: GOLD }} />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold">Crear Nuevo Avatar</p>
                  <p className="text-xs text-slate-500">Inicia una nueva transmutación</p>
                </div>
              </motion.button>

              {avatares.length > 0 && (
                <>
                  <div className="pt-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                      Tus Avatares ({avatares.length})
                    </p>
                  </div>
                  
                  {avatares.map((avatar) => {
                    const capsuleProgress = getAvatarCapsuleProgress(avatar);
                    const totalCapsuleProgress = Object.values(capsuleProgress).reduce((a, b) => a + b, 0);
                    const avatarPoints = calculateAvatarPoints(avatar);
                    
                    return (
                      <motion.div
                        key={avatar.id}
                        whileHover={{ scale: 1.01 }}
                        className="w-full p-4 rounded-2xl border text-left transition-all"
                        style={{ backgroundColor: "#0a0a0a", borderColor: `${GOLD}30` }}
                        data-testid={`card-avatar-${avatar.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-12 h-12 rounded-xl flex items-center justify-center"
                              style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #B8860B 100%)` }}
                            >
                              <Crown size={24} className="text-black" />
                            </div>
                            <div>
                              <p className="text-white font-bold">
                                {avatar.nombre || avatar.power?.identidad || "Avatar"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(avatar.createdAt).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold" style={{ color: GOLD }}>+{avatarPoints}</p>
                            <p className="text-[10px] text-slate-600">pts</p>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-[10px] text-slate-500 mb-2">Progreso de Personificación</p>
                          <div className="grid grid-cols-4 gap-2">
                            {PERSONIFICATION_CAPSULES.map(capsule => {
                              const Icon = capsule.icon;
                              const progress = capsuleProgress[capsule.id] || 0;
                              return (
                                <div key={capsule.id} className="text-center">
                                  <div 
                                    className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-1"
                                    style={{ 
                                      backgroundColor: progress > 0 ? `${capsule.color}20` : "rgba(255,255,255,0.05)",
                                      border: `1px solid ${progress > 0 ? capsule.color : "rgba(255,255,255,0.1)"}40`
                                    }}
                                  >
                                    <Icon size={14} style={{ color: progress > 0 ? capsule.color : "#666" }} />
                                  </div>
                                  <p className="text-[10px]" style={{ color: progress > 0 ? capsule.color : "#666" }}>
                                    {progress}/5
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-4">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setExpandedAvatar(avatar)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                            style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                            data-testid={`btn-ver-avatar-${avatar.id}`}
                          >
                            <Eye size={14} />
                            Ver Completo
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openExistingAvatar(avatar)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                            style={{ backgroundColor: GOLD, color: "#000" }}
                            data-testid={`btn-continuar-avatar-${avatar.id}`}
                          >
                            Continuar
                            <ChevronRight size={14} />
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </motion.div>
          )}

          {phase === "shadow" && (
            <motion.div
              key="shadow"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-4"
            >
              <button
                onClick={backToGallery}
                className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1 mb-4"
              >
                <ArrowRight size={12} className="rotate-180" />
                Volver a Galería
              </button>
              
              <div 
                className="p-4 rounded-2xl border"
                style={{ backgroundColor: "#0a0a0a", borderColor: `${GRAY}30` }}
              >
                <h3 className="text-sm font-bold mb-1" style={{ color: GRAY }}>
                  FASE 1: AUTOPSIA
                </h3>
                <p className="text-[10px] text-slate-600">
                  Identifica la estructura de tu límite. Nombra a tu Sombra.
                </p>
              </div>

              {SHADOW_AXES.map((axis, index) => {
                const Icon = axis.icon;
                const value = formData.shadow[axis.id as keyof typeof formData.shadow];
                const isFilled = value.trim().length >= 5;
                
                return (
                  <motion.div
                    key={axis.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-2xl border p-4"
                    style={{ 
                      backgroundColor: "#0a0a0a",
                      borderColor: isFilled ? GRAY : "rgba(255,255,255,0.1)"
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{ color: GRAY }} />
                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GRAY }}>
                          {axis.label}
                        </span>
                      </div>
                      <span 
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded transition-all",
                          isFilled ? "opacity-100" : "opacity-40"
                        )}
                        style={{ backgroundColor: `${GRAY}20`, color: GRAY }}
                      >
                        +{axis.points} pts
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 mb-2">{axis.question}</p>
                    <textarea
                      value={value}
                      onChange={(e) => handleShadowChange(axis.id as keyof typeof formData.shadow, e.target.value)}
                      placeholder={axis.placeholder}
                      rows={2}
                      className="w-full bg-transparent text-white text-sm placeholder:text-slate-700 focus:outline-none resize-none"
                      data-testid={`input-shadow-${axis.id}`}
                    />
                  </motion.div>
                );
              })}

              <button
                onClick={() => setPhase("bridge")}
                disabled={!shadowComplete}
                className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ 
                  background: shadowComplete 
                    ? `linear-gradient(135deg, ${GRAY} 0%, ${GOLD} 100%)`
                    : "rgba(255,255,255,0.1)",
                  color: shadowComplete ? "#000" : "#666"
                }}
                data-testid="btn-iniciar-cruce"
              >
                <ArrowRight size={18} />
                Iniciar Corte de Estructura
              </button>
            </motion.div>
          )}

          {phase === "naming" && (
            <motion.div
              key="naming"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <button
                onClick={() => setPhase("shadow")}
                className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1 mb-4"
              >
                <ArrowRight size={12} className="rotate-180" />
                Volver
              </button>

              <div 
                className="p-5 rounded-2xl border text-center"
                style={{ backgroundColor: "#0a0a0a", borderColor: `${GOLD}30` }}
              >
                <div 
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #B8860B 100%)` }}
                >
                  <Crown size={32} className="text-black" />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: GOLD }}>
                  NOMBRA A TU AVATAR
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Elige a alguien a quien admires. Enfócate en sus cualidades, haz lo que hace, y te convertirás en él.
                </p>
              </div>

              <div 
                className="p-4 rounded-2xl border"
                style={{ backgroundColor: "#0a0a0a", borderColor: "rgba(255,255,255,0.1)" }}
              >
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">
                  Modelos Inspiradores
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {AVATAR_MODELS.map((model) => (
                    <motion.button
                      key={model.name}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedModel(model.name);
                        setAvatarName(model.name);
                      }}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{ 
                        backgroundColor: selectedModel === model.name ? `${GOLD}20` : "rgba(255,255,255,0.05)",
                        borderWidth: 1,
                        borderColor: selectedModel === model.name ? GOLD : "transparent"
                      }}
                      data-testid={`btn-model-${model.name.replace(/\s/g, '-')}`}
                    >
                      <p className="text-xs font-bold text-white">{model.name}</p>
                      <p className="text-[10px] text-slate-500">{model.category}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div 
                className="p-4 rounded-2xl border"
                style={{ backgroundColor: "#0a0a0a", borderColor: "rgba(255,255,255,0.1)" }}
              >
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">
                  O escribe tu propio modelo
                </p>
                <input
                  type="text"
                  value={avatarName}
                  onChange={(e) => {
                    setAvatarName(e.target.value);
                    setSelectedModel(null);
                  }}
                  placeholder="Nombre de tu Avatar (persona que admiras)..."
                  className="w-full bg-zinc-900/50 rounded-xl p-4 text-white placeholder:text-slate-700 focus:outline-none"
                  style={{ borderWidth: 1, borderColor: avatarName ? `${GOLD}40` : "transparent" }}
                  data-testid="input-avatar-name"
                />
                <p className="text-[10px] text-slate-600 mt-2">
                  Puede ser alguien famoso, un mentor, familiar o cualquier persona cuyas cualidades quieras encarnar.
                </p>
              </div>

              {selectedModel && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border"
                  style={{ backgroundColor: `${GOLD}10`, borderColor: `${GOLD}30` }}
                >
                  <p className="text-xs text-white">
                    <span style={{ color: GOLD }} className="font-bold">{selectedModel}:</span>{" "}
                    {AVATAR_MODELS.find(m => m.name === selectedModel)?.desc}
                  </p>
                </motion.div>
              )}

              <button
                onClick={() => setPhase("expansion")}
                disabled={!avatarName.trim()}
                className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ 
                  background: avatarName.trim() 
                    ? `linear-gradient(135deg, ${GOLD} 0%, #B8860B 100%)`
                    : "rgba(255,255,255,0.1)",
                  color: avatarName.trim() ? "#000" : "#666"
                }}
                data-testid="btn-confirmar-nombre"
              >
                <Crown size={18} />
                Anclar Nombre y Continuar
              </button>
            </motion.div>
          )}

          {phase === "expansion" && (
            <motion.div
              key="expansion"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="space-y-4"
            >
              <div 
                className="p-4 rounded-2xl border"
                style={{ backgroundColor: "#0a0a0a", borderColor: `${EMERALD}30` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={14} style={{ color: GOLD }} />
                  <span className="text-xs font-bold" style={{ color: GOLD }}>{avatarName || "Tu Avatar"}</span>
                </div>
                <h3 className="text-sm font-bold mb-1" style={{ color: EMERALD }}>
                  FASE 3: EXPANSIÓN
                </h3>
                <p className="text-[10px] text-slate-600">
                  Visualiza tu yo expandido. Responde desde tu versión más poderosa.
                </p>
              </div>

              {EXPANSION_AXES.map((axis, index) => {
                const Icon = axis.icon;
                const axisData = formData.expansion[axis.id as keyof typeof formData.expansion];
                const isQ1Filled = axisData.q1.trim().length >= 5;
                const isQ2Filled = axisData.q2.trim().length >= 5;
                const isComplete = isQ1Filled && isQ2Filled;
                
                return (
                  <motion.div
                    key={axis.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-2xl border p-4"
                    style={{ 
                      backgroundColor: "#0a0a0a",
                      borderColor: isComplete ? axis.color : "rgba(255,255,255,0.1)",
                      boxShadow: isComplete ? `0 0 15px ${axis.color}20` : "none"
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${axis.color}20` }}
                        >
                          <Icon size={16} style={{ color: axis.color }} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: axis.color }}>
                          {axis.label}
                        </span>
                      </div>
                      <span 
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded transition-all",
                          isComplete ? "opacity-100" : "opacity-40"
                        )}
                        style={{ backgroundColor: `${axis.color}20`, color: axis.color }}
                      >
                        +{axis.points} pts
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {axis.questions.map((question, qIdx) => {
                        const qKey = qIdx === 0 ? "q1" : "q2";
                        const value = axisData[qKey];
                        const isFilled = value.trim().length >= 5;
                        
                        return (
                          <div key={qIdx}>
                            <p className="text-[11px] mb-1" style={{ color: isFilled ? axis.color : "#64748b" }}>
                              {question.q}
                            </p>
                            <textarea
                              value={value}
                              onChange={(e) => handleExpansionChange(axis.id, qKey, e.target.value)}
                              placeholder={question.placeholder}
                              rows={2}
                              className="w-full bg-zinc-900/50 rounded-lg p-2 text-white text-sm placeholder:text-slate-700 focus:outline-none resize-none border transition-colors"
                              style={{ borderColor: isFilled ? `${axis.color}40` : "transparent" }}
                              data-testid={`input-expansion-${axis.id}-${qKey}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}

              <button
                onClick={handleSaveNewAvatar}
                disabled={!expansionComplete || saving}
                className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ 
                  background: expansionComplete 
                    ? `linear-gradient(135deg, ${EMERALD} 0%, ${VIOLET} 100%)`
                    : "rgba(255,255,255,0.1)",
                  color: expansionComplete ? "#fff" : "#666"
                }}
                data-testid="btn-crear-avatar"
              >
                <Save size={18} />
                {saving ? "Creando Avatar..." : "Crear Avatar y Continuar"}
              </button>
            </motion.div>
          )}

          {phase === "personification" && !selectedCapsule && (
            <motion.div
              key="personification-menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <button
                onClick={backToGallery}
                className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <ArrowRight size={12} className="rotate-180" />
                Volver a Galería
              </button>
              
              {currentAvatar && (
                <div 
                  className="p-4 rounded-2xl border flex items-center gap-4"
                  style={{ backgroundColor: "#0a0a0a", borderColor: `${GOLD}30` }}
                >
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #B8860B 100%)` }}
                  >
                    <Crown size={28} className="text-black" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold">{currentAvatar.nombre || currentAvatar.power?.identidad}</p>
                    <p className="text-xs text-slate-500">
                      {calculateAvatarPoints(currentAvatar)} pts acumulados
                    </p>
                  </div>
                </div>
              )}
              
              <div 
                className="p-4 rounded-2xl border"
                style={{ backgroundColor: "#0a0a0a", borderColor: `${VIOLET}30` }}
              >
                <h3 className="text-sm font-bold mb-1" style={{ color: VIOLET }}>
                  FASE 4: PERSONIFICACIÓN
                </h3>
                <p className="text-[10px] text-slate-600">
                  Desarrolla cada eje por niveles. Cierra un nivel para desbloquear el siguiente.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {PERSONIFICATION_CAPSULES.map((capsule) => {
                  const Icon = capsule.icon;
                  const avatarProgress = currentAvatar ? getAvatarCapsuleProgress(currentAvatar) : {};
                  const completedLevels = avatarProgress[capsule.id] || 0;
                  const currentLvl = currentAvatar?.personificationLevels?.[capsule.id] || currentLevel[capsule.id] || 1;
                  const allComplete = completedLevels === 5;
                  
                  return (
                    <motion.button
                      key={capsule.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedCapsule(capsule.id);
                        if (currentAvatar?.personificationLevels?.[capsule.id]) {
                          setCurrentLevel(prev => ({
                            ...prev,
                            [capsule.id]: currentAvatar.personificationLevels![capsule.id]
                          }));
                        }
                      }}
                      className="p-4 rounded-2xl border text-left transition-all"
                      style={{ 
                        backgroundColor: "#0a0a0a",
                        borderColor: allComplete ? capsule.color : `${capsule.color}30`
                      }}
                      data-testid={`btn-capsule-${capsule.id}`}
                    >
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${capsule.color}20` }}
                      >
                        <Icon size={20} style={{ color: capsule.color }} />
                      </div>
                      <p className="text-xs font-bold text-white mb-1">{capsule.label}</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(nivel => {
                          const isComplete = completedLevels >= nivel;
                          return (
                            <div
                              key={nivel}
                              className="w-4 h-1 rounded-full"
                              style={{ backgroundColor: isComplete ? capsule.color : "rgba(255,255,255,0.1)" }}
                            />
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">
                        {allComplete ? "¡Completado!" : `Nivel ${currentLvl}/5`}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {phase === "personification" && selectedCapsule && (
            <motion.div
              key={`capsule-${selectedCapsule}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-4"
            >
              {(() => {
                const capsule = PERSONIFICATION_CAPSULES.find(c => c.id === selectedCapsule)!;
                const Icon = capsule.icon;
                const avatarLvl = currentAvatar?.personificationLevels?.[selectedCapsule] || 1;
                const nivel = currentLevel[selectedCapsule] || avatarLvl;
                const levelData = capsule.levels.find(l => l.nivel === nivel)!;
                const existingValue = currentAvatar?.personification?.[selectedCapsule]?.[nivel] || "";
                const value = formData.personification[selectedCapsule]?.[nivel] || existingValue;
                const avatarProgress = currentAvatar ? getAvatarCapsuleProgress(currentAvatar) : {};
                const completedLevels = avatarProgress[selectedCapsule] || 0;
                
                return (
                  <>
                    <button
                      onClick={() => setSelectedCapsule(null)}
                      className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <ArrowRight size={12} className="rotate-180" />
                      Volver a cápsulas
                    </button>
                    
                    <div 
                      className="p-4 rounded-2xl border"
                      style={{ backgroundColor: "#0a0a0a", borderColor: `${capsule.color}30` }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${capsule.color}20` }}
                        >
                          <Icon size={24} style={{ color: capsule.color }} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold" style={{ color: capsule.color }}>
                            {capsule.label}
                          </h3>
                          <p className="text-[10px] text-slate-500">Nivel {nivel} de 5</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 mb-4">
                        {capsule.levels.map(l => {
                          const isComplete = completedLevels >= l.nivel;
                          const isCurrent = l.nivel === nivel;
                          return (
                            <div
                              key={l.nivel}
                              className={cn(
                                "flex-1 h-2 rounded-full transition-all",
                                isCurrent && "ring-2 ring-white/30"
                              )}
                              style={{ backgroundColor: isComplete ? capsule.color : "rgba(255,255,255,0.1)" }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div 
                      className="p-6 rounded-2xl border"
                      style={{ backgroundColor: "#0a0a0a", borderColor: `${capsule.color}40` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Star size={16} style={{ color: capsule.color }} />
                          <span className="text-sm font-bold text-white">{levelData.titulo}</span>
                        </div>
                        <span 
                          className="text-[10px] font-bold px-2 py-1 rounded"
                          style={{ backgroundColor: `${capsule.color}20`, color: capsule.color }}
                        >
                          +{levelData.puntos} pts
                        </span>
                      </div>
                      
                      <p className="text-sm mb-4" style={{ color: capsule.color }}>
                        {levelData.pregunta}
                      </p>
                      
                      <textarea
                        value={value}
                        onChange={(e) => handlePersonificationChange(selectedCapsule, nivel, e.target.value)}
                        placeholder="Tu reflexión profunda..."
                        rows={4}
                        className="w-full bg-zinc-900/50 rounded-xl p-4 text-white text-sm placeholder:text-slate-700 focus:outline-none resize-none border transition-colors mb-4"
                        style={{ borderColor: value.trim().length >= 5 ? `${capsule.color}40` : "transparent" }}
                        data-testid={`input-personification-${selectedCapsule}-${nivel}`}
                      />
                      
                      <button
                        onClick={() => completeLevelAndAdvance(selectedCapsule, nivel)}
                        disabled={value.trim().length < 5}
                        className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ 
                          background: value.trim().length >= 5 
                            ? capsule.color
                            : "rgba(255,255,255,0.1)",
                          color: value.trim().length >= 5 ? "#000" : "#666"
                        }}
                        data-testid={`btn-cerrar-nivel-${nivel}`}
                      >
                        <CheckCircle size={18} />
                        {nivel < 5 ? `Cerrar Nivel ${nivel} y Avanzar` : `Completar ${capsule.label}`}
                      </button>
                    </div>

                    {completedLevels > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest">Niveles anteriores</p>
                        {capsule.levels.filter(l => l.nivel < nivel && completedLevels >= l.nivel).map(l => {
                          const prevValue = currentAvatar?.personification?.[selectedCapsule]?.[l.nivel] || 
                                           formData.personification[selectedCapsule]?.[l.nivel];
                          return (
                            <div 
                              key={l.nivel}
                              className="p-3 rounded-xl bg-white/5 flex items-center gap-3"
                            >
                              <CheckCircle size={14} style={{ color: capsule.color }} />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-white">{l.titulo}</p>
                                <p className="text-[10px] text-slate-500 truncate">{prevValue}</p>
                              </div>
                              <span className="text-[10px] font-bold" style={{ color: capsule.color }}>
                                +{l.puntos}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Vista Completa del Avatar */}
      <AnimatePresence>
        {expandedAvatar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
            style={{ backgroundColor: "rgba(0,0,0,0.95)" }}
            onClick={() => setExpandedAvatar(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg my-8 rounded-3xl border overflow-hidden"
              style={{ backgroundColor: "#0a0a0a", borderColor: `${GOLD}40` }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #B8860B 100%)` }}
                  >
                    <Crown size={24} className="text-black" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold">
                      {expandedAvatar.nombre || expandedAvatar.power?.identidad || "Avatar"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      +{calculateAvatarPoints(expandedAvatar)} Puntos de Soberanía
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedAvatar(null)}
                  className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"
                  data-testid="btn-cerrar-vista-avatar"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Sección SOMBRA */}
                {expandedAvatar.shadow && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${GRAY}20` }}>
                        <User size={14} style={{ color: GRAY }} />
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: GRAY }}>
                        Tu Sombra (Autopsia)
                      </h3>
                    </div>
                    <div className="space-y-2 pl-8">
                      {Object.entries(expandedAvatar.shadow).map(([key, value]) => {
                        const axis = SHADOW_AXES.find(a => a.id === key);
                        return (
                          <div key={key} className="p-3 rounded-xl bg-white/5">
                            <p className="text-[10px] text-slate-500 uppercase mb-1">{axis?.label || key}</p>
                            <p className="text-sm text-white">{value}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sección PODER */}
                {expandedAvatar.power && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${GOLD}20` }}>
                        <Crown size={14} style={{ color: GOLD }} />
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                        Tu Poder (Cruce)
                      </h3>
                    </div>
                    <div className="space-y-2 pl-8">
                      {Object.entries(expandedAvatar.power).map(([key, value]) => {
                        const labels: Record<string, string> = {
                          identidad: "Identidad de Poder",
                          lenguaje: "Lenguaje de Poder",
                          accion: "Acción de Poder",
                          tiempo: "Tiempo de Poder"
                        };
                        return (
                          <div key={key} className="p-3 rounded-xl" style={{ backgroundColor: `${GOLD}10` }}>
                            <p className="text-[10px] uppercase mb-1" style={{ color: GOLD }}>{labels[key] || key}</p>
                            <p className="text-sm text-white">{value}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sección EXPANSIÓN */}
                {expandedAvatar.expansion && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${EMERALD}20` }}>
                        <Maximize size={14} style={{ color: EMERALD }} />
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: EMERALD }}>
                        Tu Visión Expandida
                      </h3>
                    </div>
                    <div className="space-y-3 pl-8">
                      {EXPANSION_AXES.map(axis => {
                        const data = expandedAvatar.expansion?.[axis.id as keyof typeof expandedAvatar.expansion];
                        if (!data?.q1 && !data?.q2) return null;
                        const Icon = axis.icon;
                        return (
                          <div key={axis.id} className="p-3 rounded-xl" style={{ backgroundColor: `${axis.color}10` }}>
                            <div className="flex items-center gap-2 mb-2">
                              <Icon size={12} style={{ color: axis.color }} />
                              <p className="text-[10px] font-bold uppercase" style={{ color: axis.color }}>{axis.label}</p>
                            </div>
                            {data.q1 && (
                              <p className="text-sm text-white mb-1">
                                <span className="text-slate-500 text-[10px]">{axis.questions[0].q} </span>
                                {data.q1}
                              </p>
                            )}
                            {data.q2 && (
                              <p className="text-sm text-white">
                                <span className="text-slate-500 text-[10px]">{axis.questions[1].q} </span>
                                {data.q2}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sección PERSONIFICACIÓN */}
                {expandedAvatar.personification && Object.keys(expandedAvatar.personification).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${VIOLET}20` }}>
                        <Star size={14} style={{ color: VIOLET }} />
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: VIOLET }}>
                        Personificación
                      </h3>
                    </div>
                    <div className="space-y-3 pl-8">
                      {PERSONIFICATION_CAPSULES.map(capsule => {
                        const levels = expandedAvatar.personification?.[capsule.id];
                        if (!levels || Object.keys(levels).length === 0) return null;
                        const Icon = capsule.icon;
                        return (
                          <div key={capsule.id} className="p-3 rounded-xl" style={{ backgroundColor: `${capsule.color}10` }}>
                            <div className="flex items-center gap-2 mb-2">
                              <Icon size={12} style={{ color: capsule.color }} />
                              <p className="text-[10px] font-bold uppercase" style={{ color: capsule.color }}>{capsule.label}</p>
                            </div>
                            {Object.entries(levels).map(([nivel, value]) => {
                              const levelData = capsule.levels.find(l => l.nivel === parseInt(nivel));
                              return (
                                <div key={nivel} className="mb-2 last:mb-0">
                                  <p className="text-[10px] text-slate-500">Nivel {nivel} - {levelData?.titulo}</p>
                                  <p className="text-sm text-white">{value}</p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer con botón de continuar */}
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setExpandedAvatar(null);
                    openExistingAvatar(expandedAvatar);
                  }}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ backgroundColor: GOLD, color: "#000" }}
                  data-testid="btn-continuar-desde-vista"
                >
                  Continuar Desarrollando
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
