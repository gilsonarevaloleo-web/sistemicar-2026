import type { DetalleSubTarea, SubTarea, SubVehiculo, Vehicle } from "./persistence";
import { applyVehicleSessionSeal, isVehicleSessionSealed } from "./vehicleSessionSeal";

function countSubTareasEnCronometro(v: Vehicle): number {
  return v.subTareas?.filter(st => st.enDesgloseCronometro).length ?? 0;
}

export function hasActiveSituacionDesglose(v: Vehicle): boolean {
  if (v.tipoFlota !== "situacion" || v.status !== "activo") return false;
  return (
    (v.subTareas?.length ?? 0) > 0 ||
    v.situacionCronometro?.activo === true ||
    countSubTareasEnCronometro(v) > 0
  );
}

function subTareaSessionScore(st: SubTarea): number {
  let score = (st.detalles?.length ?? 0) * 10;
  if (st.enDesgloseCronometro) score += 4;
  if ((st.minutosCupo ?? 0) > 0) score += 2;
  if (st.cupoFijo) score += 3;
  if (st.resultadoSituacion && st.resultadoSituacion !== "pendiente") score += 1;
  if (st.completada) score += 1;
  return score;
}

function mergeDetallesLists(
  a: DetalleSubTarea[] | undefined,
  b: DetalleSubTarea[] | undefined
): DetalleSubTarea[] | undefined {
  const listA = a ?? [];
  const listB = b ?? [];
  if (listA.length === 0 && listB.length === 0) return undefined;
  const byId = new Map<string, DetalleSubTarea>();
  for (const d of listA) byId.set(d.id, d);
  for (const d of listB) {
    const prev = byId.get(d.id);
    if (!prev) byId.set(d.id, d);
    else byId.set(d.id, { ...prev, ...d, entregado: prev.entregado || d.entregado });
  }
  return [...byId.values()].sort((x, y) => x.creadaAt - y.creadaAt);
}

/** Fusiona subtareas por id conservando la versi�n m�s rica (detalles, cron�metro, cupos). */
export function mergeSubTareasById(
  firebaseSubs: SubTarea[] | undefined,
  localSubs: SubTarea[] | undefined
): SubTarea[] {
  const fb = firebaseSubs ?? [];
  const local = localSubs ?? [];
  const byId = new Map<string, SubTarea>();
  const order: string[] = [];

  for (const st of fb) {
    byId.set(st.id, st);
    order.push(st.id);
  }
  for (const st of local) {
    if (!byId.has(st.id)) {
      byId.set(st.id, st);
      order.push(st.id);
    } else {
      const existing = byId.get(st.id)!;
      const scoreExisting = subTareaSessionScore(existing);
      const scoreIncoming = subTareaSessionScore(st);
      const pickIncoming = scoreIncoming > scoreExisting;
      const base = pickIncoming ? { ...existing, ...st } : existing;
      byId.set(st.id, {
        ...base,
        detalles: mergeDetallesLists(existing.detalles, st.detalles),
      });
    }
  }
  return order.map(id => byId.get(id)!);
}

function pickSituacionCronometro(
  fb: Vehicle["situacionCronometro"],
  local: Vehicle["situacionCronometro"]
): Vehicle["situacionCronometro"] {
  if (!fb && !local) return undefined;
  if (!fb) return local;
  if (!local) return fb;
  if (local.activo === true && fb.activo !== true) return local;
  if (fb.activo === true && local.activo !== true) {
    const localRetos = local.retosCompletados ?? 0;
    const fbRetos = fb.retosCompletados ?? 0;
    if (localRetos >= fbRetos) return local;
    if ((local.depthBlockPsGranted ?? 0) > (fb.depthBlockPsGranted ?? 0)) return local;
    // Mismo bloque cerrado en local (finalize / inactividad): no reabrir ring por snapshot stale.
    if (
      local.bloqueInicioAt != null &&
      local.bloqueInicioAt === fb.bloqueInicioAt
    ) {
      return local;
    }
  }
  const fbFin = fb.horaFinContratoMs ?? fb.horaFinMs ?? 0;
  const localFin = local.horaFinContratoMs ?? local.horaFinMs ?? 0;
  const picked = localFin >= fbFin ? local : fb;
  const other = localFin >= fbFin ? fb : local;
  const proyectoEnfoqueId = picked.proyectoEnfoqueId?.trim() || other?.proyectoEnfoqueId?.trim();
  return proyectoEnfoqueId ? { ...picked, proyectoEnfoqueId } : picked;
}

