import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { LienzoOficio } from "../components/umbral/LienzoOficio.tsx";
import { PanelLecturaOficio } from "../components/umbral/PanelLecturaOficio.tsx";
import { diagnosticarOficioLocal } from "../../../shared/umbral/oficioMotor.ts";
import { CASA_OFICIO_RITUAL_CORTO, MATRIZ_OFICIO } from "../../../shared/umbral/oficioCasa.ts";

const here = dirname(fileURLToPath(import.meta.url));

describe("Casa 5 Oficio — entrada cortante", () => {
  it("reemplaza el quiz por lienzo + matriz + perímetro", () => {
    const src = readFileSync(join(here, "umbral-entrada.tsx"), "utf8");
    const lienzo = readFileSync(
      join(here, "../components/umbral/LienzoOficio.tsx"),
      "utf8",
    );
    assert.match(src, /PLANETA C5/);
    assert.match(lienzo, /umbral-entrada-volcado/);
    assert.match(src, /umbral-entrada-matriz/);
    assert.match(src, /umbral-entrada-perimetro/);
    assert.match(src, /LienzoOficio/);
    assert.match(src, /PanelLecturaOficio/);
    assert.match(src, /MATRIZ_OFICIO/);
    assert.doesNotMatch(src, /entradaDiagnostico/);
    assert.doesNotMatch(src, /UMBRAL_DIAGNOSTICO_PREGUNTAS/);
    assert.doesNotMatch(src, /PROBAR CÓDIGO 1 GRATIS/);
    assert.doesNotMatch(src, /href=["']\/limite/);
    assert.doesNotMatch(src, /href=["']\/gimnasio/);
  });

  it("el lienzo corta con el ritual del oficio, no con objeción", () => {
    const html = renderToStaticMarkup(
      createElement(LienzoOficio, {
        texto: "",
        onTexto: () => {},
        onLeer: () => {},
        cargando: false,
      }),
    );
    assert.match(html, new RegExp(CASA_OFICIO_RITUAL_CORTO.replace("?", "\\?")));
    assert.match(html, /umbral-entrada-volcado/);
    assert.match(html, /Leer el oficio/);
    assert.doesNotMatch(html, /objeción|diagnóstico|Arena/i);
  });

  it("la lectura nombra el código del 5 y deja Forja/Arena como CTA interior", () => {
    const lectura = diagnosticarOficioLocal(
      "Entrego el servicio de mi oficio. No tengo cuenta. No sé cuánto vale lo que hago.",
    );
    const html = renderToStaticMarkup(
      createElement(
        Router,
        { ssrPath: "/umbral/entrada" },
        createElement(PanelLecturaOficio, {
          lectura,
          onRehacer: () => {},
        }),
      ),
    );
    assert.match(html, /Hablas C5 Oficio · Cálculo/);
    assert.match(html, /umbral-entrada-cta-forja/);
    assert.match(html, /umbral-entrada-cta-arena/);
    assert.match(html, /modo=forja/);
    assert.match(html, /codigo=5/);
    assert.match(html, /no en el 6/);
    assert.doesNotMatch(html, /href=["']\/limite/);
    assert.equal(MATRIZ_OFICIO[4]?.marca, "Cálculo");
  });
});
