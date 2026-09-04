import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  feedsEscaleraNido,
  filterNidosPorNaturaleza,
  nidoFeedsEscalera,
  nidoLabel,
  nidoRequiereOleada,
  nidoRiesgoEnsuciar,
  resolveProyectoEtiqueta,
} from "./nidoNaturaleza.ts";

describe("nidoNaturaleza", () => {
  it("ids internos se leen como crecimiento / control / darse cuenta", () => {
    assert.equal(nidoLabel("proyecto"), "Crecimiento");
    assert.equal(nidoLabel("centro"), "Control");
    assert.equal(nidoLabel("consciencia"), "Darse cuenta");
    assert.equal(resolveProyectoEtiqueta("otra"), "proyecto");
  });

  it("solo crecimiento y control trepan la escalera; darse cuenta no", () => {
    assert.equal(nidoFeedsEscalera("proyecto"), true);
    assert.equal(nidoFeedsEscalera("centro"), true);
    assert.equal(nidoFeedsEscalera("consciencia"), false);
    assert.equal(nidoRequiereOleada("consciencia"), false);
    assert.equal(nidoRequiereOleada("proyecto"), true);
  });

  it("rumbo a DESCANSO cuenta Dirección del día pero no escribe peldaños", () => {
    assert.equal(feedsEscaleraNido("peldano", "proyecto"), true);
    assert.equal(feedsEscaleraNido("peldano", "consciencia"), false);
    assert.equal(feedsEscaleraNido("presencia", "proyecto"), false);
    assert.equal(feedsEscaleraNido("presencia", "consciencia"), false);
  });

  it("el riesgo de consciencia niega peldaños", () => {
    assert.match(nidoRiesgoEnsuciar("DESCANSO", "consciencia"), /no sube peldaños/i);
    assert.match(nidoRiesgoEnsuciar("Costura", "proyecto"), /escalera/);
    assert.match(nidoRiesgoEnsuciar("Taller", "centro"), /deber/);
  });

  it("el filtro del Hub parte por naturaleza", () => {
    const list = [
      { id: "1", etiqueta: "proyecto" as const },
      { id: "2", etiqueta: "centro" as const },
      { id: "3", etiqueta: "consciencia" as const },
    ];
    assert.equal(filterNidosPorNaturaleza(list, "todos").length, 3);
    assert.deepEqual(
      filterNidosPorNaturaleza(list, "consciencia").map(n => n.id),
      ["3"]
    );
  });
});
