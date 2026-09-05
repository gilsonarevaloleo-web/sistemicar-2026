import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { draftToCierreLog } from "./selloOperadorBuild.ts";
import type { SelloOperadorDraft } from "@shared/selloOperador";

describe("draftToCierreLog", () => {
  it("el log solo lo firma el operador y deja los números clavados", () => {
    const draft: SelloOperadorDraft = {
      fecha: "2026-09-05",
      userId: "u1",
      timestamp: 1,
      selloEmitido: true,
      selladoPor: "operador",
      totalPS: 9,
      conquistaMin: 120,
      entropiaMin: 30,
      vacioMin: 10,
      jornadaPlanMin: 160,
      segmentosTotales: 3,
      segmentosCerradosManual: 2,
      tension: "Cerraste con evidencia. El ciclo no viaja a la cama.",
      evidenciaHechos: ["PS del día: 9"],
      mandato: "Mañana cierra la Puerta del Término tú.",
      recintosCerrados: 1,
      recintosHeredados: 0,
      recintosAbiertos: 0,
      vehiculosCerradosManual: 1,
      vehiculosCerradosSistema: 0,
      vehiculosActivos: 0,
    };
    const log = draftToCierreLog(draft);
    assert.equal(log.selloEmitido, true);
    assert.equal(log.selladoPor, "operador");
    assert.equal(log.conquistaMin, 120);
    assert.equal(log.totalPS, 9);
    assert.equal(log.selloTexto, draft.tension);
    assert.ok(log.evidenciaHechos?.includes("PS del día: 9"));
  });
});
