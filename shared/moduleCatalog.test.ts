import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MODULOS_ECOSISTEMA,
  MODULOS_EN_CAMINO,
  PAQUETE_EN_CAMINO,
  modulosEnCamino,
  modulosLiberados,
} from "./moduleCatalog.ts";

describe("moduleCatalog — paquete en camino", () => {
  it("los módulos futuros viven empaquetados, no como fichas sueltas", () => {
    const packed = modulosEnCamino();
    assert.ok(packed.length >= 1);
    assert.equal(packed.length, MODULOS_EN_CAMINO.length);
    assert.ok(packed.every((m) => m.enCamino));
    assert.deepEqual(
      packed.map((m) => m.id),
      MODULOS_ECOSISTEMA.filter((m) => m.enCamino).map((m) => m.id),
    );
  });

  it("al marcar enCamino:false el módulo sale del paquete", () => {
    assert.equal(modulosLiberados().length, 0);
    const liberado = { ...MODULOS_ECOSISTEMA[0], enCamino: false };
    const remaining = MODULOS_ECOSISTEMA.filter((m) => m.id !== liberado.id && m.enCamino);
    assert.ok(remaining.length === MODULOS_ECOSISTEMA.length - 1);
    assert.equal(liberado.enCamino, false);
  });

  it("el paquete tiene una sola ruta de menú", () => {
    assert.equal(PAQUETE_EN_CAMINO.id, "paquete-en-camino");
    assert.equal(PAQUETE_EN_CAMINO.route, "/en-camino");
  });

  it("recintos vivos no están en el ecosistema empaquetado", () => {
    const ids = new Set(MODULOS_ECOSISTEMA.map((m) => m.id));
    assert.equal(ids.has("espejo"), false);
    assert.equal(ids.has("deposito"), false);
    assert.equal(ids.has("jornada"), false);
    assert.equal(ids.has("umbral"), false);
  });
});
