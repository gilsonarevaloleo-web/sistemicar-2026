import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { J4_GPS_CLIP_IDS, J4_GPS_CLIPS, j4GpsClip } from "./gpsClipCatalog.ts";
import {
  J4_GPS_CLIPS_PREF_KEY,
  isJ4GpsClipsEnabled,
  setJ4GpsClipsEnabled,
} from "./gpsClipPref.ts";
import {
  playJ4GpsClip,
  resetJ4GpsClipPlayerForTests,
  scheduleJ4GpsClip,
  stopJ4GpsClips,
  unlockJ4GpsClips,
} from "./gpsClipPlayer.ts";

const voiceDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/voice/j4"
);

function mockLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: ls,
    configurable: true,
  });
  return store;
}

type FakeAudio = {
  src: string;
  volume: number;
  paused: boolean;
  playsInline: boolean;
  controls: boolean;
  preload: string;
  playCalls: number;
  pauseCalls: number;
  play: () => Promise<void>;
  pause: () => void;
  load: () => void;
  removeAttribute: (name: string) => void;
  setAttribute: (name: string, value: string) => void;
  onended: null | (() => void);
  onerror: null | (() => void);
};

function installFakeAudio(opts?: { playRejects?: boolean }): { last: () => FakeAudio | null } {
  let last: FakeAudio | null = null;
  class FakeAudioCtor {
    src = "";
    volume = 1;
    paused = true;
    playsInline = false;
    controls = false;
    preload = "";
    playCalls = 0;
    pauseCalls = 0;
    onended: null | (() => void) = null;
    onerror: null | (() => void) = null;
    constructor() {
      last = this as unknown as FakeAudio;
    }
    play() {
      this.playCalls += 1;
      if (opts?.playRejects) return Promise.reject(new Error("blocked"));
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.pauseCalls += 1;
      this.paused = true;
    }
    load() {}
    removeAttribute(name: string) {
      if (name === "src") this.src = "";
    }
    setAttribute() {}
  }
  (globalThis as unknown as { Audio: unknown; window: unknown }).Audio = FakeAudioCtor;
  (globalThis as unknown as { window: unknown }).window = globalThis;
  return { last: () => last };
}

describe("gpsClipCatalog", () => {
  it("cada id wired tiene mp3 en client/public/voice/j4", () => {
    for (const id of J4_GPS_CLIP_IDS) {
      const clip = j4GpsClip(id);
      const file = join(voiceDir, `${id}.mp3`);
      assert.equal(existsSync(file), true, `falta ${file}`);
      assert.ok(statSync(file).size > 400, `${id} demasiado pequeño`);
      assert.equal(clip.src, `/voice/j4/${id}.mp3`);
    }
  });

  it("lanzar y activar están cableados; hueco/sello/umbral no (evita tick)", () => {
    assert.equal(J4_GPS_CLIPS.lanzar.wired, true);
    assert.equal(J4_GPS_CLIPS.activar.wired, true);
    assert.equal(J4_GPS_CLIPS.hueco.wired, false);
    assert.equal(J4_GPS_CLIPS.sello.wired, false);
    assert.equal(J4_GPS_CLIPS.umbral.wired, false);
  });
});

describe("gpsClipPref", () => {
  afterEach(() => {
    resetJ4GpsClipPlayerForTests();
  });

  it("default OFF si la clave no existe", () => {
    mockLocalStorage();
    assert.equal(isJ4GpsClipsEnabled(), false);
  });

  it("solo 'on' enciende el canal", () => {
    const store = mockLocalStorage();
    store.set(J4_GPS_CLIPS_PREF_KEY, "off");
    assert.equal(isJ4GpsClipsEnabled(), false);
    setJ4GpsClipsEnabled(true);
    assert.equal(isJ4GpsClipsEnabled(), true);
    setJ4GpsClipsEnabled(false);
    assert.equal(isJ4GpsClipsEnabled(), false);
  });
});

describe("gpsClipPlayer", () => {
  afterEach(() => {
    resetJ4GpsClipPlayerForTests();
  });

  it("con interruptor off no llama play", () => {
    mockLocalStorage();
    const fake = installFakeAudio();
    playJ4GpsClip("lanzar");
    assert.equal(fake.last(), null);
  });

  it("con interruptor on reproduce el src de lanzar", async () => {
    mockLocalStorage();
    setJ4GpsClipsEnabled(true);
    const fake = installFakeAudio();
    playJ4GpsClip("lanzar");
    const a = fake.last();
    assert.ok(a);
    assert.equal(a.src, "/voice/j4/lanzar.mp3");
    assert.equal(a.playCalls, 1);
  });

  it("play() rechazado no tira y no reintenta", () => {
    mockLocalStorage();
    setJ4GpsClipsEnabled(true);
    const fake = installFakeAudio({ playRejects: true });
    assert.doesNotThrow(() => playJ4GpsClip("lanzar"));
    assert.equal(fake.last()?.playCalls, 1);
  });

  it("unlock no corre si está apagado", () => {
    mockLocalStorage();
    const fake = installFakeAudio();
    unlockJ4GpsClips();
    assert.equal(fake.last(), null);
  });

  it("scheduleJ4GpsClip no usa delays de 4s/13s", () => {
    mockLocalStorage();
    setJ4GpsClipsEnabled(true);
    installFakeAudio();
    const orig = globalThis.setTimeout;
    const delays: number[] = [];
    (globalThis as unknown as { setTimeout: typeof setTimeout }).setTimeout = ((
      fn: () => void,
      ms?: number
    ) => {
      delays.push(ms ?? 0);
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout;
    try {
      scheduleJ4GpsClip("lanzar");
    } finally {
      globalThis.setTimeout = orig;
    }
    assert.ok(delays.every(d => d <= 600), `delays sospechosos: ${delays.join(",")}`);
  });

  it("stop no tira sin elemento", () => {
    assert.doesNotThrow(() => stopJ4GpsClips());
  });
});

describe("gpsClipPlayer contrato fuente", () => {
  it("el reproductor no importa ni llama speechSynthesis / speechQueue", () => {
    const src = join(dirname(fileURLToPath(import.meta.url)), "gpsClipPlayer.ts");
    const text = readFileSync(src, "utf8");
    assert.equal(/from ["']@\/lib\/speechQueue/.test(text), false);
    assert.equal(/speechSynthesis\s*\./.test(text), false);
    assert.equal(/window\.speechSynthesis/.test(text), false);
    assert.equal(/addEventListener\(\s*["']pointerdown/.test(text), false);
  });
});
