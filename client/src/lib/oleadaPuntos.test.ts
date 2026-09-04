import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  capSintoniaDesdeProduccion,
  createOleadaPunto,
  getFocoOleadaPunto,
  inferOleadaPuntoStatusFromProduccion,
  nextPuntoProduccionIdAfterDelete,
  renumberOleadaPuntos,
  resolvePuntoProduccion,
  sintonizarOleadaPunto,
  sortOleadaPuntos,
  oleadaMereceCapitulo,
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

  it("punto de producción respeta el pin y no caduca al cumplir", () => {
    const a = { ...createOleadaPunto("negro small", 1, 1), status: "cumplido" as const };
    const b = { ...createOleadaPunto("rojo small", 2, 2), status: "propuesta" as const };
    const pin = resolvePuntoProduccion({ puntoProduccionId: a.id, oleadaPuntos: [a, b] });
    assert.equal(pin?.titulo, "negro small");
    const fallback = resolvePuntoProduccion({ oleadaPuntos: [a, b] });
    assert.equal(fallback?.titulo, "negro small");
  });

  it("borrar el pin mueve el timón al siguiente; borrar otro no lo mueve", () => {
    const a = createOleadaPunto("A", 1, 1);
    const b = createOleadaPunto("B", 2, 2);
    const oleada = { puntoProduccionId: a.id, oleadaPuntos: [a, b] };
    assert.equal(nextPuntoProduccionIdAfterDelete(oleada, a.id), b.id);
    assert.equal(nextPuntoProduccionIdAfterDelete(oleada, b.id), a.id);
    assert.equal(
      nextPuntoProduccionIdAfterDelete({ puntoProduccionId: a.id, oleadaPuntos: [a] }, a.id),
      undefined
    );
  });

  it("un cierre no conquista el punto: cumplido/fallado se capan a avance", () => {
    assert.equal(capSintoniaDesdeProduccion("cumplido"), "avance");
    assert.equal(capSintoniaDesdeProduccion("fallado"), "avance");
    assert.equal(capSintoniaDesdeProduccion("propuesta"), "propuesta");
    assert.equal(capSintoniaDesdeProduccion("avance"), "avance");
  });

  it("sort es estable por numero", () => {
    const b = createOleadaPunto("B", 2, 20);
    const a = createOleadaPunto("A", 1, 10);
    assert.deepEqual(
      sortOleadaPuntos([b, a]).map(p => p.titulo),
      ["A", "B"]
    );
  });

  it("oleadaMereceCapitulo solo si ya hay camino caminado", () => {
    const a = createOleadaPunto("A", 1, 1);
    assert.equal(oleadaMereceCapitulo({ oleadaPuntos: [a] }), false);
    assert.equal(
      oleadaMereceCapitulo({ oleadaPuntos: [{ ...a, status: "avance" }] }),
      true
    );
    assert.equal(
      oleadaMereceCapitulo({
        oleadaPuntos: [a],
        timonEpisodio: { minutosAcumulados: 12, vehiculos: [{}] },
      }),
      true
    );
    assert.equal(
      oleadaMereceCapitulo({ origenSegmento: true, oleadaPuntos: [{ ...a, status: "cumplido" }] }),
      false
    );
  });
});
