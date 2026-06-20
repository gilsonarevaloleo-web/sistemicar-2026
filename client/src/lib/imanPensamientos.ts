import type { ProyectoEtiqueta } from "./claridadDireccion";
import type { SubTarea, Vehicle } from "./persistence";
import { registrarPasoEjecutadoEnProyecto } from "./proyectos";
import { enumerateRingDecisions, rawDecisionFromSubTarea, type DecisionStatus } from "./ringDecisionTranscript";
import {
  addSituacionReserva,
  markImanReservaEjecutada,
  reactivarReservaImanDesdeSub,
  type NuevaSituacionReserva,
  type SituacionReservaItem,
} from "./situacionReserva";

/** Pensamientos sin proyecto asignado — aterrizar después. */
export const NIDO_INBOX_ID = "__inbox__";

export const CRISOL_TITLE = "El Crisol";
export const CRISOL_TITLE_LONG = "El Crisol de Pensamientos";
export const CRISOL_MOS_LABEL = "Matriz de Ordenamiento Situacional";
export const CRISOL_MOS_HINT =
  "MOS · S = situación · E = ejecución · M = tener en cuenta · Ordena antes del Ring y del Taller.";
export const CRISOL_TAGLINE =
  "Ordena pensamientos en nidos y rutas antes de sellarlos en tiempo.";

/** @deprecated Usa CRISOL_TITLE */
export const IMAN_PENSAMIENTOS_TITLE = CRISOL_TITLE;
/** @deprecated Usa CRISOL_TAGLINE */
export const IMAN_PENSAMIENTOS_TAGLINE = CRISOL_TAGLINE;
export const NIDO_INBOX_LABEL = "Aterrizaje pendiente";

export type ImanNidoKey = string;

export interface ImanNidoGrupo {
  nidoId: ImanNidoKey;
  titulo: string;
  etiqueta?: ProyectoEtiqueta;
  color?: string;
  items: SituacionReservaItem[];
}

export interface ImanProyectoOpcion {
  id: string;
  titulo: string;
  etiqueta: ProyectoEtiqueta;
  color?: string;
}

export function nidoKeyFromReserva(item: SituacionReservaItem): ImanNidoKey {
  return item.proyectoId?.trim() || NIDO_INBOX_ID;
}

export function agruparImanPorNido(
  items: SituacionReservaItem[],
  proyectos: ImanProyectoOpcion[]
): ImanNidoGrupo[] {
  const byNido = new Map<ImanNidoKey, SituacionReservaItem[]>();
  for (const item of items) {
    const key = nidoKeyFromReserva(item);
    const list = byNido.get(key) ?? [];
    list.push(item);
    byNido.set(key, list);
  }

  const proyectosById = new Map(proyectos.map(p => [p.id, p]));
  const grupos: ImanNidoGrupo[] = [];

  for (const p of proyectos) {
    const list = byNido.get(p.id);
    if (!list?.length) continue;
    grupos.push({
      nidoId: p.id,
      titulo: p.titulo,
      etiqueta: p.etiqueta,
      color: p.color,
      items: list.sort((a, b) => b.reservadaAt - a.reservadaAt),
    });
    byNido.delete(p.id);
  }

  const inbox = byNido.get(NIDO_INBOX_ID);
  if (inbox?.length) {
    grupos.push({
      nidoId: NIDO_INBOX_ID,
      titulo: NIDO_INBOX_LABEL,
      items: inbox.sort((a, b) => b.reservadaAt - a.reservadaAt),
    });
  }

  for (const [nidoId, list] of Array.from(byNido.entries())) {
    if (!list.length) continue;
    const p = proyectosById.get(nidoId);
    grupos.push({
      nidoId,
      titulo: p?.titulo ?? "Proyecto",
      etiqueta: p?.etiqueta,
      color: p?.color,
      items: list.sort((a: SituacionReservaItem, b: SituacionReservaItem) => b.reservadaAt - a.reservadaAt),
    });
  }

  return grupos.sort((a, b) => {
    if (a.nidoId === NIDO_INBOX_ID) return 1;
    if (b.nidoId === NIDO_INBOX_ID) return -1;
    return b.items.length - a.items.length;
  });
}

/** Items del nido listos para el desglosador (excluye solo consideración). */
export function imanItemsParaDesglosador(items: SituacionReservaItem[]): SituacionReservaItem[] {
  return items.filter(i => (i.ruta ?? "ejecucion") !== "consideracion");
}

