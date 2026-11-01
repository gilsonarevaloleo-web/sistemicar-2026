/**
 * Evolución de los Diez Ojos.
 * La medida es la Ley de Cascada, no la cantidad de volcados ni de ojos.
 * Cantidad = persistencia (asistencia). Cascada = desarrollo de ver.
 *
 * Escalera de enseñanza: C1 → C2 → C4 → C5 → C7 → C10.
 * C3, C6, C8 y C9 cuentan como presencia; no abren peldaño.
 * Un C10 sin C1 no es evolución: el circuito no puede cerrar.
 */

import {
  estadoAlumnoDe,
  mapaTiene,
  primerPendienteCascada,
} from "./cascada.ts";
import { characterMapDe } from "./ojos.ts";
import { limaDateKey } from "./asistencia.ts";
import {
  CASCADE_CODES,
  EYE_CODES,
  type CascadeCode,
  type DepotAnalysisResult,
  type EstadoAlumnoCascada,
  type EyeCode,
} from "./types.ts";

export const INDICE_CASCADA_MAX = CASCADE_CODES.length;

export type TendenciaEvolucion = "sube" | "sostiene" | "baja" | "sin_muestra";

export interface PuntoEvolucion {
  timestamp: number;
  fecha: string;
  indice: number;
  peldano: CascadeCode | 0;
  pendiente: CascadeCode | null;
  estado: EstadoAlumnoCascada;
  presencia: EyeCode[];
  cableado: boolean;
}

export interface EvolucionOjos {
  puntos: PuntoEvolucion[];
  indiceActual: number;
  peldanoActual: CascadeCode | 0;
  pendienteActual: CascadeCode | null;
  tendencia: TendenciaEvolucion;
  presenciaPorOjo: Record<EyeCode, number>;
  sampleSize: number;
  mensaje: string;
}

export interface VolcadoParaEvolucion {
  result: DepotAnalysisResult;
  createdAt?: Date;
}

function vacioPresencia(): Record<EyeCode, number> {
  const out = {} as Record<EyeCode, number>;
  for (const n of EYE_CODES) out[n] = 0;
  return out;
}

export function indiceCascada(
  map: Record<EyeCode, boolean> | null | undefined,
): number {
  let i = 0;
  for (const code of CASCADE_CODES) {
    if (!mapaTiene(map, code)) break;
    i += 1;
  }
  return i;
}

export function peldanoAlcanzado(
  map: Record<EyeCode, boolean> | null | undefined,
): CascadeCode | 0 {
  const i = indiceCascada(map);
  return i === 0 ? 0 : CASCADE_CODES[i - 1];
}

export function etiquetaPeldano(peldano: CascadeCode | 0): string {
  return peldano === 0 ? "sin ancla" : `C${peldano}`;
}

function timestampDe(entry: VolcadoParaEvolucion): number {
  if (entry.createdAt instanceof Date) return entry.createdAt.getTime();
  return entry.result.timestamp;
}

export function puntoDesdeVolcado(entry: VolcadoParaEvolucion): PuntoEvolucion {
  const map = characterMapDe(entry.result);
  const ts = timestampDe(entry);
  const presencia = EYE_CODES.filter((n) => mapaTiene(map, n));
  return {
    timestamp: ts,
    fecha: limaDateKey(ts),
    indice: indiceCascada(map),
    peldano: peldanoAlcanzado(map),
    pendiente: primerPendienteCascada(map),
    estado: entry.result.estadoAlumno ?? estadoAlumnoDe(map),
    presencia,
    cableado: Boolean(entry.result.syntaxDiagnostic?.isCableadoConnected),
  };
}

function tendenciaDe(puntos: readonly PuntoEvolucion[]): TendenciaEvolucion {
  if (puntos.length === 0) return "sin_muestra";
  if (puntos.length === 1) return "sostiene";
  const reciente = puntos.slice(-3);
  const previo = puntos.slice(0, -3);
  const media = (xs: readonly PuntoEvolucion[]) =>
    xs.reduce((s, p) => s + p.indice, 0) / xs.length;
  if (previo.length === 0) {
    const first = puntos[0].indice;
    const last = puntos[puntos.length - 1].indice;
    if (last > first) return "sube";
    if (last < first) return "baja";
    return "sostiene";
  }
  const delta = media(reciente) - media(previo);
  if (delta >= 0.5) return "sube";
  if (delta <= -0.5) return "baja";
  return "sostiene";
}

export function mensajeEvolucion(evo: {
  sampleSize: number;
  tendencia: TendenciaEvolucion;
  peldanoActual: CascadeCode | 0;
  pendienteActual: CascadeCode | null;
}): string {
  if (evo.sampleSize === 0) {
    return "Sin volcados. La evolución no se cuenta: se escala. C1 → C2 → C4 → C5 → C7 → C10.";
  }
  const peldano = etiquetaPeldano(evo.peldanoActual);
  const siguiente = evo.pendienteActual
    ? ` El escalón pendiente es C${evo.pendienteActual}.`
    : " Circuito C1→C10 abrochado.";
  if (evo.tendencia === "sube") {
    return `La cascada sube. El peldaño actual es ${peldano}.${siguiente} La cantidad de volcados no es esta subida.`;
  }
  if (evo.tendencia === "baja") {
    return `Hay más volcados, no más peldaño. La cantidad no es evolución. Hoy el ancla está en ${peldano}.${siguiente}`;
  }
  return `Sostenés ${peldano}. La persistencia vive en la asistencia; el desarrollo, en la cascada.${siguiente}`;
}

export function medirEvolucionOjos(
  entries: readonly VolcadoParaEvolucion[] | null | undefined,
): EvolucionOjos {
  if (!entries || entries.length === 0) {
    const vacia: EvolucionOjos = {
      puntos: [],
      indiceActual: 0,
      peldanoActual: 0,
      pendienteActual: 1,
      tendencia: "sin_muestra",
      presenciaPorOjo: vacioPresencia(),
      sampleSize: 0,
      mensaje: "",
    };
    vacia.mensaje = mensajeEvolucion(vacia);
    return vacia;
  }

  const puntos = entries
    .map(puntoDesdeVolcado)
    .sort((a, b) => a.timestamp - b.timestamp);

  const last = puntos[puntos.length - 1];
  const presenciaPorOjo = vacioPresencia();
  for (const p of puntos) {
    for (const n of p.presencia) presenciaPorOjo[n] += 1;
  }

  const tendencia = tendenciaDe(puntos);
  const evo: EvolucionOjos = {
    puntos,
    indiceActual: last.indice,
    peldanoActual: last.peldano,
    pendienteActual: last.pendiente,
    tendencia,
    presenciaPorOjo,
    sampleSize: puntos.length,
    mensaje: "",
  };
  evo.mensaje = mensajeEvolucion(evo);
  return evo;
}
