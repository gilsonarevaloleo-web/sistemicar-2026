import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diagnosticarVolcadoLocal } from "./engineConfig.ts";
import {
  calcularExpedienteOjos,
  calcularGradoVolcado,
  descomponerVolcado,
  etiquetaGrado,
} from "./grados.ts";

const HIJA = `Ayer aprendí que mí hija de 4 años entiende de una manera sorpréndete. Sobre lo que los mayores hablan a su alrededor. Yo creí los niños de 4 años son cero comprension sobre procesos supuestamente complejo ¿Porque digo eso? Ayer mí esposa estaba mandándole a juntar sus cosas a mí hija diciendole: tienes que juntar tus cosas, una niña que no es ordenada, le hacía comparaciones con otras niñas además le adicionada promesa de castigo y entonces mí hija empezó a llorar. Le estás amontonando carga cognitiva a una niña de 4 años. Después de unos 5 minutos mí hija vino ¿Cómo se llama eso lo que mí mamá hace papí? y dijo: "papá yo soy una niña, no puedo hacer eso"`;

describe("Universidad — grados del operador", () => {
  it("G1 Aprendiz: el ruido también entrega ojo (el no-dicho)", () => {
    const lectura = calcularGradoVolcado("hoy fue feo");
    assert.equal(lectura.grado, "APRENDIZ_OJO");
    assert.equal(lectura.codigoDominante, 1);
    assert.match(lectura.capas.ruido, /clima|Flor/i);
    assert.ok(lectura.capas.noDicho.length > 0);
    assert.equal(etiquetaGrado("APRENDIZ_OJO"), "G1 · Aprendiz de Ojo");
  });

  it("el volcado de la hija opera en G3: sombra, no discurso pedagógico", () => {
    const diag = diagnosticarVolcadoLocal(HIJA);
    const lectura = calcularGradoVolcado(HIJA, diag);
    const capas = descomponerVolcado(HIJA, diag);
    assert.equal(diag.codigoDominante, 9);
    assert.equal(lectura.grado, "ARQUITECTO_PUNTO_CIEGO");
    assert.match(capas.ruido, /comparacion|castigo|flor/i);
    assert.match(capas.noDicho, /circuito|llama|evento/i);
    assert.doesNotMatch(lectura.nombreOjoDominante, /Ritmo/);
  });

  it("el expediente no corona C9 ni pide C1 como Forja", () => {
    const diag = diagnosticarVolcadoLocal(HIJA);
    const lectura = calcularGradoVolcado(HIJA, diag);
    const exp = calcularExpedienteOjos([9, 9, 3], [lectura]);
    assert.deepEqual(exp.ojosNombrados, [3, 9]);
    assert.equal(exp.gradoOperador, "ARQUITECTO_PUNTO_CIEGO");
    assert.notEqual(exp.gradoOperador, "OPERADOR_SOBERANIA");
    assert.match(exp.haciaDonde, /G3|rotar|lente/i);
    assert.doesNotMatch(exp.haciaDonde, /graduarse en C10|saltar a C10/i);
  });

  it("G4 pide mapa de calor balanceado, no diez conquistas en orden", () => {
    const diez = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
    const exp = calcularExpedienteOjos(diez);
    assert.equal(exp.hueco, null);
    assert.equal(exp.rango, 10);
    assert.ok(exp.balance >= 0.9);
    assert.equal(exp.atasco, null);
    assert.equal(exp.gradoOperador, "OPERADOR_SOBERANIA");
    assert.match(exp.haciaDonde, /Sintonía|atascar/i);

    const atascado = calcularExpedienteOjos([9, 9, 9, 9, 3, 3]);
    assert.equal(atascado.atasco, 9);
    assert.notEqual(atascado.gradoOperador, "OPERADOR_SOBERANIA");
    assert.match(atascado.haciaDonde, /atasca en C9/i);
  });
});
