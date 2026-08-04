import type { Vehicle } from "./persistence";

const VEHICLES_KEY = "sistemicar_vehicles";
const CRASH_KEY = "sistemicar_planeacion_crash_count";

function cronFilaPendiente(st: { enDesgloseCronometro?: boolean; resultadoSituacion?: string }): boolean {
  return !!st.enDesgloseCronometro && (st.resultadoSituacion ?? "pendiente") === "pendiente";
}

/** Reto situacional con todas las filas cerradas pero cronómetro aún activo. */
export function repairStuckSituacionVehicles(): number {
  try {
    const raw = localStorage.getItem(VEHICLES_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Vehicle[];
    if (!Array.isArray(parsed)) return 0;
    let repaired = 0;
    const fixed = parsed.map(v => {
      if (v.status !== "activo" || v.tipoFlota !== "situacion" || !v.situacionCronometro) return v;
      const sc = v.situacionCronometro;
      if (sc.activo !== true) return v;
      const subs = Array.isArray(v.subTareas) ? v.subTareas : [];
      const cronSubs = subs.filter(s => s.enDesgloseCronometro);
      if (cronSubs.length === 0 || cronSubs.some(cronFilaPendiente)) return v;
      repaired++;
      return {
        ...v,
        situacionCronometro: { ...sc, activo: false },
      };
    });
    if (repaired > 0) {
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(fixed));
    }
    return repaired;
  } catch {
    return 0;
  }
}

/**
 * Archiva rings situacionales activos (salida de emergencia).
 * No toca interrupciones anidadas de una conquista aún activa — eso dejaría
 * el desglosador padre colgado en pausa sin el vehículo de interrupción.
 */
export function forceArchiveSituacionActivos(): number {
  try {
    const raw = localStorage.getItem(VEHICLES_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Vehicle[];
    if (!Array.isArray(parsed)) return 0;
    const byId = new Map(parsed.map(v => [v.id, v]));
    const now = Date.now();
    let archived = 0;
    const fixed = parsed.map(v => {
      if (v.status !== "activo" || v.tipoFlota !== "situacion") return v;
      const parentId = v.vehiculoPadreDesglosadorId;
      if (parentId) {
        const parent = byId.get(parentId);
        if (
          parent?.status === "activo" &&
          parent.tipoFlota === "tiempo" &&
          parent.tipoReloj === "desglosador"
        ) {
          return v;
        }
      }
      archived++;
      const aperturaAt = v.aperturaAt || now;
      return {
        ...v,
        status: "archivado" as const,
        cierreAt: now,
        duracionFinal: Math.max(1, Math.round((now - aperturaAt) / 60000)),
        situacionCronometro: null,
        situacionCupoAnchor: null,
        interrupcionActiva: false,
      };
    });
    if (archived > 0) {
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(fixed));
    }
    return archived;
  } catch {
    return 0;
  }
}

export function bumpPlaneacionCrashCount(): number {
  try {
    const n = Math.min(99, parseInt(sessionStorage.getItem(CRASH_KEY) || "0", 10) + 1);
    sessionStorage.setItem(CRASH_KEY, String(n));
    return n;
  } catch {
    return 1;
  }
}

export function clearPlaneacionCrashCount(): void {
  try {
    sessionStorage.removeItem(CRASH_KEY);
  } catch {
    // ignore
  }
}

export function getPlaneacionCrashCount(): number {
  try {
    return parseInt(sessionStorage.getItem(CRASH_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

export { vehiclesReactiveSignature } from "./vehiclesReactiveSignature";