function pickSituacionCupoAnchor(
  fb: Vehicle["situacionCupoAnchor"],
  local: Vehicle["situacionCupoAnchor"]
): Vehicle["situacionCupoAnchor"] {
  if (!fb?.subTareaId && local?.subTareaId) return local;
  if (fb?.subTareaId && !local?.subTareaId) return fb;
  if (fb?.subTareaId && local?.subTareaId) {
    if (local.subTareaId === fb.subTareaId) {
      return (local.startedAt ?? 0) <= (fb.startedAt ?? 0) ? local : fb;
    }
    return local;
  }
  return fb ?? local;
}

/** Aplica merge de sesi�n situacional sobre un veh�culo ya parcialmente fusionado. */
export function applySituacionDesgloseMerge(
  merged: Vehicle,
  firebaseV: Vehicle,
  localV: Vehicle
): Vehicle {
  if (firebaseV.tipoFlota !== "situacion" || localV.tipoFlota !== "situacion") {
    return merged;
  }

  return {
    ...merged,
    subTareas: mergeSubTareasById(firebaseV.subTareas, localV.subTareas),
    situacionCronometro: pickSituacionCronometro(
      firebaseV.situacionCronometro,
      localV.situacionCronometro
    ),
    situacionCupoAnchor: pickSituacionCupoAnchor(
      firebaseV.situacionCupoAnchor,
      localV.situacionCupoAnchor
    ),
  };
}

/** Fusiona estado de sesi�n local sobre snapshot Firebase (desglosador tiempo + situaci�n). */
function countSubsCerrados(subs: SubVehiculo[] | undefined): number {
  return (subs ?? []).filter(s => s.status === "cumplido" || s.status === "fallado").length;
}

function subVehiculoProgressScore(sub: SubVehiculo): number {
  if (sub.status === "pendiente") return 0;
  if (sub.status === "activo") return 10 + (sub.aperturaAt ?? 0) / 1e15;
  return 20 + (sub.cierreAt ?? 0) / 1e15;
}

/** Fusiona sub-vehículos por id (el desglosador es la maleta; cada sub avanza a su ritmo). */
export function mergeSubVehiculosById(
  firebaseSubs: SubVehiculo[] | undefined,
  localSubs: SubVehiculo[] | undefined
): SubVehiculo[] {
  const fb = firebaseSubs ?? [];
  const local = localSubs ?? [];
  if (local.length === 0) return fb;
  if (fb.length === 0) return local;

  const byId = new Map<string, SubVehiculo>();
  const order: string[] = [];

  for (const s of fb) {
    byId.set(s.id, s);
    order.push(s.id);
  }
  for (const s of local) {
    if (!byId.has(s.id)) {
      byId.set(s.id, s);
      order.push(s.id);
      continue;
    }
    const existing = byId.get(s.id)!;
    const pickLocal = subVehiculoProgressScore(s) >= subVehiculoProgressScore(existing);
    byId.set(s.id, pickLocal ? { ...existing, ...s } : existing);
  }
  return order.map(id => byId.get(id)!);
}

function activeSubId(subs: SubVehiculo[] | undefined): string | undefined {
  return subs?.find(s => s.status === "activo")?.id;
}

