import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Landmark, PenLine, Footprints } from "lucide-react";
import { DepositoMobileNav } from "./DepositoMobileNav.tsx";

const TABS = [
  { id: "auditar" as const, label: "Auditar", short: "Auditar", icon: PenLine },
  { id: "casa" as const, label: "Casa", short: "Casa", icon: Landmark },
  { id: "huella" as const, label: "Huella", short: "Huella", icon: Footprints },
];

describe("DepositoMobileNav", () => {
  it("pinta tres pestañas y marca la activa", () => {
    const html = renderToStaticMarkup(
      createElement(DepositoMobileNav, {
        value: "auditar",
        onChange: () => {},
        tabs: TABS,
        ariaLabel: "Secciones Depósito V3",
      }),
    );
    assert.match(html, /deposito-mobile-nav/);
    assert.match(html, /deposito-tab-auditar/);
    assert.match(html, /deposito-tab-casa/);
    assert.match(html, /deposito-tab-huella/);
    assert.match(html, /aria-selected="true"/);
    assert.match(html, /Auditar/);
  });
});
