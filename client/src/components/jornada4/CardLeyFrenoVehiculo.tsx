import React, { useState } from "react";
import { ChevronDown, Pause } from "lucide-react";
import {
  LEY_FRENO_VEHICULO_AXIOMAS,
  LEY_FRENO_VEHICULO_FIRMA,
  LEY_FRENO_VEHICULO_MARCA,
  LEY_FRENO_VEHICULO_NOMBRE,
  LEY_FRENO_VEHICULO_NO_ES,
  LEY_FRENO_VEHICULO_RITUAL,
} from "@shared/jornada/leyFrenoVehiculo";
import { J4_COLORS } from "./Jornada4Shell";

const { GOLD } = J4_COLORS;
const CYAN = "#00FFC3";

/**
 * La ley nombrada, visible. Evita que lanzar se lea como burocracia o como lista.
 */
export function CardLeyFrenoVehiculo() {
  const [abierta, setAbierta] = useState(false);

  return (
    <section
      className="mx-1 mb-2 rounded-xl border bg-black/40"
      style={{ borderColor: `${GOLD}44` }}
      data-testid="jornada-ley-freno-vehiculo"
    >
      <button
        type="button"
        onClick={() => setAbierta(v => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        aria-expanded={abierta}
        data-testid="jornada-ley-freno-toggle"
      >
        <Pause
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
            {LEY_FRENO_VEHICULO_MARCA.toUpperCase()}
          </span>
          <span
            className="mt-0.5 block text-sm font-bold text-white"
            data-testid="jornada-ley-freno-nombre"
          >
            {LEY_FRENO_VEHICULO_NOMBRE}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-white/55">
            {LEY_FRENO_VEHICULO_FIRMA}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`mt-1 shrink-0 text-white/40 transition-transform ${abierta ? "rotate-180" : ""}`}
        />
      </button>

      {abierta ? (
        <div
          className="space-y-3 border-t px-4 py-3"
          style={{ borderColor: `${GOLD}22` }}
          data-testid="jornada-ley-freno-cuerpo"
        >
          <p
            className="text-[10px] tracking-widest"
            style={{ color: CYAN }}
          >
            RITUAL · {LEY_FRENO_VEHICULO_RITUAL.toUpperCase()}
          </p>
          {LEY_FRENO_VEHICULO_AXIOMAS.map(a => (
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
            {LEY_FRENO_VEHICULO_NO_ES.join(" ")}
          </p>
        </div>
      ) : null}
    </section>
  );
}

export default CardLeyFrenoVehiculo;
