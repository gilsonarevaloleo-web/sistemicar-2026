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
  modulo: "limite",
  limiteOrigen: "No sé quién soy para enamorar.",
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
  it("muestra una sola pregunta y tres tiempos", () => {
    const html = renderToStaticMarkup(
      createElement(ConsolaGimnasio, {
        libro,
        pregunta: {
          escenario: "Estás en este cuarto. Antes de hacer nada.",
          pregunta: "¿Quién sos vos en este cuarto?",
          capitulo: 1,
          subcodigo: 1,
          indice: 1,
          variante: 0,
          etiquetaCapitulo: "C1 Identidad / Ego / Cimiento",
          etiquetaTiempo: "Plantar",
        },
        topeDiario: false,
        onResponder: () => {},
        onCopiar: () => {},
        enviando: false,
      }),
    );
    assert.match(html, /gimnasio6-consola/);
    assert.match(html, /Quién sos vos/);
    assert.match(html, /gimnasio6-copiar/);
    assert.doesNotMatch(html, /fallaste/);
    assert.doesNotMatch(html, /conocimiento sobre tu producto/);
    assert.match(html, /gimnasio6-pasos/);
    assert.match(html, /Plantar/);
    assert.match(html, /Rozar/);
    assert.match(html, /Sostener/);
    assert.match(html, /gimnasio6-mute/);
    assert.match(html, /data-estado="actual"/);
    assert.match(html, /gimnasio6-paso-1-1/);
    assert.match(html, /gimnasio6-paso-1-3/);
    assert.doesNotMatch(html, /gimnasio6-paso-4-3/);
  });

  it("en rozar no adelanta sostener", () => {
    const html = renderToStaticMarkup(
      createElement(ConsolaGimnasio, {
        libro: {
          ...libro,
          puntero: { capitulo: 1, subcodigo: 1, indice: 2, variante: 0 },
        },
        pregunta: {
          escenario: "Esa frase tiene que pesar.",
          pregunta: "Sostené esa frase. ¿Qué cambia en el cuerpo si no pedís permiso?",
          capitulo: 1,
          subcodigo: 1,
          indice: 2,
          variante: 0,
          etiquetaCapitulo: "C1 Identidad / Ego / Cimiento",
          etiquetaTiempo: "Rozar",
        },
        topeDiario: false,
        onResponder: () => {},
        onCopiar: () => {},
        enviando: false,
      }),
    );
    assert.match(html, /gimnasio6-paso-1-2/);
    assert.match(html, /data-estado="actual"/);
    assert.match(html, /Rozar/);
    assert.match(html, /Esa frase tiene que pesar/);
    assert.doesNotMatch(html, /Ahora te dicen que no sos nadie/);
  });

  it("muestra el aviso del maestro junto al recuadro", () => {
    const html = renderToStaticMarkup(
      createElement(ConsolaGimnasio, {
        libro,
        pregunta: {
          escenario: "Estás en este cuarto.",
          pregunta: "¿Quién sos vos en este cuarto?",
          capitulo: 1,
          subcodigo: 1,
          indice: 1,
          variante: 0,
          etiquetaCapitulo: "C1 Identidad / Ego / Cimiento",
          etiquetaTiempo: "Plantar",
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

  it("código sellado muestra el mapa hecho y no abre el siguiente", () => {
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
    assert.match(html, /sellado/);
    assert.match(html, /gimnasio6-tope/);
    assert.match(html, /data-estado="hecho"/);
    assert.doesNotMatch(html, /gimnasio6-form/);
  });
});
