import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { HistorialJuezItem } from "@shared/casas/codigo4";
import {
  JUEZ_DRAFT_COLLECTION,
  JUEZ_VOLCADOS_COLLECTION,
  JUEZ_VOLCADOS_STORAGE_KEY,
  itemDesdeAuditoria,
  listVolcadosJuezLocal,
  mergeHistorialJuez,
  persistFase2Juez,
  persistVolcadoJuez,
} from "./volcados.ts";

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

function item(partial: Partial<HistorialJuezItem> & { id: string; textoVolcado: string }): HistorialJuezItem {
  return {
    createdAt: partial.createdAt ?? "2026-11-02T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? partial.createdAt ?? "2026-11-02T00:00:00.000Z",
    fase1: partial.fase1 ?? {
      codigoProblemaDetectado: 4,
      codigoQueHabla: 4,
      codigoConquistadoMax: 3,
      participaciones: [{ codigo: 4, fuerza: "Desnudar" }],
      codigoQueCerroTeorico: null,
      fuerzaUsada: null,
      fuerzaDebida: 3,
      cascadaCumple: false,
      desajusteFuerza: "Habla C4.",
      fugaInconsciente: "La vía de agua es la coartada.",
      lecturaPerimetroFria: "El problema habita en C4.",
    },
    fase2Desbloqueada: partial.fase2Desbloqueada ?? false,
    directivaOperacional: partial.directivaOperacional ?? null,
    confrontacionDeFuerza: partial.confrontacionDeFuerza ?? null,
    ...partial,
  };
}

describe("Juez Serio — persistencia durable", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installStorage();
  });

  it("usa colección propia, no la del Depósito", () => {
    assert.equal(JUEZ_VOLCADOS_STORAGE_KEY, "sistemicar_juez_volcados");
    assert.equal(JUEZ_VOLCADOS_COLLECTION, "juez_volcados");
    assert.equal(JUEZ_DRAFT_COLLECTION, "juez_draft");
    assert.notEqual(JUEZ_VOLCADOS_STORAGE_KEY, "sistemicar_volcados_v3");
  });

  it("guarda el volcado auditado en local aunque el API no responda", async () => {
    const guardado = itemDesdeAuditoria({
      id: "ses-1",
      createdAt: "2026-11-02T03:00:00.000Z",
      textoVolcado: "Hoy el pistón no paró.",
      fase1: item({ id: "ses-1", textoVolcado: "x" }).fase1,
    });
    await persistVolcadoJuez("u1", guardado);
    const listed = listVolcadosJuezLocal("u1");
    assert.equal(listed.length, 1);
    assert.equal(listed[0].textoVolcado, "Hoy el pistón no paró.");
    assert.equal(listed[0].id, "ses-1");
    assert.ok(store.get(JUEZ_VOLCADOS_STORAGE_KEY));
  });

  it("filtra por usuario y no pierde el volcado de otro", async () => {
    await persistVolcadoJuez("ana", item({ id: "a1", textoVolcado: "volcado de ana" }));
    await persistVolcadoJuez("luis", item({ id: "l1", textoVolcado: "volcado de luis" }));
    assert.equal(listVolcadosJuezLocal("ana").length, 1);
    assert.equal(listVolcadosJuezLocal("luis").length, 1);
    assert.equal(listVolcadosJuezLocal("ana")[0].textoVolcado, "volcado de ana");
  });

  it("el historial local sobrevive si el API vuelve vacío", async () => {
    await persistVolcadoJuez(
      "u1",
      item({ id: "s-local", textoVolcado: "el volcado de ayer", createdAt: "2026-11-01T12:00:00.000Z" }),
    );
    const merged = mergeHistorialJuez([], listVolcadosJuezLocal("u1"));
    assert.equal(merged.length, 1);
    assert.equal(merged[0].textoVolcado, "el volcado de ayer");
  });

  it("mezcla API + local sin duplicar y gana el más reciente", () => {
    const local = item({
      id: "s1",
      textoVolcado: "local",
      updatedAt: "2026-11-02T10:00:00.000Z",
      fase2Desbloqueada: true,
      confrontacionDeFuerza: "Interrumpí el pistón.",
      directivaOperacional: "Interrumpí el pistón.",
    });
    const api = item({
      id: "s1",
      textoVolcado: "api viejo",
      updatedAt: "2026-11-02T08:00:00.000Z",
    });
    const extra = item({
      id: "s2",
      textoVolcado: "solo api",
      createdAt: "2026-11-02T11:00:00.000Z",
    });
    const merged = mergeHistorialJuez([api, extra], [local]);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].id, "s2");
    assert.equal(merged[1].textoVolcado, "local");
    assert.equal(merged[1].fase2Desbloqueada, true);
  });

  it("actualizar Fase 2 no borra el volcado", async () => {
    await persistVolcadoJuez(
      "u1",
      item({ id: "s-fase", textoVolcado: "sigue en el lienzo" }),
    );
    const next = await persistFase2Juez("u1", "s-fase", {
      requiereInversionCreditos: true,
      confrontacionDeFuerza: "Interrumpí el pistón automático.",
      directivaOperacional: "Interrumpí el pistón automático.",
    });
    assert.ok(next);
    assert.equal(next?.textoVolcado, "sigue en el lienzo");
    assert.equal(next?.fase2Desbloqueada, true);
    assert.equal(listVolcadosJuezLocal("u1")[0].textoVolcado, "sigue en el lienzo");
  });
});
