/**
 * Motor TTS unificado — un solo speechSynthesis, tres canales (conquista, situación, Punto Cero).
 * Todas las utterances pasan por voiceEngine; prohibido cancel global entre canales.
 */

import {
  applyCalmSpanishUtterance,
  primeSpanishVoices,
  type TtsVoiceChannel,
} from "./spanishTtsVoice";
import {
  isDesglosadorVoiceEnabled,
  isPuertaVozEnabled,
  isSituacionAlertsEnabled,
} from "./tikSound";

export type UbicacionVoiceSource = "situacion" | "desglosador" | "puerta";
export type VoiceChannel = TtsVoiceChannel;

export function sourceToChannel(source: UbicacionVoiceSource): VoiceChannel {
  if (source === "desglosador") return "conquista";
  return "situacion";
}

function isVoiceEnabledFor(source: UbicacionVoiceSource): boolean {
  if (source === "puerta") return isPuertaVozEnabled();
  if (source === "desglosador") return isDesglosadorVoiceEnabled();
  return isSituacionAlertsEnabled();
}

function channelPriority(channel: VoiceChannel): number {
  if (channel === "puntocero") return 100;
  if (channel === "conquista") return 50;
  return 40;
}

type QueueItem = {
  text: string;
  channel: VoiceChannel;
  key?: string;
  priority: number;
  pauseAfterMs?: number;
  configure?: (u: SpeechSynthesisUtterance) => void;
  onPhraseStarted?: () => void;
  releaseKey?: string;
};

type UtteranceHandlers = {
  onstart?: () => void;
  onend?: () => void;
  onerror?: () => void;
};

let lastWarmupMs = 0;
let voicesPrimed = false;
let voicesLoadBypass = false;
let speechUnlocked = false;
const idleListeners = new Set<() => void>();
const externalCancelListeners = new Set<() => void>();
let lastQueuedPhrase = "";
let lastQueuedAtMs = 0;

const PHRASE_ENQUEUE_DEDUP_MS = 90_000;
const STUCK_SPEAK_MS = 45_000;
const WARMUP_REFRESH_MS = 20 * 60_000;
const VOICES_LOAD_WAIT_MS = 450;
const PHRASE_STARTED_FALLBACK_MS = 8_000;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

