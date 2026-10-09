/**
 * Los 10 canales de Depósito V3.
 * Un número, dos dialectos: canon (ley) y planeta (Universidad V2).
 */

import {
  EYE_CODES,
  type EyeAudit,
  type EyeCode,
  type EyeDefinition,
  type EyeDialect,
} from "./types.ts";

export const CANON_TEN_EYES: Record<EyeCode, EyeDefinition> = {
  1: {
    id: 1,
    name: "Cimiento",
    concept: "El territorio",
    description:
      "Suelo, base biológica, espacio físico donde ocurre el hecho.",
    tierRequired: "MATRICULA",
    planeta: "Claridad",
    planetaOjo: "El Ojo de la Claridad",
    syntaxLabel: "Disperso",
    syntaxCharacteristics:
      "Frases sueltas, fatiga física, foco en materia prima sin conectar.",
  },
  2: {
    id: 2,
    name: "Flujo",
    concept: "El caudal",
    description: "Qué entra, qué sale, qué se estanca en la rutina.",
    tierRequired: "MATRICULA",
    planeta: "Suma",
    planetaOjo: "El Ojo de la Suma",
    syntaxLabel: "Relacional",
    syntaxCharacteristics:
      "Conecta entradas y salidas; relato impulsado por estímulo.",
  },
  3: {
    id: 3,
    name: "Trabajo",
    concept: "La secuencia",
    description: "Pistón, orden de ejecución, ritmo en el tiempo.",
    tierRequired: "MATRICULA",
    planeta: "Ritmo",
    planetaOjo: "El Ojo del Ritmo y la Repetición",
    syntaxLabel: "Secuencial",
    syntaxCharacteristics:
      "Paso a paso, marcas de hora, cadencia, orden de pistón.",
  },
  4: {
    id: 4,
    name: "Estructura",
    concept: "La ley del armado",
    description: "Lo que sostiene, los retenes, límites de contención.",
    tierRequired: "MATRICULA",
    planeta: "Seriedad",
    planetaOjo: "El Ojo de la Seriedad",
    syntaxLabel: "Reflexivo",
    syntaxCharacteristics:
      "Interrogativo: pregunta reglas, muros y contención.",
  },
  5: {
    id: 5,
    name: "Decisión",
    concept: "El corte",
    description: "Vértice, disparo, dónde se elige y dónde se evade.",
    tierRequired: "CARRERA",
    planeta: "Cálculo",
    planetaOjo: "El Ojo del Cálculo",
    syntaxLabel: "Ejecutivo",
    syntaxCharacteristics: "Corte seco, sin excusa, verbo de disparo.",
  },
  6: {
    id: 6,
    name: "Convivencia",
    concept: "Las junturas",
    description: "Relaciones, límites con terceros, roce social.",
    tierRequired: "CARRERA",
    planeta: "Roce",
    planetaOjo: "El Ojo del Roce",
    syntaxLabel: "Anecdótico",
    syntaxCharacteristics:
      "Fricción social, límites con terceros, escena de juntura.",
  },
  7: {
    id: 7,
    name: "Visión",
    concept: "El patrón",
    description: "Lente de altura, lectura de modelos y causa diferida.",
    tierRequired: "CARRERA",
    planeta: "Justicia",
    planetaOjo: "El Ojo de la Justicia",
    syntaxLabel: "Axiomático",
    syntaxCharacteristics: "Conceptual: extrae patrón, no episodio.",
  },
  8: {
    id: 8,
    name: "Ciclos",
    concept: "El retorno",
    description:
      "Latencia, loops, ondas de retorno, tiempo de incubación.",
    tierRequired: "CARRERA",
    planeta: "Persistencia",
    planetaOjo: "El Ojo de la Persistencia",
    syntaxLabel: "Diferido",
    syntaxCharacteristics:
      "Ondas, loops, incubación; el hecho llega con retraso.",
  },
  9: {
    id: 9,
    name: "Sistema",
    concept: "El conjunto",
    description:
      "Balance de carga de los 10 canales, arquitectura de escalabilidad.",
    tierRequired: "TITULO",
    planeta: "Sistema",
    planetaOjo: "El Ojo del Sistema",
    syntaxLabel: "Multihilo",
    syntaxCharacteristics: "Balance de carga, varios hilos a la vez.",
  },
  10: {
    id: 10,
    name: "Origen",
    concept: "La fuente",
    description: "Por qué existe este hecho, el eje matriz.",
    tierRequired: "TITULO",
    planeta: "Dominio",
    planetaOjo: "El Ojo del Dominio",
    syntaxLabel: "Matriz",
    syntaxCharacteristics: "Causa raíz, eje que sostiene el hecho.",
  },
};

export function isEyeCode(value: unknown): value is EyeCode {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 1 && value <= 10;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const bare = trimmed.replace(/^C/i, "");
    const n = Number(bare);
    return Number.isInteger(n) && n >= 1 && n <= 10;
  }
  return false;
}

export function parseEyeCode(value: unknown): EyeCode | null {
  if (!isEyeCode(value)) return null;
  if (typeof value === "number") return value;
  return Number(String(value).trim().replace(/^C/i, "")) as EyeCode;
}

export function obtenerOjoV3(codigo: EyeCode): EyeDefinition {
  return CANON_TEN_EYES[codigo];
}

export function etiquetaOjo(
  codigo: EyeCode,
  dialect: EyeDialect = "canon",
): string {
  const ojo = CANON_TEN_EYES[codigo];
  return dialect === "planeta" ? ojo.planeta : ojo.name;
}

export function etiquetaCodigoOjo(
  codigo: EyeCode,
  dialect: EyeDialect = "canon",
): string {
  return `C${codigo} ${etiquetaOjo(codigo, dialect)}`;
}

export function emptyActiveEyeMap(): Record<EyeCode, boolean> {
  const map = {} as Record<EyeCode, boolean>;
  for (const n of EYE_CODES) map[n] = false;
  return map;
}

export function emptyEyeAudits(): Record<EyeCode, EyeAudit> {
  const map = {} as Record<EyeCode, EyeAudit>;
  for (const n of EYE_CODES) {
    map[n] = {
      eyeId: n,
      hasIntention: false,
      hasRealVision: false,
      isBlindSpot: false,
    };
  }
  return map;
}

export function buildActiveEyeMap(
  active: readonly EyeCode[],
): Record<EyeCode, boolean> {
  const map = emptyActiveEyeMap();
  for (const n of active) map[n] = true;
  return map;
}

export function computeDeltaGap(
  perceptionEye: EyeCode,
  characterSignedCode: EyeCode,
): number {
  return Math.abs(perceptionEye - characterSignedCode);
}
