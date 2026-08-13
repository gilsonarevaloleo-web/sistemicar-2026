/**
 * Guiones del Vendedor Algorítmico por Código (fase llamadas).
 * Text corto para TTS (Twilio Say) y WhatsApp.
 */

import type { CodigoNumero } from "../umbral/engineConfig.ts";
import type { PlanetaId } from "./planetasConfig.ts";
import { PLANETAS } from "./planetasConfig.ts";

export interface GuionLlamada {
  codigo: CodigoNumero;
  planeta: PlanetaId;
  /** Texto hablado en la llamada (TTS). */
  voz: string;
  /** Mensaje WhatsApp si no contesta. */
  whatsapp: string;
}

const CIERRES: Record<PlanetaId, { voz: string; wa: string }> = {
  ESPEJO: {
    voz: "Tu puerta es el Espejo: limpiezas por créditos, sin suscripción. Entra en sistemicar punto app barra pagos, plan espejo inicio.",
    wa: "Tu puerta: *El Espejo* (créditos). → https://sistemicar.app/pagos?plan=espejo_inicio",
  },
  JORNADA: {
    voz: "Tu puerta es la Jornada Base: medir unidades y cerrar el día. Entra en sistemicar punto app barra pagos, plan planificacion base.",
    wa: "Tu puerta: *La Jornada Base*. → https://sistemicar.app/pagos?plan=planificacion_base",
  },
  UMBRAL: {
    voz: "Tu puerta es el Umbral: prueba el Código uno gratis en la Forja. Entra en sistemicar punto app barra umbral barra entrada.",
    wa: "Tu puerta: *El Umbral* (Código 1 gratis). → https://sistemicar.app/umbral/entrada",
  },
};

/** Núcleo del guion por código (independiente del planeta). */
const NUCLEO: Record<CodigoNumero, string> = {
  1: "Detectamos niebla de utilidad: no está claro para qué te sirve avanzar hoy.",
  2: "Detectamos sobrecarga: sientes que no das para una cosa más.",
  3: "Detectamos fuga de tiempo: el día se va sin cierre medible.",
  4: "Detectamos desconfianza por humo: ya te quemaron con promesas vacías.",
  5: "Detectamos fricción de números: pides ROI y el marco se diluye.",
  6: "Detectamos miedo o ansiedad que paraliza el siguiente paso.",
  7: "Detectamos fricción de precio: te cuesta cobrar o justificar el valor.",
  8: "Detectamos negociación compleja que estira la decisión.",
  9: "Detectamos dificultad de cierre: casi, pero no hay veredicto.",
  10: "Detectamos tema de autoridad y continuidad: quién sostiene el marco.",
};

export function construirGuionLlamada(
  codigo: CodigoNumero,
  planeta: PlanetaId,
  sellerRef?: string | null,
): GuionLlamada {
  const cierre = CIERRES[planeta];
  const planetaLabel = PLANETAS[planeta].label;
  const nucleo = NUCLEO[codigo];
  const refNota = sellerRef
    ? ` Menciona el código de referido ${sellerRef} al pagar.`
    : "";

  const voz = [
    "Hola. Soy el vendedor de Sistemicar.",
    nucleo,
    `Tu planeta de entrada es ${planetaLabel}, Código ${codigo}.`,
    cierre.voz,
    refNota.trim(),
    "Si no es el momento, ignora este mensaje. Gracias.",
  ]
    .filter(Boolean)
    .join(" ");

  const whatsapp = [
    `SISTEMICAR — Código ${codigo} · ${planetaLabel}`,
    nucleo,
    cierre.wa + (sellerRef ? `&ref=${encodeURIComponent(sellerRef)}` : ""),
    "Pediste que te llamáramos. Si no aplica, ignora este mensaje.",
  ].join("\n\n");

  return { codigo, planeta, voz, whatsapp };
}
