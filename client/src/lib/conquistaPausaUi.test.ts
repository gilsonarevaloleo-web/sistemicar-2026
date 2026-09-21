import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const card = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/jornada4/ConquistaCard.tsx"),
  "utf8"
);

describe("conquista pausa UI — un toque, sin letras", () => {
  it("no abre input ni teclado para titular la pausa", () => {
    assert.equal(card.includes("Tarea que interrumpe"), false);
    assert.equal(card.includes("j4-conquista-pausa-input"), false);
    assert.equal(card.includes("showPausaForm"), false);
    assert.equal(card.includes("pausaTitulo"), false);
    assert.match(card, /data-testid="j4-conquista-pausa"/);
    assert.match(card, /tituloPausaInterrupcion\(\)/);
  });
});
