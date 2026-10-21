import React, { useState } from "react";
import {
  formatearFechaAuditoria,
  principioDe,
  type HistorialJuezItem,
} from "@shared/casas/codigo4";
import { BotonCopiarAuditoria } from "./BotonCopiarAuditoria";
import { JUEZ_IRON, JUEZ_STEEL } from "./LienzoEntrada";

export function HistorialAuditorias({ items }: { items: HistorialJuezItem[] }) {
  const [abierto, setAbierto] = useState(true);

  return (
    <section className="space-y-3" data-testid="juez-historial">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between border px-4 py-3 text-left"
        style={{ borderColor: `${JUEZ_IRON}28` }}
        data-testid="juez-historial-toggle"
      >
        <span
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: JUEZ_IRON }}
        >
          Historial de Auditorías
        </span>
        <span className="text-[11px] text-white/40">
          {items.length === 0
            ? "vacío"
            : `${items.length} ${items.length === 1 ? "sesión" : "sesiones"}`}
        </span>
      </button>

      {abierto && items.length === 0 && (
        <p className="px-1 text-[12px] text-white/35">
          Todavía no hay dictámenes. El Juez guarda cada auditoría aquí.
        </p>
      )}

      {abierto &&
        items.map((item) => {
          const problema = principioDe(item.fase1.codigoProblemaDetectado);
          const techo = principioDe(item.fase1.codigoConquistadoMax);
          return (
            <article
              key={item.id}
              className="space-y-3 border bg-black/40 p-4"
              style={{ borderColor: `${JUEZ_IRON}22` }}
              data-testid={`juez-historial-item-${item.id}`}
            >
              <p
                className="text-[10px] tracking-[0.16em] uppercase"
                style={{ color: JUEZ_STEEL }}
              >
                {formatearFechaAuditoria(item.createdAt)}
              </p>
              <div>
                <p className="text-[9px] tracking-[0.2em] uppercase text-white/35">
                  ¿Cuál es tu problema?
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/80">
                  {item.textoVolcado}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <p className="text-[12px] text-white/70">
                  <span className="text-white/35">Código · </span>
                  C{problema.codigo} {problema.nombre}
                </p>
                <p className="text-[12px] text-white/70">
                  <span className="text-white/35">Perímetro · </span>
                  C1 → C{techo.codigo} {techo.nombre}
                </p>
                <p className="text-[12px] text-white/70 md:col-span-2">
                  <span className="text-white/35">Fuga · </span>
                  {item.fase1.fugaInconsciente}
                </p>
                <p className="text-[12px] text-white/70 md:col-span-2">
                  <span className="text-white/35">Lectura fría · </span>
                  {item.fase1.lecturaPerimetroFria}
                </p>
              </div>
              {item.fase2Desbloqueada && item.directivaOperacional ? (
                <p className="text-[12px] leading-relaxed text-white/85">
                  <span className="text-white/35">Directiva · </span>
                  {item.directivaOperacional}
                </p>
              ) : (
                <p className="text-[11px] text-white/35">
                  Directiva sellada. Aún no se desbloqueó.
                </p>
              )}
              <BotonCopiarAuditoria
                item={item}
                testId={`juez-copiar-${item.id}`}
              />
            </article>
          );
        })}
    </section>
  );
}
