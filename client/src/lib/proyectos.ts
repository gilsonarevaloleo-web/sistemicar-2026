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
import { resolveDuracionMinCierre } from "./concienciaTriadaOperador";
import {
  minutosFromSegundos,
  resolveRutaMinutosSituacion,
  type FuenteMinutosSituacion,
} from "./rutaMinutosSituacionProyecto";
import {
  accrueGastoTiempo,
  buildProyectoRendicion,
  sealGastoTiempo,
  type ProyectoGastoTiempo,
} from "./gastoTiempo";
import { safeSetItem } from "./storageHygiene";
import { unlinkProyectoVinculosLocal } from "./proyectoLifecycle";
import {
  buildTranscriptFromVehicles,
  filterDecisionsForProyecto,
} from "./ringDecisionTranscript";
import {
  capSintoniaDesdeProduccion,
  createOleadaPunto,
  inferOleadaPuntoStatusFromProduccion,
  nextPuntoProduccionIdAfterDelete,
  oleadaMereceCapitulo,
  renumberOleadaPuntos,
  resolvePuntoProduccion,
  sintonizarOleadaPunto,
  sortOleadaPuntos,
  type OleadaPunto,
  type OleadaPuntoStatus,
} from "./oleadaPuntos";
import {
  accrueVehiculoAlTimon,
  crearTimonEpisodio,
  episodioTimonVacio,
  hydratePresenciaEpisodio,
  hydrateTimonEpisodio,
  resumenTimonDesdeEpisodio,
  trabajoMinutosReales,
  yaEstaEnTimon,
  type TimonEpisodio,
  type TimonResumenPeldano,
} from "./timonHoras";

export type {
  ClaridadProfundidad,
  ProyectoEtiqueta,
  RutaMental,
  RutaMentalId,
  RutaMentalPaso,
  RutasMentalesSet,
} from "./claridadDireccion";

export type { OleadaPunto, OleadaPuntoStatus } from "./oleadaPuntos";
export {
  getFocoOleadaPunto,
  summarizeOleadaPuntos,
  oleadaMereceCapitulo,
  OLEADA_PUNTO_STATUS_LABEL,
  nextOleadaPuntoStatus,
  resolvePuntoProduccion,
} from "./oleadaPuntos";
export type { TimonEpisodio, TimonResumenPeldano } from "./timonHoras";
export type { ProyectoGastoTiempo, ProyectoRendicionTiempo, GastoTiempoSello } from "./gastoTiempo";
export { buildProyectoRendicion } from "./gastoTiempo";
export {
  formatHoraLabel,
  formatHorasCerradas,
  formatDuracionTimon,
  formatCuandoProduccion,
  horaEnCurso,
  horasDeEpisodio,
  horasCompletasDeMinutos,
  hydrateTimonEpisodio,
  hydratePresenciaEpisodio,
  ledgerVehiculosTimon,
  trabajoMinutosReales,
} from "./timonHoras";

export type PeldanoEstado = "idea" | "en_curso" | "conquistado" | "archivada";

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
  /**
   * Estancia sellada del timón: horas enumeradas de un punto de producción.
   * Un peldaño = lo ya caminado al cambiar de enfoque, no cada vehículo.
   */
  timon?: TimonResumenPeldano;
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
  /**
   * Desglose de la oleada = propuesta futura numerada (ordenamiento mental).
   * No es checklist rígido: se edita/borra libremente; la producción solo sintoniza.
   */
  oleadaPuntos?: OleadaPunto[];
  /**
   * Timón: a dónde se amontonan los envíos.
   * No caduca con el día. Solo cambia si el operador marca otro punto.
   */
  puntoProduccionId?: string;
  /**
   * Estancia viva del timón: vehículos sumados en horas 1, 2, 3…
   * Se sella a peldaño al cambiar el punto de producción.
   */
  timonEpisodio?: TimonEpisodio;
  /**
   * Estancias del timón selladas al archivar (o al cambiar de oleada).
   * El capítulo se consulta aquí; no vuelve a Ideas.
   */
  timonCerrados?: TimonEpisodio[];
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
  /** Minutos Norte = peldaños conquista (no situacionales) + segundosNorteSituacion. */
  minutosTotales?: number;
  /**
   * Segundos reales del ring situacional (clic a clic) con dirección de escalera.
   * No se recalculan desde peldaños: evita doble conteo al cerrar el bloque.
   */
  segundosNorteSituacion?: number;
  /**
   * Segundos de ring situacional con destino presencia explícito.
   */
  segundosPresenciaRing?: number;
  /** Claves idempotentes `ring:vehicleId:subId` (anti doble clic). */
  situacionCreditKeys?: string[];
  /**
   * Minutos de presencia vinculados al proyecto (destino presencia).
   * No escriben peldaños; alimentan etapa Presente.
   */
  minutosPresencia?: number;
  /**
   * Rendición de gasto: sellos de pared por vehículo (lista rápida, interrupt,
   * idle de desglosador). No ensucia la escalera.
   */
  gastoTiempo?: ProyectoGastoTiempo;
  /**
   * Enumeración infinita de presencia (Hora 1, 2, 3… sin sellar peldaño).
   */
  presenciaEpisodio?: TimonEpisodio;
  /** Cierres presencia contados (idempotentes por vehicleId). */
  sesionesPresencia?: number;
  /** Ring de vehicleIds ya contabilizados en presencia (anti doble conteo). */
  presenciaVehicleIds?: string[];
  primeraPresenciaAt?: number;
  primerNorteAt?: number;
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

