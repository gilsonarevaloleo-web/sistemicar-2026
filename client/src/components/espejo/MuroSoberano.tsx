import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setMuroFirmado } from "@/lib/persistence";

const MURO_LS_KEY = "sistemicar_muro_soberano_firmado";

interface MuroSoberanoProps {
  onFirmar: () => void;
  userId?: string;
}

export function isMuroFirmado(): boolean {
  try {
    return localStorage.getItem(MURO_LS_KEY) === "true";
  } catch {
    return false;
  }
}

export default function MuroSoberano({ onFirmar, userId }: MuroSoberanoProps) {
  const [input, setInput] = useState("");
  const [accesoConcedido, setAccesoConcedido] = useState(false);

  const canActivate = input.trim().toUpperCase() === "SOBERANO";

  const handleSolicitar = async () => {
    if (!canActivate) return;
    setAccesoConcedido(true);
    try { localStorage.setItem(MURO_LS_KEY, "true"); } catch {}
    if (userId) {
      await setMuroFirmado(userId).catch((e) => { console.warn("[MuroSoberano] setMuroFirmado falló:", e); });
    }
    setTimeout(() => {
      onFirmar();
    }, 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(10,10,10,0.97)", backdropFilter: "blur(12px)" }}
      data-testid="muro-soberano"
    >
      <AnimatePresence mode="wait">
        {!accesoConcedido ? (
          <motion.div
            key="muro-form"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <div
                className="inline-block mb-4 px-3 py-1 rounded text-[10px] tracking-widest uppercase"
                style={{ border: "1px solid rgba(212,175,55,0.3)", color: "rgba(212,175,55,0.7)", fontFamily: "monospace" }}
              >
                ESPEJO SOBERANO v5
              </div>
              <h2
                className="text-2xl font-bold text-white mb-1"
                style={{ fontFamily: "Playfair Display, serif", letterSpacing: "0.1em" }}
              >
                EL ESPEJO SOBERANO
              </h2>
              <div
                className="mt-4 p-5 rounded-xl text-left leading-relaxed"
                style={{
                  backgroundColor: "rgba(212,175,55,0.04)",
                  border: "1px solid rgba(212,175,55,0.15)",
                  fontFamily: "monospace",
                }}
              >
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  "Antes de entrar, debes saber:
                </p>
                <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Tu lenguaje aquí es Dato de Ingeniería.
                </p>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                  No vengo a validar tus emociones.
                </p>
                <p className="text-sm mt-1" style={{ color: "#D4AF37" }}>
                  Vengo a calibrar tu Voltaje."
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p
                  className="text-[10px] uppercase tracking-widest mb-2 text-center"
                  style={{ color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}
                >
                  Para acceder, escribe
                </p>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSolicitar()}
                  placeholder="SOBERANO"
                  autoFocus
                  className="w-full text-center text-lg font-bold rounded-xl px-4 py-3 focus:outline-none bg-transparent tracking-widest uppercase"
                  style={{
                    border: `2px solid ${canActivate ? "#D4AF37" : "rgba(255,255,255,0.1)"}`,
                    color: canActivate ? "#D4AF37" : "rgba(255,255,255,0.6)",
                    fontFamily: "monospace",
                    transition: "border-color 0.3s, color 0.3s",
                    boxShadow: canActivate ? "0 0 20px rgba(212,175,55,0.15)" : "none",
                    letterSpacing: "0.3em",
                  }}
                  data-testid="input-muro-soberano"
                />
              </div>

              <motion.button
                onClick={handleSolicitar}
                disabled={!canActivate}
                whileHover={canActivate ? { scale: 1.02 } : {}}
                whileTap={canActivate ? { scale: 0.98 } : {}}
                className="w-full py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all"
                style={{
                  backgroundColor: canActivate ? "#D4AF37" : "rgba(255,255,255,0.04)",
                  color: canActivate ? "#0A0A0A" : "rgba(255,255,255,0.2)",
                  border: `1px solid ${canActivate ? "#D4AF37" : "rgba(255,255,255,0.08)"}`,
                  fontFamily: "monospace",
                  cursor: canActivate ? "pointer" : "not-allowed",
                  boxShadow: canActivate ? "0 0 30px rgba(212,175,55,0.25)" : "none",
                }}
                data-testid="btn-solicitar-acceso"
              >
                SOLICITAR ACCESO
              </motion.button>

              <p
                className="text-center text-[9px]"
                style={{ color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}
              >
                Este acceso se registra una sola vez en tu perfil
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="acceso-concedido"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 0.6, repeat: 2 }}
            >
              <p
                className="text-2xl font-bold tracking-widest"
                style={{ color: "#00FFC3", fontFamily: "monospace" }}
              >
                ACCESO CONCEDIDO
              </p>
              <p
                className="text-sm mt-2 tracking-widest"
                style={{ color: "rgba(0,255,195,0.6)", fontFamily: "monospace" }}
              >
                SISTEMA ACTIVADO
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
