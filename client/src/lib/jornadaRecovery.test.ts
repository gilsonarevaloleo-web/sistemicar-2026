import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  runJornadaSoftRemount,
  runJornadaRecovery,
} from "./jornadaRecovery.ts";

const VEHICLES_KEY = "sistemicar_vehicles";
const PARKED_KEY = "sistemicar_parked_actives";
const PARKED_DURABLE = "sistemicar_parked_actives_durable";
const CRASH_KEY = "sistemicar_planeacion_crash_count";

function mockStorage() {
  const store = new Map<string, string>();
  const api = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: () => null,
    length: 0,
  } as Storage;
  return { store, api };
}

describe("jornadaRecovery soft remount", () => {
  const prevLocal = globalThis.localStorage;
  const prevSession = globalThis.sessionStorage;
  let localStore: Map<string, string>;
  let sessionStore: Map<string, string>;

  beforeEach(() => {
    const local = mockStorage();
    const session = mockStorage();
    localStore = local.store;
    sessionStore = session.store;
    globalThis.localStorage = local.api;
    globalThis.sessionStorage = session.api;
  });

  afterEach(() => {
    globalThis.localStorage = prevLocal;
    globalThis.sessionStorage = prevSession;
  });

  it("soft remount no archiva conquista ni ring, conserva park", () => {
    const vehicles = [
      {
        id: "conq1",
        status: "activo",
        tipoFlota: "tiempo",
        tipoReloj: "desglosador",
        aperturaAt: Date.now() - 3600_000,
        subVehiculos: [{ id: "s1", titulo: "A", status: "activo" }],
      },
      {
        id: "ring1",
        status: "activo",
        tipoFlota: "situacion",
        aperturaAt: Date.now() - 1800_000,
        situacionCronometro: { activo: true },
        subTareas: [
          {
            id: "st1",
            texto: "X",
            enDesgloseCronometro: true,
            resultadoSituacion: "pendiente",
          },
        ],
      },
    ];
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
    sessionStorage.setItem(PARKED_KEY, JSON.stringify(vehicles));
    localStorage.setItem(PARKED_DURABLE, JSON.stringify(vehicles));
    sessionStorage.setItem(CRASH_KEY, "5");

    runJornadaSoftRemount();

    const after = JSON.parse(localStorage.getItem(VEHICLES_KEY)!) as typeof vehicles;
    assert.equal(after.find(v => v.id === "conq1")?.status, "activo");
    assert.equal(after.find(v => v.id === "ring1")?.status, "activo");
    assert.ok(sessionStorage.getItem(PARKED_KEY), "park de sesión intacto");
    assert.ok(localStorage.getItem(PARKED_DURABLE), "park durable intacto");
    assert.equal(sessionStorage.getItem(CRASH_KEY), null, "crash count limpio");
  });

  it("recovery con archive archiva ring pero no interrupción de conquista viva", () => {
    const vehicles = [
      {
        id: "conq1",
        status: "activo",
        tipoFlota: "tiempo",
        tipoReloj: "desglosador",
        aperturaAt: Date.now() - 3600_000,
        interrupcionActiva: true,
        subVehiculos: [{ id: "s1", titulo: "A", status: "nested_paused" }],
      },
      {
        id: "pause1",
        status: "activo",
        tipoFlota: "situacion",
        vehiculoPadreDesglosadorId: "conq1",
        aperturaAt: Date.now() - 600_000,
      },
      {
        id: "ring1",
        status: "activo",
        tipoFlota: "situacion",
        aperturaAt: Date.now() - 1800_000,
        situacionCronometro: { activo: true },
      },
    ];
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));

    runJornadaRecovery({ archiveSituacion: true });

    const after = JSON.parse(localStorage.getItem(VEHICLES_KEY)!) as Array<{
      id: string;
      status: string;
    }>;
    assert.equal(after.find(v => v.id === "conq1")?.status, "activo");
    assert.equal(
      after.find(v => v.id === "pause1")?.status,
      "activo",
      "pausa anidada de conquista viva no se archiva"
    );
    assert.equal(after.find(v => v.id === "ring1")?.status, "archivado");
  });
});
