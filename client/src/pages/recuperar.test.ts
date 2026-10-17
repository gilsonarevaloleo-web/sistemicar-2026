import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, "recuperar.tsx"), "utf8");
const app = readFileSync(join(dir, "../App.tsx"), "utf8");
const menu = readFileSync(join(dir, "menu-principal.tsx"), "utf8");

describe("página /recuperar", () => {
  it("está cableada y pide el mismo Google", () => {
    assert.match(app, /path="\/recuperar"/);
    assert.match(src, /Tus datos no se fueron de la nube/);
    assert.match(src, /button-recuperar-google/);
    assert.match(src, /clearMigrationPending/);
    assert.match(src, /gilsonarevalo.leo@gmail.com/);
  });

  it("el menú no migra una sesión anónima vacía y enlaza recuperar", () => {
    assert.match(menu, /localAccountLooksEmpty/);
    assert.match(menu, /href="\/recuperar"/);
    assert.match(menu, /limpiaste el teléfono/);
  });

  it("el admin busca en la nube, no solo en el teléfono", () => {
    const admin = readFileSync(join(dir, "admin-gilson.tsx"), "utf8");
    assert.match(admin, /\/api\/admin\/recovery\/accounts/);
    assert.match(admin, /Entra con Google/);
    assert.match(admin, /button-recovery-google/);
    assert.match(admin, /input-recovery-query/);
  });
});
