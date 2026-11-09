import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));

describe("Casa 5 Oficio — entrada", () => {
  it("recupera la práctica de 10 códigos (Arena + Forja) en el planeta 5", () => {
    const src = readFileSync(join(here, "umbral-entrada.tsx"), "utf8");
    assert.match(src, /PLANETA C5/);
    assert.match(src, /entradaDiagnostico/);
    assert.match(src, /buildOficioPracticaHref/);
    assert.match(src, /umbral-entrada-cta-arena/);
    assert.match(src, /umbral-entrada-cta-forja/);
    assert.match(src, /modo=arena|EXTERNO_VENTAS/);
    assert.match(src, /PROBAR CÓDIGO 1 GRATIS/);
    assert.match(src, /CASA_OFICIO_RITUAL_CORTO/);
    assert.doesNotMatch(src, /umbral-entrada-volcado/);
    assert.doesNotMatch(src, /href=["']\/limite/);
    assert.doesNotMatch(src, /href=["']\/gimnasio/);
  });
});
