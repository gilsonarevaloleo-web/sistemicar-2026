/**
 * Pedagogía de escritura V3 — Tono del Maestro por Ley de la Cascada.
 * El ajuste enseña el escalón pendiente. Cero consejo moral de vida.
 */

import { CANON_TEN_EYES } from "./ojos.ts";
import {
  TONOS_MAESTRO,
  TONO_ARQUITECTO_GROUNDED,
  pedagogicalFeedbackDe,
} from "./cascada.ts";
import {
  EYE_CODES,
  type CascadeCode,
  type EyeCode,
  type MasterToneCode,
  type UserTier,
} from "./types.ts";

export type GradoPedagogico = 1 | 2 | 3 | 4;

export interface PuenteEscritura {
  codigo: EyeCode;
  percepcion: string;
  escritura: string;
}

/**
 * Puente percepción → geometría a escribir.
 * C1 es el título (Vector Cero). Conectar título con el fin es C10.
 */
export const PUENTES_ESCRITURA: Record<EyeCode, PuenteEscritura> = {
  1: {
    codigo: 1,
    percepcion: "Cimiento",
    escritura: "poné un título arriba: el punto de partida, lo que sea que definas hoy",
  },
  2: {
    codigo: 2,
    percepcion: "Flujo",
    escritura: "relatá los hechos tal como pasaron y conectá los puntos sin juzgarte",
  },
  3: {
    codigo: 3,
    percepcion: "Trabajo",
    escritura: "escribí la cadena A → B → C: primero, luego, el paso que se rompe",
  },
  4: {
    codigo: 4,
    percepcion: "Seriedad",
    escritura:
      "hacé la pregunta de inflexión: ¿qué hay detrás de esto que escribiste?",
  },
  5: {
    codigo: 5,
    percepcion: "Decisión",
    escritura: "trazá una línea: la decisión firme que corta el estado anterior",
  },
  6: {
    codigo: 6,
    percepcion: "Fuente",
    escritura: "nombrá de dónde salió el hecho: taller, hogar, libro, persona, video",
  },
  7: {
    codigo: 7,
    percepcion: "Visión",
    escritura:
      "planteá tu propia solución o el patrón en una frase: cómo encajás esto en una idea tuya",
  },
  8: {
    codigo: 8,
    percepcion: "Ciclos",
    escritura: "escribí el ir y el volver: el loop en el texto, no insinuado",
  },
  9: {
    codigo: 9,
    percepcion: "Sistema",
    escritura:
      "conectá tres dimensiones en el mismo escrito: fisiología + trabajo + entorno",
  },
  10: {
    codigo: 10,
    percepcion: "Origen",
    escritura:
      "hacé que la última oración cierre la puerta que abrió el título",
  },
};

export interface TemperamentoV3 {
  grado: GradoPedagogico;
  codigo: string;
  friccion: "baja" | "moderada" | "alta" | "pura";
  instruccionPrompt: string;
  cierreAjuste: string;
}

/** El tono del dictamen lo marca la cascada. El grado solo informa al prompt. */
export const TEMPERAMENTO_V3: Record<GradoPedagogico, TemperamentoV3> = {
  1: {
    grado: 1,
    codigo: "NUTRITIVO_INERCIA",
    friccion: "baja",
    instruccionPrompt:
      "TEMPERAMENTO NUTRITIVO (G1): Tolera el ruido. No bloquees la entrada. El ajuste usa el Tono del Maestro del código pendiente de la cascada. Cero juicio moral.",
    cierreAjuste: "",
  },
  2: {
    grado: 2,
    codigo: "FRICCION_MODERADA",
    friccion: "moderada",
    instruccionPrompt:
      "TEMPERAMENTO DE FRICCIÓN MODERADA (G2): El ajuste es el Tono del Maestro del peldaño pendiente. Geometría del papel, no sermón.",
    cierreAjuste: "",
  },
  3: {
    grado: 3,
    codigo: "RIGOR_QUIRURGICO",
    friccion: "alta",
    instruccionPrompt:
      "TEMPERAMENTO DE RIGOR QUIRÚRGICO (G3): Cero autoengaño. El ajuste exige el escalón pendiente de la cascada, no un inventario de vacíos.",
    cierreAjuste: "",
  },
  4: {
    grado: 4,
    codigo: "MATEMATICA_PURA",
    friccion: "pura",
    instruccionPrompt:
      "TEMPERAMENTO DE MATEMÁTICA PURA (G4): Evaluación seca. El ajuste es el Tono del Maestro, sin calor ni adorno.",
    cierreAjuste: "",
  },
};

export function gradoPedagogicoDe(tier: UserTier): GradoPedagogico {
  if (tier === "TITULO") return 4;
  if (tier === "CARRERA") return 3;
  if (tier === "MATRICULA") return 1;
  return 1;
}

export function temperamentoDe(tier: UserTier): TemperamentoV3 {
  return TEMPERAMENTO_V3[gradoPedagogicoDe(tier)];
}

export function nucleoAjuste(foco: EyeCode): string {
  if (foco === 3 || foco === 8 || foco === 9) {
    const puente = PUENTES_ESCRITURA[foco];
    return puente.escritura.charAt(0).toUpperCase() + puente.escritura.slice(1) + ".";
  }
  const tono = TONOS_MAESTRO[foco as MasterToneCode];
  return tono ?? PUENTES_ESCRITURA[foco].escritura;
}

/** Ajuste al alumno: Tono del Maestro del código pendiente. Cero consejo de vida. */
export function ajustePedagogico(foco: EyeCode, _tier: UserTier): string {
  return nucleoAjuste(foco);
}

export function ajusteCascada(lowest: CascadeCode | null): string {
  return pedagogicalFeedbackDe(lowest);
}

export function bloquePuentesPrompt(): string {
  const lineas = [
    "═══ LEY DE LA CASCADA (C1 → C2 → C4 → C5 → C7 → C10) ═══",
    "Enseñá SOLO el código más bajo no activado. Cero consejo de vida.",
    "C1 es el Título (Vector Cero). C10 solo existe si C1 está y el cierre abrocha ese vector.",
    "Sin título, C10 es VACÍO AUTOMÁTICO por imposibilidad geométrica de retorno.",
    "immediateAdjustment / pedagogicalFeedback = Tono del Maestro del peldaño pendiente.",
  ];
  for (const n of EYE_CODES) {
    const p = PUENTES_ESCRITURA[n];
    lineas.push(`C${n} ${p.percepcion}: ${p.escritura}.`);
  }
  lineas.push("TONOS DEL MAESTRO:");
  lineas.push(`C1: ${TONOS_MAESTRO[1]}`);
  lineas.push(`C2: ${TONOS_MAESTRO[2]}`);
  lineas.push(`C4: ${TONOS_MAESTRO[4]}`);
  lineas.push(`C5: ${TONOS_MAESTRO[5]}`);
  lineas.push(`C6: ${TONOS_MAESTRO[6]}`);
  lineas.push(`C7: ${TONOS_MAESTRO[7]}`);
  lineas.push(`C10: ${TONOS_MAESTRO[10]}`);
  lineas.push(`Circuito cerrado: ${TONO_ARQUITECTO_GROUNDED}`);
  return lineas.join("\n");
}

export function bloqueTemperamentoPrompt(tier: UserTier): string {
  const t = temperamentoDe(tier);
  return `═══ TEMPERAMENTO DEL AJUSTE ═══\nGrado pedagógico: G${t.grado} (${tier}).\n${t.instruccionPrompt}`;
}
