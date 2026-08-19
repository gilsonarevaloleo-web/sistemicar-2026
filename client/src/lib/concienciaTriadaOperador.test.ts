import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  accumulateActiveTriadaMinutos,
  accumulateClosedTriadaMinutos,
  allocateTriadaAgainstPlan,
  buildConcienciaTriadaModel,
  registrarCierreConcienciaTriada,
  resolveDuracionMinCierre,
  resolveTriadaClosedMinutos,
  sumMinutosPlanDelDia,
  upsertTriadaDaySnapshot,
  readTriadaSeriesLocal,
  buildTriadaInputSig,
  hasTriadaActiveVehicle,
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

  it("sin plan no inventa medida", () => {
    const m = buildConcienciaTriadaModel({
      minutosPlan: 0,
      minutosPresenciaCerrados: 5,
      minutosDireccionCerrados: 5,
    });
    assert.equal(m.hasPlanificacion, false);
    assert.equal(m.pctPresencia, 0);
    assert.equal(m.pctInconsciente, 0);
  });

  it("100% es el plan: 70 inconsciente, 20 presencia, 10 dirección", () => {
    const m = buildConcienciaTriadaModel({
      minutosPlan: 100,
      minutosPresenciaCerrados: 20,
      minutosDireccionCerrados: 10,
    });
    assert.equal(m.minutosPlan, 100);
    assert.equal(m.pctInconsciente, 70);
    assert.equal(m.pctPresencia, 20);
    assert.equal(m.pctDireccion, 10);
    assert.equal(m.pctInconsciente + m.pctPresencia + m.pctDireccion, 100);
    assert.equal(m.etapaDominante, "inconsciente");
  });

  it("sin vehículo abierto no vuelve a 100% inconsciente si ya hubo cierres", () => {
    const m = buildConcienciaTriadaModel({
      minutosPlan: 200,
      minutosPresenciaCerrados: 40,
      minutosDireccionCerrados: 20,
      minutosPresenciaActivos: 0,
      minutosDireccionActivos: 0,
    });
    assert.equal(m.pctPresencia, 20);
    assert.equal(m.pctDireccion, 10);
    assert.equal(m.pctInconsciente, 70);
    assert.equal(m.minutosInconsciente, 140);
  });

  it("plan sin convertir es 100% inconsciente del plan, no del pulso", () => {
    const m = buildConcienciaTriadaModel({
      minutosPlan: 240,
      minutosPresenciaCerrados: 0,
      minutosDireccionCerrados: 0,
    });
    assert.equal(m.pctInconsciente, 100);
    assert.equal(m.minutosInconsciente, 240);
    assert.equal(m.minutosPlan, 240);
    assert.match(m.headline, /del plan/);
  });

  it("exceso de cobertura conserva dirección y recorta presencia", () => {
    const a = allocateTriadaAgainstPlan({
      minutosPlan: 60,
      minutosPresencia: 50,
      minutosDireccion: 40,
    });
    assert.equal(a.minutosDireccion, 40);
    assert.equal(a.minutosPresencia, 20);
    assert.equal(a.minutosInconsciente, 0);

    const m = buildConcienciaTriadaModel({
      minutosPlan: 60,
      minutosPresenciaCerrados: 80,
      minutosDireccionCerrados: 80,
    });
    assert.equal(m.pctDireccion, 100);
    assert.equal(m.pctPresencia, 0);
    assert.equal(m.pctInconsciente, 0);
  });

  it("suma minutos únicos del plan", () => {
    assert.equal(
      sumMinutosPlanDelDia([
        { horaInicio: "09:00", horaFin: "12:00" },
        { horaInicio: "14:00", horaFin: "16:00" },
      ]),
      300
    );
    assert.equal(
      sumMinutosPlanDelDia([
        { horaInicio: "09:00", horaFin: "12:00" },
        { horaInicio: "11:00", horaFin: "13:00" },
      ]),
      240
    );
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

  it("cierres del día se leen de vehículos aunque el ledger esté vacío", () => {
    const cierreAt = Date.parse("2026-08-19T15:00:00-05:00");
    const vehicles = [
      {
        id: "cerrado-dir",
        status: "cumplido",
        destinoCierre: "peldano",
        aperturaAt: cierreAt - 30 * 60_000,
        cierreAt,
        duracionFinal: 30,
      },
      {
        id: "cerrado-pre",
        status: "cumplido",
        destinoCierre: "presencia",
        aperturaAt: cierreAt - 10 * 60_000,
        cierreAt,
        duracionFinal: 10,
      },
    ] as unknown as Vehicle[];
    const closed = accumulateClosedTriadaMinutos(vehicles, "2026-08-19");
    assert.equal(closed.minutosDireccion, 30);
    assert.equal(closed.minutosPresencia, 10);

    const merged = resolveTriadaClosedMinutos(null, vehicles, "2026-08-19");
    assert.equal(merged.minutosDireccion, 30);
    assert.equal(merged.minutosPresencia, 10);

    const ledger = registrarCierreConcienciaTriada("u1", {
      vehicleId: "cerrado-dir",
      minutos: 30,
      destino: "peldano",
      fecha: "2026-08-19",
    });
    const noDouble = resolveTriadaClosedMinutos(ledger, vehicles, "2026-08-19");
    assert.equal(noDouble.minutosDireccion, 30);
    assert.equal(noDouble.minutosPresencia, 10);
  });

  it("serie diaria upsert guarda % sobre el plan", () => {
    const model = buildConcienciaTriadaModel({
      fecha: "2026-08-14",
      minutosPlan: 100,
      minutosPresenciaCerrados: 20,
      minutosDireccionCerrados: 70,
    });
    const series = upsertTriadaDaySnapshot("u1", model);
    assert.equal(series.length, 1);
    assert.equal(series[0]?.pctDireccion, 70);
    assert.equal(series[0]?.pctPresencia, 20);
    assert.equal(series[0]?.pctInconsciente, 10);
    assert.equal(series[0]?.minutosPlan, 100);
    assert.equal(readTriadaSeriesLocal("u1").length, 1);
  });

  it("firma idle es barata y estable", () => {
    const segs = [{ horaInicio: "09:00", horaFin: "12:00" }];
    const vehicles = [
      { id: "a", status: "activo", destinoCierre: "peldano", aperturaAt: 1_000 } as Vehicle,
      { id: "b", status: "cumplido", destinoCierre: "presencia", duracionFinal: 20 } as Vehicle,
    ];
    const a = buildTriadaInputSig(segs, vehicles);
    const b = buildTriadaInputSig(segs, vehicles);
    assert.equal(a, b);
    assert.equal(hasTriadaActiveVehicle(vehicles), true);
    assert.equal(
      hasTriadaActiveVehicle([{ id: "x", status: "cumplido" } as Vehicle]),
      false
    );
  });
});
