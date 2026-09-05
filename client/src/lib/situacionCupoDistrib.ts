import { formatHHMM } from "./desglosadorClock";
import { aplicarProyectoHeredadoASub, dominanteProyectoIdEnSubs } from "./imanPensamientos";
import type { SubTarea, Vehicle } from "./persistence";
import { computeSafeRemainingMs } from "./hardwareClock";
import { situacionContratoFinMs } from "./situacionGanancia";

export function situacionFilaCronometroPendiente(st: SubTarea): boolean {
  return !!st.enDesgloseCronometro && (st.resultadoSituacion ?? "pendiente") === "pendiente";
}

/** Solo sincronizar ancla de cupo cuando hay ring activo o filas con minutos asignados. */
export function vehicleNeedsCupoAnchorSync(v: Vehicle): boolean {
  if (v.tipoFlota !== "situacion" || v.status !== "activo") return false;
  if (v.situacionCronometro?.activo === true) return true;
  return (v.subTareas || []).some(st => (st.minutosCupo ?? 0) > 0);
}

export function situacionFilaEnFocoPendiente(st: SubTarea): boolean {
  if ((st.minutosCupo ?? 0) <= 0) return false;
  if (st.enDesgloseCronometro) return situacionFilaCronometroPendiente(st);
  return !st.completada;
}

/** True cuando debe mostrarse la cuenta regresiva situacional (cronómetro o fila en foco). */
export function situacionRelojDebeMostrarse(
  vehicle: Pick<
    Vehicle,
    | "tipoFlota"
    | "status"
    | "subTareas"
    | "situacionCronometro"
    | "situacionCupoAnchor"
    | "situacionNestedPause"
  >
): boolean {
  if (vehicle.tipoFlota !== "situacion" || vehicle.status !== "activo") return false;
  if (vehicle.situacionNestedPause) return false;
  const subs = vehicle.subTareas || [];
  if (vehicle.situacionCronometro?.activo === true) {
    if (sumMinutosCronometroPendientes(subs) > 0) return true;
    const firstCron = filasCronometroOrdenadas(subs).find(situacionFilaCronometroPendiente);
    if (firstCron && (firstCron.minutosCupo ?? 0) > 0) return true;
  }
  const anchor = vehicle.situacionCupoAnchor;
  if (anchor?.subTareaId) {
    const sub = subs.find(s => s.id === anchor.subTareaId);
    if (sub && situacionFilaEnFocoPendiente(sub)) return true;
  }
  return false;
}

/** True si `subTareaId` es la única fila pendiente del ring. */
export function isUltimaPendienteCronometro(
  subTareas: SubTarea[] | undefined,
  subTareaId: string
): boolean {
  const pending = filasCronometroOrdenadas(subTareas || []).filter(situacionFilaCronometroPendiente);
  return pending.length === 1 && pending[0]!.id === subTareaId;
}

/** Hora objetivo del reloj situacional: fila en foco, o primera fila del cronómetro mientras sincroniza ancla. */
export function situacionTargetMsReloj(
  vehicle: Pick<Vehicle, "tipoFlota" | "subTareas" | "situacionCronometro" | "situacionCupoAnchor" | "aperturaAt">,
  now = Date.now()
): number | null {
  if (vehicle.tipoFlota !== "situacion") return null;
  const subs = vehicle.subTareas || [];
  const sc = vehicle.situacionCronometro;
  const aperturaMs = vehicle.aperturaAt ?? now;
  const anchor = vehicle.situacionCupoAnchor;

  if (anchor?.subTareaId) {
    const sub = subs.find(s => s.id === anchor.subTareaId);
    if (sub && situacionFilaEnFocoPendiente(sub) && (sub.minutosCupo ?? 0) > 0) {
      const planned = anchor.startedAt + sub.minutosCupo! * 60000;
      const meta = sc?.horaFinContratoMs ?? sc?.horaFinMs;
      // Última en cola: TERMINA FOCO se guía por la meta sellada (no se queda corto).
      if (meta != null && isUltimaPendienteCronometro(subs, anchor.subTareaId) && planned < meta) {
        return meta;
      }
      return planned;
    }
  }

  if (sc?.activo) {
    const firstPending = filasCronometroOrdenadas(subs).find(situacionFilaCronometroPendiente);
    if (firstPending && (firstPending.minutosCupo ?? 0) > 0) {
      const start = sc.bloqueInicioAt ?? aperturaMs;
      return start + firstPending.minutosCupo! * 60000;
    }
    const proy = computeSituacionProyeccionFinMs(subs, {
      bloqueInicioAt: sc.bloqueInicioAt ?? aperturaMs,
      anchor,
      now,
      horaFinContratoMs: sc.horaFinContratoMs ?? sc.horaFinMs,
    });
    if (proy != null) return proy;
    const contrato = sc.horaFinContratoMs ?? sc.horaFinMs;
    if (contrato != null) return contrato;
    const sum = sumMinutosCronometroPendientes(subs);
    if (sum > 0) return (sc.bloqueInicioAt ?? aperturaMs) + sum * 60000;
  }

  return null;
}

/** Fin proyectado del bloque según filas pendientes y tiempo ganado en vivo. Nunca supera la meta. */
export function computeSituacionProyeccionFinMs(
  subTareas: SubTarea[],
  opts: {
    bloqueInicioAt: number;
    anchor?: { subTareaId: string; startedAt: number } | null;
    now?: number;
    saldoAdelantoMin?: number;
    horaFinContratoMs?: number | null;
  }
): number | null {
  const horarios = computeSituacionCronometroHorarios(subTareas, {
    bloqueInicioAt: opts.bloqueInicioAt,
    anchor: opts.anchor,
    now: opts.now,
    previewTiempoGanado: true,
    saldoAdelantoMin: opts.saldoAdelantoMin,
    horaFinContratoMs: opts.horaFinContratoMs,
  });
  if (horarios.length === 0) return null;
  const raw = horarios[horarios.length - 1]!.finMs;
  return capSituacionProyeccionFinMs(raw, opts.horaFinContratoMs);
}

/** Minutos de pared restantes hasta la meta sellada (mínimo 0). */
export function situacionWallMinHastaMeta(contratoMs: number | null | undefined, nowMs: number = Date.now()): number | null {
  if (contratoMs == null) return null;
  return Math.max(0, Math.round((contratoMs - nowMs) / 60000));
}

/** La proyección nunca supera la meta sellada. */
export function capSituacionProyeccionFinMs(
  proyMs: number | null,
  contratoMs: number | null | undefined
): number | null {
  if (proyMs == null) return null;
  if (contratoMs == null) return proyMs;
  return Math.min(proyMs, contratoMs);
}

