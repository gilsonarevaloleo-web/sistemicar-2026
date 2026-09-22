import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluarDepositoVolcado } from "./evaluarVolcado.ts";

const SECO =
  "Hoy a las 9:10 llamé al cliente. Pedí 40 mil. Dijo que no. Anoté el rechazo. El sesgo: yo suelo disculparme. No lo hice. No dije «después veo». Cerré a las 9:14.";

describe("evaluarDepositoVolcado", () => {
  it("falla si el volcado está vacío", async () => {
    const r = await evaluarDepositoVolcado({ gradoUsuarioActual: 1 });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.status, 400);
    assert.match(r.error, /vacío/);
  });

  it("promueve perfil G1→G3 en lectura seca", async () => {
    const r = await evaluarDepositoVolcado({
      textoVolcado: SECO,
      gradoUsuarioActual: 1,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.engine.evaluacionGrado.gradoDetectado, 3);
    assert.equal(r.perfilPromovido, true);
    assert.match(r.engine.ojoDominante.codigo, /^C\d+$/);
    assert.equal(r.source, "local_fallback");
    assert.deepEqual(Object.keys(r.engine).sort(), [
      "evaluacionGrado",
      "mecanicaAbsorcion",
      "metricasMerito",
      "ojoDominante",
      "puntoCiego",
    ]);
    assert.ok(r.engine.puntoCiego.loNoDicho.length > 0);
    assert.ok(r.engine.mecanicaAbsorcion.instruccionUnica.length > 0);
    assert.doesNotMatch(
      JSON.stringify(r.engine),
      /ejeMasculino|ejeFemenino|"polo"|género|"genero"/i,
    );
  });

  it("F- entrega contrapeso M+ y lectura de fase, sin exponer género", async () => {
    const r = await evaluarDepositoVolcado({
      textoVolcado:
        "Me condicionaron y no pude arrancar. Después veo. Siempre me pasa. Me pesa el mapa.",
      gradoUsuarioActual: 1,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.match(r.engine.mecanicaAbsorcion.instruccionUnica, /hora|vehículo|corte|freno/i);
    assert.match(r.engine.puntoCiego.loNoDicho, /Fase actual/i);
    assert.doesNotMatch(
      r.engine.mecanicaAbsorcion.instruccionUnica,
      /masculin|femenin|M\+|F-/,
    );
    assert.doesNotMatch(r.engine.puntoCiego.loNoDicho, /deberías/i);
  });

  it("M- entrega contención F+ sin alterar el contrato", async () => {
    const r = await evaluarDepositoVolcado({
      textoVolcado:
        "Forcé la puerta, grité el precio y me choqué con el rechazo. Impuse fuerza bruta y exploté.",
      gradoUsuarioActual: 1,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.match(
      r.engine.mecanicaAbsorcion.instruccionUnica,
      /ritmo|secuencia|impulso|observ/i,
    );
    assert.deepEqual(Object.keys(r.engine.puntoCiego).sort(), [
      "florDetectada",
      "loNoDicho",
    ]);
    assert.deepEqual(Object.keys(r.engine.mecanicaAbsorcion), ["instruccionUnica"]);
  });
});
