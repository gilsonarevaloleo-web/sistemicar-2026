import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPuntoCeroPasos,
  getPuntoCeroStepVoiceDiagnostics,
  PUNTO_CERO_GUIA_STEP_COUNT,
  resetPuntoCeroStepVoiceForTests,
} from "./puntoCeroStepVoice.ts";

describe("puntoCeroStepVoice", () => {
  it("buildPuntoCeroPasos expone 4 pasos con intro opcional en paso 1", () => {
    const sinIntro = buildPuntoCeroPasos(false);
    const conIntro = buildPuntoCeroPasos(true);
    assert.equal(sinIntro.length, PUNTO_CERO_GUIA_STEP_COUNT);
    assert.equal(conIntro.length, PUNTO_CERO_GUIA_STEP_COUNT);
    assert.ok(conIntro[0]!.frases.length > sinIntro[0]!.frases.length);
    assert.equal(sinIntro[0]!.etapa, "etapa1");
    assert.equal(sinIntro[2]!.etapa, "etapa3");
    assert.ok(sinIntro[2]!.frases.some(f => f.includes("colores")));
  });

  it("getPuntoCeroStepVoiceDiagnostics expone estado inicial tras reset", () => {
    resetPuntoCeroStepVoiceForTests();
    const d = getPuntoCeroStepVoiceDiagnostics();
    assert.equal(d.activePasoIndex, -1);
    assert.equal(d.phraseQueueLen, 0);
    assert.equal(d.pausedByRemount, false);
    assert.equal(d.hasRemountSnapshot, false);
  });
});
