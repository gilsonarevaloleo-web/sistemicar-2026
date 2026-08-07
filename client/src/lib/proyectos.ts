import type { DecisionKind } from "./decisionesLedger";
import type { FocusBandId } from "./focusBandLedger";
import type { SubTarea, SubVehiculo, Vehicle, TipoFlota } from "./persistence";
import { maxBanda, inferBandaBloque } from "./termodinamicaAtencional";
import type { RutaCruzadaSnapshot } from "./rutaEnfoque";
import {
  buildDefaultClaridadDireccion,
  getOleadaEnCurso,
  normalizeRutasMentales,
  type ClaridadProfundidad,
  type ProyectoEtiqueta,
  type RutaMental,
  type RutaMentalId,
  type RutaMentalPaso,
  type RutasMentalesSet,
} from "./claridadDireccion";
import { feedsProyectoHub, resolveDestinoCierre } from "./destinoCierre";
import { safeSetItem } from "./storageHygiene";
import {
  buildTranscriptFromVehicles,
  filterDecisionsForProyecto,
} from "./ringDecisionTranscript";

export type {
  ClaridadProfundidad,
  ProyectoEtiqueta,
  RutaMental,
  RutaMentalId,
  RutaMentalPaso,
  RutasMentalesSet,
} from "./claridadDireccion";

export type PeldanoEstado = "idea" | "en_curso" | "conquistado";

export interface ProyectoDetalleResumen {
  texto: string;
  entregado: boolean;
  casa?: boolean;
}

export interface ProyectoSubTareaResumen {
  texto: string;
  resultado?: string;
  detalles?: ProyectoDetalleResumen[];
}

/** Decisión ejecutada en ring/taller/desglosador — numerada en el peldaño o proyecto. */
export interface ProyectoDecisionEnumerada {
  n: number;
  key: string;
  texto: string;
  kind: DecisionKind;
  status: "cumplido" | "fallado" | "avance";
  ts?: number;
  pasoEjecutadoNumero?: number;
  proyectoId?: string;
  vehicleId?: string;
  vehicleTitulo?: string;
  subId?: string;
  origenImanId?: string;
}

export interface ProyectoPasoEjecutado extends ProyectoDecisionEnumerada {
  peldanoId?: string;
}

export interface ProyectoPeldanoResumen {
  subsCumplidos?: number;
  subsTotal?: number;
  duracionMin?: number;
  profundidadMaxima?: FocusBandId;
  psGanados?: number;
  subResumen?: {
    titulo: string;
    status: "cumplido" | "fallado" | "avance" | "pendiente";
    duracionMin?: number;
  }[];
  subTareasResumen?: ProyectoSubTareaResumen[];
  /** Minutos recuperados por eficiencia al cerrar desglose situacional. */
  minutosGanados?: number;
  minutosGanadosSesion?: number;
  retoNumero?: number;
  segmentoResumen?: {
    rutaMentalActiva?: RutaMentalId;
    rutaMentalLabel?: string;
    faseAtencional?: string;
    vehiculosCerrados?: number;
  };
  /** Transcripción numerada de decisiones ejecutadas (ring, taller, desglosador). */
  decisionesEnumeradas?: ProyectoDecisionEnumerada[];
  totalDecisiones?: number;
}

export interface ProyectoPeldano {
  id: string;
  proyectoId: string;
  orden: number;
  titulo: string;
  estado: PeldanoEstado;
  tipoOrigen?: "tiempo" | "situacion";
  plantillaSubs?: { titulo: string; cantidadObjetivo?: number }[];
  plantillaSubTareas?: string[];
  vehicleId?: string;
  cerradoAt?: number;
  resumen?: ProyectoPeldanoResumen;
  /** Peldaño generado desde segmento de planificación. */
  origenSegmento?: boolean;
  segmentoId?: string;
  planillaFecha?: string;
  horaInicio?: string;
  horaFin?: string;
  rutasMentales?: RutasMentalesSet;
  createdAt: number;
  updatedAt: number;
}

export interface ProyectoMetricasFlota {
  minutosPorFlota: Partial<Record<TipoFlota, number>>;
  psPorFlota: Partial<Record<TipoFlota, number>>;
  ultimoSegmentoId?: string;
  ultimoSegmentoNombre?: string;
  ultimaActualizacionAt?: number;
}

export interface Proyecto {
  id: string;
  titulo: string;
  etiqueta: ProyectoEtiqueta;
  color?: string;
  icono?: string;
  nota?: string;
  createdAt: number;
  updatedAt: number;
  /**
   * Orden manual en el Hub (menor = más arriba).
   * Si falta, se ordena por updatedAt al final del bloque ordenado.
   */
  orden?: number;
  peldanosConquistados: number;
  profundidadMaxima?: FocusBandId;
  minutosTotales?: number;
  /** Acumulado desde segmentos vinculados en Planificación (sin peldaño). */
  metricasSegmentoVinculado?: ProyectoMetricasFlota;
  /** Fuente de verdad: pasos de claridad para segmentos (rutina solo copia al aplicar). */
  claridadActiva?: RutasMentalesSet;
  /** Oleada / objetivo actual (ej. producción 10 días). */
  oleadaTitulo?: string;
  /** Pasos ejecutados desde el Crisol (MOS) — subs cumplidas con proyecto vinculado. */
  pasosEjecutadosTotal?: number;
  /** Registro numerado de pasos ejecutados (Crisol → ring → proyecto). */
  pasosEjecutadosLog?: ProyectoPasoEjecutado[];
}

