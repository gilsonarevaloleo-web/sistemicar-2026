import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { progresoDiez, temaDeCapitulo } from "./ambiente.ts";

describe("ambiente del cuarto", () => {
  it("el 10 se acerca con el avance y se completa al sellar", () => {
    assert.equal(progresoDiez({ subcodigo: 1, indice: 1 }), 0);
    assert.ok(progresoDiez({ subcodigo: 3, indice: 2 }) > progresoDiez({ subcodigo: 2, indice: 1 }));
    assert.equal(progresoDiez({ subcodigo: 1, indice: 1 }, true), 1);
  });
  it("capítulo desconocido usa el tema base", () => {
    assert.equal(temaDeCapitulo(99), temaDeCapitulo(1));
  });
});