/** Minutos de ventaja vs contrato sellado (positivo = vas ganando). */
export function situacionGananciaVsContratoMin(
  contratoMs: number | null,
  proyeccionMs: number | null
): number | null {
  if (contratoMs == null || proyeccionMs == null) return null;
  return Math.round((contratoMs - proyeccionMs) / 60000);
}

export function isCupoFijo(st: SubTarea): boolean {
  return st.cupoFijo === true && (st.minutosCupo ?? 0) > 0;
}

export function sumMinutosCronometroPendientes(subTareas: SubTarea[] | undefined): number {
  return (subTareas || []).filter(situacionFilaCronometroPendiente).reduce((a, st) => a + (st.minutosCupo ?? 0), 0);
}

export function filasCronometroOrdenadas(subTareas: SubTarea[]): SubTarea[] {
  return (subTareas || []).filter(st => st.enDesgloseCronometro);
}

export type SituacionCupoAnchorRef = { subTareaId: string; startedAt: number };

/** Ancla de foco en ring: avanza a la siguiente fila cuando la actual agotó cupo sin cerrarse. */
export function resolveCronometroCupoAnchor(
  subTareas: SubTarea[],
  cur: SituacionCupoAnchorRef | null | undefined,
  opts?: { forceResetSameRow?: boolean; now?: number }
): SituacionCupoAnchorRef | null | "unchanged" {
  const now = opts?.now ?? Date.now();
  const cronPending = filasCronometroOrdenadas(subTareas).filter(situacionFilaCronometroPendiente);
  if (cronPending.length === 0) return null;

  // Cumplido/Fallado: siempre ancla nueva con startedAt=now sobre la primera pendiente.
  // Sin esto, la deuda de la fila cerrada se hereda y el island muestra DEUDA ACUMULADA.
  if (opts?.forceResetSameRow) {
    const first = cronPending.find(st => (st.minutosCupo ?? 0) > 0) ?? cronPending[0];
    if (!first) return null;
    return { subTareaId: first.id, startedAt: now };
  }

  if (cur?.subTareaId) {
    const curSub = subTareas.find(s => s.id === cur.subTareaId);
    if (curSub && situacionFilaCronometroPendiente(curSub) && (curSub.minutosCupo ?? 0) > 0) {
      if (computeSafeRemainingMs(cur.startedAt, curSub.minutosCupo ?? 0, now) > 0) return "unchanged";
      const idx = cronPending.findIndex(s => s.id === cur.subTareaId);
      const nextSub = idx >= 0 ? cronPending[idx + 1] : undefined;
      if (nextSub) return { subTareaId: nextSub.id, startedAt: now };
      return "unchanged";
    }
  }

  const first = cronPending.find(st => (st.minutosCupo ?? 0) > 0) ?? cronPending[0];
  if (!first) return null;
  if (cur?.subTareaId === first.id) return "unchanged";
  return { subTareaId: first.id, startedAt: now };
}

/** Reparte `total` entre slots con pesos (mín. `minPerSlot` por slot). */
function repartirProporcional(weights: number[], total: number, minPerSlot = 1): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const totalClamped = Math.max(n * minPerSlot, Math.round(total));
  const ws = weights.map(w => Math.max(1, w));
  const sumW = ws.reduce((a, b) => a + b, 0);
  const floors = ws.map(w => Math.max(minPerSlot, Math.floor((totalClamped * w) / sumW)));
  const alloc = [...floors];
  let diff = totalClamped - alloc.reduce((a, b) => a + b, 0);
  let j = 0;
  while (diff > 0) {
    alloc[j % n] += 1;
    diff -= 1;
    j += 1;
  }
  j = 0;
  while (diff < 0 && j < n * 200) {
    const idx = j % n;
    if (alloc[idx] > minPerSlot) {
      alloc[idx] -= 1;
      diff += 1;
    }
    j += 1;
  }
  return alloc;
}

/** Reparte minutos ganados en minutosCupo de filas pendientes posteriores (peso = cupo objetivo). */
export function repartirMinutosGanadosACupo(
  subTareas: SubTarea[],
  minutosGanados: number,
  afterSubTareaId?: string,
  opts?: { includeCupoFijo?: boolean }
): { subTareas: SubTarea[]; minutosRepartidos: number } {
  if (minutosGanados <= 0) return { subTareas, minutosRepartidos: 0 };
  const cronOrder = filasCronometroOrdenadas(subTareas);
  const afterIdx = afterSubTareaId ? cronOrder.findIndex(st => st.id === afterSubTareaId) : -1;

  const pendingTargets = subTareas
    .map((st, i) => ({ st, i }))
    .filter(({ st }) => {
      if (!situacionFilaCronometroPendiente(st)) return false;
      if (afterSubTareaId) {
        const orderIdx = cronOrder.findIndex(c => c.id === st.id);
        if (orderIdx <= afterIdx) return false;
      }
      if (!opts?.includeCupoFijo && isCupoFijo(st)) return false;
      return true;
    });
  if (pendingTargets.length === 0) return { subTareas, minutosRepartidos: 0 };

  const bonus = repartirProporcional(
    pendingTargets.map(({ st }) => Math.max(1, st.minutosCupo ?? 1)),
    minutosGanados,
    0
  );
  const minutosRepartidos = bonus.reduce((a, b) => a + b, 0);
  const next = [...subTareas];
  pendingTargets.forEach(({ st, i }, k) => {
    if (bonus[k]! <= 0) return;
    next[i] = {
      ...st,
      minutosCupo: (st.minutosCupo ?? 0) + bonus[k]!,
    };
  });
  return { subTareas: next, minutosRepartidos };
}

/**
 * Reparte ganancia (+) o pérdida (−) vs tiempo meta entre TODAS las filas pendientes del ring.
 * Ganancia: suma cupo proporcional (incluye cupoFijo). Pérdida: resta solo de flexibles.
 */
