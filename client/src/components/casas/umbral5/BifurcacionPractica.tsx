import React from "react";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "./LienzoLimite";

export function BifurcacionPractica({
  visible,
  titulo,
  subtitulo,
  onContinuar,
  onNuevo,
}: {
  visible: boolean;
  titulo: string;
  subtitulo: string;
  onContinuar: () => void;
  onNuevo: () => void;
}) {
  if (!visible) return null;

  return (
    <section
      className="space-y-4 border px-4 py-5"
      style={{
        borderColor: `${UMBRAL5_BRONZE}55`,
        backgroundColor: "#0a0a0a",
      }}
      data-testid="umbral5-bifurcacion"
    >
      <p
        className="text-[10px] tracking-[0.22em] uppercase"
        style={{ color: UMBRAL5_ASH }}
      >
        Píldora en curso
      </p>
      <div className="space-y-1">
        <h2
          className="text-xl font-light tracking-tight"
          style={{ color: UMBRAL5_BRONZE }}
          data-testid="umbral5-pildora-titulo"
        >
          {titulo}
        </h2>
        {subtitulo && (
          <p className="text-[13px] leading-relaxed text-white/60">
            {subtitulo}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onContinuar}
        className="w-full px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase"
        style={{
          backgroundColor: UMBRAL5_BRONZE,
          color: "#0a0a0a",
          border: `1px solid ${UMBRAL5_BRONZE}`,
        }}
        data-testid="umbral5-elegir-gimnasio"
      >
        Continuar píldora
      </button>
      <button
        type="button"
        onClick={onNuevo}
        className="block text-[10px] tracking-[0.18em] uppercase text-white/40 underline underline-offset-4 hover:text-white/70"
        data-testid="umbral5-elegir-puerta"
      >
        Nuevo diagnóstico (10 volcados)
      </button>
    </section>
  );
}
