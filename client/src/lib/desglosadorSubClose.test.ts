import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubVehiculo } from "@/lib/persistence";
import { buildDesglosadorSubClose } from "./desglosadorSubClose.ts";

function sub(partial: Partial<SubVehiculo> & Pick<SubVehiculo, "id">): SubVehiculo {
  return {
    titulo: "Tarea",
    status: "activo",
    ...partial,
  };
}

describe("buildDesglosadorSubClose", () => {
  it("cierra sub activo por id y activa el siguiente pendiente", () => {
    const subs = [
      sub({ id: "s1", status: "cumplido" }),
      sub({ id: "s2", status: "activo", aperturaAt: 1000, cantidadObjetivo: 3 }),
      sub({ id: "s3", status: "pendiente", cantidadObjetivo: 5, tiempoRecordMinPerUnit: 2 }),
    ];
    const result = buildDesglosadorSubClose(subs, "s2", "cumplido", 3, 120, undefined, 2000);
    assert.ok(result);
    assert.equal(result!.closedSub.status, "cumplido");
    assert.equal(result!.closedSub.cantidadLograda, 3);
    assert.equal(result!.nextActiveSubId, "s3");
    const next = result!.subs.find(s => s.id === "s3");
    assert.equal(next?.status, "activo");
    assert.equal(next?.aperturaAt, 2000);
  });

  it("no usa índices: subId inexistente devuelve null", () => {
    const subs = [sub({ id: "s1", status: "activo" })];
    assert.equal(buildDesglosadorSubClose(subs, "missing", "fallado", 0, 0, undefined), null);
  });
});
