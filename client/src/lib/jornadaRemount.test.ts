import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  beginJornadaRemount,
  endJornadaRemount,
  getIsRemountingJornada,
  isJornadaHeavyComputeAllowed,
  isJornadaViewMounting,
  beginJornadaViewMount,
  endJornadaViewMount,
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

  it("suspende sync cruzada durante los primeros 400ms de montaje", () => {
    beginJornadaViewMount();
    assert.equal(isJornadaViewMounting(), true);
    endJornadaViewMount();
    assert.equal(isJornadaViewMounting(), false);
  });
});
