import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BannerMeritoDetectado } from "./BannerMeritoDetectado.tsx";

describe("BannerMeritoDetectado", () => {
  it("muestra la felicitación canónica con el nombre del grado", () => {
    const html = renderToStaticMarkup(
      createElement(BannerMeritoDetectado, {
        grado: 3,
        onCerrar: () => {},
      }),
    );
    assert.match(html, /deposito-merito-modal/);
    assert.match(
      html,
      /¡Mérito Detectado! Tu precisión perceptiva ha elevado tu perfil a GRADO 3: Arquitecto de Punto Ciego/,
    );
    assert.match(html, /GRADO 3: Arquitecto de Punto Ciego/);
  });
});
