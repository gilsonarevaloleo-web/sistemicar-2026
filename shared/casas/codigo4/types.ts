/**
 * Contratos de La Casa del Código 4: El Juez Serio.
 * Planeta independiente. El dictamen es JSON estricto.
 */

export type EyeCode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const EYE_CODES: readonly EyeCode[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export interface PrincipioMatriz {
  codigo: EyeCode;
  nombre: string;
  vectores: readonly string[];
}

export interface JuezSerioInput {
  /** Fricción diaria volcada por el operador. */
  friccionDiaria: string;
  /**
   * Perímetro real del chasis si ya se conoce (C1 → C_conquistado).
   * Si falta, el motor lo infiere. Nunca se usa para inventar códigos superiores.
   */
  codigoConquistadoMax?: EyeCode;
}

export interface JuezSerioFase1 {
  /** Código donde habita el problema inconsciente. */
  codigoProblemaDetectado: EyeCode;
  /** Perímetro máximo de recursos conquistados por el chasis. */
  codigoConquistadoMax: EyeCode;
  /** Vía de agua o vicio que el operador no detectaba. */
  fugaInconsciente: string;
  /** Dictamen frío del problema dentro de sus límites reales. */
  lecturaPerimetroFrancia: string;
}

export interface JuezSerioFase2 {
  /** La tijera de fase 2 siempre cobra. */
  requiereInversionCreditos: true;
  /** Línea de acción ejecutable solo dentro de C1 → C_conquistado. */
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
