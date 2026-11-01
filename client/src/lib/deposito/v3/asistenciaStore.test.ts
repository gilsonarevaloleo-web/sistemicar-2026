import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  DEPOSITO_V2_STORAGE_KEY_FORBIDDEN,
  DEPOSITO_V3_STORAGE_KEY,
} from "./volcados.ts";
import {
  DEPOSITO_ASISTENCIA_STORAGE_KEY,
  cumplirSesionHoy,
  elegirIntencionHoy,
  hidratarAsistenciaDesdeVolcados,
  leerLibroAsistencia,
} from "./asistenciaStore.ts";

function installStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: ls,
    configurable: true,
  });
  return store;
}

describe("Depósito — store de asistencia", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installStorage();
  });

  it("guarda por usuario sin tocar volcados V2/V3", () => {
    store.set(DEPOSITO_V2_STORAGE_KEY_FORBIDDEN, "keep-v2");
    store.set(DEPOSITO_V3_STORAGE_KEY, "keep-v3");
    elegirIntencionHoy("ana", "2026-11-01", "si", "10:32");
    cumplirSesionHoy("ana", "2026-11-01", "11:00");
    elegirIntencionHoy("luis", "2026-11-01", "no", "09:00");
    const ana = leerLibroAsistencia("ana");
    const luis = leerLibroAsistencia("luis");
    assert.equal(ana.registros["2026-11-01"].intencion, "si");
    assert.equal(ana.registros["2026-11-01"].sesionCumplida, true);
    assert.equal(luis.registros["2026-11-01"].intencion, "no");
    assert.equal(luis.registros["2026-11-01"].sesionCumplida, false);
    assert.equal(store.get(DEPOSITO_V2_STORAGE_KEY_FORBIDDEN), "keep-v2");
    assert.equal(store.get(DEPOSITO_V3_STORAGE_KEY), "keep-v3");
    assert.ok(store.get(DEPOSITO_ASISTENCIA_STORAGE_KEY));
  });

  it("hidrata días de volcado y no reabre la ventana de un día cumplido", () => {
    hidratarAsistenciaDesdeVolcados("u1", [Date.UTC(2026, 10, 1, 15, 32, 0)]);
    const libro = leerLibroAsistencia("u1");
    assert.equal(libro.registros["2026-11-01"].sesionCumplida, true);
  });
});
