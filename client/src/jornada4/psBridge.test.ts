import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  awardConquistaSubPs,
  awardSituacionFilaPs,
  DESGLOSADOR_SUB_CUMPLIDO_PS,
  J4_SITUACION_FILA_PS,
} from "./psBridge.ts";
import type { SubVehiculo } from "../lib/persistence.ts";

describe("psBridge Dual Kernel", () => {
  it("otorga PS de sub conquista y marca fuente única", async () => {
    const calls: Array<{ amount: number; source: string }> = [];
    const sub = {
      id: "sv_1",
      titulo: "Pretina",
      status: "cumplido",
      orden: 0,
    } as SubVehiculo;

    const awarded = await awardConquistaSubPs("Misión bolsillo", sub, async (amount, source) => {
      calls.push({ amount, source });
      return true;
    });

    assert.equal(awarded, DESGLOSADOR_SUB_CUMPLIDO_PS);
    assert.equal(calls.length, 1);
    assert.match(calls[0]!.source, /Desglosador · Misión bolsillo → Pretina \[sv_1\]/);
  });

  it("no re-otorga si el sub ya tiene psOtorgados", async () => {
    const calls: Array<{ amount: number; source: string }> = [];
    const sub = {
      id: "sv_2",
      titulo: "Ya pagado",
      status: "cumplido",
      orden: 0,
      psOtorgados: 2,
    } as SubVehiculo;

    const awarded = await awardConquistaSubPs("Misión", sub, async (amount, source) => {
      calls.push({ amount, source });
      return true;
    });

    assert.equal(awarded, 0);
    assert.equal(calls.length, 0);
  });

  it("incluye id de fila situacional en la fuente", async () => {
    const calls: Array<{ amount: number; source: string }> = [];
    const awarded = await awardSituacionFilaPs("Decisión A", async (amount, source) => {
      calls.push({ amount, source });
      return true;
    }, "st_99");

    assert.equal(awarded, J4_SITUACION_FILA_PS);
    assert.equal(calls[0]!.source, "J4 situacional · Decisión A [st_99]");
  });
});
