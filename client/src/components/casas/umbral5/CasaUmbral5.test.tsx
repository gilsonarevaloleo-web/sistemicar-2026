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
import { BifurcacionPractica } from "./BifurcacionPractica.tsx";
import { HistorialLibros } from "../gimnasio6/HistorialLibros.tsx";
import { recursosVacios } from "../../../../../shared/casas/gimnasio6/motor.ts";

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

  it("el historial lista volcados enumerados, enteros y copiables", () => {
    const largo =
      "El Juez dijo que el aumento está débil. No hice nada. ".repeat(8) +
      "El cuerpo no ejecuta el límite que ya conozco.";
    const html = renderToStaticMarkup(
      createElement(HistorialLimite, {
        sesiones: [
          {
            id: "s1",
            userId: "u1",
            textoVolcado: largo,
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
            updatedAt: "2026-01-02T00:00:00.000Z",
          },
          {
            id: "s2",
            userId: "u1",
            textoVolcado: "Segundo volcado de la puerta.",
            lectura: {
              codigoLimite: 1,
              polo: "contra",
              codigoUsuario: 1,
              pisoIntento: 1,
              tipoLimite: null,
              lecturaFria: "Canal C1 Identidad.",
              porQueNoEjecuta: "No hay cimiento.",
              moduloGimnasio: "social_producto",
            },
            source: "gemini",
            estado: "MAPA_PAGO",
            createdAt: "2026-01-03T00:00:00.000Z",
            updatedAt: "2026-01-03T00:00:00.000Z",
          },
        ],
        sesionActivaId: "s1",
        onSelect: () => {},
      }),
    );
    assert.match(html, /umbral5-historial/);
    assert.match(html, /Volcados guardados/);
    assert.match(html, /Volcado 1/);
    assert.match(html, /Volcado 2/);
    assert.match(html, /Mapa C1/);
    assert.match(html, /ver volcado/);
    assert.match(html, /Copiar volcado/);
    assert.match(html, /El cuerpo no ejecuta el límite que ya conozco/);
    assert.match(html, /umbral5-historial-texto-s1/);
  });

  it("la bifurcación ofrece primera puerta o seguir gimnasia", () => {
    const html = renderToStaticMarkup(
      createElement(BifurcacionPractica, {
        visible: true,
        modo: "puerta",
        onPuerta: () => {},
        onGimnasio: () => {},
      }),
    );
    assert.match(html, /umbral5-bifurcacion/);
    assert.match(html, /primera puerta/);
    assert.match(html, /práctica de gimnasia/);
    assert.match(html, /umbral5-elegir-puerta/);
    assert.match(html, /umbral5-elegir-gimnasio/);
    const oculta = renderToStaticMarkup(
      createElement(BifurcacionPractica, {
        visible: false,
        modo: "puerta",
        onPuerta: () => {},
        onGimnasio: () => {},
      }),
    );
    assert.equal(oculta, "");
  });

  it("el historial del gimnasio muestra número, fecha y el volcado entero", () => {
    const html = renderToStaticMarkup(
      createElement(HistorialLibros, {
        libros: [
          {
            id: "lib-1",
            userId: "u1",
            sesionUmbral5Id: "s1",
            modulo: "social_producto",
            limiteOrigen: "No puedo vender el producto de la jornada a mis conocidos.",
            recursos: recursosVacios(),
            puntero: { capitulo: 1, subcodigo: 1, indice: 1, variante: 0 },
            estado: "ABIERTO",
            capituloSelladoDia: null,
            capitulosSellados: [],
            turnos: [
              {
                id: "t1",
                capitulo: 1,
                subcodigo: 1,
                indice: 1,
                variante: 0,
                escenario: "Ahora tienes tu propósito: vender.",
                pregunta: "¿En qué número te posicionas?",
                respuesta: "Estoy en un 4 y no lo muestro.",
                pasa: true,
                creadoAt: "2026-01-01T12:00:00.000Z",
              },
            ],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T12:00:00.000Z",
          },
        ],
        libroActivoId: "lib-1",
        onSelect: () => {},
      }),
    );
    assert.match(html, /gimnasio6-historial/);
    assert.match(html, /Libro 1/);
    assert.match(html, /ver volcado/);
    assert.match(html, /Copiar libro/);
    assert.match(html, /Estoy en un 4 y no lo muestro/);
    assert.match(html, /gimnasio6-historial-select-lib-1/);
  });

  it("el lienzo se limpia al sellar y el cobro no es peaje", () => {
    const page = readFileSync(join(here, "../../../pages/CasaUmbral5.tsx"), "utf8");
    assert.match(page, /limpiarBorradorUmbral5/);
    assert.match(page, /setTexto\(""\)/);
    assert.match(page, /hayPesoParaGimnasio/);
    assert.match(page, /BannerMapaOpcional/);
    assert.match(page, /BifurcacionPractica/);
    assert.match(page, /setLibroContinuable/);
    assert.match(page, /copiarTexto/);
    assert.doesNotMatch(page, /aplicarSesion\(locales\[0\]\)/);
    assert.doesNotMatch(page, /setTexto\(sesion\.textoVolcado\)/);
    assert.doesNotMatch(page, /setLibro\(abierto\)/);
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
