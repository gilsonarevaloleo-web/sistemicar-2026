/**
 * Guard de montaje / retorno a Jornada: difiere heavy compute al volver desde background.
 * TTS ya no se difiere aquí — VoiceEngine serializa por sí solo.
 */

const JORNADA_HEAVY_DEFER_MS = 1500;
const JORNADA_VIEW_MOUNT_GUARD_MS = 400;

let isRemountingJornada = false;
let heavyComputeAllowedAfterMs = 0;
let isViewMounting = false;
let viewMountGuardTimer: ReturnType<typeof setTimeout> | null = null;

export function getIsRemountingJornada(): boolean {
  return isRemountingJornada;
}

/** Primeros 400 ms del montaje de Jornada — ignora sync cruzada con Proyectos. */
export function isJornadaViewMounting(): boolean {
  return isViewMounting;
}

export function beginJornadaViewMount(): void {
  isViewMounting = true;
  if (viewMountGuardTimer) clearTimeout(viewMountGuardTimer);
  viewMountGuardTimer = setTimeout(() => {
    viewMountGuardTimer = null;
    isViewMounting = false;
  }, JORNADA_VIEW_MOUNT_GUARD_MS);
}

export function endJornadaViewMount(): void {
  if (viewMountGuardTimer) clearTimeout(viewMountGuardTimer);
  viewMountGuardTimer = null;
  isViewMounting = false;
}

export function isJornadaHeavyComputeAllowed(): boolean {
  return !isRemountingJornada && Date.now() >= heavyComputeAllowedAfterMs;
}

export function msUntilJornadaHeavyComputeAllowed(): number {
  return Math.max(0, heavyComputeAllowedAfterMs - Date.now());
}

/** @deprecated TTS ya no se difiere — siempre false. */
export function shouldDeferJornadaVoice(): boolean {
  return false;
}

/** @deprecated No-op — cola de voz eliminada. */
export function deferJornadaVoice(_fn: () => void): void {
  /* noop */
}

/** @deprecated No-op — cola de voz eliminada. */
export function flushJornadaVoiceQueue(): void {
  /* noop */
}

export function clearJornadaVoiceFlushTimers(): void {
  /* noop — compat */
}

export function beginJornadaRemount(opts?: { heavyDeferMs?: number }): void {
  isRemountingJornada = true;
  heavyComputeAllowedAfterMs = Date.now() + (opts?.heavyDeferMs ?? JORNADA_HEAVY_DEFER_MS);
}

export function endJornadaRemount(_opts?: { voiceFlushDelayMs?: number }): void {
  isRemountingJornada = false;
}

export function cancelJornadaRemountGuard(): void {
  isRemountingJornada = false;
}

/** Solo tests — reinicia estado global. */
export function resetJornadaRemountForTests(): void {
  isRemountingJornada = false;
  heavyComputeAllowedAfterMs = 0;
  endJornadaViewMount();
}

/** @deprecated Siempre 0 — cola de voz eliminada. */
export function getJornadaPendingVoiceCountForTests(): number {
  return 0;
}
