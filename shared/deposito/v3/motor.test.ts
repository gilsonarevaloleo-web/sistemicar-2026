import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDepositoV3SystemPrompt,
  diagnosticarAuditoriaLocal,
  evaluarDepositoV3,
  procesarAuditoriaV3,
  serializarPromptAuditoria,
} from "./index.ts";

const PATRON_PISTON =
  "Vi el patrón: cada vez que salteo la secuencia a las 9:00, 9:20, 9:40 el pistón se atasca. El modelo se repite. No es que deba ser más productivo.";

describe("Depósito V3 — prompt", () => {
  it("exige luz de arriba, desinfección, C8 diferido y firma sintáctica", () => {
    const system = buildDepositoV3SystemPrompt();
    assert.match(system, /LUZ VIENE DE ARRIBA/i);
    assert.match(system, /DESINFECTAR LA MORAL/i);
    assert.match(system, /EFECTOS DIFERIDOS/i);
    assert.match(system, /FIRMA SINTÁCTICA/i);
    assert.match(system, /perceptionEye/);
    assert.match(system, /characterSignedCode/);
    assert.doesNotMatch(system, /UN solo Código Dominante/);
  });

  it("el user prompt manda diagnosticar el orden real, no el candado", () => {
    const user = serializarPromptAuditoria({
      rawFact: "hoy corté a las 14:00",
      userTier: "MATRICULA",
    });
    assert.match(user, /MATRICULA/);
    assert.match(user, /orden real/);
    assert.match(user, /hoy corté a las 14:00/);
  });
});

describe("Depósito V3 — fallback local", () => {
  it("luz de arriba: patrón + pistón = óptica C7, carácter C3, Δ 4", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: PATRON_PISTON,
      userTier: "MATRICULA",
    });
    assert.equal(r.perceptionEye, 7);
    assert.equal(r.characterSignedCode, 3);
    assert.equal(r.deltaGap, 4);
    assert.equal(r.groundingStatus.frictionPoint, 3);
    assert.equal(r.groundingStatus.isFullyGrounded, false);
    assert.match(r.groundingStatus.diagnosticMessage, /no se invalida/i);
    assert.equal(r.activeEyeMap[7], true);
    assert.equal(r.activeEyeMap[3], true);
    assert.equal(r.syntaxDiagnostic.detectedSyntaxCode, 3);
  });

  it("48h / loop marca latencia C8, no flojera moral", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Anteayer corté. A las 48h me volvió la ansiedad en loop. El retorno no es flojera. El ciclo incubó.",
      userTier: "CARRERA",
      detectedNoise: "me sentí flojo",
      omittedShadow: "no nombré la onda de 48h",
    });
    assert.equal(r.systemicAnalysis.isLatencyEvent, true);
    assert.ok(r.characterSignedCode === 8 || r.perceptionEye === 8);
    assert.doesNotMatch(r.systemicAnalysis.realEngineeringCause, /flojo moral/i);
  });

  it("volcado corto no inventa óptica alta", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: "hoy mal",
      userTier: "FREE",
    });
    assert.equal(r.perceptionEye, 1);
    assert.equal(r.characterSignedCode, 1);
    assert.equal(r.deltaGap, 0);
    assert.equal(r.groundingStatus.frictionPoint, 1);
  });
});

describe("Depósito V3 — orquestación", () => {
  it("Gemini válido sella Δ y marca source gemini", async () => {
    const out = await procesarAuditoriaV3(
      { rawFact: PATRON_PISTON, userTier: "MATRICULA" },
      async () =>
        JSON.stringify({
          perceptionEye: 7,
          characterSignedCode: 3,
          activeEyeMap: { "3": true, "7": true },
          eyeAudits: {
            "7": {
              eyeId: 7,
              hasIntention: true,
              hasRealVision: true,
              isBlindSpot: false,
            },
          },
          deltaGap: 99,
          syntaxDiagnostic: {
            detectedSyntaxCode: 3,
            syntaxCharacteristics: "Horas y pistón.",
          },
          groundingStatus: {
            isFullyGrounded: false,
            frictionPoint: 3,
            diagnosticMessage: "Óptica C7, chasis C3.",
          },
          systemicAnalysis: {
            isLatencyEvent: false,
            isSystemicConflict: false,
            realEngineeringCause: "Patrón narrado, secuencia rota.",
          },
          immediateAdjustment: "Tres pasos con hora de corte.",
        }),
    );
    assert.equal(out.source, "gemini");
    assert.equal(out.result.perceptionEye, 7);
    assert.equal(out.result.characterSignedCode, 3);
    assert.equal(out.result.deltaGap, 4);
    assert.equal(out.result.activeEyeMap[7], true);
  });

  it("JSON roto cae a local y no tira 500", async () => {
    const out = await procesarAuditoriaV3(
      { rawFact: PATRON_PISTON, userTier: "FREE" },
      async () => "esto no es json",
    );
    assert.equal(out.source, "local_fallback");
    assert.equal(out.result.perceptionEye, 7);
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
    assert.equal(r.result.perceptionEye, 7);
  });
});
