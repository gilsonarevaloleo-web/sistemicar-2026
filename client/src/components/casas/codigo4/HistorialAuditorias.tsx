import React, { useEffect, useMemo, useState } from "react";
import {
  formatearFechaAuditoria,
  principioDe,
  type HistorialJuezItem,
} from "@shared/casas/codigo4";
import { BotonCopiarAuditoria } from "./BotonCopiarAuditoria";
import { JUEZ_IRON, JUEZ_STEEL } from "./LienzoEntrada";

function recorte(texto: string, max = 52): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max).trim()}…`;
}

export function HistorialAuditorias({ items }: { items: HistorialJuezItem[] }) {
  const [elegidoId, setElegidoId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0) {
      setElegidoId("");
      return;
    }
    if (!items.some((item) => item.id === elegidoId)) {
      setElegidoId(items[0].id);
    }
  }, [items, elegidoId]);

  const elegido = useMemo(
    () => items.find((item) => item.id === elegidoId) ?? null,
    [items, elegidoId],
  );

  return (
    <section className="space-y-3" data-testid="juez-historial">
      <div
        className="space-y-2 border px-4 py-3"
        style={{ borderColor: `${JUEZ_IRON}28` }}
      >
        <p
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: JUEZ_IRON }}
        >
          Historial de Auditorías
        </p>
        {items.length === 0 ? (
          <p className="text-[12px] text-white/35">
            Todavía no hay dictámenes. El Juez guarda cada auditoría aquí.
          </p>
        ) : (
          <select
            value={elegidoId}
            onChange={(e) => setElegidoId(e.target.value)}
            className="w-full bg-black/70 px-3 py-2 text-[12px] text-white outline-none"
            style={{ border: `1px solid ${JUEZ_IRON}44`, color: JUEZ_IRON }}
            data-testid="juez-historial-reductor"
          >
            {items.map((item) => {
              const problema = principioDe(item.fase1.codigoProblemaDetectado);
              return (
                <option key={item.id} value={item.id}>
                  {formatearFechaAuditoria(item.createdAt)} · C{problema.codigo}{" "}
                  {problema.nombre} · {recorte(item.textoVolcado)}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {elegido && (
        <article
          className="space-y-3 border bg-black/40 p-4"
          style={{ borderColor: `${JUEZ_IRON}22` }}
          data-testid={`juez-historial-item-${elegido.id}`}
        >
          <p
            className="text-[10px] tracking-[0.16em] uppercase"
            style={{ color: JUEZ_STEEL }}
          >
            {formatearFechaAuditoria(elegido.createdAt)}
          </p>
          <details className="group">
            <summary
              className="cursor-pointer text-[9px] tracking-[0.2em] uppercase text-white/35"
              data-testid="juez-historial-volcado"
            >
              ¿Cuál es tu problema? · ver volcado
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              {elegido.textoVolcado}
            </p>
          </details>
          <div className="grid gap-3 md:grid-cols-2">
            <p className="text-[12px] text-white/70">
              <span className="text-white/35">Código · </span>
              C{principioDe(elegido.fase1.codigoProblemaDetectado).codigo}{" "}
              {principioDe(elegido.fase1.codigoProblemaDetectado).nombre}
            </p>
            <p className="text-[12px] text-white/70">
              <span className="text-white/35">Perímetro · </span>
              C1 → C{principioDe(elegido.fase1.codigoConquistadoMax).codigo}{" "}
              {principioDe(elegido.fase1.codigoConquistadoMax).nombre}
            </p>
            <p className="text-[12px] text-white/70 md:col-span-2">
              <span className="text-white/35">Fuga · </span>
              {elegido.fase1.fugaInconsciente}
            </p>
            <p className="text-[12px] text-white/70 md:col-span-2">
              <span className="text-white/35">Lectura fría · </span>
              {elegido.fase1.lecturaPerimetroFria}
            </p>
          </div>
          {elegido.fase2Desbloqueada && elegido.directivaOperacional ? (
            <p className="text-[12px] leading-relaxed text-white/85">
              <span className="text-white/35">Directiva · </span>
              {elegido.directivaOperacional}
            </p>
          ) : (
            <p className="text-[11px] text-white/35">
              Directiva sellada. Aún no se desbloqueó.
            </p>
          )}
          <BotonCopiarAuditoria
            item={elegido}
            testId={`juez-copiar-${elegido.id}`}
          />
        </article>
      )}
    </section>
  );
}
