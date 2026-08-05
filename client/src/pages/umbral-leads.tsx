/**
 * UMBRAL DE LEADS - Captura de Prospectos
 * 
 * Landing page obligatoria que captura Nombre, WhatsApp y Correo
 * antes de permitir acceso a cualquier contenido de la app.
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { 
  Sparkles, 
  User,
  Phone,
  Mail,
  ArrowRight,
  Shield,
  Crown,
  CheckCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { addProspecto } from "@/lib/persistence";
import logoSistemicar from "@/assets/logo-sistemicar.png";

const GOLD = "#D4AF37";
const DARK_BG = "#020202";

const BENEFICIOS = [
  "Ordena tu mente en 5 minutos diarios",
  "Sistema de Arquitectura Mental probado",
  "Acceso al Espejo de Conciencia",
  "Puntos de Soberanía y gamificación",
  "Comunidad de Guerreros Mentales"
];

export default function UmbralLeads() {
  const [, navigate] = useLocation();
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const trackingParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get("src") || "directo",
      interfaz_origen: params.get("cap") || undefined,
      retorno: params.get("retorno") || undefined,
    };
  }, []);

  const validateWhatsapp = (num: string) => {
    const cleaned = num.replace(/\D/g, "");
    return cleaned.length >= 9 && cleaned.length <= 15;
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nombre.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }
    
    if (!validateWhatsapp(whatsapp)) {
      toast.error("Ingresa un número de WhatsApp válido");
      return;
    }
    
    if (!validateEmail(correo)) {
      toast.error("Ingresa un correo electrónico válido");
      return;
    }

    setLoading(true);

    try {
      await addProspecto({
        nombre: nombre.trim(),
        whatsapp: whatsapp.replace(/\D/g, ""),
        correo: correo.trim().toLowerCase(),
        registradoEn: new Date(),
        pagoConfirmado: false,
        retoGuerreroActivo: false,
        retoGuerreroInicio: null,
        ultimaActividad: null,
        source: trackingParams.source,
        interfaz_origen: trackingParams.interfaz_origen,
      });

      localStorage.setItem("sistemicar_prospecto_email", correo.trim().toLowerCase());
      localStorage.setItem("sistemicar_prospecto_nombre", nombre.trim());
      
      toast.success("¡Registro exitoso!");
      if (trackingParams.retorno === "espejo") {
        navigate("/espejo");
      } else {
        navigate("/pagos");
      }
    } catch (error) {
      console.error("Error registrando prospecto:", error);
      toast.error("Error al registrar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !nombre.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }
    if (step === 2 && !validateWhatsapp(whatsapp)) {
      toast.error("Ingresa un número de WhatsApp válido");
      return;
    }
    setStep(prev => Math.min(prev + 1, 3));
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: DARK_BG }}>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.img 
              src={logoSistemicar} 
              alt="SISTEMICAR" 
              className="w-20 h-20 mx-auto mb-4"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.4 }}
            />
            <h1 className="text-2xl font-black text-white mb-2">
              SISTEMICAR
            </h1>
            <p className="text-slate-400 text-sm">
              Sistema de Arquitectura Mental
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-6 border"
            style={{ 
              backgroundColor: "rgba(212, 175, 55, 0.03)",
              borderColor: "rgba(212, 175, 55, 0.2)"
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Crown size={20} style={{ color: GOLD }} />
              <h2 className="text-lg font-bold text-white">
                Accede al Sistema
              </h2>
            </div>

            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className="flex-1 h-1 rounded-full transition-colors"
                  style={{
                    backgroundColor: step >= s ? GOLD : "rgba(255,255,255,0.1)"
                  }}
                />
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <label className="block text-sm text-slate-300 mb-2">
                    ¿Cuál es tu nombre?
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-[#D4AF37] focus:outline-none transition-colors"
                      autoFocus
                      data-testid="input-nombre"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full mt-4 py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: GOLD }}
                    data-testid="btn-siguiente-1"
                  >
                    Continuar <ArrowRight size={18} />
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <label className="block text-sm text-slate-300 mb-2">
                    Tu WhatsApp (para notificaciones)
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+51 999 888 777"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-[#D4AF37] focus:outline-none transition-colors"
                      autoFocus
                      data-testid="input-whatsapp"
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
                      data-testid="btn-atras-2"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex-1 py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: GOLD }}
                      data-testid="btn-siguiente-2"
                    >
                      Continuar <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <label className="block text-sm text-slate-300 mb-2">
                    Tu correo electrónico
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-[#D4AF37] focus:outline-none transition-colors"
                      autoFocus
                      data-testid="input-correo"
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
                      data-testid="btn-atras-3"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                      style={{ backgroundColor: GOLD }}
                      data-testid="btn-registrar"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Acceder al Sistema
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                <Shield size={14} />
                <span>Tu información está protegida</span>
              </div>
              <div className="space-y-2">
                {BENEFICIOS.slice(0, 3).map((beneficio, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                    <CheckCircle size={12} style={{ color: GOLD }} />
                    <span>{beneficio}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <p className="text-center text-xs text-slate-600 mt-6">
            Al registrarte aceptas nuestros{" "}
            <a href="/terminos-condiciones" className="underline hover:text-slate-400">
              Términos y Condiciones
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
