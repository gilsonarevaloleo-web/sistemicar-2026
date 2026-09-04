import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, getPrivatePath, isFirebaseConfigured } from "./firebase";
import { activateSovereignModeGlobal, deactivateSovereignModeGlobal, backupToLocal, restoreFromLocal } from "./sovereign-mode";
import { emergencyPruneStorage, safeSetItem } from "./storageHygiene";
import type { DetalleSubTarea } from "./persistence";
import type { ProyectoEtiqueta } from "./nidoNaturaleza";

export type SituacionReservaEstado = "activa" | "retomada_libre" | "retomada_cron";

/** Ruta táctica: S = desglosador situación · E = ejecución · M = tener en cuenta */
export type ReservaTacticaRuta = "situacion_desglosador" | "ejecucion" | "consideracion";

export const RUTA_TACTICA_ORDER: ReservaTacticaRuta[] = [
  "situacion_desglosador",
  "ejecucion",
  "consideracion",
];

export const RUTA_TACTICA_META: Record<
  ReservaTacticaRuta,
  { label: string; short: string; hint: string }
> = {
  situacion_desglosador: {
    label: "Desglosador situación",
    short: "S",
    hint: "Viene del cronómetro situacional",
  },
  ejecucion: {
    label: "Peso de ejecución",
    short: "E",
    hint: "Trabajo real pendiente (captura rápida)",
  },
  consideracion: {
    label: "Tener en cuenta",
    short: "M",
    hint: "Idea o recordatorio sin ejecutar ahora",
  },
};

export interface SituacionReservaItem {
  id: string;
  userId: string;
  texto: string;
  reservadaAt: number;
  ruta?: ReservaTacticaRuta;
  /** Nido: proyecto o centro donde aterriza el pensamiento. */
  proyectoId?: string;
  proyectoTitulo?: string;
  proyectoEtiqueta?: ProyectoEtiqueta;
  /** Segmento del día en que se capturó (opcional). */
  segmentoId?: string;
  segmentoNombre?: string;
  /** Paso 1–3 de la ruta mental activa del proyecto (seguimiento). */
  rutaSeguimientoPaso?: 1 | 2 | 3;
  origenVehiculoTitulo?: string;
  origenVehiculoId?: string;
  minutosCupo?: number;
  detalles?: DetalleSubTarea[];
  estado: SituacionReservaEstado;
  retomadaAt?: number;
  retomadaEnVehiculoId?: string;
  /** Número correlativo asignado al ejecutarse en desglosador (fase 3). */
  pasoEjecutadoNumero?: number;
}

const RUTA_STORAGE_KEY = "sistemicar-reserva-ruta-default";

export function getDefaultReservaRuta(): ReservaTacticaRuta {
  try {
    const raw = localStorage.getItem(RUTA_STORAGE_KEY);
    if (raw === "situacion_desglosador" || raw === "ejecucion" || raw === "consideracion") return raw;
  } catch {}
  return "ejecucion";
}

export function setDefaultReservaRuta(ruta: ReservaTacticaRuta): void {
  try {
    localStorage.setItem(RUTA_STORAGE_KEY, ruta);
  } catch {}
}

function inferRutaFromRow(row: {
  ruta?: unknown;
  origenVehiculoId?: string;
  detalles?: DetalleSubTarea[];
}): ReservaTacticaRuta {
  if (row.ruta === "situacion_desglosador" || row.ruta === "ejecucion" || row.ruta === "consideracion") {
    return row.ruta;
  }
  if (row.origenVehiculoId || (row.detalles && row.detalles.length > 0)) {
    return "situacion_desglosador";
  }
  return "ejecucion";
}

export function sortReservasTacticas(items: SituacionReservaItem[]): SituacionReservaItem[] {
  const rank = (r: ReservaTacticaRuta) => RUTA_TACTICA_ORDER.indexOf(r);
  return [...items].sort((a, b) => {
    const ra = rank(a.ruta ?? "ejecucion");
    const rb = rank(b.ruta ?? "ejecucion");
    if (ra !== rb) return ra - rb;
    return b.reservadaAt - a.reservadaAt;
  });
}