/** Pensamiento que puede volver al vehículo situacional (ruta S o E). */
export function reservaEsEnviabeASituacion(item: SituacionReservaItem): boolean {
  return (item.ruta ?? "ejecucion") !== "consideracion";
}

export function subTareaFromImanItem(item: SituacionReservaItem, idSuffix?: string): SubTarea {
  const suffix = idSuffix ?? `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id: `st_${suffix}`,
    texto: item.texto,
    completada: false,
    creadaAt: Date.now(),
    ...(item.proyectoId ? { proyectoId: item.proyectoId } : {}),
    ...(item.id ? { origenImanId: item.id } : {}),
    ...(item.rutaSeguimientoPaso ? { rutaSeguimientoPaso: item.rutaSeguimientoPaso } : {}),
    ...(item.minutosCupo != null && item.minutosCupo > 0 ? { minutosCupo: item.minutosCupo } : {}),
    ...(item.detalles?.length
      ? {
          detalles: item.detalles.map(d => ({
            ...d,
            id: `dt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          })),
        }
      : {}),
  };
}

/** Al cumplir sub con proyecto: incrementa correlativo y marca la reserva del Crisol (MOS). */
export async function registrarPasoDesdeSubIman(
  userId: string,
  sub: Pick<SubTarea, "proyectoId" | "origenImanId" | "texto" | "id">,
  opts?: {
    vehicle?: Pick<Vehicle, "id" | "titulo" | "proyectoId">;
    status?: DecisionStatus;
    ts?: number;
  }
): Promise<number | null> {
  if (!sub.proyectoId?.trim()) return null;
  const status = opts?.status ?? "cumplido";
  const ts = opts?.ts ?? Date.now();
  const vehicle = opts?.vehicle ?? { id: "unknown", titulo: "" };
  const raw = rawDecisionFromSubTarea(
    { ...vehicle, proyectoId: sub.proyectoId },
    { ...sub, completada: status === "cumplido", enDesgloseCronometro: true, resultadoSituacion: status } as SubTarea,
    status,
    ts
  );
  const [enumerated] = enumerateRingDecisions([raw]);
  const result = await registrarPasoEjecutadoEnProyecto(
    userId,
    sub.proyectoId,
    enumerated ? { ...enumerated, pasoEjecutadoNumero: undefined } : undefined
  );
  if (!result) return null;
  if (sub.origenImanId) {
    await markImanReservaEjecutada(userId, sub.origenImanId, result.pasoNumero);
  }
  return result.pasoNumero;
}

export function subTareaConPasoEjecutado(subTareas: SubTarea[], subTareaId: string, pasoNumero: number): SubTarea[] {
  return subTareas.map(st => (st.id === subTareaId ? { ...st, pasoEjecutadoNumero: pasoNumero } : st));
}

