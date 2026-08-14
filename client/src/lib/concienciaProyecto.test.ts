import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDuracionMinCierre } from "./concienciaProyecto.ts";

describe("concienciaProyecto (compat)", () => {
  it("reexporta resolveDuracionMinCierre", () => {
    assert.equal(
      resolveDuracionMinCierre({
        aperturaAt: 1_000_000,
        cierreAt: 1_000_000 + 25 * 60_000,
      }),
      25
    );
  });
});
