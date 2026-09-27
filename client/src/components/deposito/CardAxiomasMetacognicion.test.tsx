import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CardAxiomasMetacognicion } from "./CardAxiomasMetacognicion.tsx";

describe("CardAxiomasMetacognicion", () => {
  it("el store vacío nombra el umbral 85", () => {
    const html = renderToStaticMarkup(
      createElement(CardAxiomasMetacognicion, { store: { axiomas: [] } }),
    );
    assert.match(html, /Axiomas del operador/);
    assert.match(html, /85/);
  });

  it("resume principios descubiertos", () => {
    const html = renderToStaticMarkup(
      createElement(CardAxiomasMetacognicion, {
        store: {
          axiomas: [
            {
              fecha: 1,
              codigoRelacionado: "C1",
              principioDescubierto:
                "La exigencia moral de productividad agota el C1 biológico y genera doble atadura.",
              metaforaClave: "El pastor de los 10 animales",
              id: "ax_1",
            },
          ],
        },
      }),
    );
    assert.match(html, /1 principio/);
  });
});
