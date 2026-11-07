import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConsolaGimnasio } from "./ConsolaGimnasio.tsx";
import { recursosVacios } from "../../../../../shared/casas/gimnasio6/motor.ts";
import type { LibroGimnasio } from "../../../../../shared/casas/gimnasio6/types.ts";

const libro: LibroGimnasio = {
  id: "lib-1",
  userId: "u1",
  sesionUmbral5Id: "s1",
  modulo: "social_producto",
  limiteOrigen: "No puedo vender.",
  recursos: recursosVacios(),
  puntero: { capitulo: 1, subcodigo: 1, indice: 1, variante: 0 },
  estado: "ABIERTO",
  capituloSelladoDia: null,
  capitulosSellados: [],
  turnos: [],
  createdAt: "2026-11-05T00:00:00.000Z",
  updatedAt: "2026-11-05T00:00:00.000Z",
};

describe("Consola gimnasio", () => {
  it("muestra una sola pregunta y permite copiar el libro", () => {
    const html = renderToStaticMarkup(
      createElement(ConsolaGimnasio, {
        libro,
        pregunta: {
          escenario: "Ahora tienes tu propósito: vender.",
          pregunta: "En una escala del 1 al 10, ¿en qué número te posicionas?",
          capitulo: 1,
          subcodigo: 1,
          indice: 1,
          variante: 0,
          etiquetaCapitulo: "Seguridad en tu producto",
        },
        topeDiario: false,
        onResponder: () => {},
        onCopiar: () => {},
        enviando: false,
      }),
    );
    assert.match(html, /gimnasio6-consola/);
    assert.match(html, /1 al 10/);
    assert.match(html, /gimnasio6-copiar/);
    assert.doesNotMatch(html, /fallaste/);
    assert.doesNotMatch(html, /conocimiento sobre tu producto/);
  });

  it("muestra el aviso del maestro junto al recuadro, no arriba de la pantalla", () => {
    const html = renderToStaticMarkup(
      createElement(ConsolaGimnasio, {
        libro,
        pregunta: {
          escenario: "Imagina que esa intención llega a 10.",
          pregunta:
            "¿Marcaría una diferencia si tu intención de prioridad de vender llegara a nivel 10, y cómo sería esa situación?",
          capitulo: 1,
          subcodigo: 2,
          indice: 3,
          variante: 0,
          etiquetaCapitulo: "Seguridad en tu producto",
        },
        topeDiario: false,
        onResponder: () => {},
        onCopiar: () => {},
        enviando: false,
        aviso: "El maestro no pudo tomar el turno.",
      }),
    );
    assert.match(html, /gimnasio6-aviso/);
    assert.match(html, /El maestro no pudo tomar el turno/);
    assert.match(html, /Respondé desde el cuarto/);
  });
});
