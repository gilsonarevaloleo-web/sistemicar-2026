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

  it("con métricas de La Jornada el Maestro nombra la pérdida de Intención Panorámica", async () => {
    const r = await evaluarDepositoVolcado({
      textoVolcado: SECO,
      gradoUsuarioActual: 1,
      metricasJornada: {
        puertasConquistadas: 0,
        puertasTotales: 3,
        puertasPerdidas: 3,
      },
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.match(r.diagnostico.devolucionMaestro, /Intención Panorámica/);
    assert.match(r.diagnostico.devolucionMaestro, /inercia biológica/);
  });
});
