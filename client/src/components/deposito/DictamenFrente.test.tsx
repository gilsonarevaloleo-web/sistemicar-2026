import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DictamenFrente } from "./DictamenFrente.tsx";
import { analizarVolcado } from "@shared/deposito/analizarVolcado.ts";

describe("DictamenFrente", () => {
  it("muestra el dictamen y el siguiente ojo", () => {
    const dictamen = analizarVolcado(
      "En la costura aprendí la secuencia: primero el corte de la tela, después el orden de ejecución, luego cómo se hace el armado paso a paso en la mesa del taller.",
      { ojosConLugar: [1, 2] }
    );
    const html = renderToStaticMarkup(createElement(DictamenFrente, { dictamen }));
    assert.match(html, /DICTAMEN/);
    assert.match(html, /Ojo abierto: C/);
    assert.match(html, /PLANETA/);
    assert.match(html, /Observar con C|Seguir con C/);
  });
});