function countSubTareasCerradas(subs: SubTarea[] | undefined): number {
  return (subs ?? []).filter(
    st =>
      st.completada ||
      st.resultadoSituacion === "cumplido" ||
      st.resultadoSituacion === "fallado"
  ).length;
}

/** Conserva subtareas locales cuando Firebase pierde filas (sync parcial). */
/** Tras reconcile Firebase, conserva subtareas locales si el snapshot remoto va atrás. */
export function preferLocalSubTareasInVehicleList(
  merged: Vehicle[],
  localSources: Vehicle[]
): Vehicle[] {
  let changed = false;
  const out = merged.map(m => {
    const local = localSources.find(l => l.id === m.id);
    if (!local || !shouldPreferLocalSubTareas(m, local)) return m;
    changed = true;
    return { ...m, subTareas: mergeSubTareasById(m.subTareas, local.subTareas) };
  });
  return changed ? out : merged;
}

export function shouldPreferLocalSubTareas(firebaseV: Vehicle, localV: Vehicle): boolean {
  if (firebaseV.tipoFlota !== "situacion" && localV.tipoFlota !== "situacion") return false;
  const localSubs = localV.subTareas ?? [];
  if (localSubs.length === 0) return false;
  const fbSubs = firebaseV.subTareas ?? [];
  if (fbSubs.length === 0) return true;
  if (localSubs.length > fbSubs.length) return true;
  if (countSubTareasCerradas(localSubs) > countSubTareasCerradas(fbSubs)) return true;
  const localCron = localSubs.filter(st => st.enDesgloseCronometro).length;
  const fbCron = fbSubs.filter(st => st.enDesgloseCronometro).length;
  if (localCron > fbCron) return true;
  return false;
}

/** Conserva subs locales cuando Firebase pierde el array al cerrar el desglosador. */
export function shouldPreferLocalSubVehiculos(firebaseV: Vehicle, localV: Vehicle): boolean {
  if (firebaseV.tipoReloj !== "desglosador" || localV.tipoReloj !== "desglosador") return false;
  const localSubs = localV.subVehiculos ?? [];
  if (localSubs.length === 0) return false;
  const fbSubs = firebaseV.subVehiculos ?? [];
  if (fbSubs.length === 0) return true;
  if (localSubs.length > fbSubs.length) return true;
  if (countSubsCerrados(localSubs) > countSubsCerrados(fbSubs)) return true;
  if (activeSubId(localSubs) !== activeSubId(fbSubs)) return true;
  return false;
}

function withMergedSubVehiculos(base: Vehicle, firebaseV: Vehicle, localV: Vehicle): Vehicle {
  if (
    shouldPreferLocalSubVehiculos(base, localV) ||
    (firebaseV.tipoReloj === "desglosador" &&
      localV.tipoReloj === "desglosador" &&
      (localV.subVehiculos?.length ?? 0) > 0)
  ) {
    return {
      ...base,
      subVehiculos: mergeSubVehiculosById(base.subVehiculos, localV.subVehiculos),
    };
  }
  return base;
}

/** Nunca retrocede la apertura consciente al fusionar local ↔ Firebase. */
export function pickMergedAperturaAt(firebaseV: Vehicle, localV: Vehicle): number | undefined {
  const fa = firebaseV.aperturaAt;
  const la = localV.aperturaAt;
  if (la != null && fa != null) return Math.max(la, fa);
  return la ?? fa;
}

