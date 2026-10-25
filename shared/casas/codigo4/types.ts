/**
 * Contratos de La Casa del Código 4: El Juez Serio.
 * Planeta independiente. El dictamen es JSON estricto.
 * El motor solo lee. Cada código cierra con su fuerza.
 */

export type EyeCode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const EYE_CODES: readonly EyeCode[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Cascada de enseñanza. C3, C6, C8 y C9 no abren el siguiente peldaño. */
export const CASCADA_ENSENANZA: readonly EyeCode[] = [1, 2, 4, 5, 7, 10];

export interface PrincipioMatriz {
  codigo: EyeCode;
  nombre: string;
  vectores: readonly string[];
}

export interface FuerzaCodigo {
  codigo: EyeCode;
  nombre: string;
  cierra: string;
  acto: string;
}

export interface ParticipacionFuerza {
  codigo: EyeCode;
  fuerza: string;
}

export interface JuezSerioInput {
  /** Fricción diaria volcada por el operador. Sin reglas de formato. */
  friccionDiaria: string;
  /**
   * Perímetro real del chasis si ya se conoce (C1 → C_conquistado).
   * Si falta, el motor lo infiere. Nunca se usa para inventar códigos superiores.
   */
  codigoConquistadoMax?: EyeCode;
}

export interface JuezSerioFase1 {
  /** Código donde habita el problema inconsciente. Alias de codigoQueHabla. */
  codigoProblemaDetectado: EyeCode;
  /** Código que habla: el cimiento del atasco. */
  codigoQueHabla: EyeCode;
  /** Perímetro máximo de recursos conquistados por el chasis. */
  codigoConquistadoMax: EyeCode;
  /** Códigos que participan en el volcado. */
  participaciones: ParticipacionFuerza[];
  /** Código que cerró el diagnóstico teórico, si alguno. */
  codigoQueCerroTeorico: EyeCode | null;
  /** Energía que el usuario usó para cerrar. Se juzga la energía, no el léxico. */
  fuerzaUsada: EyeCode | null;
  /** Energía legal que cierra el hueco restante (acotada al perímetro). */
  fuerzaDebida: EyeCode;
  /** Si el cierre teórico cumple cascada de enseñanza y de perímetro. */
  cascadaCumple: boolean;
  /** Desajuste entre fuerza usada y fuerza debida. */
  desajusteFuerza: string;
  /** Vía de agua o vicio que el operador no detectaba. */
  fugaInconsciente: string;
  /** Dictamen frío del problema dentro de sus límites reales. */
  lecturaPerimetroFria: string;
}

export interface JuezSerioFase2 {
  /** La confrontación de fase 2 siempre cobra. */
  requiereInversionCreditos: true;
  /** Confrontación del principio debido. No es receta de oficio. */
  confrontacionDeFuerza: string;
  /**
   * Alias de confrontacionDeFuerza.
   * Se conserva para historial y sesiones ya persistidas.
   */
  directivaOperacional: string;
}

export interface JuezSerioResult {
  fase1_lectura: JuezSerioFase1;
  fase2_propuesta_solucion: JuezSerioFase2;
}

export type JuezSerioParseOk = {
  ok: true;
  result: JuezSerioResult;
};

export type JuezSerioParseErr = {
  ok: false;
  error: string;
};

export type JuezSerioParseResult = JuezSerioParseOk | JuezSerioParseErr;
