import React, { useState } from "react";
import { ChevronDown, Pause } from "lucide-react";
import {
  LEY_FRENO_VEHICULO_AXIOMAS,
  LEY_FRENO_VEHICULO_FIRMA,
  LEY_FRENO_VEHICULO_MARCA,
  LEY_FRENO_VEHICULO_RITUAL,
} from "@shared/jornada/leyFrenoVehiculo";
import { J4_COLORS } from "./Jornada4Shell";

const { GOLD, MUTED } = J4_COLORS;

const AXIOMAS_LANZAMIENTO = LEY_FRENO_VEHICULO_AXIOMAS.filter(
  a => a.id === "freno" || a.id === "imagen" || a.id === "habito"
);

type Props = {
  /** compact = una línea + expandir. sheet = ritual + firma + expandir. */
  variant?: "compact" | "sheet";
};

/**
 * Pista en el gesto de nombrar. No es un tutorial: es el freno, en el sitio del nombre.
 */
export function LeyFrenoHint({ variant = "sheet" }: Props) {
  const [abierta, setAbierta] = useState(false);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: `${GOLD}28`,
        backgroundColor: "rgba(212,175,55,0.06)",
      }}
      data-testid="jornada-ley-freno-hint"
      data-variant={variant}
    >
      <button
        type="button"
        onClick={() => setAbierta(v => !v)}
        className="w-full flex items-start gap-2 px-3 py-2 text-left touch-manipulation"
        aria-expanded={abierta}
        data-testid="jornada-ley-freno-hint-toggle"
      >
        <Pause
          size={12}
          className="mt-0.5 shrink-0"
          style={{ color: GOLD }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span
            className="block text-[8px] font-black uppercase tracking-[0.18em]"
            style={{ color: GOLD }}
          >
            {LEY_FRENO_VEHICULO_MARCA}
          </span>
          <span
            className="mt-0.5 block text-[10px] leading-snug"
            style={{ color: MUTED }}
          >
            {variant === "sheet" ? LEY_FRENO_VEHICULO_RITUAL : LEY_FRENO_VEHICULO_FIRMA}
          </span>
        </span>
        <ChevronDown
          size={12}
          className={`mt-0.5 shrink-0 text-white/35 transition-transform ${abierta ? "rotate-180" : ""}`}
        />
      </button>
      {abierta ? (
        <div
          className="space-y-2 border-t px-3 py-2"
          style={{ borderColor: `${GOLD}18` }}
          data-testid="jornada-ley-freno-hint-cuerpo"
        >
          <p className="text-[10px] leading-snug" style={{ color: MUTED }}>
            {LEY_FRENO_VEHICULO_FIRMA}
          </p>
          {AXIOMAS_LANZAMIENTO.map(a => (
            <p key={a.id} className="text-[10px] leading-snug" style={{ color: MUTED }}>
              <span className="font-bold" style={{ color: GOLD }}>
                {a.titulo}.{" "}
              </span>
              {a.texto}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
