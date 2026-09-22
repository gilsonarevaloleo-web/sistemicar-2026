import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CardLeyFrenoVehiculo } from "./CardLeyFrenoVehiculo.tsx";
import { LeyFrenoHint } from "./LeyFrenoHint.tsx";

describe("CardLeyFrenoVehiculo", () => {
  it("muestra el nombre y la firma de la ley", () => {
    const html = renderToStaticMarkup(createElement(CardLeyFrenoVehiculo));
    assert.match(html, /Ley del Freno/);
    assert.match(html, /Freno-Vehículo|FRENO-VEHÍCULO/);
    assert.match(html, /reactividad/i);
  });
});

describe("LeyFrenoHint", () => {
  it("en el sheet muestra el ritual de nombrar", () => {
    const html = renderToStaticMarkup(createElement(LeyFrenoHint, { variant: "sheet" }));
    assert.match(html, /Antes de moverse/i);
    assert.match(html, /Freno-Vehículo|FRENO-VEHÍCULO/);
  });
});
