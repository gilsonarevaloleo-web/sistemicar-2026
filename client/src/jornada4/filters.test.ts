import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterJornada4Vehicles,
  isJornada4Vehicle,
  isVehiculoRapido,
  isSituacionDesglosador,
} from "./filters.ts";
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
  it("acepta conquista desglosador, situacion ring, y rápidos", () => {
    const list = [
      v({ id: "1", tipoFlota: "tiempo", tipoReloj: "desglosador" }),
      v({
        id: "2",
        tipoFlota: "situacion",
        situacionCronometro: { activo: true, bloqueInicioAt: 1 },
      }),
      v({ id: "3", tipoFlota: "tiempo", tipoReloj: "manual" }),
      v({ id: "4", tipoFlota: "descanso" }),
      v({ id: "5", tipoFlota: "verdad" }),
      v({ id: "6", tipoFlota: "situacion", status: "cumplido" }),
      v({ id: "7", tipoFlota: "tiempo", tipoTerminoRapido: "hora" }),
      v({ id: "8", tipoFlota: "situacion" }),
    ];
    const dual = filterJornada4Vehicles(list);
    assert.deepEqual(
      dual.map(x => x.id),
      ["1", "2", "7", "8"]
    );
    assert.equal(isJornada4Vehicle(list[0]), true);
    assert.equal(isJornada4Vehicle(list[3]), false);
    assert.equal(isVehiculoRapido(list[6]!), true);
    assert.equal(isVehiculoRapido(list[7]!), true);
    assert.equal(isSituacionDesglosador(list[1]!), true);
    assert.equal(isSituacionDesglosador(list[7]!), false);
  });
});
