import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Vehicle } from "./persistence.ts";
import { vehiclesReactiveSignature } from "./vehiclesReactiveSignature.ts";

function veh(partial: Partial<Vehicle> & Pick<Vehicle, "id" | "status">): Vehicle {
  return {
    titulo: "t",
    criterioFin: "tiempo",
    criterioDetalle: "1",
    userId: "u",
    tipoReloj: "cronometro",
    createdAt: new Date(),
    tiempoInicio: new Date(),
    ...partial,
  } as Vehicle;
}

describe("vehiclesReactiveSignature", () => {
  it("es estable ante reorden de lista", () => {
    const a = veh({ id: "a", status: "activo" });
    const b = veh({ id: "b", status: "cumplido" });
    assert.equal(vehiclesReactiveSignature([a, b]), vehiclesReactiveSignature([b, a]));
  });

  it("cambia cuando el ring situacional muta", () => {
    const base = veh({
      id: "s1",
      status: "activo",
      situacionCronometro: { activo: true, bloqueInicioAt: 1, depthBlockPsGranted: 0 } as never,
    });
    const next = {
      ...base,
      situacionCronometro: { activo: false, bloqueInicioAt: 1, depthBlockPsGranted: 3 },
    } as Vehicle;
    assert.notEqual(vehiclesReactiveSignature([base]), vehiclesReactiveSignature([next]));
  });
});
