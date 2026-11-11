import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FICHAS_LIMITE, conEscena } from "./fichasLimite.ts";
import { FICHAS_VENDEDOR } from "./fichasVendedor.ts";
import { fichaDe } from "./fichas.ts";

describe("Fichas vivas C1–C10", () => {
  it("C1 del límite es cimiento: sensación, tres tiempos, no se sella en el primero", () => {
    const c1 = FICHAS_LIMITE[1];
    assert.match(c1.sensacion, /Suelo/i);
    assert.equal(c1.tiempos.length, 3);
    assert.equal(c1.tiempos[0].nombre, "plantar");
    assert.equal(c1.tiempos[1].nombre, "rozar");
    assert.equal(c1.tiempos[2].nombre, "sostener");
    assert.match(c1.tiempos[0].preguntaSemilla, /quién sos/i);
    assert.match(c1.r2, /permiso/);
    assert.match(c1.cruce, /tres tiempos|plantar, rozar y sostener/i);
    assert.notEqual(c1.nombre, FICHAS_VENDEDOR[1].nombre);
  });

  it("C2 cubre cualquier exposición social, no solo producto", () => {
    const c2 = FICHAS_LIMITE[2];
    assert.match(c2.sensacion, /visto/i);
    assert.match(c2.tiempos[0].intencion, /chica|público|familia|cliente/i);
    assert.match(c2.tiempos[2].preguntaSemilla, /No vendas\. No enamores/);
    assert.doesNotMatch(c2.tiempos[0].preguntaSemilla, /1 al 10/);
  });

  it("los diez del límite tienen sensación y tres tiempos", () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const) {
      const f = FICHAS_LIMITE[n];
      assert.equal(f.codigo, n);
      assert.ok(f.sensacion.length > 8);
      assert.equal(f.tiempos.length, 3);
      assert.ok(f.r1.length > 4);
      assert.ok(f.r2.length > 4);
    }
  });

  it("C1 del vendedor es el Cortador, no el cimiento", () => {
    const a = fichaDe("limite", 1);
    const b = fichaDe("vendedor", 1);
    assert.match(a.nombre, /Cimiento|Identidad/i);
    assert.match(b.nombre, /Cortador/);
    assert.equal(b.tiempos.length, 3);
    assert.match(b.tiempos[0].preguntaSemilla, /frase/i);
  });

  it("la escena del volcado entra en la semilla", () => {
    const out = conEscena("Estás en [escena]. ¿Quién sos?", "Quiero enamorar a una chica y me da miedo.");
    assert.match(out, /enamorar/);
    assert.doesNotMatch(out, /\[escena\]/);
  });
});