const STORAGE_KEY = "sistemicar_situacion_reserva";
export const SITUACION_RESERVA_EVENT = "sistemicar-situacion-reserva-changed";
/** Ventana para emparejar un apunte local provisional con su doc en Firebase. */
const RESERVA_PENDING_MATCH_MS = 20_000;
/** Evita doble captura rápida en el Crisol (Enter + tap, doble Enter). */
export const RESERVA_SUBMIT_DEDUP_MS = 2_500;

function reservaPendingMatch(
  local: SituacionReservaItem,
  remote: SituacionReservaItem
): boolean {
  if (local.userId !== remote.userId) return false;
  if (local.texto.trim() !== remote.texto.trim()) return false;
  return Math.abs((local.reservadaAt ?? 0) - (remote.reservadaAt ?? 0)) < RESERVA_PENDING_MATCH_MS;
}

function reservaTextoKey(texto: string): string {
  return texto.trim().toLowerCase();
}

/** Misma fila en inbox y en nido proyecto — no son dos tareas distintas. */
function reservaSemanticDuplicate(a: SituacionReservaItem, b: SituacionReservaItem): boolean {
  if (a.userId !== b.userId) return false;
  if (a.estado !== "activa" || b.estado !== "activa") return false;
  if (reservaTextoKey(a.texto) !== reservaTextoKey(b.texto)) return false;
  const aProy = a.proyectoId?.trim();
  const bProy = b.proyectoId?.trim();
  if (aProy && bProy && aProy !== bProy) return false;
  return true;
}

function preferReservaRow(a: SituacionReservaItem, b: SituacionReservaItem): SituacionReservaItem {
  const aProy = !!a.proyectoId?.trim();
  const bProy = !!b.proyectoId?.trim();
  if (aProy && !bProy) return mergeReservaRows(a, b);
  if (bProy && !aProy) return mergeReservaRows(b, a);
  if (!a.id.startsWith("reserva_") && b.id.startsWith("reserva_")) return mergeReservaRows(a, b);
  if (a.id.startsWith("reserva_") && !b.id.startsWith("reserva_")) return mergeReservaRows(b, a);
  return (a.reservadaAt ?? 0) >= (b.reservadaAt ?? 0) ? mergeReservaRows(a, b) : mergeReservaRows(b, a);
}

function mergeReservaRows(
  primary: SituacionReservaItem,
  secondary: SituacionReservaItem
): SituacionReservaItem {
  return {
    ...primary,
    proyectoId: primary.proyectoId?.trim() || secondary.proyectoId,
    proyectoTitulo: primary.proyectoTitulo || secondary.proyectoTitulo,
    proyectoEtiqueta: primary.proyectoEtiqueta || secondary.proyectoEtiqueta,
    origenVehiculoId: primary.origenVehiculoId || secondary.origenVehiculoId,
    origenVehiculoTitulo: primary.origenVehiculoTitulo || secondary.origenVehiculoTitulo,
    minutosCupo: primary.minutosCupo ?? secondary.minutosCupo,
    detalles: primary.detalles?.length ? primary.detalles : secondary.detalles,
    rutaSeguimientoPaso: primary.rutaSeguimientoPaso ?? secondary.rutaSeguimientoPaso,
    segmentoId: primary.segmentoId || secondary.segmentoId,
    segmentoNombre: primary.segmentoNombre || secondary.segmentoNombre,
  };
}

/** Colapsa activas con el mismo texto (inbox + proyecto) en una sola fila. */
function dedupeActiveReservasByTexto(items: SituacionReservaItem[]): SituacionReservaItem[] {
  const inactivas = items.filter(i => i.estado !== "activa");
  const kept: SituacionReservaItem[] = [];
  for (const item of sortReservasTacticas(items.filter(i => i.estado === "activa"))) {
    const dupIdx = kept.findIndex(prev => reservaSemanticDuplicate(prev, item));
    if (dupIdx === -1) {
      kept.push(item);
      continue;
    }
    kept[dupIdx] = preferReservaRow(kept[dupIdx], item);
  }
  return [...kept, ...inactivas];
}

