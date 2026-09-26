import { construirSelloOperador, type SelloOperadorDraft } from "@shared/selloOperador";
import {
  adjuntarApunteAlCierre,
  type JornadaApunteCierre,
} from "@shared/jornadaApunte";
import {
  buildConcienciaTriadaFromVehicles,
  type ConcienciaTriadaModel,
} from "@/lib/concienciaTriadaOperador";
import { huecosLogToIntervals } from "@/lib/gastoConcienciaEngine";
import { filterVehiclesForAnilloCoverage } from "@/lib/ghostVehicleEngine";
import { selloTiempoDesdeTriada } from "@/lib/selloTiempoTriada";
import {
  type CierreJornadaLog,
  type SegmentoV5,
  type Vehicle,
  saveCierreJornada,
} from "@/lib/persistence";
import { conteoRecintosDelDia } from "@/lib/recintoMinimoStore";
import { getJournalDateString } from "@/lib/segmentTime";
import { buildMetricaHuecoIntervals } from "@/jornada4/coberturaHuecosLog";
import type { MsInterval } from "@/lib/concienciaTriadaLinea";

export { selloTiempoDesdeTriada } from "@/lib/selloTiempoTriada";

function resolveSelloTriada(params: {
  fecha: string;
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  nowMs: number;
  triada?: ConcienciaTriadaModel;
  huecosLog?: MsInterval[];
}): ConcienciaTriadaModel {
  if (params.triada) return params.triada;
  const huecosLog =
    params.huecosLog ??
    huecosLogToIntervals(
      buildMetricaHuecoIntervals({ vehicles: params.vehicles, now: params.nowMs })
    );
  return buildConcienciaTriadaFromVehicles({
    fecha: params.fecha,
    segmentos: params.segmentos,
    vehicles: params.vehicles,
    now: params.nowMs,
    huecosLog,
  });
}

export function buildSelloDraft(params: {
  userId: string;
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  totalPS: number;
  nowMs?: number;
  /** Misma tríada que Cobertura del día — si falta, se calcula igual. */
  triada?: ConcienciaTriadaModel;
  huecosLog?: MsInterval[];
}): SelloOperadorDraft {
  const nowMs = params.nowMs ?? Date.now();
  const fecha = getJournalDateString(nowMs);
  const triada = resolveSelloTriada({
    fecha,
    segmentos: params.segmentos,
    vehicles: params.vehicles,
    nowMs,
    triada: params.triada,
    huecosLog: params.huecosLog,
  });
  const tiempo = selloTiempoDesdeTriada(triada);
  const vehiculos = filterVehiclesForAnilloCoverage(params.vehicles, nowMs);
  const delDia = vehiculos.filter((v) => {
    const at = v.cierreAt ?? v.aperturaAt ?? 0;
    return !at || getJournalDateString(at) === fecha || v.status === "activo";
  });
  const recintos = conteoRecintosDelDia(fecha, nowMs);
  return construirSelloOperador({
    fecha,
    nowMs,
    userId: params.userId,
    totalPS: params.totalPS,
    ...tiempo,
    segmentosTotales: params.segmentos.length,
    segmentosCerradosManual: params.segmentos.filter((s) => s.estado === "cerrado_manual").length,
    segmentosEntropia: params.segmentos.filter((s) => s.estado === "entropia").length,
    vehiculosCerradosManual: delDia.filter(
      (v) => v.status !== "activo" && v.cierreManual !== false && v.cierreAt,
    ).length,
    vehiculosCerradosSistema: delDia.filter(
      (v) => v.status !== "activo" && v.cierreManual === false,
    ).length,
    vehiculosActivos: delDia.filter((v) => v.status === "activo").length,
    recintosCerrados: recintos.cerrados,
    recintosHeredados: recintos.heredados,
    recintosAbiertos: recintos.abiertos,
  });
}

export function draftToCierreLog(draft: SelloOperadorDraft): CierreJornadaLog {
  return {
    id: `sello_${draft.fecha}_${draft.userId}`,
    fecha: draft.fecha,
    totalPS: draft.totalPS,
    porcentajeSoberania: 0,
    segmentosCerradosManual: draft.segmentosCerradosManual,
    segmentosTotales: draft.segmentosTotales,
    energiaOscuraEntries: [],
    energiaOscuraTotal: 0,
    energiaRecuperada: 0,
    fugasVoltaje: 0,
    selloEmitido: true,
    bloqueadoNocturno: false,
    timestamp: draft.timestamp,
    cierreAt: draft.timestamp,
    conquistaMin: draft.conquistaMin,
    entropiaMin: draft.entropiaMin,
    vacioMin: draft.vacioMin,
    jornadaPlanMin: draft.jornadaPlanMin,
    minutosPresencia: draft.minutosPresencia,
    minutosDireccion: draft.minutosDireccion,
    minutosNoConquistado: draft.minutosNoConquistado,
    coberturaPct: draft.coberturaPct,
    selloTexto: draft.tension,
    selladoPor: "operador",
    tension: draft.tension,
    evidenciaHechos: draft.evidenciaHechos,
    mandato: draft.mandato,
    recintosCerrados: draft.recintosCerrados,
    recintosHeredados: draft.recintosHeredados,
    recintosAbiertos: draft.recintosAbiertos,
    vehiculosCerradosManual: draft.vehiculosCerradosManual,
    vehiculosCerradosSistema: draft.vehiculosCerradosSistema,
  };
}

export async function emitirSelloOperador(params: {
  userId: string;
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  totalPS: number;
  nowMs?: number;
  cierre: JornadaApunteCierre;
  triada?: ConcienciaTriadaModel;
  huecosLog?: MsInterval[];
}): Promise<CierreJornadaLog> {
  const draft = buildSelloDraft(params);
  const log = adjuntarApunteAlCierre(draftToCierreLog(draft), params.cierre);
  await saveCierreJornada(params.userId, log);
  return log;
}
