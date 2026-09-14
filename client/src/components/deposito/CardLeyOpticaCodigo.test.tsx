import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CardLeyOpticaCodigo } from "./CardLeyOpticaCodigo.tsx";

describe("CardLeyOpticaCodigo", () => {
  it("muestra el nombre y la firma de la ley", () => {
    const html = renderToStaticMarkup(createElement(CardLeyOpticaCodigo));
    assert.match(html, /Ley de los Diez Ojos/);
    assert.match(html, /Óptica-Código|ÓPTICA-CÓDIGO/);
    assert.match(html, /diez lecturas/i);
  });
});
