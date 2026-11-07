import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CardLeyCasasUmbral } from "./CardLeyCasasUmbral.tsx";

describe("CardLeyCasasUmbral", () => {
  it("muestra la firma y el sello del planeta activo", () => {
    const html = renderToStaticMarkup(
      createElement(CardLeyCasasUmbral, { planetaActivo: 2 })
    );
    assert.match(html, /Ley de las Casas y el Umbral/);
    assert.match(html, /Casa-Umbral|CASA-UMBRAL/);
    assert.match(html, /círculo cerrado/i);
    assert.match(html, /DEPÓSITO|Deposito|Depósito/);
  });

  it("sella Oficio en 5 y Umbral en 6", () => {
    const oficio = renderToStaticMarkup(
      createElement(CardLeyCasasUmbral, { planetaActivo: 5 }),
    );
    assert.match(oficio, /CASA · OFICIO/);
    const umbral = renderToStaticMarkup(
      createElement(CardLeyCasasUmbral, { planetaActivo: 6 }),
    );
    assert.match(umbral, /CASA · UMBRAL/);
  });
});
