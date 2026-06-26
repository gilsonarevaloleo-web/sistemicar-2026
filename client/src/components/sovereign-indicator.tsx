import { Database, CloudOff, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSovereignModeShallow } from "@/hooks/useModularStoreSelectors";

export function SovereignIndicator() {
  const { isOfflineMode, errorMsg } = useSovereignModeShallow();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mb-4 p-3 rounded-xl border flex items-center justify-between transition-all ${
          isOfflineMode 
            ? 'bg-amber-950/20 border-amber-500/50' 
            : 'bg-emerald-950/20 border-emerald-500/50'
        }`}
      >
        <div className="flex items-center gap-3">
          {isOfflineMode ? (
            <CloudOff className="text-amber-500" size={18} />
          ) : (
            <Database className="text-emerald-500" size={18} />
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white">
              {isOfflineMode ? "Modo Soberano Local" : "Sincronizado con la Nube"}
            </p>
            <p className="text-[9px] text-slate-500 italic">
              {isOfflineMode 
                ? `Aviso: ${errorMsg}` 
                : "Tu sabiduría está respaldada globalmente."
              }
            </p>
          </div>
        </div>
        {isOfflineMode && (
          <div className="flex items-center gap-1 text-amber-500 text-[9px] font-bold">
            <WifiOff size={12} /> OFFLINE
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
