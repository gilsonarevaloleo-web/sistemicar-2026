/**
 * Precio en créditos de las dos fases del Juez Serio.
 * La Fase 2 siempre cobra: requiereInversionCreditos = true.
 */

export const CREDITO_FASE1_LECTURA = 1 as const;
export const CREDITO_FASE2_SOLUCION = 1 as const;

export type FaseJuez = 1 | 2;

export function creditosDeFase(fase: FaseJuez): number {
  return fase === 1 ? CREDITO_FASE1_LECTURA : CREDITO_FASE2_SOLUCION;
}

export function mensajeSaldoInsuficiente(
  fase: FaseJuez,
  requeridos: number,
  saldo: number,
): string {
  const nombre =
    fase === 1
      ? "Fase 1 (Lectura del Perímetro)"
      : "Fase 2 (Solución Operacional)";
  return `Saldo insuficiente para la ${nombre}. Se requieren ${requeridos} crédito(s). Saldo: ${saldo}.`;
}
