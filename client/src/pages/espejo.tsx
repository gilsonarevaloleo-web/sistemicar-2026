import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import { 
  Eye, 
  Brain,
  Wand2,
  Sparkles,
  Crown,
  Lock,
  History,
  EyeOff,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  X,
  Shield,
  LogIn,
  Heart,
  Briefcase,
  Users,
  DollarSign,
  Activity,
  Target,
  Zap,
  Loader2,
  AlertTriangle,
  BarChart3,
  Send,
  Wind,
  Droplets,
  CalendarPlus,
  ArrowRight,
  Clock,
  Edit3,
  Copy,
  ListChecks,
  Layers,
  Mic,
  MicOff,
  Radio
} from "lucide-react";
import { ConfettiCelebration } from "@/components/confetti-celebration";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import { 
  awardSovereigntyPoints,
  incrementModulePoints,
  subscribeToProgression,
  UserProgression,
  addEspejoSession,
  subscribeToEspejoSessions,
  subscribeToEspejoCredits,
  setEspejoCredits,
  getProspectoByEmail,
  subscribeToConviccion,
  incrementConviccionCheck,
  addExpedienteClinico,
  detectarBucleSabotaje,
  getBloqueoEje3,
  getMuroFirmado,
  subscribeToPacientes,
  updatePaciente,
  type BloqueoEje3,
  type EspejoSession,
  type Paciente
} from "@/lib/persistence";
import { scheduleEspejoFollowup, requestNotificationPermission } from "@/lib/notifications";
import { enqueueJornadaVehicleIntent } from "@/lib/jornadaVehicleIntent";
import { beginViewTransition } from "@/lib/viewTransitionShield";
import { useViewTransitionShield } from "@/hooks/useViewTransitionShield";
import { useJornadaActiveVehicleIds } from "@/hooks/useModularStoreSelectors";
import { getUserEmail } from "@/lib/firebase";
import { isOwner } from "@/lib/owner";
import { registrarEvento, COMPONENTES } from "@/lib/evento-universal";
import yapeQrImage from "@assets/yape_qr_2026-02-17T22-11-48_1771384383841.png";
import HumanSilhouette from "@/components/espejo/HumanSilhouette";
import VUMeterBars from "@/components/espejo/VUMeterBars";
import TerminalConsole from "@/components/espejo/TerminalConsole";
import GlitchDiagnostic from "@/components/espejo/GlitchDiagnostic";
import CalibrationPanel from "@/components/espejo/CalibrationPanel";
import OsciloscopioBar from "@/components/espejo/OsciloscopioBar";
import PhaseIndicator from "@/components/espejo/PhaseIndicator";
import ScreenColorWash from "@/components/espejo/ScreenColorWash";
import ColorBadge from "@/components/espejo/ColorBadge";
import VoiceBanner from "@/components/espejo/VoiceBanner";
import MuroSoberano, { isMuroFirmado } from "@/components/espejo/MuroSoberano";

const GOLD = "#D4AF37";
const VIOLET = "#7C3AED";
const EMERALD = "#10B981";
const ELECTRIC_BLUE = "#3b82f6";
const DARK_BG = "#0A0A0A";
const RED_ALERT = "#FF3131";
const WARM_ROSE = "#F97316";
const CYAN_NEON = "#00FFC3";

const CONTEXTOS = [
  { id: "familia", label: "Familia", icon: Heart, color: "#EF4444" },
  { id: "trabajo", label: "Trabajo", icon: Briefcase, color: ELECTRIC_BLUE },
  { id: "relaciones", label: "Relaciones", icon: Users, color: VIOLET },
  { id: "finanzas", label: "Finanzas", icon: DollarSign, color: EMERALD },
  { id: "salud", label: "Salud", icon: Activity, color: "#F97316" },
  { id: "proyecto", label: "Proyecto", icon: Target, color: GOLD }
];

const FIXED_POINTS = 58;

const EJES = [
  { 
    id: "registro_carga", 
    label: "DUCHA MENTAL",
    subtitle: "Vertido Libre",
    pregunta: "No pienses — vierte. Suelta el ruido, las deudas, los miedos, o esa pesada estabilidad que te está deteniendo. ¿Dónde lo sientes en el cuerpo? ¿Qué imagen aparece? ¿Cuál es el pensamiento más pesado que cargas hoy?",
    placeholder: "La interferencia es... la siento en... se activa cuando...",
    icon: Eye,
    color: CYAN_NEON,
    objetivo: "Vertido",
    costo: 0,
    guia_ia: "El usuario registra su carga/interferencia sin filtros. Este eje es gratuito. Acepta cualquier input con más de 5 caracteres.",
    bgEffect: "fog" as const
  },
  { 
    id: "diagnostico_clinico", 
    label: "DIAGNÓSTICO CLÍNICO",
    subtitle: "Análisis de Interferencias",
    pregunta: "El Doctor IA analizará tu registro usando el Diccionario Clínico. Identificará las interfaces afectadas (M01-M10), cruzará síntomas de hardware con conflictos de campo, y entregará un diagnóstico con código específico.",
    placeholder: "Agrega más contexto si lo deseas: relaciones involucradas, patrones recurrentes, decisiones pendientes...",
    icon: Brain,
    color: RED_ALERT,
    objetivo: "Diagnóstico",
    costo: 1,
    guia_ia: "La IA analiza usando DICCIONARIO_CLINICO_COMPLETO. Identifica: interfaz primaria + secundaria, síntomas de hardware, conflictos de campo, sentido dominante. Entrega Código de Diagnóstico (ej: Código 14).",
    bgEffect: "blueprint" as const
  },
  { 
    id: "protocolo_calibracion", 
    label: "PROTOCOLO DE CALIBRACIÓN",
    subtitle: "Solución Técnica",
    pregunta: "El Doctor IA entregará tu protocolo personalizado: hábito de 24 horas de la Matriz de Reprogramación, ejercicio de descompresión específico para tu interfaz afectada, y script de cierre del sistema.",
    placeholder: "Si quieres ajustar el protocolo, describe tu rutina actual, horarios disponibles, o limitaciones...",
    icon: Wand2,
    color: GOLD,
    objetivo: "Calibración",
    costo: 4,
    guia_ia: "La IA entrega protocolo completo: Hábito de 24h de MATRICES_REPROGRAMACION, ejercicio de descompresión, script de cierre. Cruza interfaz primaria + secundaria para código específico.",
    bgEffect: "flow" as const
  }
];

const NEUTRAL_STEEL = "#475569";
const NEUTRAL_SLATE = "#64748b";

const MODULE_THRESHOLDS_ESP = [
  { pts: 10, label: "Iniciado" },
  { pts: 50, label: "Centurión" },
  { pts: 150, label: "Guerrero" },
  { pts: 500, label: "Soberano" },
];

function getNextModuleThresholdEsp(pts: number) {
  let currentLabel = "—";
  let currentPts = 0;
  for (const t of MODULE_THRESHOLDS_ESP) {
    if (pts >= t.pts) { currentLabel = t.label; currentPts = t.pts; }
  }
  const nextT = MODULE_THRESHOLDS_ESP.find(t => pts < t.pts) || null;
  const pct = nextT ? Math.min(((pts - currentPts) / (nextT.pts - currentPts)) * 100, 100) : 100;
  return { current: currentLabel, next: nextT?.label || null, ptsToNext: nextT ? nextT.pts - pts : 0, pct };
}

