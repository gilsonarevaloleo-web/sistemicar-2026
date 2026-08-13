/**
 * Desvincula un proyecto del resto del sistema (flota, planilla, rutinas, Crisol).
 * Local-first: no importa persistence.ts para no ciclar con el Hub.
 *
 * Claves alineadas con persistence.ts / situacionReserva.ts.
 */

export type ProyectoLifecycleMode = "delete" | "reset";

const VEHICLES_KEY = "sistemicar_vehicles";
const PARKED_ACTIVES_KEY = "sistemicar_parked_actives";
const PARKED_ACTIVES_DURABLE_KEY = "sistemicar_parked_actives_durable";
const PLANILLA_PREFIX = "sistemicar_planilla_v5_";
const PLANTILLAS_KEY_PREFIX = "sistemicar_plantillas_rutina_";
const RESERVA_KEY = "sistemicar_situacion_reserva";
export const SITUACION_RESERVA_EVENT = "sistemicar-situacion-reserva-changed";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function omit<T extends Record<string, unknown>>(obj: T, keys: string[]): T {
  const next = { ...obj };
  for (const k of keys) delete next[k];
  return next;
}

type LooseVehicle = Record<string, unknown> & {
  proyectoId?: string;
  proyectoPeldanoId?: string;
  oleadaPuntoId?: string;
  subTareas?: Array<Record<string, unknown>>;
  subVehiculos?: Array<Record<string, unknown>>;
};

function stripSubProyectoId(
  list: Array<Record<string, unknown>> | undefined,
  proyectoId: string
): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(list)) return list;
  let changed = false;
  const next = list.map(item => {
    if (item.proyectoId !== proyectoId) return item;
    changed = true;
    return omit(item, ["proyectoId"]);
  });
  return changed ? next : list;
}

function patchVehicle(v: LooseVehicle, proyectoId: string, mode: ProyectoLifecycleMode): LooseVehicle {
  const matchesVehicle = v.proyectoId === proyectoId;
  let next: LooseVehicle = v;

  if (mode === "delete") {
    const subs = stripSubProyectoId(v.subTareas, proyectoId);
    const subV = stripSubProyectoId(v.subVehiculos, proyectoId);
    if (subs !== v.subTareas) next = { ...next, subTareas: subs };
    if (subV !== v.subVehiculos) next = { ...next, subVehiculos: subV };
    if (matchesVehicle) {
      next = omit(next, ["proyectoId", "proyectoPeldanoId", "oleadaPuntoId"]);
    }
    return next;
  }

  // reset: el proyecto sigue vivo — solo se caen peldaños/puntos que ya no existen.
  if (matchesVehicle) {
    next = omit(next, ["proyectoPeldanoId", "oleadaPuntoId"]);
  }
  return next;
}

function patchVehicleList(
  list: LooseVehicle[] | null,
  proyectoId: string,
  mode: ProyectoLifecycleMode
): { next: LooseVehicle[]; changed: boolean } {
  if (!Array.isArray(list) || list.length === 0) return { next: list ?? [], changed: false };
  let changed = false;
  const next = list.map(v => {
    const patched = patchVehicle(v, proyectoId, mode);
    if (patched !== v) changed = true;
    return patched;
  });
  return { next, changed };
}

function unlinkVehicles(proyectoId: string, mode: ProyectoLifecycleMode): boolean {
  const parsed = safeParse<LooseVehicle[]>(localStorage.getItem(VEHICLES_KEY));
  const { next, changed } = patchVehicleList(parsed, proyectoId, mode);
  if (!changed) return false;
  if (!writeJson(VEHICLES_KEY, next)) return false;
  try {
    window.dispatchEvent(new CustomEvent("vehicles-updated"));
  } catch {
    // tests / no window
  }
  return true;
}

function unlinkParked(storage: Storage | undefined, key: string, proyectoId: string, mode: ProyectoLifecycleMode): void {
  if (!storage) return;
  const parsed = safeParse<LooseVehicle[]>(storage.getItem(key));
  const { next, changed } = patchVehicleList(parsed, proyectoId, mode);
  if (!changed) return;
  try {
    storage.setItem(key, JSON.stringify(next));
  } catch {
    // quota / private
  }
}

type LooseSegmento = Record<string, unknown> & {
  proyectoVinculadoId?: string;
  proyectoPeldanoId?: string;
};

