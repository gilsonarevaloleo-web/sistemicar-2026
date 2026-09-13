import React, { useState } from "react";
import { ChevronDown, Scale } from "lucide-react";
import {
  LEY_CARACTER_CODIGO_AXIOMAS,
  LEY_CARACTER_CODIGO_FIRMA,
  LEY_CARACTER_CODIGO_MARCA,
  LEY_CARACTER_CODIGO_NOMBRE,
  LEY_CARACTER_CODIGO_NO_ES,
} from "@shared/umbral/leyCaracterCodigo";

const GOLD = "#D4AF37";
const CYAN = "#00FFC3";

/**
 * La ley nombrada, visible. Evita que el Umbral se lea como quiz o como coach.
 */
export function CardLeyCaracterCodigo() {
  const [abierta, setAbierta] = useState(false);

  return (
    <section
      className="border bg-black/40"
      style={{ borderColor: `${GOLD}44` }}
      data-testid="umbral-ley-caracter-codigo"
    >
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        aria-expanded={abierta}
        data-testid="umbral-ley-toggle"
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
            {LEY_CARACTER_CODIGO_MARCA.toUpperCase()}
          </span>
          <span
            className="mt-0.5 block text-sm font-bold text-white"
            data-testid="umbral-ley-nombre"
          >
            {LEY_CARACTER_CODIGO_NOMBRE}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-white/55">
            {LEY_CARACTER_CODIGO_FIRMA}
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
          data-testid="umbral-ley-axiomas"
        >
          {LEY_CARACTER_CODIGO_AXIOMAS.map((a) => (
            <div key={a.id}>
              <p
                className="text-[10px] tracking-widest"
                style={{ color: CYAN }}
              >
                {a.titulo.toUpperCase()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                {a.texto}
              </p>
            </div>
          ))}
          <p className="text-[11px] leading-relaxed text-white/40">
            {LEY_CARACTER_CODIGO_NO_ES.join(" ")}
          </p>
        </div>
      )}
    </section>
  );
}

export default CardLeyCaracterCodigo;
