import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LienzoLimite } from "./LienzoLimite.tsx";
import { PanelMapa } from "./PanelMapa.tsx";
import { BannerGimnasio } from "./BannerGimnasio.tsx";
import { BannerMapaOpcional } from "./BannerMapaOpcional.tsx";
import { ModalSaldoInsuficiente } from "./ModalSaldoInsuficiente.tsx";
import { HistorialLimite } from "./HistorialLimite.tsx";

const here = dirname(fileURLToPath(import.meta.url));

describe("Casa 6 Umbral — UI", () => {
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
    assert.match(html, /Escribí el límite que ya sabés/);
    assert.match(html, /Sellar volcado \(gratis\)/);
    assert.match(html, /umbral5-volcado/);
  });

  it("el mapa muestra canal, polo y no sienta C10", () => {
    const html = renderToStaticMarkup(
      createElement(PanelMapa, {
            lectura: {
              codigoLimite: 7,
              polo: "contra",
              codigoUsuario: 7,
              pisoIntento: 1,
              tipoLimite: "impronta",
              lecturaFria: "Canal C7 Justicia. El asiento es C7.",
              porQueNoEjecuta: "No merezco.",
              moduloGimnasio: null,
            },
      }),
    );
    assert.match(html, /C7/);
    assert.match(html, /Justicia/);
    assert.match(html, /Contra/);
    assert.match(html, /El intento no es el canal/);
    assert.doesNotMatch(html, />C10</);
  });

  it("el cobro del mapa es opcional y no tapa el volcado", () => {
    const html = renderToStaticMarkup(
      createElement(BannerMapaOpcional, {
        visible: true,
        onLeer: () => {},
        cargando: false,
      }),
    );
    assert.match(html, /opcional/);
    assert.match(html, /umbral5-leer-mapa/);
    assert.doesNotMatch(html, /background-color:#C4A06A/);
  });

  it("el gimnasio se ofrece cuando el módulo es exposición social", () => {
    const cerrado = renderToStaticMarkup(
      createElement(BannerGimnasio, { modulo: null }),
    );
    assert.match(cerrado, /umbral5-gimnasio-cerrado/);
    assert.match(cerrado, /Cerrado/);
    assert.match(cerrado, /disabled/);
    assert.doesNotMatch(cerrado, /Forja \/ Arena/);

    const oferta = renderToStaticMarkup(
      createElement(BannerGimnasio, {
        modulo: "social_producto",
        onEntrar: () => {},
      }),
    );
    assert.match(oferta, /umbral5-gimnasio-oferta/);
    assert.match(oferta, /Entrar al gimnasio/);
    assert.match(oferta, /capa profunda/);
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
              codigoLimite: 1,
              polo: "contra",
              codigoUsuario: 1,
              pisoIntento: 1,
              tipoLimite: null,
              lecturaFria: "Canal C1 Identidad.",
              porQueNoEjecuta: "No hay cimiento.",
              moduloGimnasio: null,
            },
            source: "local_gratis",
            estado: "VOLCADO_GRATIS",
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
    assert.match(html, />C1</);
    assert.match(html, /aumento está débil/);
  });

  it("el lienzo se limpia al sellar y el cobro no es peaje", () => {
    const page = readFileSync(join(here, "../../../pages/CasaUmbral5.tsx"), "utf8");
    assert.match(page, /limpiarBorradorUmbral5/);
    assert.match(page, /setTexto\(""\)/);
    assert.match(page, /hayPesoParaGimnasio/);
    assert.match(page, /BannerMapaOpcional/);
    assert.doesNotMatch(page, /aplicarSesion\(locales\[0\]\)/);
    assert.doesNotMatch(page, /setTexto\(sesion\.textoVolcado\)/);
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
