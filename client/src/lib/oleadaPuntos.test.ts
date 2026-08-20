import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createOleadaPunto,
  getFocoOleadaPunto,
  inferOleadaPuntoStatusFromProduccion,
  renumberOleadaPuntos,
  sintonizarOleadaPunto,
  sortOleadaPuntos,
} from "./oleadaPuntos.ts";

describe("oleadaPuntos — ordenamiento mental", () => {
  it("renumber mantiene secuencia 1..n tras borrar", () => {
    const a = createOleadaPunto("A", 1, 1);
    const b = createOleadaPunto("B", 2, 2);
    const c = createOleadaPunto("C", 3, 3);
    const next = renumberOleadaPuntos([a, c]);
    assert.deepEqual(
      next.map(p => ({ n: p.numero, t: p.titulo })),
      [
        { n: 1, t: "A" },
        { n: 2, t: "C" },
      ]
    );
  });

  it("renumber respeta el orden del array al reordenar (no deshace el swap)", () => {
    const a = createOleadaPunto("A", 1, 1);
    const b = createOleadaPunto("B", 2, 2);
    const next = renumberOleadaPuntos([b, a]);
    assert.deepEqual(
      next.map(p => ({ n: p.numero, t: p.titulo })),
      [
        { n: 1, t: "B" },
        { n: 2, t: "A" },
      ]
    );
  });

  it("foco prefiere avance sobre propuesta", () => {
    const a = { ...createOleadaPunto("A", 1, 1), status: "cumplido" as const };
    const b = { ...createOleadaPunto("B", 2, 2), status: "propuesta" as const };
    const c = { ...createOleadaPunto("C", 3, 3), status: "avance" as const };
    const foco = getFocoOleadaPunto([a, b, c]);
    assert.equal(foco?.titulo, "C");
  });

  it("foco cae a primera propuesta si no hay avance", () => {
    const a = { ...createOleadaPunto("A", 1, 1), status: "cumplido" as const };
    const b = createOleadaPunto("B", 2, 2);
    const c = createOleadaPunto("C", 3, 3);
    assert.equal(getFocoOleadaPunto([a, b, c])?.titulo, "B");
  });

  it("inferencia tiempo: todos cumplidos → cumplido", () => {
    assert.equal(
      inferOleadaPuntoStatusFromProduccion({
        tipoOrigen: "tiempo",
        subStatuses: ["cumplido", "cumplido"],
      }),
      "cumplido"
    );
  });

  it("inferencia tiempo: mezcla → avance", () => {
    assert.equal(
      inferOleadaPuntoStatusFromProduccion({
        tipoOrigen: "tiempo",
        subStatuses: ["cumplido", "fallado"],
      }),
      "avance"
    );
  });

  it("sintonía no degrada cumplido manual a avance", () => {
    const p = { ...createOleadaPunto("X", 1, 1), status: "cumplido" as const };
    const next = sintonizarOleadaPunto(p, "avance", "v1", 99);
    assert.equal(next.status, "cumplido");
    assert.equal(next.lastVehicleId, "v1");
  });

  it("sort es estable por numero", () => {
    const b = createOleadaPunto("B", 2, 20);
    const a = createOleadaPunto("A", 1, 10);
    assert.deepEqual(
      sortOleadaPuntos([b, a]).map(p => p.titulo),
      ["A", "B"]
    );
  });
});
