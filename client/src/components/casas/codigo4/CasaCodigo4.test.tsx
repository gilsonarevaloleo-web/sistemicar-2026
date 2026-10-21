import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LienzoEntrada } from "./LienzoEntrada.tsx";
import { PanelLectura } from "./PanelLectura.tsx";
import { BloqueDirectiva } from "./BloqueDirectiva.tsx";
import { ModalSaldoInsuficiente } from "./ModalSaldoInsuficiente.tsx";
import { HistorialAuditorias } from "./HistorialAuditorias.tsx";

describe("Casa Código 4 — UI", () => {
  it("el lienzo muestra la consigna y el botón de 1 crédito", () => {
    const html = renderToStaticMarkup(
      createElement(LienzoEntrada, {
        texto: "",
        onTexto: () => {},
        onAuditar: () => {},
        cargando: false,
        saldo: 3,
        costo: 1,
        deshabilitado: false,
      }),
    );
    assert.match(html, /¿Cuál es tu problema\?/);
    assert.match(html, /Escribe aquí el hecho o conflicto crudo de tu día a día/);
    assert.match(html, /Auditar con el Juez Serio \(1 Crédito\)/);
    assert.match(html, /juez-volcado/);
  });

  it("el panel de lectura muestra C4 y el banner de desbloqueo", () => {
    const html = renderToStaticMarkup(
      createElement(PanelLectura, {
        fase1: {
          codigoProblemaDetectado: 4,
          codigoConquistadoMax: 3,
          fugaInconsciente: "La vía de agua es la coartada.",
          lecturaPerimetroFria: "El problema habita en C4.",
        },
        onDesbloquear: () => {},
        desbloqueando: false,
        costoFase2: 1,
        yaDesbloqueada: false,
      }),
    );
    assert.match(html, /C4/);
    assert.match(html, /Estructura/);
    assert.match(html, /C1 → C3/);
    assert.match(html, /La vía de agua es la coartada/);
    assert.match(html, /Desbloquear Directiva Operacional \(1 Crédito\)/);
  });

  it("la directiva deja claro el perímetro", () => {
    const html = renderToStaticMarkup(
      createElement(BloqueDirectiva, {
        fase2: {
          requiereInversionCreditos: true,
          directivaOperacional: "Interrumpí el pistón automático.",
        },
      }),
    );
    assert.match(html, /Interrumpí el pistón automático/);
    assert.match(html, /perímetro conquistado/);
  });

  it("el historial muestra fecha, volcado y copy", () => {
    const html = renderToStaticMarkup(
      createElement(HistorialAuditorias, {
        items: [
          {
            id: "s-hist",
            createdAt: "2026-10-21T20:05:00.000Z",
            updatedAt: "2026-10-21T20:05:00.000Z",
            textoVolcado: "Hoy el pistón no paró.",
            fase1: {
              codigoProblemaDetectado: 4,
              codigoConquistadoMax: 3,
              fugaInconsciente: "La vía de agua es la coartada.",
              lecturaPerimetroFria: "El problema habita en C4.",
            },
            fase2Desbloqueada: true,
            directivaOperacional: "Interrumpí el pistón automático.",
          },
        ],
      }),
    );
    assert.match(html, /Historial de Auditorías/);
    assert.match(html, /Hoy el pistón no paró/);
    assert.match(html, /C4 Estructura/);
    assert.match(html, /C1 → C3/);
    assert.match(html, /Interrumpí el pistón automático/);
    assert.match(html, /Copiar Auditoría/);
  });

  it("el modal 402 ofrece recarga", () => {
    const html = renderToStaticMarkup(
      createElement(ModalSaldoInsuficiente, {
        abierto: true,
        mensaje: "Saldo insuficiente para la Fase 2.",
        onCerrar: () => {},
        onRecargar: () => {},
      }),
    );
    assert.match(html, /Saldo insuficiente/);
    assert.match(html, /Recargar/);
  });
});
