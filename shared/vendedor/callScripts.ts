/**
 * Guiones del Vendedor — WhatsApp y resumen de voz.
 * Diagnóstico = códigos 1 / 2 / 3. Puerta comercial = siempre Jornada Base.
 * Tono de persona, no de catálogo.
 */

import type { CodigoNumero } from "../umbral/engineConfig.ts";
import type { PlanetaId } from "./planetasConfig.ts";
import { PUERTA_COMERCIAL_VENDEDOR } from "./planetasConfig.ts";
import { enlacePagoJornadaBase } from "./entradaComercial.ts";
import { clampCodigoJornadaBase } from "./triageLogic.ts";

export interface GuionLlamada {
  codigo: CodigoNumero;
  planeta: PlanetaId;
  puertaComercial: PlanetaId;
  /** Texto hablado en la llamada (TTS legacy / resumen). */
  voz: string;
  /** Mensaje WhatsApp con enlace de pago. */
  whatsapp: string;
}

const NUCLEO_HUMANO: Record<1 | 2 | 3, string> = {
  1: "Quedamos en esto: se te mezcla el día y no ves qué cerrar primero.",
  2: "Quedamos en esto: ya vas a tope y no quieres otra carga.",
  3: "Quedamos en esto: el día se te va entre incendios y no hay un cierre.",
};

export function construirGuionLlamada(
  codigo: CodigoNumero,
  planeta: PlanetaId,
  sellerRef?: string | null,
): GuionLlamada {
  const codigoJ = clampCodigoJornadaBase(codigo);
  const nucleo = NUCLEO_HUMANO[codigoJ];
  const link = enlacePagoJornadaBase(sellerRef);

  const voz = [
    "Hola, te llamo de Sistemicar.",
    nucleo,
    "La entrada es Jornada Base: mides lo que cierras hoy y el día termina con evidencia.",
    sellerRef ? `Si pagas, menciona ${sellerRef}.` : "",
    "Si no es el momento, déjalo. Gracias.",
  ]
    .filter(Boolean)
    .join(" ");

  const whatsapp = [
    "Hola, soy de Sistemicar.",
    nucleo,
    "Jornada Base es para medir lo que sí cierras hoy — no otra lista.",
    `Aquí tienes el enlace para activarla:\n${link}`,
    sellerRef ? `Al pagar, menciona ${sellerRef}.` : "",
    "Si no es el momento, déjalo. Sin drama.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    codigo: codigoJ,
    planeta,
    puertaComercial: PUERTA_COMERCIAL_VENDEDOR,
    voz,
    whatsapp,
  };
}