const PROYECTOS_KEY = "sistemicar_proyectos";
const PELDANOS_KEY = "sistemicar_proyecto_peldanos";

function getLocalProyectos(userId: string): Proyecto[] {
  try {
    const raw = localStorage.getItem(`${PROYECTOS_KEY}_${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Proyecto[];
    return parsed.map(p => {
      const legacy = p as unknown as Record<string, unknown>;
      const legacyCount = legacy["pelda\u00f1osConquistados"];
      return {
        ...p,
        peldanosConquistados:
          p.peldanosConquistados ??
          (typeof legacyCount === "number" ? legacyCount : 0),
      };
    });
  } catch {
    return [];
  }
}

function saveLocalProyectos(userId: string, list: Proyecto[]): void {
  if (safeSetItem(`${PROYECTOS_KEY}_${userId}`, JSON.stringify(list))) {
    window.dispatchEvent(new CustomEvent("proyectos-updated"));
  }
}

function getLocalPeldanos(userId: string): ProyectoPeldano[] {
  try {
    const raw = localStorage.getItem(`${PELDANOS_KEY}_${userId}`);
    if (!raw) return [];
    return JSON.parse(raw) as ProyectoPeldano[];
  } catch {
    return [];
  }
}

function saveLocalPeldanos(userId: string, list: ProyectoPeldano[]): void {
  if (safeSetItem(`${PELDANOS_KEY}_${userId}`, JSON.stringify(list))) {
    window.dispatchEvent(new CustomEvent("proyectos-updated"));
  }
}

async function syncFirestoreProyecto(userId: string, proyecto: Proyecto, isDelete = false): Promise<void> {
  const { db, getPrivatePath, isFirebaseConfigured } = await import("./firebase");
  if (!isFirebaseConfigured() || !db) return;
  try {
    const { collection, doc, setDoc, deleteDoc } = await import("firebase/firestore");
    const path = getPrivatePath(userId, "proyectos");
    const ref = doc(collection(db, path), proyecto.id);
    if (isDelete) await deleteDoc(ref);
    else await setDoc(ref, proyecto, { merge: true });
  } catch {
    // local ok
  }
}

async function syncFirestorePeldano(userId: string, peldano: ProyectoPeldano, isDelete = false): Promise<void> {
  const { db, getPrivatePath, isFirebaseConfigured } = await import("./firebase");
  if (!isFirebaseConfigured() || !db) return;
  try {
    const { collection, doc, setDoc, deleteDoc } = await import("firebase/firestore");
    const path = getPrivatePath(userId, "proyecto_peldanos");
    const ref = doc(collection(db, path), peldano.id);
    if (isDelete) await deleteDoc(ref);
    else await setDoc(ref, peldano, { merge: true });
  } catch {
    // local ok
  }
}

async function loadProyectosFromFirestore(userId: string): Promise<Proyecto[]> {
  const { db, getPrivatePath, isFirebaseConfigured } = await import("./firebase");
  if (!isFirebaseConfigured() || !db) return [];
  try {
    const { collection, getDocs } = await import("firebase/firestore");
    const path = getPrivatePath(userId, "proyectos");
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => {
      const data = d.data() as Proyecto & Record<string, unknown>;
      const legacyCount = data["pelda\u00f1osConquistados"];
      return {
        ...data,
        id: d.id,
        peldanosConquistados:
          (data as Proyecto).peldanosConquistados ??
          (typeof legacyCount === "number" ? legacyCount : 0),
      };
    });
  } catch {
    return [];
  }
}

async function loadPeldanosFromFirestore(userId: string): Promise<ProyectoPeldano[]> {
  const { db, getPrivatePath, isFirebaseConfigured } = await import("./firebase");
  if (!isFirebaseConfigured() || !db) return [];
  try {
    const { collection, getDocs } = await import("firebase/firestore");
    const path = getPrivatePath(userId, "proyecto_peldanos");
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProyectoPeldano));
  } catch {
    return [];
  }
}

async function loadPeldanosFromFirestoreByProyecto(
  userId: string,
  proyectoId: string
): Promise<ProyectoPeldano[]> {
  const { db, getPrivatePath, isFirebaseConfigured } = await import("./firebase");
  if (!isFirebaseConfigured() || !db) return [];
  try {
    const { collection, getDocs, query, where } = await import("firebase/firestore");
    const path = getPrivatePath(userId, "proyecto_peldanos");
    const snap = await getDocs(query(collection(db, path), where("proyectoId", "==", proyectoId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProyectoPeldano));
  } catch {
    return [];
  }
}

async function loadProyectoFromFirestoreById(userId: string, id: string): Promise<Proyecto | null> {
  const { db, getPrivatePath, isFirebaseConfigured } = await import("./firebase");
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const { collection, doc, getDoc } = await import("firebase/firestore");
    const path = getPrivatePath(userId, "proyectos");
    const snap = await getDoc(doc(collection(db, path), id));
    if (!snap.exists()) return null;
    const data = snap.data() as Proyecto & Record<string, unknown>;
    const legacyCount = data["pelda\u00f1osConquistados"];
    return {
      ...data,
      id: snap.id,
      peldanosConquistados:
        (data as Proyecto).peldanosConquistados ??
        (typeof legacyCount === "number" ? legacyCount : 0),
    };
  } catch {
    return null;
  }
}

/** Orden estable del Hub: orden manual, luego updatedAt desc. */
export function sortProyectos(list: Proyecto[]): Proyecto[] {
  return [...list].sort((a, b) => {
    const ao = a.orden ?? Number.MAX_SAFE_INTEGER;
    const bo = b.orden ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return b.updatedAt - a.updatedAt;
  });
}

/** Listado instantáneo desde localStorage (sin red). */
export function getProyectosLocal(userId: string): Proyecto[] {
  return sortProyectos(getLocalProyectos(userId));
}

export async function getProyectos(userId: string): Promise<Proyecto[]> {
  const byId = new Map<string, Proyecto>();
  for (const p of getLocalProyectos(userId)) byId.set(p.id, p);
  for (const p of await loadProyectosFromFirestore(userId)) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  return sortProyectos(Array.from(byId.values()));
}

export async function getProyectoById(userId: string, id: string): Promise<Proyecto | null> {
  const local = getLocalProyectos(userId).find(p => p.id === id);
  if (local) return local;
  return loadProyectoFromFirestoreById(userId, id);
}

export async function addProyecto(
  userId: string,
  data: Omit<Proyecto, "id" | "createdAt" | "updatedAt" | "peldanosConquistados" | "minutosTotales">
): Promise<Proyecto> {
  const now = Date.now();
  const claridadActiva =
    data.claridadActiva ??
    buildDefaultClaridadDireccion({
      tituloProyecto: data.titulo,
      etiqueta: data.etiqueta,
      focoTitulo: data.oleadaTitulo ?? data.titulo,
    });
  const existing = getLocalProyectos(userId);
  const minOrden = existing.reduce(
    (min, p) => Math.min(min, p.orden ?? 0),
    0
  );
  const proyecto: Proyecto = {
    id: `proy_${now}_${Math.random().toString(36).slice(2, 6)}`,
    ...data,
    claridadActiva,
    orden: minOrden - 1,
    peldanosConquistados: 0,
    minutosTotales: 0,
    createdAt: now,
    updatedAt: now,
  };
  const list = [...existing];
  list.unshift(proyecto);
  saveLocalProyectos(userId, list);
  void syncFirestoreProyecto(userId, proyecto);
  return proyecto;
}

/** Reordena proyectos en el Hub (swap con vecino). */
export async function reorderProyecto(
  userId: string,
  proyectoId: string,
  direction: "up" | "down"
): Promise<void> {
  const sorted = sortProyectos(getLocalProyectos(userId));
  if (sorted.length < 2) return;
  // Normaliza orden 0..n-1 para que el swap sea fiable aunque falten valores.
  const normalized = sorted.map((p, i) => ({ ...p, orden: i }));
  const idx = normalized.findIndex(p => p.id === proyectoId);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= normalized.length) return;
  const a = normalized[idx]!;
  const b = normalized[swapIdx]!;
  const ordenA = a.orden;
  a.orden = b.orden;
  b.orden = ordenA;
  a.updatedAt = Date.now();
  b.updatedAt = Date.now();
  const byId = new Map(normalized.map(p => [p.id, p]));
  const merged = getLocalProyectos(userId).map(p => byId.get(p.id) ?? p);
  saveLocalProyectos(userId, merged);
  void syncFirestoreProyecto(userId, a);
  void syncFirestoreProyecto(userId, b);
}

/** Guarda dirección de claridad en el Hub (sincroniza a segmentos al aplicar rutina o crear bloque). */
export async function updateProyectoClaridadActiva(
  userId: string,
  proyectoId: string,
  claridadActiva: RutasMentalesSet,
  oleadaTitulo?: string
): Promise<Proyecto | null> {
  return updateProyecto(userId, proyectoId, {
    claridadActiva: normalizeRutasMentales(claridadActiva),
    ...(oleadaTitulo !== undefined ? { oleadaTitulo: oleadaTitulo.trim() || undefined } : {}),
  });
}

/** Marca una oleada (peldaño) como dirección activa del proyecto. */
export async function setOleadaComoDireccion(
  userId: string,
  proyectoId: string,
  peldanoId: string
): Promise<Proyecto | null> {
  const [proyecto, peldanos] = await Promise.all([
    getProyectoById(userId, proyectoId),
    getPeldanosByProyecto(userId, proyectoId),
  ]);
  const pel = peldanos.find(p => p.id === peldanoId);
  if (!pel || !proyecto) return null;
  const claridad =
    pel.rutasMentales ??
    buildDefaultClaridadDireccion({
      tituloProyecto: proyecto.titulo,
      etiqueta: proyecto.etiqueta,
      focoTitulo: pel.titulo,
    });
  // Solo demota otras oleadas/ideas en curso — nunca sombras de segmento del día
  // (esas inundaban "Desglosar ideas" con el nombre del bloque repetido).
  for (const p of peldanos.filter(
    x => x.estado === "en_curso" && x.id !== peldanoId && !x.origenSegmento
  )) {
    await updatePeldano(userId, p.id, { estado: "idea" });
  }
  await updatePeldano(userId, peldanoId, {
    estado: "en_curso",
    rutasMentales: claridad,
    origenSegmento: false,
  });
  return updateProyecto(userId, proyectoId, {
    oleadaTitulo: pel.titulo,
    claridadActiva: claridad,
  });
}

export async function updateProyecto(
  userId: string,
  id: string,
  patch: Partial<Omit<Proyecto, "id" | "createdAt">>
): Promise<Proyecto | null> {
  const list = getLocalProyectos(userId);
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const updated: Proyecto = { ...list[idx], ...patch, updatedAt: Date.now() };
  list[idx] = updated;
  saveLocalProyectos(userId, list);
  void syncFirestoreProyecto(userId, updated);
  return updated;
}

export async function deleteProyecto(userId: string, id: string): Promise<void> {
  const prev = getLocalProyectos(userId);
  const removed = prev.find(p => p.id === id);
  saveLocalProyectos(userId, prev.filter(p => p.id !== id));
  const pelToRemove = getLocalPeldanos(userId).filter(p => p.proyectoId === id);
  saveLocalPeldanos(userId, getLocalPeldanos(userId).filter(p => p.proyectoId !== id));
  if (removed) void syncFirestoreProyecto(userId, removed, true);
  for (const pel of pelToRemove) void syncFirestorePeldano(userId, pel, true);
}

/** Peldaños en local (sin esperar Firebase). */
export function getPeldanosByProyectoLocal(userId: string, proyectoId: string): ProyectoPeldano[] {
  return getLocalPeldanos(userId)
    .filter(x => x.proyectoId === proyectoId)
    .sort((a, b) => a.orden - b.orden);
}

export async function getPeldanosByProyecto(userId: string, proyectoId: string): Promise<ProyectoPeldano[]> {
  const byId = new Map<string, ProyectoPeldano>();
  for (const p of getPeldanosByProyectoLocal(userId, proyectoId)) {
    byId.set(p.id, p);
  }
  for (const p of await loadPeldanosFromFirestoreByProyecto(userId, proyectoId)) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  return Array.from(byId.values()).sort((a, b) => a.orden - b.orden);
}

export async function addPeldanoIdea(
  userId: string,
  proyectoId: string,
  titulo: string,
  opts?: {
    plantillaSubs?: ProyectoPeldano["plantillaSubs"];
    plantillaSubTareas?: string[];
  }
): Promise<ProyectoPeldano> {
  const existing = await getPeldanosByProyecto(userId, proyectoId);
  const maxOrden = existing.reduce((m, p) => Math.max(m, p.orden), -1);
  const now = Date.now();
  const peldano: ProyectoPeldano = {
    id: `pel_${now}_${Math.random().toString(36).slice(2, 6)}`,
    proyectoId,
    orden: maxOrden + 1,
    titulo: titulo.trim(),
    estado: "idea",
    plantillaSubs: opts?.plantillaSubs,
    plantillaSubTareas: opts?.plantillaSubTareas,
    createdAt: now,
    updatedAt: now,
  };
  const all = getLocalPeldanos(userId);
  all.push(peldano);
  saveLocalPeldanos(userId, all);
  void syncFirestorePeldano(userId, peldano);
  await updateProyecto(userId, proyectoId, {});
  return peldano;
}

/** Peldaño sincronizado desde un segmento vinculado en planificación. */
export async function upsertPeldanoDesdeSegmento(
  userId: string,
  params: {
    proyectoId: string;
    segmentoId: string;
    planillaFecha: string;
    titulo: string;
    horaInicio: string;
    horaFin: string;
    rutasMentales: RutasMentalesSet;
  }
): Promise<ProyectoPeldano> {
  const peldanos = await getPeldanosByProyecto(userId, params.proyectoId);
  const tituloKey = params.titulo.trim().toLowerCase();
  // Deduplicar por día+título: al recargar rutina los segmentoId cambian y
  // antes se creaba otro "Desarrollo personal" en_curso cada vez.
  const existing = peldanos.find(
    p =>
      p.origenSegmento &&
      p.planillaFecha === params.planillaFecha &&
      (p.segmentoId === params.segmentoId ||
        p.titulo.trim().toLowerCase() === tituloKey)
  );
  if (existing) {
    const updated = await updatePeldano(userId, existing.id, {
      titulo: params.titulo,
      horaInicio: params.horaInicio,
      horaFin: params.horaFin,
      rutasMentales: params.rutasMentales,
      segmentoId: params.segmentoId,
      estado: existing.estado === "conquistado" ? "conquistado" : "en_curso",
    });
    return updated!;
  }

  const maxOrden = peldanos.reduce((m, p) => Math.max(m, p.orden), -1);
  const now = Date.now();
  const peldano: ProyectoPeldano = {
    id: `pel_seg_${now}_${Math.random().toString(36).slice(2, 6)}`,
    proyectoId: params.proyectoId,
    orden: maxOrden + 1,
    titulo: params.titulo.trim(),
    estado: "en_curso",
    origenSegmento: true,
    segmentoId: params.segmentoId,
    planillaFecha: params.planillaFecha,
    horaInicio: params.horaInicio,
    horaFin: params.horaFin,
    rutasMentales: params.rutasMentales,
    createdAt: now,
    updatedAt: now,
  };
  const all = getLocalPeldanos(userId);
  all.push(peldano);
  saveLocalPeldanos(userId, all);
  void syncFirestorePeldano(userId, peldano);
  await updateProyecto(userId, params.proyectoId, {});
  return peldano;
}

export async function refreshProyectoStatsPublic(userId: string, proyectoId: string): Promise<void> {
  await refreshProyectoStats(userId, proyectoId);
}

export async function updatePeldano(
  userId: string,
  id: string,
  patch: Partial<Omit<ProyectoPeldano, "id" | "proyectoId" | "createdAt">>
): Promise<ProyectoPeldano | null> {
  const all = getLocalPeldanos(userId);
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const updated: ProyectoPeldano = { ...all[idx], ...patch, updatedAt: Date.now() };
  all[idx] = updated;
  saveLocalPeldanos(userId, all);
  void syncFirestorePeldano(userId, updated);
  return updated;
}

export async function reorderPeldano(
  userId: string,
  proyectoId: string,
  peldanoId: string,
  direction: "up" | "down"
): Promise<void> {
  const ideas = (await getPeldanosByProyecto(userId, proyectoId)).filter(p => p.estado === "idea");
  const idx = ideas.findIndex(p => p.id === peldanoId);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= ideas.length) return;
  const a = ideas[idx];
  const b = ideas[swapIdx];
  await updatePeldano(userId, a.id, { orden: b.orden });
  await updatePeldano(userId, b.id, { orden: a.orden });
}

export async function deletePeldanoIdea(userId: string, id: string): Promise<void> {
  const all = getLocalPeldanos(userId);
  const pel = all.find(p => p.id === id);
  if (!pel || pel.estado !== "idea") return;
  saveLocalPeldanos(userId, all.filter(p => p.id !== id));
  void syncFirestorePeldano(userId, pel, true);
}

export async function markPeldanoEnCurso(
  userId: string,
  peldanoId: string,
  vehicleId: string,
  tipoOrigen: "tiempo" | "situacion"
): Promise<void> {
  await updatePeldano(userId, peldanoId, {
    estado: "en_curso",
    vehicleId,
    tipoOrigen,
  });
}

function profundidadFromSubs(subs: SubVehiculo[], rutaCruzada?: RutaCruzadaSnapshot | null): FocusBandId {
  let max: FocusBandId = "fluido";
  for (const s of subs) {
    if (s.status === "cumplido") max = maxBanda(max, inferBandaBloque(s));
  }
  if (rutaCruzada?.limite) return maxBanda(max, "limite");
  if (rutaCruzada?.concentrado) return maxBanda(max, "concentrado");
  return max;
}

async function refreshProyectoStats(userId: string, proyectoId: string): Promise<void> {
  const conquistados = (await getPeldanosByProyecto(userId, proyectoId)).filter(p => p.estado === "conquistado");
  let profundidad: FocusBandId = "fluido";
  let minutos = 0;
  for (const p of conquistados) {
    if (p.resumen?.profundidadMaxima) profundidad = maxBanda(profundidad, p.resumen.profundidadMaxima);
    minutos += p.resumen?.duracionMin ?? 0;
  }
  await updateProyecto(userId, proyectoId, {
    peldanosConquistados: conquistados.length,
    profundidadMaxima: profundidad,
    minutosTotales: minutos,
  });
}

export async function markPeldanoConquistadoTiempo(
  userId: string,
  vehicle: Vehicle,
  subs: SubVehiculo[],
  psGanados: number
): Promise<void> {
  if (!vehicle.proyectoId || !vehicle.proyectoPeldanoId) return;
  const cumplidos = subs.filter(s => s.status === "cumplido").length;
  const duracionMin = vehicle.duracionFinal ?? 0;
  const profundidadMaxima = profundidadFromSubs(subs, vehicle.rutaCruzada);
  const subResumen = subs
    .filter(s => s.status === "cumplido" || s.status === "fallado")
    .map(sv => ({
      titulo: sv.titulo,
      status: sv.status as "cumplido" | "fallado",
      duracionMin: sv.duracionFinal != null ? Math.round(sv.duracionFinal / 60) : undefined,
    }));
  const decisionesEnumeradas = filterDecisionsForProyecto(
    buildTranscriptFromVehicles([vehicle]),
    vehicle.proyectoId
  );

  await updatePeldano(userId, vehicle.proyectoPeldanoId, {
    estado: "conquistado",
    tipoOrigen: "tiempo",
    cerradoAt: Date.now(),
    vehicleId: vehicle.id,
    resumen: {
      subsCumplidos: cumplidos,
      subsTotal: subs.length,
      duracionMin,
      profundidadMaxima,
      psGanados,
      subResumen,
      decisionesEnumeradas: decisionesEnumeradas.length ? decisionesEnumeradas : undefined,
      totalDecisiones: decisionesEnumeradas.length || undefined,
    },
  });
  await refreshProyectoStats(userId, vehicle.proyectoId);
}

/** Resumen anidado subtarea → detalles para aterrizaje en Hub de Proyectos. */
export function buildSubTareasResumenFromVehicle(subTareas: SubTarea[]): ProyectoSubTareaResumen[] {
  return subTareas
    .filter(st => {
      if (st.enDesgloseCronometro) {
        return st.resultadoSituacion === "cumplido" || st.resultadoSituacion === "fallado";
      }
      if (st.completada) return true;
      return (st.detalles?.length ?? 0) > 0;
    })
    .map(st => ({
      texto: st.texto,
      resultado:
        st.resultadoSituacion ??
        (st.completada ? "cumplido" : st.enDesgloseCronometro ? "pendiente" : undefined),
      detalles: (st.detalles ?? []).map(d => ({
        texto: d.texto,
        entregado: d.entregado,
        ...(d.casa ? { casa: true } : {}),
      })),
    }));
}

function profundidadFromSituacionSubTareas(subTareas: SubTarea[]): FocusBandId {
  const entregados = subTareas.reduce(
    (n, st) => n + (st.detalles?.filter(d => d.entregado && !d.casa).length ?? 0),
    0
  );
  if (entregados >= 8) return "limite";
  if (entregados >= 3) return "concentrado";
  return "fluido";
}

/** Ramas incompletas → ideas en el Hub (sin duplicar títulos de ideas existentes). */
export function collectRamasIncompletas(
  subTareas: SubTarea[]
): Array<{ titulo: string; plantillaSubTareas?: string[] }> {
  const out: Array<{ titulo: string; plantillaSubTareas?: string[] }> = [];
  for (const st of subTareas) {
    const pendingDetalles = (st.detalles ?? []).filter(d => !d.entregado && !d.casa);
    const isSubIncomplete =
      st.enDesgloseCronometro && st.resultadoSituacion !== "cumplido";

    if (isSubIncomplete) {
      out.push({
        titulo: `Retomar: ${st.texto}`,
        plantillaSubTareas:
          pendingDetalles.length > 0 ? pendingDetalles.map(d => d.texto) : undefined,
      });
    } else if (pendingDetalles.length > 0) {
      out.push({
        titulo: `Profundizar: ${st.texto}`,
        plantillaSubTareas: pendingDetalles.map(d => d.texto),
      });
    }
  }
  return out;
}

async function spawnIdeasFromRamasIncompletas(
  userId: string,
  proyectoId: string,
  subTareas: SubTarea[]
): Promise<number> {
  const ramas = collectRamasIncompletas(subTareas);
  if (ramas.length === 0) return 0;

  const existing = await getPeldanosByProyecto(userId, proyectoId);
  const existingTitles = new Set(
    existing.filter(p => p.estado === "idea").map(p => p.titulo.trim().toLowerCase())
  );

  let created = 0;
  for (const rama of ramas) {
    const key = rama.titulo.trim().toLowerCase();
    if (existingTitles.has(key)) continue;
    await addPeldanoIdea(userId, proyectoId, rama.titulo, {
      plantillaSubTareas: rama.plantillaSubTareas,
    });
    existingTitles.add(key);
    created++;
  }
  return created;
}

export async function markPeldanoConquistadoSituacion(
  userId: string,
  vehicle: Vehicle,
  opts: {
    duracionMin: number;
    psGanados: number;
    subTareas: SubTarea[];
    minutosGanados?: number;
    minutosGanadosSesion?: number;
    retoNumero?: number;
  }
): Promise<{ ideasCreadas: number }> {
  if (!vehicle.proyectoId || !vehicle.proyectoPeldanoId) return { ideasCreadas: 0 };
  const cronometradas = opts.subTareas.filter(st => st.enDesgloseCronometro);
  const cumplidas = cronometradas.filter(st => st.resultadoSituacion === "cumplido").length;
  const subTareasResumen = buildSubTareasResumenFromVehicle(opts.subTareas);
  const decisionesEnumeradas = filterDecisionsForProyecto(
    buildTranscriptFromVehicles([{ ...vehicle, subTareas: opts.subTareas }]),
    vehicle.proyectoId
  );

  await updatePeldano(userId, vehicle.proyectoPeldanoId, {
    estado: "conquistado",
    tipoOrigen: "situacion",
    cerradoAt: Date.now(),
    vehicleId: vehicle.id,
    resumen: {
      subsCumplidos: cumplidas,
      subsTotal: cronometradas.length,
      duracionMin: opts.duracionMin,
      profundidadMaxima: profundidadFromSituacionSubTareas(opts.subTareas),
      psGanados: opts.psGanados,
      subTareasResumen,
      minutosGanados: opts.minutosGanados,
      minutosGanadosSesion: opts.minutosGanadosSesion,
      retoNumero: opts.retoNumero,
      decisionesEnumeradas: decisionesEnumeradas.length ? decisionesEnumeradas : undefined,
      totalDecisiones: decisionesEnumeradas.length || undefined,
    },
  });
  await refreshProyectoStats(userId, vehicle.proyectoId);
  const ideasCreadas = await spawnIdeasFromRamasIncompletas(
    userId,
    vehicle.proyectoId,
    opts.subTareas
  );
  return { ideasCreadas };
}

/**
 * Cierra un vehículo → peldaño en el Hub (sensación de caminar lejos).
 * - Idea puntual (no es la oleada activa) → conquista ese peldaño.
 * - Oleada activa / solo proyectoId / sombra de segmento → crea peldaño conquistado nuevo
 *   (se camina SOBRE la oleada; no se apaga con un solo cierre).
 * - La sombra de segmento la sella además el cierre de puerta.
 */
export async function recordProgresoHubAlCerrarVehiculo(
  userId: string,
  vehicle: Vehicle,
  opts: {
    tipoOrigen: "tiempo" | "situacion";
    psGanados: number;
    duracionMin?: number;
    subs?: SubVehiculo[];
    subTareas?: SubTarea[];
    /** Override del clasificador; default = vehicle.destinoCierre ?? presencia. */
    destinoCierre?: "presencia" | "peldano";
  }
): Promise<void> {
  const destino = resolveDestinoCierre(vehicle.destinoCierre, opts.destinoCierre);
  if (!feedsProyectoHub(destino)) return;

  const proyectoId = vehicle.proyectoId;
  if (!proyectoId) return;

  if (vehicle.proyectoPeldanoId) {
    const peldanos = getPeldanosByProyectoLocal(userId, proyectoId);
    const pel = peldanos.find(p => p.id === vehicle.proyectoPeldanoId);
    const oleada = getOleadaEnCurso(peldanos);
    const esOleadaActiva = Boolean(
      pel && !pel.origenSegmento && oleada?.id && pel.id === oleada.id
    );
    // Idea puntual (no oleada, no segmento): el desglose cierra ese bloque de ideas.
    if (pel && !pel.origenSegmento && !esOleadaActiva) {
      if (opts.tipoOrigen === "tiempo") {
        await markPeldanoConquistadoTiempo(
          userId,
          vehicle,
          opts.subs ?? vehicle.subVehiculos ?? [],
          opts.psGanados
        );
      } else {
        await markPeldanoConquistadoSituacion(userId, vehicle, {
          duracionMin: opts.duracionMin ?? vehicle.duracionFinal ?? 0,
          psGanados: opts.psGanados,
          subTareas: opts.subTareas ?? vehicle.subTareas ?? [],
        });
      }
      return;
    }
  }

  await spawnConquistadoDesdeVehiculo(userId, vehicle, opts);
}

/** Peldaño conquistado nuevo = un paso caminado sobre la oleada/proyecto. */
async function spawnConquistadoDesdeVehiculo(
  userId: string,
  vehicle: Vehicle,
  opts: {
    tipoOrigen: "tiempo" | "situacion";
    psGanados: number;
    duracionMin?: number;
    subs?: SubVehiculo[];
    subTareas?: SubTarea[];
  }
): Promise<void> {
  const proyectoId = vehicle.proyectoId;
  if (!proyectoId) return;

  const existing = getPeldanosByProyectoLocal(userId, proyectoId);
  if (existing.some(p => p.vehicleId === vehicle.id && p.estado === "conquistado")) {
    return;
  }

  const proyecto = await getProyectoById(userId, proyectoId);
  const oleadaLabel = proyecto?.oleadaTitulo?.trim();
  const tituloBase = vehicle.titulo.trim() || "Paso ejecutado";
  const titulo = oleadaLabel ? `${tituloBase}` : tituloBase;

  const subs = opts.subs ?? vehicle.subVehiculos ?? [];
  const subTareas = opts.subTareas ?? vehicle.subTareas ?? [];
  const duracionMin = opts.duracionMin ?? vehicle.duracionFinal ?? 0;
  const ahora = Date.now();
  const maxOrden = existing.reduce((m, p) => Math.max(m, p.orden), -1);

  let resumen: ProyectoPeldanoResumen;
  if (opts.tipoOrigen === "tiempo") {
    const cumplidos = subs.filter(s => s.status === "cumplido").length;
    resumen = {
      subsCumplidos: cumplidos,
      subsTotal: subs.length,
      duracionMin,
      profundidadMaxima: profundidadFromSubs(subs, vehicle.rutaCruzada),
      psGanados: opts.psGanados,
      subResumen: subs
        .filter(s => s.status === "cumplido" || s.status === "fallado")
        .map(sv => ({
          titulo: sv.titulo,
          status: sv.status as "cumplido" | "fallado",
          duracionMin: sv.duracionFinal != null ? Math.round(sv.duracionFinal / 60) : undefined,
        })),
      segmentoResumen: oleadaLabel
        ? { rutaMentalLabel: `Oleada · ${oleadaLabel}`, vehiculosCerrados: 1 }
        : { vehiculosCerrados: 1 },
    };
  } else {
    const cronometradas = subTareas.filter(st => st.enDesgloseCronometro);
    const cumplidas = cronometradas.filter(st => st.resultadoSituacion === "cumplido").length;
    resumen = {
      subsCumplidos: cumplidas,
      subsTotal: cronometradas.length,
      duracionMin,
      profundidadMaxima: profundidadFromSituacionSubTareas(subTareas),
      psGanados: opts.psGanados,
      subTareasResumen: buildSubTareasResumenFromVehicle(subTareas),
      segmentoResumen: oleadaLabel
        ? { rutaMentalLabel: `Oleada · ${oleadaLabel}`, vehiculosCerrados: 1 }
        : { vehiculosCerrados: 1 },
    };
  }

  const peldano: ProyectoPeldano = {
    id: `pel_walk_${ahora}_${Math.random().toString(36).slice(2, 6)}`,
    proyectoId,
    orden: maxOrden + 1,
    titulo,
    estado: "conquistado",
    tipoOrigen: opts.tipoOrigen,
    vehicleId: vehicle.id,
    cerradoAt: ahora,
    resumen,
    createdAt: ahora,
    updatedAt: ahora,
  };
  const all = getLocalPeldanos(userId);
  all.push(peldano);
  saveLocalPeldanos(userId, all);
  void syncFirestorePeldano(userId, peldano);
  await refreshProyectoStats(userId, proyectoId);
}

export function computeProyectoStats(peldanos: ProyectoPeldano[]) {
  const conquistados = peldanos.filter(p => p.estado === "conquistado");
  const ideas = peldanos.filter(p => p.estado === "idea");
  let minutos = 0;
  let profundidad: FocusBandId = "fluido";
  for (const p of conquistados) {
    minutos += p.resumen?.duracionMin ?? 0;
    if (p.resumen?.profundidadMaxima) profundidad = maxBanda(profundidad, p.resumen.profundidadMaxima);
  }
  return {
    conquistados: conquistados.length,
    ideas: ideas.length,
    minutosTotales: minutos,
    profundidadMaxima: profundidad,
    ultimoConquistado: [...conquistados].sort((a, b) => (b.cerradoAt ?? 0) - (a.cerradoAt ?? 0))[0] ?? null,
  };
}

/** Volcado automático de métricas de flota durante un segmento vinculado. */
export async function registrarActividadFlotaEnProyecto(
  userId: string,
  proyectoId: string,
  act: {
    tipoFlota: TipoFlota;
    tipoFlotaReal?: TipoFlota;
    minutos?: number;
    ps?: number;
    segmentoId?: string;
    segmentoNombre?: string;
    vehicleId?: string;
    ejeSaludRecuperacion?: boolean;
  }
): Promise<void> {
  const list = getLocalProyectos(userId);
  const idx = list.findIndex(p => p.id === proyectoId);
  if (idx === -1) return;

  const prev = list[idx].metricasSegmentoVinculado ?? {
    minutosPorFlota: {},
    psPorFlota: {},
  };
  const minutos = Math.max(0, act.minutos ?? 0);
  const ps = Math.max(0, act.ps ?? 0);
  const tipoHub = act.tipoFlota;

  const minutosPorFlota = { ...prev.minutosPorFlota };
  const psPorFlota = { ...prev.psPorFlota };
  minutosPorFlota[tipoHub] = (minutosPorFlota[tipoHub] ?? 0) + minutos;
  psPorFlota[tipoHub] = (psPorFlota[tipoHub] ?? 0) + ps;

  const updated: Proyecto = {
    ...list[idx],
    minutosTotales: (list[idx].minutosTotales ?? 0) + minutos,
    metricasSegmentoVinculado: {
      minutosPorFlota,
      psPorFlota,
      ultimoSegmentoId: act.segmentoId ?? prev.ultimoSegmentoId,
      ultimoSegmentoNombre: act.segmentoNombre ?? prev.ultimoSegmentoNombre,
      ultimaActualizacionAt: Date.now(),
    },
    updatedAt: Date.now(),
  };
  list[idx] = updated;
  saveLocalProyectos(userId, list);
  void syncFirestoreProyecto(userId, updated);
}

function mergeDecisionIntoList(
  prev: ProyectoDecisionEnumerada[],
  entry: ProyectoDecisionEnumerada
): ProyectoDecisionEnumerada[] {
  if (prev.some(d => d.key === entry.key)) return prev;
  const next = [...prev, entry].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
  return next.map((d, i) => ({ ...d, n: i + 1 }));
}

/** Añade una decisión al transcript del peldaño (idempotente por key). */
export async function appendDecisionToPeldanoTranscript(
  userId: string,
  peldanoId: string,
  entry: ProyectoDecisionEnumerada
): Promise<void> {
  const peldanos = getLocalPeldanos(userId);
  const idx = peldanos.findIndex(p => p.id === peldanoId);
  if (idx === -1) return;
  const pel = peldanos[idx];
  const prev = pel.resumen?.decisionesEnumeradas ?? [];
  const decisionesEnumeradas = mergeDecisionIntoList(prev, entry);
  await updatePeldano(userId, peldanoId, {
    resumen: {
      ...pel.resumen,
      decisionesEnumeradas,
      totalDecisiones: decisionesEnumeradas.length,
    },
  });
}

/** Incrementa el correlativo y registra el paso en el log del proyecto (Crisol → ring). */
export async function registrarPasoEjecutadoEnProyecto(
  userId: string,
  proyectoId: string,
  paso?: Omit<ProyectoPasoEjecutado, "n" | "proyectoId"> & { proyectoId?: string }
): Promise<{ pasoNumero: number } | null> {
  const list = getLocalProyectos(userId);
  const idx = list.findIndex(p => p.id === proyectoId);
  if (idx === -1) return null;
  const prevLog = list[idx].pasosEjecutadosLog ?? [];
  if (paso?.key && prevLog.some(e => e.key === paso.key)) {
    const existing = prevLog.find(e => e.key === paso.key);
    return existing?.pasoEjecutadoNumero != null
      ? { pasoNumero: existing.pasoEjecutadoNumero }
      : existing
        ? { pasoNumero: existing.n }
        : null;
  }
  const pasoNumero = (list[idx].pasosEjecutadosTotal ?? 0) + 1;
  const logEntry: ProyectoPasoEjecutado | undefined = paso
    ? {
        ...paso,
        n: pasoNumero,
        pasoEjecutadoNumero: pasoNumero,
        proyectoId,
      }
    : undefined;
  const pasosEjecutadosLog = logEntry
    ? [...prevLog, logEntry].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0)).map((e, i) => ({ ...e, n: i + 1 }))
    : prevLog;
  await updateProyecto(userId, proyectoId, {
    pasosEjecutadosTotal: pasoNumero,
    ...(logEntry ? { pasosEjecutadosLog } : {}),
  });
  return { pasoNumero };
}

export function subscribeToProyectos(userId: string, onData: () => void): () => void {
  const handler = () => onData();
  window.addEventListener("proyectos-updated", handler);
  return () => window.removeEventListener("proyectos-updated", handler);
}

export function buildLaunchUrl(
  proyectoId: string,
  peldanoId: string,
  launch: "desglosador_tiempo" | "desglosador_situacion"
): string {
  const q = new URLSearchParams({ proyectoId, peldanoId, launch });
  return `/jornada-v4?${q.toString()}`;
}