/** Elimina duplicados por id y apuntes locales `reserva_*` ya reflejados en Firebase. */
export function dedupeReservasItems(items: SituacionReservaItem[]): SituacionReservaItem[] {
  const byId = new Map<string, SituacionReservaItem>();
  for (const item of items) {
    const prev = byId.get(item.id);
    if (!prev || (item.reservadaAt ?? 0) >= (prev.reservadaAt ?? 0)) {
      byId.set(item.id, item);
    }
  }
  let list = Array.from(byId.values());
  const firebaseRows = list.filter(i => !i.id.startsWith("reserva_"));
  list = list.filter(item => {
    if (!item.id.startsWith("reserva_")) return true;
    return !firebaseRows.some(remote => reservaPendingMatch(item, remote));
  });

  const kept: SituacionReservaItem[] = [];
  for (const item of sortReservasTacticas(list)) {
    const dupIdx = kept.findIndex(
      prev =>
        prev.userId === item.userId &&
        prev.texto.trim().toLowerCase() === item.texto.trim().toLowerCase() &&
        Math.abs((prev.reservadaAt ?? 0) - (item.reservadaAt ?? 0)) < RESERVA_SUBMIT_DEDUP_MS
    );
    if (dupIdx === -1) {
      kept.push(item);
      continue;
    }
    const prev = kept[dupIdx];
    const preferItem =
      !item.id.startsWith("reserva_") && prev.id.startsWith("reserva_")
        ? item
        : (item.reservadaAt ?? 0) >= (prev.reservadaAt ?? 0)
          ? item
          : prev;
    kept[dupIdx] = preferItem;
  }
  return dedupeActiveReservasByTexto(kept);
}

function normalizeItem(raw: SituacionReservaItem): SituacionReservaItem {
  const base = {
    ...raw,
    reservadaAt: raw.reservadaAt ?? Date.now(),
    estado: raw.estado ?? "activa",
  };
  return { ...base, ruta: inferRutaFromRow(base) };
}

function getAllLocalReserva(): SituacionReservaItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return (JSON.parse(data) as SituacionReservaItem[]).map(normalizeItem);
  } catch {
    return [];
  }
}

function isLocalOnlyReservaId(reservaId: string): boolean {
  return reservaId.startsWith("reserva_");
}

function saveAllLocalReserva(
  items: SituacionReservaItem[],
  opts?: { silent?: boolean }
): boolean {
  items = dedupeReservasItems(items);
  const persist = (list: SituacionReservaItem[]) => {
    const ok = safeSetItem(STORAGE_KEY, JSON.stringify(list));
    // silent: el caller ya notifica (p. ej. onSnapshot → onData) — evita doble setState.
    if (ok && !opts?.silent) {
      window.dispatchEvent(new CustomEvent(SITUACION_RESERVA_EVENT));
    }
    return ok;
  };

  if (persist(items)) return true;

  emergencyPruneStorage({ aggressive: true });
  if (persist(items)) return true;

  const trimmed = items
    .filter(i => i.estado === "activa")
    .slice(0, 120);
  if (persist(trimmed)) return true;

  console.error("[saveAllLocalReserva] No se pudo persistir reservas tras poda");
  return false;
}

/** Conserva reservas locales aún no reflejadas en Firebase (evita que onSnapshot las borre). */
function mergeReservaRemoteWithLocalPending(
  userId: string,
  remote: SituacionReservaItem[]
): SituacionReservaItem[] {
  const remoteIds = new Set(remote.map(r => r.id));
  const now = Date.now();
  const pendingMs = 5 * 60 * 1000;
  const localPending = getLocalSituacionReserva(userId).filter(
    i =>
      i.estado === "activa" &&
      !remoteIds.has(i.id) &&
      !remote.some(r => reservaPendingMatch(i, r)) &&
      (i.id.startsWith("reserva_") ? now - (i.reservadaAt ?? 0) < pendingMs : now - (i.reservadaAt ?? 0) < pendingMs)
  );
  return dedupeReservasItems(sortReservasTacticas([...remote, ...localPending]));
}

