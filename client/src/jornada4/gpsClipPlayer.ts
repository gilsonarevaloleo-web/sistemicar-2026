/**
 * Reproductor GPS Dual Kernel — un HTMLAudioElement.
 *
 * Contrato anti-pesadilla:
 * - Cero TTS del navegador. Cero cola clásica. Cero listener global por frase.
 * - Cero retry. Cero tick. Si play() falla, la Jornada sigue.
 * - Un canal: un clip a la vez; el nuevo corta al anterior.
 * - Unlock solo en gesto del operador.
 */
import { j4GpsClip, type J4GpsClipId } from "./gpsClipCatalog";
import { isJ4GpsClipsEnabled } from "./gpsClipPref";

let el: HTMLAudioElement | null = null;
let unlocked = false;
let playGeneration = 0;

function getEl(): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  if (el) return el;
  try {
    el = new Audio();
    el.preload = "auto";
    el.setAttribute("playsinline", "true");
    el.controls = false;
  } catch {
    el = null;
  }
  return el;
}

export function isJ4GpsClipUnlocked(): boolean {
  return unlocked;
}

/** Gesto del operador: desbloquea audio móvil con un clip silencioso. Nunca tira. */
export function unlockJ4GpsClips(): void {
  try {
    if (!isJ4GpsClipsEnabled()) return;
    const a = getEl();
    if (!a) return;
    a.volume = 0.01;
    a.src = j4GpsClip("silence").src;
    const genAtStart = playGeneration;
    const p = a.play();
    if (p && typeof p.then === "function") {
      void p
        .then(() => {
          if (genAtStart !== playGeneration) return;
          try {
            if (!String(a.src).includes("silence")) return;
            a.pause();
            a.volume = 0.85;
            unlocked = true;
          } catch {
            unlocked = true;
          }
        })
        .catch(() => {
          /* iOS / autoplay — se reintenta en el próximo gesto, no con timer */
        });
    } else {
      unlocked = true;
      a.volume = 0.85;
    }
  } catch {
    /* fail silent */
  }
}

export function stopJ4GpsClips(): void {
  playGeneration += 1;
  try {
    if (!el) return;
    el.pause();
    el.removeAttribute("src");
    el.load();
  } catch {
    /* noop */
  }
}

/**
 * Reproduce un clip. Si el interruptor está off, no hay Audio, o play() rechaza:
 * no-op. No encola. No reintenta.
 */
export function playJ4GpsClip(id: J4GpsClipId): void {
  try {
    if (id === "silence") return;
    if (!isJ4GpsClipsEnabled()) return;
    const clip = j4GpsClip(id);
    const a = getEl();
    if (!a) return;
    playGeneration += 1;
    const gen = playGeneration;
    try {
      a.pause();
    } catch {
      /* noop */
    }
    a.onended = null;
    a.onerror = null;
    a.volume = 0.85;
    a.src = clip.src;
    a.onerror = () => {
      if (gen === playGeneration) {
        try {
          a.removeAttribute("src");
        } catch {
          /* noop */
        }
      }
    };
    const p = a.play();
    if (p && typeof p.catch === "function") {
      void p.catch(() => {
        /* fail silent — no retry */
      });
    }
  } catch {
    /* fail silent */
  }
}

/** Tras paint: no es bomba 4s/13s; idle corto para no pelear el frame de lanzamiento. */
export function scheduleJ4GpsClip(id: J4GpsClipId): void {
  const fire = () => playJ4GpsClip(id);
  try {
    if (typeof requestAnimationFrame === "undefined") {
      setTimeout(fire, 0);
      return;
    }
    requestAnimationFrame(() => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(fire, { timeout: 600 });
      } else {
        setTimeout(fire, 0);
      }
    });
  } catch {
    try {
      fire();
    } catch {
      /* noop */
    }
  }
}

/** Tests: suelta el elemento y el flag de unlock. */
export function resetJ4GpsClipPlayerForTests(): void {
  stopJ4GpsClips();
  el = null;
  unlocked = false;
  playGeneration = 0;
}
