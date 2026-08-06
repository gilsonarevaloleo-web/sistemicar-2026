import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  measureKeyFromHistoryTitulo,
  measureTituloFromHistoryTitulo,
} from "./vehicleHistoryMeasure.ts";

describe("vehicleHistoryMeasure", () => {
  it("usa la unidad tras → como medida (ignora prefijo de misión)", () => {
    assert.equal(
      measureTituloFromHistoryTitulo("Retoque de operaciones → Veis"),
      "Veis"
    );
    assert.equal(measureTituloFromHistoryTitulo("Últimas → Veis"), "Veis");
    assert.equal(
      measureTituloFromHistoryTitulo("Últimas → Cerrado remalle lateral"),
      "Cerrado remalle lateral"
    );
    assert.equal(measureTituloFromHistoryTitulo("Armado solo"), "Armado solo");
    assert.equal(
      measureTituloFromHistoryTitulo("Misión → Día 2 [tarde]: Veis"),
      "Veis"
    );
    assert.equal(
      measureKeyFromHistoryTitulo("Retoque de operaciones → Veis"),
      measureKeyFromHistoryTitulo("Últimas → Veis")
    );
  });
});
