/**
 * Router de fichas vivas. Puerta A = límite. Puerta B = vendedor.
 * No mezclan C1.
 */

import type { CodigoLimite } from "../umbral5/diccionarioLimites.ts";
import {
  FICHAS_LIMITE,
  conEscena,
  esCodigoGimnasio,
  esTiempoId,
  fichaLimiteDe,
  tiempoLimiteDe,
  type FichaVivaLimite,
  type TiempoFicha,
  type TiempoId,
} from "./fichasLimite.ts";
import { FICHAS_VENDEDOR, fichaVendedorDe, tiempoVendedorDe } from "./fichasVendedor.ts";
import type { PuertaGimnasio } from "./types.ts";

export {
  ETIQUETA_TIEMPO,
  FICHAS_LIMITE,
  NOMBRE_TIEMPO,
  conEscena,
  esCodigoGimnasio,
  esTiempoId,
  fichaLimiteDe,
  tiempoLimiteDe,
} from "./fichasLimite.ts";
export type {
  FichaVivaLimite,
  NombreTiempo,
  TiempoFicha,
  TiempoId,
} from "./fichasLimite.ts";
export { FICHAS_VENDEDOR, fichaVendedorDe, tiempoVendedorDe } from "./fichasVendedor.ts";

export function fichaDe(
  puerta: PuertaGimnasio,
  codigo: CodigoLimite,
): FichaVivaLimite {
  return puerta === "vendedor" ? fichaVendedorDe(codigo) : fichaLimiteDe(codigo);
}

export function tiempoDe(
  puerta: PuertaGimnasio,
  codigo: CodigoLimite,
  tiempo: TiempoId,
): TiempoFicha {
  return puerta === "vendedor"
    ? tiempoVendedorDe(codigo, tiempo)
    : tiempoLimiteDe(codigo, tiempo);
}

export function packDe(puerta: PuertaGimnasio): Record<CodigoLimite, FichaVivaLimite> {
  return puerta === "vendedor" ? FICHAS_VENDEDOR : FICHAS_LIMITE;
}
