import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CODIGOS_NUMERO, type CodigoNumero } from "@shared/umbral/engineConfig";
import {
  aplicarSelloOferta,
  crearOfertaArena,
} from "@shared/umbral/ofertaArena";
import { CardCartaCruce } from "./CardCartaCruce.tsx";

function ofertaCon(codigos: readonly CodigoNumero[]) {
  let o = crearOfertaArena({
    id: "ofa-ui",
    userId: "u1",
    nombre: "Corte Limpio",
    fraseUtilidad: "Nombra el crack y lo corta hoy.",
  });
  for (const n of codigos) {
    o = aplicarSelloOferta(o, {
      codigo: n,
      respuestaAprobada: `Cuerpo aprobado del código ${n} con densidad suficiente.`,
      feedbackGemini: "Ok.",
      intentos: 1,
      fechaAprobacion: "2026-10-10T00:00:00.000Z",
      sesionId: "s1",
    });
  }
  return o;
}

describe("CardCartaCruce", () => {
  it("borrador marca faltantes y no ofrece copiar carta", () => {
    const html = renderToStaticMarkup(
      createElement(CardCartaCruce, {
        oferta: ofertaCon([1, 2]),
        variante: "completa",
      }),
    );
    assert.match(html, /CARTA DE CRUCE|umbral-v2-carta-cruce/);
    assert.match(html, /borrador/i);
    assert.match(html, /Faltan C/);
    assert.match(html, /disabled/);
    assert.match(html, /FALTA SELLO/);
  });

  it("10/10 muestra sello y piezas de anuncio", () => {
    const html = renderToStaticMarkup(
      createElement(CardCartaCruce, {
        oferta: ofertaCon(CODIGOS_NUMERO),
        variante: "completa",
      }),
    );
    assert.match(html, /10\/10 · La Arena/);
    assert.match(html, /Corte Limpio/);
    assert.match(html, /PIEZAS DE ANUNCIO/);
    assert.match(html, /Apático|APÁTICO/);
    assert.doesNotMatch(html, /Faltan C/);
  });
});
