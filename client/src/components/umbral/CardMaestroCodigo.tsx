import React from "react";
import { Compass } from "lucide-react";
import type { CodigoNumero, ModoUmbral } from "@shared/umbral/engineConfig";
import {
  obtenerFichaMaestro,
  resistencia1De,
  resistencia2De,
} from "@shared/umbral/maestroConfig";

const GOLD = "#D4AF37";
const CYAN = "#00FFC3";

export interface CardMaestroCodigoProps {
  codigo: CodigoNumero;
  modo: ModoUmbral;
}

/**
 * Voz del Maestro para el código activo.
 * Enseña la 2ª resistencia en el idioma del código — no consuela.
 */
export function CardMaestroCodigo({ codigo, modo }: CardMaestroCodigoProps) {
  const ficha = obtenerFichaMaestro(codigo);
  const r1 = resistencia1De(ficha, modo);
  const r2 = resistencia2De(ficha, modo);
  const sala = modo === "INTERNO_HABILIDAD" ? "Forja" : "Arena";

  return (
    <aside
      className="relative overflow-hidden border bg-black/50 p-4 sm:p-5"
      style={{
        borderColor: `${CYAN}55`,
        boxShadow: `inset 0 0 0 1px ${CYAN}14, 0 0 22px ${CYAN}10`,
      }}
      data-testid="umbral-v2-ficha-maestro"
      aria-label={`Maestro del código ${codigo}: ${ficha.voz}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${CYAN}, ${GOLD}, transparent)`,
        }}
      />

      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center border"
          style={{
            borderColor: `${CYAN}66`,
            background: `${CYAN}12`,
            color: CYAN,
          }}
          aria-hidden
        >
          <Compass size={22} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.22em] text-white/40">
            CARÁCTER-CÓDIGO · {sala.toUpperCase()} · CÓDIGO {codigo}
          </p>
          <h3
            className="mt-1 text-lg font-black text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            data-testid="umbral-v2-maestro-voz"
          >
            {ficha.voz}
          </h3>
          <p className="mt-1 text-xs text-white/50" data-testid="umbral-v2-maestro-caracter">
            {ficha.caracter}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-[10px] tracking-widest text-white/35">
            1ª RESISTENCIA · EL OBSTÁCULO
          </p>
          <p
            className="mt-1 text-sm leading-relaxed text-white/70"
            data-testid="umbral-v2-maestro-r1"
          >
            {r1}
          </p>
        </div>
        <div
          className="border p-3"
          style={{ borderColor: `${GOLD}44`, background: `${GOLD}0d` }}
        >
          <p
            className="text-[10px] tracking-widest"
            style={{ color: GOLD }}
          >
            2ª RESISTENCIA · LO QUE APRENDES ACÁ
          </p>
          <p
            className="mt-1.5 text-sm leading-relaxed text-white/85"
            data-testid="umbral-v2-maestro-r2"
          >
            {r2}
          </p>
        </div>
        <p className="text-xs leading-relaxed text-white/45" data-testid="umbral-v2-maestro-gesto">
          {ficha.gestoEnsenanza}
        </p>
      </div>
    </aside>
  );
}

export default CardMaestroCodigo;
