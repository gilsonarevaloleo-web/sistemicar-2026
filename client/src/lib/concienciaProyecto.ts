/**
 * Conciencia por proyecto (Hub Escalera).
 * Tres etapas: inconsciente → presente → norte.
 * Minutos de presencia NO escriben peldaños; minutos norte sí (vía conquistados).
 */

export type EtapaConcienciaProyecto = "inconsciente" | "presente" | "norte";

export const ETAPA_CONCIENCIA_META: Record<
  EtapaConcienciaProyecto,
  { label: string; orden: 1 | 2 | 3; hint: string }
> = {
  inconsciente: {
    label: "Inconsciente",
    orden: 1,
    hint: "Sin vehículo vinculado — el tiempo puede irse sin dueño.",
  },
  presente: {
    label: "Presente",
    orden: 2,
    hint: "Cobertura consciente sin reclamar peldaño.",
  },
  norte: {
    label: "Norte",
    orden: 3,
    hint: "Cierres que suben la escalera del proyecto.",
  },
};

export interface ConcienciaProyectoInput {
  minutosPresencia?: number;
  sesionesPresencia?: number;
  minutosNorte?: number;
  peldanosConquistados?: number;
  primeraPresenciaAt?: number;
  primerNorteAt?: number;
}

export interface ConcienciaProyectoResumen {
  etapa: EtapaConcienciaProyecto;
  minutosPresencia: number;
  minutosNorte: number;
  minutosInvertidos: number;
  sesionesPresencia: number;
  primeraPresenciaAt?: number;
  primerNorteAt?: number;
  /** Texto corto para “¿cómo ha empezado?” */
  relatoInicio: string;
}

export function resolveEtapaConcienciaProyecto(
  input: ConcienciaProyectoInput
): EtapaConcienciaProyecto {
  const minutosNorte = Math.max(0, input.minutosNorte ?? 0);
  const peldanos = Math.max(0, input.peldanosConquistados ?? 0);
  if (minutosNorte > 0 || peldanos > 0 || input.primerNorteAt != null) {
    return "norte";
  }
  const minutosPresencia = Math.max(0, input.minutosPresencia ?? 0);
  const sesiones = Math.max(0, input.sesionesPresencia ?? 0);
  if (minutosPresencia > 0 || sesiones > 0 || input.primeraPresenciaAt != null) {
    return "presente";
  }
  return "inconsciente";
}

function formatDiaCorto(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("es", { day: "numeric", month: "short" });
  } catch {
    return "—";
  }
}

export function buildConcienciaProyectoResumen(
  input: ConcienciaProyectoInput
): ConcienciaProyectoResumen {
  const minutosPresencia = Math.max(0, Math.round(input.minutosPresencia ?? 0));
  const minutosNorte = Math.max(0, Math.round(input.minutosNorte ?? 0));
  const sesionesPresencia = Math.max(0, input.sesionesPresencia ?? 0);
  const etapa = resolveEtapaConcienciaProyecto(input);
  const primeraPresenciaAt = input.primeraPresenciaAt;
  const primerNorteAt = input.primerNorteAt;

  let relatoInicio: string;
  if (etapa === "inconsciente") {
    relatoInicio = "Aún sin evidencia de presencia vinculada.";
  } else if (etapa === "presente") {
    relatoInicio = primeraPresenciaAt
      ? `Empezó en Presente · ${formatDiaCorto(primeraPresenciaAt)}`
      : "Está en Presente (cobertura sin peldaño).";
  } else if (primeraPresenciaAt && primerNorteAt) {
    relatoInicio = `Inconsciente → Presente ${formatDiaCorto(primeraPresenciaAt)} → Norte ${formatDiaCorto(primerNorteAt)}`;
  } else if (primerNorteAt) {
    relatoInicio = `Entró a Norte · ${formatDiaCorto(primerNorteAt)}`;
  } else {
    relatoInicio = "Ya hay peldaños / minutos Norte.";
  }

  return {
    etapa,
    minutosPresencia,
    minutosNorte,
    minutosInvertidos: minutosPresencia + minutosNorte,
    sesionesPresencia,
    primeraPresenciaAt,
    primerNorteAt,
    relatoInicio,
  };
}

/** Duración de cierre en minutos (vehículo). Evita 0 min cuando falta duracionFinal. */
export function resolveDuracionMinCierre(
  vehicle: {
    duracionFinal?: number;
    aperturaAt?: number;
    cierreAt?: number;
  },
  optsDuracionMin?: number
): number {
  if (typeof optsDuracionMin === "number" && Number.isFinite(optsDuracionMin) && optsDuracionMin > 0) {
    return Math.max(1, Math.round(optsDuracionMin));
  }
  if (typeof vehicle.duracionFinal === "number" && vehicle.duracionFinal > 0) {
    return Math.max(1, Math.round(vehicle.duracionFinal));
  }
  const apertura = vehicle.aperturaAt;
  const cierre = vehicle.cierreAt;
  if (typeof apertura === "number" && typeof cierre === "number" && cierre > apertura) {
    return Math.max(1, Math.round((cierre - apertura) / 60_000));
  }
  return 0;
}

const PRESENCIA_VEHICLE_RING = 48;

/** Ring buffer idempotente: true si el vehicleId es nuevo y debe contarse. */
export function pushPresenciaVehicleId(
  prev: string[] | undefined,
  vehicleId: string
): { next: string[]; isNew: boolean } {
  const id = vehicleId.trim();
  if (!id) return { next: prev ?? [], isNew: false };
  const cur = prev ?? [];
  if (cur.includes(id)) return { next: cur, isNew: false };
  const next = [...cur, id];
  if (next.length > PRESENCIA_VEHICLE_RING) {
    return { next: next.slice(next.length - PRESENCIA_VEHICLE_RING), isNew: true };
  }
  return { next, isNew: true };
}
