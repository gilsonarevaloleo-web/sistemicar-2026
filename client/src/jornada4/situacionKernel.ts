/**
 * Kernel puro Situacional (ring + cupos).
 * Paint ms0 sin burst de conciencia ni voz.
 */
import type { SubTarea, Vehicle } from "@/lib/persistence";
import {
  aplicarTiempoGanadoAlCumplir,
  quitarFilaColaHaciaFoco,
  registrarCierreFalladoCronometro,
  resolveCronometroCupoAnchor,
  situacionFilaCronometroPendiente,
} from "@/lib/situacionCupoDistrib";
import { ringSessionOperable, reanudarSituacionCronometroRing } from "@/lib/ringEnfoqueReal";
import { isSituacionDesglosador } from "./filters";
import { isRingModoEntrenamiento } from "./entrenamientoRestricciones";

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

  // Entrenamiento serio: sin avance fácil — cumplido, fallado o sustituir foco.
  if (status === "avance" && isRingModoEntrenamiento(vehicle)) {
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

export type SituacionQuitarFilaResult = {
  vehicleId: string;
  subTareas: SubTarea[];
  situacionCupoAnchor: Vehicle["situacionCupoAnchor"];
  minutosAlFoco: number;
  quitadaTexto: string;
  focoTexto: string;
  quitadaId: string;
};

/**
 * Recorta el plan: saca una fila de cola (obsoleta) sin veredicto.
 * Los minutos van al foco. No deja huella de proyecto — la gestión es el recorte.
 */
export function applySituacionQuitarFila(
  vehicle: Vehicle,
  subTareaId: string,
  now = Date.now()
): SituacionQuitarFilaResult | null {
  if (!isSituacionDesglosador(vehicle) || vehicle.status !== "activo") return null;
  if (!vehicle.subTareas?.length) return null;
  if (!ringSessionOperable(vehicle.situacionCronometro, vehicle.subTareas)) return null;

  const pending = situacionPendingCronRows(vehicle);
  const focusId =
    vehicle.situacionCupoAnchor?.subTareaId &&
    pending.some(st => st.id === vehicle.situacionCupoAnchor!.subTareaId)
      ? vehicle.situacionCupoAnchor.subTareaId
      : pending[0]?.id;
  if (!focusId) return null;

  const result = quitarFilaColaHaciaFoco(vehicle.subTareas, subTareaId, focusId);
  if (!result.ok) return null;

  const foco = result.subTareas.find(st => st.id === focusId);
  const situacionCupoAnchor =
    vehicle.situacionCupoAnchor?.subTareaId === focusId
      ? vehicle.situacionCupoAnchor
      : { subTareaId: focusId, startedAt: now };

  return {
    vehicleId: vehicle.id,
    subTareas: result.subTareas,
    situacionCupoAnchor,
    minutosAlFoco: result.minutosAlFoco,
    quitadaTexto: result.quitada.texto,
    focoTexto: foco?.texto ?? "",
    quitadaId: result.quitada.id,
  };
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

export type PostergarFilaEnFocoResult = {
  vehicleId: string;
  subTareas: SubTarea[];
  situacionCupoAnchor: { subTareaId: string; startedAt: number };
  filaPostergadaId: string;
  filaPostergadaTexto: string;
  minutosConservados: number;
  nuevoFocoId: string;
  nuevoFocoTexto: string;
};

/**
 * Posterga la fila en foco: la manda al final de la cola con sus minutos restantes
 * (cupoFijo) y pone el siguiente pendiente en foco. No congela el ring completo.
 */
export function postergarFilaEnFocoACola(
  vehicle: Vehicle,
  now = Date.now()
): PostergarFilaEnFocoResult | null {
  if (!isSituacionDesglosador(vehicle) || vehicle.status !== "activo") return null;
  if (vehicle.situacionNestedPause) return null;
  if (vehicle.situacionCronometro?.activo !== true) return null;
  const subs = vehicle.subTareas;
  if (!subs?.length) return null;

  const pendingSlots = subs
    .map((st, i) => ({ st, i }))
    .filter(({ st }) => situacionFilaCronometroPendiente(st));
  if (pendingSlots.length < 2) return null;

  const focusId =
    vehicle.situacionCupoAnchor?.subTareaId &&
    pendingSlots.some(({ st }) => st.id === vehicle.situacionCupoAnchor!.subTareaId)
      ? vehicle.situacionCupoAnchor.subTareaId
      : pendingSlots[0]!.st.id;

  const focusSlot = pendingSlots.find(({ st }) => st.id === focusId);
  if (!focusSlot) return null;

  const cupoMin = focusSlot.st.minutosCupo ?? 0;
  let minutosConservados = Math.max(1, cupoMin);
  if (vehicle.situacionCupoAnchor?.subTareaId === focusId && cupoMin > 0) {
    const elapsedMin = Math.floor(
      Math.max(0, now - vehicle.situacionCupoAnchor.startedAt) / 60_000
    );
    minutosConservados = Math.max(1, cupoMin - elapsedMin);
  }

  // Actualizar cupo de la fila postergada (fijo = no se lo come la redistribución).
  const withCupo = subs.map(st =>
    st.id === focusId
      ? { ...st, minutosCupo: minutosConservados, cupoFijo: true }
      : st
  );

  // Reordenar solo slots pendientes: quitar foco del frente → final de cola.
  const pendingWithoutFocus = pendingSlots.filter(({ st }) => st.id !== focusId);
  const reorderedPending = [
    ...pendingWithoutFocus.map(({ st }) => withCupo.find(s => s.id === st.id)!),
    withCupo.find(s => s.id === focusId)!,
  ];
  const subTareas = [...withCupo];
  pendingSlots.forEach(({ i }, orderIdx) => {
    subTareas[i] = reorderedPending[orderIdx]!;
  });

  const nuevo = pendingWithoutFocus[0]!.st;
  return {
    vehicleId: vehicle.id,
    subTareas,
    situacionCupoAnchor: { subTareaId: nuevo.id, startedAt: now },
    filaPostergadaId: focusId,
    filaPostergadaTexto: focusSlot.st.texto,
    minutosConservados,
    nuevoFocoId: nuevo.id,
    nuevoFocoTexto: nuevo.texto,
  };
}
