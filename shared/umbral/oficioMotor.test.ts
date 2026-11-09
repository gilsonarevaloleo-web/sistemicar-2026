import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diagnosticarOficioLocal, PROMPT_OFICIO_MOTOR } from "./oficioMotor.ts";

describe("Casa 5 Oficio — motor", () => {
  it("volcado de oficio sin números → C5 Cálculo", () => {
    const r = diagnosticarOficioLocal(
      "Entrego el servicio de mi oficio. No tengo cuenta. No sé cuánto vale lo que hago. Sin número.",
    );
    assert.equal(r.codigo, 5);
    assert.equal(r.marca, "Cálculo");
    assert.match(r.nombre, /Cálculo/);
    assert.match(r.lecturaFria, /Hablas C5 Oficio · Cálculo/);
    assert.ok(r.huecos.some((h) => /número|cuenta/i.test(h)));
    assert.match(r.lecturaFria, /cálculo, no el límite/);
    assert.doesNotMatch(r.lecturaFria, /\/limite|ve al Juez|gimnasio/i);
  });

  it("volcado de culpa de cobro → C7 Justicia", () => {
    const r = diagnosticarOficioLocal(
      "Me da culpa cobrar. Pedir precio es un abuso. No es justo. El favor salió sin cuenta.",
    );
    assert.equal(r.codigo, 7);
    assert.equal(r.marca, "Justicia");
    assert.match(r.lecturaFria, /Hablas C7 Oficio · Justicia/);
    assert.ok(r.huecos.some((h) => /cobro|precio|número/i.test(h)));
  });

  it("no clasifica límite ni mancha: se quedan en Oficio, no mandan al 6 ni al Espejo", () => {
    const limite = diagnosticarOficioLocal(
      "Ya sé cuál es mi límite. No hice nada. El cuerpo niega. Gimnasio.",
    );
    assert.equal(limite.codigo, 5);
    assert.equal(limite.marca, "Cálculo");
    assert.equal(limite.contrabando, "limite");
    assert.match(limite.lecturaFria, /no se cubre en el 6/);
    assert.doesNotMatch(limite.lecturaFria, /\/limite|asiento es C1|ve al gimnasio/i);

    const mancha = diagnosticarOficioLocal(
      "Tengo baja autoestima. No valgo. Me quejo. La mancha.",
    );
    assert.ok(mancha.codigo >= 1 && mancha.codigo <= 10);
    assert.equal(mancha.contrabando, "mancha");
    assert.match(mancha.lecturaFria, /aquí el acto es la cuenta/);
    assert.doesNotMatch(mancha.lecturaFria, /\/espejo|ve al Espejo a vaciar/i);
    assert.equal(mancha.recurso, limite.recurso);
    assert.match(PROMPT_OFICIO_MOTOR, /No mandes al 6/);
    assert.match(PROMPT_OFICIO_MOTOR, /No mandes al Juez/);
  });
});