/** Proyecto más frecuente entre subtareas (nido dominante del bloque). */
export function dominanteProyectoIdEnSubs(subs: SubTarea[]): string | undefined {
  const counts = new Map<string, number>();
  for (const st of subs) {
    const id = st.proyectoId?.trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestN = 0;
  for (const [id, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = id;
    }
  }
  return best;
}

/** Cascada: nido del bloque → cola cron → vehículo → segmento vinculado. */
export function resolveProyectoIdEnfoqueSituacion(
  vehicle: Pick<Vehicle, "proyectoId" | "subTareas" | "situacionCronometro">,
  segmentoProyectoId?: string
): string | undefined {
  const enfoque = vehicle.situacionCronometro?.proyectoEnfoqueId?.trim();
  if (enfoque) return enfoque;

  const cronSubs = (vehicle.subTareas ?? []).filter(st => st.enDesgloseCronometro);
  const fromCron = dominanteProyectoIdEnSubs(cronSubs);
  if (fromCron) return fromCron;

  const fromAll = dominanteProyectoIdEnSubs(vehicle.subTareas ?? []);
  if (fromAll) return fromAll;

  if (vehicle.proyectoId?.trim()) return vehicle.proyectoId.trim();
  if (segmentoProyectoId?.trim()) return segmentoProyectoId.trim();
  return undefined;
}

export function aplicarProyectoHeredadoASub(
  sub: SubTarea,
  proyectoId: string | undefined
): SubTarea {
  if (!proyectoId?.trim() || sub.proyectoId?.trim()) return sub;
  return { ...sub, proyectoId: proyectoId.trim() };
}

/** Metadatos de proyecto para volcar una sub al Crisol (reserva ruta S). */
export function buildReservaPayloadDesdeSubRing(
  sub: SubTarea,
  vehicle: Pick<Vehicle, "id" | "titulo" | "proyectoId" | "subTareas" | "situacionCronometro">,
  opts: {
    segmentoProyectoId?: string;
    proyectos: Array<{ id: string; titulo: string; etiqueta: ProyectoEtiqueta }>;
    segmento?: { id: string; nombre: string };
  }
): NuevaSituacionReserva {
  return {
    texto: sub.texto,
    ruta: "situacion_desglosador",
    origenVehiculoTitulo: vehicle.titulo,
    origenVehiculoId: vehicle.id,
    ...(sub.minutosCupo != null && sub.minutosCupo > 0 ? { minutosCupo: sub.minutosCupo } : {}),
    ...(sub.detalles?.length ? { detalles: sub.detalles } : {}),
    ...proyectoMetaParaReservaDesdeSub(sub, vehicle, opts.segmentoProyectoId, opts.proyectos),
    ...(sub.rutaSeguimientoPaso ? { rutaSeguimientoPaso: sub.rutaSeguimientoPaso } : {}),
    ...(opts.segmento
      ? { segmentoId: opts.segmento.id, segmentoNombre: opts.segmento.nombre }
      : {}),
  };
}

/** Auto-cierre del ring: devuelve filas pendientes al Crisol (reactiva o crea reserva). */
export async function devolverRingPendientesAlIman(
  userId: string,
  vehicle: Pick<Vehicle, "id" | "titulo" | "proyectoId" | "subTareas" | "situacionCronometro">,
  pendingSubs: SubTarea[],
  opts: {
    segmentoProyectoId?: string;
    proyectos: Array<{ id: string; titulo: string; etiqueta: ProyectoEtiqueta }>;
    segmento?: { id: string; nombre: string };
  }
): Promise<{ quitadosIds: string[]; devueltos: number }> {
  const quitadosIds: string[] = [];
  let devueltos = 0;
  const seenIman = new Set<string>();
  const seenTexto = new Set<string>();

  for (const sub of pendingSubs) {
    const textoKey = sub.texto.trim().toLowerCase();
    if (sub.origenImanId) {
      if (seenIman.has(sub.origenImanId)) {
        quitadosIds.push(sub.id);
        devueltos++;
        continue;
      }
      seenIman.add(sub.origenImanId);
    } else if (seenTexto.has(textoKey)) {
      quitadosIds.push(sub.id);
      devueltos++;
      continue;
    } else {
      seenTexto.add(textoKey);
    }

    const proyectoMeta = proyectoMetaParaReservaDesdeSub(
      sub,
      vehicle,
      opts.segmentoProyectoId,
      opts.proyectos
    );

    if (sub.origenImanId) {
      const ok = await reactivarReservaImanDesdeSub(userId, sub.origenImanId, {
        texto: sub.texto,
        ...(sub.minutosCupo != null && sub.minutosCupo > 0 ? { minutosCupo: sub.minutosCupo } : {}),
        ...(sub.detalles?.length ? { detalles: sub.detalles } : {}),
        ...(sub.rutaSeguimientoPaso ? { rutaSeguimientoPaso: sub.rutaSeguimientoPaso } : {}),
        ...proyectoMeta,
      });
      if (ok) {
        quitadosIds.push(sub.id);
        devueltos++;
      }
      continue;
    }

    const { localSaved } = await addSituacionReserva(
      userId,
      buildReservaPayloadDesdeSubRing(sub, vehicle, opts)
    );
    if (localSaved) {
      quitadosIds.push(sub.id);
      devueltos++;
    }
  }

  return { quitadosIds, devueltos };
}

export function proyectoMetaParaReservaDesdeSub(
  sub: Pick<SubTarea, "proyectoId">,
  vehicle: Pick<Vehicle, "proyectoId" | "subTareas" | "situacionCronometro">,
  segmentoProyectoId: string | undefined,
  proyectos: Array<{ id: string; titulo: string; etiqueta: ProyectoEtiqueta }>
): Pick<SituacionReservaItem, "proyectoId" | "proyectoTitulo" | "proyectoEtiqueta"> {
  const id =
    sub.proyectoId?.trim() ?? resolveProyectoIdEnfoqueSituacion(vehicle, segmentoProyectoId);
  if (!id) return {};
  const proy = proyectos.find(p => p.id === id);
  return {
    proyectoId: id,
    ...(proy ? { proyectoTitulo: proy.titulo, proyectoEtiqueta: proy.etiqueta } : {}),
  };
}
