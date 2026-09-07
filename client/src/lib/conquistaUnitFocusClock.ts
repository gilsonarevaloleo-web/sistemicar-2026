/**
 * Cronómetro de unidad (conquista) — herramienta de concentración.
 * Display-only: no escribe a récord, PS, historial ni Firebase.
 *
 * El naranja es borrador. El ring compara vueltas (conciencia) vs unidades
 * que el vehículo cuenta al ritmo de récord, más ganancia anclada.
 */

/** Umbral del reloj de ganancia en el card (±5s). Aquí el slot no desaparece. */
export const GANANCIA_RITMO_SEC = 5;

export type UnitFocusLap = {
  /** Índice 1-based (vuelta 1, 2, …). */
  n: number;
  /** Tiempo absoluto desde el arranque del cronómetro (ms). */
  absoluteMs: number;
  /** Duración de esta vuelta respecto a la anterior (ms). */
  splitMs: number;
};

/** Formato mm:ss; si pasa de 1h → h:mm:ss */
export function formatUnitFocusElapsed(elapsedMs: number): string {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function unitFocusElapsedMs(startedAtMs: number, nowMs: number): number {
  return Math.max(0, nowMs - startedAtMs);
}

/**
 * Registra una vuelta sin detener el cronómetro.
 * `previousAbsoluteMs` = absoluteMs de la última vuelta (0 si es la primera).
 */
export function buildUnitFocusLap(
  n: number,
  absoluteMs: number,
  previousAbsoluteMs: number
): UnitFocusLap {
  const abs = Math.max(0, absoluteMs);
  const prev = Math.max(0, previousAbsoluteMs);
  return {
    n,
    absoluteMs: abs,
    splitMs: Math.max(0, abs - prev),
  };
}

/** Split de la vuelta en curso (tras la última vuelta, o el elapsed si aún no hay). */
export function unitFocusCurrentLapMs(
  elapsedMs: number,
  lastLapAbsoluteMs: number | null | undefined
): number {
  const last = lastLapAbsoluteMs ?? 0;
  return Math.max(0, elapsedMs - Math.max(0, last));
}

export function recordPaceMs(recordMinPerUnit: number | null | undefined): number | null {
  if (recordMinPerUnit == null || !(recordMinPerUnit > 0)) return null;
  return Math.round(recordMinPerUnit * 60_000);
}

/** Unidades que el vehículo ya contó al ritmo de récord (van al récord). */
export function vehicleRecordUnitsDone(
  vehicleElapsedMs: number,
  recordMinPerUnit: number | null | undefined
): number {
  const pace = recordPaceMs(recordMinPerUnit);
  if (pace == null) return 0;
  return Math.floor(Math.max(0, vehicleElapsedMs) / pace);
}

/** Tiempo dentro de la unidad de récord actual (0 .. pace). */
export function vehicleRecordUnitElapsedMs(
  vehicleElapsedMs: number,
  recordMinPerUnit: number | null | undefined
): number {
  const pace = recordPaceMs(recordMinPerUnit);
  if (pace == null) return 0;
  return Math.max(0, vehicleElapsedMs) % pace;
}

export type UnitFocusMatch = "ahead" | "even" | "behind" | "no-record";

export function unitFocusMatch(
  orangeUnits: number,
  recordUnits: number,
  hasRecord: boolean
): UnitFocusMatch {
  if (!hasRecord) return "no-record";
  const orange = Math.max(0, orangeUnits);
  const record = Math.max(0, recordUnits);
  if (orange > record) return "ahead";
  if (orange < record) return "behind";
  return "even";
}

export type GananciaKind = "ganando" | "perdiendo" | "ritmo";

export function gananciaKindFromDelta(deltaSec: number): GananciaKind {
  if (deltaSec < -GANANCIA_RITMO_SEC) return "ganando";
  if (deltaSec > GANANCIA_RITMO_SEC) return "perdiendo";
  return "ritmo";
}

export function formatGananciaDelta(deltaSec: number): string {
  const abs = Math.abs(Math.trunc(deltaSec));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export type UnitFocusVehicleClock = {
  recordMinPerUnit: number | null;
  unitsTarget: number | null;
  elapsedSec: number;
  timerDisplay: string | null;
  timerExpired: boolean;
  gananciaDeltaSec: number;
  hasProjection: boolean;
};

export type UnitFocusRingView = {
  hasRecord: boolean;
  recordMinPerUnit: number | null;
  recordPaceLabel: string | null;
  recordPaceDisplay: string | null;
  recordUnitsDone: number;
  recordUnitsTarget: number | null;
  recordUnitElapsedMs: number;
  recordPaceMs: number | null;
  recordUnitRemainMs: number;
  recordUnitFrac: number;
  orangeUnits: number;
  orangeCurrentLapMs: number;
  orangeLapFrac: number | null;
  match: UnitFocusMatch;
  matchLabel: string | null;
  gananciaKind: GananciaKind;
  gananciaLabel: string;
  gananciaPhrase: string;
  showGananciaClock: boolean;
  vehicleTimerDisplay: string | null;
  vehicleTimerExpired: boolean;
};

export function buildUnitFocusRingView(input: {
  vehicleElapsedMs: number;
  recordMinPerUnit: number | null | undefined;
  unitsTarget: number | null | undefined;
  orangeUnits: number;
  orangeCurrentLapMs: number;
  gananciaDeltaSec: number;
  hasProjection: boolean;
  vehicleTimerDisplay?: string | null;
  vehicleTimerExpired?: boolean;
}): UnitFocusRingView {
  const paceMs = recordPaceMs(input.recordMinPerUnit);
  const hasRecord = paceMs != null;
  const recordUnitsDone = vehicleRecordUnitsDone(
    input.vehicleElapsedMs,
    input.recordMinPerUnit
  );
  const recordUnitElapsedMs = vehicleRecordUnitElapsedMs(
    input.vehicleElapsedMs,
    input.recordMinPerUnit
  );
  const recordUnitRemainMs = paceMs != null ? Math.max(0, paceMs - recordUnitElapsedMs) : 0;
  const recordUnitFrac = paceMs != null && paceMs > 0 ? recordUnitElapsedMs / paceMs : 0;
  const orangeUnits = Math.max(0, input.orangeUnits);
  const orangeCurrentLapMs = Math.max(0, input.orangeCurrentLapMs);
  const orangeLapFrac =
    paceMs != null && paceMs > 0 ? orangeCurrentLapMs / paceMs : null;
  const match = unitFocusMatch(orangeUnits, recordUnitsDone, hasRecord);
  const kind = gananciaKindFromDelta(input.gananciaDeltaSec);

  return {
    hasRecord,
    recordMinPerUnit: hasRecord ? input.recordMinPerUnit! : null,
    recordPaceLabel: hasRecord ? `${input.recordMinPerUnit!.toFixed(1)} min/u` : null,
    recordPaceDisplay: paceMs != null ? formatUnitFocusElapsed(paceMs) : null,
    recordUnitsDone,
    recordUnitsTarget:
      input.unitsTarget != null && input.unitsTarget > 0 ? input.unitsTarget : null,
    recordUnitElapsedMs,
    recordPaceMs: paceMs,
    recordUnitRemainMs,
    recordUnitFrac,
    orangeUnits,
    orangeCurrentLapMs,
    orangeLapFrac,
    match,
    matchLabel:
      match === "even" && (orangeUnits > 0 || recordUnitsDone > 0)
        ? "Coinciden · foco sostenido"
        : match === "even"
          ? "Compite la unidad"
          : match === "ahead"
            ? "Unidad delante"
            : match === "behind"
              ? "Récord delante"
              : null,
    gananciaKind: kind,
    gananciaLabel: formatGananciaDelta(input.gananciaDeltaSec),
    gananciaPhrase:
      kind === "ganando" ? "ganando" : kind === "perdiendo" ? "perdiendo" : "en ritmo",
    showGananciaClock: input.hasProjection,
    vehicleTimerDisplay: input.vehicleTimerDisplay ?? null,
    vehicleTimerExpired: input.vehicleTimerExpired === true,
  };
}
