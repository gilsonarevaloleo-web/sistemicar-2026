import { construirSelloOperador, type SelloOperadorDraft } from "@shared/selloOperador";
import { calcularBalanceConquistaJornada } from "@/engines/ConcienciaEngine";
import { filterVehiclesForAnilloCoverage } from "@/lib/ghostVehicleEngine";
import {
  type CierreJornadaLog,
  type SegmentoV5,
  type Vehicle,
  saveCierreJornada,
} from "@/lib/persistence";
import { conteoRecintosDelDia } from "@/lib/recintoMinimoStore";
import { getJournalDateString } from "@/lib/segmentTime";

export function buildSelloDraft(params: {
  userId: string;
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  totalPS: number;
  nowMs?: number;
}): SelloOperadorDraft {
  const nowMs = params.nowMs ?? Date.now();
  const fecha = getJournalDateString(nowMs);
  const vehiculos = filterVehiclesForAnilloCoverage(params.vehicles, nowMs);
  const balance = calcularBalanceConquistaJornada({
    segmentos: params.segmentos,
    vehiculos,
    now: nowMs,
  });
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
    conquistaMin: balance.conquistaMin,
    entropiaMin: balance.entropiaMin,
    vacioMin: balance.vacioMin,
    jornadaPlanMin: balance.jornadaMin,
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
}): Promise<CierreJornadaLog> {
  const draft = buildSelloDraft(params);
  const log = draftToCierreLog(draft);
  await saveCierreJornada(params.userId, log);
  return log;
}
