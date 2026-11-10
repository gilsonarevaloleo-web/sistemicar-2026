import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { SesionUmbral5 } from "../../../../../shared/casas/umbral5/sesion.ts";
import {
  UMBRAL5_DRAFT_KEY,
  UMBRAL5_SESIONES_KEY,
  fusionarSesionesUmbral5Local,
  guardarBorradorUmbral5,
  guardarSesionUmbral5Local,
  leerBorradorUmbral5,
  limpiarBorradorUmbral5,
  listarSesionesUmbral5Local,
} from "./sesionesLocal.ts";

const store = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  },
});

function sesion(
  id: string,
  userId: string,
  texto: string,
  createdAt: string,
  updatedAt = createdAt,
): SesionUmbral5 {
  return {
    id,
    userId,
    textoVolcado: texto,
    lectura: null,
    source: null,
    estado: "VOLCADO_GRATIS",
    createdAt,
    updatedAt,
  };
}

describe("Casa 6 — caché local de volcados", () => {
  beforeEach(() => {
    store.clear();
  });

  it("guarda y lista solo los del usuario", () => {
    guardarSesionUmbral5Local(sesion("a", "u1", "límite uno", "2026-01-02T00:00:00.000Z"));
    guardarSesionUmbral5Local(sesion("b", "u2", "ajeno", "2026-01-03T00:00:00.000Z"));
    const lista = listarSesionesUmbral5Local("u1");
    assert.equal(lista.length, 1);
    assert.equal(lista[0]?.textoVolcado, "límite uno");
    assert.ok(store.get(UMBRAL5_SESIONES_KEY));
  });

  it("fusiona remoto encima y ordena por createdAt", () => {
    guardarSesionUmbral5Local(sesion("a", "u1", "viejo", "2026-01-01T00:00:00.000Z"));
    const merged = fusionarSesionesUmbral5Local("u1", [
      sesion("a", "u1", "nuevo", "2026-01-01T00:00:00.000Z", "2026-01-04T00:00:00.000Z"),
      sesion("c", "u1", "otro", "2026-01-03T00:00:00.000Z"),
    ]);
    assert.equal(merged[0]?.id, "c");
    assert.equal(merged[1]?.id, "a");
    assert.equal(merged[1]?.textoVolcado, "nuevo");
  });

  it("pagar el mapa no mueve el volcado de su orden de sellado", () => {
    guardarSesionUmbral5Local(sesion("a", "u1", "primero", "2026-01-01T00:00:00.000Z"));
    guardarSesionUmbral5Local(sesion("b", "u1", "segundo", "2026-01-02T00:00:00.000Z"));
    const conMapa = sesion(
      "a",
      "u1",
      "primero",
      "2026-01-01T00:00:00.000Z",
      "2026-01-05T00:00:00.000Z",
    );
    conMapa.estado = "MAPA_PAGO";
    guardarSesionUmbral5Local(conMapa);
    const lista = listarSesionesUmbral5Local("u1");
    assert.equal(lista[0]?.id, "b");
    assert.equal(lista[1]?.id, "a");
    assert.equal(lista[1]?.estado, "MAPA_PAGO");
  });

  it("persiste el borrador del lienzo", () => {
    guardarBorradorUmbral5("El Juez dijo el borde. No hice nada.");
    assert.equal(leerBorradorUmbral5(), "El Juez dijo el borde. No hice nada.");
    assert.ok(store.get(UMBRAL5_DRAFT_KEY));
  });

  it("limpia el borrador como Depósito", () => {
    guardarBorradorUmbral5("texto sucio");
    limpiarBorradorUmbral5();
    assert.equal(leerBorradorUmbral5(), "");
    assert.equal(store.get(UMBRAL5_DRAFT_KEY), undefined);
  });
});
