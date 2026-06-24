import type { Vehicle } from "@/lib/persistence";

/** Deduplicación O(n) por id — última aparición gana. */
export function dedupeVehiclesById(vehicles: Vehicle[]): Vehicle[] {
  const byId = new Map<string, Vehicle>();
  for (const v of vehicles) {
    byId.set(v.id, v);
  }
  return [...byId.values()];
}

/**
 * Lista unificada para render de vehículos activos en Jornada.
 * Reemplaza dedup O(n²) con findIndex/includes.
 */
export function buildFlotaActivosRenderList(
  sortedOperativaActivos: Vehicle[],
  panoramicaActivos: Vehicle[],
  activeVehicles: Vehicle[]
): Vehicle[] {
  const seen = new Set<string>();
  const out: Vehicle[] = [];
  const push = (v: Vehicle) => {
    if (seen.has(v.id)) return;
    seen.add(v.id);
    out.push(v);
  };
  for (const v of sortedOperativaActivos) push(v);
  for (const v of panoramicaActivos) push(v);
  for (const v of activeVehicles) {
    if (!v.tipoTerminoRapido) push(v);
  }
  return out;
}
