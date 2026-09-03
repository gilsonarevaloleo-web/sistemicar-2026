/**
 * Kill switch voz GPS Dual Kernel.
 * Ausente o distinto de "on" = apagado. Nunca default ON.
 */
export const J4_GPS_CLIPS_PREF_KEY = "sistemicar_j4_gps_clips";
export const J4_GPS_CLIPS_CHANGED_EVENT = "sistemicar-j4-gps-clips-changed";

export function isJ4GpsClipsEnabled(): boolean {
  try {
    return localStorage.getItem(J4_GPS_CLIPS_PREF_KEY) === "on";
  } catch {
    return false;
  }
}

export function setJ4GpsClipsEnabled(on: boolean): void {
  try {
    localStorage.setItem(J4_GPS_CLIPS_PREF_KEY, on ? "on" : "off");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(J4_GPS_CLIPS_CHANGED_EVENT, { detail: { on } })
      );
    }
  } catch {
    /* noop */
  }
}
