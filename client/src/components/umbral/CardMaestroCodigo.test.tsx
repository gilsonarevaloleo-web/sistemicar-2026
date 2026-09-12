import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CardMaestroCodigo } from "./CardMaestroCodigo.tsx";

describe("CardMaestroCodigo", () => {
  it("Forja C1 muestra al Cortador y la 2ª resistencia de listas", () => {
    const html = renderToStaticMarkup(
      createElement(CardMaestroCodigo, { codigo: 1, modo: "INTERNO_HABILIDAD" }),
    );
    assert.match(html, /Cortador de Niebla/);
    assert.match(html, /2ª RESISTENCIA/);
    assert.match(html, /lista|biografía/i);
    assert.doesNotMatch(html, /Apático/);
  });

  it("Arena C4 muestra al Ingeniero y el trauma del cínico", () => {
    const html = renderToStaticMarkup(
      createElement(CardMaestroCodigo, { codigo: 4, modo: "EXTERNO_VENTAS" }),
    );
    assert.match(html, /Ingeniero sin Flor/);
    assert.match(html, /ARENA/);
    assert.match(html, /trauma|flor|defensiva/i);
    assert.doesNotMatch(html, /Cortador de Niebla/);
  });
});
