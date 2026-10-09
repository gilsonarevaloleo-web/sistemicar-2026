/**
 * Carta de venta maestra de Jornada Base.
 * Cuerpo canónico de /ventas-jornada.
 *
 * No ofrece trial ni 500 PS. La escalera ancla el precio;
 * solo Base se compra en esta puerta.
 */

import {
  PLANIFICACION_STACKS,
  SKU_BASE,
} from "./planificacionPricing.ts";

const STACK_RITMO = PLANIFICACION_STACKS.find((s) => s.id === "ritmo")!;
const STACK_NORTE = PLANIFICACION_STACKS.find((s) => s.id === "norte")!;

export const CARTA_KICKER = "SISTEMICAR · JORNADA BASE";

export const CARTA_TITULAR =
  "No tienes un problema de disciplina. Tienes una fuga invisible en la telemetría de tu tiempo.";

export const CARTA_SUBTITULAR =
  "Descubre la plataforma de ejecución operativa que transforma las listas de tareas agotadoras en un motor de precisión, alargando tu día y eliminando la ceguera de producción desde el primer bloque.";

export const CARTA_CTA_BASE = "Activar Jornada Base";
export const CARTA_CTA_FINAL = "Activar mi Jornada de Sistemicar ahora";
export const CARTA_CTA_VENDEDOR = "Que me llame";

export const CARTA_PRECIO_BASE_USD = SKU_BASE.priceUsd;
export const CARTA_PRECIO_BASE_PEN = SKU_BASE.pricePen;
export const CARTA_PRECIO_RITMO_USD = STACK_RITMO.totalUsd;
export const CARTA_PRECIO_DIRECCION_USD = STACK_NORTE.totalUsd;

export function formatUsdMes(usd: number): string {
  return `$${usd}/mes`;
}

export const CARTA_DIAGNOSTICO = {
  label: "I · El diagnóstico · La mancha mental",
  lead:
    "Comprendo que estás con prisa y dudas de todas las promesas sobre «hacerte más productivo». La mayoría de esas propuestas son una pérdida de tiempo. Solo te pido dos minutos para demostrarte, con datos reales, cómo vas a alargar tu día.",
  mancha:
    "Como buscador de optimización, te has empapado de herramientas: listas de pendientes, gestores de proyectos, apps de control de tiempo. Tu problema principal no es la falta de organización: es que todas esas listas te han generado una mancha mental. Ya no quieres ni pensar en ellas. Sientes que cualquier producto de gestión de tiempo te va a restar energía en lugar de sumar.",
  pregunta: "¿Por qué Sistemicar no viene a restarte, sino a sumar?",
  contrast: [
    {
      side: "listas" as const,
      title: "Listas tradicionales",
      text: "Trabajan con energía de deber. Los deberes dependen de la fuerza de voluntad y la disciplina agotadora.",
    },
    {
      side: "jornada" as const,
      title: "La Jornada de Sistemicar",
      text: "Trabaja con conciencia de tiempo. Es la energía del hazlo ahora.",
    },
  ],
  close:
    "¿Tu jornada laboral te parece plana y abrumadora? En la Jornada de Sistemicar eliminamos esos dos enemigos: partimos el día en 3 o 4 contenedores claros. Creas tus segmentos en menos de 5 minutos y lanzas tus vehículos de ejecución en menos de 3 minutos.",
} as const;

export const CARTA_TELEMETRIA = {
  label: "II · La revelación técnica · La telemetría",
  lead:
    "Si trabajas por volumen o unidades y caíste en un techo de producción, el enemigo no es la rutina: es que estás trabajando a ciegas. Un operador que no mide su producción por minutos no tiene una rutina; tiene una fuga de tiempo que no ve.",
  numeros:
    "Las historias no pagan cuentas. Hablemos de números fríos: cuando un profesional o equipo trabaja sin telemetría de tiempo, la desviación de entrega promedio es del 87% (una tarea de 8 días se estira a 15). La falta de un marco exacto genera una fuga de rendimiento de entre el 30% y el 40% únicamente por dispersión de atención.",
  marco:
    "La Jornada no es un anotador de tareas; es telemetría en 3 datos de precisión:",
  instrumentos: [
    {
      name: "Ring de conquista",
      text: "Cero costo de redefinición. Registras la unidad una vez y el objetivo se parametriza solo.",
    },
    {
      name: "Reloj Proyectivo",
      text: "Procesa tu velocidad histórica y calcula la hora exacta de cierre (ETA) de tus tareas en paralelo.",
    },
    {
      name: "Varianza en tiempo real (Reloj +/−)",
      text: "Calcula el saldo neto de tiempo ganado o perdido al cerrar cada tarea, dándote retroalimentación inmediata sobre la meta.",
    },
  ],
} as const;

export const CARTA_FRICCION = {
  label: "III · Fricción cero y balance de energía",
  c6Title: "Cero riesgo de perder el avance",
  c6:
    "¿Tienes que interrumpir la marcha para almorzar o atender una emergencia? Aprietas el botón verde y tu récord queda congelado y protegido. Regresas horas después, reanudas, y la planificación sigue intacta sin perder el trabajo acumulado.",
  prueba:
    "Al activar, lanzas un vehículo en 5 segundos. Si en medio minuto sientes la más mínima complicación, aprietas pausa, cierras la pantalla y no pasó nada.",
  c7Title: "La balanza de intercambio",
  c7:
    "Abundan herramientas gratuitas o de $5 si lo único que buscas es una lista estática impulsada por obligación. Pero Sistemicar es un motor de ejecución operativa que transforma el trabajo en energía de reto mediante el Descenso de Conteo y el Ring de conquista.",
} as const;