export function repartirDeltaMinutosEnCola(
  subTareas: SubTarea[],
  deltaMinutos: number,
  opts?: { excludeSubTareaIds?: string[] }
): { subTareas: SubTarea[]; repartido: number } {
  if (deltaMinutos === 0) return { subTareas, repartido: 0 };
  const exclude = new Set(opts?.excludeSubTareaIds ?? []);

  const pendingTargets = subTareas
    .map((st, i) => ({ st, i }))
    .filter(({ st }) => situacionFilaCronometroPendiente(st) && !exclude.has(st.id));
  if (pendingTargets.length === 0) return { subTareas, repartido: 0 };

  const next = [...subTareas];

  if (deltaMinutos > 0) {
    const bonus = repartirProporcional(
      pendingTargets.map(({ st }) => Math.max(1, st.minutosCupo ?? 1)),
      deltaMinutos,
      0
    );
    const repartido = bonus.reduce((a, b) => a + b, 0);
    pendingTargets.forEach(({ st, i }, k) => {
      if (bonus[k]! <= 0) return;
      next[i] = { ...st, minutosCupo: (st.minutosCupo ?? 0) + bonus[k]! };
    });
    return { subTareas: next, repartido };
  }

  const loss = Math.abs(deltaMinutos);
  const flexTargets = pendingTargets.filter(({ st }) => !isCupoFijo(st) && (st.minutosCupo ?? 0) > 0);
  if (flexTargets.length === 0) return { subTareas, repartido: 0 };

  const disponible = flexTargets.reduce((a, { st }) => a + (st.minutosCupo ?? 0), 0);
  const toTake = Math.min(loss, disponible);
  if (toTake <= 0) return { subTareas, repartido: 0 };

  const takeAlloc = repartirProporcional(
    flexTargets.map(({ st }) => st.minutosCupo ?? 1),
    toTake,
    0
  );
  flexTargets.forEach(({ st, i }, k) => {
    const take = takeAlloc[k]!;
    if (take <= 0) return;
    const newMin = (st.minutosCupo ?? 0) - take;
    if (newMin <= 0) {
      const row = { ...next[i] };
      delete (row as { minutosCupo?: number }).minutosCupo;
      delete (row as { cupoFijo?: boolean }).cupoFijo;
      next[i] = row;
    } else {
      next[i] = { ...st, minutosCupo: newMin };
    }
  });
  return { subTareas: next, repartido: -toTake };
}

/** @deprecated Usar repartirMinutosGanadosACupo — conservado como alias interno. */
function repartirMinutosGanadosAcum(
  subTareas: SubTarea[],
  minutosGanados: number,
  excludeSubTareaIds: string[],
  opts?: { includeCupoFijo?: boolean }
): SubTarea[] {
  const excludeId = excludeSubTareaIds[0];
  return repartirMinutosGanadosACupo(subTareas, minutosGanados, excludeId, opts).subTareas;
}

function transferirMinutosAlFoco(
  subTareas: SubTarea[],
  focusSubTareaId: string,
  minutos: number
): SubTarea[] {
  if (minutos <= 0) return subTareas;
  const focoIdx = subTareas.findIndex(st => st.id === focusSubTareaId);
  if (focoIdx === -1) return subTareas;
  const foco = subTareas[focoIdx];
  if (!situacionFilaCronometroPendiente(foco)) return subTareas;
  const next = [...subTareas];
  next[focoIdx] = {
    ...foco,
    minutosCupo: (foco.minutosCupo ?? 0) + minutos,
  };
  return next;
}

export type DescontarFlexiblesResult =
  | { ok: true; subTareas: SubTarea[]; descontado: number }
  | { ok: false; reason: "sin_flexibles" | "insuficiente"; disponible: number };

/** Resta minutos solo de filas posteriores pendientes en cronómetro sin cupo fijo. */
export function descontarMinutosDeFlexiblesPosteriores(
  subTareas: SubTarea[],
  subTareaId: string,
  delta: number
): DescontarFlexiblesResult {
  if (delta <= 0) return { ok: false, reason: "insuficiente", disponible: 0 };
  const idx = subTareas.findIndex(st => st.id === subTareaId);
  if (idx === -1) return { ok: false, reason: "sin_flexibles", disponible: 0 };

  const flexTargets = subTareas
    .map((st, i) => ({ st, i }))
    .filter(
      ({ st, i }) =>
        i > idx &&
        situacionFilaCronometroPendiente(st) &&
        !isCupoFijo(st) &&
        (st.minutosCupo ?? 0) > 0
    );

  const disponible = flexTargets.reduce((a, { st }) => a + (st.minutosCupo ?? 0), 0);
  if (flexTargets.length === 0) return { ok: false, reason: "sin_flexibles", disponible: 0 };
  if (disponible < delta) return { ok: false, reason: "insuficiente", disponible };

  let remaining = delta;
  const next = [...subTareas];
  for (const { st, i } of flexTargets) {
    if (remaining <= 0) break;
    const cur = st.minutosCupo ?? 0;
    const take = Math.min(cur, remaining);
    const newMin = cur - take;
    if (newMin <= 0) {
      const row = { ...next[i] };
      delete (row as { minutosCupo?: number }).minutosCupo;
      delete (row as { cupoFijo?: boolean }).cupoFijo;
      next[i] = row;
    } else {
      next[i] = { ...st, minutosCupo: newMin };
    }
    remaining -= take;
  }

  return { ok: true, subTareas: next, descontado: delta };
}

export type QuitarHaciaFocoResult =
  | { ok: true; subTareas: SubTarea[]; descontado: number; focoGanado: number }
  | { ok: false; reason: "sin_flexibles" | "insuficiente" | "sin_foco" | "foco_no_pendiente"; disponible?: number };

/** Quitar min de cola posterior y transferir a la fila foco (Σ cupos constante). */
export function quitarMinutosHaciaFoco(
  subTareas: SubTarea[],
  fromSubTareaId: string,
  focusSubTareaId: string,
  delta: number
): QuitarHaciaFocoResult {
  const discount = descontarMinutosDeFlexiblesPosteriores(subTareas, fromSubTareaId, delta);
  if (!discount.ok) {
    return {
      ok: false,
      reason: discount.reason,
      disponible: discount.disponible,
    };
  }

  const focoIdx = discount.subTareas.findIndex(st => st.id === focusSubTareaId);
  if (focoIdx === -1) return { ok: false, reason: "sin_foco" };

  const foco = discount.subTareas[focoIdx];
  if (!situacionFilaCronometroPendiente(foco)) {
    return { ok: false, reason: "foco_no_pendiente" };
  }

  const next = [...discount.subTareas];
  next[focoIdx] = {
    ...foco,
    minutosCupo: (foco.minutosCupo ?? 0) + discount.descontado,
  };

  return {
    ok: true,
    subTareas: next,
    descontado: discount.descontado,
    focoGanado: discount.descontado,
  };
}

