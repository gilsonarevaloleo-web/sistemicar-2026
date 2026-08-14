import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import {
  addProyecto,
  acreditarMinutosSituacionEnProyecto,
  getProyectosLocal,
  peldanoSumaMinutosNorte,
} from "./proyectos.ts";
import type { SubTarea, Vehicle } from "./persistence.ts";

const USER = "user_situacion_minutos_test";

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

describe("acreditarMinutosSituacionEnProyecto", () => {
  before(() => {
    installLocalStorage();
    (globalThis as unknown as { window: { dispatchEvent: () => boolean } }).window = {
      dispatchEvent: () => true,
    };
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("clic de ring con dirección llena MIN NORTE y es idempotente", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    const vehicle = {
      id: "v_ring",
      proyectoId: p.id,
      destinoCierre: "peldano",
    } as Pick<Vehicle, "id" | "proyectoId" | "destinoCierre">;
    const sub = {
      id: "fila_1",
      duracionRealSec: 185,
    } as Pick<SubTarea, "id" | "proyectoId" | "duracionRealSec">;

    const first = acreditarMinutosSituacionEnProyecto(USER, {
      vehicle,
      sub,
      fuente: "ring-click",
      at: 1_000,
    });
    assert.equal(first?.segundosNorteSituacion, 185);
    assert.equal(first?.minutosTotales, 3);
    assert.equal(first?.primerNorteAt, 1_000);

    const again = acreditarMinutosSituacionEnProyecto(USER, {
      vehicle,
      sub,
      fuente: "ring-click",
      at: 2_000,
    });
    assert.equal(again?.segundosNorteSituacion, 185);
    assert.equal(again?.minutosTotales, 3);

    const secondRow = acreditarMinutosSituacionEnProyecto(USER, {
      vehicle,
      sub: { id: "fila_2", duracionRealSec: 40 },
      fuente: "ring-click",
    });
    assert.equal(secondRow?.segundosNorteSituacion, 225);
    assert.equal(secondRow?.minutosTotales, 4);
    assert.equal(getProyectosLocal(USER)[0]?.segundosNorteSituacion, 225);
  });

  it("lista libre no acredita segundos aunque tenga dirección", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    const updated = acreditarMinutosSituacionEnProyecto(USER, {
      vehicle: { id: "v_libre", proyectoId: p.id, destinoCierre: "peldano" },
      sub: { id: "fila_l", duracionRealSec: 999 },
      fuente: "lista-libre",
    });
    assert.equal(updated?.segundosNorteSituacion, undefined);
    assert.equal(updated?.segundosPresenciaRing, 0);
    assert.equal(updated?.minutosTotales, 0);
  });

  it("ring con destino presencia va a segundosPresenciaRing", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    const updated = acreditarMinutosSituacionEnProyecto(USER, {
      vehicle: { id: "v_pre", proyectoId: p.id, destinoCierre: "presencia" },
      sub: { id: "fila_p", duracionRealSec: 90 },
      fuente: "ring-click",
    });
    assert.equal(updated?.segundosPresenciaRing, 90);
    assert.equal(updated?.segundosNorteSituacion, undefined);
    assert.equal(updated?.minutosTotales, 0);
  });

  it("peldano situacional no alimenta MIN NORTE", () => {
    assert.equal(
      peldanoSumaMinutosNorte({ estado: "conquistado", tipoOrigen: "situacion" }),
      false
    );
    assert.equal(
      peldanoSumaMinutosNorte({ estado: "conquistado", tipoOrigen: "tiempo" }),
      true
    );
    assert.equal(peldanoSumaMinutosNorte({ estado: "conquistado" }), true);
    assert.equal(peldanoSumaMinutosNorte({ estado: "idea", tipoOrigen: "tiempo" }), false);
  });
});
