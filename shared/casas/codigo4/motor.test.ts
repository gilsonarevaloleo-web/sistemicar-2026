import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acotarAlPerimetro,
  detectarCodigoProblema,
  diagnosticarJuezSerioLocal,
  directivaFiltraPerimetro,
  evaluarJuezSerio,
  inferirPerimetroConquistado,
  parseEyeCode,
  parseJuezSerioResult,
} from "./index.ts";
import type { JuezSerioResult } from "./types.ts";

const VOLCADO_C3 =
  "Hoy corrí el día en automático. Bloque, bloque, apagando incendios. El pistón no paró y no vi nada.";

function dictamen(over: Partial<{
  problema: number;
  max: number;
  fuga: string;
  lectura: string;
  directiva: string;
}> = {}): JuezSerioResult {
  return {
    fase1_lectura: {
      codigoProblemaDetectado: (over.problema ?? 4) as 4,
      codigoConquistadoMax: (over.max ?? 3) as 3,
      fugaInconsciente: over.fuga ?? "Vía de agua.",
      lecturaPerimetroFrancia: over.lectura ?? "Dictamen de perímetro.",
    },
    fase2_propuesta_solucion: {
      requiereInversionCreditos: true,
      directivaOperacional: over.directiva ?? "Interrumpí el pistón automático.",
    },
  };
}

describe("Casa Código 4 — motor", () => {
  it("un volcado de día ciego destapa C4 y sostiene como máximo C3", () => {
    assert.equal(detectarCodigoProblema(VOLCADO_C3), 4);
    assert.equal(inferirPerimetroConquistado(VOLCADO_C3), 3);

    const r = evaluarJuezSerio({ friccionDiaria: VOLCADO_C3 });
    assert.equal(r.fase1_lectura.codigoProblemaDetectado, 4);
    assert.equal(r.fase1_lectura.codigoConquistadoMax, 3);
    assert.match(r.fase1_lectura.fugaInconsciente, /automático|coartada|pistón/);
    assert.match(r.fase1_lectura.lecturaPerimetroFrancia, /C4/);
    assert.match(r.fase1_lectura.lecturaPerimetroFrancia, /C3/);
    assert.equal(r.fase2_propuesta_solucion.requiereInversionCreditos, true);
    assert.match(r.fase2_propuesta_solucion.directivaOperacional, /pistón|paso/);
    assert.ok(
      directivaFiltraPerimetro(r.fase2_propuesta_solucion.directivaOperacional, 3),
    );
  });

  it("respeta el perímetro declarado y no sube la tijera", () => {
    const r = diagnosticarJuezSerioLocal({
      friccionDiaria: "No veo el patrón. Quiero una estrategia de tres meses.",
      codigoConquistadoMax: 2,
    });
    assert.equal(r.fase1_lectura.codigoConquistadoMax, 2);
    assert.ok(r.fase1_lectura.codigoProblemaDetectado >= 2);
    assert.doesNotMatch(
      r.fase2_propuesta_solucion.directivaOperacional,
      /visión estratégica|rediseñá el sistema|encontrá tu propósito/i,
    );
    assert.ok(
      directivaFiltraPerimetro(r.fase2_propuesta_solucion.directivaOperacional, 2),
    );
  });

  it("parsea JSON y reescribe directivas que filtran códigos superiores", () => {
    const parsed = parseJuezSerioResult({
      fase1_lectura: {
        codigoProblemaDetectado: 7,
        codigoConquistadoMax: 3,
        fugaInconsciente: "Habla de patrón sin sostenerlo.",
        lecturaPerimetroFrancia: "Problema C7. Chasis C3.",
      },
      fase2_propuesta_solucion: {
        requiereInversionCreditos: false,
        directivaOperacional:
          "Encontrá tu visión estratégica y rediseñá el sistema.",
      },
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.result.fase2_propuesta_solucion.requiereInversionCreditos, true);
    assert.doesNotMatch(
      parsed.result.fase2_propuesta_solucion.directivaOperacional,
      /visión estratégica|sistema/i,
    );
    assert.match(
      parsed.result.fase2_propuesta_solucion.directivaOperacional,
      /pistón|paso/,
    );
  });

  it("rechaza JSON incompleto y acepta enteros 1–10", () => {
    assert.equal(parseEyeCode("C4"), 4);
    assert.equal(parseEyeCode(11), null);
    const bad = parseJuezSerioResult({ fase1_lectura: {} });
    assert.equal(bad.ok, false);
    const wrapped = parseJuezSerioResult(
      "```json\n" +
        JSON.stringify(dictamen({ directiva: "Nombrá UN paso y cerra." })) +
        "\n```",
    );
    assert.equal(wrapped.ok, true);
  });

  it("acotarAlPerimetro fuerza créditos y limpia empatía blanda", () => {
    const acotado = acotarAlPerimetro(
      dictamen({
        max: 3,
        problema: 4,
        directiva: "Te entiendo, es normal. Decidí con visión.",
      }),
    );
    assert.equal(acotado.fase2_propuesta_solucion.requiereInversionCreditos, true);
    assert.doesNotMatch(
      acotado.fase2_propuesta_solucion.directivaOperacional,
      /te entiendo|es normal|decidí/i,
    );
  });
});
