import React from "react";
import type { PasoCapitulo, SubcodigoId } from "@shared/casas/gimnasio6";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "../umbral5/LienzoLimite";

const SUBS: SubcodigoId[] = [1, 2, 3, 4];

export function PasosCapitulo({ pasos }: { pasos: PasoCapitulo[] }) {
  if (pasos.length === 0) return null;
  return (
    <div className="space-y-3" data-testid="gimnasio6-pasos">
      {SUBS.map((sub) => {
        const fila = pasos.filter((p) => p.subcodigo === sub);
        if (fila.length === 0) return null;
        const etiqueta = fila[0]?.etiquetaSubcodigo ?? "";
        return (
          <div key={sub} data-testid={`gimnasio6-subcodigo-${sub}`}>
            <p
              className="mb-1.5 text-[9px] tracking-[0.18em] uppercase"
              style={{ color: UMBRAL5_ASH }}
            >
              {sub} · {etiqueta}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {fila.map((paso) => {
                const actual = paso.estado === "actual";
                const hecho = paso.estado === "hecho";
                return (
                  <div
                    key={`${paso.subcodigo}.${paso.indice}`}
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
                    data-testid={`gimnasio6-paso-${paso.subcodigo}-${paso.indice}`}
                    data-estado={paso.estado}
                  >
                    <p className="text-[9px] tracking-[0.12em] uppercase">
                      {paso.subcodigo}.{paso.indice}
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
          </div>
        );
      })}
    </div>
  );
}
