import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  projectDesglosadorEndFromSubs,
  projectUnitEndLabel,
} from "./desglosadorProjection";

describe("projectDesglosadorEndFromSubs", () => {
  it("suma cant × MIN/U y proyecta fin en hora real", () => {
    const now = Date.parse("2026-07-24T10:00:00.000Z");
    const proj = projectDesglosadorEndFromSubs(
      [
        { cantidadObjetivo: "10", tiempoRecordMinPerUnit: 1.5 },
        { cantidadObjetivo: "4", tiempoRecordMinPerUnit: 2 },
      ],
      now
    );
    assert.ok(proj);
    assert.equal(proj!.totalMin, 15 + 8);
    assert.equal(proj!.finAtMs, now + 23 * 60_000);
    assert.match(proj!.finLabel, /^\d{2}:\d{2}$/);
  });

  it("ignora filas sin récord o cantidad", () => {
    const proj = projectDesglosadorEndFromSubs([
      { cantidadObjetivo: "", tiempoRecordMinPerUnit: 1.5 },
      { cantidadObjetivo: "5" },
    ]);
    assert.equal(proj, null);
  });
});

describe("projectUnitEndLabel", () => {
  it("devuelve min y etiqueta HH:MM", () => {
    const now = Date.parse("2026-07-24T12:00:00.000Z");
    const u = projectUnitEndLabel("6", 2, now);
    assert.ok(u);
    assert.equal(u!.projMin, 12);
    assert.match(u!.finLabel, /^\d{2}:\d{2}$/);
  });
});
