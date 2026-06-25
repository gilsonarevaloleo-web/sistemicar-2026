import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Moon, 
  X, 
  Target, 
  Zap, 
  BookOpen, 
  Crown,
  Loader2,
  Eye,
  MessageSquare
} from "lucide-react";
import { useAuthContext } from "@/App";
import { 
  subscribeToEnergyLogs, 
  EnergyLog,
  subscribeToAliados,
  AliadoEntry,
  subscribeToAlquimiaEntries,
  AlquimiaEntry,
  subscribeToProgression,
  UserProgression,
  subscribeToVehicles,
  Vehicle,
  subscribeToDailyPoints,
  getDailyPoints,
  SovereigntyPointsLog,
  subscribeToPlanilla,
  getLimaDayStart,
  getLimaDateString,
  Planilla,
} from "@/lib/persistence";
import BalanceConquistaPanel from "@/components/BalanceConquistaPanel";
import { calcularBalanceConquistaJornada } from "@/engines/ConcienciaEngine";
import { filterVehiclesForAnilloCoverage } from "@/lib/ghostVehicleEngine";
import { shouldMountAutoCierreJornada } from "@/lib/jornadaConsciousGuard";

const GOLD = "#D4AF37";
const PURPLE = "#A855F7";
const RED = "#EF4444";
const BLUE = "#3B82F6";
const VIOLET = "#7C3AED";

const AXIS_COLORS: Record<string, string> = {
  enfoque: PURPLE,
  conflicto: RED,
  pasos: BLUE,
  alcance: VIOLET
};

const AXIS_ICONS: Record<string, any> = {
  enfoque: Eye,
  conflicto: Zap,
  pasos: BookOpen,
  alcance: Crown
};

interface CierreData {
  reconocimiento: string;
  diagnostico: string;
  prescripcion: string;
  ejeDebil: string;
  dailyPS?: number;
  stats?: {
    energyFrequency?: Record<string, number>;
    dominantAxis?: string;
    totalLogsToday?: number;
    lastShadow?: string;
    lastOro?: string;
  };
}