function buildFirestoreReservaPayload(
  userId: string,
  payload: {
    texto: string;
    reservadaAt: number;
    ruta: ReservaTacticaRuta;
    origenVehiculoTitulo?: string | null;
    origenVehiculoId?: string | null;
    minutosCupo?: number | null;
    detalles?: DetalleSubTarea[] | null;
    estado: string;
    proyectoId?: string | null;
    proyectoTitulo?: string | null;
    proyectoEtiqueta?: ProyectoEtiqueta | null;
    segmentoId?: string | null;
    segmentoNombre?: string | null;
    rutaSeguimientoPaso?: 1 | 2 | 3 | null;
  }
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    texto: payload.texto,
    reservadaAt: payload.reservadaAt,
    ruta: payload.ruta,
    userId,
    estado: payload.estado,
    createdAt: serverTimestamp(),
  };
  if (payload.origenVehiculoTitulo) doc.origenVehiculoTitulo = payload.origenVehiculoTitulo;
  if (payload.origenVehiculoId) doc.origenVehiculoId = payload.origenVehiculoId;
  if (payload.minutosCupo != null && payload.minutosCupo > 0) doc.minutosCupo = payload.minutosCupo;
  if (payload.detalles?.length) doc.detalles = payload.detalles;
  if (payload.proyectoId) doc.proyectoId = payload.proyectoId;
  if (payload.proyectoTitulo) doc.proyectoTitulo = payload.proyectoTitulo;
  if (payload.proyectoEtiqueta) doc.proyectoEtiqueta = payload.proyectoEtiqueta;
  if (payload.segmentoId) doc.segmentoId = payload.segmentoId;
  if (payload.segmentoNombre) doc.segmentoNombre = payload.segmentoNombre;
  if (payload.rutaSeguimientoPaso) doc.rutaSeguimientoPaso = payload.rutaSeguimientoPaso;
  return doc;
}

export function getLocalSituacionReserva(userId: string): SituacionReservaItem[] {
  return getAllLocalReserva()
    .filter(i => i.userId === userId)
    .sort((a, b) => b.reservadaAt - a.reservadaAt);
}

export function getReservaActivas(items: SituacionReservaItem[]): SituacionReservaItem[] {
  return dedupeReservasItems(items.filter(i => i.estado === "activa"));
}

