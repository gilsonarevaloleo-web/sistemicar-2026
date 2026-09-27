import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { 
  Mail,
  ArrowRight,
  Lock,
  Crown,
  Zap,
  Eye,
  Database,
  Sparkles,
  Target,
  Rocket,
  Radio,
  Clock,
  CheckCircle,
  X,
  Flame,
  Swords,
  Briefcase,
  Loader2,
  LogIn,
  type LucideIcon
} from "lucide-react";
import { toast } from "sonner";
import { signInWithGoogle, isFirebaseConfigured } from "@/lib/firebase";
import { useAuthContext } from "@/App";
import { clearMigrationPending } from "@/lib/persistence";
import { sendWelcomeEmail } from "@/lib/emailApi";

const ELECTRIC_BLUE = "#3b82f6";
const GOLD = "#D4AF37";
const DARK_BG = "#050505";

type PasoActual = 1 | 2 | 3;

interface ClasificacionIA {
  categoria: string;
  multiplicador: number;
  terminoValor: string;
  terminoLibertad: string;
}

const getPlanesConfig = (multiplicador: number, terminoValor: string, esAltoCapital: boolean) => {
  return [
    {
      id: "iniciado",
      nombre: esAltoCapital ? "OPERADOR BASE" : "INICIADO",
      precio: Math.round(9.99 * multiplicador * 100) / 100,
      color: ELECTRIC_BLUE,
      descripcion: esAltoCapital 
        ? "Construye tu disciplina de mercado"
        : "Inicia tu camino de soberanía mental",
      terminoValor,
      modulos: [
        { nombre: "Espejo", icon: Eye, desbloqueado: true, descripcion: "Vaciado mental diario" },
        { nombre: "Depósito", icon: Database, desbloqueado: true, descripcion: "Auditoría de capital mental" },
        { nombre: "Alquimia", icon: Sparkles, desbloqueado: true, descripcion: "Transmutación de experiencias" },
        { nombre: "Umbral", icon: Target, desbloqueado: false, descripcion: "Expansión de límites" },
        { nombre: "Planificación", icon: Clock, desbloqueado: false, descripcion: "Misiones estructuradas" },
        { nombre: "Radar IA", icon: Radio, desbloqueado: false, descripcion: "Diagnóstico inteligente" },
        { nombre: "Proyector", icon: Rocket, desbloqueado: false, descripcion: "Arquitectura de realidad" }
      ],
      beneficios: [
        "Historial de 30 días",
        "1 Meditación guiada",
        "Puntos de Soberanía básicos",
        "Soporte por email"
      ]
    },
    {
      id: "arquitecto",
      nombre: esAltoCapital ? "ARQUITECTO DE MERCADOS" : "ARQUITECTO",
      precio: Math.round(24.99 * multiplicador * 100) / 100,
      color: "#8b5cf6",
      descripcion: esAltoCapital 
        ? "Diseña tu estrategia con precisión"
        : "Escala tu negocio con sistema",
      terminoValor,
      destacado: true,
      modulos: [
        { nombre: "Espejo", icon: Eye, desbloqueado: true, descripcion: "Vaciado mental diario" },
        { nombre: "Depósito", icon: Database, desbloqueado: true, descripcion: "Auditoría de capital mental" },
        { nombre: "Alquimia", icon: Sparkles, desbloqueado: true, descripcion: "Transmutación de experiencias" },
        { nombre: "Umbral", icon: Target, desbloqueado: true, descripcion: "Expansión de límites" },
        { nombre: "Planificación", icon: Clock, desbloqueado: true, descripcion: "Misiones estructuradas" },
        { nombre: "Radar IA", icon: Radio, desbloqueado: true, descripcion: "Diagnóstico inteligente" },
        { nombre: "Proyector", icon: Rocket, desbloqueado: false, descripcion: "Arquitectura de realidad" }
      ],
      beneficios: [
        "Historial ilimitado",
        "5 Meditaciones guiadas",
        "Radar IA con análisis profundo",
        "Soporte prioritario",
        "Comunidad privada"
      ]
    },
    {
      id: "soberano",
      nombre: esAltoCapital ? "SOBERANO QUANT" : "SOBERANO",
      precio: Math.round(49.99 * multiplicador * 100) / 100,
      color: GOLD,
      descripcion: esAltoCapital 
        ? "Dominio total del capital y la mente"
        : "Libertad absoluta y mentoría directa",
      terminoValor,
      modulos: [
        { nombre: "Espejo", icon: Eye, desbloqueado: true, descripcion: "Vaciado mental diario" },
        { nombre: "Depósito", icon: Database, desbloqueado: true, descripcion: "Auditoría de capital mental" },
        { nombre: "Alquimia", icon: Sparkles, desbloqueado: true, descripcion: "Transmutación de experiencias" },
        { nombre: "Umbral", icon: Target, desbloqueado: true, descripcion: "Expansión de límites" },
        { nombre: "Planificación", icon: Clock, desbloqueado: true, descripcion: "Misiones estructuradas" },
        { nombre: "Radar IA", icon: Radio, desbloqueado: true, descripcion: "Diagnóstico inteligente" },
        { nombre: "Proyector", icon: Rocket, desbloqueado: true, descripcion: "Arquitectura de realidad" }
      ],
      beneficios: [
        "Acceso completo a todos los módulos",
        "Meditaciones ilimitadas",
        "Mentoría grupal mensual",
        "Sistema de Alianzas 30%",
        "Acceso anticipado a features",
        "Soporte VIP WhatsApp"
      ]
    }
  ];
};

