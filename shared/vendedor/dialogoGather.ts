/**
 * Diálogo nivel B del Vendedor Algorítmico (Twilio <Gather> DTMF).
 * Usa psicología Umbral (modoExterno) + puerta del planeta.
 *
 * Flujo:
 *   open  → ¿Te suena el código? (1=sí / 2=no)
 *   mirror → seducción + CTA (1=quiero la puerta / 2=no)
 *   end   → cierre
 */

import {
  DICCIONARIO_CODIGOS,
  type CodigoNumero,
} from "../umbral/engineConfig.ts";
import { PLANETAS, type PlanetaId } from "./planetasConfig.ts";

export type DialogStep = "open" | "mirror";

/** Respuesta hablada al cliente cuando confirma el código (seducción corta). */
const RESPUESTA_CODIGO: Record<CodigoNumero, string> = {
  1: "Te sirve para una cosa concreta: cortar la niebla y ver qué sí te mueve hoy, sin discurso vacío.",
  2: "No te pedimos tirar lo que ya tienes. Sumamos un sistema ligero encima, con menos carga.",
  3: "No es una agenda infinita. El primer paso cabe en un bloque corto y medible, hoy.",
  4: "Sin floritura: límites claros, evidencia y una ruta seria. Si huele a humo, no es Sistemicar.",
  5: "Hablamos en números: costo, retorno esperado y un rango honesto. Sin cuento.",
  6: "Bajamos la ansiedad con una prueba concreta, de bajo roce, para que sientas control.",
  7: "El precio sostiene un intercambio justo: qué recibes y qué se pierde al elegir lo barato.",
  8: "No estiramos el proceso. Sostenemos el marco y el siguiente paso queda claro ahora.",
  9: "No es un pico que se cae al mes: es un sistema que se sostiene después del cierre.",
  10: "No desaparecemos al cobrar. Aquí hay referente y continuidad, no un producto huérfano.",
};

const CIERRE_VOZ: Record<PlanetaId, string> = {
  ESPEJO:
    "Tu puerta es el Espejo: limpiezas por créditos, sin suscripción. En sistemicar punto app, pagos, plan espejo inicio.",
  JORNADA:
    "Tu puerta es la Jornada Base: medir unidades y cerrar el día. En sistemicar punto app, pagos, plan planificacion base.",
  UMBRAL:
    "Tu puerta es el Umbral: prueba el Código uno gratis en la Forja. En sistemicar punto app, umbral, entrada.",
};

function cleanSpeech(text: string): string {
  return text
    .replace(/[«»""]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s([.…])/g, "$1")
    .trim();
}

export type DialogTurns = {
  codigo: CodigoNumero;
  planeta: PlanetaId;
  /** Pregunta 1: ¿te suena? */
  opener: string;
  /** Tras 1 (sí): seducción + oferta de puerta */
  mirrorSi: string;
  /** Tras 2 (no): reencuadre suave + oferta */
  mirrorNo: string;
  /** Tras 1 en mirror: confirma puerta */
  ctaSi: string;
  /** Tras 2 en mirror: cierra sin presión */
  ctaNo: string;
  /** Timeout / sin dígito */
  timeoutOpen: string;
  timeoutMirror: string;
};

export function buildDialogTurns(
  codigo: CodigoNumero,
  planeta: PlanetaId,
  sellerRef?: string | null,
): DialogTurns {
  const cfg = DICCIONARIO_CODIGOS[codigo];
  const ext = cfg.modoExterno;
  const planetaLabel = PLANETAS[planeta].label;
  const frase = cleanSpeech(ext.fraseTipica);
  const arquetipo = cleanSpeech(ext.arquetipoNombre);
  const respuesta = RESPUESTA_CODIGO[codigo];
  const cierre = CIERRE_VOZ[planeta];
  const refNota = sellerRef
    ? ` Al pagar, menciona el referido ${sellerRef}.`
    : "";

  return {
    codigo,
    planeta,
    opener: cleanSpeech(
      [
        "Hola. Soy la vendedora de Sistemicar.",
        `Por tu diagnóstico entramos al Código ${codigo}: ${arquetipo}.`,
        `La objeción típica suena así: ${frase}`,
        "¿Te suena?",
        "Marca uno si sí. Marca dos si no.",
      ].join(" "),
    ),
    mirrorSi: cleanSpeech(
      [
        "Bien. Entonces vamos al grano.",
        respuesta,
        `Tu planeta de entrada es ${planetaLabel}.`,
        cierre,
        refNota,
        "Si quieres entrar ahora, marca uno. Si prefieres pensarlo, marca dos.",
      ]
        .filter(Boolean)
        .join(" "),
    ),
    mirrorNo: cleanSpeech(
      [
        "Entiendo. Aun así, el patrón que vimos apunta a este bloqueo.",
        respuesta,
        `La puerta que te corresponde es ${planetaLabel}.`,
        cierre,
        "Marca uno si quieres la puerta. Marca dos para colgar.",
      ].join(" "),
    ),
    ctaSi: cleanSpeech(
      [
        "Perfecto.",
        cierre,
        refNota,
        "Abre ese enlace cuando cuelgue. Gracias por pedirnos la llamada. Hasta luego.",
      ]
        .filter(Boolean)
        .join(" "),
    ),
    ctaNo: cleanSpeech(
      "Sin presión. Si más tarde quieres, te dejamos la puerta por WhatsApp. Hasta luego.",
    ),
    timeoutOpen: cleanSpeech(
      [
        "No recibí tu marca.",
        `Tu puerta es ${planetaLabel}.`,
        cierre,
        "Hasta luego.",
      ].join(" "),
    ),
    timeoutMirror: cleanSpeech(
      [
        "No recibí tu marca.",
        cierre,
        "Puedes entrar cuando quieras. Hasta luego.",
      ].join(" "),
    ),
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
  if (/\b(si|sí|yes|uno|1|claro|ok|dale|vamos)\b/.test(s)) return "1";
  if (/\b(no|dos|2|luego|despues|después|nah)\b/.test(s)) return "2";
  return null;
}
