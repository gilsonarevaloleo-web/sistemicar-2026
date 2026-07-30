import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupPasosDados,
  resumePasosDados,
  type CalendarHorizon,
} from "./pasosDadosCalendar.ts";
import type { ProyectoPasoEjecutado } from "./proyectos.ts";

function paso(
  partial: Partial<ProyectoPasoEjecutado> & { status: "cumplido" | "fallado" | "avance"; ts: number }
): ProyectoPasoEjecutado {
  return {
    n: 1,
    key: `k_${partial.ts}`,
    texto: "Paso test",
    kind: "sub_situacion",
    vehicleId: "v1",
    ...partial,
  };
}

// Timestamps en días concretos (UTC)
const D1 = new Date("2026-07-01T10:00:00Z").getTime(); // miércoles
const D2 = new Date("2026-07-01T15:00:00Z").getTime(); // mismo día
const D3 = new Date("2026-07-08T09:00:00Z").getTime(); // semana siguiente
const D4 = new Date("2026-08-01T09:00:00Z").getTime(); // mes siguiente

describe("pasosDadosCalendar", () => {
  it("agrupa por día correctamente", () => {
    const pasos = [
      paso({ status: "cumplido", ts: D1 }),
      paso({ status: "avance",   ts: D2 }),
      paso({ status: "fallado",  ts: D3 }),
    ];

    const buckets = groupPasosDados(pasos, "dia");
    assert.equal(buckets.length, 2);

    // Más reciente primero
    const primer = buckets[0]!;
    assert.equal(primer.total, 1);
    assert.equal(primer.fallado, 1);

    const segundo = buckets[1]!;
    assert.equal(segundo.total, 2);
    assert.equal(segundo.cumplido, 1);
    assert.equal(segundo.avance, 1);
  });

  it("agrupa por semana: D1 y D2 están en la misma semana, D3 en otra", () => {
    const pasos = [
      paso({ status: "cumplido", ts: D1 }),
      paso({ status: "avance",   ts: D2 }),
      paso({ status: "fallado",  ts: D3 }),
    ];

    const buckets = groupPasosDados(pasos, "semana");
    assert.equal(buckets.length, 2);

    const semana2 = buckets[0]!;
    assert.equal(semana2.total, 1);

    const semana1 = buckets[1]!;
    assert.equal(semana1.total, 2);
    assert.equal(semana1.cumplido, 1);
    assert.equal(semana1.avance, 1);
  });

  it("agrupa por mes", () => {
    const pasos = [
      paso({ status: "cumplido", ts: D1 }),
      paso({ status: "avance",   ts: D3 }),
      paso({ status: "fallado",  ts: D4 }),
    ];

    const buckets = groupPasosDados(pasos, "mes");
    assert.equal(buckets.length, 2);

    const agosto = buckets[0]!;
    assert.ok(agosto.label.toLowerCase().includes("ago"));
    assert.equal(agosto.fallado, 1);

    const julio = buckets[1]!;
    assert.ok(julio.label.toLowerCase().includes("jul"));
    assert.equal(julio.cumplido, 1);
    assert.equal(julio.avance, 1);
  });

  it("agrupa por año", () => {
    const pasos = [
      paso({ status: "cumplido", ts: D1 }),
      paso({ status: "fallado",  ts: new Date("2025-03-01T00:00:00Z").getTime() }),
    ];

    const buckets = groupPasosDados(pasos, "anio");
    assert.equal(buckets.length, 2);
    assert.ok(buckets[0]!.label.includes("2026"));
    assert.ok(buckets[1]!.label.includes("2025"));
  });

  it("devuelve lista vacía si no hay pasos con ts", () => {
    const pasos = [
      { n: 1, key: "k1", texto: "Sin ts", kind: "sub_situacion" as const, status: "cumplido" as const, vehicleId: "v1" } as ProyectoPasoEjecutado,
    ];
    const buckets = groupPasosDados(pasos, "dia");
    assert.equal(buckets.length, 0);
  });

  it("resumePasosDados cuenta correctamente por status", () => {
    const pasos = [
      paso({ status: "cumplido", ts: D1 }),
      paso({ status: "cumplido", ts: D2 }),
      paso({ status: "avance",   ts: D3 }),
      paso({ status: "fallado",  ts: D4 }),
    ];

    const r = resumePasosDados(pasos);
    assert.equal(r.cumplido, 2);
    assert.equal(r.avance, 1);
    assert.equal(r.fallado, 1);
    assert.equal(r.total, 4);
  });

  it("recientes contiene máximo 3 títulos por bucket", () => {
    const muchos = Array.from({ length: 5 }, (_, i) =>
      paso({ status: "cumplido", ts: D1 + i * 1000, texto: `Paso ${i + 1}` })
    );
    const buckets = groupPasosDados(muchos, "dia");
    assert.equal(buckets.length, 1);
    assert.equal(buckets[0]!.recientes.length, 3);
    assert.equal(buckets[0]!.total, 5);
  });
});
