import React, { useState } from "react";
import type { LibroGimnasio } from "@shared/casas/gimnasio6";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "../umbral5/LienzoLimite";

function recorte(texto: string, max = 140): string {
  const t = texto.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export function HistorialLibros({
  libros,
  libroActivoId,
  onSelect,
}: {
  libros: LibroGimnasio[];
  libroActivoId: string | null;
  onSelect: (libro: LibroGimnasio) => void;
}) {
  const [abierto, setAbierto] = useState(true);
  if (libros.length === 0) return null;

  return (
    <section className="space-y-3" data-testid="gimnasio6-historial">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between border px-4 py-3 text-left"
        style={{ borderColor: `${UMBRAL5_BRONZE}28` }}
      >
        <span
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: UMBRAL5_BRONZE }}
        >
          Libros del gimnasio
        </span>
        <span className="text-[11px]" style={{ color: UMBRAL5_ASH }}>
          {libros.length}
        </span>
      </button>
      {abierto && (
        <ul className="space-y-2">
          {libros.slice(0, 8).map((libro) => (
            <li key={libro.id}>
              <button
                type="button"
                onClick={() => onSelect(libro)}
                className="w-full border bg-black/40 px-4 py-3 text-left"
                style={{
                  borderColor:
                    libro.id === libroActivoId
                      ? `${UMBRAL5_BRONZE}66`
                      : `${UMBRAL5_BRONZE}22`,
                }}
                data-testid={`gimnasio6-historial-item-${libro.id}`}
              >
                <p
                  className="text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: UMBRAL5_ASH }}
                >
                  {libro.estado === "ABIERTO"
                    ? `Capítulo ${libro.puntero.capitulo}`
                    : libro.estado}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/75">
                  {recorte(libro.limiteOrigen)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