export function subscribeToSituacionReserva(
  userId: string,
  onData: (items: SituacionReservaItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  const pushLocal = () => onData(getLocalSituacionReserva(userId));

  if (isFirebaseConfigured() && db) {
    pushLocal();
    const onLocalChange = () => pushLocal();
    window.addEventListener(SITUACION_RESERVA_EVENT, onLocalChange);

    const path = getPrivatePath(userId, "situacionReserva");
    const q = query(collection(db, path));
    const unsub = onSnapshot(
      q,
      snapshot => {
        const data = snapshot.docs.map(d => {
          const row = d.data();
          return normalizeItem({
            id: d.id,
            userId,
            texto: row.texto ?? "",
            reservadaAt: row.reservadaAt ?? row.createdAt?.toDate?.()?.getTime?.() ?? Date.now(),
            origenVehiculoTitulo: row.origenVehiculoTitulo,
            origenVehiculoId: row.origenVehiculoId,
            minutosCupo: row.minutosCupo,
            detalles: row.detalles,
            ruta: inferRutaFromRow(row),
            estado: row.estado ?? "activa",
            retomadaAt: row.retomadaAt,
            retomadaEnVehiculoId: row.retomadaEnVehiculoId,
            proyectoId: row.proyectoId,
            proyectoTitulo: row.proyectoTitulo,
            proyectoEtiqueta: row.proyectoEtiqueta,
            segmentoId: row.segmentoId,
            segmentoNombre: row.segmentoNombre,
            rutaSeguimientoPaso: row.rutaSeguimientoPaso,
            pasoEjecutadoNumero: row.pasoEjecutadoNumero,
          });
        });
        const merged = mergeReservaRemoteWithLocalPending(userId, data);
        deactivateSovereignModeGlobal();
        const others = getAllLocalReserva().filter(i => i.userId !== userId);
        // silent: onData abajo ya actualiza React; el event provocaba doble paint en Crisol.
        saveAllLocalReserva([...others, ...merged], { silent: true });
        backupToLocal("situacionReserva", merged);
        onData(merged);
      },
      error => {
        console.error("Firebase SituacionReserva Error:", error);
        activateSovereignModeGlobal("Usando reserva situacional local");
        const local =
          restoreFromLocal<SituacionReservaItem[]>("situacionReserva") ||
          getLocalSituacionReserva(userId);
        onData(local);
        onError?.(error);
      }
    );
    return () => {
      unsub();
      window.removeEventListener(SITUACION_RESERVA_EVENT, onLocalChange);
    };
  }

  pushLocal();
  window.addEventListener(SITUACION_RESERVA_EVENT, pushLocal);
  return () => window.removeEventListener(SITUACION_RESERVA_EVENT, pushLocal);
}

export type NuevaSituacionReserva = Omit<SituacionReservaItem, "id" | "userId" | "reservadaAt" | "estado"> & {
  estado?: SituacionReservaEstado;
};

function syncAddReservaToFirebase(
  userId: string,
  tempId: string,
  created: SituacionReservaItem,
  item: NuevaSituacionReserva
): void {
  if (!isFirebaseConfigured() || !db) return;
  void (async () => {
    try {
      const path = getPrivatePath(userId, "situacionReserva");
      const docRef = await addDoc(
        collection(db, path),
        buildFirestoreReservaPayload(userId, {
          texto: created.texto,
          reservadaAt: created.reservadaAt,
          ruta: created.ruta ?? "ejecucion",
          origenVehiculoTitulo: item.origenVehiculoTitulo ?? null,
          origenVehiculoId: item.origenVehiculoId ?? null,
          minutosCupo: item.minutosCupo ?? null,
          detalles: item.detalles ?? null,
          estado: created.estado,
          proyectoId: item.proyectoId ?? null,
          proyectoTitulo: item.proyectoTitulo ?? null,
          proyectoEtiqueta: item.proyectoEtiqueta ?? null,
          segmentoId: item.segmentoId ?? null,
          segmentoNombre: item.segmentoNombre ?? null,
          rutaSeguimientoPaso: item.rutaSeguimientoPaso ?? null,
        })
      );
      const withoutTemp = getAllLocalReserva().filter(
        i => !(i.id === tempId && i.userId === userId)
      );
      const withoutDupFirebase = withoutTemp.filter(
        i => !(i.id === docRef.id && i.userId === userId)
      );
      saveAllLocalReserva([{ ...created, id: docRef.id }, ...withoutDupFirebase]);
    } catch (error) {
      console.error("[addSituacionReserva] Firebase sync en segundo plano:", error);
    }
  })();
}

/** Guarda primero en el dispositivo; la nube sincroniza en segundo plano. */
export async function addSituacionReserva(
  userId: string,
  item: NuevaSituacionReserva
): Promise<{ id: string; localSaved: boolean; duplicate?: boolean }> {
  const trimmed = item.texto.trim();
  if (!trimmed) return { id: "", localSaved: false };

  const now = Date.now();
  const ruta = item.ruta ?? inferRutaFromRow(item);
  const estado = (item.estado ?? "activa") as SituacionReservaEstado;

  const recentDup = getAllLocalReserva().find(
    i =>
      i.userId === userId &&
      i.estado === "activa" &&
      reservaTextoKey(i.texto) === reservaTextoKey(trimmed)
  );
  if (recentDup) {
    const incoming: SituacionReservaItem = {
      ...recentDup,
      texto: trimmed,
      ruta,
      ...(item.origenVehiculoTitulo ? { origenVehiculoTitulo: item.origenVehiculoTitulo } : {}),
      ...(item.origenVehiculoId ? { origenVehiculoId: item.origenVehiculoId } : {}),
      ...(item.minutosCupo != null && item.minutosCupo > 0 ? { minutosCupo: item.minutosCupo } : {}),
      ...(item.detalles?.length ? { detalles: item.detalles } : {}),
      ...(item.proyectoId ? { proyectoId: item.proyectoId } : {}),
      ...(item.proyectoTitulo ? { proyectoTitulo: item.proyectoTitulo } : {}),
      ...(item.proyectoEtiqueta ? { proyectoEtiqueta: item.proyectoEtiqueta } : {}),
      ...(item.segmentoId ? { segmentoId: item.segmentoId } : {}),
      ...(item.segmentoNombre ? { segmentoNombre: item.segmentoNombre } : {}),
      ...(item.rutaSeguimientoPaso ? { rutaSeguimientoPaso: item.rutaSeguimientoPaso } : {}),
    };
    const merged = preferReservaRow(recentDup, incoming);
    const all = getAllLocalReserva().map(i => (i.id === recentDup.id ? merged : i));
    saveAllLocalReserva(all);
    return { id: recentDup.id, localSaved: true, duplicate: true };
  }

  const reservadaAt = now;
  const tempId = `reserva_${reservadaAt}_${Math.random().toString(36).slice(2, 6)}`;

  const created: SituacionReservaItem = {
    id: tempId,
    userId,
    texto: trimmed,
    reservadaAt,
    ruta,
    estado,
    ...(item.origenVehiculoTitulo ? { origenVehiculoTitulo: item.origenVehiculoTitulo } : {}),
    ...(item.origenVehiculoId ? { origenVehiculoId: item.origenVehiculoId } : {}),
    ...(item.minutosCupo != null && item.minutosCupo > 0 ? { minutosCupo: item.minutosCupo } : {}),
    ...(item.detalles?.length ? { detalles: item.detalles } : {}),
    ...(item.proyectoId ? { proyectoId: item.proyectoId } : {}),
    ...(item.proyectoTitulo ? { proyectoTitulo: item.proyectoTitulo } : {}),
    ...(item.proyectoEtiqueta ? { proyectoEtiqueta: item.proyectoEtiqueta } : {}),
    ...(item.segmentoId ? { segmentoId: item.segmentoId } : {}),
    ...(item.segmentoNombre ? { segmentoNombre: item.segmentoNombre } : {}),
    ...(item.rutaSeguimientoPaso ? { rutaSeguimientoPaso: item.rutaSeguimientoPaso } : {}),
  };

  const withoutDup = getAllLocalReserva().filter(i => i.id !== tempId);
  const localSaved = saveAllLocalReserva([created, ...withoutDup]);
  if (!localSaved) return { id: tempId, localSaved: false };

  syncAddReservaToFirebase(userId, tempId, created, item);
  return { id: tempId, localSaved: true };
}

export type ReservaImanReactivacionPatch = Partial<
  Pick<
    SituacionReservaItem,
    | "texto"
    | "minutosCupo"
    | "detalles"
    | "rutaSeguimientoPaso"
    | "proyectoId"
    | "proyectoTitulo"
    | "proyectoEtiqueta"
    | "ruta"
  >
>;

/** Devuelve una fila retomada al Crisol (estado activa, conserva ruta del nido). */
export async function reactivarReservaImanDesdeSub(
  userId: string,
  reservaId: string,
  patch?: ReservaImanReactivacionPatch
): Promise<boolean> {
  const existing = getAllLocalReserva().find(i => i.id === reservaId && i.userId === userId);
  if (!existing) return false;

  const { retomadaAt: _ra, retomadaEnVehiculoId: _rv, ...base } = existing;
  const reactivated: SituacionReservaItem = {
    ...base,
    ...patch,
    estado: "activa",
    reservadaAt: Date.now(),
  };

  const all = getAllLocalReserva().map(i =>
    i.id === reservaId && i.userId === userId ? reactivated : i
  );
  const localSaved = saveAllLocalReserva(all);
  if (!localSaved) return false;

  if (isFirebaseConfigured() && db && !isLocalOnlyReservaId(reservaId)) {
    void (async () => {
      try {
        const path = getPrivatePath(userId, "situacionReserva");
        await updateDoc(doc(db, path, reservaId), {
          estado: "activa",
          reservadaAt: reactivated.reservadaAt,
          retomadaAt: null,
          retomadaEnVehiculoId: null,
          ...(patch?.texto != null ? { texto: patch.texto } : {}),
          ...(patch?.minutosCupo != null ? { minutosCupo: patch.minutosCupo } : {}),
          ...(patch?.detalles != null ? { detalles: patch.detalles } : {}),
          ...(patch?.rutaSeguimientoPaso != null ? { rutaSeguimientoPaso: patch.rutaSeguimientoPaso } : {}),
          ...(patch?.proyectoId != null ? { proyectoId: patch.proyectoId } : {}),
          ...(patch?.proyectoTitulo != null ? { proyectoTitulo: patch.proyectoTitulo } : {}),
          ...(patch?.proyectoEtiqueta != null ? { proyectoEtiqueta: patch.proyectoEtiqueta } : {}),
          ...(patch?.ruta != null ? { ruta: patch.ruta } : {}),
        });
      } catch (error) {
        console.error("[reactivarReservaImanDesdeSub] Firebase sync:", error);
      }
    })();
  }
  return true;
}

export async function updateSituacionReservaEstado(
  userId: string,
  reservaId: string,
  estado: SituacionReservaEstado,
  extra?: { retomadaAt?: number; retomadaEnVehiculoId?: string }
): Promise<boolean> {
  const all = getAllLocalReserva().map(i =>
    i.id === reservaId && i.userId === userId ? { ...i, estado, ...extra } : i
  );
  const localSaved = saveAllLocalReserva(all);
  if (!localSaved) return false;

  if (isFirebaseConfigured() && db && !isLocalOnlyReservaId(reservaId)) {
    void (async () => {
      try {
        const path = getPrivatePath(userId, "situacionReserva");
        await updateDoc(doc(db, path, reservaId), {
          estado,
          ...(extra?.retomadaAt != null ? { retomadaAt: extra.retomadaAt } : {}),
          ...(extra?.retomadaEnVehiculoId ? { retomadaEnVehiculoId: extra.retomadaEnVehiculoId } : {}),
        });
      } catch (error) {
        console.error("[updateSituacionReservaEstado] Firebase sync:", error);
      }
    })();
  }
  return true;
}

export async function markImanReservaEjecutada(
  userId: string,
  reservaId: string,
  pasoEjecutadoNumero: number
): Promise<boolean> {
  const all = getAllLocalReserva().map(i =>
    i.id === reservaId && i.userId === userId ? { ...i, pasoEjecutadoNumero } : i
  );
  const localSaved = saveAllLocalReserva(all);
  if (!localSaved) return false;

  if (isFirebaseConfigured() && db && !isLocalOnlyReservaId(reservaId)) {
    void (async () => {
      try {
        const path = getPrivatePath(userId, "situacionReserva");
        await updateDoc(doc(db, path, reservaId), { pasoEjecutadoNumero });
      } catch (error) {
        console.error("[markImanReservaEjecutada] Firebase sync:", error);
      }
    })();
  }
  return true;
}

export async function updateSituacionReservaRuta(
  userId: string,
  reservaId: string,
  ruta: ReservaTacticaRuta
): Promise<boolean> {
  const all = getAllLocalReserva().map(i =>
    i.id === reservaId && i.userId === userId ? { ...i, ruta } : i
  );
  const localSaved = saveAllLocalReserva(all);
  if (!localSaved) return false;

  if (isFirebaseConfigured() && db && !isLocalOnlyReservaId(reservaId)) {
    void (async () => {
      try {
        const path = getPrivatePath(userId, "situacionReserva");
        await updateDoc(doc(db, path, reservaId), { ruta });
      } catch (error) {
        console.error("[updateSituacionReservaRuta] Firebase sync:", error);
      }
    })();
  }
  return true;
}

export async function deleteSituacionReserva(userId: string, reservaId: string): Promise<boolean> {
  const localSaved = saveAllLocalReserva(
    getAllLocalReserva().filter(i => !(i.id === reservaId && i.userId === userId))
  );
  if (!localSaved) return false;

  if (isFirebaseConfigured() && db && !isLocalOnlyReservaId(reservaId)) {
    void (async () => {
      try {
        const path = getPrivatePath(userId, "situacionReserva");
        await deleteDoc(doc(db, path, reservaId));
      } catch (error) {
        console.error("[deleteSituacionReserva] Firebase sync:", error);
      }
    })();
  }
  return true;
}
