import React from "react";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "./LienzoLimite";

export function BannerGimnasio() {
  return (
    <div
      className="border px-4 py-4 opacity-70"
      style={{ borderColor: `${UMBRAL5_BRONZE}33`, backgroundColor: "#0a0a0a" }}
      data-testid="umbral5-gimnasio-cerrado"
    >
      <p
        className="text-[10px] tracking-[0.22em] uppercase"
        style={{ color: UMBRAL5_ASH }}
      >
        Gimnasio
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-white/50">
        El gimnasio (Forja / Arena) no se abre en esta casa todavía.
      </p>
      <button
        type="button"
        disabled
        className="mt-3 w-full cursor-not-allowed px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase opacity-40"
        style={{
          backgroundColor: "transparent",
          color: UMBRAL5_BRONZE,
          border: `1px solid ${UMBRAL5_BRONZE}55`,
        }}
        data-testid="umbral5-gimnasio-boton"
      >
        Cerrado
      </button>
    </div>
  );
}
