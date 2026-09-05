/** Recinto de lo ajeno — disponible desde Base. El sistema no lo saca; marca lastre. */

export type RecintoEstado = "dentro" | "salio" | "heredado";
export type RecintoCerradoPor = "operador" | "sistema";

export interface RecintoAjeno {
  id: string;
  texto: string;
  fecha: string;
  entraAt: number;
  saleAt: number;
  estado: RecintoEstado;
  cerradoAt?: number;
  cerradoPor?: RecintoCerradoPor;
}

export interface RecintoConteo {
  abiertos: number;
  cerrados: number;
  heredados: number;
}
