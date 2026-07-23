import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterJornada4Vehicles, isJornada4Vehicle } from "./filters.ts";
import type { Vehicle } from "../lib/persistence.ts";

function v(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return {
    titulo: "x",
    status: "activo",
    userId: "u",
    ...partial,
  } as Vehicle;
}

describe("jornada4 filters", () => {
  it("acepta conquista desglosador y situacion activos", () => {
    const list = [
      v({ id: "1", tipoFlota: "tiempo", tipoReloj: "desglosador" }),
      v({ id: "2", tipoFlota: "situacion" }),
      v({ id: "3", tipoFlota: "tiempo", tipoReloj: "manual" }),
      v({ id: "4", tipoFlota: "descanso" }),
      v({ id: "5", tipoFlota: "verdad" }),
      v({ id: "6", tipoFlota: "situacion", status: "cumplido" }),
    ];
    const dual = filterJornada4Vehicles(list);
    assert.deepEqual(
      dual.map(x => x.id),
      ["1", "2"]
    );
    assert.equal(isJornada4Vehicle(list[0]), true);
    assert.equal(isJornada4Vehicle(list[3]), false);
  });
});
