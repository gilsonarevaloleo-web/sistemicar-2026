import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Jornada4OpsToolsRail } from "./Jornada4OpsToolsRail.tsx";

function installLocalStorage() {
  const mem = new Map<string, string>();
  const store = {
    getItem(k: string) {
      return mem.has(k) ? mem.get(k)! : null;
    },
    setItem(k: string, v: string) {
      mem.set(k, v);
    },
    removeItem(k: string) {
      mem.delete(k);
    },
    clear() {
      mem.clear();
    },
    key(i: number) {
      return Array.from(mem.keys())[i] ?? null;
    },
    get length() {
      return mem.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: store, configurable: true });
}

describe("Jornada4OpsToolsRail", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("pinta símbolos y deja el detalle cerrado", () => {
    const html = renderToStaticMarkup(
      createElement(Jornada4OpsToolsRail, {
        onOpenTutorial: () => undefined,
        showRecinto: true,
        showGuia: true,
        showRevelacion: true,
        hasRitmo: true,
      })
    );
    assert.match(html, /jornada4-ops-rail/);
    assert.match(html, /jornada4-ops-tool-apunte/);
    assert.match(html, /jornada4-ops-tool-recinto/);
    assert.match(html, /jornada4-ops-tool-guia/);
    assert.match(html, /jornada4-ops-tool-tutorial/);
    assert.match(html, /jornada4-ops-tool-revelacion/);
    assert.equal(html.includes("recinto-minimo-dock"), false);
    assert.equal(html.includes("jornada4-como-operar"), false);
    assert.equal(html.includes("jornada4-apunte-card"), false);
    assert.equal(html.includes("jornada4-revelacion"), false);
  });

  it("oculta recinto y guía cuando no aplican", () => {
    const html = renderToStaticMarkup(
      createElement(Jornada4OpsToolsRail, {
        onOpenTutorial: () => undefined,
        showRecinto: false,
        showGuia: false,
        showRevelacion: false,
      })
    );
    assert.match(html, /jornada4-ops-tool-apunte/);
    assert.match(html, /jornada4-ops-tool-tutorial/);
    assert.equal(html.includes("jornada4-ops-tool-recinto"), false);
    assert.equal(html.includes("jornada4-ops-tool-guia"), false);
  });
});
