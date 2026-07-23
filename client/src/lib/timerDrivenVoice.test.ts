import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TIMER_DRIVEN_VOICE_DEFAULT, isTimerDrivenVoiceEnabled } from "./timerDrivenVoice.ts";

describe("timerDrivenVoice", () => {
  it("por defecto desactiva voz por temporizador", () => {
    assert.equal(TIMER_DRIVEN_VOICE_DEFAULT, false);
    // Sin override de localStorage (o sin storage), debe quedar off.
    assert.equal(isTimerDrivenVoiceEnabled(), false);
  });
});
