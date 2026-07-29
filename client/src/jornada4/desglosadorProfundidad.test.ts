import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  desglosadorProfundidadGanadaPs,
  desglosadorProfundidadLabel,
  desglosadorProfundidadPotencialPs,
  DESGLOSADOR_PROFUNDIDAD_PS_POR_SUB,
} from "./desglosadorProfundidad.ts";
import type { SubVehiculo } from "../lib/persistence.ts";

describe("desglosadorProfundidad", () => {
  it("cada sub vale 2 PS", () => {
    assert.equal(DESGLOSADOR_PROFUNDIDAD_PS_POR_SUB, 2);
    assert.equal(desglosadorProfundidadPotencialPs(1), 2);
    assert.equal(desglosadorProfundidadPotencialPs(10), 20);
    assert.equal(desglosadorProfundidadPotencialPs(0), 0);
  });

  it("ganada cuenta solo cumplidos", () => {
    const subs = [
      { id: "a", status: "cumplido" },
      { id: "b", status: "activo" },
      { id: "c", status: "cumplido" },
      { id: "d", status: "fallado" },
    ] as SubVehiculo[];
    assert.equal(desglosadorProfundidadGanadaPs(subs), 4);
  });

  it("label legible", () => {
    assert.match(desglosadorProfundidadLabel(10), /20 PS/);
    assert.match(desglosadorProfundidadLabel(1), /1 sub × 2/);
  });
});
