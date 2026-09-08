import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { construirGuionLlamada } from "./callScripts.ts";
import { VENDEDOR_CALLS_DAILY_LIMIT } from "./callTypes.ts";

describe("Vendedor llamadas — guiones", () => {
  it("límite diario por defecto = 20", () => {
    assert.equal(VENDEDOR_CALLS_DAILY_LIMIT, 20);
  });

  it("cualquier código empuja a Jornada Base (no Espejo)", () => {
    const g = construirGuionLlamada(6, "ESPEJO", "ANA");
    assert.equal(g.codigo, 3);
    assert.match(g.voz, /Jornada/i);
    assert.match(g.whatsapp, /planificacion_base/);
    assert.match(g.whatsapp, /ref=ANA/);
    assert.equal(g.puertaComercial, "JORNADA");
    assert.doesNotMatch(g.whatsapp, /espejo_inicio|Umbral|Espejo/i);
    assert.doesNotMatch(g.voz, /Detectamos|Código 6|vendedora de Sistemicar/i);
  });

  it("guion Jornada C3 apunta a planificacion_base y suena humano", () => {
    const g = construirGuionLlamada(3, "JORNADA");
    assert.match(g.whatsapp, /planificacion_base/);
    assert.match(g.whatsapp, /Hola, soy de Sistemicar/);
    assert.match(g.voz, /te llamo de Sistemicar/i);
    assert.match(g.voz, /Jornada/i);
  });

  it("código 1 también cierra en Jornada Base", () => {
    const g = construirGuionLlamada(1, "UMBRAL");
    assert.equal(g.codigo, 1);
    assert.match(g.whatsapp, /planificacion_base/);
    assert.doesNotMatch(g.whatsapp, /umbral\/entrada|Umbral/i);
    assert.equal(g.puertaComercial, "JORNADA");
  });
});
