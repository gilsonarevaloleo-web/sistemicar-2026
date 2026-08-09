/**
 * Umbral v2 — Puntos de Soberanía (PS).
 *
 * Dos criterios conscientes:
 * 1) Intento — escritura con densidad mínima (esfuerzo / cumplir presencia)
 * 2) Pase — aprobación del evaluador (tracción / pasar el código)
 *
 * + Corte limpio (aprobado en el primer intento válido del código)
 * + Cierre de módulo al aprobar el código 10
 */

import {
  MODOS_UMBRAL,
  type CodigoNumero,
  type ModoUmbral,
} from "./engineConfig.ts";

/** Densidad mínima alineada con `evaluarUmbralLocal`. */
export const UMBRAL_V2_INTENTO_MIN_CHARS = 40;
export const UMBRAL_V2_INTENTO_MIN_WORDS = 8;

/** Bonus al aprobar en el primer intento válido del código+modo. */
export const UMBRAL_V2_CORTE_LIMPIO_PS = 1;

/** Bonus al cerrar los 10 códigos de un modo. */
export const UMBRAL_V2_MODULO_COMPLETO_PS = 8;

export interface UmbralCodigoPs {
  intento: number;
  pase: number;
}

/** Tabla canónica por código (intento = cumplir; pase = aprobar). */
export const UMBRAL_V2_PS_POR_CODIGO: Record<CodigoNumero, UmbralCodigoPs> = {
  1: { intento: 1, pase: 2 },
  2: { intento: 1, pase: 2 },
  3: { intento: 1, pase: 3 },
  4: { intento: 1, pase: 3 },
  5: { intento: 1, pase: 3 },
  6: { intento: 2, pase: 4 },
  7: { intento: 2, pase: 4 },
  8: { intento: 2, pase: 4 },
  9: { intento: 2, pase: 5 },
  10: { intento: 2, pase: 6 },
};

export type UmbralPsKind = "intento" | "pase" | "corte_limpio" | "modulo";

export interface UmbralPsAward {
  kind: UmbralPsKind;
  amount: number;
  source: string;
  codigo: CodigoNumero;
  modo: ModoUmbral;
}

export interface UmbralV2PsLedger {
  version: 1;
  /** Claves `modo:codigo` con pase ya cobrado. */
  pasesCobrados: string[];
  /** Modos con bonus de módulo ya cobrado. */
  modulosCobrados: ModoUmbral[];
  /** Claves `modo:codigo` con al menos un intento válido histórico. */
  intentosHistoricos: string[];
  /** Día Lima YYYY-MM-DD → claves `modo:codigo` con intento cobrado ese día. */
  intentosPorDia: Record<string, string[]>;
}

export function emptyUmbralV2PsLedger(): UmbralV2PsLedger {
  return {
    version: 1,
    pasesCobrados: [],
    modulosCobrados: [],
    intentosHistoricos: [],
    intentosPorDia: {},
  };
}

export function umbralCodigoKey(
  modo: ModoUmbral,
  codigo: CodigoNumero,
): string {
  return `${modo}:${codigo}`;
}

/** Fecha calendario Lima (UTC-5) YYYY-MM-DD. */
export function limaDateKey(fromMs: number = Date.now()): string {
  const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;
  const lima = new Date(fromMs + LIMA_OFFSET_MS);
  const y = lima.getUTCFullYear();
  const mo = String(lima.getUTCMonth() + 1).padStart(2, "0");
  const d = String(lima.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

export function esIntentoConscienteValido(texto: string): boolean {
  const t = texto.trim();
  const words = t.split(/\s+/).filter(Boolean);
  return (
    t.length >= UMBRAL_V2_INTENTO_MIN_CHARS &&
    words.length >= UMBRAL_V2_INTENTO_MIN_WORDS
  );
}

export interface ResolveUmbralV2PsInput {
  modo: ModoUmbral;
  codigo: CodigoNumero;
  respuestaUsuario: string;
  aprobado: boolean;
  /** Día Lima; por defecto hoy. */
  dayKey?: string;
  nowMs?: number;
}

export interface ResolveUmbralV2PsResult {
  awards: UmbralPsAward[];
  total: number;
  ledger: UmbralV2PsLedger;
  denso: boolean;
}

function cloneLedger(ledger: UmbralV2PsLedger): UmbralV2PsLedger {
  return {
    version: 1,
    pasesCobrados: [...ledger.pasesCobrados],
    modulosCobrados: [...ledger.modulosCobrados],
    intentosHistoricos: [...ledger.intentosHistoricos],
    intentosPorDia: Object.fromEntries(
      Object.entries(ledger.intentosPorDia).map(([k, v]) => [k, [...v]]),
    ),
  };
}

function pushUnique(list: string[], key: string): void {
  if (!list.includes(key)) list.push(key);
}

/**
 * Resuelve qué PS otorgar sin efectos secundarios externos.
 * Aplica anti-abuso: 1 intento/día/código+modo; 1 pase/código+modo; 1 módulo/modo.
 */
export function resolveUmbralV2PsAwards(
  input: ResolveUmbralV2PsInput,
  prevLedger: UmbralV2PsLedger = emptyUmbralV2PsLedger(),
): ResolveUmbralV2PsResult {
  const ledger = cloneLedger(prevLedger);
  const awards: UmbralPsAward[] = [];
  const { modo, codigo, aprobado } = input;
  const dayKey = input.dayKey ?? limaDateKey(input.nowMs);
  const key = umbralCodigoKey(modo, codigo);
  const label = MODOS_UMBRAL[modo].label;
  const tabla = UMBRAL_V2_PS_POR_CODIGO[codigo];
  const denso = esIntentoConscienteValido(input.respuestaUsuario);

  const dayList = ledger.intentosPorDia[dayKey] ?? [];
  ledger.intentosPorDia[dayKey] = dayList;

  const yaIntentoHoy = dayList.includes(key);
  const primerIntentoHistorico = !ledger.intentosHistoricos.includes(key);

  if (denso && !yaIntentoHoy) {
    awards.push({
      kind: "intento",
      amount: tabla.intento,
      source: `Umbral v2: Intento C${codigo} (${label})`,
      codigo,
      modo,
    });
    pushUnique(dayList, key);
    pushUnique(ledger.intentosHistoricos, key);
  } else if (denso && primerIntentoHistorico) {
    // Día ya cobrado en otra sesión/edge: aún marca histórico.
    pushUnique(ledger.intentosHistoricos, key);
  }

  if (aprobado && !ledger.pasesCobrados.includes(key)) {
    awards.push({
      kind: "pase",
      amount: tabla.pase,
      source: `Umbral v2: Pase C${codigo} (${label})`,
      codigo,
      modo,
    });
    pushUnique(ledger.pasesCobrados, key);

    // Corte limpio: aprobado y este envío es el primer intento válido del código.
    if (denso && primerIntentoHistorico) {
      awards.push({
        kind: "corte_limpio",
        amount: UMBRAL_V2_CORTE_LIMPIO_PS,
        source: `Umbral v2: Corte limpio C${codigo} (${label})`,
        codigo,
        modo,
      });
    }
  }

  if (
    aprobado &&
    codigo === 10 &&
    !ledger.modulosCobrados.includes(modo)
  ) {
    awards.push({
      kind: "modulo",
      amount: UMBRAL_V2_MODULO_COMPLETO_PS,
      source: `Umbral v2: Módulo completo (${label})`,
      codigo,
      modo,
    });
    ledger.modulosCobrados.push(modo);
  }

  const total = awards.reduce((s, a) => s + a.amount, 0);
  return { awards, total, ledger, denso };
}
