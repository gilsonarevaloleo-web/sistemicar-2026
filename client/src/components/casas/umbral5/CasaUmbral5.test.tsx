import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LienzoLimite } from "./LienzoLimite.tsx";
import { PanelMapa } from "./PanelMapa.tsx";
import { BannerGimnasio } from "./BannerGimnasio.tsx";
import { ModalSaldoInsuficiente } from "./ModalSaldoInsuficiente.tsx";

describe("Casa 5 Umbral — UI", () => {
  it("el lienzo muestra el ritual y el volcado gratis", () => {
    const html = renderToStaticMarkup(
      createElement(LienzoLimite, {
        texto: "",
        onTexto: () => {},
        onSellar: () => {},
        cargando: false,
        deshabilitado: false,
      }),
    );
    assert.match(html, /¿Cuál es tu límite\?/);
    assert.match(html, /El Juez ya lo nombró/);
    assert.match(html, /Sellar volcado \(gratis\)/);
    assert.match(html, /umbral5-volcado/);
  });

  it("el mapa muestra asiento, tipo y no sienta C10", () => {
    const html = renderToStaticMarkup(
      createElement(PanelMapa, {
        lectura: {
          codigoUsuario: 7,
          pisoIntento: 1,
          tipoLimite: "impronta",
          lecturaFria: "El tipo es impronta. Se nombra. El asiento es C7.",
          porQueNoEjecuta: "Está estampada. El origen no se habita.",
        },
      }),
    );
    assert.match(html, /C7/);
    assert.match(html, /Impronta/);
    assert.match(html, /mapa C4/);
    assert.match(html, /No se sienta en C10/);
    assert.doesNotMatch(html, />C10</);
  });

  it("el gimnasio está cerrado", () => {
    const html = renderToStaticMarkup(createElement(BannerGimnasio));
    assert.match(html, /umbral5-gimnasio-cerrado/);
    assert.match(html, /Forja \/ Arena/);
    assert.match(html, /Cerrado/);
    assert.match(html, /disabled/);
  });

  it("el modal 402 ofrece recarga", () => {
    const html = renderToStaticMarkup(
      createElement(ModalSaldoInsuficiente, {
        abierto: true,
        mensaje: "Saldo insuficiente para la lectura del mapa.",
        onCerrar: () => {},
        onRecargar: () => {},
      }),
    );
    assert.match(html, /Saldo insuficiente/);
    assert.match(html, /Recargar/);
  });
});
