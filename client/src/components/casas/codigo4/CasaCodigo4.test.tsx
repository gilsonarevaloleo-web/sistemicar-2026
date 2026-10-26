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

  it("el lienzo muestra el volcado restaurado", () => {
    const html = renderToStaticMarkup(
      createElement(LienzoEntrada, {
        texto: "el volcado de ayer",
        onTexto: () => {},
        onAuditar: () => {},
        cargando: false,
        saldo: 3,
        costo: 1,
        deshabilitado: false,
      }),
    );
    assert.match(html, /el volcado de ayer/);
  });

  it("el panel de lectura muestra C4 y el banner de desbloqueo", () => {
    const html = renderToStaticMarkup(
      createElement(PanelLectura, {
        fase1: {
          codigoProblemaDetectado: 4,
          codigoQueHabla: 4,
          codigoConquistadoMax: 3,
          participaciones: [{ codigo: 3, fuerza: "Cerrar el paso" }, { codigo: 4, fuerza: "Desnudar" }],
          codigoQueCerroTeorico: null,
          fuerzaUsada: null,
          fuerzaDebida: 3,
          cascadaCumple: false,
          desajusteFuerza: "Habla C4. Se aplica Cerrar el paso.",
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
    assert.match(html, /Desbloquear Confrontación de Fuerza \(1 Crédito\)/);
  });

  it("la confrontación deja claro el perímetro", () => {
    const html = renderToStaticMarkup(
      createElement(BloqueDirectiva, {
        fase2: {
          requiereInversionCreditos: true,
          confrontacionDeFuerza: "Interrumpí el pistón automático.",
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
              codigoQueHabla: 4,
              codigoConquistadoMax: 3,
              participaciones: [{ codigo: 4, fuerza: "Desnudar" }],
              codigoQueCerroTeorico: null,
              fuerzaUsada: null,
              fuerzaDebida: 3,
              cascadaCumple: false,
              desajusteFuerza: "Habla C4.",
              fugaInconsciente: "La vía de agua es la coartada.",
              lecturaPerimetroFria: "El problema habita en C4.",
            },
            fase2Desbloqueada: true,
            directivaOperacional: "Interrumpí el pistón automático.",
            confrontacionDeFuerza: "Interrumpí el pistón automático.",
          },
        ],
      }),
    );
    assert.match(html, /Historial de Auditorías/);
    assert.match(html, /juez-historial-reductor/);
    assert.match(html, /<select/);
    assert.match(html, /Hoy el pistón no paró/);
    assert.match(html, /C4 Estructura/);
    assert.match(html, /C1 → C3/);
    assert.match(html, /Interrumpí el pistón automático/);
    assert.match(html, /Copiar Auditoría/);
    assert.match(html, /ver volcado/);
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
