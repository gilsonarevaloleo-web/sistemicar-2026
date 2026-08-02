import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  awardConquistaSubPs,
  awardSituacionFilaPs,
  awardSituacionFilaAvancePs,
  awardSituacionBlockPs,
  DESGLOSADOR_SUB_CUMPLIDO_PS,
  J4_SITUACION_FILA_PS,
  J4_SITUACION_AVANCE_PS,
  vehicleMissionClosePS,
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

  it("fila situacional vale 2 PS (igual que sub desglosador), no 4 ni 5", async () => {
    const calls: Array<{ amount: number; source: string }> = [];
    const awarded = await awardSituacionFilaPs("Decisión A", async (amount, source) => {
      calls.push({ amount, source });
      return true;
    }, "st_99");

    assert.equal(J4_SITUACION_FILA_PS, DESGLOSADOR_SUB_CUMPLIDO_PS);
    assert.equal(J4_SITUACION_FILA_PS, 2);
    assert.equal(awarded, 2);
    assert.equal(calls[0]!.source, "J4 situacional · Decisión A [st_99]");
  });

  it("otorga 1 PS por avance (menor que cumplido)", async () => {
    const calls: Array<{ amount: number; source: string }> = [];
    const awarded = await awardSituacionFilaAvancePs("Tarea iniciada", async (amount, source) => {
      calls.push({ amount, source });
      return true;
    }, "st_av1");

    assert.equal(awarded, J4_SITUACION_AVANCE_PS);
    assert.equal(awarded, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.source, "J4 avance · Tarea iniciada [st_av1]");
  });

  it("J4_SITUACION_AVANCE_PS es menor que J4_SITUACION_FILA_PS", () => {
    assert.ok(J4_SITUACION_AVANCE_PS < J4_SITUACION_FILA_PS);
  });

  it("cierre ring/lista desglose = 2 PS, no express situación (+5)", async () => {
    const calls: Array<{ amount: number; source: string }> = [];
    const awarded = await awardSituacionBlockPs("Ring mañana", "cumplido", async (amount, source) => {
      calls.push({ amount, source });
      return true;
    });

    assert.equal(awarded, 2);
    assert.notEqual(awarded, vehicleMissionClosePS("cumplido", "situacion"));
    assert.equal(vehicleMissionClosePS("cumplido", "situacion"), 5);
    assert.equal(calls[0]!.source, "J4 cierre ring · Ring mañana");
  });

  it("cierre ring archivado = 1 PS (base), no express arch 2", async () => {
    const awarded = await awardSituacionBlockPs("Lista vacía", "archivado", async () => true);
    assert.equal(awarded, 1);
    assert.equal(vehicleMissionClosePS("archivado", "situacion"), 2);
  });
});
