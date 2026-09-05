import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldMountAutoCierreJornada } from "./jornadaConsciousGuard.ts";

describe("shouldMountAutoCierreJornada", () => {
  it("recuerda en Home y en /menu, no en Jornada", () => {
    assert.equal(shouldMountAutoCierreJornada([], "/"), true);
    assert.equal(shouldMountAutoCierreJornada([], "/menu"), true);
    assert.equal(shouldMountAutoCierreJornada([], "/jornada-v4"), false);
    assert.equal(shouldMountAutoCierreJornada([], "/ventas-jornada"), false);
  });
});
