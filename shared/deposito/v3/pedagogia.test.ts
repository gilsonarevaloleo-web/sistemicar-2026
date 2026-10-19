import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EYE_CODES } from "./types.ts";
import {
  PUENTES_ESCRITURA,
  ajustePedagogico,
  gradoPedagogicoDe,
  nucleoAjuste,
  temperamentoDe,
} from "./pedagogia.ts";

describe("Depósito V3 — pedagogía de escritura", () => {
  it("cubre los 10 puentes percepción → geometría", () => {
    assert.deepEqual(
      EYE_CODES.map((n) => PUENTES_ESCRITURA[n].codigo),
      [...EYE_CODES],
    );
    assert.match(PUENTES_ESCRITURA[1].escritura, /título/i);
    assert.match(PUENTES_ESCRITURA[2].escritura, /C3|puntos/i);
    assert.match(PUENTES_ESCRITURA[4].escritura, /inflexión|paradigma|seriedad/i);
    assert.match(PUENTES_ESCRITURA[10].escritura, /título.*fin|cordón/i);
  });

  it("el núcleo enseña percepción del foco, no un consejo de vida", () => {
    const c2 = nucleoAjuste(2);
    assert.match(c2, /percepción de C2/i);
    assert.match(c2, /C3|puntos/i);
    assert.doesNotMatch(c2, /mañana.*escenario|aplicá este mismo criterio/i);

    const c4 = nucleoAjuste(4);
    assert.match(c4, /percepción de C4/i);
    assert.match(c4, /inflexión|paradigma/i);
    assert.match(c4, /seriedad|profundidad/i);

    const c10 = nucleoAjuste(10);
    assert.match(c10, /percepción de C10/i);
    assert.match(c10, /título/i);
    assert.match(c10, /fin|cordón/i);
  });

  it("el tono sigue al grado: G1 nutritivo, Carrera rigor, Título seco", () => {
    assert.equal(gradoPedagogicoDe("FREE"), 1);
    assert.equal(gradoPedagogicoDe("MATRICULA"), 1);
    assert.equal(gradoPedagogicoDe("CARRERA"), 3);
    assert.equal(gradoPedagogicoDe("TITULO"), 4);
    assert.equal(temperamentoDe("MATRICULA").friccion, "baja");
    assert.equal(temperamentoDe("CARRERA").friccion, "alta");
    assert.equal(temperamentoDe("TITULO").friccion, "pura");

    const g1 = ajustePedagogico(1, "MATRICULA");
    const g4 = ajustePedagogico(1, "TITULO");
    assert.match(g1, /No se tapa la entrada/);
    assert.doesNotMatch(g4, /No se tapa la entrada/);
    assert.match(g4, /percepción de C1/i);
    assert.match(ajustePedagogico(7, "CARRERA"), /Cero autoengaño/);
  });
});
