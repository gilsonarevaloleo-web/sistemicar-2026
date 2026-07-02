let recordBannerTimer: ReturnType<typeof setTimeout> | null = null;

/** Limpia banner de récord PS fuera del render (evita quedar congelado si React se bloquea). */
export function scheduleRecordBannerClear(onClear: () => void, ms = 8000): void {
  if (recordBannerTimer != null) globalThis.clearTimeout(recordBannerTimer);
  recordBannerTimer = globalThis.setTimeout(() => {
    recordBannerTimer = null;
    onClear();
  }, ms);
}

export function cancelRecordBannerClear(): void {
  if (recordBannerTimer != null) {
    globalThis.clearTimeout(recordBannerTimer);
    recordBannerTimer = null;
  }
}
