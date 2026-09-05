import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cerrarRecintoOperador,
  contarRecintos,
  crearRecinto,
  horaSalidaPorDefecto,
  tickRecinto,
} from "./motor.ts";

const entra = 1_000_000;
const sale = horaSalidaPorDefecto(entra, 60);

function recinto() {
  return crearRecinto({
    id: "r1",
    texto: "El feed",
    fecha: "2026-09-05",
    entraAt: entra,
    saleAt: sale,
  });
}

describe("recinto mínimo", () => {
  it("entra como dentro y solo el operador lo saca", () => {
    const r = recinto();
    assert.equal(r.estado, "dentro");
    const cerrado = cerrarRecintoOperador(r, entra + 10_000);
    assert.equal(cerrado.estado, "salio");
    assert.equal(cerrado.cerradoPor, "operador");
  });

  it("si pasa la hora y nadie saca, el sistema hereda — no firma salida", () => {
    const r = recinto();
    const t = tickRecinto(r, sale + 1);
    assert.equal(t.estado, "heredado");
    assert.equal(t.cerradoPor, "sistema");
    assert.notEqual(t.estado, "salio");
  });

  it("antes de la hora el tick no toca", () => {
    const r = recinto();
    assert.equal(tickRecinto(r, sale - 1), r);
  });

  it("cuenta abiertos, salidos y heredados del día", () => {
    const a = recinto();
    const b = { ...recinto(), id: "r2", estado: "salio" as const, cerradoPor: "operador" as const };
    const c = {
      ...recinto(),
      id: "r3",
      estado: "heredado" as const,
      cerradoPor: "sistema" as const,
    };
    const n = contarRecintos([a, b, c], "2026-09-05");
    assert.deepEqual(n, { abiertos: 1, cerrados: 1, heredados: 1 });
  });

  it("rechaza texto vacío y salida anterior a la entrada", () => {
    assert.throws(() =>
      crearRecinto({ id: "x", texto: "  ", fecha: "2026-09-05", entraAt: 1, saleAt: 2 }),
    );
    assert.throws(() =>
      crearRecinto({ id: "x", texto: "ok", fecha: "2026-09-05", entraAt: 10, saleAt: 5 }),
    );
  });
});
