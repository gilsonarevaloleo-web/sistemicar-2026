import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEPOT_V3_MASTER_PROMPT,
  DEPOT_V3_SYNTAX_ONLY_PROMPT,
  buildDepositoV3SystemPrompt,
  diagnosticarAuditoriaLocal,
  evaluarDepositoV3,
  procesarAuditoriaV3,
  serializarPromptAuditoria,
} from "./index.ts";

const PATRON_PISTON =
  "Vi el patrón: cada vez que salteo la secuencia a las 9:00, 9:20, 9:40 el pistón se atasca. El modelo se repite. No es que deba ser más productivo.";

describe("Depósito V3 — prompt", () => {
  it("exige motor de maestría: foco de revelación, no consejo mecánico; prohíbe Óptica y Δ", () => {
    const system = buildDepositoV3SystemPrompt();
    assert.equal(DEPOT_V3_SYNTAX_ONLY_PROMPT, DEPOT_V3_MASTER_PROMPT);
    assert.match(DEPOT_V3_MASTER_PROMPT, /FOCO DE REVELACIÓN/i);
    assert.match(DEPOT_V3_MASTER_PROMPT, /focoRevelacionCode/);
    assert.match(system, /HIGHLY ACCURATE, MATURE adjustment/i);
    assert.match(system, /DO NOT evaluate moral truth|philosophical depth/i);
    assert.match(system, /DO NOT calculate "Perception Delta/i);
    assert.match(system, /Do NOT just pick the code with the most words/i);
    assert.match(system, /NEVER give generic advice like "repeat C3 with a number"/i);
    assert.match(system, /syntacticVacios/);
    assert.match(system, /isCableadoConnected/);
    assert.match(system, /characterSignedCode/);
    assert.match(system, /activeCharacterMap/);
    assert.match(system, /Antecedent/i);
    assert.match(system, /Independent of clock time|NO EXIGE RELOJ/i);
    assert.doesNotMatch(system, /perceptionEye/);
    assert.doesNotMatch(system, /deltaGap/);
    assert.doesNotMatch(system, /FORMA \(SINTAXIS\) VS FONDO \(ÓPTICA\)/);
    assert.doesNotMatch(system, /UN solo Código Dominante/);
  });

  it("el user prompt manda diagnosticar geometría y foco, no verdad", () => {
    const user = serializarPromptAuditoria({
      rawFact: "hoy corté a las 14:00",
      userTier: "MATRICULA",
    });
    assert.match(user, /MATRICULA/);
    assert.match(user, /geometría real/);
    assert.match(user, /hoy corté a las 14:00/);
    assert.match(user, /FOCO DE REVELACIÓN/);
    assert.match(user, /Cero Óptica|Cero Δ/);
  });
});

describe("Depósito V3 — fallback local", () => {
  it("patrón + pistón firma C3 y foco C7: el ajuste profundiza la ley, no repite el pistón", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: PATRON_PISTON,
      userTier: "MATRICULA",
    });
    assert.equal(r.characterSignedCode, 3);
    assert.equal(r.focoRevelacionCode, 7);
    assert.equal(r.syntaxDiagnostic.focoCode, 7);
    assert.equal(r.activeCharacterMap[3], true);
    assert.equal(r.activeCharacterMap[7], true);
    assert.equal(r.syntaxDiagnostic.detectedSyntaxCode, 3);
    assert.equal(r.syntaxDiagnostic.isCableadoConnected, true);
    assert.match(r.syntaxDiagnostic.syntaxCharacteristics, /C3[\s\S]*C7|síntesis/i);
    assert.match(r.immediateAdjustment, /C7|Ley|axioma|patr[oó]n/i);
    assert.doesNotMatch(r.immediateAdjustment, /repet[ií].*C3|hecho medible|Cero inventario/i);
    assert.ok(r.syntacticVacios.includes(1));
    assert.equal(r.syntacticVacios.includes(3), false);
    assert.equal("perceptionEye" in r, false);
    assert.equal("deltaGap" in r, false);
    assert.doesNotMatch(r.groundingStatus.diagnosticMessage, /óptica|delta/i);
  });

  it("C3 se activa por secuencia vectorial, no por reloj", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Vi el patrón. Primero aislé el territorio, entonces ocurrió el atasco, me llevó a cortar el segundo paso. El modelo se repite.",
      userTier: "MATRICULA",
    });
    assert.equal(r.characterSignedCode, 3);
    assert.equal(r.syntaxDiagnostic.detectedSyntaxCode, 3);
    assert.equal(r.activeCharacterMap[3], true);
  });

  it("48h / loop marca firma C8, no flojera moral", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Anteayer corté. A las 48h me volvió la ansiedad en loop. El retorno no es flojera. El ciclo incubó.",
      userTier: "CARRERA",
      detectedNoise: "me sentí flojo",
      omittedShadow: "no nombré la onda de 48h",
    });
    assert.equal(r.characterSignedCode, 8);
    assert.equal(r.focoRevelacionCode, 8);
    assert.doesNotMatch(r.groundingStatus.diagnosticMessage, /flojo moral/i);
    assert.doesNotMatch(r.immediateAdjustment, /debo|virtud/i);
    assert.match(r.immediateAdjustment, /C8|Ciclo|polo/i);
    assert.doesNotMatch(r.immediateAdjustment, /repet[ií] el mismo canal/i);
  });

  it("volcado corto no inventa firma alta", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: "hoy mal",
      userTier: "FREE",
    });
    assert.equal(r.characterSignedCode, 1);
    assert.equal(r.focoRevelacionCode, 1);
    assert.equal(r.syntaxDiagnostic.isCableadoConnected, false);
    assert.equal(r.groundingStatus.isFullyGrounded, false);
    assert.match(r.immediateAdjustment, /C1|Cimiento|hecho físico/i);
  });

  it("título C7 cableado al pistón no se juzga como idea: solo cordón", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "A las 9:00 arranqué. A las 9:20 el segundo paso. A las 9:40 el pistón se atasca. El modelo se repite.",
      studentHypothesis: "C7 El patrón del pistón",
      userTier: "TITULO",
      detectedNoise: "culpa de productividad",
      omittedShadow: "no nombré el atasco de las 9:40",
    });
    assert.equal(r.characterSignedCode, 3);
    assert.equal(r.focoRevelacionCode, 7);
    assert.equal(r.activeCharacterMap[3], true);
    assert.equal(r.activeCharacterMap[7], true);
    assert.equal(r.syntaxDiagnostic.isCableadoConnected, true);
    assert.match(r.immediateAdjustment, /C7|Ley|axioma/i);
    assert.doesNotMatch(r.groundingStatus.diagnosticMessage, /evasi[oó]n|flor moral/i);
  });

  it("título C10 que flota no cablea: la firma baja queda y C10 es vacío o desconectado", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Hoy no hice nada. Me sentí con poca energía. Debo ser más productivo. Ya veré.",
      studentHypothesis: "C10 La matriz de mi abundancia cuántica",
      userTier: "CARRERA",
      detectedNoise: "energía y culpa",
      omittedShadow: "no nombré que no arranqué",
    });
    assert.ok(r.characterSignedCode <= 3);
    assert.equal(r.syntaxDiagnostic.isCableadoConnected, false);
    assert.doesNotMatch(r.immediateAdjustment, /filosofía|óptica/i);
  });

  it("secuencia C3 que cierra en polaridad pone el foco en C8, no en el pistón", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Armé el pistón: primero el aceite, entonces el segundo paso, después el corte. Al cerrar vi la ley: el polo que empujo se invierte y el ciclo vuelve.",
      userTier: "CARRERA",
      detectedNoise: "culpa de ritmo",
      omittedShadow: "no nombré el retorno",
    });
    assert.equal(r.characterSignedCode, 3);
    assert.equal(r.focoRevelacionCode, 8);
    assert.match(r.immediateAdjustment, /C8|Ciclo|polo/i);
    assert.doesNotMatch(r.immediateAdjustment, /repet[ií].*C3|hecho medible/i);
  });

  it("detectedNoise declarado no altera la geometría si el cuerpo está cableado", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: PATRON_PISTON,
      userTier: "CARRERA",
      detectedNoise: "me sentí flojo",
      omittedShadow: "el atasco de las 9:40",
    });
    assert.equal(r.characterSignedCode, 3);
    assert.equal(r.syntaxDiagnostic.isCableadoConnected, true);
    assert.doesNotMatch(r.groundingStatus.diagnosticMessage, /flor moral/i);
  });
});

