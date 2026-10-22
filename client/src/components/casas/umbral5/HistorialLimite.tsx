import React, { useState } from "react";
import type { SesionUmbral5 } from "@shared/casas/umbral5";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "./LienzoLimite";

function recorte(texto: string, max = 160): string {
  const t = texto.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function etiquetaEstado(sesion: SesionUmbral5): string {
  if (sesion.estado === "MAPA_PAGO" && sesion.lectura) {
    return `Mapa C${sesion.lectura.codigoUsuario}`;
  }
  return "Volcado";
}

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
          {sesiones.slice(0, 12).map((s) => {
            const activa = s.id === sesionActivaId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s)}
                  className="w-full border bg-black/40 px-4 py-3 text-left"
                  style={{
                    borderColor: activa ? `${UMBRAL5_BRONZE}66` : `${UMBRAL5_BRONZE}22`,
                  }}
                  data-testid={`umbral5-historial-item-${s.id}`}
                >
                  <p
                    className="text-[10px] tracking-[0.18em] uppercase"
                    style={{ color: UMBRAL5_ASH }}
                  >
                    {etiquetaEstado(s)}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/75">
                    {recorte(s.textoVolcado)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
