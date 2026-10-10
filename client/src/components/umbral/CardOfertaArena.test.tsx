import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { crearOfertaArena, aplicarSelloOferta } from "@shared/umbral/ofertaArena";
import { CardOfertaArena } from "./CardOfertaArena.tsx";

describe("CardOfertaArena", () => {
  it("sin oferta muestra el candado de nombre", () => {
    const html = renderToStaticMarkup(
      createElement(CardOfertaArena, {
        oferta: null,
        ofertas: [],
        onNombrar: () => undefined,
        onNueva: () => undefined,
        onActivar: () => undefined,
      }),
    );
    assert.match(html, /Sin nombre no hay Arena/);
    assert.match(html, /umbral-v2-oferta-gate/);
    assert.match(html, /NOMBRAR Y ENTRAR A LA ARENA/);
  });

  it("con oferta muestra nombre y sellos X/10", () => {
    let o = crearOfertaArena({
      id: "ofa-1",
      userId: "u1",
      nombre: "Corte Limpio",
      fraseUtilidad: "Nombra el crack y lo corta hoy.",
    });
    o = aplicarSelloOferta(o, {
      codigo: 1,
      respuestaAprobada: "Utilidad anclada.",
      feedbackGemini: "Ok.",
      intentos: 1,
      fechaAprobacion: "2026-10-10T00:00:00.000Z",
      sesionId: "s1",
    });
    const html = renderToStaticMarkup(
      createElement(CardOfertaArena, {
        oferta: o,
        ofertas: [o],
        onNombrar: () => undefined,
        onNueva: () => undefined,
        onActivar: () => undefined,
      }),
    );
    assert.match(html, /Corte Limpio/);
    assert.match(html, /1\/10/);
    assert.match(html, /umbral-v2-oferta-activa/);
    assert.match(html, /OTRA OFERTA/);
  });
});
