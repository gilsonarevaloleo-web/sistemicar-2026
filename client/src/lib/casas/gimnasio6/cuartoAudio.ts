/**
 * Cama del cuarto del gimnasio: ruido filtrado bajo, sin CDN ni meditación.
 * Se desbloquea con el gesto de Entrar. Mute y corte al salir.
 */

let sharedCtx: AudioContext | null = null;
let cama: {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
} | null = null;
let muted = false;
let capituloCama: number | null = null;

function audioContextClass(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function getCtx(): AudioContext | null {
  const AC = audioContextClass();
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new AC();
  return sharedCtx;
}

function gainDeCapitulo(capitulo: number): number {
  return capitulo === 2 ? 0.032 : 0.018;
}

function filtroDeCapitulo(capitulo: number): number {
  return capitulo === 2 ? 480 : 170;
}

function bufferRuido(ctx: AudioContext, segundos = 2): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * segundos);
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.97 + white * 0.03;
    data[i] = last;
  }
  return buffer;
}

export async function unlockCuartoAudio(): Promise<void> {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
  } catch {
    /* sin audio */
  }
}

export function setCuartoMute(next: boolean): void {
  muted = next;
  if (!cama) return;
  const ctx = getCtx();
  if (!ctx) return;
  const target = next || capituloCama == null ? 0.0001 : gainDeCapitulo(capituloCama);
  try {
    cama.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
  } catch {
    /* noop */
  }
}

export function isCuartoMute(): boolean {
  return muted;
}

export function stopCamaCuarto(): void {
  if (!cama) {
    capituloCama = null;
    return;
  }
  try {
    cama.source.stop();
    cama.source.disconnect();
    cama.filter.disconnect();
    cama.gain.disconnect();
  } catch {
    /* already stopped */
  }
  cama = null;
  capituloCama = null;
}

export function startCamaCuarto(capitulo: number): void {
  if (muted) {
    capituloCama = capitulo;
    return;
  }
  try {
    const ctx = getCtx();
    if (!ctx || ctx.state !== "running") return;
    if (cama && capituloCama === capitulo) return;
    stopCamaCuarto();
    const source = ctx.createBufferSource();
    source.buffer = bufferRuido(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filtroDeCapitulo(capitulo);
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    gain.gain.setTargetAtTime(gainDeCapitulo(capitulo), ctx.currentTime, 0.4);
    cama = { source, filter, gain };
    capituloCama = capitulo;
  } catch {
    cama = null;
    capituloCama = null;
  }
}

/** One-shot al cambiar de paso. No en cada tecla ni en la variante. */
export function playPasoCuarto(): void {
  if (muted) return;
  try {
    const ctx = getCtx();
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(capituloCama === 2 ? 196 : 146, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.48);
  } catch {
    /* noop */
  }
}
