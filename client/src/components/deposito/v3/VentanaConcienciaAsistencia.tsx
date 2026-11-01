import React from "react";
import type { PreguntaConciencia } from "@shared/deposito/v3";

const GOLD = "#D4AF37";

export function VentanaConcienciaAsistencia({
  pregunta,
  onSi,
  onNo,
}: {
  pregunta: PreguntaConciencia;
  onSi: () => void;
  onNo: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deposito-conciencia-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.78)" }}
      data-testid="deposito-conciencia-modal"
    >
      <div
        className="w-full max-w-md border px-6 py-7 text-center"
        style={{
          borderColor: `${GOLD}88`,
          backgroundColor: "#0a0a0a",
        }}
      >
        <p
          id="deposito-conciencia-titulo"
          className="mb-4 text-[10px] tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          {pregunta.titulo}
        </p>
        <p
          className="text-lg font-light leading-snug text-white/92"
          data-testid="deposito-conciencia-pregunta"
        >
          {pregunta.pregunta}
        </p>
        <p
          className="mt-4 text-[11px] tracking-[0.14em] text-white/55"
          data-testid="deposito-conciencia-marca"
        >
          {pregunta.marca}
        </p>
        <p className="mt-4 text-[12px] leading-relaxed text-white/45">
          {pregunta.valor}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onSi}
            className="flex-1 px-5 py-3 text-[11px] font-bold uppercase tracking-widest"
            style={{ backgroundColor: GOLD, color: "#111" }}
            data-testid="deposito-conciencia-si"
          >
            Sí, inicio
          </button>
          <button
            type="button"
            onClick={onNo}
            className="flex-1 border px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white/70"
            style={{ borderColor: `${GOLD}55` }}
            data-testid="deposito-conciencia-no"
          >
            Hoy no
          </button>
        </div>
      </div>
    </div>
  );
}

export default VentanaConcienciaAsistencia;
