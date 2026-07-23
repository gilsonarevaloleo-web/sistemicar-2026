import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSituacionRingSeed } from "./situacionLaunchSeed.ts";

describe("situacionLaunchSeed", () => {
  it("abre ring con filas, cupos y ancla", () => {
    const now = 1_700_000_000_000;
    const seed = buildSituacionRingSeed({
      filas: ["A", "B", ""],
      minutosBloque: 30,
      now,
    });
    assert.ok(seed);
    assert.equal(seed!.subTareas.length, 2);
    assert.equal(seed!.situacionCronometro.activo, true);
    assert.equal(seed!.situacionCupoAnchor.subTareaId, seed!.subTareas[0].id);
    const cupos = seed!.subTareas.reduce((s, st) => s + (st.minutosCupo ?? 0), 0);
    assert.equal(cupos, 30);
  });

  it("rechaza sin filas", () => {
    assert.equal(buildSituacionRingSeed({ filas: ["  "], minutosBloque: 20 }), null);
  });
});
