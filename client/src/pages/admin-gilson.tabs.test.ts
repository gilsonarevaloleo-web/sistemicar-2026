import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

describe("admin-gilson — pestañas táctiles", () => {
  it("abre Módulos por defecto y las pestañas son type=button", () => {
    const src = readFileSync(join(dir, "admin-gilson.tsx"), "utf8");
    assert.match(src, /tabFromUrl/);
    assert.match(src, /return "modulos"/);
    assert.match(src, /goToTab\("modulos"\)/);
    assert.match(src, /type="button"/);
    assert.match(src, /touch-manipulation/);
    assert.match(src, /unlockAdminTouches/);
  });
});