export type EscaleraTierId = "base" | "ritmo" | "direccion";

export type EscaleraTier = {
  id: EscaleraTierId;
  buyable: boolean;
  name: string;
  priceUsd: number;
  badge?: string;
  afterNote?: string;
  bullets: readonly string[];
};

export const CARTA_ESCALERA: readonly EscaleraTier[] = [
  {
    id: "base",
    buyable: true,
    name: "Jornada Base",
    priceUsd: CARTA_PRECIO_BASE_USD,
    badge: "Fase de pre-lanzamiento · entrada",
    bullets: [
      `Menos de $1 al día por atacar el 40% de fuga en tu producción.`,
      "Acceso al motor de telemetría, Ring de conquista y medición de unidades.",
      "Para el operador que necesita validar su velocidad real.",
    ],
  },
  {
    id: "ritmo",
    buyable: false,
    name: "Jornada Ritmo",
    priceUsd: CARTA_PRECIO_RITMO_USD,
    afterNote: "Después de Base. No se compra en esta puerta.",
    bullets: [
      "Segmentación por hábitos: contenedores claros (Desarrollo, Trabajo, Familia, Almuerzo).",
      "Ring de conquista para volumen y cantidad contable.",
      "Ring de enfoque para lo intangible o el imprevisto, sin romper la secuencia del día.",
    ],
  },
  {
    id: "direccion",
    buyable: false,
    name: "Jornada Dirección",
    priceUsd: CARTA_PRECIO_DIRECCION_USD,
    afterNote: "Después de Ritmo. Último peldaño.",
    bullets: [
      "Anidamiento en Hub de Proyectos: cada vehículo apunta a una meta estructural.",
      "Auditoría de conciencia: Inconsciencia vs Dirección, semana a semana.",
    ],
  },
];

export const CARTA_DILACION = {
  label: "V · El costo de la dilación y el pacto soberano",
  lead:
    "Puedes pensar en evaluarlo después. Pero en operaciones de alto rendimiento, postergar decisiones tiene un precio tangible: cada semana que operas sin telemetría, la fuga del 30% sigue corriendo. Pensarlo dos semanas cuesta exactamente 14 días de retrasos no medidos en tus entregas.",
  porQue: "¿Por qué elegirnos?",
  pacto:
    "Porque no somos una empresa de soporte que te vende una licencia y se desaparece. Somos diseñadores de telemetría operativa y conocemos la trinchera del tiempo real.",
  aliados:
    "No buscamos clientes para cobrar e irnos; buscamos aliados que entiendan el valor de dominar el tiempo de su vida. Si buscas un proveedor sumiso al que pedirle parches, hay miles en el mercado. Si buscas un referente para medir y escalar tu proyecto con precisión quirúrgica, activa tu Jornada hoy.",
} as const;

export const CARTA_CIERRE =
  "Pagas Jornada Base. Ritmo y Dirección se ofrecen después, cuando ya mides unidades.";

/** Cierre hablado (llamada / Twilio). Precio redondo para que se oiga. */
export const CARTA_CIERRE_VOZ =
  "La entrada es Jornada Base, veinticinco dólares al mes. Mides unidades. Ritmo y Dirección vienen después, cuando ya mides.";

/** Cierre escrito (WhatsApp / checkout). */
export const CARTA_CIERRE_WHATSAPP =
  "Jornada Base: 24.99 al mes. Mides unidades. Ritmo y Dirección se ofrecen después, cuando ya mides.";

const TRIAL_OFFER_RE =
  /7\s*d[ií]as\s+gratis|empezar\s+7\s*d[ií]as|500\s*ps\s*=|base\s+gratis|prueba\s+de\s+telemetr[ií]a/i;

/** Texto público de la carta (para auditar que no reabre el trial). */
export function cartaVentaPublicText(): string {
  const tiers = CARTA_ESCALERA.map((t) =>
    [t.name, t.badge ?? "", t.afterNote ?? "", ...t.bullets].join(" "),
  ).join(" ");
  return [
    CARTA_KICKER,
    CARTA_TITULAR,
    CARTA_SUBTITULAR,
    CARTA_CTA_BASE,
    CARTA_CTA_FINAL,
    CARTA_CTA_VENDEDOR,
    CARTA_CIERRE,
    CARTA_CIERRE_VOZ,
    CARTA_CIERRE_WHATSAPP,
    CARTA_DIAGNOSTICO.lead,
    CARTA_DIAGNOSTICO.mancha,
    CARTA_DIAGNOSTICO.pregunta,
    CARTA_DIAGNOSTICO.close,
    ...CARTA_DIAGNOSTICO.contrast.map((c) => `${c.title} ${c.text}`),
    CARTA_TELEMETRIA.lead,
    CARTA_TELEMETRIA.numeros,
    CARTA_TELEMETRIA.marco,
    ...CARTA_TELEMETRIA.instrumentos.map((i) => `${i.name} ${i.text}`),
    CARTA_FRICCION.c6,
    CARTA_FRICCION.prueba,
    CARTA_FRICCION.c7,
    CARTA_DILACION.lead,
    CARTA_DILACION.pacto,
    CARTA_DILACION.aliados,
    tiers,
  ].join("\n");
}

export function textoOfreceTrial(text: string): boolean {
  return TRIAL_OFFER_RE.test(text);
}

export function cartaVentaOfreceTrial(): boolean {
  return textoOfreceTrial(cartaVentaPublicText());
}

export function escaleraTiersComprables(): EscaleraTierId[] {
  return CARTA_ESCALERA.filter((t) => t.buyable).map((t) => t.id);
}
