import React from "react";
import type { PasoCapitulo } from "@shared/casas/gimnasio6";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "../umbral5/LienzoLimite";

export function PasosCapitulo({ pasos }: { pasos: PasoCapitulo[] }) {
  if (pasos.length === 0) return null;
  return (
    <div className="space-y-3" data-testid="gimnasio6-pasos">
      <div className="grid grid-cols-3 gap-1.5">
        {pasos.map((paso) => {
          const actual = paso.estado === "actual";
          const hecho = paso.estado === "hecho";
          return (
            <div
              key={`${paso.capitulo}.${paso.indice}`}
              className="min-h-[2.6rem] px-1.5 py-1.5"
              style={{
                border: `1px solid ${actual ? UMBRAL5_BRONZE : `${UMBRAL5_BRONZE}${hecho ? "44" : "22"}`}`,
                backgroundColor: actual ? `${UMBRAL5_BRONZE}18` : "transparent",
                color: actual
                  ? UMBRAL5_BRONZE
                  : hecho
                    ? "rgba(255,255,255,0.55)"
                    : "rgba(255,255,255,0.22)",
              }}
              data-testid={`gimnasio6-paso-1-${paso.indice}`}
              data-estado={paso.estado}
            >
              <p className="text-[9px] tracking-[0.12em] uppercase">
                {paso.etiquetaSubcodigo}
              </p>
              {hecho && paso.recorteEscenario && (
                <p className="mt-0.5 text-[10px] leading-snug text-white/45">
                  {paso.recorteEscenario}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[9px] tracking-[0.16em] uppercase" style={{ color: UMBRAL5_ASH }}>
        Tres tiempos. No se sella en el primero.
      </p>
    </div>
  );
}
