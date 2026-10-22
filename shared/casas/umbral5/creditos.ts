/**
 * Precio de la lectura-mapa de la Casa 5.
 * El volcado es gratis. El gimnasio no cobra crédito.
 */

export const CREDITO_LECTURA_MAPA = 1 as const;

export function mensajeSaldoInsuficiente(
  requeridos: number,
  saldo: number,
): string {
  return `Saldo insuficiente para la lectura del mapa. Se requieren ${requeridos} crédito(s). Saldo: ${saldo}.`;
}