async function syncFirestoreProyecto(
  userId: string,
  proyecto: Proyecto,
  isDelete = false,
  replace = false
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const { db, getPrivatePath, isFirebaseConfigured } = await import("./firebase");
  if (!isFirebaseConfigured() || !db) return;
  try {
    const { collection, doc, setDoc, deleteDoc } = await import("firebase/firestore");
    const path = getPrivatePath(userId, "proyectos");
    const ref = doc(collection(db, path), proyecto.id);
    if (isDelete) await deleteDoc(ref);
    else if (replace) await setDoc(ref, proyecto);
    else await setDoc(ref, proyecto, { merge: true });
  } catch {
    // local ok
  }
}

function removeLocalPeldanosOfProyecto(userId: string, proyectoId: string): ProyectoPeldano[] {
  const pelToRemove = getLocalPeldanos(userId).filter(p => p.proyectoId === proyectoId);
  if (pelToRemove.length === 0) return [];
  saveLocalPeldanos(
    userId,
    getLocalPeldanos(userId).filter(p => p.proyectoId !== proyectoId)
  );
  return pelToRemove;
}

async function syncFirestorePeldano(userId: string, peldano: ProyectoPeldano, isDelete = false): Promise<void> {
  if (typeof indexedDB === "undefined") return;
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

/** Reordena proyectos en el Hub (swap con vecino). Local es síncrono: la UI puede pintar el nuevo orden al instante. */
export async function reorderProyecto(
  userId: string,
  proyectoId: string,
  direction: "up" | "down"
): Promise<Proyecto[]> {
  const sorted = sortProyectos(getLocalProyectos(userId));
  if (sorted.length < 2) return sorted;
  // Normaliza orden 0..n-1 para que el swap sea fiable aunque falten valores.
  const normalized = sorted.map((p, i) => ({ ...p, orden: i }));
  const idx = normalized.findIndex(p => p.id === proyectoId);
  if (idx === -1) return sorted;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= normalized.length) return sorted;
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
  return sortProyectos(merged);
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
  // Oleada anterior: si ya hay camino, se archiva como capítulo.
  // Si estaba vacía, vuelve a Ideas. Nunca se tocan sombras de segmento.
  for (const p of peldanos.filter(
    x => x.estado === "en_curso" && x.id !== peldanoId && !x.origenSegmento
  )) {
    if (oleadaMereceCapitulo(p)) {
      await archivarOleada(userId, p.id);
    } else {
      await updatePeldano(userId, p.id, { estado: "idea" });
    }
  }
  const pin = resolvePuntoProduccion(pel);
  const reopenFromArchive = pel.estado === "archivada";
  await updatePeldano(userId, peldanoId, {
    estado: "en_curso",
    rutasMentales: claridad,
    origenSegmento: false,
    ...(reopenFromArchive && pin
      ? { timonEpisodio: crearTimonEpisodio(pin.id, pin.titulo) }
      : {}),
  });
  return updateProyecto(userId, proyectoId, {
    oleadaTitulo: pel.titulo,
    claridadActiva: claridad,
  });
}

function appendTimonCerrado(
  pel: ProyectoPeldano,
  episodio: TimonEpisodio | null | undefined
): TimonEpisodio[] {
  const prev = pel.timonCerrados ?? [];
  if (!episodio || episodioTimonVacio(episodio)) return prev;
  if (prev.some(e => e.id === episodio.id)) return prev;
  return [...prev, episodio];
}

/**
 * Cierra la oleada como capítulo: sella el timón vivo, la saca del escritorio
 * y la deja consultable. No borra el desglose ni las horas caminadas.
 */
export async function archivarOleada(
  userId: string,
  peldanoId: string,
  opts?: { now?: number }
): Promise<ProyectoPeldano | null> {
  const pel = getLocalPeldanos(userId).find(p => p.id === peldanoId);
  if (!pel) return null;
  if (pel.origenSegmento) return pel;
  if (pel.estado === "archivada") return pel;
  if (pel.estado !== "en_curso" && pel.estado !== "idea") return pel;

  const now = opts?.now ?? Date.now();
  const wasActive = pel.estado === "en_curso" && !pel.origenSegmento;
  const vivo = hydrateOleadaTimonVivo(pel);
  await spawnPeldanoDesdeTimonEpisodio(userId, vivo);

  const pin = resolvePuntoProduccion(pel);
  const updated = await updatePeldano(userId, peldanoId, {
    estado: "archivada",
    cerradoAt: now,
    timonCerrados: appendTimonCerrado(pel, vivo.timonEpisodio),
    timonEpisodio: pin ? crearTimonEpisodio(pin.id, pin.titulo) : undefined,
  });

  if (wasActive) {
    const proyecto = getLocalProyectos(userId).find(p => p.id === pel.proyectoId);
    if (proyecto) {
      await updateProyecto(userId, pel.proyectoId, { oleadaTitulo: undefined });
    }
  }
  return updated;
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
  const pelToRemove = removeLocalPeldanosOfProyecto(userId, id);
  unlinkProyectoVinculosLocal(userId, id, "delete");
  if (removed) void syncFirestoreProyecto(userId, removed, true);
  for (const pel of pelToRemove) void syncFirestorePeldano(userId, pel, true);
}

