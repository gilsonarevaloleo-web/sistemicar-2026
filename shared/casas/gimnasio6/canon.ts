/**
 * Canon vivo: tres tiempos por código, no 12 preguntas fijas.
 * El texto se planta con el volcado. Acá viven las semillas y el puntero.
 */

import {
  ETIQUETA_TIEMPO,
  conEscena,
  esCodigoGimnasio,
  esTiempoId,
  fichaDe,
  tiempoDe,
} from "./fichas.ts";
import type {
  CapituloId,
  LibroGimnasio,
  PasoCapitulo,
  PreguntaCanon,
  PreguntaIndice,
  PunteroGimnasio,
  PuertaGimnasio,
  SubcodigoId,
} from "./types.ts";
import { puertaDeModulo } from "./types.ts";

export { ETIQUETA_TIEMPO };

export function etiquetaCapituloDe(
  codigo: CapituloId,
  puerta: PuertaGimnasio = "limite",
): string {
  const ficha = fichaDe(puerta, codigo);
  return `C${codigo} ${ficha.nombre}`;
}

export const ETIQUETA_CAPITULO: Record<CapituloId, string> = {
  1: etiquetaCapituloDe(1),
  2: etiquetaCapituloDe(2),
  3: etiquetaCapituloDe(3),
  4: etiquetaCapituloDe(4),
  5: etiquetaCapituloDe(5),
  6: etiquetaCapituloDe(6),
  7: etiquetaCapituloDe(7),
  8: etiquetaCapituloDe(8),
  9: etiquetaCapituloDe(9),
  10: etiquetaCapituloDe(10),
};

export const ETIQUETA_SUBCODIGO: Record<1, Record<PreguntaIndice, string>> = {
  1: {
    1: ETIQUETA_TIEMPO[1],
    2: ETIQUETA_TIEMPO[2],
    3: ETIQUETA_TIEMPO[3],
  },
};

export function etiquetaSubcodigo(
  _capitulo: CapituloId,
  subcodigo: SubcodigoId,
): string {
  if (subcodigo === 1) return ETIQUETA_TIEMPO[1];
  return ETIQUETA_TIEMPO[1];
}

export function recorteEscenario(texto: string, max = 52): string {
  const clean = texto.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function capituloVisibleDe(
  libro: Pick<LibroGimnasio, "puntero" | "estado" | "capitulosSellados">,
): CapituloId {
  if (libro.estado === "TOPE_DIARIO" || libro.estado === "CAPITULO_SELLADO") {
    const last = libro.capitulosSellados[libro.capitulosSellados.length - 1];
    if (last && esCodigoGimnasio(last)) return last;
  }
  return esCodigoGimnasio(libro.puntero.capitulo) ? libro.puntero.capitulo : 1;
}

export function pasosDelCapitulo(
  capitulo: CapituloId,
  puntero: PunteroGimnasio,
  opts: { sellado?: boolean; puerta?: PuertaGimnasio; origen?: string } = {},
): PasoCapitulo[] {
  const puerta = opts.puerta ?? "limite";
  const ficha = fichaDe(puerta, capitulo);
  const origen = opts.origen ?? "";
  const mismoCodigo = puntero.capitulo === capitulo;
  return ficha.tiempos.map((tiempo) => {
    let estado: PasoCapitulo["estado"];
    if (opts.sellado) {
      estado = "hecho";
    } else if (!mismoCodigo) {
      estado = puntero.capitulo > capitulo ? "hecho" : "pendiente";
    } else if (tiempo.id < puntero.indice) {
      estado = "hecho";
    } else if (tiempo.id === puntero.indice) {
      estado = "actual";
    } else {
      estado = "pendiente";
    }
    const escenario = conEscena(tiempo.escenarioSemilla, origen);
    return {
      capitulo,
      subcodigo: 1 as SubcodigoId,
      indice: tiempo.id,
      etiquetaSubcodigo: ETIQUETA_TIEMPO[tiempo.id],
      etiquetaCapitulo: etiquetaCapituloDe(capitulo, puerta),
      estado,
      recorteEscenario: estado === "hecho" ? recorteEscenario(escenario) : null,
    };
  });
}

export function preguntaCanon(
  capitulo: CapituloId,
  _subcodigo: SubcodigoId,
  indice: PreguntaIndice,
  puerta: PuertaGimnasio = "limite",
  origen = "",
): PreguntaCanon | null {
  if (!esCodigoGimnasio(capitulo) || !esTiempoId(indice)) return null;
  const tiempo = tiempoDe(puerta, capitulo, indice);
  return {
    capitulo,
    subcodigo: 1,
    indice,
    escenario: conEscena(tiempo.escenarioSemilla, origen),
    pregunta: tiempo.preguntaSemilla,
    criterioMotor: tiempo.criterioMotor,
  };
}

export function capituloPreparable(capitulo: CapituloId): boolean {
  return esCodigoGimnasio(capitulo);
}

export function siguientePuntero(
  capitulo: CapituloId,
  _subcodigo: SubcodigoId,
  indice: PreguntaIndice,
): { capitulo: CapituloId; subcodigo: SubcodigoId; indice: PreguntaIndice } | "sellar" {
  if (indice < 3) {
    return { capitulo, subcodigo: 1, indice: (indice + 1) as PreguntaIndice };
  }
  return "sellar";
}

export function siguienteCodigo(capitulo: CapituloId): CapituloId | null {
  if (capitulo >= 10) return null;
  return (capitulo + 1) as CapituloId;
}

export const CANON_GIMNASIO: PreguntaCanon[] = ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).flatMap(
  (codigo) =>
    ([1, 2, 3] as const).map((indice) => preguntaCanon(codigo, 1, indice)!),
);

export { puertaDeModulo };
