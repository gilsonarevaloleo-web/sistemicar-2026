import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { LibroGimnasio } from "../../../../../shared/casas/gimnasio6/types.ts";
import { recursosVacios } from "../../../../../shared/casas/gimnasio6/motor.ts";
import {
  fusionarLibrosGimnasioLocal,
  guardarLibroGimnasioLocal,
  libroAbiertoLocal,
  listarLibrosGimnasioLocal,
} from "./librosLocal.ts";

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

function libro(over: Partial<LibroGimnasio> = {}): LibroGimnasio {
  return {
    id: "lib-1",
    userId: "u1",
    sesionUmbral5Id: "s1",
    modulo: "social_producto",
    limiteOrigen: "No puedo vender.",
    recursos: recursosVacios(),
    puntero: { capitulo: 1, subcodigo: 1, indice: 1, variante: 0 },
    estado: "ABIERTO",
    capituloSelladoDia: null,
    capitulosSellados: [],
    turnos: [],
    createdAt: "2026-11-08T00:00:00.000Z",
    updatedAt: "2026-11-08T00:00:00.000Z",
    ...over,
  };
}

describe("Gimnasio 6 — caché local de libros", () => {
  beforeEach(() => {
    store.clear();
  });

  it("guarda el libro abierto y lo recupera", () => {
    guardarLibroGimnasioLocal(libro());
    const abierto = libroAbiertoLocal("u1");
    assert.equal(abierto?.id, "lib-1");
    assert.equal(listarLibrosGimnasioLocal("u2").length, 0);
  });

  it("fusiona remoto sin borrar un turno más nuevo en local", () => {
    guardarLibroGimnasioLocal(
      libro({ updatedAt: "2026-11-08T02:00:00.000Z", puntero: { capitulo: 1, subcodigo: 1, indice: 2, variante: 0 } }),
    );
    const merged = fusionarLibrosGimnasioLocal("u1", [
      libro({ updatedAt: "2026-11-08T01:00:00.000Z", puntero: { capitulo: 1, subcodigo: 1, indice: 1, variante: 0 } }),
    ]);
    assert.equal(merged[0]?.puntero.indice, 2);
  });
});