function inicioMsFilaCronometro(
  subTareas: SubTarea[],
  subTareaId: string,
  bloqueInicioAt: number,
  anchor?: { subTareaId: string; startedAt: number } | null
): number {
  const cronRows = filasCronometroOrdenadas(subTareas);
  let cursor = bloqueInicioAt;
  for (const st of cronRows) {
    if (st.id === subTareaId) {
      if (anchor?.subTareaId === st.id) return anchor.startedAt;
      return cursor;
    }
    if (!situacionFilaCronometroPendiente(st)) {
      const durationSec =
        st.duracionRealSec != null
          ? st.duracionRealSec
          : Math.max(0, (st.minutosCupo ?? 0) * 60);
      cursor = (st.cerradaAt ?? cursor + durationSec * 1000);
    } else if (anchor?.subTareaId === st.id) {
      cursor = anchor.startedAt + (st.minutosCupo ?? 0) * 60000;
    } else {
      cursor += (st.minutosCupo ?? 0) * 60000;
    }
  }
  return bloqueInicioAt;
}

/**
 * Rellena cupos pendientes hasta el tiempo de pared a la meta.
 * El sobrante va a la última fila flexible (o a la última pendiente).
 * Con ancla: cuenta solo el resto del foco (no el cupo ya consumido).
 */
export function expandirColaCronometroHastaMeta(
  subTareas: SubTarea[],
  horaFinContratoMs: number,
  nowMs: number = Date.now(),
  anchor?: { subTareaId: string; startedAt: number } | null
): SubTarea[] {
  const wallMin = situacionWallMinHastaMeta(horaFinContratoMs, nowMs);
  if (wallMin == null || wallMin <= 0) return subTareas;

  const pending = filasCronometroOrdenadas(subTareas).filter(situacionFilaCronometroPendiente);
  if (pending.length === 0) return subTareas;

  let committedMin = 0;
  for (const st of pending) {
    const cupo = st.minutosCupo ?? 0;
    if (anchor?.subTareaId === st.id) {
      const elapsed = Math.floor(Math.max(0, nowMs - anchor.startedAt) / 60000);
      committedMin += Math.max(0, cupo - elapsed);
    } else {
      committedMin += cupo;
    }
  }
  const slack = Math.max(0, wallMin - committedMin);
  if (slack <= 0) return subTareas;

  const lastFlex =
    [...pending].reverse().find(st => !isCupoFijo(st)) ?? pending[pending.length - 1]!;
  return transferirMinutosAlFoco(subTareas, lastFlex.id, slack);
}

/** Copia virtual: minutos ganados en foco → cupo extra en cola; si no hay cola, estira el foco a la meta. */
function aplicarPreviewTiempoGanado(
  subTareas: SubTarea[],
  anchor: { subTareaId: string; startedAt: number },
  now: number,
  horaFinContratoMs?: number | null
): SubTarea[] {
  const focal = subTareas.find(st => st.id === anchor.subTareaId);
  if (!focal || !situacionFilaCronometroPendiente(focal)) return subTareas;
  const cupoMin = focal.minutosCupo ?? 0;
  if (cupoMin <= 0) return subTareas;
  const elapsedMin = Math.floor(Math.max(0, now - anchor.startedAt) / 60000);
  const minutosVirtualesGanados = Math.max(0, cupoMin - elapsedMin);

  let next = subTareas;
  if (minutosVirtualesGanados > 0) {
    let toQueue = minutosVirtualesGanados;
    if (horaFinContratoMs != null) {
      const wallMin = situacionWallMinHastaMeta(horaFinContratoMs, now) ?? 0;
      const focusRemainMin = Math.max(0, cupoMin - elapsedMin);
      const othersMin = sumMinutosCronometroPendientes(subTareas) - cupoMin;
      const slack = Math.max(0, wallMin - focusRemainMin - othersMin);
      toQueue = Math.min(minutosVirtualesGanados, slack);
    }
    if (toQueue > 0) {
      const others = repartirDeltaMinutosEnCola(subTareas, toQueue, {
        excludeSubTareaIds: [anchor.subTareaId],
      });
      // Sin cola posterior: el preview no podía “repartir”; el estirado a meta lo cubre abajo.
      next = others.repartido > 0 ? others.subTareas : subTareas;
    }
  }

  if (horaFinContratoMs != null) {
    next = expandirColaCronometroHastaMeta(next, horaFinContratoMs, now, anchor);
  }
  return next;
}

/** Suma minutos de preview repartidos en filas pendientes posteriores al foco. */
export function sumBonusPreviewEnColaPendiente(
  subTareas: SubTarea[],
  anchor: { subTareaId: string; startedAt: number } | null | undefined,
  now?: number,
  horaFinContratoMs?: number | null
): number {
  if (!anchor?.subTareaId) return 0;
  const t = now ?? Date.now();
  const effective = aplicarPreviewTiempoGanado(subTareas, anchor, t, horaFinContratoMs);
  const effById = new Map(filasCronometroOrdenadas(effective).map(st => [st.id, st]));
  let bonus = 0;
  for (const st of filasCronometroOrdenadas(subTareas)) {
    if (!situacionFilaCronometroPendiente(st)) continue;
    if (st.id === anchor.subTareaId) continue;
    const eff = effById.get(st.id);
    bonus += Math.max(0, (eff?.minutosCupo ?? 0) - (st.minutosCupo ?? 0));
  }
  return bonus;
}

export type SituacionFilaHorario = {
  subTareaId: string;
  inicioMs: number;
  finMs: number;
  finLabel: string;
  minutosCupo: number;
  enFoco: boolean;
  pendiente: boolean;
};

