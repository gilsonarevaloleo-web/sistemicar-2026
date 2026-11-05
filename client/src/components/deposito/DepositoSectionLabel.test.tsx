import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DepositoSectionLabel } from "./DepositoSectionLabel.tsx";

describe("DepositoSectionLabel", () => {
  it("nombra la zona con paso, título y pista", () => {
    const html = renderToStaticMarkup(
      createElement(DepositoSectionLabel, {
        step: "01",
        title: "Laboratorio",
        hint: "Volcá el hecho.",
        testId: "deposito-v3-zona-auditar",
      }),
    );
    assert.match(html, /deposito-v3-zona-auditar/);
    assert.match(html, /01/);
    assert.match(html, /Laboratorio/);
    assert.match(html, /Volcá el hecho/);
  });
});