/**
 * Reinicia el proyecto sin perder el nido: mismo id, título, color y nota.
 * Borra escalera, oleada, minutos y conciencia — para volver a enfocar.
 */
export async function resetProyecto(userId: string, id: string): Promise<Proyecto | null> {
  const list = getLocalProyectos(userId);
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const prev = list[idx];
  const now = Date.now();
  const reset: Proyecto = {
    id: prev.id,
    titulo: prev.titulo,
    etiqueta: prev.etiqueta,
    ...(prev.color ? { color: prev.color } : {}),
    ...(prev.icono ? { icono: prev.icono } : {}),
    ...(prev.nota ? { nota: prev.nota } : {}),
    ...(prev.orden != null ? { orden: prev.orden } : {}),
    createdAt: prev.createdAt,
    updatedAt: now,
    peldanosConquistados: 0,
    minutosTotales: 0,
    minutosPresencia: 0,
    sesionesPresencia: 0,
    presenciaVehicleIds: [],
    claridadActiva: buildDefaultClaridadDireccion({
      tituloProyecto: prev.titulo,
      etiqueta: prev.etiqueta,
      focoTitulo: prev.titulo,
    }),
  };
  list[idx] = reset;
  saveLocalProyectos(userId, list);
  const pelToRemove = removeLocalPeldanosOfProyecto(userId, id);
  unlinkProyectoVinculosLocal(userId, id, "reset");
  void syncFirestoreProyecto(userId, reset, false, true);
  for (const pel of pelToRemove) void syncFirestorePeldano(userId, pel, true);
  return reset;
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
): Promise<ProyectoPeldano[]> {
  const all = getLocalPeldanos(userId);
  const ideas = all
    .filter(x => x.proyectoId === proyectoId && x.estado === "idea")
    .sort((a, b) => a.orden - b.orden);
  const current = getPeldanosByProyectoLocal(userId, proyectoId);
  const idx = ideas.findIndex(p => p.id === peldanoId);
  if (idx === -1) return current;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= ideas.length) return current;
  const a = ideas[idx]!;
  const b = ideas[swapIdx]!;
  const ordenA = a.orden;
  const ordenB = b.orden;
  const now = Date.now();
  const next = all.map(p => {
    if (p.id === a.id) return { ...p, orden: ordenB, updatedAt: now };
    if (p.id === b.id) return { ...p, orden: ordenA, updatedAt: now };
    return p;
  });
  saveLocalPeldanos(userId, next);
  const updatedA = next.find(p => p.id === a.id);
  const updatedB = next.find(p => p.id === b.id);
  if (updatedA) void syncFirestorePeldano(userId, updatedA);
  if (updatedB) void syncFirestorePeldano(userId, updatedB);
  return next
    .filter(x => x.proyectoId === proyectoId)
    .sort((x, y) => x.orden - y.orden);
}

export async function deletePeldanoIdea(userId: string, id: string): Promise<void> {
  const all = getLocalPeldanos(userId);
  const pel = all.find(p => p.id === id);
  if (!pel || pel.estado !== "idea") return;
  saveLocalPeldanos(userId, all.filter(p => p.id !== id));
  void syncFirestorePeldano(userId, pel, true);
}

function readOleadaPuntos(peldano: ProyectoPeldano): OleadaPunto[] {
  return sortOleadaPuntos(peldano.oleadaPuntos ?? []);
}

/** Añade un punto a la propuesta de oleada (siempre nace como `propuesta`). */
export async function addOleadaPunto(
  userId: string,
  peldanoId: string,
  titulo: string
): Promise<ProyectoPeldano | null> {
  const trimmed = titulo.trim();
  if (!trimmed) return null;
  const all = getLocalPeldanos(userId);
  const pel = all.find(p => p.id === peldanoId);
  if (!pel) return null;
  const puntos = readOleadaPuntos(pel);
  const created = createOleadaPunto(trimmed, puntos.length + 1);
  const next = renumberOleadaPuntos([...puntos, created]);
  const firstPin = !pel.puntoProduccionId;
  return updatePeldano(userId, peldanoId, {
    oleadaPuntos: next,
    puntoProduccionId: pel.puntoProduccionId ?? created.id,
    ...(firstPin && !pel.timonEpisodio
      ? { timonEpisodio: crearTimonEpisodio(created.id, created.titulo) }
      : {}),
  });
}

function nextPuntoTrasCumplir(
  pel: ProyectoPeldano,
  cumplidoId: string
): OleadaPunto | null {
  const puntos = sortOleadaPuntos(readOleadaPuntos(pel));
  const following = puntos.filter(p => p.id !== cumplidoId && p.status !== "cumplido" && p.status !== "fallado");
  if (following.length > 0) return following[0] ?? null;
  return puntos.find(p => p.id !== cumplidoId) ?? null;
}

