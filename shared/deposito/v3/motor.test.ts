import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
  it("exige motor de firma: geometría, vacíos y cableado; prohíbe Óptica y Δ", () => {
    const system = buildDepositoV3SystemPrompt();
    assert.match(DEPOT_V3_SYNTAX_ONLY_PROMPT, /SOLE purpose/i);
    assert.match(system, /GEOMETRY, STRUCTURE, and CHARACTER SIGNATURE/i);
    assert.match(system, /DO NOT evaluate moral truth|philosophical depth/i);
    assert.match(system, /DO NOT calculate "Perception Delta/i);
    assert.match(system, /syntacticVacios/);
    assert.match(system, /isCableadoConnected/);
    assert.match(system, /characterSignedCode/);
    assert.match(system, /activeCharacterMap/);
    assert.match(system, /Secuencia Vectorial|Antecedent/i);
    assert.match(system, /Independent of clock time|NO EXIGE RELOJ/i);
    assert.doesNotMatch(system, /perceptionEye/);
    assert.doesNotMatch(system, /deltaGap/);
    assert.doesNotMatch(system, /FORMA \(SINTAXIS\) VS FONDO \(ÓPTICA\)/);
    assert.doesNotMatch(system, /UN solo Código Dominante/);
  });

  it("el user prompt manda diagnosticar geometría, no verdad", () => {
    const user = serializarPromptAuditoria({
      rawFact: "hoy corté a las 14:00",
      userTier: "MATRICULA",
    });
    assert.match(user, /MATRICULA/);
    assert.match(user, /geometría real/);
    assert.match(user, /hoy corté a las 14:00/);
    assert.match(user, /Cero Óptica|Cero Δ/);
  });
});

describe("Depósito V3 — fallback local", () => {
  it("patrón + pistón firma C3 y enciende C7 sin inventar Óptica", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: PATRON_PISTON,
      userTier: "MATRICULA",
    });
    assert.equal(r.characterSignedCode, 3);
    assert.equal(r.activeCharacterMap[3], true);
    assert.equal(r.activeCharacterMap[7], true);
    assert.equal(r.syntaxDiagnostic.detectedSyntaxCode, 3);
    assert.equal(r.syntaxDiagnostic.isCableadoConnected, true);
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
    assert.doesNotMatch(r.groundingStatus.diagnosticMessage, /flojo moral/i);
    assert.doesNotMatch(r.immediateAdjustment, /debo|virtud/i);
  });

  it("volcado corto no inventa firma alta", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: "hoy mal",
      userTier: "FREE",
    });
    assert.equal(r.characterSignedCode, 1);
    assert.equal(r.syntaxDiagnostic.isCableadoConnected, false);
    assert.equal(r.groundingStatus.isFullyGrounded, false);
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
    assert.equal(r.activeCharacterMap[3], true);
    assert.equal(r.activeCharacterMap[7], true);
    assert.equal(r.syntaxDiagnostic.isCableadoConnected, true);
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
          activeCharacterMap: { "3": true, "7": true },
          syntacticVacios: [1, 2, 4, 5, 6, 8, 9, 10],
          syntaxDiagnostic: {
            detectedSyntaxCode: 3,
            isCableadoConnected: true,
            syntaxCharacteristics: "Horas y pistón.",
          },
          groundingStatus: {
            isFullyGrounded: true,
            diagnosticMessage: "Secuencia cableada al patrón.",
          },
          immediateAdjustment: "Tres pasos con hora de corte.",
        }),
    );
    assert.equal(out.source, "gemini");
    assert.equal(out.result.characterSignedCode, 3);
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
