import { motion } from "framer-motion";
import { ArrowLeft, Package } from "lucide-react";
import { useLocation } from "wouter";
import { BADGE_EN_CAMINO, PAQUETE_EN_CAMINO, modulosEnCamino } from "@shared/moduleCatalog";
import { PageContainer } from "@/components/page-container";

const SLATE = "#64748b";

export default function EnCamino() {
  const [, navigate] = useLocation();
  const packed = modulosEnCamino();

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24" style={{ backgroundColor: "#050505" }}>
      <PageContainer>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button
            type="button"
            onClick={() => navigate("/menu")}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 text-sm"
            data-testid="button-back-en-camino"
          >
            <ArrowLeft size={16} />
            Volver al menú
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${SLATE}20` }}
            >
              <Package size={18} style={{ color: SLATE }} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: SLATE }}>
                {PAQUETE_EN_CAMINO.nombre}
              </p>
              <h1 className="text-lg font-black text-white">Un paquete, menos ruido</h1>
            </div>
          </div>
          <p className="text-[12px] text-slate-400 mt-3 leading-relaxed">
            {PAQUETE_EN_CAMINO.desc}. Los recintos vivos — Espejo, Depósito, Jornada y Umbral —
            ya están en el menú. Cuando un módulo de esta lista se trabaja, sale del paquete
            y ocupa su propia ficha.
          </p>
        </motion.div>

        <div className="space-y-2" data-testid="paquete-en-camino-lista">
          {packed.map((mod, i) => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 rounded-xl border"
              style={{
                backgroundColor: "#0a0a0a",
                borderColor: `${mod.color ?? SLATE}25`,
              }}
              data-testid={`paquete-modulo-${mod.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white">{mod.nombre}</h2>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{mod.desc}</p>
                </div>
                <span
                  className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(100,116,139,0.25)", color: "#94a3b8" }}
                >
                  {BADGE_EN_CAMINO}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </PageContainer>
    </div>
  );
}
