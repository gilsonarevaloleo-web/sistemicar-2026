import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import {
  buildDefaultClaridadDireccion,
  countSegmentosListosParaSellar,
  refreshClaridadPaso1,
  resolveClaridadParaSegmentoVinculado,
} from "./segmentoPeldanoBridge.ts";
import type { SegmentoV5 } from "./persistence.ts";

describe("segmentoPeldanoBridge", () => {
  before(() => {
    if (typeof globalThis.localStorage !== "undefined") return;
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
  });

  it("resolveClaridadParaSegmentoVinculado no lanza ReferenceError (import getPeldanosByProyecto)", async () => {
    // Regresión: tras el refactor a claridadDireccion faltaba el import y
    // cargar rutinas con proyectoVinculadoId fallaba con "No se pudo cargar la rutina".
    await assert.doesNotReject(() =>
      resolveClaridadParaSegmentoVinculado("user_test", "proy_inexistente", "Bloque AM")
    );
  });

  it("buildDefaultClaridadDireccion crea A/B/C con 3 pasos de claridad", () => {
    const r = buildDefaultClaridadDireccion({
      tituloProyecto: "Costura",
      etiqueta: "centro",
      segmentoNombre: "Costura AM",
    });
    assert.equal(r.rutaActiva, "a");
    assert.equal(r.rutas.a.pasos.length, 3);
    assert.match(r.rutas.a.pasos[0].titulo, /Costura AM|debo cumplir/i);
    assert.equal(r.rutas.b.perfil, "media");
    assert.equal(r.rutas.c.perfil, "profunda");
  });

  it("refreshClaridadPaso1 actualiza paso 1", () => {
    const base = buildDefaultClaridadDireccion({
      tituloProyecto: "P",
      etiqueta: "proyecto",
      segmentoNombre: "A",
    });
    const next = refreshClaridadPaso1(base, "Bloque PM", "Oleada", "proyecto");
    assert.match(next.rutas.a.pasos[0].titulo, /Bloque PM|Oleada/i);
    assert.equal(next.rutas.a.pasos[1].titulo, base.rutas.a.pasos[1].titulo);
  });

  it("countSegmentosListosParaSellar cuenta cerrados manual con peldaño", () => {
    const segs: SegmentoV5[] = [
      {
        id: "s1",
        nombre: "AM",
        horaInicio: "08:00",
        horaFin: "12:00",
        color: "#fff",
        icono: "sun",
        estado: "cerrado_manual",
        eventos: [],
        psGanados: 0,
        proyectoVinculadoId: "p1",
        proyectoPeldanoId: "pel1",
      },
      {
        id: "s2",
        nombre: "PM",
        horaInicio: "14:00",
        horaFin: "18:00",
        color: "#fff",
        icono: "moon",
        estado: "entropia",
        eventos: [],
        psGanados: 0,
        proyectoVinculadoId: "p1",
        proyectoPeldanoId: "pel2",
      },
    ];
    assert.equal(countSegmentosListosParaSellar(segs), 1);
  });
});