function finalizeSessionMerge(base: Vehicle, firebaseV: Vehicle, localV: Vehicle): Vehicle {
  let merged = withMergedSubVehiculos(
    { ...base, aperturaAt: pickMergedAperturaAt(firebaseV, localV) },
    firebaseV,
    localV
  );

  const termoDecisionSnapshot = mergeTermoDecisionSnapshots(
    firebaseV.termoDecisionSnapshot,
    localV.termoDecisionSnapshot
  );
  if (termoDecisionSnapshot) {
    merged = { ...merged, termoDecisionSnapshot };
  }

  if (firebaseV.tipoFlota === "situacion" && localV.tipoFlota === "situacion") {
    return applySituacionDesgloseMerge(merged, firebaseV, localV);
  }

  if (shouldPreferLocalSubTareas(firebaseV, localV)) {
    merged = {
      ...merged,
      subTareas: mergeSubTareasById(firebaseV.subTareas, localV.subTareas),
      situacionCronometro: pickSituacionCronometro(
        firebaseV.situacionCronometro,
        localV.situacionCronometro
      ),
      situacionCupoAnchor: pickSituacionCupoAnchor(
        firebaseV.situacionCupoAnchor,
        localV.situacionCupoAnchor
      ),
    };
  }

  return merged;
}

function mergeTermoDecisionSnapshots(
  a: Vehicle["termoDecisionSnapshot"],
  b: Vehicle["termoDecisionSnapshot"]
): Vehicle["termoDecisionSnapshot"] | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  if (a.journalDayStartMs !== b.journalDayStartMs) {
    return a.recordedAt >= b.recordedAt ? a : b;
  }
  return {
    journalDayStartMs: a.journalDayStartMs,
    subsDesglosadorCumplidos: Math.max(a.subsDesglosadorCumplidos, b.subsDesglosadorCumplidos),
    subsSituacionCumplidos: Math.max(a.subsSituacionCumplidos, b.subsSituacionCumplidos),
    misionesDirectas: Math.max(a.misionesDirectas, b.misionesDirectas),
    recordedAt: Math.max(a.recordedAt, b.recordedAt),
  };
}

export function mergeActiveVehicleSessionState(firebaseV: Vehicle, localV: Vehicle | undefined): Vehicle {
  const sealedRemote = applyVehicleSessionSeal(firebaseV);
  if (!localV) return sealedRemote;

  if (isVehicleSessionSealed(sealedRemote.id, sealedRemote.clientRequestId)) {
    return finalizeSessionMerge(sealedRemote, sealedRemote, localV);
  }

  if (localV.status !== "activo" && sealedRemote.status === "activo") {
    return finalizeSessionMerge(
      {
        ...sealedRemote,
        aperturaAt: pickMergedAperturaAt(sealedRemote, localV),
        status: localV.status,
        ...(localV.cierreAt != null ? { cierreAt: localV.cierreAt } : {}),
        ...(localV.duracionFinal != null ? { duracionFinal: localV.duracionFinal } : {}),
        ...(localV.cierreManual != null ? { cierreManual: localV.cierreManual } : {}),
        ...(localV.intensidadEnergeticaFin ? { intensidadEnergeticaFin: localV.intensidadEnergeticaFin } : {}),
        ...(localV.etiquetaSalida ? { etiquetaSalida: localV.etiquetaSalida } : {}),
        ...(localV.notaSalida != null ? { notaSalida: localV.notaSalida } : {}),
        ...(localV.termoDecisionSnapshot
          ? { termoDecisionSnapshot: localV.termoDecisionSnapshot }
          : {}),
        situacionCronometro: localV.situacionCronometro ?? null,
        situacionCupoAnchor: localV.situacionCupoAnchor ?? null,
        subVehiculos: localV.subVehiculos ?? sealedRemote.subVehiculos,
      },
      sealedRemote,
      localV
    );
  }

  if (sealedRemote.status !== "activo" || localV.status !== "activo") {
    return finalizeSessionMerge(sealedRemote, sealedRemote, localV);
  }

  let merged: Vehicle = {
    ...sealedRemote,
    aperturaAt: pickMergedAperturaAt(sealedRemote, localV),
  };

  if (localV.desglosadorBloqueDepthPsGranted != null) {
    merged = { ...merged, desglosadorBloqueDepthPsGranted: localV.desglosadorBloqueDepthPsGranted };
  }
  if (sealedRemote.tipoReloj === "desglosador" && localV.tipoReloj === "desglosador") {
    const localSubsDone =
      (localV.subVehiculos?.length ?? 0) > 0 &&
      localV.subVehiculos!.every(s => s.status === "cumplido" || s.status === "fallado");
    const localClosed = localV.status !== "activo" || localV.cierreAt != null;
    const keepPause = localV.interrupcionActiva === true && !!localV.desglosadorPausa?.subActivoId;
    merged = {
      ...merged,
      ...(localSubsDone && localClosed
        ? {
            status: localV.status !== "activo" ? localV.status : "cumplido",
            cierreAt: localV.cierreAt,
            duracionFinal: localV.duracionFinal,
            cierreManual: localV.cierreManual,
            interrupcionActiva: false,
            desglosadorPausa: undefined,
          }
        : {}),
      interrupcionActiva: keepPause || localV.interrupcionActiva === true,
      desglosadorPausa: keepPause
        ? localV.desglosadorPausa
        : localV.interrupcionActiva
          ? localV.desglosadorPausa
          : undefined,
      subVehiculos: localV.subVehiculos ?? merged.subVehiculos,
    };
  }

  return finalizeSessionMerge(merged, sealedRemote, localV);
}

