import type { DecisionKind } from "./decisionesLedger";
import {
  decisionKeyMision,
  decisionKeySubDesglosador,
  decisionKeySubSituacion,
} from "./decisionesLedger";
import { isInvisibleCentinelaVehicle } from "./centinelaEngine";
import type { ProyectoDecisionEnumerada } from "./proyectos";
import type { SubTarea, SubVehiculo, Vehicle } from "./persistence";

export type DecisionStatus = "cumplido" | "fallado" | "avance";

export interface RawRingDecision {
  key: string;
  texto: string;
  kind: DecisionKind;
  status: DecisionStatus;
  ts: number;
  pasoEjecutadoNumero?: number;
  proyectoId?: string;
  vehicleId: string;
  vehicleTitulo?: string;
  subId?: string;
  origenImanId?: string;
}

function situacionSubEjecutada(st: SubTarea): boolean {
  if (st.enDesgloseCronometro) {
    return (
      st.resultadoSituacion === "cumplido" ||
      st.resultadoSituacion === "fallado" ||
      st.resultadoSituacion === "avance"
    );
  }
  return st.completada === true;
}

function situacionSubStatus(st: SubTarea): DecisionStatus {
  if (st.enDesgloseCronometro) {
    if (st.resultadoSituacion === "fallado") return "fallado";
    if (st.resultadoSituacion === "avance") return "avance";
    return "cumplido";
  }
  return "cumplido";
}

/** Extrae decisiones ejecutadas de un vehículo (ring, taller, desglosador, misión). */
export function collectExecutedDecisionsFromVehicle(vehicle: Vehicle): RawRingDecision[] {
  if (isInvisibleCentinelaVehicle(vehicle)) return [];
  const out: RawRingDecision[] = [];
  const vehicleTs = vehicle.cierreAt ?? vehicle.aperturaAt ?? Date.now();

  if (vehicle.tipoFlota === "situacion" && vehicle.subTareas?.length) {
    for (const st of vehicle.subTareas) {
      if (!situacionSubEjecutada(st)) continue;
      out.push({
        key: decisionKeySubSituacion(vehicle.id, st.id),
        texto: st.texto,
        kind: "sub_situacion",
        status: situacionSubStatus(st),
        ts: st.cerradaAt ?? vehicleTs,
        pasoEjecutadoNumero: st.pasoEjecutadoNumero,
        proyectoId: st.proyectoId ?? vehicle.proyectoId,
        vehicleId: vehicle.id,
        vehicleTitulo: vehicle.titulo,
        subId: st.id,
        origenImanId: st.origenImanId,
      });
    }
  }

  if (vehicle.subVehiculos?.length) {
    for (const sv of vehicle.subVehiculos) {
      if (sv.status !== "cumplido" && sv.status !== "fallado") continue;
      out.push({
        key: decisionKeySubDesglosador(vehicle.id, sv.id),
        texto: sv.titulo,
        kind: "sub_desglosador",
        status: sv.status === "fallado" ? "fallado" : "cumplido",
        ts: sv.cierreAt ?? vehicleTs,
        proyectoId: vehicle.proyectoId,
        vehicleId: vehicle.id,
        vehicleTitulo: vehicle.titulo,
        subId: sv.id,
      });
    }
  }

  if (
    vehicle.status === "cumplido" &&
    vehicle.tipoReloj !== "desglosador" &&
    vehicle.tipoFlota !== "descanso" &&
    vehicle.tipoFlota !== "situacion"
  ) {
    out.push({
      key: decisionKeyMision(vehicle.id),
      texto: vehicle.titulo,
      kind: "mision_directa",
      status: "cumplido",
      ts: vehicle.cierreAt ?? vehicleTs,
      proyectoId: vehicle.proyectoId,
      vehicleId: vehicle.id,
      vehicleTitulo: vehicle.titulo,
    });
  }

  return out;
}

/** Ordena por tiempo y numera 1…N. */
export function enumerateRingDecisions(raw: RawRingDecision[]): ProyectoDecisionEnumerada[] {
  return [...raw]
    .sort((a, b) => a.ts - b.ts || a.texto.localeCompare(b.texto))
    .map((d, i) => ({
      n: i + 1,
      key: d.key,
      texto: d.texto,
      kind: d.kind,
      status: d.status,
      ts: d.ts,
      pasoEjecutadoNumero: d.pasoEjecutadoNumero,
      proyectoId: d.proyectoId,
      vehicleId: d.vehicleId,
      vehicleTitulo: d.vehicleTitulo,
      subId: d.subId,
      origenImanId: d.origenImanId,
    }));
}

/** Transcripción completa de varios vehículos (p. ej. segmento al sellar jornada). */
export function buildTranscriptFromVehicles(vehicles: Vehicle[]): ProyectoDecisionEnumerada[] {
  const raw: RawRingDecision[] = [];
  for (const v of vehicles) raw.push(...collectExecutedDecisionsFromVehicle(v));
  return enumerateRingDecisions(raw);
}

/** Filtra decisiones que pertenecen a un proyecto concreto. */
export function filterDecisionsForProyecto(
  decisions: ProyectoDecisionEnumerada[],
  proyectoId: string
): ProyectoDecisionEnumerada[] {
  const filtered = decisions.filter(
    d => !d.proyectoId || d.proyectoId === proyectoId
  );
  return filtered.map((d, i) => ({ ...d, n: i + 1 }));
}

export function rawDecisionFromSubTarea(
  vehicle: Pick<Vehicle, "id" | "titulo" | "proyectoId">,
  sub: SubTarea,
  status: DecisionStatus,
  ts: number
): RawRingDecision {
  return {
    key: decisionKeySubSituacion(vehicle.id, sub.id),
    texto: sub.texto,
    kind: "sub_situacion",
    status,
    ts,
    pasoEjecutadoNumero: sub.pasoEjecutadoNumero,
    proyectoId: sub.proyectoId ?? vehicle.proyectoId,
    vehicleId: vehicle.id,
    vehicleTitulo: vehicle.titulo,
    subId: sub.id,
    origenImanId: sub.origenImanId,
  };
}

export function rawDecisionFromSubVehiculo(
  vehicle: Pick<Vehicle, "id" | "titulo" | "proyectoId">,
  sub: SubVehiculo
): RawRingDecision {
  return {
    key: decisionKeySubDesglosador(vehicle.id, sub.id),
    texto: sub.titulo,
    kind: "sub_desglosador",
    status: sub.status === "fallado" ? "fallado" : "cumplido",
    ts: sub.cierreAt ?? Date.now(),
    proyectoId: vehicle.proyectoId,
    vehicleId: vehicle.id,
    vehicleTitulo: vehicle.titulo,
    subId: sub.id,
  };
}
