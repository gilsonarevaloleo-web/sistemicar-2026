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
    assert.match(html, /gimnasio6-pasos/);
    assert.match(html, /Frente al producto/);
    assert.match(html, /Seguridad en tu producto · 1\.1/);
    assert.match(html, /gimnasio6-mute/);
    assert.match(html, /data-estado="actual"/);
    assert.match(html, /gimnasio6-paso-1-1/);
    assert.match(html, /gimnasio6-paso-4-3/);
    assert.doesNotMatch(html, /Quién sería esta persona/);
    assert.doesNotMatch(html, /se salió de casillas/);
  });

  it("en el paso 2.1 no adelanta las preguntas de 2.2", () => {
    const html = renderToStaticMarkup(
      createElement(ConsolaGimnasio, {
        libro: {
          ...libro,
          puntero: { capitulo: 1, subcodigo: 2, indice: 1, variante: 0 },
        },
        pregunta: {
          escenario:
            "Ahora que sabes sobre tu producto. Entre todos tus deberes personales.",
          pregunta:
            "¿Qué prioridad le das del 1 al 10 al oficio de vender entre todo lo que tienes que hacer?",
          capitulo: 1,
          subcodigo: 2,
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
    assert.match(html, /gimnasio6-paso-2-1/);
    assert.match(html, /data-estado="actual"/);
    assert.match(html, /Prioridad/);
    assert.match(html, /tu propósito: vender/);
    assert.doesNotMatch(html, /Cómo te planificarías para poder sacar tu semana/);
    assert.doesNotMatch(html, /Del 1 al 10, sin flor/);
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

  it("capítulo sellado muestra el mapa hecho y no abre el capítulo 2", () => {
    const html = renderToStaticMarkup(
      createElement(ConsolaGimnasio, {
        libro: {
          ...libro,
          puntero: { capitulo: 2, subcodigo: 1, indice: 1, variante: 0 },
          estado: "TOPE_DIARIO",
          capitulosSellados: [1],
        },
        pregunta: null,
        topeDiario: true,
        onResponder: () => {},
        onContinuar: () => {},
        onCopiar: () => {},
        enviando: false,
      }),
    );
    assert.match(html, /Seguridad en tu producto · sellado/);
    assert.match(html, /gimnasio6-tope/);
    assert.match(html, /data-estado="hecho"/);
    assert.doesNotMatch(html, /Quién sería esta persona/);
    assert.doesNotMatch(html, /gimnasio6-form/);
  });

  it("no deja debajo del recuadro una pregunta de los tres tiempos", () => {
    const html = renderToStaticMarkup(
      createElement(ConsolaGimnasio, {
        libro: {
          ...libro,
          puntero: { capitulo: 2, subcodigo: 1, indice: 2, variante: 0 },
          turnos: [
            {
              id: "viejo",
              capitulo: 2,
              subcodigo: 1,
              indice: 2,
              variante: 0,
              escenario: "Esa persona te está mirando.",
              pregunta: "¿Qué hace tu cuerpo con esa mirada?",
              respuesta: "Se tensa.",
              pasa: true,
              creadoAt: "2026-11-11T00:00:00.000Z",
            },
          ],
        },
        pregunta: {
          escenario: "Esa persona ya está en el cuarto.",
          pregunta: "¿Qué le pudiera gustar y qué no le gustaría?",
          capitulo: 2,
          subcodigo: 1,
          indice: 2,
          variante: 0,
          etiquetaCapitulo: "Fricción social",
        },
        topeDiario: false,
        onResponder: () => {},
        onCopiar: () => {},
        enviando: false,
      }),
    );
    assert.match(html, /Qué le pudiera gustar/);
    assert.doesNotMatch(html, /Qué hace tu cuerpo con esa mirada/);
    assert.doesNotMatch(html, /Tres tiempos/);
    assert.match(html, /gimnasio6-paso-4-3/);
  });
});
