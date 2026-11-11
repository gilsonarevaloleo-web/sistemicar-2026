/**
 * Contratos de La Casa 6: Umbral.
 * El usuario ya sabe el límite. El código es el canal, no la queja ni el Oficio.
 * C8–C10 se nombran. El asiento que se le dice es C1–C7.
 */

import type { CodigoLimite, PoloLimite } from "./diccionarioLimites.ts";

export type { CodigoLimite, PoloLimite };

/** Asiento que se le dice. Incluye C4 (estructura). Nunca 8, 9 ni 10. */
export type CodigoUsuario = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const CODIGOS_USUARIO: readonly CodigoUsuario[] = [1, 2, 3, 4, 5, 6, 7];

export type PisoIntento = 1 | 2 | 3;

export type TipoLimite = "opinion" | "creencia" | "conviccion" | "impronta";

export const TIPOS_LIMITE: readonly TipoLimite[] = [
  "opinion",
  "creencia",
  "conviccion",
  "impronta",
];

export type ModuloGimnasioOferta = "limite" | "vendedor" | "social_producto" | null;

export interface Umbral5Input {
  /** Límite ya conocido. El Juez (u él) ya lo nombró. */
  limiteConocido: string;
}

export interface Umbral5Lectura {
  /** Canal del límite (C1–C10). */
  codigoLimite: CodigoLimite;
  /** Pro sostiene; contra es el límite. */
  polo: PoloLimite;
  /** Asiento que se le dice. Nunca 8, 9 ni 10. */
  codigoUsuario: CodigoUsuario;
  /** C1 sé / C2 alrededor / C3 trabajé. No es el canal. */
  pisoIntento: PisoIntento;
  /** Opinión / creencia / convicción / impronta. No es el canal. */
  tipoLimite: TipoLimite | null;
  /** Frase fría del asiento. */
  lecturaFria: string;
  /** Por qué ese saber no se ejecuta. */
  porQueNoEjecuta: string;
  /**
   * Puerta A del gimnasio: "limite".
   * "social_producto" se hidrata como "limite".
   * null = queja del Espejo u origen vacío.
   */
  moduloGimnasio: ModuloGimnasioOferta;
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