export default function EmbudoSistemicar() {
  const [, navigate] = useLocation();
  const { user } = useAuthContext();
  const [pasoActual, setPasoActual] = useState<PasoActual>(1);
  const [profesion, setProfesion] = useState("");
  const [email, setEmail] = useState("");
  const [clasificando, setClasificando] = useState(false);
  const [clasificacion, setClasificacion] = useState<ClasificacionIA | null>(null);
  const [mostrarRetoModal, setMostrarRetoModal] = useState(false);
  const [leadGuardado, setLeadGuardado] = useState(false);
  const [navegandoAPagos, setNavegandoAPagos] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const intentoSalirRef = useRef(false);

  useEffect(() => {
    if (user) {
      navigate("/menu");
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured()) {
      toast.error("Firebase no está configurado");
      return;
    }
    setGoogleLoading(true);
    try {
      clearMigrationPending();
      localStorage.setItem("sistemicar_google_redirect_pending", "true");
      const result = await signInWithGoogle();
      // Con popup: hay UserCredential. Con redirect: la página va a Google y al volver getRedirectResult() en useAuth.
      localStorage.removeItem("sistemicar_google_redirect_pending");
      if (!result?.user) {
        toast.info("Redirigiendo a Google…", { duration: 4000 });
        return;
      }

      // Verificar si es nuevo usuario y enviar correo de bienvenida
      const isNewUser = result?.user?.metadata?.creationTime === result?.user?.metadata?.lastSignInTime;
      if (isNewUser && result?.user?.email) {
        sendWelcomeEmail(result.user.email, result.user.displayName || undefined);
        toast.success("¡Bienvenido al Umbral! Revisa tu correo.");
      } else {
        toast.success("¡Bienvenido de vuelta!");
      }
      navigate("/menu");
    } catch (error: any) {
      console.error("Google login error:", error);
      localStorage.removeItem("sistemicar_google_redirect_pending");
      if (error.code === "auth/popup-closed-by-user") {
        toast.info("Inicio de sesión cancelado");
      } else {
        toast.error("Error al iniciar sesión con Google");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pasoActual === 2 && !intentoSalirRef.current && email && !navegandoAPagos) {
        intentoSalirRef.current = true;
        setMostrarRetoModal(true);
        guardarLead(3, false);
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pasoActual, email, navegandoAPagos]);

  const guardarLead = async (abandonoEnPaso: number, retoAceptado: boolean, planSeleccionado?: string) => {
    if (leadGuardado && !planSeleccionado) return;
    
    try {
      await fetch("/api/embudo/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          profesion,
          categoriaPrecios: clasificacion?.categoria || "base",
          multiplicador: clasificacion?.multiplicador || 1.0,
          planSeleccionado: planSeleccionado || null,
          retoAceptado,
          abandonoEnPaso
        })
      });
      setLeadGuardado(true);
      const { trackJornadaLead } = await import("@/lib/metaPixel");
      trackJornadaLead(planSeleccionado || "embudo");
    } catch (error) {
      console.error("Error guardando lead:", error);
    }
  };

  const clasificarProfesion = async () => {
    if (!profesion.trim() || !email.includes("@")) {
      toast.error("Completa tu profesión y email válido");
      return;
    }

    setClasificando(true);
    
    try {
      const response = await fetch("/api/embudo/clasificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profesion })
      });
      
      const data = await response.json();
      setClasificacion(data);
      
      await guardarLead(1, false);
      
      setTimeout(() => {
        setPasoActual(2);
        setClasificando(false);
      }, 800);
      
    } catch (error) {
      console.error("Error clasificando:", error);
      setClasificacion({
        categoria: "base",
        multiplicador: 1.0,
        terminoValor: "Crecimiento Personal",
        terminoLibertad: "Libertad Financiera"
      });
      setPasoActual(2);
      setClasificando(false);
    }
  };

  const handlePlanClick = async (planId: string) => {
    setNavegandoAPagos(true);
    await guardarLead(0, false, planId);
    toast.success(`Plan ${planId.toUpperCase()} seleccionado. Redirigiendo a pago...`);
    window.location.href = "/pagos";
  };

  const handleRetoAceptado = async () => {
    await guardarLead(0, true);
    setMostrarRetoModal(false);
    toast.success("¡RETO ACEPTADO! Tienes 3 días para demostrar tu disciplina.");
  };

  const esAltoCapital = clasificacion?.categoria === "alto_capital";
  const planes = getPlanesConfig(
    clasificacion?.multiplicador || 1.0,
    clasificacion?.terminoValor || "Crecimiento Personal",
    esAltoCapital
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: DARK_BG }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {pasoActual === 1 && (
            <motion.div
              key="paso1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="min-h-[80vh] flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="text-center mb-10"
              >
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Zap style={{ color: ELECTRIC_BLUE }} size={32} />
                  <h1 className="text-3xl md:text-4xl font-black italic uppercase text-white">
                    SISTEMICAR
                  </h1>
                  <Zap style={{ color: GOLD }} size={32} />
                </div>
                <p className="text-lg text-slate-400 mb-2">
                  Centro de Comando Mental
                </p>
                <p className="text-sm text-slate-500">
                  Personaliza tu experiencia según tu profesión
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-md"
              >
                <div 
                  className="p-6 rounded-2xl border"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)", borderColor: `${ELECTRIC_BLUE}30` }}
                >
                  <p className="text-center text-xs text-slate-500 uppercase tracking-widest mb-6">
                    Cuéntanos sobre ti
                  </p>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <Briefcase 
                        size={18} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" 
                      />
                      <input
                        type="text"
                        value={profesion}
                        onChange={(e) => setProfesion(e.target.value)}
                        placeholder="¿Cuál es tu profesión o negocio?"
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                        data-testid="input-profesion"
                      />
                    </div>
                    
                    <div className="relative">
                      <Mail 
                        size={18} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" 
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && clasificarProfesion()}
                        placeholder="Tu mejor email"
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                        data-testid="input-email-embudo"
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={clasificarProfesion}
                      disabled={clasificando}
                      className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      style={{ backgroundColor: ELECTRIC_BLUE }}
                      data-testid="btn-continuar"
                    >
                      {clasificando ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Analizando tu perfil...
                        </>
                      ) : (
                        <>
                          Ver Mi Plan Personalizado
                          <ArrowRight size={18} />
                        </>
                      )}
                    </motion.button>
                  </div>

                  <p className="text-center text-[10px] text-slate-600 mt-4">
                    Tus datos están protegidos. Usamos IA para personalizar tu experiencia.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-center"
              >
                <p className="text-[10px] text-slate-600 mb-6">
                  Nuestra IA analiza tu profesión para ofrecerte el plan más adecuado
                </p>
                
                {/* Botón de inicio de sesión para usuarios existentes */}
                <div className="pt-4 border-t border-white/10 max-w-md mx-auto">
                  <p className="text-[10px] text-slate-500 text-center mb-3">¿Ya tienes cuenta?</p>
                  <button
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all hover:bg-white/10"
                    style={{ 
                      backgroundColor: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.15)"
                    }}
                    data-testid="button-google-existing-embudo"
                  >
                    {googleLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <LogIn size={16} />
                    )}
                    {googleLoading ? "Conectando..." : "Iniciar sesión con Google"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {pasoActual === 2 && (
            <motion.div
              key="paso2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-8"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                  style={{ backgroundColor: esAltoCapital ? `${GOLD}20` : `${ELECTRIC_BLUE}20` }}
                >
                  <span className="text-xs font-medium" style={{ color: esAltoCapital ? GOLD : ELECTRIC_BLUE }}>
                    {profesion}
                  </span>
                  {esAltoCapital && (
                    <Crown size={14} style={{ color: GOLD }} />
                  )}
                </motion.div>
                
                <h2 className="text-2xl md:text-3xl font-black italic uppercase text-white mb-2">
                  TU PLAN PERSONALIZADO
                </h2>
                <p className="text-slate-400">
                  Basado en: <span className="font-bold text-white">{clasificacion?.terminoValor}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Meta: {clasificacion?.terminoLibertad}
                </p>
                
                {esAltoCapital && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs mt-3 px-3 py-1 rounded-full inline-block"
                    style={{ backgroundColor: `${GOLD}15`, color: GOLD }}
                  >
                    Pricing de Alto Capital detectado (+40%)
                  </motion.p>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {planes.map((plan, idx) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.15 }}
                    className={`relative rounded-3xl overflow-hidden ${
                      plan.id === "soberano" ? "md:scale-105" : ""
                    }`}
                    style={{
                      background: plan.id === "soberano" 
                        ? `linear-gradient(135deg, ${GOLD}15 0%, rgba(0,0,0,0.9) 50%, ${GOLD}10 100%)`
                        : "rgba(255,255,255,0.02)",
                      border: `2px solid ${plan.color}${plan.id === "soberano" ? "" : "40"}`,
                      boxShadow: plan.id === "soberano" 
                        ? `0 0 40px ${GOLD}20, inset 0 1px 0 ${GOLD}30`
                        : `0 0 20px ${plan.color}10`
                    }}
                  >
                    {plan.id === "arquitecto" && (
                      <div 
                        className="absolute top-0 left-0 right-0 py-1 text-center text-[10px] font-bold uppercase tracking-widest"
                        style={{ backgroundColor: plan.color, color: "white" }}
                      >
                        Más Popular
                      </div>
                    )}
                    
                    {plan.id === "soberano" && (
                      <div 
                        className="absolute top-0 left-0 right-0 py-1 text-center text-[10px] font-bold uppercase tracking-widest"
                        style={{ backgroundColor: GOLD, color: "#000" }}
                      >
                        <Crown size={12} className="inline mr-1" />
                        Acceso Total
                      </div>
                    )}

                    <div className={`p-6 ${plan.id !== "iniciado" ? "pt-10" : ""}`}>
                      <div className="text-center mb-6">
                        <h3 
                          className="text-lg font-black italic uppercase mb-2"
                          style={{ color: plan.color }}
                        >
                          {plan.nombre}
                        </h3>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-black text-white">${plan.precio}</span>
                          <span className="text-slate-500 text-sm">/mes</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          {plan.descripcion}
                        </p>
                      </div>

                      <div className="mb-6">
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">
                          Módulos Incluidos
                        </p>
                        <div className="space-y-2">
                          {plan.modulos.map((modulo) => {
                            const ModuloIcon = modulo.icon;
                            return (
                              <div 
                                key={modulo.nombre}
                                className={`flex items-center gap-3 p-2 rounded-lg ${
                                  modulo.desbloqueado ? "bg-white/5" : "bg-zinc-900/50 opacity-50"
                                }`}
                              >
                                <div 
                                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                                  style={{ 
                                    backgroundColor: modulo.desbloqueado ? `${plan.color}20` : "transparent",
                                    border: `1px solid ${modulo.desbloqueado ? plan.color : "rgba(255,255,255,0.1)"}40`
                                  }}
                                >
                                  {modulo.desbloqueado ? (
                                    <ModuloIcon size={14} style={{ color: plan.color }} />
                                  ) : (
                                    <Lock size={12} className="text-slate-600" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className={`text-xs font-medium ${modulo.desbloqueado ? "text-white" : "text-slate-600"}`}>
                                    {modulo.nombre}
                                  </p>
                                </div>
                                {modulo.desbloqueado ? (
                                  <CheckCircle size={14} style={{ color: plan.color }} />
                                ) : (
                                  <Lock size={12} className="text-slate-700" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mb-6">
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">
                          Beneficios Extra
                        </p>
                        <ul className="space-y-2">
                          {plan.beneficios.map((beneficio, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
                              <CheckCircle size={12} style={{ color: plan.color }} />
                              {beneficio}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePlanClick(plan.id)}
                        className="w-full py-4 rounded-xl font-bold text-white transition-all"
                        style={{ 
                          background: plan.id === "soberano"
                            ? `linear-gradient(135deg, ${GOLD} 0%, #b8860b 100%)`
                            : plan.color,
                          boxShadow: `0 4px 20px ${plan.color}40`
                        }}
                        data-testid={`btn-plan-${plan.id}`}
                      >
                        {plan.id === "soberano" ? (
                          <>
                            <Crown size={16} className="inline mr-2" />
                            Activar Soberanía Total
                          </>
                        ) : (
                          <>Activar {plan.nombre}</>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setMostrarRetoModal(true)}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  ¿El precio es un obstáculo? Hay otra forma...
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mostrarRetoModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
              onClick={() => setMostrarRetoModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md rounded-3xl overflow-hidden"
                style={{ backgroundColor: "#0a0a0a", border: `2px solid ${ELECTRIC_BLUE}` }}
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="p-6 border-b"
                  style={{ borderColor: `${ELECTRIC_BLUE}30`, background: `linear-gradient(135deg, ${ELECTRIC_BLUE}10 0%, transparent 100%)` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${ELECTRIC_BLUE}20` }}
                      >
                        <Swords size={24} style={{ color: ELECTRIC_BLUE }} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black italic uppercase text-white">
                          RETO DE GUERRA
                        </h3>
                        <p className="text-xs text-slate-500">Protocolo de Iniciación</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setMostrarRetoModal(false)}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X size={18} className="text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-sm text-slate-300 mb-4">
                    Vemos que el precio es un obstáculo para tu camino como{" "}
                    <span className="font-bold text-white">{profesion}</span>.
                  </p>
                  
                  <div 
                    className="p-4 rounded-xl mb-6"
                    style={{ backgroundColor: `${ELECTRIC_BLUE}10`, border: `1px solid ${ELECTRIC_BLUE}30` }}
                  >
                    <p className="text-white font-bold mb-2">
                      Demuestra que tienes la disciplina.
                    </p>
                    <p className="text-sm text-slate-400">
                      Completa el <span className="text-white font-bold">Reto de 3 días</span> y desbloquea 
                      el acceso básico gratuito por 7 días.
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400">1</div>
                      <p className="text-sm text-slate-300">Registra tu estado de energía 3 días seguidos</p>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400">2</div>
                      <p className="text-sm text-slate-300">Completa al menos 1 reflexión diaria</p>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400">3</div>
                      <p className="text-sm text-slate-300">Acumula 50 Puntos de Soberanía</p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRetoAceptado}
                    className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: ELECTRIC_BLUE }}
                    data-testid="btn-aceptar-reto"
                  >
                    <Flame size={18} />
                    ACEPTO EL RETO
                  </motion.button>

                  <p className="text-center text-[10px] text-slate-600 mt-4">
                    Si completas el reto, tu disciplina habla más que tu billetera.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
