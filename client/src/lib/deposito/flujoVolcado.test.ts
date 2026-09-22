import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diagnosticarVolcadoLocal } from "@shared/deposito/engineConfig.ts";
import {
  calcularExpedienteOjos,
} from "@shared/deposito/grados.ts";
import {
  diagnosticoPromueve,
  errorGuardadoVolcado,
  felicitacionMerito,
  planGuardadoVolcado,
} from "./flujoVolcado.ts";
import { normalizarCapturaVolcado } from "@shared/deposito/engineConfig.ts";

const SECO =
  "Hoy a las 9:10 llamé al cliente. Pedí 40 mil. Dijo que no. Anoté el rechazo. El sesgo: yo suelo disculparme. No lo hice. No dije «después veo». Cerré a las 9:14.";

describe("flujoVolcado G1 — no rebotar / mérito UI", () => {
  it("G1 no bloquea UI ni espera Gemini/Firebase", () => {
    const plan = planGuardadoVolcado(1);
    assert.equal(plan.bloquearUi, false);
    assert.equal(plan.esperarGemini, false);
    assert.equal(plan.esperarFirebase, false);
    assert.equal(plan.exigirSesion, false);
  });

  it("G1 solo rechaza volcado vacío; no pide fricción", () => {
    assert.equal(errorGuardadoVolcado({ ...normalizarCapturaVolcado(""), gradoMaestria: 1 }, 1), "volcadoCrudo es requerido");
    const g1conTexto = normalizarCapturaVolcado({
      gradoMaestria: 1,
      volcadoCrudo: "Hoy llamé.",
    });
    assert.equal(errorGuardadoVolcado(g1conTexto, 1), null);
  });

  it("G2 sigue exigiendo fricción", () => {
    const g2 = normalizarCapturaVolcado({
      gradoMaestria: 2,
      volcadoCrudo: "Hoy llamé.",
    });
    assert.match(errorGuardadoVolcado(g2, 2) ?? "", /friccionDetectada/);
  });

  it("lectura seca G1 promociona y arma la felicitación canónica", () => {
    const captura = normalizarCapturaVolcado({
      gradoMaestria: 1,
      volcadoCrudo: SECO,
    });
    const diag = diagnosticarVolcadoLocal(SECO, captura);
    assert.equal(diag.evaluacionGrado?.meritoReconocido, true);
    const promovido = diagnosticoPromueve(diag, 1);
    assert.equal(promovido, 3);
    const feli = felicitacionMerito(promovido!);
    assert.equal(
      feli.mensaje,
      "¡Mérito Detectado! Tu precisión perceptiva ha elevado tu perfil a GRADO 3: Arquitecto de Punto Ciego",
    );
    const expediente = calcularExpedienteOjos([diag.codigoDominante]);
    assert.equal(expediente.techo, 10);
    assert.ok(expediente.rango >= 1);
    assert.ok(expediente.ojosNombrados.includes(diag.codigoDominante));
  });

  it("inspección ?grado= no promociona el perfil", () => {
    const captura = normalizarCapturaVolcado({
      gradoMaestria: 1,
      volcadoCrudo: SECO,
    });
    const diag = diagnosticarVolcadoLocal(SECO, captura);
    assert.equal(diagnosticoPromueve(diag, 1, true), null);
  });
});