export function CierreJornadaModal() {
  const { user } = useAuthContext();
  const [location] = useLocation();
  const isPlanificacion = location === "/planeacion" || location.startsWith("/planeacion?");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cierreData, setCierreData] = useState<CierreData | null>(null);
  const [energyLogs, setEnergyLogs] = useState<EnergyLog[]>([]);
  const [aliados, setAliados] = useState<AliadoEntry[]>([]);
  const [alquimias, setAlquimias] = useState<AlquimiaEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [hasClosed, setHasClosed] = useState(false);
  
  // NUEVO: Puntos del día desde el log de sovereignty points
  const [dailySovereigntyPoints, setDailySovereigntyPoints] = useState(0);
  const [dailyPointsLogs, setDailyPointsLogs] = useState<SovereigntyPointsLog[]>([]);

  // Suscribirse a los puntos del día en tiempo real
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeToDailyPoints(
      user.uid,
      (data) => {
        setDailySovereigntyPoints(data.total);
        setDailyPointsLogs(data.logs);
      },
      (error) => {
        console.error("[CierreJornada] Error obteniendo puntos:", error);
      }
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
    const unsubscribe = subscribeToAliados(
      user.uid,
      (data) => setAliados(data),
      (error) => console.error(error)
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToAlquimiaEntries(
      user.uid,
      (data) => setAlquimias(data),
      (error) => console.error(error)
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToProgression(
      user.uid,
      (data) => setProgression(data),
      (error) => console.error(error)
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToVehicles(
      user.uid,
      (data) => setVehicles(data),
      (error) => console.error(error)
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToPlanilla(
      user.uid,
      getLimaDateString(),
      (data) => setPlanilla(data),
      (error) => console.error(error)
    );
    return unsubscribe;
  }, [user]);

  const todayVehicles = useMemo(
    () => filterVehiclesForAnilloCoverage(vehicles, Date.now()),
    [vehicles]
  );

  const balance = useMemo(
    () =>
      calcularBalanceConquistaJornada({
        segmentos: planilla?.segmentos ?? [],
        vehiculos: todayVehicles,
        dayStartMs: getLimaDayStart().getTime(),
      }),
    [planilla?.segmentos, todayVehicles]
  );

  useEffect(() => {
    if (isPlanificacion) return;
    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const lastCierre = localStorage.getItem("sistemicar_last_cierre");
      const today = now.toDateString();

      if (hours < 21 || lastCierre === today || hasClosed) return;
      if (!shouldMountAutoCierreJornada(vehicles, location)) return;

      setIsOpen(true);
      fetchCierreData();
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [hasClosed, user, isPlanificacion, vehicles, location]);

  const fetchCierreData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const freshPoints = await getDailyPoints(user.uid);
      setDailySovereigntyPoints(freshPoints.total);
      setDailyPointsLogs(freshPoints.logs);
      
      const response = await fetch("/api/cierre-jornada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          energyLogs,
          aliados,
          alquimias,
          vehicles,
          dailyPointsLogs: freshPoints.logs,
          userId: user.uid,
          userName: user.displayName || user.email?.split("@")[0] || "Guerrero",
          dailySovereigntyPoints: freshPoints.total
        })
      });
      
      const data = await response.json();
      
      data.dailyPS = Math.max(data.dailyPS || 0, freshPoints.total);
      
      setCierreData(data);
    } catch (error) {
      console.error("Error fetching cierre:", error);
      setCierreData({
        reconocimiento: dailySovereigntyPoints > 0 
          ? `Hoy ganaste ${dailySovereigntyPoints} Puntos de Soberanía.` 
          : "Hoy trabajaste en tu transformación.",
        diagnostico: "Continúa registrando tu energía para obtener mejores diagnósticos.",
        prescripcion: "Mañana, comienza el día con un registro de ENFOQUE.",
        ejeDebil: "enfoque",
        dailyPS: dailySovereigntyPoints
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setHasClosed(true);
    localStorage.setItem("sistemicar_last_cierre", new Date().toDateString());
  };

  const EjeIcon = cierreData?.ejeDebil ? AXIS_ICONS[cierreData.ejeDebil] || Target : Target;
  const ejeColor = cierreData?.ejeDebil ? AXIS_COLORS[cierreData.ejeDebil] || GOLD : GOLD;

  if (isPlanificacion) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md rounded-3xl border overflow-hidden"
            style={{ 
              backgroundColor: "#0a0a0a",
              borderColor: `${GOLD}30`
            }}
          >
            <div 
              className="p-4 flex items-center justify-between"
              style={{ backgroundColor: `${GOLD}10`, borderBottom: `1px solid ${GOLD}20` }}
            >
              <div className="flex items-center gap-3">
                <Moon size={20} style={{ color: GOLD }} />
                <div>
                  <h2 className="text-lg font-black text-white">Cierre de Jornada</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Diagnóstico del día</p>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader2 size={32} className="animate-spin mb-3" style={{ color: GOLD }} />
                  <p className="text-sm text-slate-500">Analizando tu jornada...</p>
                </div>
              ) : cierreData ? (
                <>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 }}
                    className="p-4 rounded-2xl text-center"
                    style={{ backgroundColor: `${GOLD}15`, border: `1px solid ${GOLD}30` }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Zap size={16} style={{ color: GOLD }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                        PS Ganados Hoy
                      </span>
                    </div>
                    <p className="text-3xl font-black" style={{ color: GOLD }}>
                      +{cierreData.dailyPS ?? dailySovereigntyPoints} PS
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                  >
                    <BalanceConquistaPanel balance={balance} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-2xl"
                    style={{ backgroundColor: `${GOLD}10`, border: `1px solid ${GOLD}20` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={14} style={{ color: GOLD }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                        Reconocimiento
                      </span>
                    </div>
                    <p className="text-sm text-white">{cierreData.reconocimiento}</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-2xl"
                    style={{ backgroundColor: `${ejeColor}10`, border: `1px solid ${ejeColor}20` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={14} style={{ color: ejeColor }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ejeColor }}>
                        Diagnóstico Sistémico
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{cierreData.diagnostico}</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 rounded-2xl border"
                    style={{ backgroundColor: "#0f0f0f", borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <EjeIcon size={14} style={{ color: ejeColor }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Prescripción para Mañana
                      </span>
                    </div>
                    <p className="text-sm text-white font-medium">{cierreData.prescripcion}</p>
                    
                    {cierreData.ejeDebil && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                        <span className="text-[9px] text-slate-500">Eje a fortalecer:</span>
                        <span 
                          className="text-xs font-bold uppercase px-2 py-0.5 rounded"
                          style={{ backgroundColor: `${ejeColor}20`, color: ejeColor }}
                        >
                          {cierreData.ejeDebil}
                        </span>
                      </div>
                    )}
                  </motion.div>

                  {cierreData.stats && cierreData.stats.energyFrequency && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex gap-2 justify-center"
                    >
                      {Object.entries(cierreData.stats.energyFrequency).map(([axis, count]) => (
                        <div 
                          key={axis}
                          className="flex flex-col items-center px-3 py-2 rounded-lg"
                          style={{ backgroundColor: count > 0 ? `${AXIS_COLORS[axis]}15` : "rgba(255,255,255,0.03)" }}
                        >
                          <span className="text-lg font-black" style={{ color: count > 0 ? AXIS_COLORS[axis] : "#444" }}>
                            {count}
                          </span>
                          <span className="text-[8px] uppercase tracking-wider text-slate-500">
                            {axis.slice(0, 3)}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </>
              ) : null}
            </div>

            <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                style={{ backgroundColor: `${GOLD}20`, color: GOLD }}
              >
                Cerrar Jornada
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
