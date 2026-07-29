/**
 * Kernel Crisol → vehículo de enfoque (Dual Kernel).
 * Sin voz / conciencia: solo mutación de flota + redistribución de cupos.
 */
import type { SubTarea, Vehicle } from "@/lib/persistence";
import {
  aplicarProyectoHeredadoASub,
  dominanteProyectoIdEnSubs,
  resolveProyectoIdEnfoqueSituacion,
  subTareaFromImanItem,
} from "@/lib/imanPensamientos";
import {
  isCupoFijo,
  redistribuirMinutosSituacionCronometro,
  remainingCronometroBudgetMin,
  situacionFilaCronometroPendiente,
} from "@/lib/situacionCupoDistrib";
import {
  nextRetoNumero,
  resolveDefaultObjetivoHoraParaRing,
  situacionMinutosHastaObjetivoHora,
  situacionObjetivoHoraToContratoMs,
} from "@/lib/situacionGanancia";
import type { SituacionReservaItem } from "@/lib/situacionReserva";
import { isSituacionDesglosador } from "@/jornada4/filters";

export type CrisolInjectOk = {
  ok: true;
  vehicleId: string;
  subTareas: SubTarea[];
  situacionCronometro?: Vehicle["situacionCronometro"];
  situacionCupoAnchor?: Vehicle["situacionCupoAnchor"];
  mode: "lista_libre" | "enqueue_ring" | "open_ring";
};

export type CrisolInjectFail = {
  ok: false;
  reason:
    | "no_vehicle"
    | "multi_need_expand"
    | "invalid_budget"
    | "invalid_objetivo"
    | "ring_inactive_enqueue";
};

export type CrisolInjectResult = CrisolInjectOk | CrisolInjectFail;

export function pickSituacionVehicleTarget(
  vehicles: Vehicle[],
  expandedId: string | null
): { vehicle?: Vehicle; ambiguous: boolean } {
  // Incluye ring activo, lista libre y situación vacía (ring por abrir).
  const activos = vehicles.filter(
    v =>
      v.status === "activo" &&
      !v.autoVerdad &&
      v.tipoFlota === "situacion" &&
      !v.vehiculoPadreDesglosadorId
  );
  if (activos.length === 0) return { ambiguous: false };
  if (expandedId) {
    const ex = activos.find(v => v.id === expandedId);
    if (ex) return { vehicle: ex, ambiguous: false };
  }
  if (activos.length === 1) return { vehicle: activos[0], ambiguous: false };
  return { ambiguous: true };
}

function liftToCron(
  st: SubTarea,
  enfoqueHeredado: string | undefined
): SubTarea {
  const next: SubTarea = {
    ...st,
    enDesgloseCronometro: true,
    resultadoSituacion: "pendiente",
    completada: false,
  };
  if (!isCupoFijo(st)) {
    delete (next as { minutosCupo?: number }).minutosCupo;
    delete (next as { cupoFijo?: boolean }).cupoFijo;
  }
  return aplicarProyectoHeredadoASub(next, enfoqueHeredado);
}

/** Ruta E — subtarea libre (fuera del ring). */
export function injectCrisolToListaLibre(
  vehicle: Vehicle,
  item: SituacionReservaItem
): CrisolInjectResult {
  if (vehicle.tipoFlota !== "situacion" || vehicle.status !== "activo") {
    return { ok: false, reason: "no_vehicle" };
  }
  const newSub = subTareaFromImanItem(item);
  return {
    ok: true,
    vehicleId: vehicle.id,
    subTareas: [...(vehicle.subTareas || []), newSub],
    mode: "lista_libre",
  };
}

