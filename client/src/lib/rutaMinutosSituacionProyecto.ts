/**
 * Ruta de minutos situacionales → casilla del proyecto.
 *
 * - Ring (tarea con tiempo): el clic acredita los segundos reales de la fila.
 *   Si hay dirección de escalera (proyectoId) y el destino no es presencia,
 *   van a MIN NORTE. Presencia explícita → MIN PRESENCIA.
 * - Lista libre (sin tiempo): no llena minutos; el cierre alimenta presencia.
 * - La bolsa/trending NO se recalcula aquí: el kernel del ring ya lo hizo
 *   en applySituacionRowClose. Esta ruta es O(1) y segura para el gesto ms0.
 */
import type { DestinoCierre } from "./destinoCierre";
import { resolveDireccionProyecto } from "./resolveDireccionProyecto";

export type BucketMinutosProyecto = "norte" | "presencia" | "none";
export type FuenteMinutosSituacion = "ring-click" | "lista-libre";

export type RutaMinutosSituacionInput = {
  vehicleId: string;
  subId: string;
  /** Dirección de la fila (gana sobre el vehículo). */
  subProyectoId?: string | null;
  vehicleProyectoId?: string | null;
  destinoCierre?: DestinoCierre | null;
  fuente: FuenteMinutosSituacion;
  /** Segundos reales de la fila al clic (ya medidos por el kernel). */
  duracionRealSec?: number | null;
};

export type RutaMinutosSituacion = {
  bucket: BucketMinutosProyecto;
  proyectoId?: string;
  /** Segundos a acreditar (0 en lista libre). */
  segundos: number;
  creditKey: string;
  fuente: FuenteMinutosSituacion;
};

/** El clic mismo cuenta: mínimo 1 s si hay medición de ring. */
export function segundosTrabajadosAlClic(duracionRealSec?: number | null): number {
  const raw = typeof duracionRealSec === "number" && Number.isFinite(duracionRealSec)
    ? Math.max(0, Math.floor(duracionRealSec))
    : 0;
  return raw > 0 ? raw : 0;
}

export function minutosFromSegundos(segundos?: number | null): number {
  const s = typeof segundos === "number" && Number.isFinite(segundos) ? Math.max(0, segundos) : 0;
  return Math.max(0, Math.round(s / 60));
}

/** MIN NORTE visible = peldaños conquista + segundos del ring situacional. */
export function resolveMinutosNorteDisplay(
  peldanoMinutos: number,
  segundosNorteSituacion?: number | null
): number {
  return Math.max(0, Math.round(peldanoMinutos)) + minutosFromSegundos(segundosNorteSituacion);
}

export function resolveMinutosPresenciaDisplay(
  minutosPresencia: number,
  segundosPresenciaRing?: number | null
): number {
  return Math.max(0, Math.round(minutosPresencia)) + minutosFromSegundos(segundosPresenciaRing);
}

export function situacionCreditKey(vehicleId: string, subId: string): string {
  return `ring:${vehicleId}:${subId}`;
}

/**
 * Clasifica a dónde va el tiempo del clic.
 * Lista libre → presencia (sin minutos). Ring con dirección → norte,
 * salvo destinoCierre explícito "presencia".
 */
export function resolveRutaMinutosSituacion(
  input: RutaMinutosSituacionInput
): RutaMinutosSituacion {
  const creditKey = situacionCreditKey(input.vehicleId, input.subId);
  const proyectoId = resolveDireccionProyecto({
    subProyectoId: input.subProyectoId,
    vehicleProyectoId: input.vehicleProyectoId,
  });

  if (!proyectoId) {
    return {
      bucket: "none",
      segundos: 0,
      creditKey,
      fuente: input.fuente,
    };
  }

  if (input.fuente === "lista-libre") {
    return {
      bucket: "presencia",
      proyectoId,
      segundos: 0,
      creditKey,
      fuente: "lista-libre",
    };
  }

  const segundos = segundosTrabajadosAlClic(input.duracionRealSec);
  // El segundo del clic cuenta: si el kernel no dejó duración, 1 s de evidencia.
  const segundosAcreditados = segundos > 0 ? segundos : 1;

  if (input.destinoCierre === "presencia") {
    return {
      bucket: "presencia",
      proyectoId,
      segundos: segundosAcreditados,
      creditKey,
      fuente: "ring-click",
    };
  }

  // Dirección de escalera (proyectoId) → Norte, aunque destinoCierre aún no esté
  // sellado como peldaño. El toggle de presencia es el único veto.
  return {
    bucket: "norte",
    proyectoId,
    segundos: segundosAcreditados,
    creditKey,
    fuente: "ring-click",
  };
}

export function destinoCierreAlLanzarSituacion(opts: {
  esListaLibre: boolean;
  tieneDireccion: boolean;
}): DestinoCierre {
  if (opts.esListaLibre) return "presencia";
  if (opts.tieneDireccion) return "peldano";
  return "presencia";
}