/**
 * Cumplir un punto de producción sella un peldaño (horas de ese foco si las
 * hay; si no, el paso cumplido). Si el punto es el timón, el pin pasa al siguiente.
 */
export async function updateOleadaPunto(
  userId: string,
  peldanoId: string,
  puntoId: string,
  patch: Partial<Pick<OleadaPunto, "titulo" | "status">>
): Promise<ProyectoPeldano | null> {
  const all = getLocalPeldanos(userId);
  const pel = all.find(p => p.id === peldanoId);
  if (!pel) return null;
  const now = Date.now();
  const pin = resolvePuntoProduccion(pel);
  const prevPunto = readOleadaPuntos(pel).find(p => p.id === puntoId);
  const becomingCumplido =
    patch.status === "cumplido" &&
    prevPunto != null &&
    prevPunto.status !== "cumplido";
  const fulfillingPin = Boolean(becomingCumplido && pin?.id === puntoId);

  if (becomingCumplido && prevPunto) {
    await spawnPeldanoDesdePunto(userId, pel, prevPunto);
  }

  const puntos = readOleadaPuntos(pel).map(p => {
    if (p.id !== puntoId) return p;
    return {
      ...p,
      ...(patch.titulo !== undefined ? { titulo: patch.titulo.trim() || p.titulo } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      updatedAt: now,
    };
  });

  if (!fulfillingPin) {
    return updatePeldano(userId, peldanoId, { oleadaPuntos: puntos });
  }

  const pelWithStatus = { ...pel, oleadaPuntos: puntos };
  const nextPin = nextPuntoTrasCumplir(pelWithStatus, puntoId);
  return updatePeldano(userId, peldanoId, {
    oleadaPuntos: puntos,
    puntoProduccionId: nextPin?.id ?? puntoId,
    timonEpisodio: nextPin
      ? crearTimonEpisodio(nextPin.id, nextPin.titulo)
      : crearTimonEpisodio(puntoId, pin?.titulo ?? pel.titulo),
  });
}

/** Borra un punto y renumerara la propuesta — sin castigo de cumplimiento. */
export async function deleteOleadaPunto(
  userId: string,
  peldanoId: string,
  puntoId: string
): Promise<ProyectoPeldano | null> {
  const all = getLocalPeldanos(userId);
  const pel = all.find(p => p.id === peldanoId);
  if (!pel) return null;
  const pin = resolvePuntoProduccion(pel);
  const deletingPin = pin?.id === puntoId;
  if (deletingPin) {
    await spawnPeldanoDesdeTimonEpisodio(userId, pel);
  }
  const next = renumberOleadaPuntos(readOleadaPuntos(pel).filter(p => p.id !== puntoId));
  const nextPinId = nextPuntoProduccionIdAfterDelete(pel, puntoId);
  const nextPunto = next.find(p => p.id === nextPinId);
  return updatePeldano(userId, peldanoId, {
    oleadaPuntos: next,
    puntoProduccionId: nextPinId,
    timonEpisodio: nextPunto
      ? crearTimonEpisodio(nextPunto.id, nextPunto.titulo)
      : undefined,
  });
}

/** Timón consciente: de aquí en adelante los envíos se amontonan en este punto. */
export async function setPuntoProduccion(
  userId: string,
  peldanoId: string,
  puntoId: string
): Promise<ProyectoPeldano | null> {
  const all = getLocalPeldanos(userId);
  const pel = all.find(p => p.id === peldanoId);
  if (!pel) return null;
  const punto = (pel.oleadaPuntos ?? []).find(x => x.id === puntoId);
  if (!punto) return pel;
  const samePin = pel.puntoProduccionId === puntoId;
  if (samePin && pel.timonEpisodio?.puntoId === puntoId) return pel;
  if (!samePin) {
    await spawnPeldanoDesdeTimonEpisodio(userId, pel);
  }
  return updatePeldano(userId, peldanoId, {
    puntoProduccionId: puntoId,
    timonEpisodio: crearTimonEpisodio(puntoId, punto.titulo),
  });
}

/** Mueve un punto arriba/abajo en el orden de producción propuesto. */
export async function reorderOleadaPunto(
  userId: string,
  peldanoId: string,
  puntoId: string,
  direction: "up" | "down"
): Promise<ProyectoPeldano | null> {
  const all = getLocalPeldanos(userId);
  const pel = all.find(p => p.id === peldanoId);
  if (!pel) return null;
  const puntos = readOleadaPuntos(pel);
  const idx = puntos.findIndex(p => p.id === puntoId);
  if (idx === -1) return pel;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= puntos.length) return pel;
  const copy = [...puntos];
  const tmp = copy[idx]!;
  copy[idx] = copy[swapIdx]!;
  copy[swapIdx] = tmp;
  return updatePeldano(userId, peldanoId, { oleadaPuntos: renumberOleadaPuntos(copy) });
}

