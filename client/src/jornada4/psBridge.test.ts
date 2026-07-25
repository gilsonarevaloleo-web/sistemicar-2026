import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubVehiculo } from "../lib/persistence.ts";
import {
  awardConquistaSubPs,
  awardSituacionFilaPs,
  J4_SITUACION_FILA_PS,
} from "./psBridge.ts";

describe("psBridge Dual Kernel", () => {
  it("otorga PS de unidad conquista aunque el award sea async", async () => {
    const calls: Array<{ amount: number; source: string }> = [];
    const award = async (amount: number, source: string) => {
      calls.push({ amount, source });
      return true;
    };
    const sub: SubVehiculo = {
      id: "sv_1",
      titulo: "Unidad A",
      status: "cumplido",
      cantidadLograda: 3,
      duracionFinal: 120,
    };
    const awarded = await awardConquistaSubPs("Misión", sub, award);
    assert.ok(awarded >= 2);
    assert.equal(calls.length, 1);
    assert.match(calls[0].source, /Desglosador/);
    assert.match(calls[0].source, /sv_1/);
  });

  it("no re-otorga si psOtorgados ya está marcado", async () => {
    let calls = 0;
    const award = async () => {
      calls += 1;
      return true;
    };
    const sub: SubVehiculo = {
      id: "sv_2",
      titulo: "Ya pagada",
      status: "cumplido",
      psOtorgados: 2,
    };
    const awarded = await awardConquistaSubPs("Misión", sub, award);
    assert.equal(awarded, 0);
    assert.equal(calls, 0);
  });

  it("incluye id de fila situacional en la fuente (anti-dedupe)", async () => {
    const sources: string[] = [];
    const award = async (_a: number, source: string) => {
      sources.push(source);
      return true;
    };
    const n = await awardSituacionFilaPs("Misma fila", award, "st_abc");
    assert.equal(n, J4_SITUACION_FILA_PS);
    assert.match(sources[0], /\[st_abc\]/);
  });
});
