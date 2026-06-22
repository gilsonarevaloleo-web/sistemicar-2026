import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubVehiculo } from "./persistence.ts";
import { computeSubCloseVerdict, suggestedSec, validateSubCloseCantidad } from "./desglosadorClock.ts";

function sub(partial: Partial<SubVehiculo> & Pick<SubVehiculo, "id">): SubVehiculo {
  return {
    titulo: "Test",
    status: "cumplido",
    ...partial,
  };
}

describe("computeSubCloseVerdict", () => {
  it("gain when faster than suggested", () => {
    const s = sub({
      id: "1",
      tiempoSugeridoSeg: 600,
      duracionFinal: 300,
    });
    const v = computeSubCloseVerdict(s);
    assert.equal(v.verdict, "gain");
    assert.equal(v.deltaSec, -300);
  });

  it("loss when slower than suggested", () => {
    const s = sub({
      id: "1",
      tiempoSugeridoSeg: 600,
      duracionFinal: 900,
    });
    const v = computeSubCloseVerdict(s);
    assert.equal(v.verdict, "loss");
    assert.equal(v.deltaSec, 300);
  });

  it("neutral within 5s threshold", () => {
    const s = sub({
      id: "1",
      tiempoSugeridoSeg: 600,
      duracionFinal: 603,
    });
    assert.equal(computeSubCloseVerdict(s).verdict, "neutral");
  });

  it("noRef without reference", () => {
    const s = sub({ id: "1", duracionFinal: 100 });
    assert.equal(computeSubCloseVerdict(s).verdict, "noRef");
  });

  it("suggestedSec from cantidad and record", () => {
    const s = sub({
      id: "1",
      cantidadObjetivo: 2,
      tiempoRecordMinPerUnit: 5,
    });
    assert.equal(suggestedSec(s), 600);
  });
});

describe("validateSubCloseCantidad", () => {
  const withObj = sub({ id: "o", cantidadObjetivo: 3 });

  it("permite cierre sin cantidad si no hay objetivo", () => {
    const r = validateSubCloseCantidad(sub({ id: "n" }), "", "cumplido");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.cantidad, 0);
  });

  it("bloquea cierre con objetivo y récord si cantidad vacía", () => {
    const conRecord = sub({ id: "o", cantidadObjetivo: 3, tiempoRecordMinPerUnit: 2 });
    const r = validateSubCloseCantidad(conRecord, "", "fallado");
    assert.equal(r.ok, false);
  });

  it("primer ciclo sin récord: cumplido infiere objetivo y fallado infiere 0", () => {
    const sinRecord = sub({ id: "sr", cantidadObjetivo: 4 });
    const cumplido = validateSubCloseCantidad(sinRecord, "", "cumplido");
    assert.equal(cumplido.ok, true);
    if (cumplido.ok) assert.equal(cumplido.cantidad, 4);
    const fallado = validateSubCloseCantidad(sinRecord, "", "fallado");
    assert.equal(fallado.ok, true);
    if (fallado.ok) assert.equal(fallado.cantidad, 0);
  });

  it("con récord sigue exigiendo cantidad explícita", () => {
    const conRecord = sub({ id: "cr", cantidadObjetivo: 4, tiempoRecordMinPerUnit: 2 });
    assert.equal(validateSubCloseCantidad(conRecord, "", "cumplido").ok, false);
    assert.equal(validateSubCloseCantidad(conRecord, "", "fallado").ok, false);
  });

  it("permite fallado con cantidad 0 explícita", () => {
    const r = validateSubCloseCantidad(withObj, "0", "fallado");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.cantidad, 0);
  });

  it("bloquea cumplido con cantidad 0", () => {
    const r = validateSubCloseCantidad(withObj, "0", "cumplido");
    assert.equal(r.ok, false);
  });

  it("acepta cumplido con cantidad positiva", () => {
    const r = validateSubCloseCantidad(withObj, "2", "cumplido");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.cantidad, 2);
  });
});