describe("Depósito V3 — orquestación", () => {
  it("Gemini válido sella mapa de carácter y marca source gemini", async () => {
    const out = await procesarAuditoriaV3(
      { rawFact: PATRON_PISTON, userTier: "MATRICULA" },
      async () =>
        JSON.stringify({
          characterSignedCode: 3,
          focoRevelacionCode: 7,
          activeCharacterMap: { "3": true, "7": true },
          syntacticVacios: [1, 2, 4, 5, 6, 8, 9, 10],
          syntaxDiagnostic: {
            detectedSyntaxCode: 3,
            focoCode: 7,
            isCableadoConnected: true,
            syntaxCharacteristics: "Transición de C3 hacia la ley C7.",
          },
          groundingStatus: {
            isFullyGrounded: true,
            diagnosticMessage: "Secuencia cableada al patrón.",
          },
          immediateAdjustment: "Tu quiebre real está en la Ley (C7).",
        }),
    );
    assert.equal(out.source, "gemini");
    assert.equal(out.result.characterSignedCode, 3);
    assert.equal(out.result.focoRevelacionCode, 7);
    assert.equal(out.result.activeCharacterMap[3], true);
    assert.equal(out.result.activeCharacterMap[7], true);
    assert.equal(out.result.syntaxDiagnostic.isCableadoConnected, true);
    assert.equal("deltaGap" in out.result, false);
  });

  it("JSON roto cae a local y no tira 500", async () => {
    const out = await procesarAuditoriaV3(
      { rawFact: PATRON_PISTON, userTier: "FREE" },
      async () => "esto no es json",
    );
    assert.equal(out.source, "local_fallback");
    assert.equal(out.result.characterSignedCode, 3);
  });

  it("evaluar rechaza Carrera sin sombra", async () => {
    const r = await evaluarDepositoV3({
      rawFact: PATRON_PISTON,
      detectedNoise: "culpa",
      userTier: "CARRERA",
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /omittedShadow/);
  });

  it("evaluar Matrícula pasa solo con hecho crudo", async () => {
    const r = await evaluarDepositoV3({
      volcadoCrudo: PATRON_PISTON,
      userTier: "MATRICULA",
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.source, "local_fallback");
    assert.equal(r.userTier, "MATRICULA");
    assert.equal(r.result.characterSignedCode, 3);
  });
});