export function computeSituacionCronometroHorarios(
  subTareas: SubTarea[],
  opts: {
    bloqueInicioAt: number;
    anchor?: { subTareaId: string; startedAt: number } | null;
    now?: number;
    previewTiempoGanado?: boolean;
    saldoAdelantoMin?: number;
    horaFinContratoMs?: number | null;
  }
): SituacionFilaHorario[] {
  const now = opts.now ?? Date.now();
  let effectiveSubs = subTareas;
  if (opts.previewTiempoGanado && opts.anchor) {
    effectiveSubs = aplicarPreviewTiempoGanado(
      subTareas,
      opts.anchor,
      now,
      opts.horaFinContratoMs
    );
  }
  const cronRows = filasCronometroOrdenadas(effectiveSubs);
  const cupoById = new Map(effectiveSubs.map(st => [st.id, st.minutosCupo ?? 0]));
  if (cronRows.length === 0) return [];

  const metaMs = opts.horaFinContratoMs ?? null;

  let cursor = opts.bloqueInicioAt;
  const out: SituacionFilaHorario[] = [];

  for (const st of cronRows) {
    const pendiente = situacionFilaCronometroPendiente(st);
    const enFoco = pendiente && opts.anchor?.subTareaId === st.id;
    const minutosCupo = cupoById.get(st.id) ?? st.minutosCupo ?? 0;

    if (!pendiente) {
      const durationSec =
        st.duracionRealSec != null
          ? st.duracionRealSec
          : Math.max(0, minutosCupo * 60);
      const inicioMs = cursor;
      let finMs = st.cerradaAt ?? inicioMs + durationSec * 1000;
      if (metaMs != null) finMs = Math.min(finMs, metaMs);
      cursor = finMs;
      out.push({
        subTareaId: st.id,
        inicioMs,
        finMs,
        finLabel: formatHHMM(finMs),
        minutosCupo,
        enFoco: false,
        pendiente: false,
      });
      continue;
    }

    let inicioMs: number;
    let finMs: number;

    if (enFoco && opts.anchor) {
      inicioMs = opts.anchor.startedAt;
      const plannedFinMs = inicioMs + minutosCupo * 60000;
      finMs = metaMs != null ? Math.min(plannedFinMs, metaMs) : plannedFinMs;
      const ahead = opts.previewTiempoGanado && now < plannedFinMs;
      cursor = ahead ? Math.min(now, metaMs ?? now) : finMs;
    } else {
      inicioMs = cursor;
      finMs = inicioMs + minutosCupo * 60000;
      if (metaMs != null) finMs = Math.min(finMs, metaMs);
      cursor = finMs;
    }

    out.push({
      subTareaId: st.id,
      inicioMs,
      finMs,
      finLabel: formatHHMM(finMs),
      minutosCupo,
      enFoco,
      pendiente: true,
    });

    if (metaMs != null && cursor >= metaMs) break;
  }

  return out;
}

/** Reparte ganancia en cola sin superar el margen hasta la meta; el excedente va a saldoAdelantoMin. */
function repartirGananciaRespetandoMeta(
  subTareas: SubTarea[],
  minutosGanados: number,
  closedSubTareaId: string,
  anchor: { subTareaId: string; startedAt: number } | null | undefined,
  horaFinContratoMs: number | undefined,
  now: number
): { subTareas: SubTarea[]; saldoAdelantoMin: number } {
  if (minutosGanados <= 0) return { subTareas, saldoAdelantoMin: 0 };

  let toQueue = minutosGanados;
  if (horaFinContratoMs != null) {
    const wallMin = situacionWallMinHastaMeta(horaFinContratoMs, now) ?? 0;
    const pendingSum = sumMinutosCronometroPendientes(subTareas);
    const slack = Math.max(0, wallMin - pendingSum);
    toQueue = Math.min(minutosGanados, slack);
  }

  const saldoAdelantoMin = minutosGanados - toQueue;
  if (toQueue <= 0) return { subTareas, saldoAdelantoMin };

  return {
    subTareas: repartirGananciaDopamina(subTareas, toQueue, closedSubTareaId, anchor),
    saldoAdelantoMin,
  };
}

/** Reparte ganancia: foco → cola proporcional al cupo; fuera de foco → todo al foco activo. */
function repartirGananciaDopamina(
  subTareas: SubTarea[],
  minutosGanados: number,
  closedSubTareaId: string,
  anchor: { subTareaId: string; startedAt: number } | null | undefined
): SubTarea[] {
  if (minutosGanados <= 0) return subTareas;

  const eraFoco = anchor?.subTareaId === closedSubTareaId;
  if (eraFoco) {
    const { subTareas: conCola, minutosRepartidos } = repartirMinutosGanadosACupo(
      subTareas,
      minutosGanados,
      closedSubTareaId
    );
    const restante = minutosGanados - minutosRepartidos;
    if (restante <= 0) return conCola;
    const focusId = resolveFocusSubTareaId(conCola, anchor);
    if (focusId) return transferirMinutosAlFoco(conCola, focusId, restante);
    return conCola;
  }

  const focusId = resolveFocusSubTareaId(subTareas, anchor);
  if (focusId) return transferirMinutosAlFoco(subTareas, focusId, minutosGanados);
  return repartirMinutosGanadosACupo(subTareas, minutosGanados, closedSubTareaId).subTareas;
}

/** Minutos ganados en vivo en la fila foco (aún no cerrada). */
export function minutosGanadosEnVivoFoco(
  subTareas: SubTarea[],
  anchor: { subTareaId: string; startedAt: number } | null | undefined,
  now: number = Date.now()
): number {
  if (!anchor?.subTareaId) return 0;
  const focal = subTareas.find(st => st.id === anchor.subTareaId);
  if (!focal || !situacionFilaCronometroPendiente(focal)) return 0;
  const cupoMin = focal.minutosCupo ?? 0;
  if (cupoMin <= 0) return 0;
  const elapsedMs = Math.max(0, now - anchor.startedAt);
  // Tras handoff CUMPLIDO startedAt≈now: ceil(1ms/60s)=1 → “+9 min ganados” fantasma.
  // No mostrar ganancia hasta cumplir al menos 1 min real en la fila.
  if (elapsedMs < 60_000) return 0;
  const elapsedMin = Math.ceil(elapsedMs / 60000);
  return Math.max(0, cupoMin - elapsedMin);
}

function calcDeltaCierreCronometro(
  target: SubTarea,
  anchor: { subTareaId: string; startedAt: number } | null | undefined,
  now: number,
  bloqueInicioAt: number,
  subTareas: SubTarea[]
): { duracionRealSec: number; deltaMinutosVsMeta: number } {
  const cupoMin = target.minutosCupo ?? 0;
  let duracionRealSec = Math.max(0, cupoMin * 60);

  if (cupoMin <= 0) {
    return { duracionRealSec: 0, deltaMinutosVsMeta: 0 };
  }

  if (anchor?.subTareaId === target.id) {
    duracionRealSec = Math.max(0, Math.floor((now - anchor.startedAt) / 1000));
  } else {
    const inicio = inicioMsFilaCronometro(subTareas, target.id, bloqueInicioAt, anchor);
    duracionRealSec = Math.max(0, Math.floor((now - inicio) / 1000));
  }

  const elapsedMin = Math.ceil(duracionRealSec / 60);
  return { duracionRealSec, deltaMinutosVsMeta: cupoMin - elapsedMin };
}

/**
 * Al marcar cumplido: registra duración real y reparte minutos ganados (meta sellada intacta).
 * La ganancia entra en la cola solo dentro del margen hasta la meta; el resto queda en saldoAdelantoMin.
 */
