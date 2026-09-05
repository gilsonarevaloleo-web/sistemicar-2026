import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  construirSelloOperador,
  debeRecordarSello,
  limaHour,
  recordatorioNoEsSello,
} from "./construirSello.ts";
import type { EvidenciaSelloInput } from "./types.ts";

function input(partial: Partial<EvidenciaSelloInput> = {}): EvidenciaSelloInput {
  return {
    fecha: "2026-09-05",
    nowMs: Date.UTC(2026, 8, 5, 3, 0, 0),
    userId: "u1",
    totalPS: 12,
    conquistaMin: 180,
    entropiaMin: 20,
    vacioMin: 40,
    jornadaPlanMin: 240,
    segmentosTotales: 4,
    segmentosCerradosManual: 3,
    segmentosEntropia: 1,
    vehiculosCerradosManual: 2,
    vehiculosCerradosSistema: 0,
    vehiculosActivos: 0,
    recintosCerrados: 1,
    recintosHeredados: 0,
    recintosAbiertos: 0,
    ...partial,
  };
}

describe("construirSelloOperador", () => {
  it("clava números y solo el operador emite el sello", () => {
    const s = construirSelloOperador(input());
    assert.equal(s.selloEmitido, true);
    assert.equal(s.selladoPor, "operador");
    assert.equal(s.conquistaMin, 180);
    assert.equal(s.totalPS, 12);
    assert.ok(s.evidenciaHechos.some((h) => h.includes("Puertas cerradas a mano: 3 de 4")));
    assert.ok(s.evidenciaHechos.some((h) => h.includes("Lo ajeno")));
  });

  it("si las puertas las cerró el sistema, la tensión no consuela", () => {
    const s = construirSelloOperador(
      input({
        segmentosCerradosManual: 0,
        vehiculosCerradosManual: 2,
        entropiaMin: 10,
      }),
    );
    assert.match(s.tension, /sistema|dueño/i);
  });

  it("el recordatorio no es un sello", () => {
    const r = recordatorioNoEsSello();
    assert.equal(r.selloEmitido, false);
    assert.equal(r.selladoPor, null);
  });
});

describe("debeRecordarSello", () => {
  it("no recuerda si ya está sellado", () => {
    assert.equal(debeRecordarSello(Date.UTC(2026, 8, 6, 3, 0, 0), true), false);
  });

  it("recuerda desde las 21:00 Lima", () => {
    // 21:00 Lima = 02:00 UTC del día siguiente
    const las21 = Date.UTC(2026, 8, 6, 2, 0, 0);
    assert.equal(limaHour(las21), 21);
    assert.equal(debeRecordarSello(las21, false), true);
    const las20 = Date.UTC(2026, 8, 6, 1, 0, 0);
    assert.equal(limaHour(las20), 20);
    assert.equal(debeRecordarSello(las20, false), false);
  });
});