/**
 * Sintonía suave: la producción escribe señal en el punto de oleada.
 * Si el vehículo trae oleadaPuntoId, toca ese; si no, el punto de producción.
 * Un cierre no conquista el punto: solo señala avance. El timón no caduca.
 * Nunca bloquea editar/borrar después.
 */
export async function sintonizarOleadaConProduccion(
  userId: string,
  opts: {
    proyectoId: string;
    peldanoId?: string;
    oleadaPuntoId?: string;
    vehicleId?: string;
    tipoOrigen: "tiempo" | "situacion";
    subStatuses?: string[];
    situacionResultados?: string[];
    vehicleStatus?: string;
  }
): Promise<ProyectoPeldano | null> {
  const peldanos = getPeldanosByProyectoLocal(userId, opts.proyectoId);
  const oleada = getOleadaEnCurso(peldanos);
  const targetId =
    opts.peldanoId && peldanos.some(p => p.id === opts.peldanoId && !p.origenSegmento)
      ? opts.peldanoId
      : oleada?.id;
  if (!targetId) return null;
  const pel = peldanos.find(p => p.id === targetId);
  if (!pel) return null;
  const puntos = readOleadaPuntos(pel);
  if (puntos.length === 0) return pel;

  const sugerido = capSintoniaDesdeProduccion(
    inferOleadaPuntoStatusFromProduccion({
      tipoOrigen: opts.tipoOrigen,
      subStatuses: opts.subStatuses,
      situacionResultados: opts.situacionResultados,
      vehicleStatus: opts.vehicleStatus,
    })
  );

  const target =
    (opts.oleadaPuntoId ? puntos.find(p => p.id === opts.oleadaPuntoId) : undefined) ??
    resolvePuntoProduccion(pel);
  if (!target) return pel;

  const next = puntos.map(p =>
    p.id === target.id ? sintonizarOleadaPunto(p, sugerido, opts.vehicleId) : p
  );
  return updatePeldano(userId, targetId, {
    oleadaPuntos: next,
    puntoProduccionId: pel.puntoProduccionId ?? target.id,
  });
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
  let minutosConquista = 0;
  for (const p of conquistados) {
    if (p.resumen?.profundidadMaxima) profundidad = maxBanda(profundidad, p.resumen.profundidadMaxima);
    if (peldanoSumaMinutosNorte(p)) minutosConquista += p.resumen?.duracionMin ?? 0;
  }
  const prev = getLocalProyectos(userId).find(p => p.id === proyectoId);
  const minutosNorte =
    minutosConquista + minutosFromSegundos(prev?.segundosNorteSituacion);
  await updateProyecto(userId, proyectoId, {
    peldanosConquistados: conquistados.length,
    profundidadMaxima: profundidad,
    minutosTotales: minutosNorte,
  });
}

const SITUACION_CREDIT_RING = 256;

function pushSituacionCreditKey(
  prev: string[] | undefined,
  key: string
): { next: string[]; isNew: boolean } {
  const id = key.trim();
  if (!id) return { next: prev ?? [], isNew: false };
  const cur = prev ?? [];
  if (cur.includes(id)) return { next: cur, isNew: false };
  const next = [...cur, id];
  if (next.length > SITUACION_CREDIT_RING) {
    return { next: next.slice(next.length - SITUACION_CREDIT_RING), isNew: true };
  }
  return { next, isNew: true };
}

/**
 * Sella la pared del vehículo en el proyecto. No escribe peldaños.
 * Lista rápida, interrupt e idle de desglosador entran aquí.
 * Idempotente por vid+apertura. Sombra — no ms0.
 */
export function acreditarGastoTiempoEnProyecto(
  userId: string,
  vehicle: Vehicle,
  opts?: { now?: number }
): Proyecto | null {
  if (!userId) return null;
  const sello = sealGastoTiempo(vehicle, opts?.now);
  if (!sello || !sello.pid) return null;

  const list = getLocalProyectos(userId);
  const idx = list.findIndex(p => p.id === sello.pid);
  if (idx === -1) return null;

  const prev = list[idx];
  const nextGasto = accrueGastoTiempo(prev.gastoTiempo, sello);
  const presenciaEpisodio =
    sello.dest === "presencia"
      ? hydratePresenciaEpisodio({
          episodio: prev.presenciaEpisodio,
          proyectoId: prev.id,
          vehicles: [...tryReadLocalVehicles(), vehicle],
          now: opts?.now,
        })
      : prev.presenciaEpisodio;
  if (nextGasto === prev.gastoTiempo && presenciaEpisodio === prev.presenciaEpisodio) {
    return prev;
  }

  const minutosPresencia = Math.round(nextGasto.secPresencia / 60);
  const at = opts?.now ?? sello.z;
  const updated: Proyecto = {
    ...prev,
    gastoTiempo: nextGasto,
    presenciaEpisodio,
    minutosPresencia,
    sesionesPresencia: nextGasto.n,
    primeraPresenciaAt:
      sello.dest === "presencia"
        ? prev.primeraPresenciaAt ?? at
        : prev.primeraPresenciaAt,
    primerNorteAt:
      sello.dest === "direccion" ? prev.primerNorteAt ?? at : prev.primerNorteAt,
    updatedAt: Date.now(),
  };
  list[idx] = updated;
  saveLocalProyectos(userId, list);
  void syncFirestoreProyecto(userId, updated);
  return updated;
}

