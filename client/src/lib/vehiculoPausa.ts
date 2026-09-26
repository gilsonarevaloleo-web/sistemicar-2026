/**
 * Historia de pausa de un desglosador / ring.
 *
 * No es trabajo negativo: el proyecto se pausa y la conciencia sigue
 * en otro vehículo (presencia). El sello guarda cuándo empezó y cuánto duró.
 */

export type VehiculoPausaStamp = {
  pausadoAt: number;
  reanudadoAt?: number;
  titulo?: string;
};

export function appendVehiculoPausa(
  existing: VehiculoPausaStamp[] | undefined,
  pausadoAt: number,
  titulo?: string
): VehiculoPausaStamp[] {
  const list = existing ? existing.map(p => ({ ...p })) : [];
  const open = list.find(p => p.reanudadoAt == null);
  if (open) {
    if (titulo && !open.titulo) open.titulo = titulo;
    return list;
  }
  list.push({
    pausadoAt,
    ...(titulo?.trim() ? { titulo: titulo.trim() } : {}),
  });
  return list;
}

/** Pone o corrige el nombre de la pausa abierta. No abre otra. */
export function labelVehiculoPausaAbierta(
  existing: VehiculoPausaStamp[] | undefined,
  titulo: string,
  fallbackPausadoAt?: number
): VehiculoPausaStamp[] | undefined {
  const t = titulo.trim();
  if (!t) return existing;
  const list = existing ? existing.map(p => ({ ...p })) : [];
  const openIdx = list.findIndex(p => p.reanudadoAt == null);
  if (openIdx >= 0) {
    if (list[openIdx]!.titulo === t) return existing;
    list[openIdx] = { ...list[openIdx]!, titulo: t };
    return list;
  }
  if (fallbackPausadoAt != null && fallbackPausadoAt > 0) {
    return appendVehiculoPausa(existing, fallbackPausadoAt, t);
  }
  return existing;
}

export function pausaAbiertaDe(
  vehicle: { pausas?: VehiculoPausaStamp[] }
): VehiculoPausaStamp | undefined {
  return vehicle.pausas?.find(p => p.reanudadoAt == null);
}

export function tituloPausaAbierta(
  vehicle: { pausas?: VehiculoPausaStamp[] }
): string {
  return nombrePausa(pausaAbiertaDe(vehicle) ?? {});
}

/** True si la pausa viva aún no tiene un inconveniente nombrado. */
export function pausaAbiertaSinNombrar(
  vehicle: { pausas?: VehiculoPausaStamp[] }
): boolean {
  const t = pausaAbiertaDe(vehicle)?.titulo?.trim();
  return !t || t === PAUSA_INTERRUPCION_TITULO;
}

export function closeVehiculoPausaAbierta(
  existing: VehiculoPausaStamp[] | undefined,
  reanudadoAt: number
): VehiculoPausaStamp[] | undefined {
  if (!existing?.length) return existing;
  let changed = false;
  const next = existing.map((p, i, arr) => {
    if (i !== arr.length - 1 || p.reanudadoAt != null) return p;
    changed = true;
    const z = reanudadoAt > p.pausadoAt ? reanudadoAt : p.pausadoAt;
    return { ...p, reanudadoAt: z };
  });
  return changed ? next : existing;
}

/** Título por defecto: un toque pausa sin abrir teclado de letras. */
export const PAUSA_INTERRUPCION_TITULO = "Pausa";

export function nombrePausa(
  stamp: Pick<VehiculoPausaStamp, "titulo">,
  fallback = PAUSA_INTERRUPCION_TITULO
): string {
  const t = stamp.titulo?.trim();
  return t || fallback;
}

/** Título de la interrupción. Vacío o solo espacios → Pausa (sin pedir letras). */
export function tituloPausaInterrupcion(raw?: string | null): string {
  const t = raw?.trim();
  return t || PAUSA_INTERRUPCION_TITULO;
}

/** Presencia en pausa: no es misión operativa ni ocupa cupo Dual Kernel. */
export type PausedPresenceVehicle = {
  interrupcionActiva?: boolean;
  desglosadorPausa?: { subActivoId?: string; pausadoAt?: number } | null;
  situacionNestedPause?: unknown;
  vehiculoPadreDesglosadorId?: string;
  subVehiculos?: Array<{ status?: string }>;
};

/**
 * Pausa / interrupción / postergación: el proyecto sigue, pero no es un
 * vehículo activo. Se pausa horas; no consume slot ni suma PS de cierre.
 */
export function isPausedPresence(v: PausedPresenceVehicle): boolean {
  if (v.vehiculoPadreDesglosadorId) return true;
  if (v.situacionNestedPause) return true;
  if (v.interrupcionActiva) return true;
  if (v.desglosadorPausa?.subActivoId || v.desglosadorPausa?.pausadoAt) return true;
  return (v.subVehiculos ?? []).some(s => s.status === "nested_paused");
}

/**
 * El padre está congelado: no cubre conciencia.
 * El hijo interrupt (vehiculoPadreDesglosadorId) no entra aquí — él sí cubre.
 */
export function isParentCoveragePaused(
  vehicle: Pick<
    PausedPresenceVehicle,
    "interrupcionActiva" | "desglosadorPausa" | "situacionNestedPause"
  >
): boolean {
  if (vehicle.interrupcionActiva) return true;
  if (vehicle.desglosadorPausa?.pausadoAt || vehicle.desglosadorPausa?.subActivoId) {
    return true;
  }
  return !!vehicle.situacionNestedPause;
}

export function minutosPausa(
  stamp: Pick<VehiculoPausaStamp, "pausadoAt" | "reanudadoAt">,
  now = Date.now()
): number {
  const z = stamp.reanudadoAt != null && stamp.reanudadoAt > stamp.pausadoAt
    ? stamp.reanudadoAt
    : now;
  if (z <= stamp.pausadoAt) return 0;
  return Math.max(1, Math.round((z - stamp.pausadoAt) / 60_000));
}
