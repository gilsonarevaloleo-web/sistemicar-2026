import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";

type MockUtterance = {
  text: string;
  onend?: () => void;
  onerror?: () => void;
  onstart?: () => void;
};

function installDomMocks() {
  const storage = new Map<string, string>();
  const spoken: string[] = [];

  class MockSpeechSynthesisUtterance {
    text: string;
    lang = "es-ES";
    rate = 1;
    pitch = 1;
    volume = 1;
    voice: SpeechSynthesisVoice | null = null;
    onend?: () => void;
    onerror?: () => void;
    onstart?: () => void;

    constructor(text: string) {
      this.text = text;
    }
  }

  (globalThis as typeof globalThis & { SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance }).SpeechSynthesisUtterance =
    MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance;

  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: () => [{ lang: "es-ES", name: "Test ES" } as SpeechSynthesisVoice],
    speak: (u: MockUtterance) => {
      spoken.push(u.text);
      queueMicrotask(() => {
        u.onstart?.();
        u.onend?.();
      });
    },
    cancel: () => {
      synth.speaking = false;
    },
    resume: () => {},
    addEventListener: (_event: string, _handler: () => void, _options?: { once?: boolean }) => {},
  };

  const doc = { hidden: false };
  const win = {
    document: doc,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    },
    setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args),
    clearTimeout: (...args: Parameters<typeof clearTimeout>) => clearTimeout(...args),
    speechSynthesis: synth,
    dispatchEvent: () => true,
  };

  (globalThis as typeof globalThis & { window: Window; document: Document }).window =
    win as unknown as Window;
  (globalThis as typeof globalThis & { document: Document }).document = doc as unknown as Document;

  return { spoken };
}

async function flushMicrotasks(): Promise<void> {
  await new Promise<void>(resolve => queueMicrotask(resolve));
  await new Promise<void>(resolve => queueMicrotask(resolve));
}

describe("puntoCeroVoice", () => {
  afterEach(async () => {
    const speech = await import("./speechQueue.ts");
    speech.resetSpeechQueueForTests();
    const pc = await import("./puntoCeroVoice.ts");
    pc.stopPleasantVoice();
  });

  it("speakEtapaPuntoCero encola y reproduce toda la guía de etapa1 con intro", async () => {
    const { spoken } = installDomMocks();
    const speech = await import("./speechQueue.ts");
    speech.resetSpeechQueueForTests();
    const pc = await import("./puntoCeroVoice.ts");
    const guides = await import("./puntoCeroGuides.ts");

    speech.unlockSpeechSynthesis(true);
    await flushMicrotasks();

    const expectedCount = guides.PUNTO_CERO_INTRO_VOZ.length + guides.PUNTO_CERO_ETAPAS.etapa1.voz.length;
    pc.speakEtapaPuntoCero("etapa1", { intro: true });

    for (let i = 0; i < expectedCount; i++) {
      await flushMicrotasks();
      await new Promise<void>(resolve => setTimeout(resolve, 900));
    }

    assert.equal(spoken.filter(t => t.trim() && t !== "\u200b").length, expectedCount);
    const content = spoken.filter(t => t.trim() && t !== "\u200b");
    assert.match(content[0]!, /Punto Cero/i);
    assert.match(content.at(-1)!, /observ/i);
  });
});