/**
 * Interrupción situacional lanzada desde un desglosador que ya no espera ese cierre.
 * Incluye: padre cerrado/archivado, padre sin pausa activa, o padre ausente del snapshot.
 */
export function isOrphanDesglosadorInterrupt(
  vehicle: Vehicle,
  vehiclesById: Map<string, Vehicle>
): boolean {
  if (vehicle.status !== "activo" || vehicle.autoVerdad) return false;
  const parentId = vehicle.vehiculoPadreDesglosadorId;
  if (!parentId) return false;
  const parent = vehiclesById.get(parentId);
  if (!parent) return true;
  if (parent.status !== "activo") return true;
  // Pausa válida tras cerrar interrupción: el padre sigue en pausa hasta reanudación manual.
  if (parent.interrupcionActiva && parent.desglosadorPausa?.subActivoId) return false;
  return !parent.interrupcionActiva;
}

/** Archiva interrupciones huérfanas en lugar de eliminarlas del listado (preserva historial). */
export function archiveOrphanDesglosadorInterrupts(
  vehicles: Vehicle[],
  nowMs: number = Date.now()
): Vehicle[] {
  const byId = new Map(vehicles.map(v => [v.id, v]));
  let changed = false;
  const next = vehicles.map(v => {
    if (!isOrphanDesglosadorInterrupt(v, byId)) return v;
    changed = true;
    const apertura = v.aperturaAt || v.createdAt?.getTime?.() || nowMs;
    return {
      ...v,
      status: "archivado" as const,
      cierreAt: v.cierreAt ?? nowMs,
      duracionFinal: v.duracionFinal ?? Math.max(1, Math.round((nowMs - apertura) / 60000)),
      cierreManual: false,
    };
  });
  return changed ? next : vehicles;
}

/** Desglosador activo en pausa sin vehículo de interrupción visible — libera la cola de subs. */
export function clearStuckDesglosadorPause(
  vehicles: Vehicle[],
  hasOpenInterrupt: (parentId: string) => boolean
): Vehicle[] {
  let changed = false;
  const next = vehicles.map(v => {
    if (
      v.tipoReloj !== "desglosador" ||
      v.status !== "activo" ||
      !v.interrupcionActiva ||
      hasOpenInterrupt(v.id)
    ) {
      return v;
    }
    // Pausa con snapshot = interrupción cerrada, esperando «Reanudar desglosador ahora».
    if (v.desglosadorPausa?.subActivoId) {
      return v;
    }
    changed = true;
    return { ...v, interrupcionActiva: false, desglosadorPausa: undefined };
  });
  return changed ? next : vehicles;
}
