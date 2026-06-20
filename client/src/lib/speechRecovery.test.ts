import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("speechRecovery", () => {
  it("hardResetSpeechSystems no lanza sin window.speechSynthesis", async () => {
    const mod = await import("./speechRecovery.ts");
    assert.doesNotThrow(() => mod.hardResetSpeechSystems(true));
    assert.equal(mod.isSpeechSystemStuck(), false);
  });
});
