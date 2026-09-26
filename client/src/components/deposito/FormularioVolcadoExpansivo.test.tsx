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

function render(grado: GradoMaestria, volcadoCrudo = "") {
  return renderToStaticMarkup(
    createElement(FormularioVolcadoExpansivo, {
      gradoMaestria: grado,
      captura: normalizarCapturaVolcado({
        gradoMaestria: grado,
        volcadoCrudo,
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

  it("Grado 2 no pide flor si el volcado todavía está vacío o limpio", () => {
    const vacio = render(2);
    assert.match(vacio, /Detector de Ruido/);
    assert.doesNotMatch(vacio, /deposito-friccion-input/);
    const limpio = render(2, "Hoy llamé al cliente y anoté el monto pedido.");
    assert.doesNotMatch(limpio, /deposito-friccion-input/);
  });

  it("Grado 2 pide flor solo si el volcado la trae", () => {
    const html = render(2, "Hoy fue increíble. Ya veré cómo sigo con esto.");
    assert.match(html, /deposito-friccion-input/);
    assert.match(html, /flor.*excusa/i);
    assert.doesNotMatch(html, /deposito-sombra-input/);
  });

  it("Grado 3 no pide relleno si el volcado ya nombrá flor y omisión", () => {
    const limpio = render(
      3,
      "Hoy a las 8:10 aprendí que ante la incomodidad la mente opera en 3 capas. Los 10 códigos no son adorno. El código 1 es dopamina. El pastor cría 10 tipos de animales. El sesgo: yo suelo cubrir la fatiga. No dije que evité el descanso. Cerré a las 8:40.",
    );
    assert.match(limpio, /Arquitecto de Punto Ciego/);
    assert.doesNotMatch(limpio, /deposito-friccion-input/);
    assert.doesNotMatch(limpio, /deposito-sombra-input/);
  });

  it("Grado 3 pide lo no dicho si el relato lo dejó suelto", () => {
    const html = render(
      3,
      "Hoy cobré 40 mil al cliente en la oficina y cerré la carpeta.",
    );
    assert.doesNotMatch(html, /deposito-friccion-input/);
    assert.match(html, /deposito-sombra-input/);
    assert.match(html, /NO dijiste/);
  });

  it("Grado 4 agrega hipótesis cuando ya hay volcado", () => {
    const vacio = render(4);
    assert.match(vacio, /Operador de Soberanía/);
    assert.doesNotMatch(vacio, /deposito-hipotesis-select/);
    const html = render(
      4,
      "Hoy cobré 40 mil al cliente en la oficina y cerré la carpeta.",
    );
    assert.match(html, /deposito-sombra-input/);
    assert.match(html, /deposito-hipotesis-select/);
    assert.match(html, /El Ojo de la Claridad/);
  });
});
