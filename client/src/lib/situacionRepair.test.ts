import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  repairStuckSituacionVehicles,
  forceArchiveSituacionActivos,
} from "./situacionRepair.ts";

const KEY = "sistemicar_vehicles";

describe("situacionRepair", () => {
  const prev = globalThis.localStorage;

  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => { store.clear(); },
      key: () => null,
      length: 0,
    } as Storage;
  });

  afterEach(() => {
    globalThis.localStorage = prev;
  });

  it("repair desactiva cronómetro cuando todas las filas están cerradas", () => {
    localStorage.setItem(KEY, JSON.stringify([{
      id: "v1",
      status: "activo",
      tipoFlota: "situacion",
      situacionCronometro: { activo: true, retoNumero: 1 },
      subTareas: [{
        id: "st1",
        texto: "A",
        completada: false,
        enDesgloseCronometro: true,
        resultadoSituacion: "fallado",
      }],
    }]));
    assert.equal(repairStuckSituacionVehicles(), 1);
    const v = JSON.parse(localStorage.getItem(KEY)!)[0];
    assert.equal(v.situacionCronometro.activo, false);
  });

  it("forceArchive archiva situación activa", () => {
    localStorage.setItem(KEY, JSON.stringify([{
      id: "v1",
      status: "activo",
      tipoFlota: "situacion",
      aperturaAt: Date.now() - 60000,
    }]));
    assert.equal(forceArchiveSituacionActivos(), 1);
    const v = JSON.parse(localStorage.getItem(KEY)!)[0];
    assert.equal(v.status, "archivado");
    assert.equal(v.situacionCronometro, null);
  });

  it("forceArchive no corta interrupción de conquista aún activa", () => {
    localStorage.setItem(KEY, JSON.stringify([
      {
        id: "conq",
        status: "activo",
        tipoFlota: "tiempo",
        tipoReloj: "desglosador",
        aperturaAt: Date.now() - 120000,
      },
      {
        id: "pause",
        status: "activo",
        tipoFlota: "situacion",
        vehiculoPadreDesglosadorId: "conq",
        aperturaAt: Date.now() - 60000,
      },
      {
        id: "ring",
        status: "activo",
        tipoFlota: "situacion",
        aperturaAt: Date.now() - 60000,
      },
    ]));
    assert.equal(forceArchiveSituacionActivos(), 1);
    const list = JSON.parse(localStorage.getItem(KEY)!);
    assert.equal(list.find((x: { id: string }) => x.id === "pause").status, "activo");
    assert.equal(list.find((x: { id: string }) => x.id === "ring").status, "archivado");
    assert.equal(list.find((x: { id: string }) => x.id === "conq").status, "activo");
  });
});
