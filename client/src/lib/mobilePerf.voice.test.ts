import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldAllowJornadaVoice } from "./mobilePerf.ts";

describe("mobilePerf voice", () => {
  it("permite voz aunque el dispositivo sea coarse (no silenciar pilares)", () => {
    assert.equal(shouldAllowJornadaVoice(), true);
  });
});