/**
 * Peldaños situacionales no suman a MIN NORTE: esos minutos ya se acreditaron
 * clic a clic (segundosNorteSituacion). Evita doble conteo al cerrar el ring.
 */
export function peldanoSumaMinutosNorte(
  p: Pick<ProyectoPeldano, "estado" | "tipoOrigen">
): boolean {
  if (p.estado !== "conquistado") return false;
  return p.tipoOrigen !== "situacion";
}

/**
 * Acredita el tiempo de un clic situacional en la casilla del proyecto.
 * Local + firestore en sombra. Idempotente por fila. No recalcula bolsa.
 */
export function acreditarMinutosSituacionEnProyecto(
  userId: string,
  input: {
    vehicle: Pick<Vehicle, "id" | "proyectoId" | "destinoCierre">;
    sub: Pick<SubTarea, "id" | "proyectoId" | "duracionRealSec">;
    fuente: FuenteMinutosSituacion;
    at?: number;
  }
): Proyecto | null {
  const ruta = resolveRutaMinutosSituacion({
    vehicleId: input.vehicle.id,
    subId: input.sub.id,
    subProyectoId: input.sub.proyectoId,
    vehicleProyectoId: input.vehicle.proyectoId,
    destinoCierre: input.vehicle.destinoCierre,
    fuente: input.fuente,
    duracionRealSec: input.sub.duracionRealSec,
  });
  if (ruta.bucket === "none" || !ruta.proyectoId) return null;

  const list = getLocalProyectos(userId);
  const idx = list.findIndex(p => p.id === ruta.proyectoId);
  if (idx === -1) return null;

  const { next, isNew } = pushSituacionCreditKey(
    list[idx].situacionCreditKeys,
    ruta.creditKey
  );
  if (!isNew) return list[idx];

  const at = input.at ?? Date.now();
  const prev = list[idx];
  const segundos = Math.max(0, ruta.segundos);

  if (ruta.bucket === "norte") {
    const segundosNorte = (prev.segundosNorteSituacion ?? 0) + segundos;
    const updated: Proyecto = {
      ...prev,
      segundosNorteSituacion: segundosNorte,
      situacionCreditKeys: next,
      minutosTotales:
        (prev.minutosTotales ?? 0) -
        minutosFromSegundos(prev.segundosNorteSituacion) +
        minutosFromSegundos(segundosNorte),
      primerNorteAt: prev.primerNorteAt ?? at,
      updatedAt: Date.now(),
    };
    list[idx] = updated;
    saveLocalProyectos(userId, list);
    void syncFirestoreProyecto(userId, updated);
    return updated;
  }

  const segundosPresencia = (prev.segundosPresenciaRing ?? 0) + segundos;
  const updated: Proyecto = {
    ...prev,
    segundosPresenciaRing: segundosPresencia,
    situacionCreditKeys: next,
    updatedAt: Date.now(),
  };
  list[idx] = updated;
  saveLocalProyectos(userId, list);
  void syncFirestoreProyecto(userId, updated);
  return updated;
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
 * - Oleada activa / solo proyectoId / sombra de segmento → el vehículo
 *   se suma al timón en horas enumeradas. El peldaño nace al cambiar
 *   el punto de producción (clasificación del enfoque), no por cada envío.
 * - La sombra de segmento la sella además el cierre de puerta.
 * - Además: sintoniza el desglose de oleada (propuesta) con la señal de producción.
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
  const proyectoId = vehicle.proyectoId;
  const feedsHub = feedsProyectoHub(destino);
  const duracionMin = resolveDuracionMinCierre(vehicle, opts.duracionMin);
  const optsConDuracion = { ...opts, duracionMin };

  // Rendición: sello de pared siempre que haya proyecto. No ensucia escalera.
  if (proyectoId) {
    try {
      acreditarGastoTiempoEnProyecto(userId, {
        ...vehicle,
        destinoCierre: destino,
        duracionFinal: duracionMin || vehicle.duracionFinal,
      });
    } catch {
      /* sello no bloquea el cierre */
    }
  }

  const maybeSintonizarOleada = async () => {
    if (!proyectoId) return;
    // Presencia no ensucia escalera; solo sintoniza si el vehículo apunta a un punto.
    if (!feedsHub && !vehicle.oleadaPuntoId) return;
    const subs = opts.subs ?? vehicle.subVehiculos ?? [];
    const subTareas = opts.subTareas ?? vehicle.subTareas ?? [];
    await sintonizarOleadaConProduccion(userId, {
      proyectoId,
      peldanoId: vehicle.proyectoPeldanoId,
      oleadaPuntoId: vehicle.oleadaPuntoId,
      vehicleId: vehicle.id,
      tipoOrigen: opts.tipoOrigen,
      subStatuses: subs.map(s => s.status),
      situacionResultados: subTareas.map(
        st => st.resultadoSituacion ?? (st.completada ? "cumplido" : "pendiente")
      ),
      vehicleStatus: vehicle.status,
    });
  };

  if (!feedsHub) {
    await maybeSintonizarOleada();
    return;
  }

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
          { ...vehicle, duracionFinal: duracionMin || vehicle.duracionFinal },
          opts.subs ?? vehicle.subVehiculos ?? [],
          opts.psGanados
        );
      } else {
        await markPeldanoConquistadoSituacion(userId, vehicle, {
          duracionMin,
          psGanados: opts.psGanados,
          subTareas: opts.subTareas ?? vehicle.subTareas ?? [],
        });
      }
      return;
    }
  }

  const credited = await acreditarTimonAlCerrarVehiculo(userId, vehicle, {
    tipoOrigen: opts.tipoOrigen,
    duracionMin,
  });
  if (!credited) {
    await spawnConquistadoDesdeVehiculo(userId, vehicle, optsConDuracion);
  }
  await maybeSintonizarOleada();
}

