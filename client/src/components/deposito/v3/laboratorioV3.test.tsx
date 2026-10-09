import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildActiveEyeMap,
  emptyEyeAudits,
  type DepotAnalysisResult,
} from "@shared/deposito/v3";
import { FormularioAuditoriaV3 } from "./FormularioAuditoriaV3.tsx";
import { MapaCalorV3 } from "./MapaCalorV3.tsx";
import { DictamenCardV3 } from "./DictamenCardV3.tsx";

function fixture(): DepotAnalysisResult {
  const audits = emptyEyeAudits();
  audits[3] = {
    eyeId: 3,
    hasIntention: true,
    hasRealVision: true,
    isBlindSpot: true,
  };
  audits[7] = {
    eyeId: 7,
    hasIntention: true,
    hasRealVision: true,
    isBlindSpot: false,
  };
  return {
    id: "depot_test",
    timestamp: 1,
    perceptionEye: 7,
    characterSignedCode: 3,
    activeEyeMap: buildActiveEyeMap([3, 7]),
    eyeAudits: audits,
    deltaGap: 4,
    syntaxDiagnostic: {
      detectedSyntaxCode: 3,
      syntaxCharacteristics: "Paso a paso, marcas de hora.",
    },
    groundingStatus: {
      isFullyGrounded: false,
      frictionPoint: 3,
      diagnosticMessage: "La visión opera en C7. El chasis fricciona en C3.",
    },
    systemicAnalysis: {
      isLatencyEvent: false,
      isSystemicConflict: false,
      realEngineeringCause: "El corte se narra como patrón y se ejecuta como pistón.",
    },
    immediateAdjustment: "Tres pasos con hora de corte.",
  };
}

describe("FormularioAuditoriaV3", () => {
  it("Matrícula muestra territorio e hipótesis, no flor/sombra", () => {
    const html = renderToStaticMarkup(
      createElement(FormularioAuditoriaV3, {
        userTier: "MATRICULA",
        onAnalysisComplete: () => {},
      }),
    );
    assert.match(html, /deposito-v3-form/);
    assert.match(html, /deposito-v3-rawfact/);
    assert.match(html, /deposito-v3-hypothesis/);
    assert.match(html, />MATRICULA</);
    assert.doesNotMatch(html, /deposito-v3-noise/);
    assert.doesNotMatch(html, /deposito-v3-shadow/);
  });

  it("Carrera abre flor y sombra obligatorias", () => {
    const html = renderToStaticMarkup(
      createElement(FormularioAuditoriaV3, {
        userTier: "CARRERA",
        onAnalysisComplete: () => {},
      }),
    );
    assert.match(html, />CARRERA</);
    assert.match(html, /deposito-v3-noise/);
    assert.match(html, /deposito-v3-shadow/);
    assert.match(html, /lo no dicho/i);
  });
});

describe("MapaCalorV3", () => {
  it("marca óptica C7, carácter C3, fricción y candado de Matrícula en C5+", () => {
    const html = renderToStaticMarkup(
      createElement(MapaCalorV3, {
        result: fixture(),
        userTier: "MATRICULA",
      }),
    );
    assert.match(html, /deposito-v3-mapa/);
    assert.match(html, /ÓPTICA C7/);
    assert.match(html, /CARÁCTER C3/);
    assert.match(html, /Cimiento/);
    assert.match(html, /Claridad/);
    assert.match(html, /deposito-v3-eye-7/);
    assert.match(html, /data-optica="1"/);
    assert.match(html, /data-caracter="1"/);
    assert.match(html, /deposito-v3-friccion-3/);
    assert.match(html, /data-locked="1"/);
    assert.match(html, /BLOQ/);
  });
});

describe("DictamenCardV3", () => {
  it("muestra Δ, alias de ojos y ajuste frío", () => {
    const html = renderToStaticMarkup(
      createElement(DictamenCardV3, { result: fixture() }),
    );
    assert.match(html, /deposito-v3-dictamen/);
    assert.match(html, /Δ 4/);
    assert.match(html, /C7 · Visión/);
    assert.match(html, /Justicia/);
    assert.match(html, /C3 · Trabajo/);
    assert.match(html, /Ritmo/);
    assert.match(html, /no se invalida|fricciona en C3/i);
    assert.match(html, /Tres pasos con hora de corte/);
  });
});
