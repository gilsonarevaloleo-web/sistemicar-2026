import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CASA_OFICIO_RITUAL,
  CASA_OFICIO_RITUAL_CORTO,
} from "@shared/umbral/oficioCasa";

const here = dirname(fileURLToPath(import.meta.url));

describe("Casa 5 Oficio — entrada", () => {
  it("el lienzo es el ritual largo, no el quiz de objeción ni el límite", () => {
    const src = readFileSync(join(here, "umbral-entrada.tsx"), "utf8");
    assert.match(src, /CASA_OFICIO_RITUAL/);
    assert.match(src, /umbral-entrada-volcado/);
    assert.match(src, /ENTRAR A LOS 10 CÓDIGOS/);
    assert.match(src, /\/umbral\/v2/);
    assert.doesNotMatch(src, /entradaDiagnostico/);
    assert.doesNotMatch(src, /\/limite/);
    assert.doesNotMatch(src, /gimnasio/i);
    assert.equal(CASA_OFICIO_RITUAL_CORTO, "¿Qué se te debe?");
    assert.match(CASA_OFICIO_RITUAL, /trabajo, favor, hora o pieza/);
  });
});
