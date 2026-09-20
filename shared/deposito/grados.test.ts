import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diagnosticarVolcadoLocal } from "./engineConfig.ts";
import {
  calcularExpedienteOjos,
  calcularGradoVolcado,
  etiquetaGrado,
} from "./grados.ts";

describe("Universidad — grados de Depósito", () => {
  it("el ruido también entrega un ojo: el no-dicho", () => {
    const lectura = calcularGradoVolcado("hoy fue feo");
    assert.equal(lectura.grado, "RUIDO");
    assert.equal(lectura.codigoDominante, 1);
    assert.ok(lectura.noDicho.length > 0);
    assert.equal(etiquetaGrado("RUIDO"), "G0 · Ruido");
  });

  it("el volcado de la hija es absorción anclada en Sistema, no un salto a C10", () => {
    const texto = `Ayer aprendí que mí hija de 4 años entiende de una manera sorpréndete. Sobre lo que los mayores hablan a su alrededor. Yo creí los niños de 4 años son cero comprension sobre procesos supuestamente complejo ¿Porque digo eso? Ayer mí esposa estaba mandándole a juntar sus cosas a mí hija diciendole: tienes que juntar tus cosas. Después de unos 5 minutos mí hija vino ¿Cómo se llama eso lo que mí mamá hace papí? y dijo: "papá yo soy una niña, no puedo hacer eso"`;
    const diag = diagnosticarVolcadoLocal(texto);
    const lectura = calcularGradoVolcado(texto, diag);
    assert.equal(diag.codigoDominante, 9);
    assert.equal(lectura.codigoDominante, 9);
    assert.ok(lectura.grado === "ANCLADO" || lectura.grado === "ABSORCION");
    assert.match(lectura.noDicho, /llama|circuito|evento/i);
  });

  it("el expediente avanza al hueco, no al código más alto", () => {
    const exp = calcularExpedienteOjos([9, 9, 3]);
    assert.deepEqual(exp.ojosNombrados, [3, 9]);
    assert.equal(exp.rango, 2);
    assert.equal(exp.hueco, 1);
    assert.match(exp.haciaDonde, /C1/);
    assert.doesNotMatch(exp.haciaDonde, /saltar a C10|graduarse en C10/i);
  });

  it("diez ojos nombrados cierran el hueco y dejan autarquía", () => {
    const exp = calcularExpedienteOjos([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(exp.hueco, null);
    assert.equal(exp.rango, 10);
    assert.match(exp.haciaDonde, /autarquía/i);
  });
});
