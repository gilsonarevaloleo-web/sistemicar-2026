/**
 * Ley de la Cascada — pedagogía progresiva de Depósito V3.
 *
 * Presencia: C1 → C2 → C3 → C4 → C5 → C6 → C7 → C8 → C9 → C10.
 * Enseñanza: C1 → C2 → C4 → C5 → C7 → C10.
 * C3, C6, C8 y C9 viven en el mapa de calor; no abren el siguiente peldaño.
 * Un código presente nunca es FOCO y VACÍO a la vez.
 * El dictamen usa el Tono del Maestro del primer ausente real. Cero consejo de vida.
 */

import {
  CASCADE_CODES,
  EYE_CODES,
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

/**
 * Ajuste cuando no hay peldaño pendiente: nombra lo que el papel ya sostiene.
 * Cero sermón de vida. C3, C8 y C9 vacíos no abren escalón.
 */
export function tonoFortalezas(input: {
  characterSignedCode: EyeCode;
  activeCodes: readonly EyeCode[];
}): string {
  const activos = new Set(input.activeCodes);
  const cascada = CASCADE_CODES.filter((n) => activos.has(n))
    .map((n) => `C${n}`)
    .join(" · ");
  const mapaActivo = ([3, 6, 8, 9] as const).filter((n) => activos.has(n));
  const mapaVacio = ([3, 8, 9] as const).filter((n) => !activos.has(n));
  const extra =
    mapaActivo.length > 0
      ? ` También en el mapa: ${mapaActivo.map((n) => `C${n}`).join(" · ")}.`
      : "";
  const vacios =
    mapaVacio.length === 0
      ? ""
      : ` ${mapaVacio.map((n) => `C${n}`).join(" · ")} ${
          mapaVacio.length === 1 ? "queda vacío" : "quedan vacíos"
        } en el mapa y no abren peldaño.`;
  return `Circuito C1→C10 abrochado. Fortalezas en el papel: Firma C${input.characterSignedCode}. Cascada completa: ${cascada}. El cierre vuelve al título.${extra}${vacios}`;
}

export function mapaTiene(
  map: Record<EyeCode, boolean> | null | undefined,
  code: EyeCode,
): boolean {
  return Boolean(map?.[code]);
}

/**
 * Recorre una secuencia estricta y devuelve el primer código ausente.
 * La telemetría usa C1→C10; la enseñanza usa CASCADE_CODES.
 */
export function primerAusenteEnSecuencia(
  map: Record<EyeCode, boolean> | null | undefined,
  secuencia: readonly EyeCode[] = EYE_CODES,
): EyeCode | null {
  for (const code of secuencia) {
    if (!mapaTiene(map, code)) return code;
  }
  return null;
}

/**
 * Escalón de enseñanza: primer código inactivo de C1→C2→C4→C5→C7→C10.
 * Nunca devuelve un código que ya está en el mapa de activos.
 */
export function primerPendienteCascada(
  map: Record<EyeCode, boolean> | null | undefined,
): CascadeCode | null {
  const pendiente = primerAusenteEnSecuencia(map, CASCADE_CODES);
  return pendiente as CascadeCode | null;
}

export interface EstadoCascadaSincronizado {
  activeCharacterMap: Record<EyeCode, boolean>;
  activeCodes: EyeCode[];
  syntacticVacios: EyeCode[];
  lowestMissingCascadeCode: CascadeCode | null;
  focoRevelacionCode: EyeCode;
}

function copiarMapa(
  map: Record<EyeCode, boolean> | null | undefined,
): Record<EyeCode, boolean> {
  const out = {} as Record<EyeCode, boolean>;
  for (const n of EYE_CODES) out[n] = Boolean(map?.[n]);
  return out;
}

/**
 * Sincroniza FOCO, activos y vacíos.
 * Un código presente en el papel entra a activeCodes y NO puede ser vacío.
 * El Tono del Maestro toma el primer ausente real; si C5 ya está, nunca se vuelve a pedir.
 */
export function reconciliarCascada(input: {
  map?: Record<EyeCode, boolean> | null;
  activeCodes?: readonly EyeCode[] | null;
  lowestMissingCascadeCode?: CascadeCode | null;
  focoRevelacionCode?: EyeCode | null;
  syntacticVacios?: readonly EyeCode[] | null;
}): EstadoCascadaSincronizado {
  const activeCharacterMap = copiarMapa(input.map);
  for (const n of input.activeCodes ?? []) {
    activeCharacterMap[n] = true;
  }
  if (input.syntacticVacios) {
    const vacioSet = new Set(input.syntacticVacios);
    for (const n of EYE_CODES) {
      if (!vacioSet.has(n)) activeCharacterMap[n] = true;
    }
  }

  const activeCodes = EYE_CODES.filter((n) => activeCharacterMap[n]);
  const syntacticVacios = EYE_CODES.filter((n) => !activeCharacterMap[n]);
  const computed = primerPendienteCascada(activeCharacterMap);

  const declaredLowest = input.lowestMissingCascadeCode;
  const pediaUnActivo =
    declaredLowest != null && activeCharacterMap[declaredLowest];
  const hasDeclared = declaredLowest !== undefined;
  let lowest = !hasDeclared || pediaUnActivo ? computed : declaredLowest;
  if (lowest === null && computed !== null) lowest = computed;

  const declaredFoco = input.focoRevelacionCode ?? undefined;
  const focoContradice =
    declaredFoco != null &&
    (activeCharacterMap[declaredFoco] &&
      (input.syntacticVacios?.includes(declaredFoco) ||
        declaredLowest === declaredFoco));

  const focoRevelacionCode = (
    focoContradice || pediaUnActivo || declaredFoco == null
      ? (lowest ?? 10)
      : declaredFoco
  ) as EyeCode;

  return {
    activeCharacterMap,
    activeCodes,
    syntacticVacios,
    lowestMissingCascadeCode: lowest,
    focoRevelacionCode,
  };
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
  fortalezas?: {
    characterSignedCode: EyeCode;
    activeCodes: readonly EyeCode[];
  },
): string {
  if (lowest === null) {
    return fortalezas ? tonoFortalezas(fortalezas) : TONO_ARQUITECTO_GROUNDED;
  }
  return TONOS_MAESTRO[lowest];
}

/**
 * El peldaño pendiente no reutiliza el vocabulario de C5/C7
 * cuando lo que falta es C10 (abroche) u otro escalón.
 */
export function peldañoPendienteEnlace(lowest: CascadeCode | null): string {
  if (lowest === 10) {
    return "Falta C10 para abrochar el título con la última oración.";
  }
  if (lowest === 7) {
    return "Falta C7 para ejecutar la idea propia.";
  }
  if (lowest === 5) {
    return "Falta C5 para ejecutar la tijera.";
  }
  if (lowest === 2) {
    return "Falta C2 para relatar el cauce.";
  }
  return `Falta C${lowest ?? 5} para el siguiente escalón de la cascada.`;
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
    return `${etiquetaEstado(input.estado)}. C4 está en el papel. ${peldañoPendienteEnlace(input.lowest)} Cableado título↔cierre: ${input.titleConnectedToClose ? "sí" : "no"}. ${firma}. Activos: ${activos}.`;
  }
  return `${etiquetaEstado(input.estado)}. Circuito C1→C10 cerrado. Título y cierre se abrochan. ${firma}. Activos: ${activos}.`;
}
