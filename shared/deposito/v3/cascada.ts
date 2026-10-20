/**
 * Ley de la Cascada — pedagogía progresiva de Depósito V3.
 *
 * Orden estricto: C1 → C2 → C4 → C5 → C7 → C10.
 * C3, C6, C8 y C9 viven en el mapa de calor; no abren el siguiente peldaño.
 * El dictamen usa el Tono del Maestro del código pendiente. Cero consejo de vida.
 */

import {
  CASCADE_CODES,
  type CascadeCode,
  type EstadoAlumnoCascada,
  type EyeCode,
  type MasterToneCode,
} from "./types.ts";

export const TONOS_MAESTRO: Record<MasterToneCode, string> = {
  1: "Empieza por lo más simple. Pon un título arriba, lo que sea que definas hoy. Pon tu punto de partida.",
  2: "Suelta la mano. Relata los hechos tal como pasaron, conecta los puntos sin juzgarte.",
  4: "Detente un segundo aquí. Hazte una pregunta incómoda sobre esto que escribiste. ¿Qué hay detrás de esta situación?",
  5: "A partir de tu pregunta, traza una línea. ¿Qué decisión firme corta con el estado anterior?",
  6: "¿De dónde sacaste este hecho o conocimiento? Nombra el contexto o la fuente de donde brotó.",
  7: "Plantea tu propia solución. ¿Cómo encajas este aprendizaje en una idea tuya?",
  10: "Tu texto abrió un vector en el Título pero la conclusión no regresó a él. Haz que tu última oración cierre la puerta que abriste al inicio.",
};

export const TONO_ARQUITECTO_GROUNDED =
  "Circuito C1→C10 abrochado. El título y la última oración se responden en el papel. No hay escalón pendiente en la cascada.";

export function mapaTiene(
  map: Record<EyeCode, boolean> | null | undefined,
  code: EyeCode,
): boolean {
  return Boolean(map?.[code]);
}

export function primerPendienteCascada(
  map: Record<EyeCode, boolean> | null | undefined,
): CascadeCode | null {
  for (const code of CASCADE_CODES) {
    if (!mapaTiene(map, code)) return code;
  }
  return null;
}

export function estadoAlumnoDe(
  map: Record<EyeCode, boolean> | null | undefined,
): EstadoAlumnoCascada {
  if (!mapaTiene(map, 1)) return "PRINCIPIANTE_SIN_ANCLA";
  if (!mapaTiene(map, 4)) return "EXPLORADOR_NARRATIVO";
  const cierra =
    mapaTiene(map, 5) && mapaTiene(map, 7) && mapaTiene(map, 10);
  if (!cierra) return "ENLACE_EN_TRANSMUTACION";
  if (primerPendienteCascada(map) === null) return "ARQUITECTO_GROUNDED";
  return "ENLACE_EN_TRANSMUTACION";
}

export function masterToneDe(
  lowest: CascadeCode | null,
): MasterToneCode {
  return lowest ?? 10;
}

export function pedagogicalFeedbackDe(
  lowest: CascadeCode | null,
): string {
  if (lowest === null) return TONO_ARQUITECTO_GROUNDED;
  return TONOS_MAESTRO[lowest];
}

export function etiquetaEstado(estado: EstadoAlumnoCascada): string {
  if (estado === "PRINCIPIANTE_SIN_ANCLA") return "PRINCIPIANTE_SIN_ANCLA";
  if (estado === "EXPLORADOR_NARRATIVO") return "EXPLORADOR_NARRATIVO";
  if (estado === "ENLACE_EN_TRANSMUTACION") return "ENLACE_EN_TRANSMUTACIÓN";
  return "ARQUITECTO_Grounded";
}

export function mensajeDiagnosticoCascada(input: {
  estado: EstadoAlumnoCascada;
  lowest: CascadeCode | null;
  activeCodes: readonly EyeCode[];
  titleConnectedToClose: boolean;
  characterSignedCode: EyeCode;
}): string {
  const activos =
    input.activeCodes.length > 0
      ? input.activeCodes.map((n) => `C${n}`).join(" · ")
      : "ninguno";
  const firma = `Firma C${input.characterSignedCode}`;

  if (input.estado === "PRINCIPIANTE_SIN_ANCLA") {
    return `${etiquetaEstado(input.estado)}. Sin título no hay vector C1. C10 queda vacío por imposibilidad geométrica de retorno. ${firma}. Activos: ${activos}.`;
  }
  if (input.estado === "EXPLORADOR_NARRATIVO") {
    return `${etiquetaEstado(input.estado)}. Hay C1. El peldaño pendiente es C${input.lowest ?? 2}. Relato sin bisagra de seriedad. Cableado título↔cierre: ${input.titleConnectedToClose ? "sí" : "no"}. ${firma}. Activos: ${activos}.`;
  }
  if (input.estado === "ENLACE_EN_TRANSMUTACION") {
    return `${etiquetaEstado(input.estado)}. C4 está en el papel. Falta C${input.lowest ?? 5} para ejecutar la tijera o la idea propia. Cableado título↔cierre: ${input.titleConnectedToClose ? "sí" : "no"}. ${firma}. Activos: ${activos}.`;
  }
  return `${etiquetaEstado(input.estado)}. Circuito C1→C10 cerrado. Título y cierre se abrochan. ${firma}. Activos: ${activos}.`;
}
