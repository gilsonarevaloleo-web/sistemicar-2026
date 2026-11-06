import React from "react";
import { mensajeOferta } from "@shared/casas/gimnasio6";
import type { ModuloGimnasioOferta } from "@shared/casas/umbral5";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "./LienzoLimite";

export function BannerGimnasio({
  modulo,
  onEntrar,
  cargando,
}: {
  modulo: ModuloGimnasioOferta;
  onEntrar?: () => void;
  cargando?: boolean;
}) {
  const abre = modulo === "social_producto";
  return (
    <div
      className="border px-4 py-4"
      style={{
        borderColor: `${UMBRAL5_BRONZE}${abre ? "55" : "33"}`,
        backgroundColor: "#0a0a0a",
        opacity: abre ? 1 : 0.7,
      }}
      data-testid={abre ? "umbral5-gimnasio-oferta" : "umbral5-gimnasio-cerrado"}
    >
      <p
        className="text-[10px] tracking-[0.22em] uppercase"
        style={{ color: UMBRAL5_ASH }}
      >
        Gimnasio · capa profunda
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-white/50">
        {mensajeOferta(modulo)}
      </p>
      <button
        type="button"
        disabled={!abre || !onEntrar || cargando}
        onClick={() => onEntrar?.()}
        className="mt-3 w-full px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          backgroundColor: abre ? UMBRAL5_BRONZE : "transparent",
          color: abre ? "#0a0a0a" : UMBRAL5_BRONZE,
          border: `1px solid ${UMBRAL5_BRONZE}55`,
        }}
        data-testid="umbral5-gimnasio-boton"
      >
        {cargando ? "Abriendo…" : abre ? "Entrar al gimnasio" : "Cerrado"}
      </button>
    </div>
  );
}