function ensureTimonEpisodio(pel: ProyectoPeldano): TimonEpisodio {
  const pin = resolvePuntoProduccion(pel);
  const titulo = pin?.titulo?.trim() || pel.titulo;
  const puntoId = pin?.id ?? pel.puntoProduccionId ?? pel.id;
  if (pel.timonEpisodio && pel.timonEpisodio.puntoId === puntoId) {
    return pel.timonEpisodio.puntoTitulo === titulo
      ? pel.timonEpisodio
      : { ...pel.timonEpisodio, puntoTitulo: titulo };
  }
  return crearTimonEpisodio(puntoId, titulo);
}

/**
 * Suma el vehículo a las horas enumeradas del timón actual.
 * False = no hay oleada/pin o el envío es de otro punto (cae al legado).
 */
export async function acreditarTimonAlCerrarVehiculo(
  userId: string,
  vehicle: Pick<
    Vehicle,
    | "id"
    | "titulo"
    | "proyectoId"
    | "proyectoPeldanoId"
    | "oleadaPuntoId"
    | "aperturaAt"
    | "cierreAt"
    | "duracionFinal"
    | "status"
    | "tipoFlota"
  >,
  opts: { tipoOrigen: "tiempo" | "situacion"; duracionMin: number }
): Promise<boolean> {
  const proyectoId = vehicle.proyectoId;
  if (!proyectoId) return false;
  const peldanos = getPeldanosByProyectoLocal(userId, proyectoId);
  const oleada = getOleadaEnCurso(peldanos);
  const targetId =
    vehicle.proyectoPeldanoId &&
    peldanos.some(p => p.id === vehicle.proyectoPeldanoId && !p.origenSegmento)
      ? vehicle.proyectoPeldanoId
      : oleada?.id;
  if (!targetId) return false;
  const pel = peldanos.find(p => p.id === targetId);
  if (!pel || pel.origenSegmento) return false;
  const pin = resolvePuntoProduccion(pel);
  if (!pin) return false;
  const stamped = vehicle.oleadaPuntoId?.trim();
  if (stamped && stamped !== pin.id) return false;
  if (yaEstaEnTimon(pel.timonEpisodio, vehicle.id)) return true;

  const minutos = trabajoMinutosReales({
    ...vehicle,
    duracionFinal:
      opts.duracionMin > 0 ? opts.duracionMin : vehicle.duracionFinal,
  });
  if (minutos <= 0) return true;

  const next = accrueVehiculoAlTimon(ensureTimonEpisodio(pel), {
    vehicleId: vehicle.id,
    titulo: vehicle.titulo,
    minutos,
    tipoOrigen: opts.tipoOrigen,
  });
  await updatePeldano(userId, pel.id, { timonEpisodio: next });
  return true;
}

/**
 * Peldaño = estancia ya caminada en un punto de producción.
 * Las horas 1..N de ese timón quedan clasificadas en la escalera.
 */
