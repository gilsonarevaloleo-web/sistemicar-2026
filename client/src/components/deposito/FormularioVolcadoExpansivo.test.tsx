import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FormularioVolcadoExpansivo } from "./FormularioVolcadoExpansivo.tsx";
import {
  GRADO_MAESTRIA_INICIAL,
  normalizarCapturaVolcado,
  type GradoMaestria,
} from "@shared/deposito/engineConfig.ts";

function render(grado: GradoMaestria) {
  return renderToStaticMarkup(
    createElement(FormularioVolcadoExpansivo, {
      gradoMaestria: grado,
      captura: normalizarCapturaVolcado({
        gradoMaestria: grado,
        volcadoCrudo: "",
      }),
      onChange: () => {},
    }),
  );
}

describe("FormularioVolcadoExpansivo — interfaz de entrada única", () => {
  it("Grado 1 muestra solo el volcado crudo", () => {
    const html = render(GRADO_MAESTRIA_INICIAL);
    assert.match(html, /Aprendiz de Ojo/);
    assert.match(html, /deposito-volcado-input/);
    assert.match(html, /¿Qué aprendí hoy\?/);
    assert.doesNotMatch(html, /deposito-friccion-input/);
    assert.doesNotMatch(html, /deposito-sombra-input/);
    assert.doesNotMatch(html, /deposito-hipotesis-select/);
  });

  it("Grado 2 agrega fricción obligatoria", () => {
    const html = render(2);
    assert.match(html, /Detector de Ruido/);
    assert.match(html, /deposito-friccion-input/);
    assert.match(html, /flor.*excusa/i);
    assert.doesNotMatch(html, /deposito-sombra-input/);
    assert.doesNotMatch(html, /deposito-hipotesis-select/);
  });

  it("Grado 3 agrega sombra/omisión", () => {
    const html = render(3);
    assert.match(html, /Arquitecto de Punto Ciego/);
    assert.match(html, /deposito-friccion-input/);
    assert.match(html, /deposito-sombra-input/);
    assert.match(html, /NO dijiste/);
    assert.doesNotMatch(html, /deposito-hipotesis-select/);
  });

  it("Grado 4 agrega hipótesis de ojo", () => {
    const html = render(4);
    assert.match(html, /Operador de Soberanía/);
    assert.match(html, /deposito-friccion-input/);
    assert.match(html, /deposito-sombra-input/);
    assert.match(html, /deposito-hipotesis-select/);
    assert.match(html, /El Ojo de la Claridad/);
  });
});
