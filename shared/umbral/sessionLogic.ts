/**
 * Umbral v2 — Lógica pura de mutación de sesión (sin I/O).
 */

import {
  isCodigoNumero,
  type CodigoNumero,
  type ModoUmbral,
} from "./engineConfig.ts";
import {
  UMBRAL_V2_CORTE_LIMPIO_PS,
  UMBRAL_V2_MODULO_COMPLETO_PS,
  UMBRAL_V2_PS_POR_CODIGO,
} from "./pointsConfig.ts";
import type { SesionUmbral } from "./sessionTypes.ts";

export interface AplicarEvaluacionInput {
  codigo: CodigoNumero;
  aprobado: boolean;
  respuestaUsuario: string;
  feedbackGemini: string;
  codigoSiguiente: CodigoNumero | null;
  /** ISO timestamp; por defecto now. */
  nowIso?: string;
  /** Override de PS (p.ej. total real otorgado en cliente). */
  psGanadosOverride?: number;
}

/** Estima PS de un código aprobado en contexto de sesión (sin ledger diario). */
export function estimarPsCodigoAprobado(
  codigo: CodigoNumero,
  intentosEnCodigo: number,
): number {
  const tabla = UMBRAL_V2_PS_POR_CODIGO[codigo];
  let total = tabla.intento + tabla.pase;
  if (intentosEnCodigo <= 1) {
    total += UMBRAL_V2_CORTE_LIMPIO_PS;
  }
  if (codigo === 10) {
    total += UMBRAL_V2_MODULO_COMPLETO_PS;
  }
  return total;
}

export function crearSesionUmbral(input: {
  id: string;
  userId: string;
  modo: ModoUmbral;
  codigoActual?: CodigoNumero;
  nowIso?: string;
}): SesionUmbral {
  const now = input.nowIso ?? new Date().toISOString();
  return {
    id: input.id,
    userId: input.userId,
    modo: input.modo,
    estado: "EN_PROGRESO",
    codigoActual: input.codigoActual ?? 1,
    intentosTotales: 0,
    historialCodigos: [],
    intentosCodigoActual: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Aplica un intento de evaluación a la sesión activa.
 * - Siempre incrementa intentosTotales.
 * - Si aprueba: registra historialCodigos, avanza código o completa módulo.
 * - Si rechaza: acumula intentosCodigoActual y permanece.
 */
export function aplicarEvaluacionASesion(
  sesion: SesionUmbral,
  input: AplicarEvaluacionInput,
): SesionUmbral {
  const now = input.nowIso ?? new Date().toISOString();
  const codigo = input.codigo;

  let intentosCodigoActual = sesion.intentosCodigoActual;
  let codigoActual = sesion.codigoActual;

  if (codigo !== sesion.codigoActual) {
    // Reanudación / sync: el intento manda sobre el puntero previo.
    codigoActual = codigo;
    intentosCodigoActual = 0;
  }

  intentosCodigoActual += 1;

  const next: SesionUmbral = {
    ...sesion,
    codigoActual,
    intentosTotales: sesion.intentosTotales + 1,
    intentosCodigoActual,
    updatedAt: now,
    historialCodigos: [...sesion.historialCodigos],
  };

  if (!input.aprobado) {
    return next;
  }

  // Evitar duplicar un código ya aprobado en esta sesión.
  if (next.historialCodigos.some((h) => h.codigo === codigo)) {
    next.intentosCodigoActual = 0;
    if (input.codigoSiguiente != null && isCodigoNumero(input.codigoSiguiente)) {
      next.codigoActual = input.codigoSiguiente;
    }
    return next;
  }

  const psGanados =
    typeof input.psGanadosOverride === "number" &&
    Number.isFinite(input.psGanadosOverride)
      ? Math.max(0, Math.round(input.psGanadosOverride))
      : estimarPsCodigoAprobado(codigo, intentosCodigoActual);

  next.historialCodigos.push({
    codigo,
    intentos: intentosCodigoActual,
    respuestaAprobada: input.respuestaUsuario,
    feedbackGemini: input.feedbackGemini,
    psGanados,
    fechaAprobacion: now,
  });
  next.intentosCodigoActual = 0;

  const completa =
    codigo === 10 ||
    input.codigoSiguiente == null ||
    next.historialCodigos.length >= 10;

  if (completa) {
    next.estado = "COMPLETADO";
    next.codigoActual = codigo;
  } else if (
    input.codigoSiguiente != null &&
    isCodigoNumero(input.codigoSiguiente)
  ) {
    next.codigoActual = input.codigoSiguiente;
  }

  return next;
}

/** Agrega intentos por código (historial + pendientes del código actual). */
export function intentosPorCodigoDeSesion(
  sesion: SesionUmbral,
): Record<number, number> {
  const map: Record<number, number> = {};
  for (const h of sesion.historialCodigos) {
    map[h.codigo] = (map[h.codigo] ?? 0) + h.intentos;
  }
  if (sesion.estado === "EN_PROGRESO" && sesion.intentosCodigoActual > 0) {
    const c = sesion.codigoActual;
    map[c] = (map[c] ?? 0) + sesion.intentosCodigoActual;
  }
  return map;
}