function EspejoModuleMilestoneBar({ pts }: { pts: number }) {
  const { current, next, ptsToNext, pct } = getNextModuleThresholdEsp(pts);
  const color = "#FF3131";
  return (
    <div className="px-3 py-2.5 rounded-xl border" style={{ backgroundColor: `${color}08`, borderColor: `${color}20` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color, fontFamily: "monospace" }}>
          {current} — ESPEJO
        </span>
        {next ? (
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
            Faltan <span className="font-bold text-white">{ptsToNext}</span> pts → {next}
          </span>
        ) : (
          <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
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

const EJE_BG_STYLES: Record<string, React.CSSProperties> = {
  fog: {
    background: `radial-gradient(ellipse at center, ${CYAN_NEON}04 0%, ${DARK_BG} 70%)`,
    backdropFilter: "blur(2px)"
  },
  blueprint: {
    background: `
      linear-gradient(${RED_ALERT}04 1px, transparent 1px),
      linear-gradient(90deg, ${RED_ALERT}04 1px, transparent 1px),
      radial-gradient(ellipse at center, ${RED_ALERT}06 0%, ${DARK_BG} 80%)`,
    backgroundSize: "40px 40px, 40px 40px, 100% 100%"
  },
  flow: {
    background: `
      linear-gradient(0deg, ${GOLD}06 25%, transparent 25%),
      linear-gradient(0deg, transparent 75%, ${GOLD}04 75%),
      radial-gradient(ellipse at bottom, ${GOLD}12 0%, ${DARK_BG} 55%)`,
    backgroundSize: "2px 20px, 2px 20px, 100% 100%"
  }
};

const MERCADOPAGO_URL = "https://mpago.la/1coKcGZ";
const CREDITS_KEY = "sistemicar_espejo_creditos";
const SOVEREIGNTY_ACCEPTED_KEY = "sistemicar_espejo_soberania";
const STORAGE_KEY = "sistemicar_espejo_sesiones";
const PRIVACY_KEY = "sistemicar_espejo_privacy";

function isMensajeProtocoloDebil(mensaje: string | null | undefined): boolean {
  const t = (mensaje || "").trim();
  if (t.length < 80) return true;
  return /registro procesado|continúa con el siguiente eje|tu reflexión ha sido registrada/i.test(t);
}

function buildProtocoloFallback(opts: {
  contexto?: string | null;
  ducha?: string;
  diagnostico?: string;
  notaUsuario?: string;
  pata?: string | null;
}): string {
  const zona = opts.pata || "ESTABILIDAD";
  const contexto = opts.contexto || "General";
  const ducha = (opts.ducha || "").trim().slice(0, 280);
  const diag = (opts.diagnostico || "").trim().slice(0, 280);
  const nota = (opts.notaUsuario || "").trim().slice(0, 200);

  return `PROTOCOLO DE CALIBRACIÓN — ${contexto}
Raíz activa: ${zona}

PATA 1 — ESTABILIDAD (Cuerpo / Recursos)
Hoy, en los próximos 24h: 10 minutos de descarga somática.
1) Siéntate o camina sin pantalla.
2) Nombra en voz alta la carga que registraste${ducha ? `: "${ducha.slice(0, 120)}${ducha.length > 120 ? "…" : ""}"` : "."}
3) Elige UNA acción concreta de 15 minutos que reduzca esa carga (ordenar, pagar, escribir, mover el cuerpo).

PATA 2 — CONEXIÓN (Vínculos / Comunicación)
Antes de dormir: una frase clara a alguien relevante o, si no aplica, 5 minutos de silencio sin responder chats.
Frase sugerida: "Hoy estoy trabajando un patrón concreto; mañana te cuento con más claridad."

PATA 3 — VISIÓN (Claridad / Dirección)
Escribe 3 líneas:
1) Qué interferencia sigue activa.
2) Qué decisión de esta semana la reduce.
3) Qué evidencia verás mañana si el protocolo funcionó.
${diag ? `\nAncla de diagnóstico:\n${diag.slice(0, 200)}${diag.length > 200 ? "…" : ""}\n` : ""}${nota ? `\nAjuste que pediste:\n${nota}\n` : ""}
PATA 4 — ORIGEN (Identidad / Mando)
Afirmación de cierre (mañana al despertar, 60 segundos):
"Yo calibro mi voltaje con hechos, no con ruido. Hoy ejecuto una sola acción de la pata ${zona}."

Métrica 24h: marca hecho/no hecho en cada pata. No requiere Planificación ni Jornada para valer.
Estado de Interfaz: Descomprimiendo. Voltaje residual: 42%. Procede.`;
}

interface IAResponse {
  profundidad: number;
  puede_avanzar: boolean;
  polaridad?: "NEGATIVO" | "POSITIVO" | "NEUTRO";
  codigo_343?: string | null;
  pata_material?: string | null;
  costo_llave?: number | null;
  oxidacion_detectada?: boolean;
  pata_detectada?: string | null;
  nivel_señal?: "latente" | "activa" | "critica" | "insuficiente" | null;
  recomendacion_sesion?: "continuar" | "cerrar" | null;
  mensaje: string;
  confrontacion: string | null;
  codigo_diagnostico?: string | null;
  interfaz_primaria?: string | null;
  interfaz_secundaria?: string | null;
  firma_salida?: string;
}

const COLOR_343: Record<number, string> = {
  1: "#FF3131",
  2: "#FF8C00",
  3: "#D4AF37",
  4: "#00C851",
  5: "#2196F3",
  6: "#9C27B0",
  7: "#7C4DFF",
};

const INTERFAZ_TO_COLOR: Record<string, string> = {
  M01: "ROJO", M02: "NARANJA", M03: "VERDE", M04: "MORADO", M05: "AZUL",
  M06: "ROJO", M07: "AMARILLO", M08: "NARANJA", M09: "ROJO", M10: "VIOLETA",
};

const INTERFAZ_TO_IDENTIDAD: Record<string, string> = {
  M01: "EL_TERRITORIO_M", M02: "EL_TERRITORIO_M", M03: "EL_PODER_M",
  M04: "LA_SEMILLA_F", M05: "LA_MISERICORDIA_F",
  M06: "LA_VISION_F", M07: "EL_RIGOR_M",
  M08: "EL_PODER_M", M09: "LA_SEMILLA_F", M10: "LA_VISION_F",
};

const PATA_TO_ZONA: Record<string, string> = {
  ESTABILIDAD: "BASE", CONEXION: "CORAZON", VISION: "FRENTE", ORIGEN: "CORONILLA",
};

const WELCOME_MESSAGE = `Acceso concedido, Pasajero.

Has firmado el contrato. Desde este segundo, tu lenguaje deja de ser una opinión y se convierte en Datos de Ingeniería. No estoy aquí para validar tus emociones, sino para calibrar tu Voltaje.

Tu hardware biológico es una antena de alta precisión que hoy está operando con interferencias o, peor aún, se está oxidando en el silencio del neutro.

Iniciamos la Ducha Mental. No pienses, solo vierte. Suelta el ruido, las deudas, los miedos, o esa pesada estabilidad que te está deteniendo. Mi escáner está activo.

Sé específico: ¿dónde lo sientes en el cuerpo? ¿qué imagen aparece? ¿cuál es el pensamiento más pesado que cargas hoy?

Barre tu sistema ahora. Te escucho.`;

interface MapaVoltaje {
  voltaje_total: number;
  ejes_voltaje: { registro_carga: number; diagnostico_clinico: number; protocolo_calibracion: number };
  diagnostico: string;
  frecuencia_dominante: string;
  recomendacion: string;
  codigo_diagnostico?: string;
  interfaz_primaria?: string;
  interfaz_secundaria?: string;
  vibracion_final?: number;
}

interface SesionEspejo {
  id: string;
  fecha: Date;
  modo: "arquitecto";
  contexto?: string;
  tipo_sesion?: "autonoma" | "asistida" | "ducha_mental";
  timestamp_inicio?: number;
  timestamp_fin?: number;
  contenido: {
    registro_carga?: string;
    diagnostico_clinico?: string;
    protocolo_calibracion?: string;
    afloramiento?: string;
    disociacion?: string;
    recursos?: string;
    comparativa?: string;
    preparacion?: string;
    fragmentos?: string[];
  };
  puntos: number;
  mapaVoltaje?: MapaVoltaje;
  vibracion_final?: number;
}

export default function Espejo() {
  const { user, login } = useAuthContext();
  const [, navigate] = useLocation();
  useViewTransitionShield();
  useJornadaActiveVehicleIds(user?.uid);
  const [phase, setPhase] = useState<"landing" | "preparacion" | "arquitecto" | "historial" | "mapa">("landing");
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [sesiones, setSesiones] = useState<SesionEspejo[]>([]);
  const [showSovereigntyPopup, setShowSovereigntyPopup] = useState(false);
  const [sovereigntyAccepted, setSovereigntyAccepted] = useState(false);
  
  const [credits, setCredits] = useState(0);
  
  
  const [currentStep, setCurrentStep] = useState(0);
  const [respuestas, setRespuestas] = useState<{[key: string]: string}>({});
  const [currentTexto, setCurrentTexto] = useState("");
  const [prepTexto, setPrepTexto] = useState("");
  const [showCelebracion, setShowCelebracion] = useState(false);
  const [selectedContexto, setSelectedContexto] = useState<string | null>(null);
  const [showContextoSelector, setShowContextoSelector] = useState(false);
  /** "ducha" = acceso libre al Eje 1 (gratis); "full" = sesión completa con paywall */
  const [pendingStartMode, setPendingStartMode] = useState<"ducha" | "full">("full");
  const [showConfetti, setShowConfetti] = useState(false);
  const [userRank, setUserRank] = useState("Iniciado");
  const [expandedSesion, setExpandedSesion] = useState<string | null>(null);
  
  const [showDatosGate, setShowDatosGate] = useState(false);
  const [prospectoVerificado, setProspectoVerificado] = useState(false);
  const [verificandoProspecto, setVerificandoProspecto] = useState(false);
  const [conviccionCheck, setConviccionCheck] = useState(0);
  const [showAfiliacionModal, setShowAfiliacionModal] = useState(false);
  const [userSovereigntyPoints, setUserSovereigntyPoints] = useState(0);
  const [ptsEspejo, setPtsEspejo] = useState(0);
  const [isGoldenProtocol, setIsGoldenProtocol] = useState(false);

  const [bloqueoEje3, setBloqueoEje3] = useState<BloqueoEje3 | null>(null);
  const [bloqueoCountdown, setBloqueoCountdown] = useState("");

  const [iaLoading, setIaLoading] = useState(false);
  const [iaFeedback, setIaFeedback] = useState<IAResponse | null>(null);
  const [iaBlocked, setIaBlocked] = useState(false);
  const [showGlitchDiag, setShowGlitchDiag] = useState(false);
  const [lastDiagCode, setLastDiagCode] = useState<string | null>(null);
  const [lastInterfazPrimaria, setLastInterfazPrimaria] = useState<string | null>(null);
  const [vuValues, setVuValues] = useState({ estabilidad: 20, conexion: 20, vision: 20, mando: 20 });
  const [activeZones, setActiveZones] = useState<string[]>([]);
  const [alertZone, setAlertZone] = useState<string | undefined>(undefined);
  const [mapaVoltaje, setMapaVoltaje] = useState<MapaVoltaje | null>(null);
  const [mapaLoading, setMapaLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [usedDoctorIA, setUsedDoctorIA] = useState(false);

  const [eje3DynamicCost, setEje3DynamicCost] = useState<number | null>(null);
  const [pataDetectada, setPataDetectada] = useState<string | null>(null);
  const [oxidacionDetectada, setOxidacionDetectada] = useState(false);
  const [eje1FeedbackShown, setEje1FeedbackShown] = useState(false);
  const [nivelSeñal, setNivelSeñal] = useState<string | null>(null);
  const [recomendacionSesion, setRecomendacionSesion] = useState<"continuar" | "cerrar" | null>(null);
  const [codigo343, setCodigo343] = useState<string | null>(null);
  const [activeColor343, setActiveColor343] = useState<string | undefined>(undefined);
  const [welcomeShown, setWelcomeShown] = useState(false);
  const [welcomeText, setWelcomeText] = useState("");

  const [activeFase, setActiveFase] = useState<"AZUL" | "ESPEJO" | "POLO" | "PIO" | null>(null);
  const [doctorMarkerColor, setDoctorMarkerColor] = useState<string | null>(null);
  const [activeIdentidad, setActiveIdentidad] = useState<string | null>(null);
  const [activeZonaCorporal, setActiveZonaCorporal] = useState<string | null>(null);
  const [showMuro, setShowMuro] = useState<boolean>(!isMuroFirmado());
  const [cleanedMensaje, setCleanedMensaje] = useState<string | null>(null);
  const [seguimientoActivado, setSeguimientoActivado] = useState(false);
  const [calibracionDoctorText, setCalibracionDoctorText] = useState<string | null>(null);
  const [seguimientoLoading, setSeguimientoLoading] = useState(false);
  const [protocoloGuardando, setProtocoloGuardando] = useState(false);
  const [protocoloGuardado, setProtocoloGuardado] = useState(false);
  const [eje2MensajeText, setEje2MensajeText] = useState<string | null>(null);
  const [show5DayModal, setShow5DayModal] = useState(false);
  const [plan5Dias, setPlan5Dias] = useState<Array<{ dayNum: number; titulo: string; hora: string }>>([]);
  const [protocolo5DiasLoading, setProtocolo5DiasLoading] = useState(false);
  const [protocolo5DiasActivado, setProtocolo5DiasActivado] = useState(false);

  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
  const [pacientesLista, setPacientesLista] = useState<Paciente[]>([]);
  const [showPacienteModal, setShowPacienteModal] = useState(false);
  const [showNivelUpdateModal, setShowNivelUpdateModal] = useState(false);
  const [nivelUpdateSugerido, setNivelUpdateSugerido] = useState<string | null>(null);

  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceAnalisis, setVoiceAnalisis] = useState<{ codigo: string; nivel: string; estado_emocional: string; justificacion: string } | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number>(0);
  const finalTranscriptRef = useRef<string>("");
  const emotionalWordCountRef = useRef<number>(0);
  const lastSpeechTimeRef = useRef<number>(0);
  const isSpeakingRef = useRef<boolean>(false);
  const pauseDurationsRef = useRef<number[]>([]);
  const pauseAnalysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnalyzingVoiceRef = useRef<boolean>(false);
  const lastAnalyzedTranscriptRef = useRef<string>("");
  const isRecordingIntentRef = useRef<boolean>(false);

  useEffect(() => {
    const privacy = localStorage.getItem(PRIVACY_KEY);
    if (privacy === "true") setPrivacyMode(true);
    
    const accepted = localStorage.getItem(SOVEREIGNTY_ACCEPTED_KEY);
    if (accepted === "true") setSovereigntyAccepted(true);
    
    if (user) {
      const isOwnerAccess = user.email?.toLowerCase() === "gilsonarevalo.leo@gmail.com";
      getMuroFirmado(user.uid).then((firmado) => {
        if (firmado) setShowMuro(false);
      }).catch(() => {});
      if (isOwnerAccess) {
        setProspectoVerificado(true);
      } else {
        const email = getUserEmail();
        if (email) {
          setVerificandoProspecto(true);
          getProspectoByEmail(email).then((p) => {
            setProspectoVerificado(!!p);
            setVerificandoProspecto(false);
          }).catch(() => {
            setVerificandoProspecto(false);
          });
        }
      }

      const unsubProg = subscribeToProgression(
        user.uid,
        (prog: UserProgression) => {
          setIsPremium(prog.rank === "arquitecto" || isOwnerAccess);
          setUserSovereigntyPoints(prog.sovereigntyPoints || 0);
          setPtsEspejo(prog.ptsEspejo || 0);
        },
        () => {}
      );
      const unsubSessions = subscribeToEspejoSessions(
        user.uid,
        (sessions) => setSesiones(sessions as any),
        () => {}
      );
      const unsubCredits = subscribeToEspejoCredits(
        user.uid,
        (c) => setCredits(c),
        () => {}
      );
      const unsubConviccion = subscribeToConviccion(
        user.uid,
        (level) => setConviccionCheck(level),
        () => {}
      );
      return () => { unsubProg(); unsubSessions(); unsubCredits(); unsubConviccion(); };
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/espejo/claim-purchase-credits", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && data.grantedCredits > 0) {
          toast.success(data.message || `+${data.grantedCredits} créditos activados`);
          window.dispatchEvent(new CustomEvent("espejo-credits-updated"));
        }
      } catch {
        /* respaldo si el webhook aún no acreditó */
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  useEffect(() => {
    if (!user || user.email?.toLowerCase() !== "gilsonarevalo.leo@gmail.com") return;
    const unsub = subscribeToPacientes(user.uid, setPacientesLista, () => {});
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!bloqueoEje3) return;
    const tick = () => {
      const remaining = bloqueoEje3.hasta - Date.now();
      if (remaining <= 0) {
        setBloqueoEje3(null);
        setBloqueoCountdown("");
        return;
      }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setBloqueoCountdown(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [bloqueoEje3]);

  useEffect(() => {
    if (phase !== "arquitecto" || currentStep !== 0 || welcomeShown) return;
    let i = 0;
    setWelcomeText("");
    const interval = setInterval(() => {
      i++;
      setWelcomeText(WELCOME_MESSAGE.slice(0, i));
      if (i >= WELCOME_MESSAGE.length) {
        clearInterval(interval);
        setTimeout(() => setWelcomeShown(true), 600);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [phase, currentStep, welcomeShown]);

  const updateCredits = (newCredits: number) => {
    setCredits(newCredits);
    if (user) setEspejoCredits(user.uid, newCredits);
  };

  const saveSesion = async (sesion: SesionEspejo) => {
    if (user) {
      registrarEvento(COMPONENTES.ESPEJO);
      await addEspejoSession(user.uid, {
        fecha: sesion.fecha,
        modo: sesion.modo,
        contexto: sesion.contexto,
        pacienteId: selectedPacienteId ?? undefined,
        tipo_sesion: sesion.tipo_sesion,
        timestamp_inicio: sesion.timestamp_inicio,
        timestamp_fin: sesion.timestamp_fin,
        contenido: sesion.contenido,
        puntos: sesion.puntos,
        mapaVoltaje: sesion.mapaVoltaje,
        vibracion_final: sesion.vibracion_final
      });
    }
  };

  const togglePrivacy = () => {
    const newVal = !privacyMode;
    setPrivacyMode(newVal);
    localStorage.setItem(PRIVACY_KEY, newVal.toString());
  };

  const userEmail = getUserEmail();
  const esOwnerUser = isOwner(userEmail) || isOwner(user?.email);
  const esAccesoTotal = isPremium || esOwnerUser;

  useEffect(() => {
    if (esOwnerUser) setShowMuro(false);
  }, [esOwnerUser]);

  useEffect(() => {
    if (esOwnerUser && user && credits === 0) {
      setEspejoCredits(user.uid, 999);
      setCredits(999);
    }
  }, [esOwnerUser, user, credits]);

  useEffect(() => {
    if (!iaFeedback) setCleanedMensaje(null);
  }, [iaFeedback]);

  useEffect(() => {
    setSpeechSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    return () => {
      if (pauseAnalysisTimerRef.current) clearTimeout(pauseAnalysisTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) { try { audioContextRef.current.close(); } catch {} }
    };
  }, []);

  const analyzeVoiceTranscript = async (transcript: string) => {
    const trimmed = transcript.trim();
    if (!trimmed || trimmed.length < 10) return;
    if (isAnalyzingVoiceRef.current) return;
    if (trimmed === lastAnalyzedTranscriptRef.current) return;
    isAnalyzingVoiceRef.current = true;
    lastAnalyzedTranscriptRef.current = trimmed;
    setVoiceLoading(true);
    try {
      const durationSec = Math.max(1, (Date.now() - recordingStartRef.current) / 1000);
      const wordCount = transcript.trim().split(/\s+/).length;
      const wpm = Math.round((wordCount / durationSec) * 60);
      const pauses = pauseDurationsRef.current;
      const avgPauseSeg = pauses.length > 0
        ? Math.round((pauses.reduce((a, b) => a + b, 0) / pauses.length) * 10) / 10
        : null;
      const response = await fetch("/api/espejo/analizar-voz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcripcion: transcript,
          palabras_por_minuto: wpm,
          longitud_pausas_seg: avgPauseSeg,
          palabras_emocionales_count: emotionalWordCountRef.current,
        })
      });
      if (response.ok) {
        const data = await response.json();
        setVoiceAnalisis(data);
        const num = parseInt(data.codigo?.replace("C", "") || "1");
        if (num >= 1 && num <= 3) setActiveZones(["ESTABILIDAD"]);
        else if (num >= 4 && num <= 5) setActiveZones(["CONEXION"]);
        else if (num >= 6 && num <= 7) setActiveZones(["VISION"]);
        else setActiveZones(["MANDO"]);
      }
    } catch (err) {
      console.error("[voz] Error analizando:", err);
      lastAnalyzedTranscriptRef.current = "";
    } finally {
      isAnalyzingVoiceRef.current = false;
      setVoiceLoading(false);
    }
  };

  const cleanupVoiceRecording = () => {
    isRecordingIntentRef.current = false;
    if (pauseAnalysisTimerRef.current) {
      clearTimeout(pauseAnalysisTimerRef.current);
      pauseAnalysisTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsVoiceRecording(false);
    setInterimTranscript("");
    setVoiceAmplitude(0);
    setVuValues({ estabilidad: 20, conexion: 20, vision: 20, mando: 20 });
  };

  const stopVoiceRecording = async () => {
    const transcript = finalTranscriptRef.current;
    cleanupVoiceRecording();
    if (transcript.trim().length > 10) {
      await analyzeVoiceTranscript(transcript);
    }
  };

  const startVoiceRecording = async () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;
    setVoiceAnalisis(null);
    finalTranscriptRef.current = voiceTranscript;
    emotionalWordCountRef.current = 0;
    recordingStartRef.current = Date.now();
    lastSpeechTimeRef.current = Date.now();
    isSpeakingRef.current = false;
    pauseDurationsRef.current = [];
    lastAnalyzedTranscriptRef.current = "";
    isAnalyzingVoiceRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const SILENCE_THRESHOLD = 12;
      const PAUSE_MIN_MS = 400;
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const amplitude = Math.min(100, Math.round(avg * 3.5));
        const now = Date.now();
        const PAUSE_AUTO_ANALYSIS_MS = 2500;
        if (avg > SILENCE_THRESHOLD) {
          if (!isSpeakingRef.current && lastSpeechTimeRef.current > 0) {
            const pauseMs = now - lastSpeechTimeRef.current;
            if (pauseMs > PAUSE_MIN_MS) {
              pauseDurationsRef.current.push(pauseMs / 1000);
            }
          }
          if (!isSpeakingRef.current) {
            if (pauseAnalysisTimerRef.current) {
              clearTimeout(pauseAnalysisTimerRef.current);
              pauseAnalysisTimerRef.current = null;
            }
          }
          isSpeakingRef.current = true;
          lastSpeechTimeRef.current = now;
        } else {
          if (isSpeakingRef.current) {
            isSpeakingRef.current = false;
            if (!pauseAnalysisTimerRef.current) {
              pauseAnalysisTimerRef.current = setTimeout(() => {
                pauseAnalysisTimerRef.current = null;
                const t = finalTranscriptRef.current;
                if (t.trim().length > 10) {
                  analyzeVoiceTranscript(t);
                }
              }, PAUSE_AUTO_ANALYSIS_MS);
            }
          }
        }
        setVoiceAmplitude(amplitude);
        const noise = () => Math.round((Math.random() - 0.5) * 8);
        setVuValues({
          estabilidad: Math.max(10, Math.min(95, 20 + Math.round(amplitude * 0.85) + noise())),
          conexion: Math.max(8, Math.min(90, 15 + Math.round(amplitude * 0.7) + noise())),
          vision: Math.max(6, Math.min(85, 12 + Math.round(amplitude * 0.55) + noise())),
          mando: Math.max(5, Math.min(80, 10 + Math.round(amplitude * 0.45) + noise())),
        });
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn("[voz] Acceso al micrófono denegado:", err);
      toast.error("Acceso al micrófono denegado. Habilita el permiso en tu navegador.", {
        style: { background: "#0A0A0A", border: "1px solid #FF313140", color: "#FF3131", fontFamily: "monospace" }
      });
      return;
    }
    const recognition = new SpeechRec();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    const EMOTIONAL_WORDS = ["miedo", "deuda", "crisis", "no puedo", "frustrado", "ansioso", "perdido", "bloqueo", "dolor", "rabia", "triste", "solo", "sin dinero", "quiero", "sueño", "meta", "lograr", "urgente", "cansado", "rendirme"];
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = finalTranscriptRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final = (final + " " + t).trim();
          finalTranscriptRef.current = final;
          setVoiceTranscript(final);
          setCurrentTexto(prev => (prev + " " + t).trim());
          const lower = final.toLowerCase();
          emotionalWordCountRef.current = EMOTIONAL_WORDS.filter(w => lower.includes(w)).length;
        } else {
          interim = t;
        }
      }
      setInterimTranscript(interim);
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.warn("[voz] SpeechRecognition error:", event.error);
      }
    };
    recognition.onend = () => {
      if (isRecordingIntentRef.current && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }
    };
    isRecordingIntentRef.current = true;
    try {
      recognition.start();
      setIsVoiceRecording(true);
    } catch (err) {
      console.error("[voz] Error iniciando reconocimiento:", err);
      cleanupVoiceRecording();
    }
  };

  const parseAndCleanMarkers = (text: string): {
    clean: string;
    fase?: "AZUL" | "ESPEJO" | "POLO" | "PIO";
    color?: string;
    identidad?: string;
    zona?: string;
  } => {
    const faseMatch = text.match(/\[FASE:\s*([A-Z]+)\s*\]/i);
    const colorMatch = text.match(/\[COLOR:\s*([^\]]+?)\s*\]/i);
    const identidadMatch = text.match(/\[IDENTIDAD:\s*([^\]]+?)\s*\]/i);
    const zonaMatch = text.match(/\[ZONA:\s*([^\]]+?)\s*\]/i);
    const clean = text.replace(/\[(FASE|COLOR|IDENTIDAD|ZONA):[^\]]+\]/gi, "").replace(/\s{2,}/g, " ").trim();
    type FaseKey = "AZUL" | "ESPEJO" | "POLO" | "PIO";
    const isFaseKey = (v: string): v is FaseKey => ["AZUL", "ESPEJO", "POLO", "PIO"].includes(v);
    const rawFase = faseMatch?.[1]?.trim().toUpperCase();
    const rawColor = colorMatch?.[1]?.trim().toUpperCase();
    const rawIdentidad = identidadMatch?.[1]?.trim().toUpperCase();
    const rawZona = zonaMatch?.[1]?.trim().toUpperCase();
    return {
      clean,
      fase: rawFase && isFaseKey(rawFase) ? rawFase : undefined,
      color: rawColor || undefined,
      identidad: rawIdentidad || undefined,
      zona: rawZona || undefined,
    };
  };

  const consultarDoctorIA = async (eje: string, texto: string, costo: number = 1): Promise<IAResponse | null> => {
    const costoVisual = costo;
    if (esOwnerUser) {
      costo = 0;
    }
    if (credits < costo) {
      setIaBlocked(true);
      return null;
    }

    setIaLoading(true);
    setIaFeedback(null);
    setDoctorMarkerColor(null);
    
    try {
      const contextoLabel = CONTEXTOS.find(c => c.id === selectedContexto)?.label || "General";
      const pacienteActual = selectedPacienteId ? pacientesLista.find(p => p.id === selectedPacienteId) : null;
      const respuestasParaIA = {
        ...respuestas,
        ...(eje2MensajeText ? { diagnostico_clinico: eje2MensajeText } : {}),
      };
      const response = await fetch("/api/espejo-doctor-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eje,
          texto,
          contexto: contextoLabel,
          respuestas_previas: respuestasParaIA,
          preparacion: prepTexto,
          paciente_codigo: pacienteActual?.codigoActual || null,
          paciente_nivel: pacienteActual?.nivelMadurez || null,
          paciente_nombre: pacienteActual?.nombre || null,
          paciente_notas: pacienteActual?.notasGenerales || null,
          voz_codigo: voiceAnalisis?.codigo || null,
          voz_nivel: voiceAnalisis?.nivel || null,
          voz_estado_emocional: voiceAnalisis?.estado_emocional || null
        })
      });
      
      const data: IAResponse = await response.json();
      const parsed = parseAndCleanMarkers(data.mensaje || "");
      setCleanedMensaje(parsed.clean);
      if (eje === "protocolo_calibracion") {
        setCalibracionDoctorText(parsed.clean);
      }
      if (eje === "diagnostico_clinico") {
        setEje2MensajeText(parsed.clean);
      }
      setIaFeedback(data);
      updateCredits(credits - costo);
      if (costoVisual > 0) {
        const ejeColors: Record<string, string> = {
          registro_carga: CYAN_NEON,
          diagnostico_clinico: GOLD,
          protocolo_calibracion: "#F97316",
        };
        const ejeColor = ejeColors[eje] || CYAN_NEON;
        toast(`▸ ${costoVisual} crédito${costoVisual > 1 ? "s" : ""} consumido${costoVisual > 1 ? "s" : ""}`, {
          style: { background: "#0A0A0A", border: `1px solid ${ejeColor}40`, color: ejeColor, fontFamily: "monospace", fontSize: "11px" },
          duration: 2000,
        });
      }
      setUsedDoctorIA(true);
      
      setOxidacionDetectada(!!data.oxidacion_detectada);

      if (eje === "registro_carga") {
        if (data.pata_detectada) setPataDetectada(data.pata_detectada);
        if (data.nivel_señal) setNivelSeñal(data.nivel_señal);
        if (data.recomendacion_sesion) setRecomendacionSesion(data.recomendacion_sesion);
        setEje1FeedbackShown(true);
      }

      if (data.codigo_343) {
        setCodigo343(data.codigo_343);
        const parts = data.codigo_343.split(".");
        const sDigit = parseInt(parts[1]);
        if (sDigit >= 1 && sDigit <= 7) {
          setActiveColor343(COLOR_343[sDigit]);
          if (sDigit <= 2) setActiveZones(["ESTABILIDAD"]);
          else if (sDigit === 3) setActiveZones(["CONEXION"]);
          else if (sDigit === 4) setActiveZones(["MANDO"]);
          else if (sDigit === 5) setActiveZones(["CONEXION"]);
          else setActiveZones(["VISION"]);
        }
      }

      if (data.costo_llave) setEje3DynamicCost(data.costo_llave);

      if (data.codigo_diagnostico) {
        setLastDiagCode(data.codigo_diagnostico);
        setLastInterfazPrimaria(data.interfaz_primaria || null);
        setShowGlitchDiag(true);
        setTimeout(() => setShowGlitchDiag(false), 4000);
        if (selectedPacienteId && data.codigo_diagnostico) {
          setTimeout(() => {
            setNivelUpdateSugerido(data.codigo_diagnostico!);
            setShowNivelUpdateModal(true);
          }, 5000);
        }
        
        const ifz = data.interfaz_primaria || "";
        const num = parseInt(ifz.replace("M", ""));
        // Only update activeZones from interfaz when codigo_343 did NOT already set them
        const has343 = !!data.codigo_343;
        if (num >= 1 && num <= 3) {
          setAlertZone("ESTABILIDAD");
          if (!has343) setActiveZones(["ESTABILIDAD"]);
          setVuValues(prev => ({ ...prev, estabilidad: Math.min(prev.estabilidad + 25, 95) }));
        } else if (num >= 4 && num <= 5) {
          setAlertZone("CONEXION");
          if (!has343) setActiveZones(["CONEXION"]);
          setVuValues(prev => ({ ...prev, conexion: Math.min(prev.conexion + 25, 95) }));
        } else if (num >= 6 && num <= 7) {
          setAlertZone("VISION");
          if (!has343) setActiveZones(["VISION"]);
          setVuValues(prev => ({ ...prev, vision: Math.min(prev.vision + 25, 95) }));
        } else if (num >= 8 && num <= 10) {
          setAlertZone("MANDO");
          if (!has343) setActiveZones(["MANDO"]);
          setVuValues(prev => ({ ...prev, mando: Math.min(prev.mando + 25, 95) }));
        }
        setTimeout(() => setAlertZone(undefined), 3000);
      }

      const newFase = data.oxidacion_detectada
        ? "PIO"
        : eje === "registro_carga" ? "AZUL"
        : eje === "diagnostico_clinico" ? "ESPEJO"
        : "POLO";
      setActiveFase(newFase as "AZUL" | "ESPEJO" | "POLO" | "PIO");
      if (data.interfaz_primaria) {
        setDoctorMarkerColor(INTERFAZ_TO_COLOR[data.interfaz_primaria] ?? null);
        setActiveIdentidad(INTERFAZ_TO_IDENTIDAD[data.interfaz_primaria] ?? null);
      }
      if (data.pata_detectada) {
        setActiveZonaCorporal(PATA_TO_ZONA[data.pata_detectada] ?? null);
      }

      if (parsed.fase) setActiveFase(parsed.fase);
      if (parsed.color) setDoctorMarkerColor(parsed.color);
      if (parsed.identidad) setActiveIdentidad(parsed.identidad);
      if (parsed.zona) setActiveZonaCorporal(parsed.zona);
      // PIO fallback: si modo oxidación sin color explícito, usar NEUTRO para que ColorBadge lo muestre
      if (data.oxidacion_detectada && !data.interfaz_primaria && !parsed.color) {
        setDoctorMarkerColor("NEUTRO");
      }
      
      if (!data.puede_avanzar) {
        toast.error("Doctor IA: Profundidad insuficiente — Requiere datos somáticos", {
          style: { backgroundColor: DARK_BG, border: `1px solid ${RED_ALERT}`, color: RED_ALERT }
        });
      }
      return data;
    } catch (error) {
      const fallbackMsg = eje === "protocolo_calibracion"
        ? buildProtocoloFallback({
            contexto: CONTEXTOS.find(c => c.id === selectedContexto)?.label,
            ducha: respuestas.registro_carga,
            diagnostico: eje2MensajeText || respuestas.diagnostico_clinico,
            notaUsuario: texto,
            pata: pataDetectada,
          })
        : "Registro procesado. Continúa con el siguiente eje.";
      const fallback: IAResponse = {
        profundidad: 5,
        puede_avanzar: true,
        oxidacion_detectada: false,
        mensaje: fallbackMsg,
        confrontacion: null
      };
      setCleanedMensaje(fallbackMsg);
      setIaFeedback(fallback);
      if (eje === "protocolo_calibracion") setCalibracionDoctorText(fallbackMsg);
      if (eje === "registro_carga") setEje1FeedbackShown(true);
      return fallback;
    } finally {
      setIaLoading(false);
    }
  };

  const advanceToNextStep = async (texto: string) => {
    if (!user) return;
    if (isVoiceRecording) {
      await stopVoiceRecording();
    }
    setVoiceTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    lastAnalyzedTranscriptRef.current = "";
    const eje = EJES[currentStep];
    // Guardar el texto clínico de la IA cuando exista (no solo la nota del usuario)
    let contenidoEje = texto.trim();
    if (currentStep === 1 && (eje2MensajeText || cleanedMensaje)) {
      contenidoEje = eje2MensajeText || cleanedMensaje || contenidoEje;
    }
    if (currentStep === 2 && (calibracionDoctorText || cleanedMensaje || iaFeedback?.mensaje)) {
      contenidoEje = calibracionDoctorText || cleanedMensaje || iaFeedback?.mensaje || contenidoEje;
    }
    const newRespuestas = { ...respuestas, [eje.id]: contenidoEje };
    setRespuestas(newRespuestas);
    setCurrentTexto("");
    setIaFeedback(null);
    
    toast.success(`${eje.label} completado`, {
      style: { backgroundColor: "#0a0a0a", border: `1px solid ${eje.color}`, color: eje.color }
    });
    
    if (currentStep < EJES.length - 1) {
      setCurrentStep(prev => prev + 1);
      // Al llegar al Eje 3, no bloquear el botón por oxidación previa
      if (currentStep + 1 === 2) {
        setOxidacionDetectada(false);
      }
    } else {
      await awardSovereigntyPoints(user.uid, FIXED_POINTS, "Espejo Soberano: Sesión Completa +58 PS");
      await incrementModulePoints(user.uid, "espejo", 1).catch(() => {});
      
      const newConviccion = await incrementConviccionCheck(user.uid);
      const updatedPS = userSovereigntyPoints + FIXED_POINTS;
      if (newConviccion >= 4 && updatedPS >= 232) {
        setIsGoldenProtocol(true);
        setTimeout(() => setShowAfiliacionModal(true), 2000);
      }
      
      setMapaLoading(true);
      setPhase("mapa");
      
      const tipoSesion = usedDoctorIA ? "asistida" : "autonoma";
      const timestampFin = Date.now();
      
      let mapa: MapaVoltaje;
      try {
        const contextoLabel = CONTEXTOS.find(c => c.id === selectedContexto)?.label || "General";
        const pacienteParaMapa = selectedPacienteId ? pacientesLista.find(p => p.id === selectedPacienteId) : null;
        const res = await fetch("/api/espejo-mapa-voltaje", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            respuestas: newRespuestas,
            contexto: contextoLabel,
            tipo_sesion: tipoSesion,
            paciente_codigo: pacienteParaMapa?.codigoActual || null,
            paciente_nivel: pacienteParaMapa?.nivelMadurez || null,
            paciente_nombre: pacienteParaMapa?.nombre || null
          })
        });
        mapa = await res.json();
      } catch {
        mapa = {
          voltaje_total: 50,
          ejes_voltaje: { registro_carga: 50, diagnostico_clinico: 50, protocolo_calibracion: 50 },
          diagnostico: "Sesión completada. Tu registro de hardware ha sido procesado.",
          frecuencia_dominante: "Procesando",
          recomendacion: "Continúa con el registro de interferencias diario."
        };
      }
      
      setMapaVoltaje(mapa);
      setMapaLoading(false);
      
      const contextoInfo = CONTEXTOS.find(c => c.id === selectedContexto);
      const vibracionFinal = mapa.vibracion_final || (mapa.ejes_voltaje ? Math.abs((mapa.ejes_voltaje.protocolo_calibracion || 50) - (mapa.ejes_voltaje.registro_carga || 50)) : 0);
      saveSesion({
        id: `arq_${Date.now()}`,
        fecha: new Date(),
        modo: "arquitecto",
        contexto: contextoInfo?.label || "General",
        tipo_sesion: tipoSesion,
        timestamp_inicio: sessionStartTime,
        timestamp_fin: timestampFin,
        contenido: { ...newRespuestas, preparacion: prepTexto },
        puntos: FIXED_POINTS,
        mapaVoltaje: mapa,
        vibracion_final: vibracionFinal
      });

      addExpedienteClinico(user.uid, {
        fecha: new Date(),
        seccion_afectada: selectedContexto ? [selectedContexto] : [],
        codigo_diagnostico: mapa.codigo_diagnostico || lastDiagCode || "",
        interfaz_primaria: mapa.interfaz_primaria || lastInterfazPrimaria || "",
        interfaz_secundaria: mapa.interfaz_secundaria || "",
        respuestas: newRespuestas,
        estado_habito: false,
        vibracion_final: vibracionFinal,
        timestamp_inicio: sessionStartTime,
        timestamp_fin: timestampFin
      }).catch(err => console.error("Error guardando expediente clínico:", err));
      
      const totalSesiones = sesiones.filter(s => s.modo === "arquitecto").length + 1;
      if (totalSesiones >= 20) setUserRank("Maestro");
      else if (totalSesiones >= 10) setUserRank("Arquitecto");
      else if (totalSesiones >= 5) setUserRank("Guerrero");
      else if (totalSesiones >= 2) setUserRank("Explorador");
      else setUserRank("Iniciado");
      
      setShowConfetti(true);
      setShowCelebracion(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const handleCerrarDuchaMental = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (isVoiceRecording) cleanupVoiceRecording();
    const PS_DUCHA = 10;
    const textoRegistrado = (respuestas.registro_carga || currentTexto).trim();
    if (textoRegistrado.length < 5) {
      toast.error("Escribe al menos 5 caracteres para guardar la ducha");
      return;
    }
    const vibracionFinal = nivelSeñal === "critica" ? 15 : nivelSeñal === "activa" ? 35 : nivelSeñal === "insuficiente" ? 20 : 30;
    const fecha = new Date();
    const prep = prepTexto.trim();
    const sessionPayload = {
      fecha,
      modo: "arquitecto" as const,
      contexto: CONTEXTOS.find(c => c.id === selectedContexto)?.label || "General",
      pacienteId: selectedPacienteId ?? undefined,
      tipo_sesion: "ducha_mental" as const,
      timestamp_inicio: sessionStartTime || Date.now(),
      timestamp_fin: Date.now(),
      contenido: {
        registro_carga: textoRegistrado,
        ...(prep ? { preparacion: prep } : {}),
      },
      puntos: PS_DUCHA,
      vibracion_final: vibracionFinal,
    };
    try {
      await awardSovereigntyPoints(user.uid, PS_DUCHA, "Espejo v5 — Ducha Mental");
      await addExpedienteClinico(user.uid, {
        fecha,
        seccion_afectada: pataDetectada ? [pataDetectada] : (selectedContexto ? [selectedContexto] : []),
        codigo_diagnostico: "",
        interfaz_primaria: "",
        interfaz_secundaria: "",
        respuestas: prep
          ? { registro_carga: textoRegistrado, preparacion: prep }
          : { registro_carga: textoRegistrado },
        estado_habito: false,
        vibracion_final: vibracionFinal,
        tipo_sesion: "ducha_mental",
        timestamp_inicio: sessionStartTime || Date.now(),
        timestamp_fin: Date.now()
      });
      const sessionId = await addEspejoSession(user.uid, sessionPayload);
      setSesiones(prev => [{
        id: sessionId,
        ...sessionPayload,
      }, ...prev.filter(s => s.id !== sessionId)]);
      toast.success(`+${PS_DUCHA} PS — Ducha Mental guardada`, {
        description: "Puedes revisarla en Historial o Expedientes Clínicos.",
        style: { backgroundColor: "#0a0a0a", border: `1px solid ${CYAN_NEON}`, color: CYAN_NEON },
        duration: 5000
      });
      setCurrentStep(0);
      setRespuestas({});
      setCurrentTexto("");
      setPrepTexto("");
      setIaFeedback(null);
      setIaBlocked(false);
      setEje1FeedbackShown(false);
      setNivelSeñal(null);
      setRecomendacionSesion(null);
      setPataDetectada(null);
      setOxidacionDetectada(false);
      setCodigo343(null);
      setActiveColor343(undefined);
      setVoiceTranscript("");
      setVoiceAnalisis(null);
      lastAnalyzedTranscriptRef.current = "";
      setPhase("historial");
    } catch (err) {
      console.error("[cerrarDuchaMental] Error:", err);
      toast.error("Error al guardar la ducha. Intenta de nuevo.");
    }
  };

  const handleSubmitStep = async () => {
    const texto = currentTexto.trim();
    if (texto.length < 5) {
      toast.error("Escribe al menos 5 caracteres");
      return;
    }
    
    const eje = EJES[currentStep];
    const costoEje = currentStep === 2
      ? (eje3DynamicCost ?? eje.costo)
      : eje.costo;
    
    if (costoEje > 0 && credits < costoEje && !esOwnerUser) {
      setIaBlocked(true);
      toast.error(`Este eje requiere ${costoEje} crédito${costoEje > 1 ? "s" : ""}`, {
        style: { backgroundColor: "#0a0a0a", border: `1px solid ${GOLD}`, color: GOLD }
      });
      return;
    }

    // Eje 1: escanea y se queda mostrando feedback
    if (currentStep === 0) {
      await consultarDoctorIA("registro_carga", texto, 0);
      return;
    }

    // Eje 2: diagnóstico — se queda mostrando el análisis (no avanzar solo)
    if (currentStep === 1) {
      await consultarDoctorIA("diagnostico_clinico", texto, costoEje);
      return;
    }

    // Eje 3: protocolo — siempre mostrar en pantalla (con fallback si la IA falla)
    if (currentStep === 2) {
      setOxidacionDetectada(false);
      setProtocoloGuardado(false);
      const result = await consultarDoctorIA("protocolo_calibracion", texto, costoEje);
      const raw = result?.mensaje || calibracionDoctorText || cleanedMensaje || "";
      const protocolo = isMensajeProtocoloDebil(raw)
        ? buildProtocoloFallback({
            contexto: CONTEXTOS.find(c => c.id === selectedContexto)?.label,
            ducha: respuestas.registro_carga,
            diagnostico: eje2MensajeText || respuestas.diagnostico_clinico,
            notaUsuario: texto,
            pata: pataDetectada,
          })
        : raw;
      setCalibracionDoctorText(protocolo);
      setCleanedMensaje(protocolo);
      setIaFeedback({
        profundidad: result?.profundidad ?? 7,
        puede_avanzar: true,
        oxidacion_detectada: false,
        mensaje: protocolo,
        confrontacion: null,
        codigo_diagnostico: result?.codigo_diagnostico ?? lastDiagCode,
        interfaz_primaria: result?.interfaz_primaria ?? null,
        interfaz_secundaria: result?.interfaz_secundaria ?? null,
        firma_salida: result?.firma_salida ?? null,
      });
      toast.success("Protocolo entregado en pantalla", {
        description: "Puedes guardarlo ahora. Planificación/Jornada son opcionales.",
        style: { backgroundColor: "#0a0a0a", border: `1px solid ${GOLD}`, color: GOLD },
      });
      return;
    }
    
    await advanceToNextStep(texto);
  };

  const handleGuardarProtocolo = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    const protocolo = (calibracionDoctorText || cleanedMensaje || iaFeedback?.mensaje || "").trim();
    if (!protocolo || isMensajeProtocoloDebil(protocolo)) {
      toast.error("Aún no hay protocolo para guardar. Toca ENTREGAR PROTOCOLO primero.");
      return;
    }
    setProtocoloGuardando(true);
    try {
      const fecha = new Date();
      const PS = 15;
      const contenido = {
        registro_carga: respuestas.registro_carga || "",
        diagnostico_clinico: eje2MensajeText || respuestas.diagnostico_clinico || "",
        protocolo_calibracion: protocolo,
        preparacion: prepTexto.trim() || undefined,
      };
      await awardSovereigntyPoints(user.uid, PS, "Espejo v5 — Protocolo guardado");
      await addExpedienteClinico(user.uid, {
        fecha,
        seccion_afectada: pataDetectada ? [pataDetectada] : (selectedContexto ? [selectedContexto] : []),
        codigo_diagnostico: lastDiagCode || "",
        interfaz_primaria: "",
        interfaz_secundaria: "",
        respuestas: {
          registro_carga: contenido.registro_carga,
          diagnostico_clinico: contenido.diagnostico_clinico,
          protocolo_calibracion: protocolo,
        },
        estado_habito: false,
        vibracion_final: 40,
        tipo_sesion: "asistida",
        timestamp_inicio: sessionStartTime || Date.now(),
        timestamp_fin: Date.now(),
      });
      const sessionId = await addEspejoSession(user.uid, {
        fecha,
        modo: "arquitecto",
        contexto: CONTEXTOS.find(c => c.id === selectedContexto)?.label || "General",
        pacienteId: selectedPacienteId ?? undefined,
        tipo_sesion: "asistida",
        timestamp_inicio: sessionStartTime || Date.now(),
        timestamp_fin: Date.now(),
        contenido,
        puntos: PS,
        vibracion_final: 40,
      });
      setSesiones(prev => [{
        id: sessionId,
        fecha,
        modo: "arquitecto",
        contexto: CONTEXTOS.find(c => c.id === selectedContexto)?.label || "General",
        tipo_sesion: "asistida",
        contenido,
        puntos: PS,
        vibracion_final: 40,
      }, ...prev.filter(s => s.id !== sessionId)]);
      setProtocoloGuardado(true);
      toast.success("Protocolo guardado — disponible en Historial", {
        description: "Planificación y Jornada siguen siendo opcionales.",
        style: { backgroundColor: "#0a0a0a", border: `1px solid ${CYAN_NEON}`, color: CYAN_NEON },
      });
    } catch (err) {
      console.error("[guardarProtocolo]", err);
      toast.error("No se pudo guardar el protocolo. Intenta de nuevo.");
    } finally {
      setProtocoloGuardando(false);
    }
  };

  const forceAdvance = async () => {
    const texto = currentTexto.trim();
    if (!user || texto.length < 5) return;
    setIaFeedback(null);
    await advanceToNextStep(texto);
  };

  const startArquitectoMode = (mode: "ducha" | "full" = "full") => {
    const resolved: "ducha" | "full" = mode === "ducha" ? "ducha" : "full";
    setPendingStartMode(resolved);
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (!prospectoVerificado && !verificandoProspecto && !esOwnerUser) {
      setShowDatosGate(true);
      return;
    }
    if (!sovereigntyAccepted) {
      setShowSovereigntyPopup(true);
      return;
    }
    // Ducha Mental es gratuita: no exige paywall de sesión completa
    if (resolved === "full" && !esAccesoTotal) {
      setShowPaywall(true);
      return;
    }
    setShowContextoSelector(true);
  };

  const startFromEje = (ejeIndex: number) => {
    if (ejeIndex === 0) {
      startArquitectoMode("ducha");
      return;
    }
    if (!esAccesoTotal) {
      toast.message("Primero completa la Ducha Mental (gratis) o activa el acceso completo.", {
        description: EJES[ejeIndex]?.label || "Eje bloqueado",
      });
      startArquitectoMode("ducha");
      return;
    }
    startArquitectoMode("full");
  };

  const acceptSovereignty = () => {
    setSovereigntyAccepted(true);
    localStorage.setItem(SOVEREIGNTY_ACCEPTED_KEY, "true");
    setShowSovereigntyPopup(false);
    if (pendingStartMode === "full" && !esAccesoTotal) {
      setShowPaywall(true);
    } else {
      setShowContextoSelector(true);
    }
  };

  const confirmContextoAndStart = async (contextoOverride?: string | null) => {
    const contexto = contextoOverride || selectedContexto || "trabajo";
    setSelectedContexto(contexto);
    if (isVoiceRecording) cleanupVoiceRecording();

    // Cerrar modal y entrar YA a la escritura (no esperar Firebase)
    setShowContextoSelector(false);
    setCurrentStep(0);
    setRespuestas({});
    setCurrentTexto("");
    setPrepTexto("");
    setIaFeedback(null);
    setIaBlocked(false);
    setMapaVoltaje(null);
    setShowCelebracion(false);
    setShowConfetti(false);
    setSessionStartTime(Date.now());
    setUsedDoctorIA(false);
    setEje3DynamicCost(null);
    setPataDetectada(null);
    setOxidacionDetectada(false);
    setEje1FeedbackShown(false);
    setNivelSeñal(null);
    setRecomendacionSesion(null);
    setCodigo343(null);
    setActiveColor343(undefined);
    setActiveFase(null);
    setDoctorMarkerColor(null);
    setActiveIdentidad(null);
    setActiveZonaCorporal(null);
    setVoiceTranscript("");
    setVoiceAnalisis(null);
    lastAnalyzedTranscriptRef.current = "";
    setProtocoloGuardado(false);
    setProtocoloGuardando(false);

    // Siempre a Ducha Mental escribiendo: sin welcome ni muro bloqueando
    setWelcomeShown(true);
    setWelcomeText(WELCOME_MESSAGE);
    setShowMuro(false);
    setPhase("arquitecto");
    toast.success("Ducha Mental lista — escribe tu registro", {
      style: { backgroundColor: "#0a0a0a", border: `1px solid ${CYAN_NEON}`, color: CYAN_NEON },
      duration: 2500,
    });

    // Bloqueo Eje 3 en segundo plano (no debe impedir escribir)
    if (user) {
      try {
        const bloqueoActivo = await getBloqueoEje3(user.uid);
        if (bloqueoActivo) {
          setBloqueoEje3(bloqueoActivo);
        } else {
          const bucle = await detectarBucleSabotaje(user.uid);
          if (bucle && bucle.bloqueado) {
            setBloqueoEje3({ codigo: bucle.codigo, veces: bucle.veces, hasta: bucle.hasta, activadoAt: Date.now() });
          } else {
            setBloqueoEje3(null);
          }
        }
      } catch (err) {
        console.warn("[confirmContextoAndStart] bloqueo check:", err);
      }
    }
  };

  const handlePrepSubmit = () => {
    if (prepTexto.trim().length < 3) {
      toast.error("Describe dónde sientes el ruido");
      return;
    }
    if (esOwnerUser || isMuroFirmado()) setShowMuro(false);
    setWelcomeShown(true);
    setWelcomeText(WELCOME_MESSAGE);
    setPhase("arquitecto");
  };

  const handlePrepSkipToDucha = () => {
    if (esOwnerUser || isMuroFirmado()) setShowMuro(false);
    setWelcomeShown(true);
    setWelcomeText(WELCOME_MESSAGE);
    setPhase("arquitecto");
  };

  const handleLogin = async () => {
    try {
      await login();
      setShowLoginModal(false);
    } catch (error) {
      toast.error("Error al iniciar sesión");
    }
  };

  const resetToLanding = () => {
    if (isVoiceRecording) cleanupVoiceRecording();
    setPhase("landing");
    setCurrentStep(0);
    setRespuestas({});
    setCurrentTexto("");
    setPrepTexto("");
    setIaFeedback(null);
    setIaBlocked(false);
    setShowCelebracion(false);
    setMapaVoltaje(null);
    setIsGoldenProtocol(false);
    setEje3DynamicCost(null);
    setPataDetectada(null);
    setOxidacionDetectada(false);
    setEje1FeedbackShown(false);
    setNivelSeñal(null);
    setRecomendacionSesion(null);
    setCodigo343(null);
    setActiveColor343(undefined);
    setWelcomeShown(false);
    setWelcomeText("");
    setActiveFase(null);
    setDoctorMarkerColor(null);
    setActiveIdentidad(null);
    setActiveZonaCorporal(null);
    setSeguimientoActivado(false);
    setCalibracionDoctorText(null);
    setSeguimientoLoading(false);
    setEje2MensajeText(null);
    setShow5DayModal(false);
    setProtocolo5DiasActivado(false);
    setPlan5Dias([]);
    setVoiceTranscript("");
    setVoiceAnalisis(null);
    lastAnalyzedTranscriptRef.current = "";
  };

  const parsePlan5Dias = (text: string): Array<{ dayNum: number; titulo: string; hora: string }> => {
    const lines = text.split("\n");
    const dayLines = lines.filter(l => /Día\s*\d|DÍA\s*\d/i.test(l));
    return dayLines.slice(0, 5).map((line, i) => {
      const clean = line.replace(/[*_#►▸•\-]/g, "").trim();
      const dayMatch = clean.match(/(?:Día|DÍA)\s*(\d+)[:\s]*/i);
      const dayNum = dayMatch ? parseInt(dayMatch[1]) : i + 1;
      const titulo = clean.replace(/(?:Día|DÍA)\s*\d+[:\s]*/i, "").trim();
      return { dayNum, titulo: titulo || `Hábito del Día ${dayNum}`, hora: "08:00" };
    });
  };

  const handleOpenModal5Dias = () => {
    const text = eje2MensajeText || cleanedMensaje || "";
    const parsed = parsePlan5Dias(text);
    if (parsed.length === 0) {
      toast("El plan de 5 días aún no está disponible. Completa el diagnóstico primero.", {
        style: { background: "#0A0A0A", border: `1px solid ${GOLD}40`, color: GOLD, fontFamily: "monospace" }
      });
      return;
    }
    setPlan5Dias(parsed);
    setShow5DayModal(true);
  };

  const handleActivarProtocolo5Dias = async () => {
    if (!user || protocolo5DiasActivado || protocolo5DiasLoading) return;
    setProtocolo5DiasLoading(true);
    try {
      const codigoDiag = lastDiagCode || "Protocolo Espejo";
      enqueueJornadaVehicleIntent({
        kind: "create",
        sourceModule: "espejo",
        payload: {
        titulo: `[Espejo] Protocolo 5 Días — ${codigoDiag}`,
        criterioFin: "circunstancia",
        criterioDetalle: `${codigoDiag} — Completar todos los días del protocolo clínico`,
        tiempoInicio: new Date(),
        ejes: {
          enfoque: { text: eje2MensajeText?.substring(0, 200) || "", trifecta: "omitir" },
          conflicto: { text: "", trifecta: "omitir" },
          pasos: { text: plan5Dias.map(d => `Día ${d.dayNum} [${d.hora}]: ${d.titulo}`).join("\n"), trifecta: "omitir" },
          limite: { text: "", trifecta: "omitir" }
        },
        tipoTerminoRapido: "situacion",
        tipoFlota: "tiempo",
        tipoReloj: "desglosador",
        aperturaAt: Date.now(),
        subVehiculos: plan5Dias.map((d, idx) => ({
          id: `sv_espejo_${Date.now()}_${idx}`,
          titulo: `Día ${d.dayNum} [${d.hora}]: ${d.titulo}`,
          status: idx === 0 ? "activo" as const : "pendiente" as const,
          aperturaAt: idx === 0 ? Date.now() : undefined,
          cantidadObjetivo: 1,
        })),
        },
      });
      setProtocolo5DiasActivado(true);
      setShow5DayModal(false);
      toast.success("Protocolo de 5 Días listo en Planificación (opcional).", {
        description: "Puedes seguir en Espejo y entregar el Protocolo del Eje 3 sin ir a Planificación.",
        style: { backgroundColor: "#0a0a0a", border: `1px solid ${GOLD}`, color: GOLD }
      });
    } catch {
      toast.error("Error al activar el protocolo. Intenta de nuevo.");
    } finally {
      setProtocolo5DiasLoading(false);
    }
  };

  const handleActivarSeguimiento = async () => {
    if (!user || seguimientoActivado || seguimientoLoading) return;
    setSeguimientoLoading(true);
    try {
      const habitoText = (calibracionDoctorText || mapaVoltaje?.recomendacion || "Protocolo de calibración activo").substring(0, 80);
      const codigoDiag = mapaVoltaje?.codigo_diagnostico || lastDiagCode || "Protocolo Espejo";
      const doctorNota = calibracionDoctorText ? calibracionDoctorText.substring(0, 200) : (mapaVoltaje?.recomendacion || "");
      enqueueJornadaVehicleIntent({
        kind: "create",
        sourceModule: "espejo",
        payload: {
        titulo: `[Espejo] ${habitoText}`,
        criterioFin: "circunstancia",
        criterioDetalle: `${codigoDiag} — ${doctorNota}`,
        tiempoInicio: new Date(),
        ejes: {
          enfoque: { text: "", trifecta: "omitir" },
          conflicto: { text: "", trifecta: "omitir" },
          pasos: { text: "", trifecta: "omitir" },
          limite: { text: "", trifecta: "omitir" }
        },
        tipoTerminoRapido: "situacion",
        tipoFlota: "situacion",
        aperturaAt: Date.now(),
        },
      });
      await requestNotificationPermission();
      scheduleEspejoFollowup(habitoText);
      setSeguimientoActivado(true);
      toast.success("Seguimiento preparado (opcional).", {
        description: "Tu protocolo ya está. Ir a Planificación es opcional.",
        style: { backgroundColor: "#0a0a0a", border: `1px solid ${GOLD}`, color: GOLD }
      });
    } catch {
      toast.error("Error al activar seguimiento. Intenta de nuevo.");
    } finally {
      setSeguimientoLoading(false);
    }
  };

  const VoltageBar = ({ value, color, label }: { value: number; color: string; label: string }) => (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
        <span className="text-[10px] font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: "0%" }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: DARK_BG }}>
      <style>{`
        @keyframes fogDrift {
          0%, 100% { opacity: 0.6; filter: blur(30px); }
          50% { opacity: 0.9; filter: blur(50px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes flowUp {
          0% { background-position: 0 0, 10px 0, 0 0; }
          100% { background-position: 0 -40px, 10px -40px, 0 0; }
        }
        .eje-fog { animation: fogDrift 4s ease-in-out infinite; }
        .eje-pulse { animation: pulseGlow 1s ease-in-out infinite; }
        .eje-flow { animation: flowUp 2s linear infinite; }
      `}</style>
      <AnimatePresence mode="wait">
        
        {phase === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen p-4 pb-24"
          >
            <div className="max-w-lg mx-auto">
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${CYAN_NEON}20 0%, ${GOLD}20 100%)`,
                    border: `1px solid ${CYAN_NEON}30`,
                    boxShadow: `0 0 40px ${CYAN_NEON}15`
                  }}
                >
                  <Activity size={40} style={{ color: CYAN_NEON }} />
                </motion.div>
                
                <h1 className="text-2xl md:text-3xl font-black text-white mb-4 leading-tight" style={{ fontFamily: "monospace" }}>
                  ESPEJO SOBERANO
                  <br />
                  <span style={{ color: GOLD }}>v5.0 — Alquimia Clínica</span>
                </h1>
                
                <p className="text-sm max-w-sm mx-auto" style={{ color: `${CYAN_NEON}80`, fontFamily: "monospace" }}>
                  DUCHA_MENTAL → DIAGNÓSTICO_CLÍNICO → PROTOCOLO_CALIBRACIÓN
                </p>
              </motion.div>

              {esAccesoTotal && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 space-y-2"
                >
                  <div className="p-3 rounded-xl flex items-center justify-between"
                    style={{ backgroundColor: `${GOLD}10`, border: `1px solid ${GOLD}30` }}
                  >
                    <div className="flex items-center gap-2">
                      <Zap size={16} style={{ color: GOLD }} />
                      <span className="text-xs font-bold" style={{ color: GOLD }}>Créditos de Claridad</span>
                    </div>
                    <span className="text-sm font-black" style={{ color: credits > 0 ? GOLD : RED_ALERT }}>
                      {credits}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl flex items-center justify-between"
                    style={{ backgroundColor: `${VIOLET}08`, border: `1px solid ${VIOLET}25` }}
                  >
                    <div className="flex items-center gap-2">
                      <Shield size={16} style={{ color: VIOLET }} />
                      <span className="text-xs font-bold" style={{ color: VIOLET }}>Convicción</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full transition-all"
                          style={{ 
                            backgroundColor: i < conviccionCheck ? GOLD : "rgba(255,255,255,0.1)",
                            boxShadow: i < conviccionCheck ? `0 0 8px ${GOLD}50` : "none"
                          }}
                        />
                      ))}
                      <span className="text-[10px] font-bold ml-1" style={{ color: conviccionCheck >= 4 ? GOLD : VIOLET }}>
                        {conviccionCheck}/4
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {esOwnerUser && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate("/espejo/expedientes")}
                  className="w-full mb-4 py-3 rounded-xl flex items-center justify-center gap-2"
                  style={{
                    background: "rgba(212,175,55,0.06)",
                    border: "1px solid rgba(212,175,55,0.25)",
                    color: GOLD, fontFamily: "monospace", fontSize: 12,
                    fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer"
                  }}
                  data-testid="btn-ir-expedientes"
                >
                  <Users size={15} />
                  EXPEDIENTES CLÍNICOS
                  <ChevronRight size={14} style={{ opacity: 0.5 }} />
                </motion.button>
              )}

              <div className="mb-4">
                <EspejoModuleMilestoneBar pts={ptsEspejo} />
              </div>

              {/* TEASER PATRÓN EMERGENTE — solo para no-premium con 2+ sesiones */}
              {sesiones.length >= 2 && !esAccesoTotal && (() => {
                const ifzMap: Record<string, number> = {};
                sesiones.forEach(s => {
                  const ifz = s.mapaVoltaje?.interfaz_primaria;
                  if (ifz) ifzMap[ifz] = (ifzMap[ifz] || 0) + 1;
                });
                const ifzDominante = Object.entries(ifzMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 rounded-xl border"
                    style={{
                      backgroundColor: "rgba(255,49,49,0.04)",
                      borderColor: "rgba(255,49,49,0.35)",
                      fontFamily: "monospace"
                    }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: RED_ALERT }}>
                      ANÁLISIS PARCIAL — ACCESO REQUERIDO
                    </div>
                    <div className="space-y-0.5 text-xs mb-3">
                      <p style={{ color: "rgba(255,255,255,0.6)" }}>
                        <span style={{ color: CYAN_NEON }}>{">"}</span>{" "}
                        <span style={{ color: GOLD }}>{sesiones.length}</span> sesiones registradas
                      </p>
                      {ifzDominante ? (
                        <p style={{ color: "rgba(255,255,255,0.6)" }}>
                          <span style={{ color: CYAN_NEON }}>{">"}</span>{" "}
                          interfaz dominante:{" "}
                          <span style={{ color: RED_ALERT }}>{ifzDominante.toUpperCase()}</span>
                        </p>
                      ) : null}
                      <p style={{ color: "rgba(255,255,255,0.6)" }}>
                        <span style={{ color: CYAN_NEON }}>{">"}</span>{" "}
                        protocolo completo:{" "}
                        <span style={{ color: RED_ALERT, fontWeight: "bold" }}>BLOQUEADO</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPaywall(true)}
                      className="w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                      style={{
                        background: `linear-gradient(135deg, ${RED_ALERT} 0%, ${GOLD} 100%)`,
                        color: "#fff"
                      }}
                    >
                      <Lock size={12} />
                      Activar acceso — $17 (10 créditos)
                    </button>
                  </motion.div>
                );
              })()}

              <div className="flex flex-col items-center mb-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startArquitectoMode("full")}
                  className="w-full p-6 rounded-2xl text-left transition-all border relative overflow-hidden"
                  style={{ 
                    backgroundColor: DARK_BG,
                    borderColor: `${GOLD}30`,
                    boxShadow: `0 0 30px ${GOLD}08`
                  }}
                  data-testid="btn-modo-arquitecto"
                >
                  {!esAccesoTotal && (
                    <div className="absolute top-3 right-3">
                      <Lock size={16} style={{ color: GOLD }} />
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${CYAN_NEON}15 0%, ${GOLD}15 100%)`, border: `1px solid ${GOLD}30` }}
                    >
                      <Eye size={28} style={{ color: GOLD }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white" style={{ fontFamily: "monospace" }}>ALQUIMIA CLÍNICA™</h3>
                        <span 
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30`, fontFamily: "monospace" }}
                        >
                          $17
                        </span>
                      </div>
                      <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
                        Doctor IA ejecuta diagnóstico clínico en 3 ejes.
                        Terminal → Interferencia → Calibración.
                      </p>
                      <div className="flex items-center gap-1 text-xs font-bold" style={{ color: GOLD, fontFamily: "monospace" }}>
                        +{FIXED_POINTS} PS por sesión completa
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </motion.button>
              </div>

              <div className="mb-8">
                <p className="text-[10px] uppercase tracking-widest text-center mb-3" style={{ color: `${CYAN_NEON}40`, fontFamily: "monospace" }}>
                  3 EJES CLÍNICOS
                </p>
                <div className="flex gap-2">
                  {EJES.map((eje, index) => {
                    const Icon = eje.icon;
                    const isDucha = index === 0;
                    return (
                      <button
                        type="button"
                        key={eje.id}
                        onClick={() => startFromEje(index)}
                        className="flex-1 py-3 rounded-xl text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          backgroundColor: `${eje.color}08`,
                          border: `1px solid ${eje.color}35`,
                          cursor: "pointer",
                        }}
                        data-testid={`btn-eje-landing-${eje.id}`}
                      >
                        <Icon size={18} className="mx-auto mb-1" style={{ color: eje.color }} />
                        <span className="text-[9px] font-bold block" style={{ color: eje.color, fontFamily: "monospace" }}>
                          {eje.label}
                        </span>
                        <span className="text-[8px] block mt-0.5" style={{ color: `${eje.color}70`, fontFamily: "monospace" }}>
                          {isDucha ? "Gratis · Entrar" : esAccesoTotal ? "Entrar" : "Requiere acceso"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {sesiones.length > 0 && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setPhase("historial")}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-slate-400 text-sm"
                  data-testid="btn-historial"
                >
                  <History size={16} />
                  Ver Historial ({sesiones.length})
                </motion.button>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-12 p-6 rounded-2xl text-center"
                style={{ backgroundColor: "#0a0a0a", border: `1px solid ${WARM_ROSE}20` }}
              >
                <p className="text-sm leading-relaxed">
                  <span className="text-slate-400">Protocolo Clínico:</span>
                  <br />
                  <span className="text-white font-bold">NIEBLA →</span> <span style={{ color: WARM_ROSE }} className="font-bold">DETECCIÓN SOMÁTICA.</span>
                  <br />
                  <span className="text-white font-bold">PROGRAMA →</span> <span style={{ color: WARM_ROSE }} className="font-bold">DESACTIVACIÓN.</span>
                  <br />
                  <span className="text-white font-bold">VOLTAJE →</span> <span style={{ color: WARM_ROSE }} className="font-bold">ACTIVACIÓN.</span>
                  <br />
                  <span className="text-white font-bold">PROTOCOLO →</span> <span style={{ color: WARM_ROSE }} className="font-bold">EVOLUCIÓN.</span>
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {phase === "preparacion" && (
          <motion.div
            key="preparacion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen p-4 pb-24"
          >
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${WARM_ROSE}30 0%, ${VIOLET}30 100%)` }}
                  >
                    <Wind size={20} style={{ color: WARM_ROSE }} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-sm">Contexto Previo — Antes de la Ducha</h2>
                    <p className="text-[10px] text-slate-500">El Eje 1 iniciará la Ducha Mental. Aquí defines el área de trabajo del Doctor IA.</p>
                  </div>
                </div>
                <button
                  onClick={resetToLanding}
                  className="text-slate-500 hover:text-white transition-colors"
                  data-testid="btn-cerrar-preparacion"
                >
                  <X size={20} />
                </button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-5 rounded-2xl border mb-6"
                style={{ 
                  backgroundColor: `${WARM_ROSE}08`,
                  borderColor: `${WARM_ROSE}30`,
                  boxShadow: `0 0 40px ${WARM_ROSE}08`
                }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${WARM_ROSE}20` }}>
                    <Heart size={16} style={{ color: WARM_ROSE }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: WARM_ROSE }}>
                      Doctor IA — El Corazón Sabio
                    </p>
                    <p className="text-sm text-white/90 leading-relaxed italic">
                      "Esta pantalla es tu contexto previo. Escribe la carga real que llevas — sin filtrar, sin ordenar. El Eje 1 (Ducha Mental) la usará para calibrar el diagnóstico. Pulsa INICIAR cuando estés listo."
                    </p>
                  </div>
                </div>

                <p className="text-white text-sm font-medium mb-4">
                  ¿Dónde se siente ese "ruido" en tu cuerpo ahora mismo?
                </p>

                <textarea
                  value={prepTexto}
                  onChange={(e) => setPrepTexto(e.target.value)}
                  placeholder="En el pecho, como una presión constante... / En la cabeza, un zumbido que no para..."
                  className="w-full bg-black/30 text-white text-sm resize-none focus:outline-none placeholder:text-slate-600 rounded-xl p-4 border border-white/10 min-h-[100px]"
                  data-testid="input-preparacion"
                />

                <div className="flex justify-between items-center mt-3">
                  <span className="text-[10px] text-slate-500">
                    {prepTexto.length} caracteres
                  </span>
                  <span className="text-[10px]" style={{ color: WARM_ROSE }}>
                    El Doctor IA lo usará en los 3 Ejes
                  </span>
                </div>
              </motion.div>

              {user?.email?.toLowerCase() === "gilsonarevalo.leo@gmail.com" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-5 rounded-xl p-4"
                  style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.2)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ color: GOLD, fontSize: 11, letterSpacing: "0.08em", fontFamily: "monospace", fontWeight: 700 }}>
                      PACIENTE DE SESIÓN
                    </span>
                    <button
                      onClick={() => setShowPacienteModal(true)}
                      style={{ fontSize: 11, color: GOLD, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 5, padding: "4px 9px", cursor: "pointer", fontFamily: "monospace" }}
                      data-testid="btn-seleccionar-paciente"
                    >
                      {selectedPacienteId ? "Cambiar" : "Seleccionar"}
                    </button>
                  </div>
                  {selectedPacienteId ? (() => {
                    const pac = pacientesLista.find(p => p.id === selectedPacienteId);
                    return pac ? (
                      <div className="flex items-center gap-3">
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ color: GOLD, fontSize: 14, fontWeight: 700 }}>{pac.nombre.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{pac.nombre}</div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                            {pac.nivelMadurez && (
                              <span style={{ fontSize: 10, color: CYAN_NEON, background: "rgba(0,255,195,0.08)", border: "1px solid rgba(0,255,195,0.2)", borderRadius: 3, padding: "1px 6px" }}>
                                {pac.nivelMadurez}
                              </span>
                            )}
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                              {pac.sesionesCount || 0} sesiones
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedPacienteId(null)}
                          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}
                          data-testid="btn-deselect-paciente"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : null;
                  })() : (
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "monospace" }}>Sin paciente seleccionado — sesión general</p>
                  )}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="p-3 rounded-xl mb-6 text-center"
                style={{ backgroundColor: `${VIOLET}08`, border: `1px solid ${VIOLET}20` }}
              >
                <p className="text-[10px] text-slate-400 italic">
                  "Gilson descubrió que el vacío es preparación. Mantén la frecuencia. El sistema esperará a que la verdad emerja."
                </p>
              </motion.div>

              <button
                onClick={handlePrepSubmit}
                disabled={prepTexto.trim().length < 3}
                className="w-full py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ 
                  background: `linear-gradient(135deg, ${WARM_ROSE} 0%, ${VIOLET} 100%)`,
                  color: "#fff"
                }}
                data-testid="btn-iniciar-pasos"
              >
                <Heart size={18} />
                Iniciar Diagnóstico Clínico
              </button>
              <button
                type="button"
                onClick={handlePrepSkipToDucha}
                className="w-full mt-3 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: `${CYAN_NEON}10`,
                  border: `1px solid ${CYAN_NEON}35`,
                  color: CYAN_NEON,
                  fontFamily: "monospace",
                }}
                data-testid="btn-ir-ducha-desde-prep"
              >
                <Droplets size={16} />
                Ir directo a Ducha Mental
              </button>
            </div>
          </motion.div>
        )}

        {phase === "arquitecto" && showMuro && (
          <AnimatePresence>
            <MuroSoberano onFirmar={() => setShowMuro(false)} userId={user?.uid} />
          </AnimatePresence>
        )}

        {phase === "arquitecto" && (
          <motion.div
            key="arquitecto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen p-4 pb-24 transition-all duration-1000"
            style={{ ...EJE_BG_STYLES[EJES[currentStep]?.bgEffect || "fog"], backgroundColor: DARK_BG }}
          >
            <div className="max-w-2xl mx-auto">
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${CYAN_NEON}30 0%, ${GOLD}30 100%)`, border: `1px solid ${CYAN_NEON}30` }}
                  >
                    <Activity size={20} style={{ color: CYAN_NEON }} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-sm" style={{ fontFamily: "monospace" }}>ESPEJO SOBERANO v5.0</h2>
                    <p className="text-[10px]" style={{ color: CYAN_NEON, fontFamily: "monospace" }}>EJE {currentStep + 1}/{EJES.length} — {EJES[currentStep]?.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {credits > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
                      <Zap size={12} style={{ color: GOLD }} />
                      <span className="text-[10px] font-bold" style={{ color: GOLD, fontFamily: "monospace" }}>
                        {credits}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={resetToLanding}
                    className="text-slate-600 hover:text-white transition-colors"
                    data-testid="btn-cerrar-arquitecto"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {!showCelebracion ? (
                <>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase tracking-widest" style={{ color: CYAN_NEON, fontFamily: "monospace" }}>Diagnóstico Clínico — 3 Ejes</span>
                      <span className="text-[10px] font-bold" style={{ color: CYAN_NEON, fontFamily: "monospace" }}>
                        {currentStep + 1}/{EJES.length}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {EJES.map((eje, index) => (
                        <div 
                          key={eje.id}
                          className="flex-1 h-1 rounded-full transition-all duration-500"
                          style={{ 
                            backgroundColor: index < currentStep ? eje.color : index === currentStep ? `${eje.color}60` : "rgba(255,255,255,0.06)",
                            boxShadow: index < currentStep ? `0 0 6px ${eje.color}60` : "none"
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="sticky top-0 z-10">
                    <PhaseIndicator fase={activeFase} />
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="hidden md:block flex-shrink-0" style={{ width: "60px" }}>
                      <VUMeterBars values={vuValues} />
                    </div>

                    <ScreenColorWash fase={activeFase} className="flex-1 min-w-0 rounded-2xl">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentStep}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                        >
                          {(() => {
                            const eje = EJES[currentStep];
                            const Icon = eje.icon;
                            return (
                              <div 
                                className="p-5 rounded-2xl border mb-4"
                                style={{ 
                                  backgroundColor: `rgba(10,10,10,0.9)`,
                                  borderColor: `${eje.color}25`,
                                  boxShadow: `0 0 30px ${eje.color}08`
                                }}
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${eje.color}15`, border: `1px solid ${eje.color}30` }}>
                                    <Icon size={22} style={{ color: eje.color }} />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-bold text-white text-sm" style={{ fontFamily: "monospace" }}>{eje.label}</h3>
                                    <p className="text-[10px]" style={{ color: eje.color, fontFamily: "monospace" }}>{eje.subtitle} — {eje.objetivo}</p>
                                  </div>
                                  {eje.costo === 0 && (
                                    <div className="px-2 py-1 rounded-lg" style={{ backgroundColor: `${CYAN_NEON}10`, border: `1px solid ${CYAN_NEON}25` }}>
                                      <span className="text-[10px] font-bold" style={{ color: CYAN_NEON, fontFamily: "monospace" }}>$0</span>
                                    </div>
                                  )}
                                </div>

                                <div className="mb-3 p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: `${eje.color}06`, border: `1px solid ${eje.color}15` }}>
                                  <Activity size={14} className="flex-shrink-0 mt-0.5" style={{ color: eje.color }} />
                                  <p className="text-xs leading-relaxed text-white/70" style={{ fontFamily: "monospace" }}>
                                    {eje.pregunta}
                                  </p>
                                </div>

                                {currentStep === 2 && pataDetectada && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-3 rounded-xl overflow-hidden"
                                    style={{ border: `1px solid ${GOLD}40` }}
                                    data-testid="panel-dinamico-eje3"
                                  >
                                    <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: `${GOLD}12`, borderBottom: `1px solid ${GOLD}20` }}>
                                      <Zap size={10} style={{ color: GOLD }} />
                                      <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: `${GOLD}90`, fontFamily: "monospace" }}>Lectura de Raíz Activa</span>
                                    </div>
                                    <div className="px-3 py-2.5 space-y-1.5" style={{ backgroundColor: `${GOLD}06` }}>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] uppercase tracking-widest" style={{ color: `${GOLD}70`, fontFamily: "monospace" }}>RAÍZ DETECTADA</span>
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ backgroundColor: `${GOLD}20`, color: GOLD, fontFamily: "monospace" }}>{pataDetectada}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] uppercase tracking-widest" style={{ color: `${GOLD}70`, fontFamily: "monospace" }}>COSTO DE LA LLAVE</span>
                                        <span className="text-base font-black" style={{ color: GOLD, fontFamily: "monospace" }}>{eje3DynamicCost ?? eje.costo} Créditos</span>
                                      </div>
                                      {oxidacionDetectada && !iaFeedback && (
                                        <div className="pt-1.5 mt-1 flex items-start gap-1.5" style={{ borderTop: `1px solid #FF8C0030` }}>
                                          <Zap size={9} className="flex-shrink-0 mt-0.5" style={{ color: "#FF8C00" }} />
                                          <p className="text-[9px] font-bold leading-relaxed" style={{ color: "#FF8C00", fontFamily: "monospace" }}>SISTEMA EN OXIDACIÓN — Genera voltaje antes de acceder a La Llave</p>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}

                                {currentStep === 2 && bloqueoEje3 && bloqueoEje3.hasta > Date.now() ? (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-5 rounded-2xl"
                                    style={{ backgroundColor: `${RED_ALERT}08`, border: `2px solid ${RED_ALERT}60`, boxShadow: `0 0 40px ${RED_ALERT}15` }}
                                    data-testid="alerta-sabotaje-eje3"
                                  >
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${RED_ALERT}20`, border: `1px solid ${RED_ALERT}40` }}>
                                        <AlertTriangle size={22} style={{ color: RED_ALERT }} />
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-bold" style={{ color: RED_ALERT, fontFamily: "monospace" }}>ALERTA DE SABOTAJE</h4>
                                        <p className="text-[10px]" style={{ color: `${RED_ALERT}90`, fontFamily: "monospace" }}>Eje 3 bloqueado por detección de bucle</p>
                                      </div>
                                    </div>
                                    <p className="text-xs leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "monospace" }}>
                                      El Chófer está repitiendo el patrón <span style={{ color: RED_ALERT, fontWeight: "bold" }}>[{bloqueoEje3.codigo || "CÓDIGO X"}]</span>. El sistema ha bloqueado el Eje 3 por 12 horas. Usa este tiempo para observar la interferencia sin intervención técnica.
                                    </p>
                                    <div className="flex items-center justify-center gap-3 p-3 rounded-xl" style={{ backgroundColor: `${RED_ALERT}10`, border: `1px solid ${RED_ALERT}25` }}>
                                      <Lock size={16} style={{ color: RED_ALERT }} />
                                      <span className="text-lg font-bold" style={{ color: RED_ALERT, fontFamily: "monospace" }} data-testid="countdown-bloqueo-eje3">
                                        {bloqueoCountdown || "--:--:--"}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-center mt-3 opacity-60" style={{ color: "white", fontFamily: "monospace" }}>
                                      Ejes 1 y 2 permanecen habilitados
                                    </p>
                                  </motion.div>
                                ) : currentStep === 0 ? (
                                  !welcomeShown && welcomeText.length < WELCOME_MESSAGE.length ? (
                                    <div
                                      className="rounded-xl p-4 min-h-[180px] relative"
                                      style={{ backgroundColor: "rgba(0,0,0,0.85)", border: `1px solid ${CYAN_NEON}20` }}
                                      data-testid="welcome-typewriter"
                                    >
                                      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: CYAN_NEON, fontFamily: "monospace" }}>
                                        {welcomeText}<motion.span
                                          animate={{ opacity: [1, 0, 1] }}
                                          transition={{ duration: 0.8, repeat: Infinity }}
                                          style={{ display: "inline-block" }}
                                        >▌</motion.span>
                                      </p>
                                      <button
                                        type="button"
                                        data-testid="btn-saltar-welcome"
                                        onClick={() => {
                                          setWelcomeText(WELCOME_MESSAGE);
                                          setWelcomeShown(true);
                                        }}
                                        className="mt-4 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                                        style={{
                                          backgroundColor: `${CYAN_NEON}12`,
                                          border: `1px solid ${CYAN_NEON}35`,
                                          color: CYAN_NEON,
                                          fontFamily: "monospace",
                                        }}
                                      >
                                        Escribir ahora
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <TerminalConsole
                                        value={currentTexto}
                                        onChange={setCurrentTexto}
                                        placeholder={eje.placeholder}
                                        testId={`input-${eje.id}`}
                                      />

                                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                                        {speechSupported ? (
                                          <button
                                            data-testid={isVoiceRecording ? "btn-detener-voz" : "btn-activar-voz"}
                                            onClick={isVoiceRecording ? stopVoiceRecording : startVoiceRecording}
                                            disabled={voiceLoading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200"
                                            style={{
                                              backgroundColor: isVoiceRecording ? `${RED_ALERT}18` : `${CYAN_NEON}10`,
                                              border: `1px solid ${isVoiceRecording ? RED_ALERT : CYAN_NEON}40`,
                                              color: isVoiceRecording ? RED_ALERT : CYAN_NEON,
                                              fontFamily: "monospace",
                                              fontSize: 10,
                                              cursor: voiceLoading ? "not-allowed" : "pointer",
                                              opacity: voiceLoading ? 0.5 : 1,
                                            }}
                                          >
                                            {isVoiceRecording ? (
                                              <>
                                                <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
                                                  <MicOff size={11} />
                                                </motion.div>
                                                <span className="font-black tracking-widest uppercase">DETENER</span>
                                                <motion.span
                                                  animate={{ opacity: [1, 0.3, 1] }}
                                                  transition={{ duration: 0.7, repeat: Infinity }}
                                                  style={{ color: RED_ALERT, fontSize: 8 }}
                                                >●REC</motion.span>
                                              </>
                                            ) : (
                                              <>
                                                <Mic size={11} />
                                                <span className="font-black tracking-widest uppercase">Activar Voz</span>
                                              </>
                                            )}
                                          </button>
                                        ) : (
                                          <button
                                            data-testid="btn-voz-no-disponible"
                                            disabled
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg opacity-40 cursor-not-allowed"
                                            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: 10 }}
                                          >
                                            <MicOff size={11} />
                                            <span className="tracking-widest uppercase">Micrófono no disponible en este navegador</span>
                                          </button>
                                        )}
                                        {isVoiceRecording && voiceAmplitude > 5 && (
                                          <div className="flex items-center gap-1" data-testid="voz-amplitud">
                                            {[...Array(5)].map((_, i) => (
                                              <motion.div
                                                key={i}
                                                style={{
                                                  width: 3,
                                                  borderRadius: 2,
                                                  backgroundColor: RED_ALERT,
                                                  opacity: voiceAmplitude > (i + 1) * 18 ? 0.9 : 0.2,
                                                }}
                                                animate={{ height: voiceAmplitude > (i + 1) * 18 ? [6, 14, 6] : [3, 5, 3] }}
                                                transition={{ duration: 0.3 + i * 0.05, repeat: Infinity, ease: "easeInOut" }}
                                              />
                                            ))}
                                          </div>
                                        )}
                                        {voiceLoading && (
                                          <div className="flex items-center gap-1.5" data-testid="voz-analizando">
                                            <Loader2 size={10} className="animate-spin" style={{ color: CYAN_NEON }} />
                                            <span style={{ color: `${CYAN_NEON}70`, fontFamily: "monospace", fontSize: 9 }}>ANALIZANDO FRECUENCIA DE VOZ...</span>
                                          </div>
                                        )}
                                        {voiceAnalisis && !voiceLoading && (
                                          <span style={{ color: `${CYAN_NEON}60`, fontFamily: "monospace", fontSize: 9 }}>
                                            <Radio size={9} className="inline mr-1" />voz detectada
                                          </span>
                                        )}
                                      </div>

                                      {isVoiceRecording && interimTranscript && (
                                        <motion.div
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          className="mt-1.5 px-3 py-2 rounded-lg"
                                          data-testid="voz-interim"
                                          style={{ backgroundColor: `${RED_ALERT}06`, border: `1px solid ${RED_ALERT}20` }}
                                        >
                                          <span style={{ color: `${RED_ALERT}60`, fontFamily: "monospace", fontSize: 10, fontStyle: "italic" }}>
                                            &gt; {interimTranscript}...
                                          </span>
                                        </motion.div>
                                      )}

                                      <AnimatePresence>
                                        {voiceAnalisis && !voiceLoading && (
                                          <motion.div
                                            initial={{ opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="mt-2 rounded-xl overflow-hidden"
                                            data-testid="banner-voz-analisis"
                                            style={{ border: `1px solid ${GOLD}35`, boxShadow: `0 0 16px ${GOLD}08` }}
                                          >
                                            <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: `${GOLD}10`, borderBottom: `1px solid ${GOLD}20` }}>
                                              <Radio size={10} style={{ color: GOLD }} />
                                              <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: `${GOLD}90`, fontFamily: "monospace" }}>Detección de Interfaz por Voz</span>
                                            </div>
                                            <div className="px-3 py-2.5 flex flex-wrap items-center gap-2" style={{ backgroundColor: `${GOLD}05` }}>
                                              <span className="px-2 py-1 rounded font-black text-[10px] tracking-widest" style={{ backgroundColor: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD, fontFamily: "monospace" }}>
                                                {voiceAnalisis.codigo}
                                              </span>
                                              <span className="px-2 py-1 rounded font-black text-[10px] tracking-widest" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>
                                                NIV {voiceAnalisis.nivel}
                                              </span>
                                              <span className="px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold" style={{ backgroundColor: `${RED_ALERT}12`, border: `1px solid ${RED_ALERT}30`, color: RED_ALERT, fontFamily: "monospace" }}>
                                                {voiceAnalisis.estado_emocional}
                                              </span>
                                              {voiceAnalisis.justificacion && (
                                                <p className="w-full text-[9px] leading-relaxed mt-1" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>
                                                  {voiceAnalisis.justificacion}
                                                </p>
                                              )}
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>

                                      <OsciloscopioBar
                                        texto={isVoiceRecording && interimTranscript ? `${currentTexto} ${interimTranscript}`.trim() : currentTexto}
                                        voiceActive={isVoiceRecording}
                                        voiceAmplitude={voiceAmplitude}
                                      />
                                      {!iaFeedback && currentTexto.trim().length > 0 && (() => {
                                        const palabras = currentTexto.trim().split(/\s+/).filter(w => w.length > 2).length;
                                        const señal = palabras < 20 ? "DÉBIL" : palabras < 50 ? "MEDIA" : "FUERTE";
                                        const señalColor = palabras < 20 ? RED_ALERT : palabras < 50 ? "#FF8C00" : CYAN_NEON;
                                        const pct = Math.min(100, Math.round((palabras / 60) * 100));
                                        return (
                                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 rounded-lg px-3 pt-2 pb-2" style={{ backgroundColor: "rgba(0,0,0,0.45)", border: `1px solid ${señalColor}18` }}>
                                            <div className="flex items-center justify-between mb-1.5">
                                              <span className="text-[8px] font-black tracking-widest uppercase" style={{ color: `${señalColor}80`, fontFamily: "monospace" }}>Densidad de Señal</span>
                                              <span className="text-[9px] font-black" style={{ color: señalColor, fontFamily: "monospace" }}>{señal} · {palabras} palabras</span>
                                            </div>
                                            <div className="w-full h-0.5 rounded-full mb-1.5" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                                              <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} className="h-0.5 rounded-full" style={{ backgroundColor: señalColor }} />
                                            </div>
                                            {palabras < 20 && (
                                              <p className="text-[8px] leading-relaxed" style={{ color: `${RED_ALERT}75`, fontFamily: "monospace" }}>
                                                El escáner necesita más carga — sé específico: ¿dónde lo sientes en el cuerpo? ¿qué imagen aparece?
                                              </p>
                                            )}
                                            {palabras >= 20 && palabras < 50 && (
                                              <p className="text-[8px] leading-relaxed" style={{ color: "#FF8C0075", fontFamily: "monospace" }}>
                                                Buena densidad. El escáner puede trabajar — continúa si ya soltaste todo el peso.
                                              </p>
                                            )}
                                            {palabras >= 50 && (
                                              <p className="text-[8px] leading-relaxed" style={{ color: `${CYAN_NEON}75`, fontFamily: "monospace" }}>
                                                Señal fuerte. El hardware ha emitido suficiente carga para un diagnóstico preciso.
                                              </p>
                                            )}
                                          </motion.div>
                                        );
                                      })()}
                                    </>
                                  )
                                ) : currentStep === 2 && iaFeedback?.mensaje ? (
                                  <CalibrationPanel
                                    habito24h={calibracionDoctorText || cleanedMensaje || iaFeedback.mensaje}
                                    onSave={handleGuardarProtocolo}
                                    saving={protocoloGuardando}
                                    saved={protocoloGuardado}
                                    onConfirm={() => advanceToNextStep(
                                      calibracionDoctorText || cleanedMensaje || iaFeedback?.mensaje || currentTexto || "Protocolo aceptado"
                                    )}
                                  />
                                ) : (
                                  <>
                                  <textarea
                                    ref={textareaRef}
                                    value={currentTexto}
                                    onChange={(e) => setCurrentTexto(e.target.value)}
                                    placeholder={eje.placeholder}
                                    className="w-full text-sm resize-none focus:outline-none rounded-xl p-4 min-h-[120px]"
                                    style={{ 
                                      backgroundColor: "rgba(0,0,0,0.6)", 
                                      color: CYAN_NEON, 
                                      fontFamily: "monospace",
                                      border: `1px solid ${eje.color}20`
                                    }}
                                    data-testid={`input-${eje.id}`}
                                  />
                                  </>
                                )}

                                {showGlitchDiag && currentStep === 1 && (
                                  <GlitchDiagnostic
                                    codigoDiagnostico={lastDiagCode || undefined}
                                    interfazPrimaria={lastInterfazPrimaria || undefined}
                                    mensaje={cleanedMensaje ?? iaFeedback?.mensaje ?? ""}
                                    active={showGlitchDiag}
                                  />
                                )}
                                
                                {oxidacionDetectada && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-3 rounded-xl overflow-hidden"
                                    style={{ border: `2px solid #FF8C00`, boxShadow: "0 0 20px rgba(255,140,0,0.2)" }}
                                    data-testid="banner-oxidacion"
                                  >
                                    <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: "rgba(255,140,0,0.12)", borderBottom: `1px solid #FF8C0060` }}>
                                      <Zap size={12} style={{ color: "#FF8C00" }} />
                                      <span className="text-[10px] font-black tracking-widest" style={{ color: "#FF8C00", fontFamily: "monospace" }}>⚡ ESTATISMO BIOLÓGICO DETECTADO</span>
                                    </div>
                                    <div className="p-3 space-y-2" style={{ backgroundColor: "#FF8C0006" }}>
                                      <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "monospace" }}>
                                        Tu sistema opera en <span style={{ color: "#FF8C00" }} className="font-bold">Frecuencia Cero</span>. No hay dolor activo ni deseo activo → OXIDACIÓN PROGRESIVA.
                                      </p>
                                      <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "monospace" }}>
                                        <span className="font-bold" style={{ color: "#FF8C00" }}>Diagnóstico:</span> Tu hardware se está deteriorando en el silencio del "neutro". Primera acción: Genera una carga eléctrica real antes de proceder.
                                      </p>
                                    </div>
                                  </motion.div>
                                )}

                                {iaFeedback && !showGlitchDiag && !(currentStep === 2 && iaFeedback.mensaje) && (() => {
                                  const idBorder = activeIdentidad?.endsWith("_M") ? `${GOLD}55`
                                    : activeIdentidad?.endsWith("_F") ? `${VIOLET}55`
                                    : activeFase === "PIO" ? `${RED_ALERT}55`
                                    : null;
                                  const idBg = activeIdentidad?.endsWith("_M") ? `${GOLD}06`
                                    : activeIdentidad?.endsWith("_F") ? `${VIOLET}06`
                                    : activeFase === "PIO" ? `${RED_ALERT}06`
                                    : null;
                                  return (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-3 p-4 rounded-xl relative"
                                    style={{ 
                                      backgroundColor: idBg || (iaFeedback.puede_avanzar ? `${CYAN_NEON}08` : `${RED_ALERT}08`),
                                      border: `1px solid ${idBorder || (iaFeedback.puede_avanzar ? `${CYAN_NEON}30` : `${RED_ALERT}30`)}`,
                                      borderLeft: idBorder ? `3px solid ${idBorder}` : undefined,
                                    }}
                                  >
                                    <div className="absolute top-2 right-2">
                                      <ColorBadge color={doctorMarkerColor} />
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" 
                                        style={{ backgroundColor: iaFeedback.puede_avanzar ? `${CYAN_NEON}15` : `${RED_ALERT}15` }}>
                                        {iaFeedback.puede_avanzar ? (
                                          <CheckCircle size={14} style={{ color: CYAN_NEON }} />
                                        ) : (
                                          <AlertTriangle size={14} style={{ color: RED_ALERT }} />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-1 mb-1">
                                          <p className="text-[10px] font-bold" style={{ color: iaFeedback.puede_avanzar ? CYAN_NEON : RED_ALERT, fontFamily: "monospace" }}>
                                            DOCTOR_IA // PROFUNDIDAD: {iaFeedback.profundidad}/10
                                          </p>
                                        </div>
                                        <VoiceBanner identidad={activeIdentidad} />
                                        <p className="text-xs text-white/80 leading-relaxed" style={{ fontFamily: "monospace" }}>{cleanedMensaje ?? iaFeedback.mensaje}</p>
                                        {iaFeedback.confrontacion && (
                                          <p className="text-xs mt-2 italic" style={{ color: RED_ALERT, fontFamily: "monospace" }}>
                                            &gt; {iaFeedback.confrontacion}
                                          </p>
                                        )}
                                        {codigo343 && (
                                          <p className="text-[10px] mt-2 font-bold" style={{ color: CYAN_NEON, fontFamily: "monospace" }}>
                                            ▸ Dirección: {codigo343}
                                          </p>
                                        )}
                                        {iaFeedback.firma_salida && (
                                          <p className="text-[10px] mt-1 opacity-60" style={{ color: CYAN_NEON, fontFamily: "monospace" }}>
                                            {iaFeedback.firma_salida}
                                          </p>
                                        )}
                                        {currentStep === 0 && pataDetectada && (
                                          <div className="mt-3 pt-3 flex flex-wrap gap-2" style={{ borderTop: `1px solid ${CYAN_NEON}20` }}>
                                            <span className="px-2 py-1 rounded text-[10px] font-black tracking-widest" style={{ backgroundColor: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: GOLD, fontFamily: "monospace" }}>
                                              ZONA: {pataDetectada}
                                            </span>
                                            {nivelSeñal && (
                                              <span className="px-2 py-1 rounded text-[10px] font-black tracking-widest" style={{
                                                backgroundColor: nivelSeñal === "critica" ? `${RED_ALERT}15` : nivelSeñal === "activa" ? `#FF8C0015` : `${CYAN_NEON}10`,
                                                border: `1px solid ${nivelSeñal === "critica" ? `${RED_ALERT}50` : nivelSeñal === "activa" ? "#FF8C0040" : `${CYAN_NEON}25`}`,
                                                color: nivelSeñal === "critica" ? RED_ALERT : nivelSeñal === "activa" ? "#FF8C00" : CYAN_NEON,
                                                fontFamily: "monospace"
                                              }}>
                                                SEÑAL: {nivelSeñal.toUpperCase()}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                  );
                                })()}

                                {iaFeedback && (
                                  <div className="flex md:hidden justify-center mt-4" data-testid="silueta-mobile">
                                    <div className="flex flex-col items-center gap-2">
                                      <p className="text-[9px] uppercase tracking-widest" style={{ color: CYAN_NEON, fontFamily: "monospace", opacity: 0.6 }}>MAPA_CORPORAL</p>
                                      <HumanSilhouette
                                        activeZones={activeZones.length > 0 ? activeZones : ["ESTABILIDAD"]}
                                        alertZone={activeFase === "PIO" ? "PIO" : alertZone}
                                        activeColor={activeColor343}
                                        zonaActiva={activeZonaCorporal ?? undefined}
                                        colorDiagnostico={doctorMarkerColor ? ({ ROJO: "#FF3131", NARANJA: "#F97316", AMARILLO: "#EAB308", VERDE: "#22C55E", AZUL: "#3B82F6", MORADO: "#8B5CF6", VIOLETA: "#A78BFA" }[doctorMarkerColor] ?? undefined) : undefined}
                                      />
                                      {pataDetectada && (
                                        <p className="text-[9px] font-black tracking-widest" style={{ color: GOLD, fontFamily: "monospace" }}>ZONA: {pataDetectada}</p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {iaBlocked && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-3 p-3 rounded-xl"
                                    style={{ backgroundColor: `${GOLD}08`, border: `1px solid ${GOLD}25` }}
                                  >
                                    <p className="text-[10px] text-center" style={{ color: GOLD, fontFamily: "monospace" }}>
                                      CRÉDITOS INSUFICIENTES.{" "}
                                      <a href={MERCADOPAGO_URL} target="_blank" rel="noopener noreferrer" className="underline font-bold">
                                        ADQUIRIR CRÉDITOS
                                      </a>
                                    </p>
                                  </motion.div>
                                )}

                                {iaFeedback && !iaFeedback.puede_avanzar && iaFeedback.profundidad <= 3 && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="mt-3 p-3 rounded-xl text-center"
                                    style={{ backgroundColor: `${CYAN_NEON}04`, border: `1px solid ${CYAN_NEON}15` }}
                                  >
                                    <p className="text-[10px] italic leading-relaxed" style={{ color: CYAN_NEON, fontFamily: "monospace" }}>
                                      SYSTEM_WAIT: Mantén la frecuencia. El hardware se descomprime al registrar la estática.
                                    </p>
                                  </motion.div>
                                )}

                                {currentStep === 1 && iaFeedback?.mensaje && (() => {
                                  const msg = cleanedMensaje ?? iaFeedback.mensaje;
                                  const allLines = msg.split("\n");
                                  const dayLines = allLines.filter(l => /Día\s*\d|DÍA\s*\d/i.test(l)).slice(0, 5);
                                  return (
                                    <motion.div
                                      key="plan-seguimiento"
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.3 }}
                                      className="mt-3 rounded-xl overflow-hidden"
                                      style={{ border: `1px solid ${GOLD}25`, backgroundColor: `${GOLD}04` }}
                                    >
                                      <div className="px-3 py-2" style={{ backgroundColor: `${GOLD}10`, borderBottom: `1px solid ${GOLD}20` }}>
                                        <p className="text-[9px] font-black tracking-widest uppercase" style={{ color: GOLD, fontFamily: "monospace" }}>PROTOCOLO DE CONTINUIDAD</p>
                                      </div>
                                      {dayLines.length > 0 ? (
                                        <div className="p-3 grid grid-cols-5 gap-1.5">
                                          {dayLines.map((line, i) => {
                                            const cleanLine = line.replace(/[*_#►▸•\-]/g, "").trim();
                                            const dayMatch = cleanLine.match(/Día\s*(\d+)|DÍA\s*(\d+)/i);
                                            const dayNum = dayMatch ? (dayMatch[1] || dayMatch[2]) : String(i + 1);
                                            const dayText = cleanLine.replace(/Día\s*\d+:?|DÍA\s*\d+:?/i, "").trim();
                                            return (
                                              <div key={i} className="flex flex-col items-center gap-1 p-1.5 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black" style={{ backgroundColor: `${GOLD}20`, color: GOLD, fontFamily: "monospace" }}>
                                                  {dayNum}
                                                </div>
                                                <p className="text-[8px] text-center leading-tight" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
                                                  {dayText.slice(0, 40)}{dayText.length > 40 ? "…" : ""}
                                                </p>
                                                <div className="w-3.5 h-3.5 rounded border flex items-center justify-center mt-0.5" style={{ borderColor: `${GOLD}30`, backgroundColor: "rgba(0,0,0,0.3)" }}>
                                                  <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "transparent" }} />
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="p-3 flex items-center gap-2">
                                          <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: `${GOLD}20` }}>
                                            <span style={{ color: GOLD, fontSize: "10px", fontFamily: "monospace" }}>1</span>
                                          </div>
                                          <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
                                            Regresa mañana para registrar el resultado del primer paso. El sistema registrará el avance.
                                          </p>
                                        </div>
                                      )}
                                    </motion.div>
                                  );
                                })()}

                                {currentStep === 1 && eje2MensajeText && !protocolo5DiasActivado && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="mt-3 rounded-xl overflow-hidden"
                                    style={{ border: `1px solid ${GOLD}50`, boxShadow: `0 0 20px ${GOLD}08` }}
                                  >
                                    <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: `${GOLD}12`, borderBottom: `1px solid ${GOLD}20` }}>
                                      <ListChecks size={11} style={{ color: GOLD }} />
                                      <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: GOLD, fontFamily: "monospace" }}>PROTOCOLO_5_DÍAS — Opcional</span>
                                    </div>
                                    <div className="p-3" style={{ backgroundColor: `${GOLD}04` }}>
                                      <p className="text-[10px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
                                        No es obligatorio para continuar al Protocolo (Eje 3). Si quieres, puedes copiarlo o activarlo en Planificación después.
                                      </p>
                                      <p className="text-[9px] leading-relaxed mb-3 px-2 py-1.5 rounded-lg" style={{ color: `${GOLD}CC`, fontFamily: "monospace", backgroundColor: `${GOLD}08`, border: `1px dashed ${GOLD}30` }}>
                                        Con Arquitecto, el Doctor puede vigilar el cumplimiento. Sin activarlo, igual puedes pedir La Llave y guardar el protocolo.
                                      </p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            const text = eje2MensajeText || "";
                                            navigator.clipboard.writeText(text).then(() => {
                                              toast("Plan copiado al portapapeles.", {
                                                style: { background: "#0A0A0A", border: `1px solid ${GOLD}40`, color: GOLD, fontFamily: "monospace" }
                                              });
                                            });
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-opacity hover:opacity-80"
                                          style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "monospace" }}
                                          data-testid="btn-copiar-plan-5dias"
                                        >
                                          <Copy size={10} />
                                          COPIAR
                                        </button>
                                        <button
                                          onClick={handleOpenModal5Dias}
                                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-opacity hover:opacity-90"
                                          style={{ backgroundColor: GOLD, color: "#000", fontFamily: "monospace" }}
                                          data-testid="btn-activar-protocolo-5dias"
                                        >
                                          <Layers size={10} />
                                          ACTIVAR EN PLANIFICACIÓN (opc.)
                                          <ArrowRight size={10} />
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}

                                {currentStep === 1 && protocolo5DiasActivado && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mt-3 p-3 rounded-xl flex items-center gap-2"
                                    style={{ border: `1px solid ${GOLD}40`, backgroundColor: `${GOLD}08` }}
                                  >
                                    <CheckCircle size={14} style={{ color: GOLD }} />
                                    <span className="text-[10px] font-bold" style={{ color: GOLD, fontFamily: "monospace" }}>PROTOCOLO_5_DÍAS ACTIVADO — Revisa Planificación</span>
                                  </motion.div>
                                )}

                                {currentStep === 1 && iaFeedback && doctorMarkerColor && (() => {
                                  const COLORES_MAP: Record<string, { hz: string; atributo: string; carencia: string; mezcla: string; hexColor: string }> = {
                                    ROJO:    { hz: "430 THz", atributo: "Instinto / Suelo / Cuerpo",       carencia: "Atrofia vital, pérdida de fuerza física y base económica.",           mezcla: "Rojo + Azul",    hexColor: "#FF3131" },
                                    NARANJA: { hz: "495 THz", atributo: "Creatividad / Asombro / Deseo",   carencia: "Anestesia sensorial, bloqueo creativo, rutina sin vida.",            mezcla: "Naranja + Morado", hexColor: "#F97316" },
                                    AMARILLO:{ hz: "525 THz", atributo: "Poder / Ego / Voluntad",          carencia: "Vergüenza, soberbia o parálisis de identidad.",                      mezcla: "Verde + Amarillo", hexColor: "#EAB308" },
                                    VERDE:   { hz: "575 THz", atributo: "Fricción / Corazón / Relación",   carencia: "Resentimiento, envidia, enfriamiento del vínculo.",                  mezcla: "Rojo + Verde",   hexColor: "#22C55E" },
                                    AZUL:    { hz: "640 THz", atributo: "Sintonía / Palabra / Verdad",     carencia: "Hipotiroidismo comunicacional. La voz sabe la verdad pero la sella.", mezcla: "Azul + Blanco",  hexColor: "#3B82F6" },
                                    MORADO:  { hz: "685 THz", atributo: "Mando / Estrategia / Visión",     carencia: "Niebla mental, pérdida de dirección, obediencia sin brújula.",       mezcla: "Morado + Rojo",  hexColor: "#8B5CF6" },
                                    VIOLETA: { hz: "745 THz", atributo: "Destino / Conexión / Fe",         carencia: "Nihilismo, envejecimiento acelerado, desconexión del propósito.",    mezcla: "Violeta + Todos", hexColor: "#A855F7" },
                                  };
                                  const colorKey = doctorMarkerColor.toUpperCase();
                                  const info = COLORES_MAP[colorKey];
                                  if (!info) return null;
                                  return (
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.4 }}
                                      className="mt-3 rounded-xl overflow-hidden"
                                      style={{ border: `1px solid ${info.hexColor}40`, boxShadow: `0 0 20px ${info.hexColor}08` }}
                                      data-testid="panel-revelacion-cromatica"
                                    >
                                      <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: `${info.hexColor}12`, borderBottom: `1px solid ${info.hexColor}25` }}>
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: info.hexColor, boxShadow: `0 0 6px ${info.hexColor}` }} />
                                        <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: info.hexColor, fontFamily: "monospace" }}>Mapa Cromático Revelado — {colorKey}</span>
                                        <span className="ml-auto text-[8px]" style={{ color: `${info.hexColor}70`, fontFamily: "monospace" }}>{info.hz}</span>
                                      </div>
                                      <div className="p-3 space-y-2" style={{ backgroundColor: `${info.hexColor}05` }}>
                                        <div>
                                          <p className="text-[8px] uppercase tracking-widest mb-0.5" style={{ color: `${info.hexColor}70`, fontFamily: "monospace" }}>Frecuencia</p>
                                          <p className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "monospace" }}>{info.atributo}</p>
                                        </div>
                                        <div>
                                          <p className="text-[8px] uppercase tracking-widest mb-0.5" style={{ color: `${info.hexColor}70`, fontFamily: "monospace" }}>Cuando falta este color</p>
                                          <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.65)", fontFamily: "monospace" }}>{info.carencia}</p>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1" style={{ borderTop: `1px solid ${info.hexColor}15` }}>
                                          <span className="text-[8px] uppercase tracking-widest" style={{ color: `${info.hexColor}70`, fontFamily: "monospace" }}>Mezcla óptima de tu interfaz:</span>
                                          <span className="text-[9px] font-black" style={{ color: info.hexColor, fontFamily: "monospace" }}>{info.mezcla}</span>
                                        </div>
                                        <p className="text-[8px] italic leading-relaxed" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
                                          El Eje 3 contiene el protocolo exacto para restaurar esta frecuencia en tu sistema.
                                        </p>
                                      </div>
                                    </motion.div>
                                  );
                                })()}

                                <div className="flex gap-2 mt-4">
                                {iaFeedback && !iaFeedback.puede_avanzar && !eje1FeedbackShown && (
                                    <button
                                      onClick={forceAdvance}
                                      className="flex-1 py-3 rounded-xl text-xs font-bold transition-all hover:bg-white/10"
                                      style={{ backgroundColor: "rgba(255,255,255,0.03)", color: "#666", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "monospace" }}
                                      data-testid={`btn-forzar-${eje.id}`}
                                    >
                                      SKIP_VALIDATION
                                    </button>
                                  )}
                                  
                                  {currentStep === 0 && eje1FeedbackShown ? (
                                    <div className="flex flex-col gap-2 w-full">
                                      {nivelSeñal === "insuficiente" && (
                                        <div className="px-3 py-2 rounded-lg text-[10px] leading-relaxed" style={{ backgroundColor: `${CYAN_NEON}06`, border: `1px dashed ${CYAN_NEON}30`, color: `${CYAN_NEON}AA`, fontFamily: "monospace" }}>
                                          SEÑAL INSUFICIENTE: Para un diagnóstico preciso necesito más carga. Regresa cuando el peso sea más concreto o amplía tu registro.
                                        </div>
                                      )}
                                      {(() => {
                                        const isPrimaryClose = recomendacionSesion === "cerrar" || nivelSeñal === "insuficiente";
                                        return (
                                          <>
                                            <button
                                              onClick={() => {
                                                const costDiag = EJES[1]?.costo || 1;
                                                if (costDiag > 0 && credits < costDiag && !esOwnerUser) {
                                                  setIaBlocked(true);
                                                  toast.error(`Diagnóstico requiere ${costDiag} crédito${costDiag > 1 ? "s" : ""}`, {
                                                    description: "Adquiere créditos para continuar al diagnóstico clínico.",
                                                    style: { backgroundColor: "#0a0a0a", border: `1px solid ${GOLD}`, color: GOLD }
                                                  });
                                                  return;
                                                }
                                                setEje1FeedbackShown(false);
                                                advanceToNextStep(currentTexto.trim());
                                              }}
                                              className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                              style={{
                                                background: isPrimaryClose ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${CYAN_NEON}80 0%, ${GOLD} 100%)`,
                                                color: isPrimaryClose ? "#888" : "#000",
                                                border: isPrimaryClose ? "1px solid rgba(255,255,255,0.12)" : "none",
                                                fontFamily: "monospace"
                                              }}
                                              data-testid="btn-continuar-diagnostico"
                                            >
                                              <ChevronRight size={14} />
                                              CONTINUAR AL DIAGNÓSTICO
                                              {pataDetectada && <span className="ml-1 opacity-70">· {pataDetectada}</span>}
                                              {nivelSeñal && nivelSeñal !== "insuficiente" && <span className="ml-1 opacity-60">· {nivelSeñal.toUpperCase()}</span>}
                                              <span className="ml-1 text-[10px] opacity-60">— 1 Crédito</span>
                                            </button>
                                            <button
                                              onClick={handleCerrarDuchaMental}
                                              className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                              style={{
                                                background: isPrimaryClose ? `linear-gradient(135deg, ${CYAN_NEON}80 0%, ${GOLD} 100%)` : "rgba(255,255,255,0.04)",
                                                color: isPrimaryClose ? "#000" : "#888",
                                                border: isPrimaryClose ? "none" : "1px solid rgba(255,255,255,0.10)",
                                                fontFamily: "monospace"
                                              }}
                                              data-testid="btn-cerrar-ducha-mental"
                                            >
                                              <Droplets size={14} />
                                              CERRAR DUCHA MENTAL
                                              <span className="text-[10px] opacity-70 ml-1">+10 PS</span>
                                            </button>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  ) : currentStep === 1 && (iaFeedback?.mensaje || eje2MensajeText) ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const costProto = eje3DynamicCost ?? EJES[2]?.costo ?? 4;
                                        if (costProto > 0 && credits < costProto && !esOwnerUser) {
                                          setIaBlocked(true);
                                          toast.error(`Protocolo requiere ${costProto} crédito${costProto > 1 ? "s" : ""}`, {
                                            style: { backgroundColor: "#0a0a0a", border: `1px solid ${GOLD}`, color: GOLD }
                                          });
                                          return;
                                        }
                                        setOxidacionDetectada(false);
                                        advanceToNextStep(eje2MensajeText || cleanedMensaje || currentTexto.trim());
                                      }}
                                      className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                      style={{
                                        background: `linear-gradient(135deg, ${RED_ALERT} 0%, ${GOLD} 100%)`,
                                        color: "#000",
                                        fontFamily: "monospace",
                                      }}
                                      data-testid="btn-continuar-protocolo"
                                    >
                                      <ChevronRight size={14} />
                                      CONTINUAR AL PROTOCOLO
                                      <span className="ml-1 text-[10px] opacity-70">— Eje 3</span>
                                    </button>
                                  ) : !(currentStep === 2 && iaFeedback?.mensaje) && !(currentStep === 2 && bloqueoEje3 && bloqueoEje3.hasta > Date.now()) && (
                                    <div className="flex flex-col gap-2 w-full flex-1">
                                      <button
                                        onClick={handleSubmitStep}
                                        disabled={currentTexto.trim().length < 5 || iaLoading}
                                        className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                                        style={{ 
                                          background: `linear-gradient(135deg, ${eje.color} 0%, ${GOLD} 100%)`,
                                          color: "#000",
                                          fontFamily: "monospace"
                                        }}
                                        data-testid={`btn-submit-${eje.id}`}
                                      >
                                        {iaLoading ? (
                                          <>
                                            <Loader2 size={14} className="animate-spin" />
                                            {currentStep === 2 ? "GENERANDO PROTOCOLO..." : "PROCESSING..."}
                                          </>
                                        ) : (
                                          <>
                                            <Send size={14} />
                                            {currentStep === 0 ? "ESCANEAR REGISTRO" : currentStep === 1 ? (
                                              <>
                                                INVERTIR 1 CRÉDITO — Diagnóstico{pataDetectada ? ` · ${pataDetectada}` : ""}{nivelSeñal ? ` · ${nivelSeñal.toUpperCase()}` : ""}
                                              </>
                                            ) : (
                                              <>
                                                ENTREGAR PROTOCOLO
                                                <span className="ml-1 text-[10px] opacity-70">— {eje3DynamicCost ?? eje.costo} créd.</span>
                                              </>
                                            )}
                                          </>
                                        )}
                                      </button>
                                      {currentStep === 0 && currentTexto.trim().length >= 5 && !iaLoading && (
                                        <button
                                          type="button"
                                          onClick={handleCerrarDuchaMental}
                                          className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                          style={{
                                            backgroundColor: `${CYAN_NEON}12`,
                                            border: `1px solid ${CYAN_NEON}40`,
                                            color: CYAN_NEON,
                                            fontFamily: "monospace",
                                          }}
                                          data-testid="btn-guardar-ducha-mental"
                                        >
                                          <Droplets size={14} />
                                          GUARDAR DUCHA MENTAL
                                          <span className="text-[10px] opacity-70 ml-1">+10 PS · Revisable</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      </AnimatePresence>

                      {currentStep > 0 && (
                        <div className="space-y-1 mt-4">
                          <p className="text-[10px] uppercase tracking-widest" style={{ color: CYAN_NEON, fontFamily: "monospace", opacity: 0.5 }}>EJES_COMPLETADOS</p>
                          {EJES.slice(0, currentStep).map(eje => {
                            const Icon = eje.icon;
                            return (
                              <div 
                                key={eje.id}
                                className="p-2 rounded-lg flex items-center gap-3"
                                style={{ backgroundColor: `${eje.color}06`, border: `1px solid ${eje.color}10` }}
                              >
                                <Icon size={14} style={{ color: eje.color }} />
                                <span className="text-[10px] uppercase tracking-wider" style={{ color: eje.color, fontFamily: "monospace" }}>{eje.objetivo}</span>
                                <span className="text-[10px] text-white/40 flex-1 line-clamp-1" style={{ fontFamily: "monospace" }}>
                                  {respuestas[eje.id]?.substring(0, 50)}...
                                </span>
                                <CheckCircle size={12} style={{ color: eje.color }} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScreenColorWash>

                    <div className="hidden md:flex flex-col items-center flex-shrink-0" style={{ width: "120px" }}>
                      <HumanSilhouette activeZones={activeZones} alertZone={activeFase === "PIO" ? "PIO" : alertZone} activeColor={activeColor343} zonaActiva={activeZonaCorporal ?? undefined} colorDiagnostico={doctorMarkerColor ? ({ ROJO: "#FF3131", NARANJA: "#F97316", AMARILLO: "#EAB308", VERDE: "#22C55E", AZUL: "#3B82F6", MORADO: "#8B5CF6", VIOLETA: "#A78BFA" }[doctorMarkerColor] ?? undefined) : undefined} />
                    </div>
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  {showConfetti && <ConfettiCelebration trigger={showConfetti} />}
                  
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                    style={{ 
                      background: `linear-gradient(135deg, ${CYAN_NEON}20 0%, ${GOLD}20 100%)`,
                      border: `1px solid ${GOLD}40`,
                      boxShadow: `0 0 40px ${GOLD}20`
                    }}
                  >
                    <CheckCircle size={48} style={{ color: GOLD }} />
                  </motion.div>
                  
                  <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: "monospace" }}>
                    SESIÓN COMPLETADA
                  </h2>
                  
                  {(() => {
                    const totalSesiones = sesiones.filter(s => s.modo === "arquitecto").length;
                    const maestriaPct = Math.min(((totalSesiones + 1) * 2.3), 100).toFixed(1);
                    const interferencia = respuestas.afloramiento?.substring(0, 60) || "la interferencia detectada";
                    return (
                      <>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="p-4 rounded-xl mb-4 text-left"
                          style={{ backgroundColor: `${CYAN_NEON}06`, border: `1px solid ${CYAN_NEON}20` }}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: CYAN_NEON, fontFamily: "monospace" }}>
                            RESUMEN_CLÍNICO // DOCTOR_IA
                          </p>
                          <p className="text-xs text-white/70 leading-relaxed" style={{ fontFamily: "monospace" }}>
                            Interferencia procesada: "{interferencia}". Descompresión completada.
                          </p>
                          <p className="text-xs mt-2 font-bold" style={{ color: GOLD, fontFamily: "monospace" }}>
                            +{FIXED_POINTS} PS sellados. MAESTRÍA: {maestriaPct}%
                          </p>
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                          style={{ backgroundColor: `${GOLD}20`, border: `1px solid ${GOLD}40` }}
                        >
                          <Zap size={14} style={{ color: GOLD }} />
                          <span className="text-sm font-bold" style={{ color: GOLD }}>
                            Rango: {userRank} — Sesión #{totalSesiones + 1}
                          </span>
                        </motion.div>
                      </>
                    );
                  })()}

                  <button
                    onClick={resetToLanding}
                    className="w-full py-4 rounded-xl font-bold"
                    style={{ backgroundColor: GOLD, color: "#000", fontFamily: "monospace" }}
                    data-testid="btn-volver-espejo"
                  >
                    VOLVER_AL_ESPEJO
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {phase === "mapa" && (
          <motion.div
            key="mapa"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen p-4 pb-24"
          >
            <div className="max-w-lg mx-auto">
              {showConfetti && <ConfettiCelebration trigger={showConfetti} />}
              
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ 
                    background: isGoldenProtocol 
                      ? `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}80 100%)`
                      : `linear-gradient(135deg, ${CYAN_NEON}20 0%, ${GOLD}20 100%)`,
                    border: `1px solid ${isGoldenProtocol ? GOLD : `${CYAN_NEON}30`}`,
                    boxShadow: isGoldenProtocol 
                      ? `0 0 60px ${GOLD}50, 0 0 120px ${GOLD}20`
                      : `0 0 40px ${CYAN_NEON}15`
                  }}
                >
                  {isGoldenProtocol ? (
                    <Crown size={40} style={{ color: "#fff" }} />
                  ) : (
                    <BarChart3 size={40} style={{ color: CYAN_NEON }} />
                  )}
                </motion.div>
                
                <h2 className="text-xl font-black text-white mb-1" style={{ fontFamily: "monospace" }}>
                  {isGoldenProtocol ? "PROTOCOLO SOBERANO" : "MAPA DE VOLTAJE"}
                </h2>
                <p className="text-xs" style={{ color: isGoldenProtocol ? GOLD : `${CYAN_NEON}60`, fontFamily: "monospace" }}>
                  {isGoldenProtocol ? "Soberanía Técnica Confirmada" : "Registro de Evolución — Diagnóstico Clínico"}
                </p>
              </div>

              {isGoldenProtocol && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-5 rounded-2xl mb-6"
                  style={{ 
                    backgroundColor: `${GOLD}08`, 
                    border: `2px solid ${GOLD}40`,
                    boxShadow: `0 0 40px ${GOLD}15`
                  }}
                  data-testid="panel-golden-protocol"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${WARM_ROSE} 100%)` }}>
                      <Shield size={22} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: GOLD, fontFamily: "monospace" }}>
                        DOCTOR_IA // VEREDICTO_DE_SOBERANÍA
                      </p>
                      <p className="text-xs text-white/90 leading-relaxed" style={{ fontFamily: "monospace" }}>
                        Soberano, has comprobado la eficacia técnica de SISTEMICAR 4 veces. Tu sistema ya no es un experimento; es una estructura estable. Estás listo para el siguiente nivel: La Expansión. Se ha habilitado tu enlace de Socio Soberano (30% de retorno).
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {mapaLoading ? (
                <div className="text-center py-12">
                  <Loader2 size={32} className="mx-auto mb-4 animate-spin" style={{ color: CYAN_NEON }} />
                  <p className="text-sm" style={{ color: `${CYAN_NEON}60`, fontFamily: "monospace" }}>GENERANDO_MAPA_VOLTAJE...</p>
                </div>
              ) : mapaVoltaje ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="p-5 rounded-2xl mb-4" style={{ backgroundColor: DARK_BG, border: `1px solid ${CYAN_NEON}20` }}>
                    <div className="flex gap-6 items-start mb-6">
                      <div className="hidden md:block flex-shrink-0" style={{ width: "100px" }}>
                        <HumanSilhouette activeZones={activeZones.length > 0 ? activeZones : ["estabilidad", "conexion"]} alertZone={activeFase === "PIO" ? "PIO" : alertZone} />
                      </div>
                      <div className="flex-1 text-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", delay: 0.5 }}
                          className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-3"
                          style={{ 
                            background: `conic-gradient(${CYAN_NEON} ${mapaVoltaje.voltaje_total}%, transparent ${mapaVoltaje.voltaje_total}%)`,
                            boxShadow: `0 0 30px ${CYAN_NEON}20`
                          }}
                        >
                          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: DARK_BG }}>
                            <span className="text-2xl font-black" style={{ color: CYAN_NEON, fontFamily: "monospace" }}>{mapaVoltaje.voltaje_total}%</span>
                          </div>
                        </motion.div>
                        <p className="text-[10px]" style={{ color: `${CYAN_NEON}50`, fontFamily: "monospace" }}>VOLTAJE_TOTAL</p>
                        <p className="text-sm font-bold mt-1" style={{ color: GOLD, fontFamily: "monospace" }}>
                          {mapaVoltaje.frecuencia_dominante}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <VoltageBar value={mapaVoltaje.ejes_voltaje.registro_carga} color={CYAN_NEON} label="Ducha Mental" />
                      <VoltageBar value={mapaVoltaje.ejes_voltaje.diagnostico_clinico} color={RED_ALERT} label="Diagnóstico Clínico" />
                      <VoltageBar value={mapaVoltaje.ejes_voltaje.protocolo_calibracion} color={GOLD} label="Protocolo de Calibración" />
                    </div>

                    <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: `${RED_ALERT}06`, border: `1px solid ${RED_ALERT}20` }}>
                      <p className="text-[10px] font-bold mb-1" style={{ color: RED_ALERT, fontFamily: "monospace" }}>DIAGNÓSTICO</p>
                      <p className="text-xs text-white/80 leading-relaxed" style={{ fontFamily: "monospace" }}>{mapaVoltaje.diagnostico}</p>
                    </div>

                    <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: `${CYAN_NEON}06`, border: `1px solid ${CYAN_NEON}20` }}>
                      <p className="text-[10px] font-bold mb-1" style={{ color: CYAN_NEON, fontFamily: "monospace" }}>RECOMENDACIÓN</p>
                      <p className="text-xs text-white/80 leading-relaxed" style={{ fontFamily: "monospace" }}>{mapaVoltaje.recomendacion}</p>
                    </div>

                    {mapaVoltaje.vibracion_final !== undefined && (
                      <div className="p-3 rounded-xl" style={{ backgroundColor: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
                        <p className="text-[10px] font-bold mb-1" style={{ color: GOLD, fontFamily: "monospace" }}>VIBRACIÓN_FINAL</p>
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-black" style={{ color: GOLD, fontFamily: "monospace" }}>
                            {mapaVoltaje.vibracion_final > 0 ? "+" : ""}{mapaVoltaje.vibracion_final}%
                          </div>
                          <p className="text-[10px] text-white/50" style={{ fontFamily: "monospace" }}>
                            {mapaVoltaje.vibracion_final > 0 
                              ? "Descompresión exitosa del sistema." 
                              : "El sistema requiere más sesiones de escaneo."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-4 rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${GOLD}40`, backgroundColor: `${GOLD}08` }}
                  >
                    <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b" style={{ borderColor: `${GOLD}25` }}>
                      <CalendarPlus size={12} style={{ color: GOLD }} />
                      <span className="text-[10px] font-bold tracking-wider" style={{ color: GOLD, fontFamily: "monospace" }}>
                        SEGUIMIENTO_ACTIVO
                      </span>
                      {(mapaVoltaje.codigo_diagnostico || lastDiagCode) && (
                        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${GOLD}20`, color: GOLD, fontFamily: "monospace" }}>
                          {mapaVoltaje.codigo_diagnostico || lastDiagCode}
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[10px] text-white/50 mb-1" style={{ fontFamily: "monospace" }}>PROTOCOLO_PRESCRITO</p>
                      <p className="text-xs text-white/80 leading-relaxed mb-3" style={{ fontFamily: "monospace" }}>
                        {(calibracionDoctorText || mapaVoltaje.recomendacion || "Protocolo de calibración completado.").substring(0, 120)}
                        {(calibracionDoctorText || mapaVoltaje.recomendacion || "").length > 120 ? "…" : ""}
                      </p>
                      {seguimientoActivado ? (
                        <div className="flex items-center gap-2 py-2">
                          <CheckCircle size={12} style={{ color: GOLD }} />
                          <span className="text-[10px] font-bold" style={{ color: GOLD, fontFamily: "monospace" }}>
                            SEGUIMIENTO LISTO (Planificación opcional)
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={handleActivarSeguimiento}
                          disabled={seguimientoLoading}
                          data-testid="btn-activar-seguimiento-planeacion"
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-opacity"
                          style={{ backgroundColor: GOLD, color: "#000", fontFamily: "monospace", opacity: seguimientoLoading ? 0.6 : 1 }}
                        >
                          {seguimientoLoading ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CalendarPlus size={12} />
                          )}
                          <span className="text-[11px]">
                            {seguimientoLoading ? "ACTIVANDO…" : "ACTIVAR SEGUIMIENTO (OPCIONAL)"}
                          </span>
                          {!seguimientoLoading && <ArrowRight size={11} />}
                        </button>
                      )}
                    </div>
                  </motion.div>

                  <div className="text-center mb-4">
                    {(() => {
                      const totalSesiones = sesiones.filter(s => s.modo === "arquitecto").length;
                      const maestriaPct = Math.min((totalSesiones * 2.3), 100).toFixed(1);
                      const interferencia = respuestas.afloramiento?.substring(0, 60) || "la interferencia detectada";
                      return (
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="p-3 rounded-xl mb-3 text-left"
                            style={{ backgroundColor: `${CYAN_NEON}06`, border: `1px solid ${CYAN_NEON}20` }}
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: CYAN_NEON, fontFamily: "monospace" }}>
                              DIAGNÓSTICO_DE_CIERRE
                            </p>
                            <p className="text-xs text-white/70 leading-relaxed" style={{ fontFamily: "monospace" }}>
                              Interferencia procesada: "{interferencia}". Descompresión completada. +{FIXED_POINTS} PS sellados.
                            </p>
                            <p className="text-xs mt-1 font-bold" style={{ color: GOLD, fontFamily: "monospace" }}>
                              MAESTRÍA: {maestriaPct}%
                            </p>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                            style={{ backgroundColor: `${GOLD}15`, border: `1px solid ${GOLD}30` }}
                          >
                            <Zap size={12} style={{ color: GOLD }} />
                            <span className="text-xs font-bold" style={{ color: GOLD }}>Rango: {userRank} — Sesión #{totalSesiones}</span>
                          </motion.div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="space-y-2 mb-6">
                    {EJES.map(eje => {
                      const Icon = eje.icon;
                      return (
                        <div 
                          key={eje.id}
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: `${eje.color}10`, border: `1px solid ${eje.color}20` }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={12} style={{ color: eje.color }} />
                            <span className="text-[10px] font-bold" style={{ color: eje.color }}>{eje.label} — {eje.subtitle}</span>
                          </div>
                          <p className="text-xs text-white/80">{respuestas[eje.id]}</p>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={resetToLanding}
                    className="w-full py-4 rounded-xl font-bold"
                    style={{ backgroundColor: GOLD, color: "#000", fontFamily: "monospace" }}
                    data-testid="btn-volver-espejo-mapa"
                  >
                    VOLVER_AL_ESPEJO
                  </button>
                </motion.div>
              ) : null}
            </div>
          </motion.div>
        )}

        {phase === "historial" && (
          <motion.div
            key="historial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen p-4 pb-24"
          >
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10">
                    <History size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Historial del Santuario</h2>
                    <p className="text-[10px] text-slate-500">Últimas {sesiones.length} sesiones</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePrivacy}
                    className={`p-2 rounded-lg transition-all ${privacyMode ? "bg-violet-500/20" : "bg-white/5"}`}
                    data-testid="btn-toggle-privacy"
                  >
                    {privacyMode ? (
                      <EyeOff size={16} style={{ color: VIOLET }} />
                    ) : (
                      <Eye size={16} className="text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={resetToLanding}
                    className="text-slate-500 hover:text-white transition-colors"
                    data-testid="btn-cerrar-historial"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {privacyMode && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 mb-4">
                  <Shield size={16} style={{ color: VIOLET }} />
                  <span className="text-xs" style={{ color: VIOLET }}>
                    Modo Privacidad Activo - Contenido oculto
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {sesiones.map(sesion => {
                  const isExpanded = expandedSesion === sesion.id;
                  return (
                    <motion.div 
                      key={sesion.id}
                      className="rounded-xl border overflow-hidden cursor-pointer"
                      style={{ 
                        backgroundColor: "#0a0a0a",
                        borderColor: sesion.modo === "arquitecto" ? `${WARM_ROSE}30` : `${EMERALD}30`
                      }}
                      onClick={() => setExpandedSesion(isExpanded ? null : sesion.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {sesion.modo === "arquitecto" ? (
                              <Heart size={14} style={{ color: WARM_ROSE }} />
                            ) : (
                              <Sparkles size={14} style={{ color: EMERALD }} />
                            )}
                            <span className="text-xs font-bold text-white">
                              {sesion.modo === "arquitecto" ? "Corazón Sabio" : "Captura"}
                            </span>
                            {sesion.contexto && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-400">
                                {sesion.contexto}
                              </span>
                            )}
                            <span 
                              className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ 
                                backgroundColor: sesion.modo === "arquitecto" ? `${WARM_ROSE}20` : `${EMERALD}20`,
                                color: sesion.modo === "arquitecto" ? WARM_ROSE : EMERALD
                              }}
                            >
                              +{sesion.puntos} pts
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-600">
                              {new Date(sesion.fecha).toLocaleDateString()}
                            </span>
                            <ChevronDown 
                              size={14} 
                              className={`text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} 
                            />
                          </div>
                        </div>
                        
                        {privacyMode ? (
                          <p className="text-xs text-slate-600">••••••••••••••••••••</p>
                        ) : (
                          <div className="text-xs text-slate-400">
                            {sesion.modo === "arquitecto" ? (
                              <p className={isExpanded ? "" : "line-clamp-2"}>
                                {(sesion.contenido as any).registro_carga
                                  || (sesion.contenido as any).afloramiento
                                  || (sesion.contenido as any).comparativa
                                  || (sesion.contenido as any).percibo
                                  || (sesion.contenido as any).transformo
                                  || (sesion.tipo_sesion === "ducha_mental" ? "Ducha Mental guardada" : "Sesión sin texto")}
                              </p>
                            ) : (
                              <p className={isExpanded ? "" : "line-clamp-1"}>
                                {sesion.contenido.fragmentos?.[0]}
                              </p>
                            )}
                            {sesion.tipo_sesion === "ducha_mental" && (
                              <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN_NEON, backgroundColor: `${CYAN_NEON}12`, border: `1px solid ${CYAN_NEON}30`, fontFamily: "monospace" }}>
                                DUCHA MENTAL
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <AnimatePresence>
                        {isExpanded && sesion.modo === "arquitecto" && !privacyMode && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/10"
                          >
                            <div className="p-4 space-y-3">
                              {(sesion.contenido as any).preparacion && (
                                <div className="p-3 rounded-xl" style={{ backgroundColor: `${WARM_ROSE}10` }}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Wind size={12} style={{ color: WARM_ROSE }} />
                                    <span className="text-[10px] font-bold" style={{ color: WARM_ROSE }}>
                                      CONTEXTO PREVIO
                                    </span>
                                  </div>
                                  <p className="text-xs text-white/80">{(sesion.contenido as any).preparacion}</p>
                                </div>
                              )}
                              {EJES.map(eje => {
                                const Icon = eje.icon;
                                const contenido = sesion.contenido[eje.id as keyof typeof sesion.contenido];
                                if (!contenido) return null;
                                return (
                                  <div 
                                    key={eje.id}
                                    className="p-3 rounded-xl"
                                    style={{ backgroundColor: `${eje.color}10` }}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <Icon size={12} style={{ color: eje.color }} />
                                      <span className="text-[10px] font-bold" style={{ color: eje.color }}>
                                        {eje.label} — {eje.subtitle}
                                      </span>
                                    </div>
                                    <p className="text-xs text-white/80">{contenido}</p>
                                  </div>
                                );
                              })}
                              
                              {sesion.mapaVoltaje && (
                                <div className="p-3 rounded-xl" style={{ backgroundColor: `${WARM_ROSE}10`, border: `1px solid ${WARM_ROSE}20` }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 size={12} style={{ color: WARM_ROSE }} />
                                    <span className="text-[10px] font-bold" style={{ color: WARM_ROSE }}>
                                      MAPA DE VOLTAJE — {sesion.mapaVoltaje.voltaje_total}%
                                    </span>
                                    <span className="text-[10px] ml-auto" style={{ color: WARM_ROSE }}>
                                      {sesion.mapaVoltaje.frecuencia_dominante}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-white/60">{sesion.mapaVoltaje.diagnostico}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSovereigntyPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.98)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
                boxShadow: [
                  `0 0 30px ${GOLD}30, inset 0 0 40px ${GOLD}04`,
                  `0 0 60px ${GOLD}60, inset 0 0 40px ${GOLD}08`,
                  `0 0 30px ${GOLD}30, inset 0 0 40px ${GOLD}04`
                ]
              }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-full max-w-md p-8 rounded-2xl"
              style={{ 
                backgroundColor: "#050505",
                border: `1px solid ${GOLD}`,
              }}
            >
              <motion.div
                animate={{ 
                  boxShadow: [`0 0 0px ${GOLD}00`, `0 0 20px ${GOLD}50`, `0 0 0px ${GOLD}00`]
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="text-center mb-6"
              >
                <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: `${GOLD}60`, fontFamily: "monospace" }}>
                  ▸ SISTEMICAR // PROTOCOLO DE ACCESO
                </p>
                <h2 className="text-3xl font-black text-white" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em" }}>
                  Contrato de
                </h2>
                <h2 className="text-3xl font-black" style={{ color: GOLD, fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em" }}>
                  Ingeniería
                </h2>
              </motion.div>

              <div className="space-y-3 mb-8">
                {[
                  "Tu lenguaje deja de ser opinión y se convierte en Datos de Ingeniería.",
                  "No recibirás validación emocional — recibirás diagnóstico de precisión.",
                  "El Doctor IA puede detectar Oxidación en tu sistema. Eso también es información.",
                  "La verdad tiene un costo. La ilusión tiene uno mayor."
                ].map((clause, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i + 0.3 }}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: `${GOLD}06`, border: `1px solid ${GOLD}15` }}
                  >
                    <span className="text-xs font-black mt-0.5 flex-shrink-0" style={{ color: `${GOLD}70`, fontFamily: "monospace" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "monospace" }}>
                      {clause}
                    </p>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={acceptSovereignty}
                animate={{ 
                  boxShadow: [
                    `0 0 10px ${GOLD}30`,
                    `0 0 30px ${GOLD}60`,
                    `0 0 10px ${GOLD}30`
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-full py-4 rounded-xl font-black text-center uppercase tracking-widest text-sm"
                style={{ 
                  backgroundColor: GOLD,
                  color: "#000",
                  fontFamily: "monospace"
                }}
                data-testid="btn-acepto-mando"
              >
                FIRMAR CONTRATO Y ACTIVAR EL ESPEJO
              </motion.button>

              <button
                onClick={() => { setShowSovereigntyPopup(false); }}
                className="w-full py-3 mt-3 text-xs text-slate-600 hover:text-slate-400 transition-colors"
                style={{ fontFamily: "monospace" }}
                data-testid="btn-cancelar-soberania"
              >
                no estoy listo
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaywall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md max-h-[85vh] overflow-y-auto p-6 rounded-2xl"
              style={{ 
                backgroundColor: "#0a0a0a",
                border: `2px solid ${WARM_ROSE}`,
                boxShadow: `0 0 60px ${WARM_ROSE}30`
              }}
            >
              <div className="text-center">
                <div 
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${WARM_ROSE} 0%, ${GOLD} 100%)` }}
                >
                  <Heart size={32} className="text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">
                  EL CORAZÓN SABIO™
                </h3>
                
                <p className="text-sm text-slate-400 mb-6">
                  Incluye 10 Créditos de Claridad para validación del Doctor IA,
                  guía por los 4 Pasos del Corazón y Mapa de Voltaje personalizado.
                </p>
                
                <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: `${WARM_ROSE}10`, border: `1px solid ${WARM_ROSE}30` }}>
                  <div className="text-3xl font-black mb-1" style={{ color: WARM_ROSE }}>$17</div>
                  <p className="text-[10px] text-slate-500">Pago único · 10 créditos · ~2 diagnósticos completos</p>
                </div>

                <div className="space-y-2 text-left mb-6">
                  {[
                    "EJE I — Ducha Mental (gratis, sin créditos)",
                    "EJE II — Código diagnóstico + interfaz M01–M10 (1 crédito)",
                    "EJE III — Protocolo de calibración de 24h (4 créditos)",
                    "Detección automática de bucles saboteadores",
                    "10 créditos incluidos · ~2 diagnósticos completos",
                    `+${FIXED_POINTS} PS por sesión completa`
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle size={14} style={{ color: WARM_ROSE }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <a
                  href={MERCADOPAGO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-4 rounded-xl font-bold text-center"
                  style={{ background: `linear-gradient(135deg, ${WARM_ROSE} 0%, ${GOLD} 100%)`, color: "#fff" }}
                >
                  Obtener Acceso
                </a>

                <Link
                  href="/pagos?plan=corazon-sabio"
                  data-testid="btn-actualizar-datos-pago"
                  className="block w-full py-3 mt-3 rounded-xl font-semibold text-sm border text-center transition-all hover:bg-white/5"
                  style={{ borderColor: `${WARM_ROSE}50`, color: WARM_ROSE }}
                >
                  Actualizar datos de pago · El Corazón Sabio™ ($17)
                </Link>

                <div className="mt-4 p-3 rounded-xl text-center" style={{ backgroundColor: "rgba(96, 40, 143, 0.1)", border: "1px solid rgba(96, 40, 143, 0.3)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#60288F" }}>O paga con Yape</p>
                  <img src={yapeQrImage} alt="QR Yape" className="w-40 h-40 mx-auto rounded-lg mb-2" />
                  <p className="text-xs text-slate-400">N° 918260514</p>
                  <p className="text-[10px] text-slate-500">Gilson Arevalo Pezo</p>
                </div>
                
                <button
                  onClick={() => setShowPaywall(false)}
                  className="w-full py-3 mt-3 text-sm text-slate-500 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm p-6 rounded-2xl text-center"
              style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <LogIn size={40} className="mx-auto mb-4 text-white" />
              <h3 className="text-lg font-bold text-white mb-2">Inicia sesión</h3>
              <p className="text-sm text-slate-400 mb-6">Para guardar tus sesiones y puntos</p>
              <button
                onClick={handleLogin}
                className="w-full py-3 rounded-xl font-bold bg-white text-black mb-3"
                data-testid="btn-login-espejo"
              >
                Iniciar con Google
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-sm text-slate-500 hover:text-white"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDatosGate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm p-6 rounded-2xl text-center"
              style={{ backgroundColor: "#0a0a0a", border: `1px solid ${GOLD}40` }}
            >
              <Shield size={40} className="mx-auto mb-4" style={{ color: GOLD }} />
              <h3 className="text-lg font-bold text-white mb-2">Registro de Acceso</h3>
              <p className="text-sm text-slate-400 mb-2">
                Para usar el Espejo necesitas registrar tus datos de contacto.
              </p>
              <p className="text-xs text-slate-600 mb-6">
                Esto nos permite hacer seguimiento de tu proceso y brindarte soporte personalizado.
              </p>
              <button
                onClick={() => {
                  setShowDatosGate(false);
                  navigate("/umbral-leads?retorno=espejo");
                }}
                className="w-full py-3 rounded-xl font-bold mb-3 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: GOLD, color: "#050505" }}
                data-testid="btn-registrar-datos-espejo"
              >
                Registrar mis datos
              </button>
              <button
                onClick={() => setShowDatosGate(false)}
                className="text-sm text-slate-500 hover:text-white"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContextoSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.95)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl"
              style={{ backgroundColor: "#0a0a0a", border: `1px solid ${WARM_ROSE}40` }}
            >
              <div className="text-center mb-6">
                <Heart size={28} className="mx-auto mb-3" style={{ color: WARM_ROSE }} />
                <h3 className="text-lg font-bold text-white mb-1">¿Qué área de tu vida necesita atención?</h3>
                <p className="text-xs text-slate-500">Selecciona el contexto para el Corazón Sabio</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {CONTEXTOS.map(ctx => {
                  const Icon = ctx.icon;
                  const isSelected = selectedContexto === ctx.id;
                  return (
                    <button
                      key={ctx.id}
                      onClick={() => setSelectedContexto(ctx.id)}
                      className="p-4 rounded-xl text-center transition-all"
                      style={{
                        backgroundColor: isSelected ? `${ctx.color}20` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isSelected ? ctx.color : "rgba(255,255,255,0.1)"}`,
                        transform: isSelected ? "scale(1.05)" : "scale(1)"
                      }}
                      data-testid={`btn-contexto-${ctx.id}`}
                    >
                      <Icon size={24} className="mx-auto mb-2" style={{ color: isSelected ? ctx.color : "#666" }} />
                      <span className="text-xs font-bold" style={{ color: isSelected ? ctx.color : "#999" }}>
                        {ctx.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  const ctx = selectedContexto || "trabajo";
                  setSelectedContexto(ctx);
                  void confirmContextoAndStart(ctx);
                }}
                className="w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${WARM_ROSE} 0%, ${GOLD} 100%)`, color: "#fff" }}
                data-testid="btn-confirmar-contexto"
              >
                <Heart size={16} />
                Entrar a escribir — Ducha Mental
              </button>
              
              <button
                onClick={() => setShowContextoSelector(false)}
                className="w-full py-3 mt-2 text-sm text-slate-500 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAfiliacionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.97)" }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto p-8 rounded-2xl text-center"
              style={{ 
                backgroundColor: `${GOLD}05`,
                border: `2px solid ${GOLD}`,
                boxShadow: `0 0 120px ${GOLD}40, inset 0 0 60px ${GOLD}08`
              }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.3 }}
                className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${WARM_ROSE} 100%)`, boxShadow: `0 0 80px ${GOLD}50` }}
              >
                <Crown size={40} className="text-white" />
              </motion.div>
              
              <h2 className="text-xl font-black mb-2" style={{ color: GOLD }}>SOCIO SOBERANO</h2>
              <p className="text-sm mb-1" style={{ color: GOLD }}>Convicción 4/4 · {userSovereigntyPoints + FIXED_POINTS}+ PS</p>

              <div className="p-4 rounded-xl mb-4 text-left" style={{ backgroundColor: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${GOLD}20` }}>
                    <Brain size={16} style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: GOLD, fontFamily: "monospace" }}>
                      DOCTOR_IA // VEREDICTO
                    </p>
                    <p className="text-xs text-white/90 leading-relaxed" style={{ fontFamily: "monospace" }}>
                      Soberano, has comprobado la eficacia técnica de SISTEMICAR 4 veces. Tu sistema ya no es un experimento; es una estructura estable. Estás listo para el siguiente nivel: La Expansión. Se ha habilitado tu enlace de Socio Soberano (30% de retorno).
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: `${GOLD}10`, border: `1px solid ${GOLD}30` }}>
                <p className="text-[10px] font-bold mb-2" style={{ color: GOLD }}>PANEL DE REFERIDOS ACTIVADO</p>
                <p className="text-xs text-white/80 leading-relaxed mb-3">
                  Como Socio Soberano, obtienes un 30% de retorno por cada usuario que entre al sistema a través de tu enlace personal.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: `${EMERALD}15`, border: `1px solid ${EMERALD}40` }}>
                    <span className="text-xs font-bold" style={{ color: EMERALD }}>30% de retorno</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setShowAfiliacionModal(false);
                  navigate("/socios");
                }}
                className="w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${WARM_ROSE} 100%)`, color: "#fff" }}
                data-testid="btn-cerrar-afiliacion"
              >
                <Crown size={16} />
                Ver Panel de Referidos
              </button>
              <button
                onClick={() => setShowAfiliacionModal(false)}
                className="w-full py-3 mt-2 text-sm text-slate-500 hover:text-white transition-colors"
                data-testid="btn-dismiss-afiliacion"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Modal 5-Day Protocol Editor */}
        {show5DayModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShow5DayModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ backgroundColor: "#0A0A0A", border: `1px solid ${GOLD}50`, boxShadow: `0 0 60px ${GOLD}15` }}
            >
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${GOLD}20`, backgroundColor: `${GOLD}08` }}>
                <div className="flex items-center gap-2">
                  <Layers size={13} style={{ color: GOLD }} />
                  <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: GOLD, fontFamily: "monospace" }}>PROTOCOLO_5_DÍAS</span>
                </div>
                <button onClick={() => setShow5DayModal(false)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X size={12} />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
                  Edita el título y la hora de cada día antes de activar el protocolo en tu Planificación.
                </p>

                {plan5Dias.map((day, i) => (
                  <div key={day.dayNum} className="flex items-start gap-2">
                    <div className="w-5 h-5 mt-0.5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-black" style={{ backgroundColor: `${GOLD}20`, color: GOLD, fontFamily: "monospace" }}>
                      {day.dayNum}
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        value={day.titulo}
                        onChange={e => setPlan5Dias(prev => prev.map((d, j) => j === i ? { ...d, titulo: e.target.value } : d))}
                        placeholder={`Acción del Día ${day.dayNum}`}
                        className="w-full bg-transparent text-[10px] px-2 py-1 rounded-lg outline-none"
                        style={{ border: `1px solid ${GOLD}25`, color: "rgba(255,255,255,0.8)", fontFamily: "monospace" }}
                      />
                      <input
                        value={day.hora}
                        onChange={e => setPlan5Dias(prev => prev.map((d, j) => j === i ? { ...d, hora: e.target.value } : d))}
                        placeholder="HH:MM"
                        className="w-full bg-transparent text-[10px] px-2 py-1 rounded-lg outline-none"
                        style={{ border: `1px solid ${GOLD}15`, color: GOLD, fontFamily: "monospace", width: "80px" }}
                        type="time"
                      />
                    </div>
                  </div>
                ))}

                {/* Seduction message */}
                <div className="p-2.5 rounded-lg mt-1" style={{ border: `1px dashed ${GOLD}30`, backgroundColor: `${GOLD}06` }}>
                  <p className="text-[9px] leading-relaxed" style={{ color: `${GOLD}AA`, fontFamily: "monospace" }}>
                    Con <strong style={{ color: GOLD }}>Arquitecto</strong>, el Doctor IA monitorea tu cumplimiento, detecta sabotajes y recalibra el protocolo automáticamente. Sin él, el sistema confía en tu disciplina.
                  </p>
                </div>

                <button
                  onClick={handleActivarProtocolo5Dias}
                  disabled={protocolo5DiasLoading}
                  className="w-full py-3 rounded-xl text-[11px] font-black tracking-widest uppercase transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: GOLD, color: "#000", fontFamily: "monospace" }}
                  data-testid="btn-confirmar-protocolo-5dias"
                >
                  {protocolo5DiasLoading ? (
                    <><Clock size={12} className="animate-spin" />ACTIVANDO...</>
                  ) : (
                    <><CheckCircle size={12} />CONFIRMAR Y ACTIVAR</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showPacienteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) setShowPacienteModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ background: "#111", border: `1px solid rgba(212,175,55,0.3)`, borderRadius: 12, padding: 24, width: "100%", maxWidth: 420, maxHeight: "80vh", overflowY: "auto" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ color: GOLD, fontSize: 14, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.08em", margin: 0 }}>
                  SELECCIONAR PACIENTE
                </h3>
                <button onClick={() => setShowPacienteModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
                  <X size={16} />
                </button>
              </div>
              {pacientesLista.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "monospace", fontSize: 13, marginBottom: 16 }}>No hay pacientes registrados.</p>
                  <button
                    onClick={() => { setShowPacienteModal(false); window.location.href = "/espejo/expedientes"; }}
                    style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 7, padding: "10px 18px", color: GOLD, cursor: "pointer", fontFamily: "monospace", fontSize: 12 }}
                  >
                    Ir a Expedientes → Crear Paciente
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    onClick={() => { setSelectedPacienteId(null); setShowPacienteModal(false); }}
                    style={{
                      padding: "10px 14px", background: !selectedPacienteId ? "rgba(255,255,255,0.06)" : "none",
                      border: `1px solid ${!selectedPacienteId ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 8, color: "rgba(255,255,255,0.5)", cursor: "pointer",
                      fontFamily: "monospace", fontSize: 12, textAlign: "left"
                    }}
                    data-testid="btn-paciente-ninguno"
                  >
                    — Sin paciente (sesión general)
                  </button>
                  {pacientesLista.map(pac => (
                    <button
                      key={pac.id}
                      onClick={() => { setSelectedPacienteId(pac.id); setShowPacienteModal(false); }}
                      data-testid={`btn-select-paciente-${pac.id}`}
                      style={{
                        padding: "12px 14px", textAlign: "left",
                        background: selectedPacienteId === pac.id ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${selectedPacienteId === pac.id ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.07)"}`,
                        borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12
                      }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: GOLD, fontSize: 13, fontWeight: 700 }}>{pac.nombre.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>{pac.nombre}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                          {pac.nivelMadurez && (
                            <span style={{ fontSize: 10, color: CYAN_NEON, background: "rgba(0,255,195,0.08)", border: "1px solid rgba(0,255,195,0.15)", borderRadius: 3, padding: "1px 5px" }}>{pac.nivelMadurez}</span>
                          )}
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{pac.sesionesCount || 0} ses.</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {showNivelUpdateModal && nivelUpdateSugerido && selectedPacienteId && (() => {
          const pac = pacientesLista.find(p => p.id === selectedPacienteId);
          return pac ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 210, padding: 20 }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ background: "#111", border: "1px solid rgba(255,49,49,0.3)", borderRadius: 12, padding: 24, width: "100%", maxWidth: 380, textAlign: "center" }}
              >
                <Brain size={28} color={GOLD} style={{ margin: "0 auto 14px" }} />
                <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "monospace", marginBottom: 10 }}>
                  ¿Actualizar código del paciente?
                </h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "monospace", lineHeight: 1.6, marginBottom: 6 }}>
                  El diagnóstico detectó:
                </p>
                <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8, padding: "10px 16px", marginBottom: 8 }}>
                  <span style={{ color: GOLD, fontSize: 20, fontWeight: 700, letterSpacing: "0.1em" }}>{nivelUpdateSugerido}</span>
                </div>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "monospace", marginBottom: 20 }}>
                  Paciente: <span style={{ color: "#fff" }}>{pac.nombre}</span>
                  {pac.nivelMadurez && <> · Nivel actual: <span style={{ color: CYAN_NEON }}>{pac.nivelMadurez}</span></>}
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setShowNivelUpdateModal(false)}
                    style={{ flex: 1, padding: "10px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "monospace", fontSize: 12 }}
                    data-testid="btn-no-actualizar-nivel"
                  >
                    Mantener
                  </button>
                  <button
                    onClick={async () => {
                      if (!user) return;
                      await updatePaciente(user.uid, selectedPacienteId, {
                        nivelMadurez: nivelUpdateSugerido,
                        codigoActual: nivelUpdateSugerido.match(/^(C\d+)/)?.[1]
                      });
                      setShowNivelUpdateModal(false);
                      toast.success(`Nivel actualizado: ${nivelUpdateSugerido}`, {
                        style: { background: "#0A0A0A", border: `1px solid ${GOLD}`, color: GOLD }
                      });
                    }}
                    data-testid="btn-confirmar-actualizar-nivel"
                    style={{
                      flex: 2, padding: "10px",
                      background: `linear-gradient(135deg, ${GOLD}, #b8962e)`,
                      border: "none", borderRadius: 7,
                      color: "#0A0A0A", cursor: "pointer",
                      fontFamily: "monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em"
                    }}
                  >
                    ACTUALIZAR NIVEL
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null;
        })()}
      </AnimatePresence>
    </div>
  );
}
