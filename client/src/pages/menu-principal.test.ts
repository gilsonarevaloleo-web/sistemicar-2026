import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

describe("Umbral en Centro de Comando y sidebar", () => {
  it("el menú monta la tarjeta UMBRAL (no En camino)", () => {
    const menu = readFileSync(join(dir, "menu-principal.tsx"), "utf8");
    assert.match(menu, /UMBRAL_MENU/);
    const start = menu.indexOf("id: UMBRAL_MENU.id");
    assert.ok(start >= 0, "falta la tarjeta UMBRAL_MENU en buildMenuItems");
    const pushBlock = menu.slice(start, menu.indexOf("for (const mod of MODULOS_EN_CAMINO)"));
    assert.match(pushBlock, /id: UMBRAL_MENU\.id/);
    assert.match(pushBlock, /route: UMBRAL_MENU\.route/);
    assert.equal(pushBlock.includes("enCamino"), false);
  });

  it("sidebar lleva a la consola v2, no solo a la galería", () => {
    const sidebar = readFileSync(join(dir, "../components/sidebar.tsx"), "utf8");
    assert.match(sidebar, /UMBRAL_MENU\.route/);
    assert.match(sidebar, /isUmbralModulePath/);
    assert.equal(sidebar.includes('{ path: "/umbral", icon: Zap, label: "Umbral" }'), false);
  });
});
