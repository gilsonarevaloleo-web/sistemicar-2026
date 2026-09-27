import React, { useState } from "react";
import { ChevronDown, Scale } from "lucide-react";
import {
  LEY_CRITERIO_VIVO_AXIOMAS,
  LEY_CRITERIO_VIVO_FIRMA,
  LEY_CRITERIO_VIVO_MARCA,
  LEY_CRITERIO_VIVO_NOMBRE,
  LEY_CRITERIO_VIVO_NO_ES,
  LEY_CRITERIO_VIVO_RITUAL,
  resumenCriterioVivo,
  type CriterioVivo,
} from "@shared/deposito/criterioMaestro";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

export function CardCriterioVivo({
  acervo,
}: {
  acervo: readonly CriterioVivo[];
}) {
  const [abierta, setAbierta] = useState(false);

  return (
    <section
      className="border bg-black/40 mb-6"
      style={{ borderColor: `${GOLD}44` }}
      data-testid="deposito-criterio-vivo"
    >
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        aria-expanded={abierta}
        data-testid="deposito-criterio-toggle"
      >
        <Scale
          size={16}
          className="mt-0.5 shrink-0"
          style={{ color: GOLD }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span
            className="block text-[10px] tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            {LEY_CRITERIO_VIVO_MARCA.toUpperCase()}
          </span>
          <span
            className="mt-0.5 block text-sm font-bold text-white"
            data-testid="deposito-criterio-nombre"
          >
            {LEY_CRITERIO_VIVO_NOMBRE}
          </span>
          <span
            className="mt-1 block text-xs leading-relaxed text-white/55"
            data-testid="deposito-criterio-resumen"
          >
            {acervo.length === 0
              ? LEY_CRITERIO_VIVO_FIRMA
              : resumenCriterioVivo(acervo)}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`mt-1 shrink-0 text-white/40 transition-transform ${abierta ? "rotate-180" : ""}`}
        />
      </button>

      {abierta && (
        <div
          className="space-y-3 border-t px-4 py-3"
          style={{ borderColor: `${GOLD}22` }}
          data-testid="deposito-criterio-cuerpo"
        >
          <p
            className="text-[10px] tracking-widest"
            style={{ color: AZURE }}
          >
            RITUAL · {LEY_CRITERIO_VIVO_RITUAL.toUpperCase()}
          </p>
          {LEY_CRITERIO_VIVO_AXIOMAS.map((a) => (
            <div key={a.id}>
              <p
                className="text-[10px] tracking-widest"
                style={{ color: AZURE }}
              >
                {a.titulo.toUpperCase()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                {a.texto}
              </p>
            </div>
          ))}
          {acervo.length > 0 && (
            <ol
              className="space-y-2"
              data-testid="deposito-criterio-lista"
            >
              {acervo.map((c) => (
                <li
                  key={c.id}
                  className="text-xs leading-relaxed text-white/70"
                >
                  <span className="font-bold text-white/85">
                    C{c.codigo}
                  </span>
                  {" · "}
                  {c.origen === "correccion" ? "corrección" : "sello"}
                  {" — "}
                  {c.enunciado}
                </li>
              ))}
            </ol>
          )}
          <p className="text-[11px] leading-relaxed text-white/40">
            {LEY_CRITERIO_VIVO_NO_ES.join(" ")}
          </p>
        </div>
      )}
    </section>
  );
}

export default CardCriterioVivo;
