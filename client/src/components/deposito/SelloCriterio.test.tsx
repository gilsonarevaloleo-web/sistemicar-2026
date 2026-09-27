import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SelloCriterio } from "./SelloCriterio.tsx";

const HECHO =
  "Hoy la pelea con el cliente empezó por el precio. Yo no respondí. Corté la llamada.";

describe("SelloCriterio", () => {
  it("el ruido no ofrece sello", () => {
    const html = renderToStaticMarkup(
      createElement(SelloCriterio, {
        volcadoCrudo: "mal día",
        codigoMotor: 1,
        onSellar: () => {},
        onCorregir: () => {},
      }),
    );
    assert.match(html, /ruido no sella/i);
    assert.doesNotMatch(html, /Esto es lo que vi/);
  });

  it("un hecho ofrece sello y corrección", () => {
    const html = renderToStaticMarkup(
      createElement(SelloCriterio, {
        volcadoCrudo: HECHO,
        codigoMotor: 6,
        onSellar: () => {},
        onCorregir: () => {},
      }),
    );
    assert.match(html, /Esto es lo que vi/);
    assert.match(html, /El ojo era otro/);
    assert.match(html, /criterio propio/);
  });
});
