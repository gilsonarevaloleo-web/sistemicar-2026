/**
 * Kernel puro Situacional (ring + cupos).
 * Paint ms0 sin burst de conciencia ni voz.
 */
import type { SubTarea, Vehicle } from "@/lib/persistence";
import {
  aplicarTiempoGanadoAlCumplir,
  registrarCierreFalladoCronometro,
  resolveCronometroCupoAnchor,
  situacionFilaCronometroPendiente,
} from "@/lib/situacionCupoDistrib";
import { ringSessionOperable, reanudarSituacionCronometroRing } from "@/lib/ringEnfoqueReal";
import { isSituacionDesglosador } from "./filters";

export type SituacionRowCloseResult = {
  vehicleId: string;
  subTareas: SubTarea[];
  situacionCupoAnchor: Vehicle["situacionCupoAnchor"];
  situacionCronometro: NonNullable<Vehicle["situacionCronometro"]>;
  minutosGanados: number;
  saldoAdelantoMin: number;
  minutosPerdidos: number;
  bloqueListo: boolean;
  closedSubTexto: string;
};

export function applySituacionRowClose(
  vehicle: Vehicle,
  subTareaId: string,
  status: "cumplido" | "fallado" | "avance",
  now = Date.now()
): SituacionRowCloseResult | null {
  if (!isSituacionDesglosador(vehicle) || vehicle.status !== "activo") return null;
  if (!vehicle.subTareas) return null;
  if (!ringSessionOperable(vehicle.situacionCronometro, vehicle.subTareas)) return null;

  const target = vehicle.subTareas.find(st => st.id === subTareaId);
  if (
    !target?.enDesgloseCronometro ||
    (target.resultadoSituacion ?? "pendiente") !== "pendiente"
  ) {
    return null;
  }

  let sc = vehicle.situacionCronometro!;
  if (!sc.horaFinContratoMs && sc.horaFinMs) {
    sc = { ...sc, horaFinContratoMs: sc.horaFinMs };
  }
  const bloqueInicio = sc.bloqueInicioAt ?? vehicle.aperturaAt ?? now;

  let subTareas = vehicle.subTareas;
  let minutosGanados = 0;
  let saldoAdelantoMin = 0;
  let minutosPerdidos = 0;

  if (status === "cumplido") {
    const gained = aplicarTiempoGanadoAlCumplir(
      subTareas,
      subTareaId,
      vehicle.situacionCupoAnchor,
      now,
      bloqueInicio,
      sc.horaFinContratoMs ?? sc.horaFinMs
    );
    subTareas = gained.subTareas;
    minutosGanados = gained.minutosGanados;
    saldoAdelantoMin = gained.saldoAdelantoMin;
  } else if (status === "fallado") {
    const failed = registrarCierreFalladoCronometro(
      subTareas,
      subTareaId,
      vehicle.situacionCupoAnchor,
      now,
      bloqueInicio
    );
    subTareas = failed.subTareas;
    minutosPerdidos = failed.minutosPerdidos;
  } else {
    // avance: cierre neutro — libera el ring, sin ganancia ni pérdida de tiempo
    const anchor = vehicle.situacionCupoAnchor;
    let duracionRealSec = 0;
    if (anchor?.subTareaId === subTareaId) {
      duracionRealSec = Math.max(0, Math.floor((now - anchor.startedAt) / 1000));
    } else if (target.minutosCupo) {
      duracionRealSec = target.minutosCupo * 60;
    }
    subTareas = subTareas.map(st =>
      st.id === subTareaId
        ? {
            ...st,
            completada: false,
            resultadoSituacion: "avance" as const,
            duracionRealSec,
            cerradaAt: now,
          }
        : st
    );
  }

  const bloqueListo = !subTareas.some(situacionFilaCronometroPendiente);
  const resolvedAnchor = bloqueListo
    ? null
    : resolveCronometroCupoAnchor(subTareas, vehicle.situacionCupoAnchor, {
        forceResetSameRow: true,
        now,
      });
  const situacionCupoAnchor =
    resolvedAnchor === "unchanged" ? vehicle.situacionCupoAnchor ?? null : resolvedAnchor;

  const scActivo =
    status === "cumplido"
      ? {
          ...sc,
          saldoAdelantoMin: (sc.saldoAdelantoMin ?? 0) + saldoAdelantoMin,
          minutosGanadosReto: (sc.minutosGanadosReto ?? 0) + minutosGanados,
          minutosGanadosSesion: (sc.minutosGanadosSesion ?? 0) + minutosGanados,
          retoNumero: sc.retoNumero ?? 1,
          retosCompletados: sc.retosCompletados ?? 0,
        }
      : sc;

  const situacionCronometro =
    !bloqueListo && scActivo.activo !== true
      ? reanudarSituacionCronometroRing(scActivo)
      : scActivo;

  return {
    vehicleId: vehicle.id,
    subTareas,
    situacionCupoAnchor,
    situacionCronometro,
    minutosGanados,
    saldoAdelantoMin,
    minutosPerdidos,
    bloqueListo,
    closedSubTexto: target.texto,
  };
}

export type SituacionBlockClosePatch = {
  vehicleId: string;
  status: "cumplido" | "archivado";
  cierreAt: number;
  subTareas: SubTarea[];
  situacionCronometro: Vehicle["situacionCronometro"];
  situacionCupoAnchor: null;
};

/** Sella el ring cuando no quedan filas pendientes en cronómetro. */
export function applySituacionBlockClose(
  vehicle: Vehicle,
  now = Date.now()
): SituacionBlockClosePatch | null {
  if (!isSituacionDesglosador(vehicle) || vehicle.status !== "activo") return null;
  const subs = vehicle.subTareas ?? [];
  const pending = subs.some(situacionFilaCronometroPendiente);
  if (pending) return null;

  const cronRows = subs.filter(st => st.enDesgloseCronometro);
  const anyCumplido = cronRows.some(
    st => st.resultadoSituacion === "cumplido" || st.resultadoSituacion === "avance"
  );
  const sc = vehicle.situacionCronometro;

  return {
    vehicleId: vehicle.id,
    status: anyCumplido || cronRows.length === 0 ? "cumplido" : "archivado",
    cierreAt: now,
    subTareas: subs,
    situacionCronometro: sc ? { ...sc, activo: false } : null,
    situacionCupoAnchor: null,
  };
}

export function situacionPendingCronRows(vehicle: Vehicle): SubTarea[] {
  return (vehicle.subTareas ?? []).filter(situacionFilaCronometroPendiente);
}

export function situacionProgressLabel(vehicle: Vehicle): string {
  const cron = (vehicle.subTareas ?? []).filter(st => st.enDesgloseCronometro);
  const done = cron.filter(st => (st.resultadoSituacion ?? "pendiente") !== "pendiente").length;
  return `${done}/${cron.length}`;
}

/** Returns the row status for display purposes (cumplido | avance | fallado | pendiente). */
export function situacionFilaResultado(
  row: { resultadoSituacion?: string; completada?: boolean }
): "cumplido" | "avance" | "fallado" | "pendiente" {
  const r = row.resultadoSituacion ?? (row.completada ? "cumplido" : "pendiente");
  if (r === "cumplido") return "cumplido";
  if (r === "avance") return "avance";
  if (r === "fallado") return "fallado";
  return "pendiente";
}
