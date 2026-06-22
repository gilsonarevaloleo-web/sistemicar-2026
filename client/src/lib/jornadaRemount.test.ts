import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  beginJornadaRemount,
  deferJornadaVoice,
  endJornadaRemount,
  getIsRemountingJornada,
  getJornadaPendingVoiceCountForTests,
  isJornadaHeavyComputeAllowed,
  resetJornadaRemountForTests,
  shouldDeferJornadaVoice,
} from "./jornadaRemount.ts";

describe("jornadaRemount", () => {
  afterEach(() => {
    resetJornadaRemountForTests();
  });

  it("bloquea voz y heavy compute durante remount", () => {
    beginJornadaRemount({ heavyDeferMs: 500 });
    assert.equal(getIsRemountingJornada(), true);
    assert.equal(shouldDeferJornadaVoice(), true);
    assert.equal(isJornadaHeavyComputeAllowed(), false);
    deferJornadaVoice(() => {});
    assert.equal(getJornadaPendingVoiceCountForTests(), 1);
    endJornadaRemount({ voiceFlushDelayMs: 0 });
    assert.equal(getIsRemountingJornada(), false);
    assert.equal(shouldDeferJornadaVoice(), false);
  });
});
