/**
 * Carta corta de Jornada Base para tráfico frío (anuncio de Facebook).
 * Cuerpo canónico de /jornada-base.
 *
 * No menciona Ritmo, Dirección, Universidad ni telemetría.
 * No ofrece trial ni 500 PS. Un solo precio. Un solo CTA.
 * La carta larga (/ventas-jornada) se guarda para quien ya mide.
 */

import { SKU_BASE } from "./planificacionPricing.ts";
import { textoOfreceTrial } from "./jornadaCartaVenta.ts";

export const CARTA_FRIA_PATH = "/jornada-base";

export const CARTA_FRIA_KICKER = "SISTEMICAR · JORNADA BASE";

export const CARTA_FRIA_TITULAR =
  "No tienes un problema de disciplina. Tienes una fuga invisible en tu tiempo.";

export const CARTA_FRIA_SUBTITULAR =
  "Mide exactamente dónde se va tu día — en menos de 3 minutos, sin listas, sin fuerza de voluntad.";

export const CARTA_FRIA_PROBLEMA = {
  label: "El problema",
  lead:
    "Si trabajas por volumen o por tareas y sientes que el día se te escapa sin saber bien por qué, el problema no es que te falte organización. Es que nadie te está diciendo, en tiempo real, cuánto te está costando cada tarea — ni a qué hora vas a terminar de verdad.",
  numeros:
    "Cuando no mides tu tiempo por tarea, la desviación promedio de entrega es del 87%: un trabajo de 8 días se te va a 15.",
} as const;

export const CARTA_FRIA_SOLUCION = {
  label: "La solución",
  text:
    "Jornada Base es el sistema que mide cada tarea mientras la haces y te dice, en vivo, si vas ganando o perdiendo tiempo — y a qué hora vas a cerrar el día.",
} as const;

export const CARTA_FRIA_PASOS = [
  {
    n: 1,
    text: "Anotas la tarea y cuántas unidades tienes que hacer.",
  },
  {
    n: 2,
    text: "Aprietas play. El sistema mide tu ritmo real, minuto a minuto.",
  },
  {
    n: 3,
    text: "Ves al instante tu hora de cierre proyectada y si vas adelantado o atrasado.",
  },
] as const;

export const CARTA_FRIA_PRECIO_USD = SKU_BASE.priceUsd;
export const CARTA_FRIA_PRECIO_LINE = `$${SKU_BASE.priceUsd}/mes. Menos de $1 al día.`;

export const CARTA_FRIA_BENEFICIOS = [
  "Mide cada tarea en tiempo real",
  "Calcula tu hora exacta de cierre",
  "Te dice si vas ganando o perdiendo tiempo, al instante",
  "Guarda tu avance aunque pauses o te interrumpan",
] as const;

export const CARTA_FRIA_CTA = "Activar mi Jornada ahora";
export const CARTA_FRIA_CTA_PRECIO = `$${SKU_BASE.priceUsd}/mes`;

export const CARTA_FRIA_CIERRE =
  "Pruébalo hoy. Si en los primeros minutos sientes que no es para ti, cancelas sin complicación.";

export const CARTA_FRIA_CAPTURA = {
  tarea: "Pegado de etiqueta",
  timer: "09:06",
  restantes: "18 unidades restantes",
  termina: "21:59",
  formula: "18 u × 0.5 min/u = 10 min obj",
} as const;

export const CARTA_FRIA_GUION = {
  audio:
    "¿Sientes que tu día se va sin saber en qué? No es falta de disciplina. Es que nadie está midiendo tu tiempo real. Esto es Jornada Base: cada tarea, cronometrada en vivo. Sabes tu ritmo. Sabes tu hora de cierre. Sabes si vas ganando o perdiendo tiempo — al instante. Jornada Base. Menos de un dólar al día. Actívala ahora.",
  beats: [
    {
      t: "0-3s",
      audio: "¿Sientes que tu día se va sin saber en qué?",
      imagen: "Pantalla de inicio de Jornada, lista de vehículos",
    },
    {
      t: "3-6s",
      audio:
        "No es falta de disciplina. Es que nadie está midiendo tu tiempo real.",
      imagen: "Cronómetro arrancando (00:00:00 → corriendo)",
    },
    {
      t: "6-11s",
      audio: "Esto es Jornada Base: cada tarea, cronometrada en vivo.",
      imagen: 'Pantalla "Pegado de etiqueta", 09:06, contador bajando',
    },
    {
      t: "11-15s",
      audio:
        "Sabes tu ritmo. Sabes tu hora de cierre. Sabes si vas ganando o perdiendo tiempo.",
      imagen: '"Termina a las 21:59" / "Fin ≈ 23:02" en pantalla',
    },
    {
      t: "15-18s",
      audio: "Jornada Base. Menos de un dólar al día.",
      imagen: "Pantalla de precio, $24.99/mes",
    },
    {
      t: "18-20s",
      audio: "Actívala ahora.",
      imagen: "Logo Sistemicar",
    },
  ],
} as const;

const ESCALERA_RE =
  /jornada\s+ritmo|ritmo\s+y\s+direcci|direcci[oó]n|universidad|\bnorte\b|telemetr[ií]a|ring de conquista|reloj proyectivo/i;

export function cartaFriaPublicText(): string {
  return [
    CARTA_FRIA_KICKER,
    CARTA_FRIA_TITULAR,
    CARTA_FRIA_SUBTITULAR,
    CARTA_FRIA_PROBLEMA.lead,
    CARTA_FRIA_PROBLEMA.numeros,
    CARTA_FRIA_SOLUCION.text,
    ...CARTA_FRIA_PASOS.map((p) => p.text),
    CARTA_FRIA_PRECIO_LINE,
    ...CARTA_FRIA_BENEFICIOS,
    CARTA_FRIA_CTA,
    CARTA_FRIA_CTA_PRECIO,
    CARTA_FRIA_CIERRE,
    CARTA_FRIA_GUION.audio,
  ].join("\n");
}

export function cartaFriaOfreceTrial(): boolean {
  return textoOfreceTrial(cartaFriaPublicText());
}

export function cartaFriaMencionaEscalera(): boolean {
  return ESCALERA_RE.test(cartaFriaPublicText());
}
