import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Moon, 
  Zap, 
  Target, 
  Sparkles, 
  Shield,
  ChevronRight,
  X
} from "lucide-react";
import { useLocation } from "wouter";
import { generarResumenDiario, ResumenDiarioResult } from "@/lib/gemini";
import { subscribeToEnergyLogs, subscribeToHopeLogs, subscribeToVehicles, subscribeToProgression, EnergyLog, HopeLog, Vehicle, UserProgression } from "@/lib/persistence";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";
const VIOLET = "#9B59B6";
const EMERALD = "#50C878";

const AREA_CONFIG = {
  deposito: { label: "DEPÓSITO", icon: Shield, color: EMERALD, route: "/deposito" },
  alquimia: { label: "ALQUIMIA", icon: Sparkles, color: GOLD, route: "/alquimia" },
  planificacion: { label: "PLANIFICACIÓN", icon: Target, color: AZURE, route: "/jornada-v4" },
  espejo: { label: "ESPEJO", icon: Zap, color: VIOLET, route: "/espejo" }
};

interface ResumenDiarioProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function ResumenDiario({ isOpen, onClose, userId }: ResumenDiarioProps) {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<ResumenDiarioResult | null>(null);
  const [progression, setProgression] = useState<UserProgression | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) return;

    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let energyLogs: EnergyLog[] = [];
    let hopeLogs: HopeLog[] = [];
    let vehicles: Vehicle[] = [];
    let cpAnterior = 0;

    const unsubProg = subscribeToProgression(userId, (prog) => {
      setProgression(prog);
      cpAnterior = prog.totalCP;
    }, () => {});

    const unsubEnergy = subscribeToEnergyLogs(userId, (logs) => {
      energyLogs = logs.filter(l => new Date(l.timestamp) >= today);
    }, () => {});

    const unsubHope = subscribeToHopeLogs(userId, (logs) => {
      hopeLogs = logs.filter(l => new Date(l.createdAt) >= today);
    }, () => {});

    const unsubVehicles = subscribeToVehicles(userId, (v) => {
      vehicles = v.filter(veh => new Date(veh.createdAt) >= today);
    }, () => {});

    setTimeout(async () => {
      const textosDelDia: { area: string; texto: string }[] = [];

      energyLogs.forEach(log => {
        textosDelDia.push({ area: "energia", texto: log.text || log.type });
      });

      hopeLogs.forEach(log => {
        textosDelDia.push({ area: "deposito", texto: log.text });
      });

      vehicles.forEach(v => {
        textosDelDia.push({ area: "planificacion", texto: v.titulo });
      });

      let cpGanadosHoy = 0;
      energyLogs.forEach(log => {
        cpGanadosHoy += log.points || 0;
      });

      const result = await generarResumenDiario(textosDelDia, cpGanadosHoy);
      setResumen(result);
      setLoading(false);
    }, 1500);

    return () => {
      unsubProg();
      unsubEnergy();
      unsubHope();
      unsubVehicles();
    };
  }, [isOpen, userId]);

  const handleNavigate = (route: string) => {
    onClose();
    navigate(route);
  };

  const totalCP = progression?.totalCP || 0;
  const sovereigntyPts = progression?.sovereigntyPoints || 0;
  const progressTo180 = Math.min((sovereigntyPts / 180) * 100, 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-b from-zinc-900 to-black rounded-3xl p-6 max-w-sm w-full border"
            style={{ borderColor: `${GOLD}40` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${GOLD}20` }}>
                  <Moon size={24} style={{ color: GOLD }} />
                </div>
                <div>
                  <h2 className="text-lg font-black" style={{ color: GOLD }}>CIERRE DE JORNADA</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Diagnóstico del Mentor</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5">
                <X size={18} className="text-zinc-500" />
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: GOLD, borderTopColor: "transparent" }}
                />
                <p className="text-sm text-zinc-400">Analizando tu jornada...</p>
              </div>
            ) : resumen ? (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} style={{ color: AZURE }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: AZURE }}>PS Ganados Hoy</span>
                  </div>
                  <p className="text-3xl font-black" style={{ color: GOLD }}>+{resumen.cpGanadosHoy} PS</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Progreso a Guerrero Fortalecido</span>
                    <span className="font-bold" style={{ color: GOLD }}>{sovereigntyPts}/180 pts</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressTo180}%` }}
                      transition={{ duration: 1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: GOLD }}
                    />
                  </div>
                  {sovereigntyPts >= 180 && (
                    <p className="text-[10px] text-green-400 text-center">Desbloqueado: Alianza 30%</p>
                  )}
                </div>

                <div className="p-4 rounded-2xl border" style={{ backgroundColor: `${VIOLET}08`, borderColor: `${VIOLET}30` }}>
                  <p className="text-sm text-zinc-300 italic leading-relaxed" style={{ fontFamily: "Georgia, serif" }}>
                    "{resumen.diagnostico}"
                  </p>
                </div>

                <div className="p-4 rounded-2xl" style={{ backgroundColor: `${AREA_CONFIG[resumen.areaRecomendada].color}10` }}>
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const Icon = AREA_CONFIG[resumen.areaRecomendada].icon;
                      return <Icon size={14} style={{ color: AREA_CONFIG[resumen.areaRecomendada].color }} />;
                    })()}
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: AREA_CONFIG[resumen.areaRecomendada].color }}>
                      Área Recomendada para Mañana
                    </span>
                  </div>
                  <p className="text-lg font-black text-white mb-3">{AREA_CONFIG[resumen.areaRecomendada].label}</p>
                  <button
                    onClick={() => handleNavigate(AREA_CONFIG[resumen.areaRecomendada].route)}
                    className="w-full py-2 rounded-full flex items-center justify-center gap-2 text-xs font-bold transition-all"
                    style={{ backgroundColor: AREA_CONFIG[resumen.areaRecomendada].color, color: "#000" }}
                  >
                    Ir Ahora
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: `${GOLD}10` }}>
                  <p className="text-xs font-bold" style={{ color: GOLD }}>
                    "{resumen.mensajeMentor}"
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-center text-zinc-500 py-8">No hay datos suficientes para el diagnóstico.</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
