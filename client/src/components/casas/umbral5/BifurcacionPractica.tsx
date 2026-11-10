import React from "react";
import { CASA_UMBRAL5_RITUAL } from "@shared/casas/umbral5";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "./LienzoLimite";

export function BifurcacionPractica({
  visible,
  modo,
  onPuerta,
  onGimnasio,
}: {
  visible: boolean;
  modo: "puerta" | "gimnasio";
  onPuerta: () => void;
  onGimnasio: () => void;
}) {
  if (!visible) return null;

  return (
    <section
      className="space-y-3 border px-4 py-4"
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
        Práctica en curso
      </p>
      <p className="text-[13px] leading-relaxed text-white/70">
        Podés entrar a la primera puerta ({CASA_UMBRAL5_RITUAL}) o seguir tu
        práctica de gimnasia.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onPuerta}
          className="px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase"
          style={{
            backgroundColor: modo === "puerta" ? UMBRAL5_BRONZE : "transparent",
            color: modo === "puerta" ? "#0a0a0a" : UMBRAL5_BRONZE,
            border: `1px solid ${UMBRAL5_BRONZE}55`,
          }}
          data-testid="umbral5-elegir-puerta"
        >
          Entrar a la primera puerta
        </button>
        <button
          type="button"
          onClick={onGimnasio}
          className="px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase"
          style={{
            backgroundColor: modo === "gimnasio" ? UMBRAL5_BRONZE : "transparent",
            color: modo === "gimnasio" ? "#0a0a0a" : UMBRAL5_BRONZE,
            border: `1px solid ${UMBRAL5_BRONZE}55`,
          }}
          data-testid="umbral5-elegir-gimnasio"
        >
          Seguir práctica de gimnasia
        </button>
      </div>
    </section>
  );
}
