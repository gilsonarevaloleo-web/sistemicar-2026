import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { crearCriterio } from "@shared/deposito/criterioMaestro.ts";
import { CardCriterioVivo } from "./CardCriterioVivo.tsx";

describe("CardCriterioVivo", () => {
  it("muestra la ley cuando el acervo está vacío", () => {
    const html = renderToStaticMarkup(
      createElement(CardCriterioVivo, { acervo: [] }),
    );
    assert.match(html, /Ley del Criterio Vivo/);
    assert.match(html, /no nace con criterio/i);
  });

  it("resume el acervo sellado", () => {
    const acervo = [
      crearCriterio({
        codigo: 5,
        origen: "correccion",
        sabiduria: "Cuando nombro el corte, el ojo es Decisión.",
        volcadoCrudo:
          "Hoy la pelea con el cliente empezó por el precio. Yo no respondí. Corté.",
      }),
    ];
    const html = renderToStaticMarkup(
      createElement(CardCriterioVivo, { acervo }),
    );
    assert.match(html, /1 criterio/);
  });
});
