import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeBovedaRecordsFromHistory } from "./bovedaRecords.ts";
import type { VehicleHistoryEntry } from "./persistence";

function entry(
  titulo: string,
  minPerUnit: number,
  fecha: number
): VehicleHistoryEntry {
  return {
    titulo,
    minPerUnit,
    totalMin: minPerUnit * 10,
    tipoReloj: "desglosador",
    fecha,
  };
}

describe("computeBovedaRecordsFromHistory", () => {
  it("agrupa por medida (unidad), no por prefijo de misión", () => {
    const records = computeBovedaRecordsFromHistory([
      entry("Retoque de operaciones → Veis", 1.4, 1_000),
      entry("Últimas → Veis", 1.3, 2_000),
      entry("Retoque de operaciones → Pespunte", 2.3, 3_000),
    ]);

    const veis = records.find(r => r.titulo === "Veis");
    assert.ok(veis, "debe existir un solo récord Veis");
    assert.equal(veis.count, 2);
    assert.equal(veis.bestMinPerUnit, 1.3);
    assert.equal(veis.firstMinPerUnit, 1.4);

    const pespunte = records.find(r => r.titulo === "Pespunte");
    assert.ok(pespunte);
    assert.equal(pespunte.count, 1);
    assert.equal(records.length, 2);
  });
});
