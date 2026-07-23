import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface CalibrationPanelProps {
  habito24h: string;
  onConfirm: () => void;
  onSave?: () => void | Promise<void>;
  saving?: boolean;
  saved?: boolean;
}

export default function CalibrationPanel({
  habito24h,
  onConfirm,
  onSave,
  saving = false,
  saved = false,
}: CalibrationPanelProps) {
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, 24 * 60 * 60 - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(habito24h);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        background: "#050505",
        border: "1px solid #D4AF37",
        borderRadius: 12,
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
      data-testid="panel-calibration"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 12,
          boxShadow: "inset 0 0 30px rgba(212,175,55,0.08)",
          pointerEvents: "none",
        }}
      />

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: "#D4AF37",
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
          data-testid="text-calibration-title"
        >
          Protocolo de Calibración
        </span>
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "monospace",
            fontSize: 10,
            color: "rgba(255,255,255,0.45)",
          }}
        >
          Entregado · puedes guardarlo sin abrir Planificación ni Jornada
        </p>
      </div>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            fontFamily: "monospace",
            fontSize: 48,
            fontWeight: 700,
            color: "#D4AF37",
            letterSpacing: 4,
            lineHeight: 1,
          }}
          data-testid="text-countdown-24h"
        >
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </motion.div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            color: "rgba(212,175,55,0.5)",
            letterSpacing: 3,
            marginTop: 6,
            textTransform: "uppercase",
          }}
        >
          Ventana de ejecución 24h
        </div>
      </div>

      <div
        style={{
          border: "1px solid rgba(212,175,55,0.3)",
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
          background: "rgba(212,175,55,0.03)",
          maxHeight: 320,
          overflowY: "auto",
        }}
        data-testid="text-habito-24h"
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            color: "rgba(212,175,55,0.6)",
            letterSpacing: 2,
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          Protocolo prescrito
        </div>
        <p
          style={{
            color: "#e0e0e0",
            fontSize: 14,
            lineHeight: 1.65,
            margin: 0,
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
          }}
        >
          {habito24h}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {onSave && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => void onSave()}
            disabled={saving || saved}
            style={{
              width: "100%",
              padding: "12px 20px",
              background: saved ? "rgba(0,255,195,0.12)" : "rgba(0,255,195,0.1)",
              color: "#00FFC3",
              border: "1px solid rgba(0,255,195,0.4)",
              borderRadius: 8,
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              cursor: saving || saved ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
            data-testid="btn-guardar-protocolo"
          >
            {saved ? "✓ Protocolo guardado" : saving ? "Guardando…" : "Guardar protocolo"}
          </motion.button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          style={{
            width: "100%",
            padding: "10px 20px",
            background: "transparent",
            color: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            fontFamily: "monospace",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
            cursor: "pointer",
          }}
          data-testid="btn-copiar-protocolo"
        >
          {copied ? "✓ Copiado" : "Copiar protocolo"}
        </button>

        <motion.button
          whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(212,175,55,0.3)" }}
          whileTap={{ scale: 0.97 }}
          onClick={handleConfirm}
          disabled={confirmed}
          style={{
            width: "100%",
            padding: "14px 24px",
            background: confirmed
              ? "rgba(212,175,55,0.15)"
              : "linear-gradient(135deg, #D4AF37, #b8962e)",
            color: confirmed ? "#D4AF37" : "#0A0A0A",
            border: "none",
            borderRadius: 8,
            fontFamily: "monospace",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            cursor: confirmed ? "default" : "pointer",
            transition: "all 0.3s ease",
          }}
          data-testid="button-confirm-execution"
        >
          {confirmed ? "✓ EJECUCIÓN CONFIRMADA" : "CONFIRMAR Y CERRAR SESIÓN"}
        </motion.button>

        <p
          style={{
            margin: 0,
            textAlign: "center",
            fontFamily: "monospace",
            fontSize: 9,
            color: "rgba(255,255,255,0.35)",
            lineHeight: 1.4,
          }}
        >
          Planificación y Jornada son opcionales. Puedes activarlas después si quieres seguimiento.
        </p>
      </div>
    </motion.div>
  );
}
