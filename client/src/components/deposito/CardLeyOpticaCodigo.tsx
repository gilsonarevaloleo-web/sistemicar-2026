import React, { useState } from "react";
import { ChevronDown, Eye } from "lucide-react";
import {
  LEY_OPTICA_CODIGO_AXIOMAS,
  LEY_OPTICA_CODIGO_FIRMA,
  LEY_OPTICA_CODIGO_MARCA,
  LEY_OPTICA_CODIGO_NOMBRE,
  LEY_OPTICA_CODIGO_NO_ES,
  LEY_OPTICA_CODIGO_OJOS,
  LEY_OPTICA_CODIGO_RITUAL,
} from "@shared/deposito/leyOpticaCodigo";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

/**
 * La ley nombrada, visible. Evita que el Depósito se lea como diario o como chakra.
 */
export function CardLeyOpticaCodigo() {
  const [abierta, setAbierta] = useState(false);

  return (
    <section
      className="border bg-black/40 mb-6"
      style={{ borderColor: `${GOLD}44` }}
      data-testid="deposito-ley-optica-codigo"
    >
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        aria-expanded={abierta}
        data-testid="deposito-ley-toggle"
      >
        <Eye
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
            {LEY_OPTICA_CODIGO_MARCA.toUpperCase()}
          </span>
          <span
            className="mt-0.5 block text-sm font-bold text-white"
            data-testid="deposito-ley-nombre"
          >
            {LEY_OPTICA_CODIGO_NOMBRE}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-white/55">
            {LEY_OPTICA_CODIGO_FIRMA}
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
          data-testid="deposito-ley-cuerpo"
        >
          <p
            className="text-[10px] tracking-widest"
            style={{ color: AZURE }}
          >
            RITUAL · {LEY_OPTICA_CODIGO_RITUAL.toUpperCase()}
          </p>
          {LEY_OPTICA_CODIGO_AXIOMAS.map((a) => (
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
          <div data-testid="deposito-ley-ojos">
            <p
              className="text-[10px] tracking-widest mb-2"
              style={{ color: GOLD }}
            >
              LOS DIEZ OJOS
            </p>
            <ol className="space-y-1.5">
              {LEY_OPTICA_CODIGO_OJOS.map((ojo) => (
                <li
                  key={ojo.codigo}
                  className="text-xs leading-relaxed text-white/65"
                >
                  <span className="font-bold text-white/85">
                    C{ojo.codigo} {ojo.nombre}
                  </span>
                  {" — "}
                  {ojo.ve}
                </li>
              ))}
            </ol>
          </div>
          <p className="text-[11px] leading-relaxed text-white/40">
            {LEY_OPTICA_CODIGO_NO_ES.join(" ")}
          </p>
        </div>
      )}
    </section>
  );
}

export default CardLeyOpticaCodigo;
