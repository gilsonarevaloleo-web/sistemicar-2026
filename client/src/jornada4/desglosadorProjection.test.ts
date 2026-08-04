import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubVehiculo } from "../lib/persistence.ts";
import {
  projectDesglosadorEndFromSubs,
  projectProductsUntilDeadline,
  projectProductsUntilMeta,
  projectUnitEndLabel,
  resolveMetaDeadlineMs,
} from "./desglosadorProjection.ts";

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

describe("projectProductsUntilMeta (1 unidad completa)", () => {
  it("resuelve meta HH:mm al siguiente instante futuro", () => {
    // 10:00 local vía Date local del entorno de test
    const now = new Date(2026, 6, 24, 10, 0, 0).getTime();
    const deadline = resolveMetaDeadlineMs("14:00", now);
    assert.ok(deadline);
    assert.equal(deadline! - now, 4 * 3600 * 1000);
  });

  it("floor(tiempoRestante / takt) = productos alcanzables", () => {
    const now = new Date(2026, 6, 24, 10, 0, 0).getTime();
    // 1 producto = 100s → en 1000s caben 10
    const reach = projectProductsUntilDeadline({
      unitCycleSec: 100,
      deadlineMs: now + 1000_000,
      nowMs: now,
    });
    assert.ok(reach);
    assert.equal(reach!.products, 10);
    assert.equal(reach!.remainSec, 1000);
  });

  it("suma takt de subs (medido sella; ref mientras pendiente) y proyecta hasta meta", () => {
    const now = new Date(2026, 6, 24, 10, 0, 0).getTime();
    const subs: SubVehiculo[] = [
      {
        id: "pegar",
        titulo: "Pegar",
        status: "cumplido",
        duracionFinal: 300,
        cantidadLograda: 10, // 30s/u sellado
      },
      {
        id: "cortar",
        titulo: "Cortar",
        status: "pendiente",
        tiempoRecordMinPerUnit: 0.5, // 30s/u ref
      },
    ];
    // 1 und = 60s → hasta 10:10 = 600s → 10 productos
    const reach = projectProductsUntilMeta(subs, "10:10", now);
    assert.ok(reach);
    assert.equal(reach!.unitCycleSec, 60);
    assert.equal(reach!.products, 10);
    assert.equal(reach!.hasMeasured, true);
    assert.equal(reach!.allRef, false);
  });
});
