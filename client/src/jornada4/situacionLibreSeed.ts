/**
 * Semilla de lista libre: vehículo de tiempo simple (sin desglosador / sin ring).
 * Una fila a la vez, reloj de pared, minutos al proyecto.
 */
import type { SubTarea, Vehicle } from "../lib/persistence";
import { normalizeSeccionTitulo } from "../lib/desglosadorSecciones";
import { ringSessionOperable } from "../lib/ringEnfoqueReal";

export type SituacionLibreSeed = {
  subTareas: SubTarea[];
  situacionCronometro: null;
  situacionCupoAnchor: null;
};

export function buildSituacionLibreSeed(opts: {
  filas: string[];
  /** Dirección por fila (vacío = hereda default). */
  filasProyectoIds?: Array<string | undefined>;
  /** Familia / título propio por fila (vacío = sin familia). */
  filasSeccionTitulos?: Array<string | undefined>;
  now?: number;
  proyectoEnfoqueId?: string;
}): SituacionLibreSeed | null {
  const now = opts.now ?? Date.now();
  const ids = opts.filasProyectoIds ?? [];
  const secciones = opts.filasSeccionTitulos ?? [];
  const filas = opts.filas
    .map((f, i) => ({
      texto: f.trim(),
      proyectoId: ids[i]?.trim() || undefined,
      seccionTitulo: normalizeSeccionTitulo(secciones[i]) ?? undefined,
    }))
    .filter(f => f.texto.length > 0);
  if (filas.length === 0) return null;
  const proyectoEnfoqueId = opts.proyectoEnfoqueId?.trim() || undefined;

  const subTareas: SubTarea[] = filas.map((fila, i) => {
    const proyectoId = fila.proyectoId || proyectoEnfoqueId;
    return {
      id: `st_j4_libre_${now}_${i}`,
      texto: fila.texto,
      completada: false,
      creadaAt: now,
      enDesgloseCronometro: false,
      resultadoSituacion: "pendiente" as const,
      ...(proyectoId ? { proyectoId } : {}),
      ...(fila.seccionTitulo ? { seccionTitulo: fila.seccionTitulo } : {}),
    };
  });

  return {
    subTareas,
    situacionCronometro: null,
    situacionCupoAnchor: null,
  };
}

export function isSituacionListaLibre(v: Vehicle): boolean {
  if (v.tipoFlota !== "situacion" || v.status !== "activo") return false;
  // Ring pausado/operable no es lista libre (evita “pérdida” visual del ring al volver).
  if (ringSessionOperable(v.situacionCronometro, v.subTareas ?? [])) return false;
  return (v.subTareas?.length ?? 0) > 0;
}

/** Inicio del tramo medido: último cierre, apertura del vehículo o alta de la fila. */
export function listaLibreRowStartedAt(
  vehicle: Pick<Vehicle, "aperturaAt" | "subTareas">,
  subId: string
): number {
  const rows = vehicle.subTareas ?? [];
  const target = rows.find(r => r.id === subId);
  let lastClosed = 0;
  for (let i = 0; i < rows.length; i++) {
    const closed = rows[i]?.cerradaAt;
    if (rows[i]?.id === subId) continue;
    if (typeof closed === "number" && Number.isFinite(closed) && closed > lastClosed) {
      lastClosed = closed;
    }
  }
  const apertura =
    typeof vehicle.aperturaAt === "number" && Number.isFinite(vehicle.aperturaAt)
      ? vehicle.aperturaAt
      : 0;
  const creada =
    typeof target?.creadaAt === "number" && Number.isFinite(target.creadaAt)
      ? target.creadaAt
      : 0;
  return Math.max(lastClosed, apertura, creada);
}

export type ListaLibreRowCloseResult = {
  subTareas: SubTarea[];
  closed: SubTarea;
};

/**
 * Cierra una fila de lista libre midiendo el tramo real.
 * Mínimo 1 s — el gesto cuenta, como el clic del ring.
 */
export function applyListaLibreRowClose(
  vehicle: Pick<Vehicle, "aperturaAt" | "subTareas" | "status" | "tipoFlota">,
  subTareaId: string,
  status: "cumplido" | "fallado" | "avance",
  now = Date.now()
): ListaLibreRowCloseResult | null {
  if (vehicle.tipoFlota !== "situacion" || vehicle.status !== "activo") return null;
  const rows = vehicle.subTareas ?? [];
  const target = rows.find(r => r.id === subTareaId);
  if (!target) return null;
  const current = target.resultadoSituacion ?? (target.completada ? "cumplido" : "pendiente");
  if (current !== "pendiente") return null;

  const started = listaLibreRowStartedAt(vehicle, subTareaId);
  const elapsed = started > 0 ? Math.floor((now - started) / 1000) : 0;
  const duracionRealSec = Math.max(1, elapsed);
  const closed: SubTarea = {
    ...target,
    completada: status === "cumplido",
    resultadoSituacion: status,
    duracionRealSec,
    cerradaAt: now,
  };
  return {
    subTareas: rows.map(r => (r.id === subTareaId ? closed : r)),
    closed,
  };
}
