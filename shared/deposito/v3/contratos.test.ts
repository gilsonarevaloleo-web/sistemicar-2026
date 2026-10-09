import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DICCIONARIO_OJOS } from "../engineConfig.ts";
import { LEY_OPTICA_CODIGO_OJOS } from "../leyOpticaCodigo.ts";
import {
  CANON_TEN_EYES,
  DEPOSITO_V3_VERSION,
  EYE_CODES,
  TIER_MAX_EYE,
  buildActiveEyeMap,
  camposObligatoriosPorTier,
  camposVisiblesPorTier,
  computeDeltaGap,
  etiquetaCodigoOjo,
  etiquetaOjo,
  isAdvancedTier,
  isDepotAnalysisResult,
  isEyeLocked,
  maxUnlockedEye,
  normalizarPayload,
  parseDepotAnalysisResult,
  parseEyeCode,
  scaffoldAnalysisResult,
  userTierFromEntitlements,
  validarPayload,
} from "./index.ts";

describe("Depósito V3 — contratos", () => {
  it("expone versión y los 10 canales sin repetir id", () => {
    assert.equal(DEPOSITO_V3_VERSION, "3.0.0-optica-sintaxis");
    assert.deepEqual([...EYE_CODES], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const ids = EYE_CODES.map((n) => CANON_TEN_EYES[n].id);
    assert.deepEqual(ids, [...EYE_CODES]);
  });

  it("el canon coincide con la Ley de los Diez Ojos", () => {
    for (const ley of LEY_OPTICA_CODIGO_OJOS) {
      const ojo = CANON_TEN_EYES[ley.codigo];
      assert.equal(ojo.name, ley.nombre);
    }
  });

  it("el dialecto planeta es alias del diccionario V2, no otro universo", () => {
    for (const n of EYE_CODES) {
      assert.equal(CANON_TEN_EYES[n].planetaOjo, DICCIONARIO_OJOS[n].nombreOjo);
    }
    assert.equal(etiquetaOjo(1, "canon"), "Cimiento");
    assert.equal(etiquetaOjo(1, "planeta"), "Claridad");
    assert.equal(etiquetaCodigoOjo(3, "canon"), "C3 Trabajo");
    assert.equal(etiquetaCodigoOjo(3, "planeta"), "C3 Ritmo");
  });

  it("parsea EyeCode desde número, string y C#", () => {
    assert.equal(parseEyeCode(7), 7);
    assert.equal(parseEyeCode("10"), 10);
    assert.equal(parseEyeCode("C4"), 4);
    assert.equal(parseEyeCode("c9"), 9);
    assert.equal(parseEyeCode(0), null);
    assert.equal(parseEyeCode("C11"), null);
  });

  it("Δ es la distancia absoluta entre óptica y carácter", () => {
    assert.equal(computeDeltaGap(7, 3), 4);
    assert.equal(computeDeltaGap(1, 1), 0);
    assert.equal(computeDeltaGap(2, 9), 7);
  });
});

describe("Depósito V3 — tiers y candado", () => {
  it("FREE 1 / MATRICULA 4 / CARRERA 8 / TITULO 10", () => {
    assert.equal(TIER_MAX_EYE.FREE, 1);
    assert.equal(maxUnlockedEye("MATRICULA"), 4);
    assert.equal(maxUnlockedEye("CARRERA"), 8);
    assert.equal(maxUnlockedEye("TITULO"), 10);
    assert.equal(isEyeLocked(1, "FREE"), false);
    assert.equal(isEyeLocked(2, "FREE"), true);
    assert.equal(isEyeLocked(4, "MATRICULA"), false);
    assert.equal(isEyeLocked(5, "MATRICULA"), true);
    assert.equal(isEyeLocked(8, "CARRERA"), false);
    assert.equal(isEyeLocked(9, "CARRERA"), true);
    assert.equal(isEyeLocked(10, "TITULO"), false);
  });

  it("Título gana a Carrera y Matrícula", () => {
    assert.equal(userTierFromEntitlements({}), "FREE");
    assert.equal(userTierFromEntitlements({ hasMatricula: true }), "MATRICULA");
    assert.equal(
      userTierFromEntitlements({ hasMatricula: true, hasCarrera: true }),
      "CARRERA",
    );
    assert.equal(
      userTierFromEntitlements({
        hasMatricula: true,
        hasCarrera: true,
        hasTitulo: true,
      }),
      "TITULO",
    );
    assert.equal(userTierFromEntitlements({ hasTitulo: true }), "TITULO");
  });

  it("Carrera y Título exigen flor y sombra; FREE/Matrícula no", () => {
    assert.deepEqual([...camposObligatoriosPorTier("FREE")], ["rawFact"]);
    assert.deepEqual([...camposObligatoriosPorTier("MATRICULA")], ["rawFact"]);
    assert.deepEqual(
      [...camposObligatoriosPorTier("CARRERA")],
      ["rawFact", "detectedNoise", "omittedShadow"],
    );
    assert.ok(camposVisiblesPorTier("MATRICULA").includes("studentHypothesis"));
    assert.equal(isAdvancedTier("CARRERA"), true);
    assert.equal(isAdvancedTier("FREE"), false);
  });
});

describe("Depósito V3 — payload", () => {
  it("acepta aliases V2 (volcadoCrudo / friccion / sombra / C#)", () => {
    const payload = normalizarPayload({
      volcadoCrudo: "  hoy corté a las 14:00  ",
      friccionDetectada: "dije que no tuve tiempo",
      sombraOmision: "no nombré el quiebre",
      codigoHipotesis: 4,
      tier: "carrera",
    });
    assert.equal(payload.rawFact, "hoy corté a las 14:00");
    assert.equal(payload.detectedNoise, "dije que no tuve tiempo");
    assert.equal(payload.omittedShadow, "no nombré el quiebre");
    assert.equal(payload.studentHypothesis, "C4");
    assert.equal(payload.userTier, "CARRERA");
  });

  it("FREE/Matrícula solo exigen hecho crudo", () => {
    const r = validarPayload({ rawFact: "volqué el día", userTier: "MATRICULA" });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.payload.rawFact, "volqué el día");
  });

  it("rechaza volcado vacío y Carrera sin flor/sombra", () => {
    assert.equal(validarPayload({ rawFact: "   ", userTier: "FREE" }).ok, false);
    const sinFlor = validarPayload({
      rawFact: "hecho",
      omittedShadow: "fuga",
      userTier: "CARRERA",
    });
    assert.equal(sinFlor.ok, false);
    if (!sinFlor.ok) assert.match(sinFlor.error, /detectedNoise/);
    const sinSombra = validarPayload({
      rawFact: "hecho",
      detectedNoise: "excusa",
      userTier: "TITULO",
    });
    assert.equal(sinSombra.ok, false);
    if (!sinSombra.ok) assert.match(sinSombra.error, /omittedShadow/);
  });

  it("Carrera completa pasa", () => {
    const r = validarPayload({
      rawFact: "el pistón arrancó a las 9",
      detectedNoise: "culpa de productividad",
      omittedShadow: "no dije que dormí 4 horas",
      userTier: "CARRERA",
    });
    assert.equal(r.ok, true);
  });
});

