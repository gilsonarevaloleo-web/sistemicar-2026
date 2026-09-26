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

  it("el Maestro no nombra Intención Panorámica ni puertas de Jornada", async () => {
    const r = await evaluarDepositoVolcado({
      textoVolcado: SECO,
      gradoUsuarioActual: 1,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.doesNotMatch(r.diagnostico.devolucionMaestro, /Intención Panorámica/);
    assert.doesNotMatch(r.diagnostico.devolucionMaestro, /Presencia de Terreno/);
    assert.doesNotMatch(JSON.stringify(r.engine), /Puertas de Intención/);
  });

  it("volcado de máquina de coser no usa plantilla C6 social y no dictamina ruido si G3+estructura", async () => {
    const r = await evaluarDepositoVolcado({
      textoVolcado:
        "Hoy a las 8:10 aprendí que el botón no entra si la tensión no cierra el encaje. Usé la máquina de coser. Corté 12 botones. Ajusté la tensión del hilo a 4. Cosí el segundo. Armé la prenda. Medí el ojal. El sesgo: yo suelo forzar la pieza. No lo hice. Dijo: \"papá el botón no entra así\". No dije «después veo mañana». Cerré a las 8:40.",
      gradoUsuarioActual: 1,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const blob = JSON.stringify(r.engine);
    assert.doesNotMatch(blob, /miedo al rechazo/);
    assert.doesNotMatch(blob, /el cuerpo en la puerta/i);
    assert.ok(r.engine.evaluacionGrado.gradoDetectado >= 3);
    assert.ok(r.engine.metricasMerito.densidadEstructural > 75);
    assert.doesNotMatch(r.engine.puntoCiego.loNoDicho, /reescrib/i);
    assert.match(
      r.engine.puntoCiego.loNoDicho + r.engine.mecanicaAbsorcion.instruccionUnica,
      /ajuste|tensión|pieza|herramient|física|encaje|roce/i,
    );
  });
});
