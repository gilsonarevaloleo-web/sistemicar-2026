import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, "menu-principal.tsx"), "utf8");

describe("menú — Jornada no se esconde si el trial venció", () => {
  it("el tile de Jornada no depende de canEnterJornadaBaseMenu", () => {
    assert.match(src, /shouldShowJornadaMenuTile/);
    assert.match(src, /jornadaMenuTileSubtitle/);
    assert.match(src, /claimPendingPurchases/);
    const tileBlock = src.slice(
      src.indexOf("if (previewOps || shouldShowJornadaMenuTile())"),
      src.indexOf("for (const mod of modulosLiberados())"),
    );
    assert.doesNotMatch(tileBlock, /canEnterJornadaBaseMenu/);
    assert.match(tileBlock, /JORNADA_V4_PATH/);
  });

  it("la barra inferior no cambia Jornada por el atajo a /pagos", () => {
    const nav = src.slice(src.indexOf("const navItems = ["));
    assert.match(nav, /JORNADA_MODULE.title/);
    assert.doesNotMatch(
      nav.slice(0, 400),
      /route: "\/pagos", label: "Módulos"/,
    );
  });
});
