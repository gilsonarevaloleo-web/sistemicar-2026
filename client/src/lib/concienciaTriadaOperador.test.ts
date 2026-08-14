import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  accumulateActiveTriadaMinutos,
  buildConcienciaTriadaModel,
  registrarCierreConcienciaTriada,
  resolveDuracionMinCierre,
  upsertTriadaDaySnapshot,
  readTriadaSeriesLocal,
} from "./concienciaTriadaOperador.ts";
import type { Vehicle } from "./persistence.ts";

function installLocalStorage() {
  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage.clear();
    return;
  }
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe("concienciaTriadaOperador", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("sin planificación no inventa medida", () => {
    const m = buildConcienciaTriadaModel({
      hasPlanificacion: false,
      minutosInconsciente: 10,
      minutosPresenciaCerrados: 5,
      minutosDireccionCerrados: 5,
    });
    assert.equal(m.hasPlanificacion, false);
    assert.equal(m.pctPresencia, 0);
  });

  it("100% reparte inconsciente + presencia + dirección", () => {
    const m = buildConcienciaTriadaModel({
      hasPlanificacion: true,
      minutosInconsciente: 20,
      minutosPresenciaCerrados: 30,
      minutosDireccionCerrados: 50,
    });
    assert.equal(m.pctInconsciente + m.pctPresencia + m.pctDireccion, 100);
    assert.equal(m.etapaDominante, "direccion");
    assert.equal(m.pctDireccion, 50);
  });

  it("ledger presencia vs dirección e idempotencia", () => {
    const a = registrarCierreConcienciaTriada("u1", {
      vehicleId: "v1",
      minutos: 15,
      destino: "presencia",
      fecha: "2026-08-14",
    });
    assert.equal(a?.minutosPresencia, 15);
    assert.equal(a?.minutosDireccion, 0);

    const again = registrarCierreConcienciaTriada("u1", {
      vehicleId: "v1",
      minutos: 15,
      destino: "presencia",
      fecha: "2026-08-14",
    });
    assert.equal(again?.minutosPresencia, 15);

    const b = registrarCierreConcienciaTriada("u1", {
      vehicleId: "v2",
      minutos: 25,
      destino: "peldano",
      fecha: "2026-08-14",
    });
    assert.equal(b?.minutosPresencia, 15);
    assert.equal(b?.minutosDireccion, 25);
  });

  it("resolveDuracionMinCierre usa pared", () => {
    assert.equal(
      resolveDuracionMinCierre({
        aperturaAt: 1_000_000,
        cierreAt: 1_000_000 + 12 * 60_000,
      }),
      12
    );
  });

  it("activos clasifican por destino", () => {
    const now = 1_000_000 + 10 * 60_000;
    const vehicles = [
      {
        id: "a",
        status: "activo",
        aperturaAt: 1_000_000,
        destinoCierre: "presencia",
      },
      {
        id: "b",
        status: "activo",
        aperturaAt: 1_000_000,
        destinoCierre: "peldano",
        autoVerdad: false,
      },
      {
        id: "c",
        status: "activo",
        aperturaAt: 1_000_000,
        autoVerdad: true,
      },
    ] as unknown as Vehicle[];
    const acc = accumulateActiveTriadaMinutos(vehicles, now);
    assert.equal(acc.minutosPresencia, 10);
    assert.equal(acc.minutosDireccion, 10);
  });

  it("serie diaria upsert", () => {
    const model = buildConcienciaTriadaModel({
      fecha: "2026-08-14",
      hasPlanificacion: true,
      minutosInconsciente: 10,
      minutosPresenciaCerrados: 20,
      minutosDireccionCerrados: 70,
    });
    const series = upsertTriadaDaySnapshot("u1", model);
    assert.equal(series.length, 1);
    assert.equal(series[0]?.pctDireccion, 70);
    assert.equal(readTriadaSeriesLocal("u1").length, 1);
  });
});
