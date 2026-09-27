import { useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, CheckCircle, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { SKU_BASE } from "@shared/planificacionPricing";
import { trackPurchase } from "@/lib/metaPixel";

const GOLD = "#D4AF37";
const DARK_BG = "#050505";

export default function GraciasCompra() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = (params.get("plan") || params.get("producto") || "").trim();
    if (plan === "planificacion_base" || plan === "jornada_base") {
      trackPurchase({
        content_name: SKU_BASE.name,
        value: SKU_BASE.priceUsd,
        content_ids: [SKU_BASE.id],
      });
      return;
    }
    const value = Number(params.get("value") || params.get("amount") || 17);
    trackPurchase({
      content_name: params.get("content_name") || "SISTEMICAR",
      value: Number.isFinite(value) ? value : 17,
      content_ids: plan ? [plan] : undefined,
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: DARK_BG }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ 
            background: `linear-gradient(135deg, ${GOLD} 0%, #B8860B 100%)`,
            boxShadow: `0 0 60px ${GOLD}50`
          }}
        >
          <Crown size={48} className="text-black" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl font-black text-white mb-2">
            ¡Bienvenido, <span style={{ color: GOLD }}>Arquitecto</span>!
          </h1>
          
          <p className="text-slate-400 mb-8">
            Tu acceso al PROTOCOLO DE SOBERANÍA ESPEJO™ ha sido activado exitosamente.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl mb-8"
          style={{ 
            backgroundColor: "#0a0a0a",
            border: `1px solid ${GOLD}30`
          }}
        >
          <h3 className="font-bold text-white mb-4">Lo que acabas de desbloquear:</h3>
          
          <ul className="space-y-3 text-left">
            <li className="flex items-center gap-3">
              <CheckCircle size={18} style={{ color: GOLD }} />
              <span className="text-sm text-white">Modo Arquitecto con los 4 ejes completos</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle size={18} style={{ color: GOLD }} />
              <span className="text-sm text-white">+58 puntos de soberanía por sesión</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle size={18} style={{ color: GOLD }} />
              <span className="text-sm text-white">Historial de soberanía cifrado</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle size={18} style={{ color: GOLD }} />
              <span className="text-sm text-white">Acceso permanente de por vida</span>
            </li>
          </ul>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/espejo")}
          className="w-full py-4 rounded-xl font-bold text-center flex items-center justify-center gap-2 uppercase tracking-wider"
          style={{ 
            background: `linear-gradient(135deg, ${GOLD} 0%, #B8860B 50%, ${GOLD} 100%)`,
            color: "#000"
          }}
          data-testid="btn-ir-espejo"
        >
          Comenzar mi primera sesión
          <ArrowRight size={20} />
        </motion.button>

        <p className="text-xs text-slate-600 mt-4">
          Si tienes algún problema con tu acceso, contacta a soporte.
        </p>
      </motion.div>
    </div>
  );
}
