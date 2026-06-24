import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  installVoiceLifecycleHub,
  registerVoiceVisibleHandler,
  resetVoiceLifecycleForTests,
  triggerVoiceVisibleRecoveryForTests,
} from "./voiceLifecycle.ts";

function installDom() {
  let visibleHandlers = 0;
  const doc = {
    hidden: false,
    visibilityState: "visible" as DocumentVisibilityState,
    addEventListener: (type: string, fn: () => void) => {
      if (type === "visibilitychange") {
        (doc as { _vis?: () => void })._vis = fn;
      }
    },
    removeEventListener: () => {},
  };
  const win = {
    document: doc,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args),
    clearTimeout: (...args: Parameters<typeof clearTimeout>) => clearTimeout(...args),
    speechSynthesis: {
      speaking: false,
      pending: false,
      paused: false,
      getVoices: () => [{ lang: "es-ES", name: "Test" }],
      speak: () => {},
      cancel: () => {},
      resume: () => {},
      addEventListener: () => {},
    },
    localStorage: { getItem: () => null, setItem: () => {} },
    dispatchEvent: () => true,
  };
  (globalThis as typeof globalThis & { window: Window; document: Document }).window =
    win as unknown as Window;
  (globalThis as typeof globalThis & { document: Document }).document = doc as unknown as Document;
  return {
    registerHandler: () => {
      visibleHandlers += 1;
    },
    getHandlerCount: () => visibleHandlers,
  };
}

describe("voiceLifecycle", () => {
  afterEach(() => {
    resetVoiceLifecycleForTests();
  });

  it("visible recovery dispara handlers registrados sin doble cancel", async () => {
    installDom();
    const speech = await import("./speechQueue.ts");
    speech.resetSpeechQueueForTests();

    let handlerCalls = 0;
    registerVoiceVisibleHandler(() => {
      handlerCalls += 1;
    });

    triggerVoiceVisibleRecoveryForTests();
    assert.equal(handlerCalls, 1);
  });

  it("installVoiceLifecycleHub registra un solo listener de visibility", () => {
    installDom();
    let addCount = 0;
    const doc = document as Document & { addEventListener: typeof document.addEventListener };
    const orig = doc.addEventListener.bind(doc);
    doc.addEventListener = ((type: string, ...rest: unknown[]) => {
      if (type === "visibilitychange") addCount += 1;
      return orig(type, ...(rest as Parameters<typeof document.addEventListener>));
    }) as typeof document.addEventListener;

    const stop = installVoiceLifecycleHub();
    assert.equal(addCount, 1);
    stop();
  });
});
