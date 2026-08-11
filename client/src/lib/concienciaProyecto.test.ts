import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildConcienciaProyectoResumen,
  pushPresenciaVehicleId,
  resolveDuracionMinCierre,
  resolveEtapaConcienciaProyecto,
} from "./concienciaProyecto.ts";

describe("concienciaProyecto", () => {
  it("etapa inconsciente sin evidencia", () => {
    assert.equal(resolveEtapaConcienciaProyecto({}), "inconsciente");
  });

  it("etapa presente con minutos o sesiones", () => {
    assert.equal(
      resolveEtapaConcienciaProyecto({ minutosPresencia: 12 }),
      "presente"
    );
    assert.equal(
      resolveEtapaConcienciaProyecto({ sesionesPresencia: 1 }),
      "presente"
    );
  });

  it("etapa norte gana sobre presencia", () => {
    assert.equal(
      resolveEtapaConcienciaProyecto({
        minutosPresencia: 40,
        peldanosConquistados: 2,
        minutosNorte: 30,
      }),
      "norte"
    );
  });

  it("resumen relata el inicio", () => {
    const r = buildConcienciaProyectoResumen({
      minutosPresencia: 20,
      minutosNorte: 15,
      peldanosConquistados: 1,
      primeraPresenciaAt: Date.parse("2026-08-01T12:00:00Z"),
      primerNorteAt: Date.parse("2026-08-10T12:00:00Z"),
    });
    assert.equal(r.etapa, "norte");
    assert.equal(r.minutosInvertidos, 35);
    assert.match(r.relatoInicio, /Presente/);
    assert.match(r.relatoInicio, /Norte/);
  });

  it("resolveDuracionMinCierre usa pared si falta duracionFinal", () => {
    const min = resolveDuracionMinCierre({
      aperturaAt: 1_000_000,
      cierreAt: 1_000_000 + 25 * 60_000,
    });
    assert.equal(min, 25);
  });

  it("pushPresenciaVehicleId es idempotente", () => {
    const a = pushPresenciaVehicleId([], "v1");
    assert.equal(a.isNew, true);
    const b = pushPresenciaVehicleId(a.next, "v1");
    assert.equal(b.isNew, false);
    assert.deepEqual(b.next, ["v1"]);
  });
});
