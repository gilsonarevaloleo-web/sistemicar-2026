import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const card = readFileSync(join(dir, "../components/jornada4/ConquistaCard.tsx"), "utf8");
const ops = readFileSync(join(dir, "../hooks/useJornada4Ops.ts"), "utf8");
const list = readFileSync(join(dir, "../components/jornada4/Jornada4VehicleList.tsx"), "utf8");

describe("conquista pausa UI — directa y justificada, sin vehículo sombra", () => {
  it("pausa directa sigue siendo un toque sin teclado", () => {
    assert.match(card, /data-testid="j4-conquista-pausa"/);
    assert.match(card, /tituloPausaInterrupcion\(\)/);
    assert.match(card, /Pausar/);
  });

  it("la justificación nombra el sello, no lanza un vehículo", () => {
    assert.match(card, /showPausaForm/);
    assert.match(card, /pausaTitulo/);
    assert.match(card, /data-testid="j4-conquista-pausa-input"/);
    assert.match(card, /Nombrar inconveniente/);
    assert.match(card, /¿En qué se va el tiempo\?/);
    assert.equal(card.includes("Tarea que interrumpe"), false);
  });

  it("una pausa directa se puede nombrar después", () => {
    assert.match(card, /data-testid="j4-conquista-pausa-label"/);
    assert.match(card, /Nombrar esta pausa/);
    assert.match(list, /onLabelPausa/);
    assert.match(list, /jornada4-paused-stack/);
    assert.match(list, /isPausedPresence/);
  });

  it("una sola pausa de conquista: el ops consulta el cupo", () => {
    const start = ops.indexOf("const pausaInterrupcion");
    const end = ops.indexOf("const labelPausaConquista");
    assert.ok(start >= 0 && end > start);
    const fn = ops.slice(start, end);
    assert.match(fn, /canOpenConquistaPausa/);
    assert.match(fn, /CONQUISTA_PAUSA_UNICA_TOAST/);
    assert.match(list, /pausaBloqueadaPor/);
    assert.match(list, /findOtraConquistaPausa/);
    assert.match(card, /data-testid="j4-conquista-pausa-unica"/);
    assert.match(card, /Una sola pausa/);
  });

  it("el ops de pausa no crea hijo de interrupción", () => {
    const start = ops.indexOf("const pausaInterrupcion");
    const end = ops.indexOf("const labelPausaConquista");
    assert.ok(start >= 0 && end > start);
    const fn = ops.slice(start, end);
    assert.equal(fn.includes("addVehicle"), false);
    assert.equal(fn.includes("vehiculoPadreDesglosadorId"), false);
    assert.match(fn, /buildConquistaPausePatch/);
  });
});
