import type { SubVehiculo, Vehicle } from "@/lib/persistence";
import { ringSessionOperable } from "@/lib/ringEnfoqueReal";
import { hardwareClockNow } from "@/lib/hardwareClock";

export type NestedPauseKind = "punto_cero" | "interrupcion_situacion";

export type SituacionNestedPause = {
  pausedAt: number;
  kind: NestedPauseKind;
  situacionCronometro: NonNullable<Vehicle["situacionCronometro"]>;
  situacionCupoAnchor?: Vehicle["situacionCupoAnchor"];
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
  kind: NestedPauseKind
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
  kind: NestedPauseKind
): Partial<Vehicle> | null {
  if (!vehicle.situacionCronometro) return null;
  const now = hardwareClockNow();
  return {
    situacionNestedPause: {
      pausedAt: now,
      kind,
      situacionCronometro: { ...vehicle.situacionCronometro },
      situacionCupoAnchor: vehicle.situacionCupoAnchor ?? null,
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

/** Restaura ring situacional tras Punto Cero anidado. */
export function resumeSituacionFromNestedPause(parent: Vehicle): Partial<Vehicle> | null {
  const snap = parent.situacionNestedPause;
  if (!snap) return null;
  const pauseMs = Math.max(0, hardwareClockNow() - snap.pausedAt);
  let situacionCronometro = { ...snap.situacionCronometro };
  if (situacionCronometro.bloqueInicioAt != null) {
    situacionCronometro = {
      ...situacionCronometro,
      bloqueInicioAt: situacionCronometro.bloqueInicioAt + pauseMs,
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

/** Padre en pausa por Punto Cero anidado — candidato a reanudación al cerrar descanso. */
export function findNestedParentAwaitingPuntoCeroResume(vehicles: Vehicle[]): Vehicle | null {
  return (
    vehicles.find(
      v =>
        v.status === "activo" &&
        (v.desglosadorPausa?.nestedKind === "punto_cero" || v.situacionNestedPause?.kind === "punto_cero")
    ) ?? null
  );
}

export function buildNestedParentResumePatch(parent: Vehicle): Partial<Vehicle> | null {
  if (parent.desglosadorPausa?.nestedKind === "punto_cero") {
    return resumeDesglosadorFromNestedPause(parent);
  }
  if (parent.situacionNestedPause?.kind === "punto_cero") {
    return resumeSituacionFromNestedPause(parent);
  }
  return null;
}
