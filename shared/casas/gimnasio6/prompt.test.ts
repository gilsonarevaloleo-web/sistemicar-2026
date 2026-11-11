import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CASA_UMBRAL5_RITUAL } from "../umbral5/prompt.ts";
import {
  GIMNASIO6_AXIOMAS,
  GIMNASIO6_RITUAL_ENTRADA,
  GIMNASIO6_SYSTEM_PROMPT,
  serializarPromptGimnasio6,
} from "./prompt.ts";
import { preguntaCanon } from "./canon.ts";

describe("Gimnasio 6 — prompt del maestro", () => {
  it("no cambia la pregunta de entrada del límite", () => {
    assert.equal(GIMNASIO6_RITUAL_ENTRADA, "¿Cuál es tu límite?");
    assert.equal(GIMNASIO6_RITUAL_ENTRADA, CASA_UMBRAL5_RITUAL);
    assert.equal(GIMNASIO6_AXIOMAS[0].id, "entrada");
  });

  it("el maestro hace pasar, no suspende, no da clase de venta, C3 no es reloj", () => {
    assert.match(GIMNASIO6_SYSTEM_PROMPT, /hacerle pasar/);
    assert.match(GIMNASIO6_SYSTEM_PROMPT, /variante/i);
    assert.match(GIMNASIO6_SYSTEM_PROMPT, /ya contestó/);
    assert.doesNotMatch(GIMNASIO6_SYSTEM_PROMPT, /te acompaño/);
    assert.match(GIMNASIO6_SYSTEM_PROMPT, /No calificás el pitch/);
    assert.match(GIMNASIO6_SYSTEM_PROMPT, /No mandás al Oficio/);
    assert.match(GIMNASIO6_SYSTEM_PROMPT, /C3 ES SECUENCIA, NO RELOJ/);
    assert.match(GIMNASIO6_SYSTEM_PROMPT, /capa profunda/);
  });

  it("el user prompt evalúa una sola pregunta", () => {
    const p = preguntaCanon(1, 1, 1);
    assert.ok(p);
    const user = serializarPromptGimnasio6({
      limiteOrigen: "No puedo vender. El cuerpo se niega.",
      pregunta: p!,
      respuesta: "Un 6.",
      variante: 0,
    });
    assert.match(user, /Una escala del 1 al 10/i);
    assert.match(user, /Un 6/);
    assert.doesNotMatch(user, /¿Qué conocimiento sobre tu producto/);
  });
});