export function aplicarTiempoGanadoAlCumplir(
  subTareas: SubTarea[],
  subTareaId: string,
  anchor: { subTareaId: string; startedAt: number } | null | undefined,
  now: number,
  bloqueInicioAt?: number,
  horaFinContratoMs?: number
): { subTareas: SubTarea[]; minutosGanados: number; saldoAdelantoMin: number } {
  const target = subTareas.find(st => st.id === subTareaId);
  if (!target?.enDesgloseCronometro || (target.resultadoSituacion ?? "pendiente") !== "pendiente") {
    return { subTareas, minutosGanados: 0, saldoAdelantoMin: 0 };
  }

  const baseInicio = bloqueInicioAt ?? now;
  const { duracionRealSec, deltaMinutosVsMeta } = calcDeltaCierreCronometro(
    target,
    anchor,
    now,
    baseInicio,
    subTareas
  );

  let next = subTareas.map(st =>
    st.id === subTareaId
      ? {
          ...st,
          completada: true,
          resultadoSituacion: "cumplido" as const,
          duracionRealSec,
          cerradaAt: now,
        }
      : st
  );

  let minutosGanados = 0;
  let saldoAdelantoMin = 0;
  if (deltaMinutosVsMeta !== 0) {
    const { subTareas: repartidas, repartido } = repartirDeltaMinutosEnCola(next, deltaMinutosVsMeta);
    next = repartidas;
    if (deltaMinutosVsMeta > 0) {
      minutosGanados = deltaMinutosVsMeta;
      if (repartido < deltaMinutosVsMeta) {
        saldoAdelantoMin = deltaMinutosVsMeta - repartido;
      }
    }
  }

  // Tras repartir: si aún falta pared hasta la meta, estirar la última pendiente.
  if (horaFinContratoMs != null && next.some(situacionFilaCronometroPendiente)) {
    const resolved = resolveCronometroCupoAnchor(next, anchor, { forceResetSameRow: true, now });
    const expandAnchor = resolved === "unchanged" ? (anchor ?? null) : resolved;
    next = expandirColaCronometroHastaMeta(next, horaFinContratoMs, now, expandAnchor);
  }

  return { subTareas: next, minutosGanados, saldoAdelantoMin };
}

function committedPendingMinutos(
  subTareas: SubTarea[],
  nowMs: number,
  anchor?: { subTareaId: string; startedAt: number } | null
): number {
  const pending = filasCronometroOrdenadas(subTareas).filter(situacionFilaCronometroPendiente);
  let committedMin = 0;
  for (const st of pending) {
    const cupo = st.minutosCupo ?? 0;
    if (anchor?.subTareaId === st.id) {
      const elapsed = Math.floor(Math.max(0, nowMs - anchor.startedAt) / 60000);
      committedMin += Math.max(0, cupo - elapsed);
    } else {
      committedMin += cupo;
    }
  }
  return committedMin;
}

/**
 * Holgura de pared hasta el tope → todas las pendientes (incluye cupoFijo).
 * El siguiente vehículo recibe su parte; no se queda en el cupo original.
 */
export function repartirHolguraHastaMeta(
  subTareas: SubTarea[],
  horaFinContratoMs: number,
  nowMs: number = Date.now(),
  anchor?: { subTareaId: string; startedAt: number } | null
): SubTarea[] {
  const wallMin = situacionWallMinHastaMeta(horaFinContratoMs, nowMs);
  if (wallMin == null || wallMin <= 0) return subTareas;
  if (!subTareas.some(situacionFilaCronometroPendiente)) return subTareas;
  const slack = Math.max(0, wallMin - committedPendingMinutos(subTareas, nowMs, anchor));
  if (slack <= 0) return subTareas;
  return repartirDeltaMinutosEnCola(subTareas, slack).subTareas;
}

/**
 * Avance: sin veredicto de ganancia/pérdida, pero el tiempo no usado y la
 * holgura hasta el tope se suman a la cola (referencia = meta sellada).
 */
