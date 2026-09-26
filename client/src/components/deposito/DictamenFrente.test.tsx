import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DictamenFrente } from "./DictamenFrente.tsx";
import { analizarVolcado } from "@shared/deposito/analizarVolcado.ts";

describe("DictamenFrente", () => {
  it("muestra el dictamen y el siguiente ojo", () => {
    const dictamen = analizarVolcado(
      "En la costura aprendí la secuencia: primero el corte de la tela, después el orden de ejecución, luego cómo se hace el armado paso a paso en la mesa del taller."
    );
    const html = renderToStaticMarkup(createElement(DictamenFrente, { dictamen }));
    assert.match(html, /DICTAMEN/);
    assert.match(html, /DICTAMEN · COSTURA/);
    assert.match(html, /Observar con C/);
  });

  it("etiqueta el fondo de la matriz, no la anécdota de tela", () => {
    const dictamen = analizarVolcado(
      "Hoy en la tela evalué los 10 códigos, el deber moral, la fatiga biológica y la dopamina de C4 sobre C1.",
    );
    const html = renderToStaticMarkup(createElement(DictamenFrente, { dictamen }));
    assert.match(html, /DICTAMEN · MATRIZ DE CÓDIGOS/);
    assert.doesNotMatch(html, /DICTAMEN · COSTURA/);
  });
});
