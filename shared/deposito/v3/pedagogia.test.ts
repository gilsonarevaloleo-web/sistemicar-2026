import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EYE_CODES } from "./types.ts";
import { TONOS_MAESTRO, pedagogicalFeedbackDe } from "./cascada.ts";
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
    assert.match(PUENTES_ESCRITURA[2].escritura, /hechos|puntos/i);
    assert.match(PUENTES_ESCRITURA[4].escritura, /inflexión|detrás/i);
    assert.match(PUENTES_ESCRITURA[10].escritura, /título|última oración/i);
  });

  it("el núcleo usa el Tono del Maestro, no un consejo de vida", () => {
    assert.equal(nucleoAjuste(1), TONOS_MAESTRO[1]);
    assert.equal(nucleoAjuste(2), TONOS_MAESTRO[2]);
    assert.equal(nucleoAjuste(4), TONOS_MAESTRO[4]);
    assert.equal(nucleoAjuste(10), TONOS_MAESTRO[10]);
    assert.doesNotMatch(nucleoAjuste(2), /mañana.*escenario|aplicá este mismo criterio/i);
    assert.doesNotMatch(nucleoAjuste(4), /calidad de vida|debes ser/i);
  });

  it("el dictamen ignora el grado: G1 y Título reciben el mismo tono de cascada", () => {
    assert.equal(gradoPedagogicoDe("FREE"), 1);
    assert.equal(gradoPedagogicoDe("MATRICULA"), 1);
    assert.equal(gradoPedagogicoDe("CARRERA"), 3);
    assert.equal(gradoPedagogicoDe("TITULO"), 4);
    assert.equal(temperamentoDe("MATRICULA").friccion, "baja");
    assert.equal(temperamentoDe("CARRERA").friccion, "alta");
    assert.equal(temperamentoDe("TITULO").friccion, "pura");

    const g1 = ajustePedagogico(1, "MATRICULA");
    const g4 = ajustePedagogico(1, "TITULO");
    assert.equal(g1, TONOS_MAESTRO[1]);
    assert.equal(g4, TONOS_MAESTRO[1]);
    assert.equal(ajustePedagogico(7, "CARRERA"), TONOS_MAESTRO[7]);
  });

  it("circuito cerrado no usa el tono de abroche pendiente", () => {
    assert.match(pedagogicalFeedbackDe(null), /abrochado|C1→C10/i);
    assert.equal(pedagogicalFeedbackDe(10), TONOS_MAESTRO[10]);
  });
});
