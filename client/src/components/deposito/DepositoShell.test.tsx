import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DepositoShell } from "./DepositoShell.tsx";

describe("DepositoShell", () => {
  it("compacta el recinto V3: badge, tagline y volcados, sin el ensayo suelto", () => {
    const html = renderToStaticMarkup(
      createElement(DepositoShell, {
        edition: "v3",
        volcados: 4,
        racha: 2,
      }),
    );
    assert.match(html, /deposito-shell/);
    assert.match(html, /deposito-shell-badge/);
    assert.match(html, />V3</);
    assert.match(html, /Universidad · Depósito/);
    assert.match(html, /deposito-shell-volcados/);
    assert.match(html, /deposito-shell-racha/);
    assert.doesNotMatch(html, /deposito-shell-hint-body/);
  });

  it("V2 muestra badge V2 y no inventa racha si no hay", () => {
    const html = renderToStaticMarkup(
      createElement(DepositoShell, { edition: "v2", volcados: 1 }),
    );
    assert.match(html, />V2</);
    assert.doesNotMatch(html, /deposito-shell-racha/);
  });
});
