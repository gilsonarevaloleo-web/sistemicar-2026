import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { construirGuionLlamada } from "./callScripts.ts";
import { VENDEDOR_CALLS_DAILY_LIMIT } from "./callTypes.ts";

describe("Vendedor llamadas — guiones", () => {
  it("límite diario por defecto = 20", () => {
    assert.equal(VENDEDOR_CALLS_DAILY_LIMIT, 20);
  });

  it("guion Espejo C6 menciona planeta y código", () => {
    const g = construirGuionLlamada(6, "ESPEJO", "ANA");
    assert.match(g.voz, /Código 6/);
    assert.match(g.voz, /Espejo/i);
    assert.match(g.whatsapp, /espejo_inicio/);
    assert.match(g.whatsapp, /ref=ANA/);
  });

  it("guion Jornada C3 apunta a planificacion_base", () => {
    const g = construirGuionLlamada(3, "JORNADA");
    assert.match(g.whatsapp, /planificacion_base/);
    assert.match(g.voz, /Jornada/i);
  });

  it("guion Umbral C1 apunta a entrada trial", () => {
    const g = construirGuionLlamada(1, "UMBRAL");
    assert.match(g.whatsapp, /umbral\/entrada/);
  });
});
