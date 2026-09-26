/**
 * Identidad pública SISTEMICAR — una sola voz: checkout, kit, onboarding y Jornada.
 * Recintos vivos: Espejo, Depósito, Jornada, Umbral.
 * Jornada se vende por peldaños: Base · Ritmo · Norte.
 * El “motor de cierre por capas” (presencia / entrada / producción) es pasado.
 */
export const SISTEMICAR_CATEGORY = {
  name: "Sistemicar · cuatro recintos",
  nameShort: "Cuatro recintos",
  oneLiner:
    "Espejo limpia. Depósito nombra un ojo. Jornada cierra unidades. Umbral atraviesa con criterio.",
  notA:
    "No competimos con Notion ni Google Calendar — ellos almacenan; nosotros cerramos el día.",
  puente:
    "Espejo limpia la carga. Jornada cierra unidades. El día no se evapora — termina con un número.",
  elevator:
    "SISTEMICAR es cuatro recintos: Espejo, Depósito, Jornada y Umbral. Jornada es el Entrenador de Intención Panorámica — Base (Conquista + PS), Ritmo (segmentos + Situacional) y Norte (Crisol + proyectos). No es una lista: el día termina con un número.",
} as const;

/** Recintos vivos — reemplazan las tres capas públicas (presencia / entrada / producción). */
export const RECINTOS_PUBLIC = [
  {
    id: "espejo",
    titulo: "Espejo",
    pregunta: "¿Hay interferencia?",
    metrica: "Mandato, no consuelo",
    color: "#00FFC3",
  },
  {
    id: "deposito",
    titulo: "Depósito",
    pregunta: "¿Qué aprendí hoy?",
    metrica: "Un ojo en el Muro",
    color: "#F97316",
  },
  {
    id: "jornada",
    titulo: "Jornada",
    pregunta: "¿El día termina con un número?",
    metrica: "Conquista + PS",
    color: "#22C55E",
  },
  {
    id: "umbral",
    titulo: "Umbral",
    pregunta: "¿El mismo obstáculo se repite?",
    metrica: "Criterio, no motivación",
    color: "#D4AF37",
  },
] as const;

/** @deprecated Usá RECINTOS_PUBLIC. Se mantiene por imports viejos del banner. */
export const ESCALERA_CAPAS_PUBLIC = RECINTOS_PUBLIC;

export const CATEGORY_FOOTER =
  "Cuatro recintos — ninguno sustituye al otro. Jornada se profundiza por peldaños: Base, Ritmo y Norte.";
