/**
 * Diálogo de la vendedora (Twilio <Gather> DTMF + voz).
 * Tono conversacional. Solo Jornada Base, códigos 1 / 2 / 3.
 * No nombra Umbral ni Espejo.
 *
 * Flujo:
 *   open  → ¿Te suena lo que marcaste? (1=sí / 2=no)
 *   mirror → te ofrezco mandar el enlace por WhatsApp
 *   end   → si dijo que sí (o que lo vea después), se envía el enlace
 */

import type { CodigoNumero } from "../umbral/engineConfig.ts";
import {
  PUERTA_COMERCIAL_VENDEDOR,
  type PlanetaId,
} from "./planetasConfig.ts";
import {
  clampCodigoJornadaBase,
  type CodigoJornadaBase,
} from "./triageLogic.ts";

export type DialogStep = "open" | "mirror";

function cleanSpeech(text: string): string {
  return text
    .replace(/[«»""]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s([.…])/g, "$1")
    .trim();
}

function beats(parts: string[]): string[] {
  return parts.map(cleanSpeech).filter(Boolean);
}

function joinBeats(parts: string[]): string {
  return beats(parts).join(" ");
}

const APERTURA: Record<CodigoJornadaBase, string[]> = {
  1: [
    "Hola, te llamo de Sistemicar.",
    "Marcaste que no tienes claro qué cerrar primero. Que el día se te mezcla.",
    "¿Es eso lo que te está pasando hoy?",
    "Si sí, marca 1 o di sí. Si no, marca 2.",
  ],
  2: [
    "Hola, te llamo de Sistemicar.",
    "Dijiste que ya no das para una cosa más.",
    "No te voy a pedir que tires lo que usas. ¿Te suena eso, que estás a tope?",
    "Si sí, marca 1 o di sí. Si no, marca 2.",
  ],
  3: [
    "Hola, te llamo de Sistemicar.",
    "Vi que el día se te va entre incendios y al final no hay un cierre.",
    "¿Te pasa eso ahora?",
    "Si sí, marca 1 o di sí. Si no, marca 2.",
  ],
};

const MIRROR_SI: Record<CodigoJornadaBase, string[]> = {
  1: [
    "Vale. Entonces sin discurso.",
    "Jornada Base es para cortar esa niebla: eliges una unidad, la cierras, y el día tiene un número.",
    "Son veinticinco dólares al mes.",
    "¿Te mando el enlace de pago ahora por WhatsApp?",
    "Marca 1 y te lo envío. Marca 2 si lo quieres ver después.",
  ],
  2: [
    "Claro. No te pido que sueltes lo que ya tienes.",
    "Jornada Base se pone encima: mides lo que cierras hoy, sin otra lista infinita.",
    "Son veinticinco dólares al mes.",
    "¿Te mando el enlace de pago ahora por WhatsApp?",
    "Marca 1 y te lo envío. Marca 2 si lo quieres ver después.",
  ],
  3: [
    "Sí. Eso se siente: trabajar todo el día y no poder decir qué cerraste.",
    "Jornada Base es justo para eso. Un bloque, una unidad, el día termina con evidencia.",
    "Son veinticinco dólares al mes.",
    "¿Te mando el enlace de pago ahora por WhatsApp?",
    "Marca 1 y te lo envío. Marca 2 si lo quieres ver después.",
  ],
};

const MIRROR_NO: Record<CodigoJornadaBase, string[]> = {
  1: [
    "Entiendo. Aun así, lo que vimos es que te cuesta elegir qué cerrar primero.",
    "Jornada Base sirve para eso: una unidad, un cierre, un número.",
    "¿Quieres que te mande el enlace por WhatsApp?",
    "Marca 1 y te lo envío. Marca 2 para colgar.",
  ],
  2: [
    "Entiendo. Igual, si el día ya viene lleno, no tiene sentido sumar otra carga pesada.",
    "Jornada Base es liviana: mides lo que cierras, no te pide rearmar todo.",
    "¿Quieres que te mande el enlace por WhatsApp?",
    "Marca 1 y te lo envío. Marca 2 para colgar.",
  ],
  3: [
    "Bueno. Si no es exactamente eso, igual el patrón es el mismo: el día se evapora.",
    "Jornada Base corta eso. Mides lo que sí cierras.",
    "¿Quieres que te mande el enlace por WhatsApp?",
    "Marca 1 y te lo envío. Marca 2 para colgar.",
  ],
};

