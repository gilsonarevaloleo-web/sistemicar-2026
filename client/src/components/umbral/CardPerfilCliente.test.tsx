import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DICCIONARIO_CODIGOS } from "@shared/umbral/engineConfig";
import { CardPerfilCliente } from "./CardPerfilCliente.tsx";

describe("CardPerfilCliente", () => {
  it("sin oferta muestra la ficha genérica", () => {
    const html = renderToStaticMarkup(
      createElement(CardPerfilCliente, {
        codigoNumero: 1,
        perfil: DICCIONARIO_CODIGOS[1].modoExterno,
      }),
    );
    assert.match(html, /Apático/);
    assert.doesNotMatch(html, /Corte Limpio/);
  });

  it("con oferta ancla la 1ª resistencia al nombre y muestra sellos", () => {
    const html = renderToStaticMarkup(
      createElement(CardPerfilCliente, {
        codigoNumero: 1,
        perfil: DICCIONARIO_CODIGOS[1].modoExterno,
        nombreOferta: "Corte Limpio",
        sellosCount: 4,
      }),
    );
    assert.match(html, /Corte Limpio/);
    assert.match(html, /4\/10/);
    assert.match(html, /no veo para qué me sirve Corte Limpio/i);
  });
});
