import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  beginJornadaRemount,
  endJornadaRemount,
  getIsRemountingJornada,
  isJornadaHeavyComputeAllowed,
  resetJornadaRemountForTests,
  shouldDeferJornadaVoice,
} from "./jornadaRemount.ts";

describe("jornadaRemount", () => {
  afterEach(() => {
    resetJornadaRemountForTests();
  });

  it("bloquea heavy compute durante remount sin diferir voz", () => {
    beginJornadaRemount({ heavyDeferMs: 500 });
    assert.equal(getIsRemountingJornada(), true);
    assert.equal(shouldDeferJornadaVoice(), false);
    assert.equal(isJornadaHeavyComputeAllowed(), false);
    endJornadaRemount();
    assert.equal(getIsRemountingJornada(), false);
    assert.equal(isJornadaHeavyComputeAllowed(), false);
  });
});