/** Ruta S con ring activo — encola y redistribuye cupo. */
export function injectCrisolToActiveRing(
  vehicle: Vehicle,
  item: SituacionReservaItem,
  opts?: { segmentoProyectoId?: string }
): CrisolInjectResult {
  if (!isSituacionDesglosador(vehicle) || !vehicle.subTareas) {
    return { ok: false, reason: "no_vehicle" };
  }
  const sc = vehicle.situacionCronometro;
  if (sc?.activo !== true) return { ok: false, reason: "ring_inactive_enqueue" };

  const enfoqueHeredado =
    item.proyectoId?.trim() ||
    sc.proyectoEnfoqueId?.trim() ||
    resolveProyectoIdEnfoqueSituacion(vehicle, opts?.segmentoProyectoId);

  const newSub = liftToCron(subTareaFromImanItem(item), enfoqueHeredado);
  let subTareas = [...vehicle.subTareas, newSub];
  const budgetMin = remainingCronometroBudgetMin(sc, subTareas);
  if (budgetMin == null) return { ok: false, reason: "invalid_budget" };

  subTareas = redistribuirMinutosSituacionCronometro(subTareas, budgetMin);

  const proyectoEnfoqueId =
    sc.proyectoEnfoqueId?.trim() ||
    dominanteProyectoIdEnSubs(subTareas.filter(st => st.enDesgloseCronometro)) ||
    vehicle.proyectoId?.trim() ||
    opts?.segmentoProyectoId?.trim();

  const situacionCronometro = {
    ...sc,
    ...(proyectoEnfoqueId && !sc.proyectoEnfoqueId?.trim()
      ? { proyectoEnfoqueId }
      : {}),
  };

  let situacionCupoAnchor = vehicle.situacionCupoAnchor ?? undefined;
  const cur = vehicle.situacionCupoAnchor;
  const curSub = cur ? subTareas.find(s => s.id === cur.subTareaId) : undefined;
  const anchorStillValid =
    !!curSub &&
    situacionFilaCronometroPendiente(curSub) &&
    (curSub.minutosCupo ?? 0) > 0;
  if (!anchorStillValid) {
    const firstCron = subTareas.find(
      st => situacionFilaCronometroPendiente(st) && (st.minutosCupo ?? 0) > 0
    );
    if (firstCron) {
      situacionCupoAnchor = { subTareaId: firstCron.id, startedAt: Date.now() };
    }
  }

  return {
    ok: true,
    vehicleId: vehicle.id,
    subTareas,
    situacionCronometro,
    situacionCupoAnchor,
    mode: "enqueue_ring",
  };
}

/** Ruta S sin ring — abre ring con meta del segmento (sin voz). */
export function injectCrisolOpeningRing(
  vehicle: Vehicle,
  item: SituacionReservaItem,
  opts?: { segmentoHoraFin?: string | null; segmentoProyectoId?: string }
): CrisolInjectResult {
  if (vehicle.tipoFlota !== "situacion" || vehicle.status !== "activo") {
    return { ok: false, reason: "no_vehicle" };
  }

  const enfoqueHeredado =
    item.proyectoId?.trim() ||
    resolveProyectoIdEnfoqueSituacion(vehicle, opts?.segmentoProyectoId);

  const newSub = liftToCron(subTareaFromImanItem(item), enfoqueHeredado);
  let subTareas = [...(vehicle.subTareas || []), newSub];

  const objetivoHora =
    resolveDefaultObjetivoHoraParaRing(opts?.segmentoHoraFin ?? undefined) || "";
  const contratoMs = situacionObjetivoHoraToContratoMs(objetivoHora);
  const sum =
    contratoMs != null ? situacionMinutosHastaObjetivoHora(objetivoHora) : null;
  if (sum == null || contratoMs == null) {
    return { ok: false, reason: "invalid_objetivo" };
  }

  subTareas = redistribuirMinutosSituacionCronometro(subTareas, sum);
  const bloqueInicioAt = Date.now();
  const prevSc = vehicle.situacionCronometro;
  const retoNumero = nextRetoNumero(prevSc);
  const proyectoEnfoqueId =
    item.proyectoId?.trim() ||
    dominanteProyectoIdEnSubs(subTareas.filter(st => st.enDesgloseCronometro)) ||
    vehicle.proyectoId?.trim() ||
    opts?.segmentoProyectoId?.trim();

  const situacionCronometro: NonNullable<Vehicle["situacionCronometro"]> = {
    activo: true,
    bloqueInicioAt,
    horaFinMs: contratoMs,
    horaFinContratoMs: contratoMs,
    depthBlockPsGranted: 0,
    retoNumero,
    retosCompletados: prevSc?.retosCompletados ?? 0,
    minutosGanadosReto: 0,
    minutosGanadosSesion: prevSc?.minutosGanadosSesion ?? 0,
    saldoAdelantoMin: 0,
    ...(proyectoEnfoqueId ? { proyectoEnfoqueId } : {}),
  };

  const firstCron = subTareas.find(
    st => situacionFilaCronometroPendiente(st) && (st.minutosCupo ?? 0) > 0
  );
  const situacionCupoAnchor = firstCron
    ? { subTareaId: firstCron.id, startedAt: bloqueInicioAt }
    : undefined;

  return {
    ok: true,
    vehicleId: vehicle.id,
    subTareas,
    situacionCronometro,
    situacionCupoAnchor,
    mode: "open_ring",
  };
}
