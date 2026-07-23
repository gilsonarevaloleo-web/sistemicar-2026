import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubVehiculo } from "@/lib/persistence";
import {
  buildDesglosadorSubClose,
  shouldAcceptDesglosadorSubsIncoming,
} from "./desglosadorSubClose.ts";
import { SUB_APERTURA_ACTIVATION_SKEW_MS } from "./desglosadorClock.ts";

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
    assert.equal(next?.aperturaAt, 2000 + SUB_APERTURA_ACTIVATION_SKEW_MS);
  });

  it("no usa índices: subId inexistente devuelve null", () => {
    const subs = [sub({ id: "s1", status: "activo" })];
    assert.equal(buildDesglosadorSubClose(subs, "missing", "fallado", 0, 0, undefined), null);
  });
});

describe("shouldAcceptDesglosadorSubsIncoming", () => {
  it("rechaza launchPaint que borra un Cumplido ya aplicado", () => {
    const current = [
      sub({ id: "s1", status: "cumplido" }),
      sub({ id: "s2", status: "activo", aperturaAt: 5000 }),
      sub({ id: "s3", status: "pendiente" }),
    ];
    const staleLaunch = [
      sub({ id: "s1", status: "activo", aperturaAt: 1000 }),
      sub({ id: "s2", status: "pendiente" }),
      sub({ id: "s3", status: "pendiente" }),
    ];
    assert.equal(
      shouldAcceptDesglosadorSubsIncoming(current, staleLaunch, { launchPaint: true }),
      false
    );
  });

  it("acepta Cumplido force que avanza al siguiente sub", () => {
    const current = [
      sub({ id: "s1", status: "activo", aperturaAt: 1000 }),
      sub({ id: "s2", status: "pendiente" }),
    ];
    const afterClose = buildDesglosadorSubClose(current, "s1", "cumplido", 0, 60, undefined, 2000)!;
    assert.equal(
      shouldAcceptDesglosadorSubsIncoming(current, afterClose.subs, { force: true }),
      true
    );
  });
});
