import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LienzoLimite } from "./LienzoLimite.tsx";
import { PanelMapa } from "./PanelMapa.tsx";
import { BannerGimnasio } from "./BannerGimnasio.tsx";
import { ModalSaldoInsuficiente } from "./ModalSaldoInsuficiente.tsx";
import { HistorialLimite } from "./HistorialLimite.tsx";

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

  it("el historial lista volcados guardados", () => {
    const html = renderToStaticMarkup(
      createElement(HistorialLimite, {
        sesiones: [
          {
            id: "s1",
            userId: "u1",
            textoVolcado: "El Juez dijo que el aumento está débil. No hice nada.",
            lectura: {
              codigoUsuario: 1,
              pisoIntento: 1,
              tipoLimite: null,
              lecturaFria: "El asiento es C1.",
              porQueNoEjecuta: "Cero acto.",
            },
            source: "local_fallback",
            estado: "MAPA_PAGO",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        sesionActivaId: "s1",
        onSelect: () => {},
      }),
    );
    assert.match(html, /umbral5-historial/);
    assert.match(html, /Volcados guardados/);
    assert.match(html, /Mapa C1/);
    assert.match(html, /aumento está débil/);
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
