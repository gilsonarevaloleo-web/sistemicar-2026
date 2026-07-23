import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Vehicle } from "@/lib/persistence";
import { computeSituacionTimerUi } from "./situacionRelojIsland";

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "v1",
    titulo: "Enfoque",
    status: "activo",
    tipoFlota: "situacion",
    subTareas: [],
    ...overrides,
  } as Vehicle;
}

describe("computeSituacionTimerUi", () => {
  it("sin anchor ni cupo visible → no display", () => {
    const ui = computeSituacionTimerUi(vehicle(), Date.now());
    assert.equal(ui.visible, false);
    assert.equal(ui.display, "");
  });

  it("fila en foco: cuenta regresiva desde anchor", () => {
    const now = 1_000_000;
    const startedAt = now - 30_000;
    const ui = computeSituacionTimerUi(
      vehicle({
        situacionCronometro: { activo: true, bloqueInicioAt: startedAt },
        situacionCupoAnchor: { subTareaId: "st1", startedAt },
        subTareas: [
          {
            id: "st1",
            texto: "Bolsillo",
            enDesgloseCronometro: true,
            resultadoSituacion: "pendiente",
            minutosCupo: 5,
          },
        ],
      } as Partial<Vehicle>),
      now
    );
    assert.equal(ui.visible, true);
    assert.equal(ui.expired, false);
    assert.equal(ui.display, "00:04:30");
  });

  it("fila vencida: deuda acumulada", () => {
    const now = 1_000_000;
    const startedAt = now - 6 * 60_000;
    const ui = computeSituacionTimerUi(
      vehicle({
        situacionCronometro: { activo: true, bloqueInicioAt: startedAt },
        situacionCupoAnchor: { subTareaId: "st1", startedAt },
        subTareas: [
          {
            id: "st1",
            texto: "Bolsillo",
            enDesgloseCronometro: true,
            resultadoSituacion: "pendiente",
            minutosCupo: 5,
          },
        ],
      } as Partial<Vehicle>),
      now
    );
    assert.equal(ui.expired, true);
    assert.equal(ui.display, "00:00:00");
    assert.equal(ui.debt, "00:01:00");
  });

  it("tras handoff con startedAt=now: sin deuda aunque el bloque lleve minutos", () => {
    const now = 5_000_000;
    const bloqueInicio = now - 8 * 60_000;
    const ui = computeSituacionTimerUi(
      vehicle({
        situacionCronometro: { activo: true, bloqueInicioAt: bloqueInicio },
        situacionCupoAnchor: { subTareaId: "st2", startedAt: now },
        subTareas: [
          {
            id: "st1",
            texto: "Cerrada",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            minutosCupo: 5,
            cerradaAt: now,
          },
          {
            id: "st2",
            texto: "Probar ring",
            enDesgloseCronometro: true,
            resultadoSituacion: "pendiente",
            minutosCupo: 5,
          },
        ],
      } as Partial<Vehicle>),
      now
    );
    assert.equal(ui.expired, false);
    assert.equal(ui.debt, "");
    assert.equal(ui.display, "00:05:00");
  });

  it("tras handoff el reloj baja con el tiempo de pared (no se clava en cupo-1s)", () => {
    const handoffAt = 5_000_000;
    const cupoMin = 10;
    const v = vehicle({
      situacionCronometro: { activo: true, bloqueInicioAt: handoffAt - 60_000 },
      situacionCupoAnchor: { subTareaId: "st2", startedAt: handoffAt },
      subTareas: [
        {
          id: "st1",
          texto: "Cerrada",
          enDesgloseCronometro: true,
          resultadoSituacion: "cumplido",
          minutosCupo: 5,
          cerradaAt: handoffAt,
        },
        {
          id: "st2",
          texto: "Probar cumplido",
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
          minutosCupo: cupoMin,
        },
      ],
    } as Partial<Vehicle>);
    const t0 = computeSituacionTimerUi(v, handoffAt + 1_000);
    const t3 = computeSituacionTimerUi(v, handoffAt + 3_000);
    assert.equal(t0.display, "00:09:59");
    assert.equal(t3.display, "00:09:57");
    assert.notEqual(t0.display, t3.display, "startedAt estable → remaining debe bajar ~1s/s");
  });
});
