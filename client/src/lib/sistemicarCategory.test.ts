import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATEGORY_FOOTER,
  RECINTOS_PUBLIC,
  SISTEMICAR_CATEGORY,
} from "./sistemicarCategory.ts";

const dir = dirname(fileURLToPath(import.meta.url));

describe("sistemicarCategory — voz actual", () => {
  it("no usa el motor de cierre por capas en copy público", () => {
    const blob = [
      SISTEMICAR_CATEGORY.name,
      SISTEMICAR_CATEGORY.nameShort,
      SISTEMICAR_CATEGORY.oneLiner,
      SISTEMICAR_CATEGORY.notA,
      SISTEMICAR_CATEGORY.elevator,
      CATEGORY_FOOTER,
    ].join("\n");
    assert.doesNotMatch(blob, /motor de cierre/i);
    assert.doesNotMatch(blob, /presencia, entrada y producción/i);
    assert.match(blob, /cuatro recintos/i);
    assert.match(blob, /Base/);
    assert.match(blob, /Ritmo/);
    assert.match(blob, /Norte/);
  });

  it("el banner público muestra los cuatro recintos vivos", () => {
    assert.deepEqual(
      RECINTOS_PUBLIC.map((r) => r.id),
      ["espejo", "deposito", "jornada", "umbral"],
    );
    const banner = readFileSync(join(dir, "../components/CategoriaSistemicarBanner.tsx"), "utf8");
    assert.match(banner, /RECINTOS_PUBLIC/);
    assert.doesNotMatch(banner, /Capa \{/);
  });
});
