import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CardLeyCaracterCodigo } from "./CardLeyCaracterCodigo.tsx";

describe("CardLeyCaracterCodigo", () => {
  it("muestra el nombre y la firma de la ley", () => {
    const html = renderToStaticMarkup(createElement(CardLeyCaracterCodigo));
    assert.match(html, /Ley del Carácter del Código/);
    assert.match(html, /Carácter-Código|CARÁCTER-CÓDIGO/);
    assert.match(html, /voz del obstáculo/i);
  });
});
