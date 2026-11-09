import React from "react";
import { CREDITO_LECTURA_MAPA } from "@shared/casas/umbral5";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "./LienzoLimite";

export function BannerMapaOpcional({
  visible,
  onLeer,
  cargando,
}: {
  visible: boolean;
  onLeer: () => void;
  cargando: boolean;
}) {
  if (!visible) return null;
  return (
    <div
      className="border px-4 py-3"
      style={{ borderColor: `${UMBRAL5_BRONZE}22`, backgroundColor: "transparent" }}
      data-testid="umbral5-banner-mapa"
    >
      <p className="text-[11px] leading-relaxed text-white/40">
        El mapa pago es opcional. Seguí volcando: el peso del límite se ve en la
        serie, no en un sello.
      </p>
      <button
        type="button"
        onClick={onLeer}
        disabled={cargando}
        className="mt-3 px-3 py-2 text-[10px] font-medium tracking-[0.12em] uppercase disabled:opacity-40"
        style={{
          backgroundColor: "transparent",
          color: UMBRAL5_ASH,
          border: `1px solid ${UMBRAL5_BRONZE}44`,
        }}
        data-testid="umbral5-leer-mapa"
      >
        {cargando
          ? "Leyendo el mapa…"
          : `Leer el mapa (${CREDITO_LECTURA_MAPA} crédito)`}
      </button>
    </div>
  );
}
