import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  feedsEscaleraNido,
  filterNidosPorNaturaleza,
  nidoFeedsEscalera,
  nidoRequiereOleada,
  nidoRiesgoEnsuciar,
  resolveProyectoEtiqueta,
} from "./nidoNaturaleza.ts";

describe("nidoNaturaleza", () => {
  it("ids internos se conservan; el comportamiento ya no parte por familia", () => {
    assert.equal(resolveProyectoEtiqueta("proyecto"), "proyecto");
    assert.equal(resolveProyectoEtiqueta("centro"), "centro");
    assert.equal(resolveProyectoEtiqueta("consciencia"), "consciencia");
    assert.equal(resolveProyectoEtiqueta("otra"), "proyecto");
  });

  it("todo nido exige oleada y alimenta la escalera", () => {
    for (const e of ["proyecto", "centro", "consciencia", "otra"] as const) {
      assert.equal(nidoFeedsEscalera(e), true);
      assert.equal(nidoRequiereOleada(e), true);
    }
  });

  it("la escalera la decide el destino, no la etiqueta", () => {
    assert.equal(feedsEscaleraNido("peldano", "proyecto"), true);
    assert.equal(feedsEscaleraNido("peldano", "consciencia"), true);
    assert.equal(feedsEscaleraNido("presencia", "proyecto"), false);
    assert.equal(feedsEscaleraNido("presencia", "consciencia"), false);
  });

  it("el riesgo de cualquier nido nombra la escalera", () => {
    assert.match(nidoRiesgoEnsuciar("DESCANSO", "consciencia"), /escalera/);
    assert.match(nidoRiesgoEnsuciar("Costura", "proyecto"), /escalera/);
    assert.match(nidoRiesgoEnsuciar("Taller", "centro"), /escalera/);
  });

  it("el agrupado por etiqueta guardada sigue leyendo el dato", () => {
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