export function aplicarTiempoAlCerrarAvance(
  subTareas: SubTarea[],
  subTareaId: string,
  anchor: { subTareaId: string; startedAt: number } | null | undefined,
  now: number,
  bloqueInicioAt?: number,
  horaFinContratoMs?: number
): { subTareas: SubTarea[] } {
  const target = subTareas.find(st => st.id === subTareaId);
  if (!target?.enDesgloseCronometro || (target.resultadoSituacion ?? "pendiente") !== "pendiente") {
    return { subTareas };
  }

  const baseInicio = bloqueInicioAt ?? now;
  const { duracionRealSec, deltaMinutosVsMeta } = calcDeltaCierreCronometro(
    target,
    anchor,
    now,
    baseInicio,
    subTareas
  );

  let next = subTareas.map(st =>
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

  if (deltaMinutosVsMeta > 0) {
    next = repartirDeltaMinutosEnCola(next, deltaMinutosVsMeta).subTareas;
  }

  if (horaFinContratoMs != null && next.some(situacionFilaCronometroPendiente)) {
    const resolved = resolveCronometroCupoAnchor(next, anchor, { forceResetSameRow: true, now });
    const expandAnchor = resolved === "unchanged" ? (anchor ?? null) : resolved;
    next = repartirHolguraHastaMeta(next, horaFinContratoMs, now, expandAnchor);
  }

  return { subTareas: next };
}

/**
 * Saca una fila pendiente del cronómetro hacia la reserva acumulativa (sin PS).
 * Conserva texto, cupo y detalles para retomar después.
 */
export function extraerSubTareaAReserva(
  subTareas: SubTarea[],
  subTareaId: string
): { subTareas: SubTarea[]; extraido: SubTarea | null } {
  const target = subTareas.find(st => st.id === subTareaId);
  if (!target?.enDesgloseCronometro || (target.resultadoSituacion ?? "pendiente") !== "pendiente") {
    return { subTareas, extraido: null };
  }
  return {
    subTareas: subTareas.filter(st => st.id !== subTareaId),
    extraido: target,
  };
}

export type QuitarFilaColaHaciaFocoResult =
  | {
      ok: true;
      subTareas: SubTarea[];
      /** Minutos que salen del plan con la fila (no se montan en el foco). */
      minutosLiberados: number;
      quitada: SubTarea;
      focusId: string;
    }
  | {
      ok: false;
      reason: "no_target" | "es_foco" | "dejaría_vacio" | "foco_no_pendiente";
    };

/**
 * Quita una fila de cola (no el foco): se elimina de la lista sin veredicto.
 * El tiempo asignado se va con ella — no se posterga ni se monta en el foco.
 * Postergar (mover a cola conservando cupo) es otra operación.
 */
export function quitarFilaColaHaciaFoco(
  subTareas: SubTarea[],
  subTareaId: string,
  focusSubTareaId: string
): QuitarFilaColaHaciaFocoResult {
  if (subTareaId === focusSubTareaId) return { ok: false, reason: "es_foco" };

  const { subTareas: without, extraido } = extraerSubTareaAReserva(subTareas, subTareaId);
  if (!extraido) return { ok: false, reason: "no_target" };

  const pendingAfter = without.filter(situacionFilaCronometroPendiente);
  if (pendingAfter.length === 0) return { ok: false, reason: "dejaría_vacio" };

  const foco = without.find(st => st.id === focusSubTareaId);
  if (!foco || !situacionFilaCronometroPendiente(foco)) {
    return { ok: false, reason: "foco_no_pendiente" };
  }

  return {
    ok: true,
    subTareas: without,
    minutosLiberados: Math.max(0, extraido.minutosCupo ?? 0),
    quitada: extraido,
    focusId: focusSubTareaId,
  };
}

/** Cierra todas las filas pendientes del cronómetro de un golpe (fallado con tiempo real en foco). */
export function cerrarCronometroDeGolpe(
  subTareas: SubTarea[],
  anchor: { subTareaId: string; startedAt: number } | null | undefined,
  now: number,
  bloqueInicioAt: number
): SubTarea[] {
  return subTareas.map(st => {
    if (!st.enDesgloseCronometro || (st.resultadoSituacion ?? "pendiente") !== "pendiente") {
      return st;
    }
    const { duracionRealSec } = calcDeltaCierreCronometro(st, anchor, now, bloqueInicioAt, subTareas);
    return {
      ...st,
      completada: false,
      resultadoSituacion: "fallado" as const,
      duracionRealSec,
      cerradaAt: now,
    };
  });
}

/** Registra cierre fallado con duración real; reparte pérdida vs meta en toda la cola. */
export function registrarCierreFalladoCronometro(
  subTareas: SubTarea[],
  subTareaId: string,
  anchor: { subTareaId: string; startedAt: number } | null | undefined,
  now: number,
  bloqueInicioAt?: number
): { subTareas: SubTarea[]; minutosPerdidos: number } {
  const target = subTareas.find(st => st.id === subTareaId);
  if (!target) return { subTareas, minutosPerdidos: 0 };

  const baseInicio = bloqueInicioAt ?? now;
  const { duracionRealSec, deltaMinutosVsMeta } = calcDeltaCierreCronometro(
    target,
    anchor,
    now,
    baseInicio,
    subTareas
  );

  let next = subTareas.map(st =>
    st.id === subTareaId
      ? {
          ...st,
          completada: false,
          resultadoSituacion: "fallado" as const,
          duracionRealSec,
          cerradaAt: now,
        }
      : st
  );

  let minutosPerdidos = 0;
  if (deltaMinutosVsMeta < 0) {
    const { subTareas: repartidas, repartido } = repartirDeltaMinutosEnCola(next, deltaMinutosVsMeta);
    next = repartidas;
    minutosPerdidos = Math.abs(repartido);
  }

  return { subTareas: next, minutosPerdidos };
}

/**
 * Reparte minutos entre filas pendientes del cronómetro.
 * Filas con `cupoFijo` conservan su minutosCupo; el resto del presupuesto va a las flexibles.
 */
export function redistribuirMinutosSituacionCronometro(subTareas: SubTarea[], remainingMin: number): SubTarea[] {
  const pendingIdx = subTareas
    .map((st, i) => ({ st, i }))
    .filter(({ st }) => situacionFilaCronometroPendiente(st));
  if (pendingIdx.length === 0) return subTareas;

  const fixed = pendingIdx.filter(({ st }) => isCupoFijo(st));
  const flexible = pendingIdx.filter(({ st }) => !isCupoFijo(st));

  const fixedSum = fixed.reduce((a, { st }) => a + (st.minutosCupo ?? 0), 0);
  const next = [...subTareas];

  if (flexible.length === 0) return next;

  const flexBudget = Math.max(flexible.length, Math.round(remainingMin) - fixedSum);
  const alloc = repartirProporcional(
    flexible.map(() => 1),
    flexBudget,
    1
  );

  flexible.forEach(({ st, i }, k) => {
    next[i] = { ...st, minutosCupo: alloc[k] };
  });

  return next;
}

/** Aplica minutos manuales (marca cupoFijo) y redistribuye el sobrante entre filas flexibles. */
export function applyCupoManualYRedistribuir(
  subTareas: SubTarea[],
  subTareaId: string,
  minutos: number | undefined,
  totalBudgetMin: number
): SubTarea[] {
  const afterManual = subTareas.map(st => {
    if (st.id !== subTareaId) return st;
    if (minutos === undefined || minutos <= 0 || !Number.isFinite(minutos)) {
      const next = { ...st };
      delete (next as { minutosCupo?: number; cupoFijo?: boolean }).minutosCupo;
      delete (next as { cupoFijo?: boolean }).cupoFijo;
      return next;
    }
    return {
      ...st,
      minutosCupo: Math.round(Math.min(999, Math.max(0, minutos))),
      cupoFijo: true,
    };
  });
  return redistribuirMinutosSituacionCronometro(afterManual, totalBudgetMin);
}

/** Comprime o estira cupos pendientes para alinearse al tiempo de pared hasta la meta. */
export function reacomodarColaCronometroAMeta(
  subTareas: SubTarea[],
  horaFinContratoMs: number,
  nowMs: number = Date.now(),
  anchor?: { subTareaId: string; startedAt: number } | null
): SubTarea[] {
  const wallMin = situacionWallMinHastaMeta(horaFinContratoMs, nowMs);
  if (wallMin == null || wallMin <= 0) return subTareas;
  const pendingSum = sumMinutosCronometroPendientes(subTareas);
  if (pendingSum > wallMin) {
    return redistribuirMinutosSituacionCronometro(subTareas, Math.max(1, wallMin));
  }
  if (pendingSum < wallMin) {
    return expandirColaCronometroHastaMeta(subTareas, horaFinContratoMs, nowMs, anchor);
  }
  return subTareas;
}

export function totalBudgetMinFromCronometro(
  subTareas: SubTarea[],
  bloqueInicioAt: number,
  horaFinContratoMs?: number
): number {
  if (horaFinContratoMs != null) {
    return Math.max(1, Math.round((horaFinContratoMs - bloqueInicioAt) / 60000));
  }
  return Math.max(1, sumMinutosCronometroPendientes(subTareas));
}

/** Presupuesto para repartir cupos: techo = tiempo de pared hasta la meta sellada. */
export function remainingCronometroBudgetMin(
  sc: Vehicle["situacionCronometro"],
  _subTareas?: SubTarea[],
  nowMs: number = Date.now()
): number | null {
  if (!sc?.activo) return null;
  const contratoMs = situacionContratoFinMs(sc);
  if (contratoMs == null) return null;
  const wallMin = situacionWallMinHastaMeta(contratoMs, nowMs);
  if (wallMin == null) return null;
  return Math.max(1, wallMin);
}

export function resolveFocusSubTareaId(
  subTareas: SubTarea[],
  anchor?: { subTareaId: string; startedAt: number } | null
): string | null {
  if (anchor?.subTareaId) {
    const sub = subTareas.find(st => st.id === anchor.subTareaId);
    if (sub && situacionFilaCronometroPendiente(sub)) return anchor.subTareaId;
  }
  const first = filasCronometroOrdenadas(subTareas).find(situacionFilaCronometroPendiente);
  return first?.id ?? null;
}

/** Migra saldoAdelanto legacy a cupo del foco (ya no reduce la meta). */
export function absorberSaldoAdelantoEnFoco(
  subTareas: SubTarea[],
  saldoAdelantoMin: number,
  anchor?: { subTareaId: string; startedAt: number } | null
): { subTareas: SubTarea[]; saldoRestante: number } {
  if (saldoAdelantoMin <= 0) return { subTareas, saldoRestante: 0 };
  const focusId = resolveFocusSubTareaId(subTareas, anchor);
  if (!focusId) return { subTareas, saldoRestante: saldoAdelantoMin };
  return {
    subTareas: transferirMinutosAlFoco(subTareas, focusId, saldoAdelantoMin),
    saldoRestante: 0,
  };
}

function resolveRingCupoAnchorAfterEnqueue(
  subTareas: SubTarea[],
  curAnchor: Vehicle["situacionCupoAnchor"],
  nowMs: number
): { situacionCupoAnchor: { subTareaId: string; startedAt: number } | undefined; anchorStillValid: boolean } {
  const curSub = curAnchor ? subTareas.find(s => s.id === curAnchor.subTareaId) : undefined;
  const anchorStillValid =
    !!curSub &&
    situacionFilaCronometroPendiente(curSub) &&
    (curSub.minutosCupo ?? 0) > 0;
  if (anchorStillValid) {
    return { situacionCupoAnchor: curAnchor ?? undefined, anchorStillValid: true };
  }
  const firstCron = subTareas.find(st => situacionFilaCronometroPendiente(st) && (st.minutosCupo ?? 0) > 0);
  return {
    situacionCupoAnchor: firstCron ? { subTareaId: firstCron.id, startedAt: nowMs } : undefined,
    anchorStillValid: false,
  };
}

export type SellarDirectoEnRingOpts = {
  nowMs?: number;
  newSubId?: string;
  proyectoIdNuevaSub?: string;
  enfoqueHeredado?: string;
  segProyectoVinculadoId?: string;
  /** Familia con título propio; no altera cupo ni ancla. */
  seccionTitulo?: string;
};

export type SellarDirectoEnRingResult =
  | {
      ok: true;
      subTareas: SubTarea[];
      situacionCronometro: NonNullable<Vehicle["situacionCronometro"]>;
      situacionCupoAnchor: { subTareaId: string; startedAt: number } | undefined;
      newSubId: string;
      anchorStillValid: boolean;
    }
  | { ok: false; reason: "empty_text" | "ring_inactive" | "invalid_vehicle" | "invalid_budget" };

/** Crea subtarea y la sella en el ring en un solo paso (sin doble mutación). */
export function buildSellarDirectoEnRingState(
  vehicle: Vehicle,
  texto: string,
  opts?: SellarDirectoEnRingOpts
): SellarDirectoEnRingResult {
  const trimmed = texto.trim();
  if (!trimmed) return { ok: false, reason: "empty_text" };
  if (vehicle.tipoFlota !== "situacion" || !vehicle.subTareas) {
    return { ok: false, reason: "invalid_vehicle" };
  }
  const sc = vehicle.situacionCronometro;
  if (sc?.activo !== true) return { ok: false, reason: "ring_inactive" };

  const nowMs = opts?.nowMs ?? Date.now();
  const newSubId = opts?.newSubId ?? `st_${nowMs}`;
  const enfoqueHeredado =
    opts?.enfoqueHeredado?.trim() ||
    sc.proyectoEnfoqueId?.trim() ||
    opts?.segProyectoVinculadoId?.trim();

  const seccionTitulo = opts?.seccionTitulo?.trim() || undefined;
  const newSubRaw: SubTarea = {
    id: newSubId,
    texto: trimmed,
    completada: false,
    creadaAt: nowMs,
    enDesgloseCronometro: true,
    resultadoSituacion: "pendiente",
    ...(opts?.proyectoIdNuevaSub ? { proyectoId: opts.proyectoIdNuevaSub } : {}),
    ...(seccionTitulo ? { seccionTitulo } : {}),
  };
  const newSub = aplicarProyectoHeredadoASub(newSubRaw, enfoqueHeredado);

  let subTareas = [...vehicle.subTareas, newSub];
  const budgetMin = remainingCronometroBudgetMin(sc, subTareas, nowMs);
  if (budgetMin == null) return { ok: false, reason: "invalid_budget" };

  subTareas = redistribuirMinutosSituacionCronometro(subTareas, budgetMin);

  const proyectoEnfoqueId =
    sc.proyectoEnfoqueId?.trim() ||
    dominanteProyectoIdEnSubs(subTareas.filter(st => st.enDesgloseCronometro)) ||
    vehicle.proyectoId?.trim() ||
    opts?.segProyectoVinculadoId?.trim();
  const situacionCronometro = {
    ...sc,
    ...(proyectoEnfoqueId && !sc.proyectoEnfoqueId?.trim() ? { proyectoEnfoqueId } : {}),
  };

  const { situacionCupoAnchor, anchorStillValid } = resolveRingCupoAnchorAfterEnqueue(
    subTareas,
    vehicle.situacionCupoAnchor,
    nowMs
  );

  return {
    ok: true,
    subTareas,
    situacionCronometro,
    situacionCupoAnchor,
    newSubId,
    anchorStillValid,
  };
}
