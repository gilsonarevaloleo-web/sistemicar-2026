import React, { useState } from "react";
import {
  CASA_UMBRAL5_RITUAL,
  cabeceraVolcado,
  formatearCopiaVolcado,
  numerosVolcado,
  recortarVolcado,
  type SesionUmbral5,
} from "@shared/casas/umbral5";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "./LienzoLimite";
import { BotonCopiarUmbral } from "./BotonCopiarUmbral";

export function HistorialLimite({
  sesiones,
  sesionActivaId,
  onSelect,
}: {
  sesiones: SesionUmbral5[];
  sesionActivaId: string | null;
  onSelect: (sesion: SesionUmbral5) => void;
}) {
  const [abierto, setAbierto] = useState(true);
  const numeros = numerosVolcado(sesiones);

  return (
    <section className="space-y-3" data-testid="umbral5-historial">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between border px-4 py-3 text-left"
        style={{ borderColor: `${UMBRAL5_BRONZE}28` }}
        data-testid="umbral5-historial-toggle"
      >
        <span
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: UMBRAL5_BRONZE }}
        >
          Volcados guardados
        </span>
        <span className="text-[11px] text-white/40" style={{ color: UMBRAL5_ASH }}>
          {sesiones.length === 0
            ? "vacío"
            : `${sesiones.length} ${sesiones.length === 1 ? "sesión" : "sesiones"}`}
        </span>
      </button>

      {abierto && sesiones.length === 0 && (
        <p className="px-1 text-[12px] text-white/35">
          El volcado se guarda al sellar, como en el Juez. Todavía no hay ninguno.
        </p>
      )}

      {abierto && (
        <ul className="space-y-2">
          {sesiones.map((s) => {
            const activa = s.id === sesionActivaId;
            const numero = numeros.get(s.id) ?? 0;
            return (
              <li key={s.id}>
                <article
                  className="space-y-3 border bg-black/40 px-4 py-3"
                  style={{
                    borderColor: activa ? `${UMBRAL5_BRONZE}66` : `${UMBRAL5_BRONZE}22`,
                  }}
                  data-testid={`umbral5-historial-item-${s.id}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(s)}
                    className="w-full text-left"
                    data-testid={`umbral5-historial-select-${s.id}`}
                  >
                    <p
                      className="text-[10px] tracking-[0.18em] uppercase"
                      style={{ color: UMBRAL5_ASH }}
                    >
                      {cabeceraVolcado(s, numero)}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/75">
                      {recortarVolcado(s.textoVolcado)}
                    </p>
                  </button>
                  <details className="group">
                    <summary
                      className="cursor-pointer text-[9px] tracking-[0.2em] uppercase text-white/35"
                      data-testid={`umbral5-historial-volcado-${s.id}`}
                    >
                      {CASA_UMBRAL5_RITUAL} · ver volcado
                    </summary>
                    <p
                      className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/80"
                      data-testid={`umbral5-historial-texto-${s.id}`}
                    >
                      {s.textoVolcado}
                    </p>
                  </details>
                  <BotonCopiarUmbral
                    texto={formatearCopiaVolcado(s, numero)}
                    testId={`umbral5-copiar-${s.id}`}
                  />
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
