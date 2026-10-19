/**
 * Pedagogía de escritura V3.
 * Estructurar el texto estimula la percepción del ojo.
 * El alma del código no cambia; el acomodo sigue el tema.
 * El ajuste enseña el próximo volcado, no un consejo de vida.
 */

import { CANON_TEN_EYES } from "./ojos.ts";
import { EYE_CODES, type EyeCode, type UserTier } from "./types.ts";

export type GradoPedagogico = 1 | 2 | 3 | 4;

export interface PuenteEscritura {
  codigo: EyeCode;
  percepcion: string;
  escritura: string;
}

/**
 * Puente percepción → geometría a escribir.
 * C2 se desarrolla conectando puntos (C3). C1 es atención en el título;
 * conectar ese título con el fin es C10. C4 es la pregunta de inflexión.
 */
export const PUENTES_ESCRITURA: Record<EyeCode, PuenteEscritura> = {
  1: {
    codigo: 1,
    percepcion: "Cimiento",
    escritura:
      "nombrá el título: atención en el territorio, de qué va el volcado. Cero clima",
  },
  2: {
    codigo: 2,
    percepcion: "Flujo",
    escritura:
      "conectá los puntos — eso es C3 (Trabajo): causa → efecto, no estado de ánimo",
  },
  3: {
    codigo: 3,
    percepcion: "Trabajo",
    escritura:
      "escribí la cadena A → B → C: el paso que se rompe y el consecuente",
  },
  4: {
    codigo: 4,
    percepcion: "Seriedad",
    escritura:
      "escribinos la pregunta de inflexión: dónde se parte el paradigma que venías sosteniendo. Sin C4 no hay seriedad ni profundidad",
  },
  5: {
    codigo: 5,
    percepcion: "Decisión",
    escritura: "escribí el corte: un sí o un no seco, sin excusa",
  },
  6: {
    codigo: 6,
    percepcion: "Convivencia",
    escritura:
      "escribí la escena física: herramienta, roce, frase textual",
  },
  7: {
    codigo: 7,
    percepcion: "Visión",
    escritura:
      "escribí el patrón en una frase: cómo funciona, no el episodio",
  },
  8: {
    codigo: 8,
    percepcion: "Ciclos",
    escritura:
      "escribí el ir y el volver: el loop en el texto, no insinuado",
  },
  9: {
    codigo: 9,
    percepcion: "Sistema",
    escritura:
      "nombrá los dos hilos y el punto exacto donde se cargan uno al otro",
  },
  10: {
    codigo: 10,
    percepcion: "Origen",
    escritura:
      "conectá el título con el fin: el mismo cordón, no el mismo tema",
  },
};

export interface TemperamentoV3 {
  grado: GradoPedagogico;
  codigo: string;
  friccion: "baja" | "moderada" | "alta" | "pura";
  instruccionPrompt: string;
  cierreAjuste: string;
}

/** El tono sigue al peldaño comercial. El alma del código no cambia. */
export const TEMPERAMENTO_V3: Record<GradoPedagogico, TemperamentoV3> = {
  1: {
    grado: 1,
    codigo: "NUTRITIVO_INERCIA",
    friccion: "baja",
    instruccionPrompt:
      "TEMPERAMENTO NUTRITIVO (G1): Tolera el ruido. No bloquees la entrada. El ajuste enseña a escribir el próximo volcado, sin juzgar la narrativa.",
    cierreAjuste: "El próximo volcado, eso. No se tapa la entrada.",
  },
  2: {
    grado: 2,
    codigo: "FRICCION_MODERADA",
    friccion: "moderada",
    instruccionPrompt:
      "TEMPERAMENTO DE FRICCIÓN MODERADA (G2): Señalá la flor si aparece. El ajuste es directo y constructivo: la geometría que falta, no un sermón.",
    cierreAjuste: "La flor no sustituye esa geometría.",
  },
  3: {
    grado: 3,
    codigo: "RIGOR_QUIRURGICO",
    friccion: "alta",
    instruccionPrompt:
      "TEMPERAMENTO DE RIGOR QUIRÚRGICO (G3): Cero autoengaño. El ajuste exige la pregunta de inflexión y la geometría que el texto aún no sostiene.",
    cierreAjuste: "Cero autoengaño: esa geometría, o el volcado sigue en superficie.",
  },
  4: {
    grado: 4,
    codigo: "MATEMATICA_PURA",
    friccion: "pura",
    instruccionPrompt:
      "TEMPERAMENTO DE MATEMÁTICA PURA (G4): Evaluación seca. El ajuste nombra solo la geometría a escribir. Cero calor, cero adorno.",
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
  const puente = PUENTES_ESCRITURA[foco];
  const ojo = CANON_TEN_EYES[foco];
  return `Para que tu percepción de C${foco} (${ojo.name} / ${puente.percepcion}) se desarrolle, ${puente.escritura}.`;
}

/** Ajuste al alumno: percepción del foco → geometría a escribir. Tono del grado. */
export function ajustePedagogico(foco: EyeCode, tier: UserTier): string {
  const nucleo = nucleoAjuste(foco);
  const cierre = temperamentoDe(tier).cierreAjuste;
  return cierre ? `${nucleo} ${cierre}` : nucleo;
}

export function bloquePuentesPrompt(): string {
  const lineas = [
    "═══ PUENTES DE ESCRITURA (PERCEPCIÓN ↔ GEOMETRÍA) ═══",
    "El alma del código no cambia. El acomodo sigue el tema.",
    "immediateAdjustment enseña el PRÓXIMO VOLCADO, no un consejo de vida.",
    "Fórmula: «Para que tu percepción de C[n] se desarrolle, escribí [geometría].»",
    "C4 es pregunta de inflexión: sin C4 no hay Seriedad ni profundidad.",
    "C1 es atención en el título. Conectar título con el fin es C10.",
    "C2 se desarrolla conectando los puntos: eso es C3.",
  ];
  for (const n of EYE_CODES) {
    const p = PUENTES_ESCRITURA[n];
    lineas.push(`C${n} ${p.percepcion}: ${p.escritura}.`);
  }
  return lineas.join("\n");
}

export function bloqueTemperamentoPrompt(tier: UserTier): string {
  const t = temperamentoDe(tier);
  return `═══ TEMPERAMENTO DEL AJUSTE ═══\nGrado pedagógico: G${t.grado} (${tier}).\n${t.instruccionPrompt}`;
}
