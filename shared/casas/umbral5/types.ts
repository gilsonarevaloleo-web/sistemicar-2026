/**
 * Contratos de La Casa 5: Umbral.
 * El usuario ya sabe el límite. El código no es queja.
 * C8–C10 son dominio nuestro: nunca se le asignan.
 */

export type CodigoUsuario = 1 | 2 | 3 | 5 | 6 | 7;

export const CODIGOS_USUARIO: readonly CodigoUsuario[] = [1, 2, 3, 5, 6, 7];

export type PisoIntento = 1 | 2 | 3;

export type TipoLimite = "opinion" | "creencia" | "conviccion" | "impronta";

export const TIPOS_LIMITE: readonly TipoLimite[] = [
  "opinion",
  "creencia",
  "conviccion",
  "impronta",
];

export interface Umbral5Input {
  /** Límite ya conocido. El Juez (u él) ya lo nombró. */
  limiteConocido: string;
}

export interface Umbral5Lectura {
  /** Asiento que se le dice. Nunca 4, 8, 9 ni 10. */
  codigoUsuario: CodigoUsuario;
  /** C1 sé / C2 alrededor / C3 trabajé. */
  pisoIntento: PisoIntento;
  /** C4 nombra el tipo. Impronta no sienta C10. */
  tipoLimite: TipoLimite | null;
  /** Frase fría del asiento. */
  lecturaFria: string;
  /** Por qué ese saber no se ejecuta. */
  porQueNoEjecuta: string;
}

export type Umbral5ParseOk = {
  ok: true;
  result: Umbral5Lectura;
};

export type Umbral5ParseErr = {
  ok: false;
  error: string;
};

export type Umbral5ParseResult = Umbral5ParseOk | Umbral5ParseErr;
