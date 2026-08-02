import type { SegmentoV5, SubTarea, Vehicle } from "./persistence";
import {
  getPeldanosByProyecto,
  getPeldanosByProyectoLocal,
  getProyectoById,
  updatePeldano,
  upsertPeldanoDesdeSegmento,
  refreshProyectoStatsPublic,
  buildSubTareasResumenFromVehicle,
  type ProyectoPeldanoResumen,
  type RutasMentalesSet,
} from "./proyectos";
import { buildTranscriptFromVehicles, filterDecisionsForProyecto } from "./ringDecisionTranscript";
import {
  buildDefaultClaridadDireccion,
  refreshClaridadPaso1,
  resolveClaridadParaProyecto,
} from "./claridadDireccion";
import { inferFaseAtencional, computeResistenciaDia } from "./termodinamicaAtencional";
import type { FocusBandEvent } from "./focusBandLedger";

export type { RutasMentalesSet, RutaMental, RutaMentalId, RutaMentalPaso } from "./proyectos";

export {
  buildDefaultClaridadDireccion,
  buildDefaultRutasMentales,
  refreshClaridadPaso1,
  refreshRutasTituloBase,
  resolveClaridadParaProyecto,
} from "./claridadDireccion";

/** Resuelve claridad desde el Hub y opcionalmente ajusta paso 1 al nombre del bloque. */
export async function resolveClaridadParaSegmentoVinculado(
  userId: string,
  proyectoId: string,
  segmentoNombre: string
): Promise<RutasMentalesSet | undefined> {
  const [proyecto, peldanos] = await Promise.all([
    getProyectoById(userId, proyectoId),
    getPeldanosByProyecto(userId, proyectoId),
  ]);
  return resolveClaridadParaProyecto(proyecto ?? undefined, peldanos, segmentoNombre);
}

export async function ensurePeldanoFromSegmento(
  userId: string,
  params: {
    proyectoId: string;
    segmento: Pick<SegmentoV5, "id" | "nombre" | "horaInicio" | "horaFin">;
    planillaFecha: string;
    rutasMentales: RutasMentalesSet;
  }
): Promise<{ peldanoId: string }> {
  const peldano = await upsertPeldanoDesdeSegmento(userId, {
    proyectoId: params.proyectoId,
    segmentoId: params.segmento.id,
    planillaFecha: params.planillaFecha,
    titulo: params.segmento.nombre,
    horaInicio: params.segmento.horaInicio,
    horaFin: params.segmento.horaFin,
    rutasMentales: params.rutasMentales,
  });
  return { peldanoId: peldano.id };
}

function vehiclesForSegment(vehicles: Vehicle[], segmentoId: string): Vehicle[] {
  return vehicles.filter(v => v.segmentoId === segmentoId);
}

function buildResumenFromSegment(
  vehicles: Vehicle[],
  rutasMentales?: RutasMentalesSet,
  fase?: string,
  proyectoId?: string
): ProyectoPeldanoResumen {
  let duracionMin = 0;
  let psGanados = 0;
  let subsCumplidos = 0;
  let subsTotal = 0;
  const subResumen: NonNullable<ProyectoPeldanoResumen["subResumen"]> = [];
  const subTareasAll: SubTarea[] = [];

  for (const v of vehicles) {
    duracionMin += v.duracionFinal ?? 0;
    if (v.tipoReloj === "desglosador" && v.subVehiculos?.length) {
      for (const sv of v.subVehiculos) {
        if (sv.status !== "cumplido" && sv.status !== "fallado") continue;
        subsTotal++;
        if (sv.status === "cumplido") subsCumplidos++;
        subResumen.push({
          titulo: sv.titulo,
          status: sv.status as "cumplido" | "fallado",
          duracionMin: sv.duracionFinal != null ? Math.round(sv.duracionFinal / 60) : undefined,
        });
        psGanados += sv.psOtorgados ?? 0;
      }
    }
    if (v.tipoFlota === "situacion" && v.subTareas?.length) {
      subTareasAll.push(...v.subTareas);
      const cronometradas = v.subTareas.filter(st => st.enDesgloseCronometro);
      for (const st of cronometradas) {
        if (st.resultadoSituacion !== "cumplido" && st.resultadoSituacion !== "fallado") continue;
        subsTotal++;
        if (st.resultadoSituacion === "cumplido") subsCumplidos++;
      }
    }
  }

  const transcriptAll = buildTranscriptFromVehicles(vehicles);
  const decisionesEnumeradas = proyectoId
    ? filterDecisionsForProyecto(transcriptAll, proyectoId)
    : transcriptAll;
  const subTareasResumen =
    subTareasAll.length > 0 ? buildSubTareasResumenFromVehicle(subTareasAll) : undefined;

  const rutaActiva = rutasMentales?.rutas[rutasMentales.rutaActiva]?.label;

  return {
    subsCumplidos,
    subsTotal,
    duracionMin,
    psGanados,
    subResumen: subResumen.length ? subResumen : undefined,
    subTareasResumen,
    decisionesEnumeradas: decisionesEnumeradas.length ? decisionesEnumeradas : undefined,
    totalDecisiones: decisionesEnumeradas.length || undefined,
    segmentoResumen: {
      rutaMentalActiva: rutasMentales?.rutaActiva,
      rutaMentalLabel: rutaActiva,
      faseAtencional: fase,
      vehiculosCerrados: vehicles.filter(v => v.status === "cumplido").length,
    },
  };
}

export async function sealPeldanosFromSegmentos(
  userId: string,
  params: {
    fecha: string;
    segmentos: SegmentoV5[];
    vehicles: Vehicle[];
    dayStartMs: number;
    events?: FocusBandEvent[];
  }
): Promise<{ sealed: number; peldanoIds: string[] }> {
  const { segmentos, vehicles, dayStartMs, events = [] } = params;
  const peldanoIds: string[] = [];
  let sealed = 0;

  const resistencia = computeResistenciaDia(vehicles, dayStartMs, events);
  const fase = inferFaseAtencional(resistencia);

  for (const seg of segmentos) {
    if (!seg.proyectoVinculadoId || !seg.proyectoPeldanoId) continue;
    if (seg.estado !== "cerrado_manual") continue;

    const peldano = getPeldanosByProyectoLocal(userId, seg.proyectoVinculadoId).find(
      p => p.id === seg.proyectoPeldanoId
    );
    if (peldano?.estado === "conquistado") continue;

    const segVehicles = vehiclesForSegment(vehicles, seg.id);
    const resumen = buildResumenFromSegment(
      segVehicles,
      seg.rutasMentales,
      fase,
      seg.proyectoVinculadoId
    );

    await updatePeldano(userId, seg.proyectoPeldanoId, {
      estado: "conquistado",
      cerradoAt: seg.cerradoAt ?? Date.now(),
      tipoOrigen: "tiempo",
      rutasMentales: seg.rutasMentales,
      resumen,
    });

    void refreshProyectoStatsPublic(userId, seg.proyectoVinculadoId);
    peldanoIds.push(seg.proyectoPeldanoId);
    sealed++;
  }

  return { sealed, peldanoIds };
}

export function countSegmentosListosParaSellar(segmentos: SegmentoV5[]): number {
  return segmentos.filter(
    s => s.proyectoVinculadoId && s.proyectoPeldanoId && s.estado === "cerrado_manual"
  ).length;
}
