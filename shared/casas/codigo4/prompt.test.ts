import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CASA_CODIGO4_AXIOMAS,
  CASA_CODIGO4_FIRMA,
  CASA_CODIGO4_MARCA,
  CASA_CODIGO4_NOMBRE,
  CASA_CODIGO4_RITUAL,
  CASA_CODIGO4_SYSTEM_PROMPT,
  CASA_CODIGO4_VERSION,
  EYE_CODES,
  PRINCIPIOS_MATRIZ,
  buildCodigo4SystemPrompt,
  buildCodigo4UserPrompt,
  diccionarioPrincipios,
  jsonSchemaJuezSerio,
  principioDe,
  PROMPT_JUEZ_SERIO,
  buildJuezSerioPrompt,
  serializarPromptJuezSerio,
} from "./index.ts";

describe("Casa Código 4 — prompt", () => {
  it("fija identidad, firma y los 10 principios matriz", () => {
    assert.equal(CASA_CODIGO4_VERSION, "1.0.0-juez-serio");
    assert.equal(CASA_CODIGO4_NOMBRE, "La Casa del Código 4: El Juez Serio");
    assert.equal(CASA_CODIGO4_MARCA, "Juez Serio");
    assert.match(CASA_CODIGO4_FIRMA, /perímetro conquistado/);
    assert.match(CASA_CODIGO4_RITUAL, /fricción/);
    assert.equal(PRINCIPIOS_MATRIZ.length, 10);
    assert.deepEqual(
      PRINCIPIOS_MATRIZ.map((p) => p.codigo),
      [...EYE_CODES],
    );
    assert.equal(principioDe(4).nombre, "Estructura");
    assert.ok(principioDe(4).vectores.some((v) => /Autoengaño/i.test(v)));
    assert.equal(CASA_CODIGO4_AXIOMAS.length, 4);
  });

  it("el sistema exige JSON estricto, perímetro y tono frío", () => {
    const system = buildCodigo4SystemPrompt();
    assert.equal(system, CASA_CODIGO4_SYSTEM_PROMPT);
    assert.equal(PROMPT_JUEZ_SERIO, CASA_CODIGO4_SYSTEM_PROMPT);
    assert.match(system, /HACER CONSCIENTE EL INCONSCIENTE/);
    assert.match(system, /LEY DEL PERÍMETRO DE RECURSOS/);
    assert.match(system, /ejecución ciega en C3/);
    assert.match(system, /C1 → C_conquistado/);
    assert.match(system, /requiereInversionCreditos/);
    assert.match(system, /lecturaPerimetroFria/);
    assert.match(system, /fase1_lectura/);
    assert.match(system, /fase2_propuesta_solucion/);
    assert.match(system, /antipaternalista|ANTIPATERNALISTA|cero empatía/i);
    assert.match(system, /te entiendo/);
    assert.match(diccionarioPrincipios(), /C4 Estructura/);
    assert.match(diccionarioPrincipios(), /C10 Origen/);
    assert.match(jsonSchemaJuezSerio(), /"requiereInversionCreditos": true/);
    assert.doesNotMatch(system, /perceptionEye/);
    assert.doesNotMatch(system, /te acompaño/);
  });

  it("el user prompt mete el volcado y sella el perímetro declarado", () => {
    const user = buildCodigo4UserPrompt({
      friccionDiaria: "hoy corrí el día en automático apagando incendios",
      codigoConquistadoMax: 3,
    });
    assert.match(user, /hoy corrí el día en automático/);
    assert.match(user, /Perímetro declarado del chasis: C3/);
    assert.match(user, /NO puede usar recursos por encima de C3/);
    assert.match(user, /Juez Serio/);
    assert.match(serializarPromptJuezSerio({
      friccionDiaria: "hoy corrí el día en automático apagando incendios",
    }), /Perímetro no declarado/);
    assert.equal(
      buildJuezSerioPrompt({
        friccionDiaria: "hoy corrí el día en automático apagando incendios",
        codigoConquistadoMax: 3,
      }),
      serializarPromptJuezSerio({
        friccionDiaria: "hoy corrí el día en automático apagando incendios",
        codigoConquistadoMax: 3,
      }),
    );
  });
});
