import React, { useState } from "react";
import {
  formatearCopiaLibroNumerado,
  etiquetaLibro,
  numerosLibro,
  recortarLibro,
  type LibroGimnasio,
} from "@shared/casas/gimnasio6";
import { formatearFechaVolcado } from "@shared/casas/umbral5";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "../umbral5/LienzoLimite";
import { BotonCopiarUmbral } from "../umbral5/BotonCopiarUmbral";

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
  const numeros = numerosLibro(libros);
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
          {libros.map((libro) => {
            const numero = numeros.get(libro.id) ?? 0;
            return (
              <li key={libro.id}>
                <article
                  className="space-y-3 border bg-black/40 px-4 py-3"
                  style={{
                    borderColor:
                      libro.id === libroActivoId
                        ? `${UMBRAL5_BRONZE}66`
                        : `${UMBRAL5_BRONZE}22`,
                  }}
                  data-testid={`gimnasio6-historial-item-${libro.id}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(libro)}
                    className="w-full text-left"
                    data-testid={`gimnasio6-historial-select-${libro.id}`}
                  >
                    <p
                      className="text-[10px] tracking-[0.18em] uppercase"
                      style={{ color: UMBRAL5_ASH }}
                    >
                      Libro {numero} · {formatearFechaVolcado(libro.createdAt)} ·{" "}
                      {etiquetaLibro(libro)}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/75">
                      {recortarLibro(libro.limiteOrigen)}
                    </p>
                  </button>
                  <details className="group">
                    <summary
                      className="cursor-pointer text-[9px] tracking-[0.2em] uppercase text-white/35"
                      data-testid={`gimnasio6-historial-volcado-${libro.id}`}
                    >
                      Límite de origen · ver volcado
                    </summary>
                    <p
                      className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/80"
                      data-testid={`gimnasio6-historial-texto-${libro.id}`}
                    >
                      {libro.limiteOrigen}
                    </p>
                    {libro.turnos.length > 0 && (
                      <ol className="mt-3 space-y-2">
                        {libro.turnos.map((t, i) => (
                          <li
                            key={t.id}
                            className="text-sm leading-relaxed text-white/75"
                          >
                            <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                              Turno {i + 1} · {formatearFechaVolcado(t.creadoAt)}
                            </p>
                            <p className="mt-1 text-white/45">{t.pregunta}</p>
                            {t.respuesta && (
                              <p className="mt-1 whitespace-pre-wrap text-white/80">
                                {t.respuesta}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </details>
                  <BotonCopiarUmbral
                    texto={formatearCopiaLibroNumerado(libro, numero)}
                    etiqueta="Copiar libro"
                    toastOk="Libro copiado al portapapeles"
                    testId={`gimnasio6-copiar-${libro.id}`}
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