describe("Depósito V3 — dictamen", () => {
  const llm = {
    perceptionEye: 7,
    characterSignedCode: 3,
    activeEyeMap: { "3": true, "7": true },
    eyeAudits: {
      "3": {
        eyeId: 3,
        hasIntention: true,
        hasRealVision: true,
        isBlindSpot: false,
      },
    },
    deltaGap: 4,
    syntaxDiagnostic: {
      detectedSyntaxCode: 3,
      syntaxCharacteristics: "Paso a paso, marcas de hora.",
    },
    groundingStatus: {
      isFullyGrounded: false,
      frictionPoint: 3,
      diagnosticMessage: "El chasis fricciona en la secuencia.",
    },
    systemicAnalysis: {
      isLatencyEvent: false,
      isSystemicConflict: false,
      realEngineeringCause: "El corte se narra como visión y se ejecuta como pistón.",
    },
    immediateAdjustment: "Mañana, una secuencia de tres pasos con hora de corte.",
  };

  it("parsea el JSON del especialista y sella id/timestamp", () => {
    const parsed = parseDepotAnalysisResult(JSON.stringify(llm), {
      id: "depot_test",
      timestamp: 1,
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.result.id, "depot_test");
    assert.equal(parsed.result.perceptionEye, 7);
    assert.equal(parsed.result.characterSignedCode, 3);
    assert.equal(parsed.result.deltaGap, 4);
    assert.equal(parsed.result.activeEyeMap[3], true);
    assert.equal(parsed.result.activeEyeMap[1], false);
    assert.equal(parsed.result.eyeAudits[3].hasRealVision, true);
    assert.equal(parsed.result.eyeAudits[1].hasIntention, false);
    assert.equal(isDepotAnalysisResult(parsed.result), true);
  });

  it("recalcula Δ si el modelo la omite o la miente en signo", () => {
    const sinDelta = parseDepotAnalysisResult({
      ...llm,
      deltaGap: undefined,
    });
    assert.equal(sinDelta.ok, true);
    if (sinDelta.ok) assert.equal(sinDelta.result.deltaGap, 4);

    const negativa = parseDepotAnalysisResult({
      ...llm,
      perceptionEye: "C8",
      characterSignedCode: "C2",
      deltaGap: -6,
    });
    assert.equal(negativa.ok, true);
    if (negativa.ok) assert.equal(negativa.result.deltaGap, 6);
  });

  it("rechaza dictamen sin causa o sin ajuste", () => {
    const sinCausa = parseDepotAnalysisResult({
      ...llm,
      systemicAnalysis: { isLatencyEvent: false, isSystemicConflict: false },
    });
    assert.equal(sinCausa.ok, false);
    const sinAjuste = parseDepotAnalysisResult({
      ...llm,
      immediateAdjustment: "",
    });
    assert.equal(sinAjuste.ok, false);
  });

  it("el andamio local deja óptica, carácter y Δ coherentes", () => {
    const draft = scaffoldAnalysisResult({
      perceptionEye: 9,
      characterSignedCode: 1,
    });
    assert.equal(draft.deltaGap, 8);
    assert.equal(draft.activeEyeMap[9], true);
    assert.equal(draft.activeEyeMap[1], true);
    assert.equal(isDepotAnalysisResult(draft), true);
  });

  it("mapa de calor vacío cubre C1–C10", () => {
    const map = buildActiveEyeMap([5]);
    assert.equal(Object.keys(map).length, 10);
    assert.equal(map[5], true);
    assert.equal(map[10], false);
  });
});
