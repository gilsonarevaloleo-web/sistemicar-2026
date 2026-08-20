import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import {
  addOleadaPunto,
  addPeldanoIdea,
  addProyecto,
  getPeldanosByProyectoLocal,
  getProyectosLocal,
  reorderOleadaPunto,
  reorderPeldano,
  reorderProyecto,
} from "./proyectos.ts";

const USER = "user_reorder_proyecto_test";

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

describe("reorder dirección Hub", () => {
  before(() => {
    installLocalStorage();
    (globalThis as unknown as { window: { dispatchEvent: () => boolean } }).window = {
      dispatchEvent: () => true,
    };
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("reorderProyecto sube y baja al instante en local", async () => {
    const a = await addProyecto(USER, { titulo: "Alfa", etiqueta: "proyecto" });
    const b = await addProyecto(USER, { titulo: "Beta", etiqueta: "proyecto" });
    // addProyecto inserta al frente: Beta, Alfa
    assert.deepEqual(
      getProyectosLocal(USER).map(p => p.id),
      [b.id, a.id]
    );

    const afterDown = await reorderProyecto(USER, b.id, "down");
    assert.deepEqual(
      afterDown.map(p => p.id),
      [a.id, b.id]
    );
    assert.deepEqual(
      getProyectosLocal(USER).map(p => p.id),
      [a.id, b.id]
    );

    const afterUp = await reorderProyecto(USER, b.id, "up");
    assert.deepEqual(
      afterUp.map(p => p.id),
      [b.id, a.id]
    );
  });

  it("reorderProyecto escribe local antes de resolver el promise (la UI no espera red)", async () => {
    const a = await addProyecto(USER, { titulo: "Alfa", etiqueta: "proyecto" });
    const b = await addProyecto(USER, { titulo: "Beta", etiqueta: "proyecto" });
    const pending = reorderProyecto(USER, b.id, "down");
    assert.deepEqual(
      getProyectosLocal(USER).map(p => p.id),
      [a.id, b.id]
    );
    await pending;
  });

  it("reorderProyecto en el extremo no mueve ni ensucia", async () => {
    const a = await addProyecto(USER, { titulo: "Alfa", etiqueta: "proyecto" });
    const b = await addProyecto(USER, { titulo: "Beta", etiqueta: "proyecto" });
    const before = getProyectosLocal(USER).map(p => `${p.id}:${p.orden}`);
    const same = await reorderProyecto(USER, b.id, "up");
    assert.deepEqual(
      same.map(p => p.id),
      [b.id, a.id]
    );
    assert.deepEqual(
      getProyectosLocal(USER).map(p => `${p.id}:${p.orden}`),
      before
    );
  });

  it("reorderPeldano reordena ideas sin esperar red", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    const i1 = await addPeldanoIdea(USER, p.id, "Cortar");
    const i2 = await addPeldanoIdea(USER, p.id, "Coser");
    const ideas = () =>
      getPeldanosByProyectoLocal(USER, p.id)
        .filter(x => x.estado === "idea")
        .map(x => x.id);

    assert.deepEqual(ideas(), [i1.id, i2.id]);
    const after = await reorderPeldano(USER, p.id, i2.id, "up");
    assert.deepEqual(
      after.filter(x => x.estado === "idea").map(x => x.id),
      [i2.id, i1.id]
    );
    assert.deepEqual(ideas(), [i2.id, i1.id]);
  });

  it("reorderOleadaPunto intercambia y renumera", async () => {
    const p = await addProyecto(USER, { titulo: "Sistemicar", etiqueta: "proyecto" });
    const idea = await addPeldanoIdea(USER, p.id, "Módulo pagos");
    await addOleadaPunto(USER, idea.id, "Diseño");
    await addOleadaPunto(USER, idea.id, "API");
    const pel = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    const secondId = pel.oleadaPuntos?.[1]?.id;
    assert.ok(secondId);
    const updated = await reorderOleadaPunto(USER, idea.id, secondId, "up");
    assert.equal(updated?.oleadaPuntos?.[0]?.titulo, "API");
    assert.equal(updated?.oleadaPuntos?.[0]?.numero, 1);
    assert.equal(updated?.oleadaPuntos?.[1]?.titulo, "Diseño");
    assert.equal(updated?.oleadaPuntos?.[1]?.numero, 2);
  });
});
