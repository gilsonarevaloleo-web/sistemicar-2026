/**
 * Guion GPS Dual Kernel — frases fijas (mp3).
 * No interpola el título del vehículo: eso exigiría TTS.
 * El nombre vive en pantalla; el oído recibe la cue.
 */
export const J4_GPS_CLIP_BASE = "/voice/j4";

export const J4_GPS_CLIP_IDS = [
  "activar",
  "lanzar",
  "umbral",
  "hueco",
  "sello",
  "silence",
] as const;

export type J4GpsClipId = (typeof J4_GPS_CLIP_IDS)[number];

export type J4GpsClip = {
  id: J4GpsClipId;
  /** Ruta pública (Vite root = client/). */
  src: string;
  /** Texto canónico — no se sintetiza. */
  text: string;
  /** Si false, el clip existe para más tarde; J4 no lo dispara. */
  wired: boolean;
};

export const J4_GPS_CLIPS: Record<J4GpsClipId, J4GpsClip> = {
  activar: {
    id: "activar",
    src: `${J4_GPS_CLIP_BASE}/activar.mp3`,
    text: "Voz GPS activa.",
    wired: true,
  },
  lanzar: {
    id: "lanzar",
    src: `${J4_GPS_CLIP_BASE}/lanzar.mp3`,
    text: "Misión en curso. El inconsciente no firma este tramo.",
    wired: true,
  },
  umbral: {
    id: "umbral",
    src: `${J4_GPS_CLIP_BASE}/umbral.mp3`,
    text: "Antes de moverse: póngale nombre.",
    wired: false,
  },
  hueco: {
    id: "hueco",
    src: `${J4_GPS_CLIP_BASE}/hueco.mp3`,
    text: "Sin vehículo. El corte ya cuenta.",
    wired: false,
  },
  sello: {
    id: "sello",
    src: `${J4_GPS_CLIP_BASE}/sello.mp3`,
    text: "El plan se sella. Ahora verá las horas.",
    wired: false,
  },
  silence: {
    id: "silence",
    src: `${J4_GPS_CLIP_BASE}/silence.mp3`,
    text: "",
    wired: true,
  },
};

export function j4GpsClip(id: J4GpsClipId): J4GpsClip {
  return J4_GPS_CLIPS[id];
}
