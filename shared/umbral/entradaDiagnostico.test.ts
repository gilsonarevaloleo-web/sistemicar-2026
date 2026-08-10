import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  UMBRAL_DIAGNOSTICO_PREGUNTAS,
  resolverDiagnosticoUmbral,
} from "./entradaDiagnostico.ts";

describe("Umbral entrada diagnóstico", () => {
  it("tiene 3 preguntas con opciones", () => {
    assert.equal(UMBRAL_DIAGNOSTICO_PREGUNTAS.length, 3);
    for (const p of UMBRAL_DIAGNOSTICO_PREGUNTAS) {
      assert.ok(p.opciones.length >= 2);
    }
  });

  it("resuelve arquetipo de Arena ante desconfianza dominante", () => {
    const r = resolverDiagnosticoUmbral([
      { codigo: 4, modo: "EXTERNO_VENTAS" },
      { codigo: 5, modo: "EXTERNO_VENTAS" },
      { codigo: 4, modo: "INTERNO_HABILIDAD" },
    ]);
    // C4 tiene 2 votos (aunque en modos distintos); empate de n con conteo por modo:codigo
    // votos: EXTERNO:4=1, EXTERNO:5=1, INTERNO:4=1 → empate, gana código más alto entre n iguales
    // Actually each key is modo:codigo so EXTERNO:4=1, EXTERNO:5=1, INTERNO:4=1 - all n=1, highest codigo is 5
    assert.equal(r.codigo, 5);
    assert.equal(r.modo, "EXTERNO_VENTAS");
    assert.match(r.arquetipoNombre ?? "", /Escéptico/i);
  });

  it("prioriza el modo:codigo con más votos", () => {
    const r = resolverDiagnosticoUmbral([
      { codigo: 4, modo: "EXTERNO_VENTAS" },
      { codigo: 4, modo: "EXTERNO_VENTAS" },
      { codigo: 1, modo: "INTERNO_HABILIDAD" },
    ]);
    assert.equal(r.codigo, 4);
    assert.equal(r.modo, "EXTERNO_VENTAS");
    assert.match(r.arquetipoNombre ?? "", /Cínico/i);
  });
});
