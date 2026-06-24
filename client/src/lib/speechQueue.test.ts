import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";

type MockUtterance = {
  text: string;
  onend?: () => void;
  onerror?: () => void;
  onstart?: () => void;
};

function installDomMocks(opts?: { voices?: SpeechSynthesisVoice[] }) {
  const storage = new Map<string, string>();
  let cancelCount = 0;
  let speakCount = 0;
  const utterances: MockUtterance[] = [];

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
    getVoices: () => opts?.voices ?? [],
    speak: (u: MockUtterance) => {
      speakCount += 1;
      utterances.push(u);
      queueMicrotask(() => {
        u.onstart?.();
        u.onend?.();
      });
    },
    cancel: () => {
      cancelCount += 1;
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

  return {
    get cancelCount() {
      return cancelCount;
    },
    get speakCount() {
      return speakCount;
    },
    utterances,
  };
}

async function flushMicrotasks(): Promise<void> {
  await new Promise<void>(resolve => queueMicrotask(resolve));
  await new Promise<void>(resolve => queueMicrotask(resolve));
}

describe("speechQueue", () => {
  afterEach(async () => {
    const mod = await import("./speechQueue.ts");
    mod.resetSpeechQueueForTests();
  });

  it("speakVoiceProbe no cancela la cola previa (cancelPrevious false)", async () => {
    const synthMock = installDomMocks({
      voices: [{ lang: "es-ES", name: "Test ES" } as SpeechSynthesisVoice],
    });
    const mod = await import("./speechQueue.ts");
    mod.resetSpeechQueueForTests();
    const cancelsBefore = synthMock.cancelCount;

    const result = mod.speakVoiceProbe("puerta");
    await flushMicrotasks();

    assert.equal(result.ok, true);
    assert.equal(synthMock.cancelCount, cancelsBefore);
    assert.ok(synthMock.utterances.some(u => u.text.includes("SISTEMICAR")));
  });

  it("getSpeechDiagnostics expone voiceCount", async () => {
    installDomMocks({
      voices: [{ lang: "es-ES", name: "Test ES" } as SpeechSynthesisVoice],
    });
    const mod = await import("./speechQueue.ts");
    mod.resetSpeechQueueForTests();
    mod.unlockSpeechSynthesis(true);

    const diag = mod.getSpeechDiagnostics();
    assert.equal(diag.synthAvailable, true);
    assert.equal(diag.voiceCount, 1);
    assert.equal(diag.spanishVoiceCount, 1);
    assert.equal(diag.speechUnlocked, true);
  });

  it("processQueue habla sin voces tras timeout de carga", async () => {
    const synthMock = installDomMocks({ voices: [] });
    const mod = await import("./speechQueue.ts");
    mod.resetSpeechQueueForTests();
    mod.unlockSpeechSynthesis(true);

    mod.speakUbicacionQueue(["Frase de prueba sin voces"], false, "puerta");
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    await flushMicrotasks();

    assert.ok(synthMock.utterances.some(u => u.text.includes("Frase de prueba")));
  });

  it("interruptAllSpeechSynth libera cola tras cancel externo sin onend", async () => {
    const storage = new Map<string, string>();
    let speakCount = 0;
    const utterances: MockUtterance[] = [];
    let stallNextSpeak = false;

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
        speakCount += 1;
        utterances.push(u);
        if (stallNextSpeak) {
          stallNextSpeak = false;
          synth.speaking = true;
          return;
        }
        queueMicrotask(() => {
          synth.speaking = false;
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

    const mod = await import("./speechQueue.ts");
    mod.resetSpeechQueueForTests();
    mod.unlockSpeechSynthesis(true);
    await flushMicrotasks();

    stallNextSpeak = true;
    mod.speakUbicacionQueue(["Primera frase"], false, "puerta");
    assert.equal(mod.getSpeechDiagnostics().speaking, true);

    mod.interruptAllSpeechSynth(false);
    assert.equal(mod.getSpeechDiagnostics().speaking, false);

    mod.speakUbicacionQueue(["Segunda frase"], false, "puerta");
    await flushMicrotasks();

    assert.ok(utterances.some(u => u.text.includes("Segunda frase")));
    assert.ok(speakCount >= 2);
  });

  it("pauseVoice no hace cancel global redundante si no hay utterance activo", async () => {
    const synthMock = installDomMocks();
    const mod = await import("./speechQueue.ts");
    mod.resetSpeechQueueForTests();
    mod.unlockSpeechSynthesis(true);
    await flushMicrotasks();

    const cancelsBefore = synthMock.cancelCount;
    mod.pauseVoice();
    assert.equal(synthMock.cancelCount, cancelsBefore);
  });
});