function tryReadLocalVehicles(): Vehicle[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const data = localStorage.getItem("sistemicar_vehicles");
    if (!data) return [];
    const parsed = JSON.parse(data) as Vehicle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hydrateOleadaTimonVivo(pel: ProyectoPeldano): ProyectoPeldano {
  const pin = resolvePuntoProduccion(pel);
  if (!pin) return pel;
  const vehicles = tryReadLocalVehicles();
  const timonEpisodio = hydrateTimonEpisodio({
    episodio: pel.timonEpisodio,
    puntoId: pin.id,
    puntoTitulo: pin.titulo,
    proyectoId: pel.proyectoId,
    oleadaId: pel.id,
    vehicles,
  });
  return { ...pel, timonEpisodio };
}

function yaHayPeldanoDePunto(
  existing: ProyectoPeldano[],
  puntoId: string,
  episodioId?: string
): boolean {
  return existing.some(p => {
    if (p.estado !== "conquistado") return false;
    if (p.resumen?.timon?.puntoId === puntoId) return true;
    if (episodioId && p.vehicleId === `timon:${episodioId}`) return true;
    return false;
  });
}

async function spawnPeldanoDesdePunto(
  userId: string,
  oleada: ProyectoPeldano,
  punto: OleadaPunto
): Promise<void> {
  const pin = resolvePuntoProduccion(oleada);
  if (pin?.id === punto.id) {
    await spawnPeldanoDesdeTimonEpisodio(userId, oleada, { allowEmpty: true });
    return;
  }
  const vehicles = tryReadLocalVehicles();
  const episodio = hydrateTimonEpisodio({
    episodio: null,
    puntoId: punto.id,
    puntoTitulo: punto.titulo,
    proyectoId: oleada.proyectoId,
    oleadaId: oleada.id,
    vehicles,
  });
  await spawnPeldanoDesdeEpisodio(userId, oleada, episodio, { allowEmpty: true });
}

async function spawnPeldanoDesdeTimonEpisodio(
  userId: string,
  oleada: ProyectoPeldano,
  opts?: { allowEmpty?: boolean }
): Promise<void> {
  const vivo = hydrateOleadaTimonVivo(oleada);
  if (!vivo.timonEpisodio) return;
  await spawnPeldanoDesdeEpisodio(userId, oleada, vivo.timonEpisodio, opts);
}

async function spawnPeldanoDesdeEpisodio(
  userId: string,
  oleada: ProyectoPeldano,
  episodio: TimonEpisodio,
  opts?: { allowEmpty?: boolean }
): Promise<void> {
  if (!opts?.allowEmpty && episodioTimonVacio(episodio)) return;

  const existing = getPeldanosByProyectoLocal(userId, oleada.proyectoId);
  if (yaHayPeldanoDePunto(existing, episodio.puntoId, episodio.id)) return;

  const resumenTimon = resumenTimonDesdeEpisodio(episodio);
  const horaCount = resumenTimon.horas;
  const tieneTiempo = episodio.minutosTiempo > 0;
  const tipoOrigen: "tiempo" | "situacion" = tieneTiempo ? "tiempo" : "situacion";
  const duracionMin = tieneTiempo
    ? episodio.minutosTiempo
    : episodio.minutosAcumulados;
  const ahora = Date.now();
  const maxOrden = existing.reduce((m, p) => Math.max(m, p.orden), -1);
  const horaLabel =
    horaCount <= 0
      ? "paso cumplido"
      : horaCount === 1
        ? "1 hora"
        : `${horaCount} horas`;
  const stampId = `timon:${episodio.id}`;

  const peldano: ProyectoPeldano = {
    id: `pel_timon_${ahora}_${Math.random().toString(36).slice(2, 6)}`,
    proyectoId: oleada.proyectoId,
    orden: maxOrden + 1,
    titulo: episodio.puntoTitulo,
    estado: "conquistado",
    tipoOrigen,
    vehicleId: stampId,
    cerradoAt: ahora,
    resumen: {
      duracionMin,
      subsCumplidos: episodio.vehiculos.length,
      subsTotal: episodio.vehiculos.length,
      segmentoResumen: {
        rutaMentalLabel: `${horaLabel} · timón`,
        vehiculosCerrados: episodio.vehiculos.length,
      },
      subResumen: episodio.vehiculos.map(v => ({
        titulo:
          v.horaInicio === v.horaFin
            ? `Hora ${v.horaInicio} · ${v.titulo}`
            : `Hora ${v.horaInicio}–${v.horaFin} · ${v.titulo}`,
        status: "cumplido" as const,
        duracionMin: v.minutos,
      })),
      timon: resumenTimon,
    },
    createdAt: ahora,
    updatedAt: ahora,
  };
  const all = getLocalPeldanos(userId);
  all.push(peldano);
  saveLocalPeldanos(userId, all);
  void syncFirestorePeldano(userId, peldano);
  await refreshProyectoStats(userId, oleada.proyectoId);
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
  const duracionMin = resolveDuracionMinCierre(vehicle, opts.duracionMin);
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
  const archivadas = peldanos.filter(p => p.estado === "archivada" && !p.origenSegmento);
  let minutos = 0;
  let profundidad: FocusBandId = "fluido";
  for (const p of conquistados) {
    if (peldanoSumaMinutosNorte(p)) minutos += p.resumen?.duracionMin ?? 0;
    if (p.resumen?.profundidadMaxima) profundidad = maxBanda(profundidad, p.resumen.profundidadMaxima);
  }
  return {
    conquistados: conquistados.length,
    ideas: ideas.length,
    archivadas: archivadas.length,
    minutosTotales: minutos,
    profundidadMaxima: profundidad,
    ultimoConquistado: [...conquistados].sort((a, b) => (b.cerradoAt ?? 0) - (a.cerradoAt ?? 0))[0] ?? null,
  };
}

/** Minutos de origen tiempo aún vivos en el timón (aún no sellados a peldaño). */
export function minutosTiempoTimonVivo(peldanos: ProyectoPeldano[]): number {
  const oleada = getOleadaEnCurso(peldanos);
  return Math.max(0, oleada?.timonEpisodio?.minutosTiempo ?? 0);
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
  launch: "desglosador_tiempo" | "desglosador_situacion",
  oleadaPuntoId?: string | null
): string {
  const q = new URLSearchParams({ proyectoId, peldanoId, launch });
  if (oleadaPuntoId?.trim()) q.set("oleadaPuntoId", oleadaPuntoId.trim());
  return `/jornada-v4?${q.toString()}`;
}
