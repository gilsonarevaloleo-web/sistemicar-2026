import type { SubVehiculo, Vehicle } from "@/lib/persistence";
import { ringSessionOperable } from "@/lib/ringEnfoqueReal";
import { hardwareClockNow } from "@/lib/hardwareClock";

export type DesglosadorNestedPauseKind = "punto_cero" | "interrupcion_situacion";
export type NestedPauseKind = DesglosadorNestedPauseKind | "postergacion";

export type SituacionNestedPause = {
  pausedAt: number;
  kind: NestedPauseKind;
  situacionCronometro: NonNullable<Vehicle["situacionCronometro"]>;
  situacionCupoAnchor?: Vehicle["situacionCupoAnchor"];
  /** Minutos de pared que quedaban al postergar (informativo / UI). */
  minutosRestantesAlPausar?: number;
};

/** Desglosador tiempo activo con sub en curso — candidato a apilamiento. */
export function findActiveDesglosadorForNestedStack(vehicles: Vehicle[]): Vehicle | null {
  return (
    vehicles.find(v => {
      if (v.status !== "activo" || v.autoVerdad || v.tipoReloj !== "desglosador") return false;
      if (v.interrupcionActiva) return false;
      return (v.subVehiculos ?? []).some(s => s.status === "activo");
    }) ?? null
  );
}

/** Situación con ring/cronómetro operable — «desglosador situacional». */
export function findActiveSituacionRingForNestedStack(vehicles: Vehicle[]): Vehicle | null {
  return (
    vehicles.find(v => {
      if (v.status !== "activo" || v.autoVerdad || v.tipoFlota !== "situacion") return false;
      if (v.situacionNestedPause) return false;
      return v.situacionCronometro?.activo === true || ringSessionOperable(v.situacionCronometro, v.subTareas ?? []);
    }) ?? null
  );
}

export function buildDesglosadorNestedPausePatch(
  vehicle: Vehicle,
  kind: DesglosadorNestedPauseKind
): { subVehiculos: SubVehiculo[]; desglosadorPausa: NonNullable<Vehicle["desglosadorPausa"]>; interrupcionActiva: true } | null {
  const activeSub = (vehicle.subVehiculos ?? []).find(s => s.status === "activo");
  if (!activeSub?.aperturaAt) return null;
  const now = hardwareClockNow();
  const elapsedSec = Math.floor((now - activeSub.aperturaAt) / 1000);
  const subs = (vehicle.subVehiculos ?? []).map(s =>
    s.id === activeSub.id ? { ...s, status: "nested_paused" as const } : s
  );
  return {
    subVehiculos: subs,
    desglosadorPausa: {
      pausadoAt: now,
      subActivoId: activeSub.id,
      elapsedSecSnapshot: elapsedSec,
      nestedKind: kind,
    },
    interrupcionActiva: true,
  };
}

export function buildSituacionNestedPausePatch(
  vehicle: Vehicle,
  kind: NestedPauseKind,
  opts?: { nowMs?: number; minutosRestantes?: number }
): Partial<Vehicle> | null {
  if (!vehicle.situacionCronometro) return null;
  if (vehicle.situacionNestedPause) return null;
  const now = opts?.nowMs ?? hardwareClockNow();
  return {
    situacionNestedPause: {
      pausedAt: now,
      kind,
      situacionCronometro: { ...vehicle.situacionCronometro },
      situacionCupoAnchor: vehicle.situacionCupoAnchor ?? null,
      ...(opts?.minutosRestantes != null && opts.minutosRestantes >= 0
        ? { minutosRestantesAlPausar: opts.minutosRestantes }
        : {}),
    },
    situacionCronometro: { ...vehicle.situacionCronometro, activo: false },
  };
}

/** Restaura desglosador tras Punto Cero anidado — mismo sub-paso donde se quedó. */
export function resumeDesglosadorFromNestedPause(parent: Vehicle): Partial<Vehicle> | null {
  const pausa = parent.desglosadorPausa;
  if (!pausa?.subActivoId) return null;
  const subs = [...(parent.subVehiculos ?? [])];
  const idx = subs.findIndex(s => s.id === pausa.subActivoId);
  if (idx === -1) {
    return { desglosadorPausa: undefined, interrupcionActiva: false };
  }
  const resumedApertura =
    pausa.elapsedSecSnapshot != null
      ? hardwareClockNow() - pausa.elapsedSecSnapshot * 1000
      : hardwareClockNow();
  subs[idx] = { ...subs[idx], status: "activo", aperturaAt: resumedApertura };
  return {
    subVehiculos: subs,
    desglosadorPausa: undefined,
    interrupcionActiva: false,
  };
}

/**
 * Restaura ring situacional tras pausa anidada / postergación.
 * Desplaza anclas y meta de contrato por la duración de la pausa para
 * conservar los minutos que sobraban (no se queman mientras está postergado).
 */
export function resumeSituacionFromNestedPause(
  parent: Vehicle,
  opts?: { nowMs?: number }
): Partial<Vehicle> | null {
  const snap = parent.situacionNestedPause;
  if (!snap) return null;
  const now = opts?.nowMs ?? hardwareClockNow();
  const pauseMs = Math.max(0, now - snap.pausedAt);
  let situacionCronometro: NonNullable<Vehicle["situacionCronometro"]> = {
    ...snap.situacionCronometro,
    activo: true,
  };
  if (situacionCronometro.bloqueInicioAt != null) {
    situacionCronometro = {
      ...situacionCronometro,
      bloqueInicioAt: situacionCronometro.bloqueInicioAt + pauseMs,
    };
  }
  // Conservar cupo de pared: la meta se mueve con la pausa.
  if (situacionCronometro.horaFinContratoMs != null) {
    situacionCronometro = {
      ...situacionCronometro,
      horaFinContratoMs: situacionCronometro.horaFinContratoMs + pauseMs,
    };
  }
  if (situacionCronometro.horaFinMs != null) {
    situacionCronometro = {
      ...situacionCronometro,
      horaFinMs: situacionCronometro.horaFinMs + pauseMs,
    };
  }
  let situacionCupoAnchor = snap.situacionCupoAnchor ?? null;
  if (situacionCupoAnchor?.startedAt != null) {
    situacionCupoAnchor = {
      ...situacionCupoAnchor,
      startedAt: situacionCupoAnchor.startedAt + pauseMs,
    };
  }
  return {
    situacionCronometro,
    situacionCupoAnchor,
    situacionNestedPause: null,
  };
}

