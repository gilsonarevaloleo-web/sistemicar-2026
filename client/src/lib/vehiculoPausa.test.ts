import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendVehiculoPausa,
  closeVehiculoPausaAbierta,
  minutosPausa,
  nombrePausa,
} from "./vehiculoPausa.ts";

describe("vehiculoPausa — historia de presencia", () => {
  it("abre una pausa y no duplica si ya está abierta", () => {
    const a = appendVehiculoPausa(undefined, 7_30, "desayuno");
    assert.equal(a.length, 1);
    assert.equal(a[0]?.titulo, "desayuno");
    const b = appendVehiculoPausa(a, 7_45, "otra");
    assert.equal(b.length, 1);
    assert.equal(b[0]?.pausadoAt, 7_30);
  });

  it("cierra la pausa abierta con reanudadoAt", () => {
    const open = appendVehiculoPausa(undefined, 1000, "desayuno");
    const closed = closeVehiculoPausaAbierta(open, 1000 + 60 * 60_000);
    assert.equal(closed?.[0]?.reanudadoAt, 1000 + 60 * 60_000);
    assert.equal(minutosPausa(closed![0]!, 1000 + 90 * 60_000), 60);
  });

  it("pausa viva usa now para la duración", () => {
    const open = { pausadoAt: 1000, titulo: "primera intercepción del dia" };
    assert.equal(minutosPausa(open, 1000 + 60 * 60_000), 60);
    assert.equal(nombrePausa(open), "primera intercepción del dia");
    assert.equal(nombrePausa({}), "Pausa");
  });
});