function notifySpeechQueueIdle(): void {
  if (voiceEngine.isSpeaking() || voiceEngine.queueLength() > 0) return;
  idleListeners.forEach(fn => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

function notifyExternalSpeechCancelListeners(): void {
  externalCancelListeners.forEach(fn => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

function primeVoicesOnce(): void {
  primeSpanishVoices();
  if (!voicesPrimed) voicesPrimed = true;
}

function primeSpanishVoicesReady(): boolean {
  primeVoicesOnce();
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  return window.speechSynthesis.getVoices().length > 0;
}

function resumeSynthIfPaused(): void {
  const synth = getSynth();
  if (!synth) return;
  try {
    if (synth.paused) synth.resume();
  } catch {
    /* noop */
  }
}

function isBackground(): boolean {
  if (typeof document === "undefined") return false;
  return document.hidden;
}

function enqueueForBackground(phrases: string[], source: UbicacionVoiceSource): void {
  void import("./backgroundAttentionAlerts").then(mod => {
    for (const phrase of phrases) {
      mod.enqueueMissedPuertaVoice(phrase, source);
    }
  });
}

class VoiceEngine {
  private queue: QueueItem[] = [];
  private speaking = false;
  private currentItem: QueueItem | null = null;
  private activeKeys = new Set<string>();
  private stuckTimer: ReturnType<typeof setTimeout> | null = null;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingOnPhraseStarted: (() => void) | null = null;
  private pendingOnPhraseStartedArmed = false;

  queueLength(): number {
    return this.queue.length;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  currentChannel(): VoiceChannel | null {
    return this.currentItem?.channel ?? null;
  }

  isKeyActive(key: string): boolean {
    return this.activeKeys.has(key);
  }

  markKeyActive(key: string): void {
    this.activeKeys.add(key);
  }

  releaseKey(key: string): void {
    this.activeKeys.delete(key);
  }

  isPhraseQueued(text: string): boolean {
    const phrase = text.trim();
    if (!phrase) return false;
    if (this.currentItem?.text.trim() === phrase) return true;
    return this.queue.some(item => item.text.trim() === phrase);
  }

  setPhraseStartedCallback(cb: (() => void) | null): void {
    this.pendingOnPhraseStarted = cb;
    this.pendingOnPhraseStartedArmed = !!cb;
  }

  clearPhraseStartedCallback(): void {
    this.pendingOnPhraseStarted = null;
    this.pendingOnPhraseStartedArmed = false;
  }

  /** Vacía solo la sub-cola del canal — no cancela synth global. */
  stopChannel(channel: VoiceChannel): void {
    this.queue = this.queue.filter(item => {
      if (item.channel !== channel) return true;
      if (item.key) this.activeKeys.delete(item.key);
      if (item.releaseKey) this.activeKeys.delete(item.releaseKey);
      return false;
    });
    notifySpeechQueueIdle();
  }

  /** Detiene utterance en curso y vacía cola/pausa de los canales indicados. */
  haltSpeechOnChannels(channels: readonly VoiceChannel[]): void {
    this.clearPauseTimer();
    const channelSet = new Set(channels);
    if (this.currentItem && channelSet.has(this.currentItem.channel)) {
      if (this.currentItem.releaseKey) this.activeKeys.delete(this.currentItem.releaseKey);
      if (this.currentItem.key) this.activeKeys.delete(this.currentItem.key);
      try {
        getSynth()?.cancel();
      } catch {
        /* noop */
      }
      this.releaseAfterExternalCancel();
    }
    for (const channel of channels) {
      this.stopChannel(channel);
    }
  }

  stopAllPending(): void {
    this.clearPauseTimer();
    for (const item of this.queue) {
      if (item.key) this.activeKeys.delete(item.key);
      if (item.releaseKey) this.activeKeys.delete(item.releaseKey);
    }
    this.queue = [];
    notifySpeechQueueIdle();
  }

  hardReset(): void {
    this.clearPauseTimer();
    this.clearStuckTimer();
    for (const item of this.queue) {
      if (item.key) this.activeKeys.delete(item.key);
      if (item.releaseKey) this.activeKeys.delete(item.releaseKey);
    }
    this.queue = [];
    if (this.currentItem?.releaseKey) this.activeKeys.delete(this.currentItem.releaseKey);
    if (this.currentItem?.key) this.activeKeys.delete(this.currentItem.key);
    this.currentItem = null;
    this.speaking = false;
    this.clearPhraseStartedCallback();
    speechUnlocked = false;
    voicesPrimed = false;
    voicesLoadBypass = false;
    lastQueuedPhrase = "";
    lastQueuedAtMs = 0;
    try {
      getSynth()?.cancel();
    } catch {
      /* noop */
    }
    notifyExternalSpeechCancelListeners();
    notifySpeechQueueIdle();
  }

  enqueue(item: Omit<QueueItem, "priority"> & { priority?: number }): void {
    const full: QueueItem = {
      ...item,
      priority: item.priority ?? channelPriority(item.channel),
    };
    this.queue.push(full);
    this.sortQueue();
    this.processQueue();
  }

  enqueueBatch(items: QueueItem[]): void {
    for (const item of items) {
      this.queue.push(item);
    }
    this.sortQueue();
    this.processQueue();
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return 0;
    });
  }

  private clearPauseTimer(): void {
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
  }

  private clearStuckTimer(): void {
    if (this.stuckTimer) {
      clearTimeout(this.stuckTimer);
      this.stuckTimer = null;
    }
  }

  private armStuckReset(): void {
    this.clearStuckTimer();
    this.stuckTimer = setTimeout(() => {
      if (!this.speaking) return;
      this.speaking = false;
      this.currentItem = null;
      try {
        getSynth()?.cancel();
      } catch {
        /* noop */
      }
      this.processQueue();
    }, STUCK_SPEAK_MS);
  }

  private unblockStuckSpeechSynth(): void {
    const synth = getSynth();
    if (!synth) return;
    if (this.speaking && !synth.speaking && !synth.pending) {
      this.speaking = false;
      this.currentItem = null;
      this.clearStuckTimer();
    }
  }

  private firePhraseStarted(): void {
    if (!this.pendingOnPhraseStartedArmed || !this.pendingOnPhraseStarted) return;
    const cb = this.pendingOnPhraseStarted;
    this.pendingOnPhraseStarted = null;
    this.pendingOnPhraseStartedArmed = false;
    cb();
  }

  processQueue(): void {
    this.unblockStuckSpeechSynth();
    if (this.speaking || this.pauseTimer || this.queue.length === 0) return;

    const synth = getSynth();
    if (!synth) {
      this.queue = [];
      return;
    }

    if (!speechUnlocked) return;

    primeVoicesOnce();
    resumeSynthIfPaused();

    if (!primeSpanishVoicesReady()) {
      if (!voicesLoadBypass) {
        voicesLoadBypass = true;
        const retry = () => this.processQueue();
        synth.addEventListener(
          "voiceschanged",
          () => {
            voicesLoadBypass = false;
            retry();
          },
          { once: true }
        );
        window.setTimeout(retry, VOICES_LOAD_WAIT_MS);
        return;
      }
    } else {
      voicesLoadBypass = false;
    }

    const item = this.queue.shift()!;
    this.currentItem = item;
    this.speaking = true;
    this.armStuckReset();

    let phraseRetries = 0;
    const maxPhraseRetries = 2;
    let phraseStartedHandled = false;
    let phraseStartedFallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const firePhraseStartedOnce = () => {
      if (phraseStartedHandled) return;
      phraseStartedHandled = true;
      if (phraseStartedFallbackTimer) {
        clearTimeout(phraseStartedFallbackTimer);
        phraseStartedFallbackTimer = null;
      }
      if (item.onPhraseStarted) {
        item.onPhraseStarted();
      }
      this.firePhraseStarted();
    };

    const finishItem = () => {
      if (item.releaseKey) this.activeKeys.delete(item.releaseKey);
      if (item.key && !item.releaseKey) this.activeKeys.delete(item.key);
      this.speaking = false;
      this.currentItem = null;
      this.clearStuckTimer();

      const pauseMs = item.pauseAfterMs ?? 0;
      if (pauseMs > 0 && this.queue.length > 0) {
        this.pauseTimer = setTimeout(() => {
          this.pauseTimer = null;
          this.processQueue();
          notifySpeechQueueIdle();
        }, pauseMs);
      } else {
        this.processQueue();
        notifySpeechQueueIdle();
      }
    };

    const speakPhrase = () => {
      const ok = speakUtterance(
        item.text,
        {
          onstart: () => {
            if (this.pendingOnPhraseStartedArmed || item.onPhraseStarted) {
              phraseStartedFallbackTimer = setTimeout(() => {
                firePhraseStartedOnce();
              }, PHRASE_STARTED_FALLBACK_MS);
            }
            firePhraseStartedOnce();
          },
          onend: () => {
            firePhraseStartedOnce();
            finishItem();
          },
          onerror: () => {
            if (phraseRetries < maxPhraseRetries) {
              phraseRetries += 1;
              this.speaking = false;
              this.clearStuckTimer();
              warmupSpeechSynthesis(true);
              resumeSynthIfPaused();
              window.setTimeout(speakPhrase, 280);
              return;
            }
            finishItem();
          },
        },
        item.configure ?? (u => applyCalmSpanishUtterance(u, item.channel))
      );

      if (!ok) {
        finishItem();
      }
    };

    try {
      speakPhrase();
    } catch {
      finishItem();
    }
  }

  recover(): void {
    const synth = getSynth();
    if (!synth) return;

    resumeSynthIfPaused();
    primeVoicesOnce();
    this.unblockStuckSpeechSynth();

    const synthSpeaking = synth.speaking;
    const flagStuck = this.speaking && !synthSpeaking;

    if (flagStuck) {
      this.speaking = false;
      this.currentItem = null;
      this.clearStuckTimer();
    }

    if (this.queue.length > 0 && !this.speaking && !speechUnlocked) {
      return;
    }

    if (this.queue.length > 0 && !this.speaking && !this.pauseTimer) {
      this.processQueue();
      return;
    }

    if (flagStuck && this.queue.length === 0) {
      try {
        synth.cancel();
      } catch {
        /* noop */
      }
    }
  }

  releaseAfterExternalCancel(): void {
    this.speaking = false;
    this.currentItem = null;
    this.clearStuckTimer();
    this.clearPhraseStartedCallback();
    notifySpeechQueueIdle();
  }
}

export const voiceEngine = new VoiceEngine();

/** Se dispara cuando la cola quedó vacía y no hay utterance activo. */
export function subscribeSpeechQueueIdle(listener: () => void): () => void {
  idleListeners.add(listener);
  return () => idleListeners.delete(listener);
}

/** Punto Cero u otros canales — reset local al cancelar synth globalmente (solo emergencia). */
export function subscribeSpeechExternalCancel(listener: () => void): () => void {
  externalCancelListeners.add(listener);
  return () => externalCancelListeners.delete(listener);
}

export type SpeechDiagnostics = {
  synthAvailable: boolean;
  speechUnlocked: boolean;
  voiceCount: number;
  spanishVoiceCount: number;
  speaking: boolean;
  queueLength: number;
  channels: {
    situacion: boolean;
    desglosador: boolean;
    puerta: boolean;
  };
};

export type SpeakVoiceProbeResult = {
  ok: boolean;
  reason?: string;
};

/**
 * Emisión TTS de bajo nivel — solo voiceEngine y unlock warmup.
 */
export function speakUtterance(
  text: string,
  handlers: UtteranceHandlers = {},
  configure?: (u: SpeechSynthesisUtterance) => void
): boolean {
  const synth = getSynth();
  if (!synth || !text.trim()) return false;

  resumeSynthIfPaused();

  try {
    const u = new SpeechSynthesisUtterance(text);
    if (configure) {
      configure(u);
    } else {
      applyCalmSpanishUtterance(u);
    }
    u.onstart = () => handlers.onstart?.();
    u.onend = () => handlers.onend?.();
    u.onerror = () => {
      if (typeof console !== "undefined") {
        console.error("[speechQueue] utterance error");
      }
      handlers.onerror?.();
    };
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

/** Otro módulo llamó speechSynthesis.cancel() — libera flags para que la cola vuelva a hablar. */
export function releaseSpeechQueueAfterExternalCancel(): void {
  voiceEngine.releaseAfterExternalCancel();
}

/**
 * @deprecated Preferir voiceEngine.stopChannel. Solo emergencia o compat tests.
 * clearUbicacionQueue=false libera flags sin vaciar cola.
 */
export function interruptAllSpeechSynth(clearUbicacionQueue = true): void {
  if (clearUbicacionQueue) {
    voiceEngine.stopAllPending();
  }
  voiceEngine.releaseAfterExternalCancel();
  try {
    getSynth()?.cancel();
  } catch {
    /* noop */
  }
  notifyExternalSpeechCancelListeners();
}

export function isUbicacionPhraseQueued(text: string): boolean {
  return voiceEngine.isPhraseQueued(text);
}

export function isUbicacionSpeechActive(): boolean {
  const synth = getSynth();
  return voiceEngine.isSpeaking() || !!(synth?.speaking || synth?.pending);
}

export function recoverSpeechQueue(): void {
  voiceEngine.recover();
}

export function isSpeechSynthesisUnlocked(): boolean {
  return speechUnlocked;
}

export function getSpeechDiagnostics(): SpeechDiagnostics {
  const synth = getSynth();
  const voices = synth?.getVoices() ?? [];
  const spanishVoiceCount = voices.filter(v => /^es/i.test(v.lang)).length;
  return {
    synthAvailable: !!synth,
    speechUnlocked,
    voiceCount: voices.length,
    spanishVoiceCount,
    speaking: voiceEngine.isSpeaking(),
    queueLength: voiceEngine.queueLength(),
    channels: {
      situacion: isSituacionAlertsEnabled(),
      desglosador: isDesglosadorVoiceEnabled(),
      puerta: isPuertaVozEnabled(),
    },
  };
}

/** Solo tests — reinicia estado interno de la cola. */
export function resetSpeechQueueForTests(): void {
  voiceEngine.hardReset();
}

/** Cancelación fulminante — teardown de emergencia / WebView móvil. */
export function cancelSpeechSynthesisHard(): void {
  voiceEngine.hardReset();
}

/**
 * Desbloquea speechSynthesis (obligatorio en móvil).
 * Debe llamarse sincrónicamente dentro de pointerdown/click del usuario.
 */
export function unlockSpeechSynthesis(fromUserGesture = false): void {
  const synth = getSynth();
  if (!synth) return;
  primeVoicesOnce();
  resumeSynthIfPaused();
  lastWarmupMs = Date.now();

  if (speechUnlocked) {
    if (voiceEngine.queueLength() > 0 && !voiceEngine.isSpeaking()) {
      voiceEngine.processQueue();
    }
    return;
  }

  try {
    const u = new SpeechSynthesisUtterance("\u200b");
    applyCalmSpanishUtterance(u);
    u.volume = fromUserGesture ? 0.02 : 0.001;
    u.rate = 1.15;
    u.onend = () => {
      speechUnlocked = true;
      voiceEngine.processQueue();
    };
    u.onerror = () => {
      speechUnlocked = true;
      voiceEngine.processQueue();
    };
    synth.speak(u);
    if (fromUserGesture) speechUnlocked = true;
  } catch {
    if (fromUserGesture) speechUnlocked = true;
  }

  if (speechUnlocked && voiceEngine.queueLength() > 0 && !voiceEngine.isSpeaking()) {
    voiceEngine.processQueue();
  }
}

export function warmupSpeechSynthesis(force = false, fromUserGesture = false): void {
  if (fromUserGesture) {
    unlockSpeechSynthesis(true);
    return;
  }
  const synth = getSynth();
  if (!synth) return;
  const now = Date.now();
  if (!force && now - lastWarmupMs < WARMUP_REFRESH_MS) return;
  lastWarmupMs = now;
  try {
    primeVoicesOnce();
    resumeSynthIfPaused();
  } catch {
    /* noop */
  }
}

export function speakVoiceProbe(source: UbicacionVoiceSource = "puerta"): SpeakVoiceProbeResult {
  const synth = getSynth();
  if (!synth) {
    return { ok: false, reason: "Sin speechSynthesis en este navegador" };
  }
  if (!isVoiceEnabledFor(source)) {
    return { ok: false, reason: "Canal de voz desactivado" };
  }

  unlockSpeechSynthesis(true);
  recoverSpeechQueue();
  speakUbicacionQueue(["SISTEMICAR. Voz activa, operador."], false, source);

  const diag = getSpeechDiagnostics();
  if (!diag.speechUnlocked) {
    return { ok: false, reason: "TTS bloqueado — tocá de nuevo en pantalla" };
  }
  if (diag.voiceCount === 0) {
    return { ok: true, reason: "Sin voces TTS — recarga o usa Chrome" };
  }
  return { ok: true };
}

/**
 * Encola frases y las reproduce en orden.
 * cancelPrevious=true vacía solo el sub-canal del source (no cancel global).
 */
export function speakUbicacionQueue(
  phrases: string[],
  cancelPrevious = false,
  source: UbicacionVoiceSource = "situacion",
  onPhraseStarted?: () => void,
  batchKey?: string
): void {
  const filtered = phrases.map(p => p.trim()).filter(Boolean);
  if (filtered.length === 0) return;
  if (!getSynth()) return;

  if (!isVoiceEnabledFor(source)) return;

  if (isBackground()) {
    enqueueForBackground(filtered, source);
    return;
  }

  if (!speechUnlocked) {
    warmupSpeechSynthesis(true);
  } else {
    resumeSynthIfPaused();
    primeVoicesOnce();
  }

  const channel = sourceToChannel(source);

  if (cancelPrevious) {
    voiceEngine.stopChannel(channel);
  }

  if (batchKey && voiceEngine.isKeyActive(batchKey)) {
    return;
  }

  voiceEngine.setPhraseStartedCallback(onPhraseStarted ?? null);

  const now = Date.now();
  const items: QueueItem[] = [];

  for (let i = 0; i < filtered.length; i++) {
    const phrase = filtered[i]!;
    if (
      !batchKey &&
      phrase === lastQueuedPhrase &&
      now - lastQueuedAtMs < PHRASE_ENQUEUE_DEDUP_MS &&
      (voiceEngine.isPhraseQueued(phrase) || isUbicacionSpeechActive())
    ) {
      continue;
    }

    if (batchKey && i === 0) {
      voiceEngine.markKeyActive(batchKey);
    }

    items.push({
      text: phrase,
      channel,
      priority: channelPriority(channel),
      onPhraseStarted: i === 0 ? onPhraseStarted : undefined,
      releaseKey: batchKey && i === filtered.length - 1 ? batchKey : undefined,
    });

    lastQueuedPhrase = phrase;
    lastQueuedAtMs = now;
  }

  if (items.length === 0) {
    voiceEngine.clearPhraseStartedCallback();
    notifySpeechQueueIdle();
    return;
  }

  voiceEngine.enqueueBatch(items);

  if (!voiceEngine.isSpeaking() && voiceEngine.queueLength() === 0) {
    voiceEngine.clearPhraseStartedCallback();
    notifySpeechQueueIdle();
  }
}

export function speakUbicacionSingle(
  text: string,
  source: UbicacionVoiceSource = "situacion"
): void {
  speakUbicacionQueue([text], false, source);
}

/** API directa del motor — texto, canal, key opcional. */
export function speakVoiceEngine(
  text: string,
  channel: VoiceChannel,
  key?: string,
  opts?: {
    priority?: number;
    pauseAfterMs?: number;
    configure?: (u: SpeechSynthesisUtterance) => void;
    cancelChannel?: boolean;
    onPhraseStarted?: () => void;
  }
): boolean {
  const trimmed = text.trim();
  if (!trimmed || !getSynth()) return false;

  if (opts?.cancelChannel) {
    voiceEngine.stopChannel(channel);
  }

  if (key && voiceEngine.isKeyActive(key)) {
    return false;
  }

  if (key) {
    voiceEngine.markKeyActive(key);
  }

  if (!speechUnlocked) {
    warmupSpeechSynthesis(true);
  } else {
    resumeSynthIfPaused();
    primeVoicesOnce();
  }

  voiceEngine.enqueue({
    text: trimmed,
    channel,
    key,
    priority: opts?.priority,
    pauseAfterMs: opts?.pauseAfterMs,
    configure: opts?.configure,
    onPhraseStarted: opts?.onPhraseStarted,
    releaseKey: key,
  });

  return true;
}
