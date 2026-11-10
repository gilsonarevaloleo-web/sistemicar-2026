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
import {
  CASA_OFICIO_RITUAL_CORTO,
  MATRIZ_OFICIO,
  OFICIO_PRODUCTO_VENTAS,
} from "../../../shared/umbral/oficioCasa.ts";

const here = dirname(fileURLToPath(import.meta.url));

function withRouter(node: ReturnType<typeof createElement>) {
  return createElement(Router, { ssrPath: "/umbral/entrada" }, node);
}

describe("Casa 5 Oficio — entrada cortante", () => {
  it("reemplaza el quiz por lienzo + matriz + perímetro", () => {
    const src = readFileSync(join(here, "umbral-entrada.tsx"), "utf8");
    const lienzo = readFileSync(
      join(here, "../components/umbral/LienzoOficio.tsx"),
      "utf8",
    );
    assert.match(src, /PLANETA C5/);
    assert.match(lienzo, /umbral-entrada-volcado/);
    assert.match(lienzo, /umbral-entrada-practica-venta/);
    assert.match(src, /umbral-entrada-matriz/);
    assert.match(src, /umbral-entrada-perimetro/);
    assert.match(src, /LienzoOficio/);
    assert.match(src, /PanelLecturaOficio/);
    assert.match(src, /MATRIZ_OFICIO/);
    assert.doesNotMatch(src, /entradaDiagnostico/);
    assert.doesNotMatch(src, /UMBRAL_DIAGNOSTICO_PREGUNTAS/);
    assert.doesNotMatch(src, /href=["']\/limite/);
    assert.doesNotMatch(src, /href=["']\/gimnasio/);
  });

  it("el lienzo corta con el ritual y pone la práctica de venta al costado", () => {
    const html = renderToStaticMarkup(
      withRouter(
        createElement(LienzoOficio, {
          texto: "",
          onTexto: () => {},
          onLeer: () => {},
          cargando: false,
        }),
      ),
    );
    assert.match(html, new RegExp(CASA_OFICIO_RITUAL_CORTO.replace("?", "\\?")));
    assert.match(html, /umbral-entrada-volcado/);
    assert.match(html, /Leer el oficio/);
    assert.match(html, /umbral-entrada-practica-venta/);
    assert.match(html, /Práctica de venta/);
    assert.match(html, /modo=arena/);
    assert.doesNotMatch(html, /objeción|diagnóstico/i);
  });

  it("la lectura ofrece Maestro en ventas con precio, libre para el dueño", () => {
    const lectura = diagnosticarOficioLocal(
      "Entrego el servicio de mi oficio. No tengo cuenta. No sé cuánto vale lo que hago.",
    );
    const cobrado = renderToStaticMarkup(
      withRouter(
        createElement(PanelLecturaOficio, {
          lectura,
          onRehacer: () => {},
        }),
      ),
    );
    assert.match(cobrado, /Hablas C5 Oficio · Cálculo/);
    assert.match(cobrado, new RegExp(OFICIO_PRODUCTO_VENTAS));
    assert.match(cobrado, /umbral-entrada-producto-ventas/);
    assert.match(cobrado, /\$24\.99\/MES/);
    assert.match(cobrado, /umbral-entrada-cta-pago/);
    assert.doesNotMatch(cobrado, /LIBRE · DUEÑO/);
    assert.doesNotMatch(cobrado, /href=["']\/limite/);

    const dueno = renderToStaticMarkup(
      withRouter(
        createElement(PanelLecturaOficio, {
          lectura,
          onRehacer: () => {},
          dueno: true,
          incluido: true,
        }),
      ),
    );
    assert.match(dueno, /LIBRE · DUEÑO/);
    assert.match(dueno, /umbral-entrada-cta-arena/);
    assert.match(dueno, /modo=arena/);
    assert.match(dueno, /codigo=5/);
    assert.doesNotMatch(dueno, /umbral-entrada-cta-pago/);
    assert.equal(MATRIZ_OFICIO[4]?.marca, "Cálculo");
  });
});
