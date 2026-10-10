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

export type ConquistaPauseSnapshot = {
  tipoReloj?: string;
  interrupcionActiva?: boolean;
  desglosadorPausa?: { subActivoId?: string; pausadoAt?: number } | null;
  subVehiculos?: Array<{ status?: string }>;
  pausas?: VehiculoPausaStamp[];
};

export type ConquistaPauseActionKind = "pause" | "resume" | "running";

export type ConquistaPauseAction = {
  kind: ConquistaPauseActionKind;
  at: number;
};

/**
 * Última acción del operador sobre la pausa de conquista.
 * No es un ranking total: un resume viejo no vence a una pausa más nueva.
 */
export function conquistaPauseAction(v: ConquistaPauseSnapshot): ConquistaPauseAction {
  if (v.tipoReloj !== "desglosador") return { kind: "running", at: 0 };
  const paused =
    v.interrupcionActiva === true ||
    !!v.desglosadorPausa?.subActivoId ||
    (v.subVehiculos ?? []).some(s => s.status === "nested_paused");
  if (paused) {
    const open = (v.pausas ?? []).find(p => p.reanudadoAt == null);
    const at = v.desglosadorPausa?.pausadoAt ?? open?.pausadoAt ?? 0;
    return { kind: "pause", at };
  }
  let lastResume = 0;
  for (const p of v.pausas ?? []) {
    if (p.reanudadoAt != null && p.reanudadoAt > lastResume) lastResume = p.reanudadoAt;
  }
  const hasActive = (v.subVehiculos ?? []).some(s => s.status === "activo");
  if (lastResume > 0 && hasActive) return { kind: "resume", at: lastResume };
  return { kind: "running", at: 0 };
}

/**
 * True si `candidate` tiene una pausa/reanudación más reciente que `incumbent`.
 * Empate o sin reloj comparable: no pisa. Pausa sin timestamp no se rinde a un resume.
 */
export function conquistaPauseActionIsNewer(
  candidate: ConquistaPauseSnapshot,
  incumbent: ConquistaPauseSnapshot
): boolean {
  const c = conquistaPauseAction(candidate);
  const i = conquistaPauseAction(incumbent);
  if (c.kind === "running") return false;
  if (i.kind === "running") return true;
  if (c.at === 0 || i.at === 0) {
    if (c.kind === i.kind) return c.at > i.at;
    return c.kind === "pause";
  }
  return c.at > i.at;
}

/** En merge: la acción más reciente gana; empate se queda con `local`. */
export function pickConquistaSessionPauseSource<T extends ConquistaPauseSnapshot>(
  local: T,
  remote: T
): T {
  return conquistaPauseActionIsNewer(remote, local) ? remote : local;
}

/**
 * Estado puntual de un snapshot (no comparar dos lados con esto).
 * 2 = resume cerrado + sub activo
 * 1 = pausa abierta
 * 0 = en curso sin sello
 */
export function conquistaSessionPauseRank(v: ConquistaPauseSnapshot): number {
  const action = conquistaPauseAction(v);
  if (action.kind === "resume") return 2;
  if (action.kind === "pause") return 1;
  return 0;
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
