const TIK_SOUND_KEY = "sistemicar_tik_sound";
const SITUACION_ALERTS_KEY = "sistemicar_situacion_alerts";
const PUERTA_VOZ_KEY = "sistemicar_puerta_voz";
const DESGLOSADOR_VOZ_KEY = "sistemicar_desglosador_voz";
const PUNTO_CERO_VOZ_KEY = "sistemicar_punto_cero_voz";

export function isTikSoundEnabled(): boolean {
  try {
    return localStorage.getItem(TIK_SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function isSituacionAlertsEnabled(): boolean {
  try {
    const v = localStorage.getItem(SITUACION_ALERTS_KEY);
    if (v === "off") return false;
    return true;
  } catch {
    return true;
  }
}

/** Voz de puerta de atención (minuto 4). Default ON si alertas situacionales están ON. */
export function isPuertaVozEnabled(): boolean {
  try {
    const v = localStorage.getItem(PUERTA_VOZ_KEY);
    if (v === "off") return false;
    if (v === "on") return true;
    return isSituacionAlertsEnabled();
  } catch {
    return true;
  }
}

/** Voz del desglosador (ruta de enfoque): ON por defecto si alertas situacionales están ON. */
export function isDesglosadorVoiceEnabled(): boolean {
  try {
    const v = localStorage.getItem(DESGLOSADOR_VOZ_KEY);
    if (v === "off") return false;
    if (v === "on") return true;
    return isSituacionAlertsEnabled();
  } catch {
    return true;
  }
}

export function setDesglosadorVoiceEnabled(on: boolean): void {
  try {
    localStorage.setItem(DESGLOSADOR_VOZ_KEY, on ? "on" : "off");
    if (!on && typeof window !== "undefined") {
      void import("./speechQueue").then(m => m.voiceEngine.stopChannel("conquista"));
    }
    window.dispatchEvent(new CustomEvent("sistemicar-desglosador-voz-changed", { detail: { on } }));
  } catch {
    /* noop */
  }
}

/** Voz guía de Punto Cero (TTS). Default ON. */
export function isPuntoCeroVoiceEnabled(): boolean {
  try {
    return localStorage.getItem(PUNTO_CERO_VOZ_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setPuntoCeroVoiceEnabled(on: boolean): void {
  try {
    localStorage.setItem(PUNTO_CERO_VOZ_KEY, on ? "on" : "off");
    if (!on && typeof window !== "undefined") {
      void import("./speechQueue").then(m => m.voiceEngine.stopChannel("puntocero"));
    }
    window.dispatchEvent(new CustomEvent("sistemicar-punto-cero-voz-changed", { detail: { on } }));
  } catch {
    /* noop */
  }
}

export function setPuertaVozEnabled(on: boolean): void {
  try {
    localStorage.setItem(PUERTA_VOZ_KEY, on ? "on" : "off");
    window.dispatchEvent(new CustomEvent("sistemicar-puerta-voz-changed", { detail: { on } }));
  } catch {
    /* noop */
  }
}

export function setTikSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(TIK_SOUND_KEY, on ? "on" : "off");
    if (!on && typeof window !== "undefined") {
      void import("./speechQueue").then(m => {
        m.voiceEngine.stopChannel("situacion");
        m.voiceEngine.stopChannel("conquista");
      });
    }
    window.dispatchEvent(new CustomEvent("sistemicar-tik-sound-changed", { detail: { on } }));
  } catch {
    /* noop */
  }
}

export function setSituacionAlertsEnabled(on: boolean): void {
  try {
    localStorage.setItem(SITUACION_ALERTS_KEY, on ? "on" : "off");
    if (!on && typeof window !== "undefined") {
      void import("./speechQueue").then(m => m.voiceEngine.stopChannel("situacion"));
    }
    window.dispatchEvent(new CustomEvent("sistemicar-situacion-alerts-changed", { detail: { on } }));
  } catch {
    /* noop */
  }
}

/** Enciende alertas + voz puerta + voz desglosador + guía Punto Cero (p. ej. al probar voz). */
export function enableAllVoiceChannels(): void {
  setSituacionAlertsEnabled(true);
  setPuertaVozEnabled(true);
  setDesglosadorVoiceEnabled(true);
  setPuntoCeroVoiceEnabled(true);
}
