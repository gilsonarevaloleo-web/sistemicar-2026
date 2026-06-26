import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  beginViewTransition,
  isInterModuleSyncBlocked,
  isViewTransitionBlocked,
  resetViewTransitionShieldForTests,
  VIEW_TRANSITION_SHIELD_MS,
} from "./viewTransitionShield.ts";
import { beginJornadaViewMount, endJornadaViewMount, resetJornadaRemountForTests } from "./jornadaRemount.ts";

describe("viewTransitionShield", () => {
  afterEach(() => {
    resetViewTransitionShieldForTests();
    resetJornadaRemountForTests();
  });

  it("bloquea sync durante 500ms tras beginViewTransition", () => {
    beginViewTransition();
    assert.equal(isViewTransitionBlocked(), true);
    assert.equal(isInterModuleSyncBlocked(), true);
    assert.equal(VIEW_TRANSITION_SHIELD_MS, 500);
  });

  it("isInterModuleSyncBlocked incluye montaje Jornada", () => {
    beginJornadaViewMount();
    assert.equal(isInterModuleSyncBlocked(), true);
    endJornadaViewMount();
    assert.equal(isInterModuleSyncBlocked(), false);
  });
});