function patchSegmento(seg: LooseSegmento, proyectoId: string, mode: ProyectoLifecycleMode): LooseSegmento {
  if (seg.proyectoVinculadoId !== proyectoId) return seg;
  if (mode === "delete") return omit(seg, ["proyectoVinculadoId", "proyectoPeldanoId"]);
  return omit(seg, ["proyectoPeldanoId"]);
}

function unlinkPlanillas(proyectoId: string, mode: ProyectoLifecycleMode): boolean {
  let any = false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PLANILLA_PREFIX)) continue;
      const planilla = safeParse<Record<string, unknown> & { segmentos?: LooseSegmento[] }>(
        localStorage.getItem(key)
      );
      if (!planilla || !Array.isArray(planilla.segmentos)) continue;
      let changed = false;
      const segmentos = planilla.segmentos.map(s => {
        const patched = patchSegmento(s, proyectoId, mode);
        if (patched !== s) changed = true;
        return patched;
      });
      if (!changed) continue;
      if (writeJson(key, { ...planilla, segmentos })) any = true;
    }
  } catch {
    return any;
  }
  return any;
}

type LoosePlantilla = Record<string, unknown> & {
  segmentos?: Array<Record<string, unknown> & { proyectoVinculadoId?: string }>;
};

function unlinkPlantillas(userId: string, proyectoId: string, mode: ProyectoLifecycleMode): boolean {
  if (mode !== "delete") return false;
  const key = `${PLANTILLAS_KEY_PREFIX}${userId}`;
  const list = safeParse<LoosePlantilla[]>(localStorage.getItem(key));
  if (!Array.isArray(list) || list.length === 0) return false;
  let changed = false;
  const next = list.map(p => {
    if (!Array.isArray(p.segmentos)) return p;
    let segChanged = false;
    const segmentos = p.segmentos.map(s => {
      if (s.proyectoVinculadoId !== proyectoId) return s;
      segChanged = true;
      return omit(s, ["proyectoVinculadoId"]);
    });
    if (!segChanged) return p;
    changed = true;
    return { ...p, segmentos };
  });
  if (!changed) return false;
  if (!writeJson(key, next)) return false;
  try {
    window.dispatchEvent(new CustomEvent("plantillas-rutina-updated", { detail: { userId } }));
  } catch {
    // tests / no window
  }
  return true;
}

type LooseReserva = Record<string, unknown> & {
  userId?: string;
  proyectoId?: string;
};

/** Al borrar: los pensamientos del nido vuelven a aterrizaje pendiente. */
function unlinkReservas(userId: string, proyectoId: string, mode: ProyectoLifecycleMode): boolean {
  if (mode !== "delete") return false;
  const list = safeParse<LooseReserva[]>(localStorage.getItem(RESERVA_KEY));
  if (!Array.isArray(list) || list.length === 0) return false;
  let changed = false;
  const next = list.map(item => {
    if (item.userId && item.userId !== userId) return item;
    if (item.proyectoId !== proyectoId) return item;
    changed = true;
    return omit(item, ["proyectoId", "proyectoTitulo", "proyectoEtiqueta"]);
  });
  if (!changed) return false;
  if (!writeJson(RESERVA_KEY, next)) return false;
  try {
    window.dispatchEvent(new CustomEvent(SITUACION_RESERVA_EVENT));
  } catch {
    // tests / no window
  }
  return true;
}

/** Quita vínculos muertos para que el Hub no se amontone ni arrastre foco viejo. */
export function unlinkProyectoVinculosLocal(
  userId: string,
  proyectoId: string,
  mode: ProyectoLifecycleMode
): void {
  if (!proyectoId.trim()) return;
  unlinkVehicles(proyectoId, mode);
  try {
    unlinkParked(typeof sessionStorage !== "undefined" ? sessionStorage : undefined, PARKED_ACTIVES_KEY, proyectoId, mode);
  } catch {
    // sessionStorage no disponible
  }
  try {
    unlinkParked(typeof localStorage !== "undefined" ? localStorage : undefined, PARKED_ACTIVES_DURABLE_KEY, proyectoId, mode);
  } catch {
    // localStorage no disponible
  }
  unlinkPlanillas(proyectoId, mode);
  unlinkPlantillas(userId, proyectoId, mode);
  unlinkReservas(userId, proyectoId, mode);
}