export type DialogTurns = {
  codigo: CodigoJornadaBase;
  /** Planeta de grieta (diagnóstico). La venta siempre va a Jornada. */
  planeta: PlanetaId;
  puertaComercial: PlanetaId;
  opener: string;
  openerBeats: string[];
  mirrorSi: string;
  mirrorSiBeats: string[];
  mirrorNo: string;
  mirrorNoBeats: string[];
  ctaSi: string;
  ctaSiBeats: string[];
  ctaSiSinWhatsapp: string;
  ctaSiSinWhatsappBeats: string[];
  ctaNo: string;
  ctaNoBeats: string[];
  ctaNoSinWhatsapp: string;
  ctaNoSinWhatsappBeats: string[];
  timeoutOpen: string;
  timeoutOpenBeats: string[];
  timeoutMirror: string;
  timeoutMirrorBeats: string[];
};

export function buildDialogTurns(
  codigo: CodigoNumero,
  planeta: PlanetaId,
  sellerRef?: string | null,
): DialogTurns {
  const codigoJ = clampCodigoJornadaBase(codigo);
  const refNota = sellerRef
    ? ` Si pagas, menciona ${sellerRef}.`
    : "";

  const openerBeats = beats(APERTURA[codigoJ]);
  const mirrorSiBeats = beats([
    ...MIRROR_SI[codigoJ],
    refNota.trim(),
  ]);
  const mirrorNoBeats = beats(MIRROR_NO[codigoJ]);
  const ctaSiBeats = beats([
    "Listo. Te acabo de mandar el enlace por WhatsApp.",
    "Ábrelo cuando cuelgues. Es Jornada Base, veinticinco al mes.",
    refNota.trim(),
    "Gracias por el rato. Cuídate.",
  ]);
  const ctaSiSinWhatsappBeats = beats([
    "Listo. Al colgar te dejo el enlace por WhatsApp.",
    "Es Jornada Base, veinticinco al mes.",
    refNota.trim(),
    "Gracias por el rato. Cuídate.",
  ]);
  const ctaNoBeats = beats([
    "Sin problema.",
    "Te dejo igual el enlace por WhatsApp, por si más tarde te late.",
    "Que te vaya bien.",
  ]);
  const ctaNoSinWhatsappBeats = beats([
    "Sin problema.",
    "Cuando quieras, el enlace está en sistemicar punto app, pagos.",
    "Que te vaya bien.",
  ]);
  const timeoutOpenBeats = beats([
    "No te escuché marcar.",
    "Si quieres, te dejo el enlace de Jornada Base por WhatsApp.",
    "Hasta luego.",
  ]);
  const timeoutMirrorBeats = beats([
    "No te escuché marcar.",
    "Te dejo el enlace por WhatsApp por si quieres verlo con calma.",
    "Hasta luego.",
  ]);

  return {
    codigo: codigoJ,
    planeta,
    puertaComercial: PUERTA_COMERCIAL_VENDEDOR,
    opener: joinBeats(openerBeats),
    openerBeats,
    mirrorSi: joinBeats(mirrorSiBeats),
    mirrorSiBeats,
    mirrorNo: joinBeats(mirrorNoBeats),
    mirrorNoBeats,
    ctaSi: joinBeats(ctaSiBeats),
    ctaSiBeats,
    ctaSiSinWhatsapp: joinBeats(ctaSiSinWhatsappBeats),
    ctaSiSinWhatsappBeats,
    ctaNo: joinBeats(ctaNoBeats),
    ctaNoBeats,
    ctaNoSinWhatsapp: joinBeats(ctaNoSinWhatsappBeats),
    ctaNoSinWhatsappBeats,
    timeoutOpen: joinBeats(timeoutOpenBeats),
    timeoutOpenBeats,
    timeoutMirror: joinBeats(timeoutMirrorBeats),
    timeoutMirrorBeats,
  };
}

/** Normaliza Digits / SpeechResult de Twilio a "1" | "2" | null. */
export function parseGatherChoice(input: {
  digits?: string | null;
  speech?: string | null;
}): "1" | "2" | null {
  const d = String(input.digits || "").replace(/\D/g, "").slice(0, 1);
  if (d === "1" || d === "2") return d;

  const s = String(input.speech || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!s.trim()) return null;
  if (
    /\b(si|yes|uno|1|claro|ok|dale|vamos|vale|bueno|manda|envia|quiero)\b/.test(
      s,
    )
  ) {
    return "1";
  }
  if (
    /\b(no|dos|2|luego|despues|nah|ahora no|pensarlo)\b/.test(s)
  ) {
    return "2";
  }
  return null;
}
