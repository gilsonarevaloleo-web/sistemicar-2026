import React from "react";
import { mensajeOfertaVendedor } from "@shared/casas/gimnasio6";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "./LienzoLimite";

export function BannerPuertaVendedor({
  onEntrar,
  cargando,
}: {
  onEntrar?: () => void;
  cargando?: boolean;
}) {
  return (
    <div
      className="border px-4 py-4"
      style={{
        borderColor: `${UMBRAL5_BRONZE}55`,
        backgroundColor: "#0a0a0a",
      }}
      data-testid="umbral5-gimnasio-vendedor"
    >
      <p
        className="text-[10px] tracking-[0.22em] uppercase"
        style={{ color: UMBRAL5_ASH }}
      >
        Puerta B · Vendedor
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-white/50">
        {mensajeOfertaVendedor()}
      </p>
      <button
        type="button"
        disabled={!onEntrar || cargando}
        onClick={() => onEntrar?.()}
        className="mt-3 w-full px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          backgroundColor: "transparent",
          color: UMBRAL5_BRONZE,
          border: `1px solid ${UMBRAL5_BRONZE}55`,
        }}
        data-testid="umbral5-gimnasio-vendedor-boton"
      >
        {cargando ? "Abriendo…" : "Entrar al vendedor"}
      </button>
    </div>
  );
}
