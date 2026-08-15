import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubVehiculo, Vehicle } from "./persistence.ts";
import {
  compareConquistaSession,
  pickRicherConquistaSession,
  pruneStaleDesglosadorPause,
  subVehiculoProgressScore,
} from "./conquistaSessionCompare.ts";

function sub(partial: Partial<SubVehiculo> & Pick<SubVehiculo, "id">): SubVehiculo {
  return { titulo: partial.id, status: "pendiente", ...partial };
}

function conquista(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return {
    titulo: "Conquista",
    status: "activo",
    tipoFlota: "tiempo",
    tipoReloj: "desglosador",
    criterioFin: "tiempo",
    criterioDetalle: "",
    ejes: {},
    tiempoInicio: new Date(1),
    createdAt: new Date(1),
    ...partial,
  } as Vehicle;
}

describe("subVehiculoProgressScore", () => {
  it("nested_paused no puntúa como cerrado", () => {
    assert.equal(subVehiculoProgressScore(sub({ id: "a", status: "pendiente" })), 0);
    assert.equal(subVehiculoProgressScore(sub({ id: "a", status: "nested_paused" })), 5);
    assert.ok(subVehiculoProgressScore(sub({ id: "a", status: "activo", aperturaAt: 10 })) > 5);
    assert.ok(
      subVehiculoProgressScore(sub({ id: "a", status: "cumplido", cierreAt: 20 })) >
        subVehiculoProgressScore(sub({ id: "a", status: "nested_paused" }))
    );
  });
});

describe("compareConquistaSession", () => {
  it("el sub siguiente activo gana a una pausa stale del anterior", () => {
    const paused = conquista({
      id: "c1",
      interrupcionActiva: true,
      desglosadorPausa: {
        pausadoAt: 1_000,
        subActivoId: "a",
        elapsedSecSnapshot: 40,
        nestedKind: "interrupcion_situacion",
      },
      subVehiculos: [
        sub({ id: "a", status: "nested_paused", aperturaAt: 500 }),
        sub({ id: "b", status: "pendiente" }),
      ],
    });
    const progressed = conquista({
      id: "c1",
      interrupcionActiva: false,
      subVehiculos: [
        sub({ id: "a", status: "cumplido", cierreAt: 2_000 }),
        sub({ id: "b", status: "activo", aperturaAt: 2_050 }),
      ],
    });
    assert.ok(compareConquistaSession(progressed, paused) > 0);
    assert.equal(pickRicherConquistaSession(paused, progressed).subVehiculos?.[1]?.status, "activo");
  });

  it("una interrupción nueva en el mismo sub gana al activo anterior", () => {
    const running = conquista({
      id: "c1",
      subVehiculos: [sub({ id: "a", status: "activo", aperturaAt: 1_000 })],
    });
    const paused = conquista({
      id: "c1",
      interrupcionActiva: true,
      desglosadorPausa: {
        pausadoAt: 5_000,
        subActivoId: "a",
        elapsedSecSnapshot: 4,
        nestedKind: "interrupcion_situacion",
      },
      subVehiculos: [sub({ id: "a", status: "nested_paused", aperturaAt: 1_000 })],
    });
    assert.ok(compareConquistaSession(paused, running) > 0);
  });
});

describe("pruneStaleDesglosadorPause", () => {
  it("limpia pausa si el sub pausado ya está cumplido", () => {
    const v = pruneStaleDesglosadorPause(
      conquista({
        id: "c1",
        interrupcionActiva: true,
        desglosadorPausa: { pausadoAt: 1, subActivoId: "a", elapsedSecSnapshot: 10 },
        subVehiculos: [
          sub({ id: "a", status: "cumplido", cierreAt: 2 }),
          sub({ id: "b", status: "activo", aperturaAt: 3 }),
        ],
      })
    );
    assert.equal(v.interrupcionActiva, false);
    assert.equal(v.desglosadorPausa, undefined);
  });

  it("conserva pausa válida sobre el sub nested_paused", () => {
    const src = conquista({
      id: "c1",
      interrupcionActiva: true,
      desglosadorPausa: { pausadoAt: 1, subActivoId: "a", elapsedSecSnapshot: 10 },
      subVehiculos: [sub({ id: "a", status: "nested_paused", aperturaAt: 1 })],
    });
    const v = pruneStaleDesglosadorPause(src);
    assert.equal(v.interrupcionActiva, true);
    assert.equal(v.desglosadorPausa?.subActivoId, "a");
  });
});
