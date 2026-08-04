/**
 * Pulso de cobertura — métrica lite de conciencia (conquista vs inconsciente).
 * Solo existe dentro de la planificación del día: sin segmentos = sin pulso (ruido).
 * Usa computeLiveEntropy (sin arcos SVG / horizonte). Prohibido en ms0 de gestos.
 */
import {
  computeLiveEntropy,
  formatMinutosJornada,
  vehicleCoversConsciousnessAt,
  type SegmentoAnilloLite,
} from "@/engines/ConcienciaEngine";
import { resolveCoverageVehicles } from "@/lib/entropyTimePolicy";
import { segmentTimeToMinutes } from "@/lib/segmentTime";
import type { Vehicle } from "@/lib/persistence";

export type PulsoSegmentoLite = SegmentoAnilloLite & {
  id?: string;
  nombre?: string;
  estado?: string;
};

export type PulsoCoberturaModel = {
  /** False cuando no hay planificación: el pulso no debe mostrarse ni acumular. */
  hasPlanificacion: boolean;
  conquistaMin: number;
  entropiaMin: number;
  /** conquista / (conquista + entropía) — 0–100 */
  coberturaPct: number;
  consciousNow: boolean;
  /** Segmento activo (o en curso) sin vehículo que cubra conciencia. */
  needsLaunch: boolean;
  segmentoActivoId: string | null;
  segmentoActivoNombre: string | null;
  conquistaLabel: string;
  entropiaLabel: string;
  computedAt: number;
};

export function buildPulsoInputSig(
  segmentos: PulsoSegmentoLite[],
  vehicles: Vehicle[],
  segmentoActivoId: string | null
): string {
  const segPart = segmentos
    .map(
      s =>
        `${s.id ?? ""}:${s.estado ?? ""}:${s.horaInicio ?? ""}:${s.horaFin ?? ""}`
    )
    .join("|");
  let active = 0;
  let coverBits = 0;
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    if (v.status === "activo") {
      active += 1;
      if (!v.autoVerdad) coverBits |= 1 << (i % 30);
    }
  }
  return `${segPart}::${vehicles.length}:${active}:${coverBits}::${segmentoActivoId ?? ""}`;
}

function resolveActiveSegment(
  segmentos: PulsoSegmentoLite[],
  segmentoActivoId: string | null
): PulsoSegmentoLite | null {
  if (segmentoActivoId) {
    const byId = segmentos.find(s => s.id === segmentoActivoId);
    if (byId) return byId;
  }
  return segmentos.find(s => s.estado === "activo") ?? null;
}

/** Minutos únicos planificados (ventanas fusionadas por solape). */
export function sumMinutosPlanificadosPulso(segmentos: PulsoSegmentoLite[]): number {
  if (segmentos.length === 0) return 0;
  const windows: { start: number; end: number }[] = [];
  for (const s of segmentos) {
    if (!s) continue;
    const ini = segmentTimeToMinutes(s.horaInicio || "");
    const fin = segmentTimeToMinutes(s.horaFin || "");
    if (!Number.isFinite(ini) || !Number.isFinite(fin)) continue;
    const end = fin >= ini ? fin : fin + 1440;
    if (end > ini) windows.push({ start: ini, end });
  }
  if (windows.length === 0) return 0;
  windows.sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = windows[0].start;
  let curEnd = windows[0].end;
  for (let i = 1; i < windows.length; i++) {
    const w = windows[i];
    if (w.start <= curEnd) {
      curEnd = Math.max(curEnd, w.end);
    } else {
      total += curEnd - curStart;
      curStart = w.start;
      curEnd = w.end;
    }
  }
  total += curEnd - curStart;
  return total;
}

/**
 * Cálculo puro del pulso. Llamar solo desde idle / cola sombra — nunca en handlers ms0.
 * Sin planificación → modelo vacío (no hay cobertura que medir).
 */
export function computePulsoCobertura(params: {
  segmentos: PulsoSegmentoLite[];
  vehicles: Vehicle[];
  segmentoActivoId?: string | null;
  now?: number;
  /** Solo tests: evita piso monótono en localStorage. */
  applyMonotonic?: boolean;
}): PulsoCoberturaModel {
  const now = params.now ?? Date.now();
  const segmentos = Array.isArray(params.segmentos) ? params.segmentos : [];
  const vehicles = Array.isArray(params.vehicles) ? params.vehicles : [];
  const segmentoActivoId = params.segmentoActivoId ?? null;
  const plannedMin = sumMinutosPlanificadosPulso(segmentos);

  if (segmentos.length === 0 || plannedMin <= 0) {
    return { ...EMPTY_PULSO_MODEL, computedAt: now };
  }

  const timeline = computeLiveEntropy({
    segmentos,
    vehiculos: vehicles,
    now,
    applyMonotonic: params.applyMonotonic,
  });

  const conquistaMin = timeline.dayStats.conquistaMin;
  // Techo duro: solo el terreno planificado no conquistado puede ser inconsciente.
  const entropiaCap = Math.max(0, plannedMin - conquistaMin);
  const entropiaMin = Math.min(timeline.dayStats.entropiaMin, entropiaCap);
  const fought = conquistaMin + entropiaMin;
  const coberturaPct =
    fought > 0 ? Math.min(100, Math.round((conquistaMin / fought) * 100)) : 0;

  const filtered = resolveCoverageVehicles(vehicles, now);
  const consciousNow = filtered.some(v => vehicleCoversConsciousnessAt(v, now));

  const active = resolveActiveSegment(segmentos, segmentoActivoId);
  const needsLaunch = Boolean(active && !consciousNow);

  return {
    hasPlanificacion: true,
    conquistaMin,
    entropiaMin,
    coberturaPct,
    consciousNow,
    needsLaunch,
    segmentoActivoId: active?.id ?? segmentoActivoId,
    segmentoActivoNombre: active?.nombre ?? null,
    conquistaLabel: formatMinutosJornada(conquistaMin),
    entropiaLabel: formatMinutosJornada(entropiaMin),
    computedAt: now,
  };
}

export const EMPTY_PULSO_MODEL: PulsoCoberturaModel = {
  hasPlanificacion: false,
  conquistaMin: 0,
  entropiaMin: 0,
  coberturaPct: 0,
  consciousNow: false,
  needsLaunch: false,
  segmentoActivoId: null,
  segmentoActivoNombre: null,
  conquistaLabel: "0 min",
  entropiaLabel: "0 min",
  computedAt: 0,
};
