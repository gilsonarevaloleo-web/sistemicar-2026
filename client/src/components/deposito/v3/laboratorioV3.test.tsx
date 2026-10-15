import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildActiveCharacterMap,
  type DepotAnalysisResult,
} from "@shared/deposito/v3";
import { FormularioAuditoriaV3 } from "./FormularioAuditoriaV3.tsx";
import { MapaCalorV3 } from "./MapaCalorV3.tsx";
import { DictamenCardV3 } from "./DictamenCardV3.tsx";
import { HistorialV3 } from "./HistorialV3.tsx";
import { GradoConsistenciaV3 } from "./GradoConsistenciaV3.tsx";

function fixture(): DepotAnalysisResult {
  return {
    id: "depot_test",
    timestamp: 1,
    characterSignedCode: 3,
    focoRevelacionCode: 8,
    activeCharacterMap: buildActiveCharacterMap([3, 7, 8]),
    syntacticVacios: [1, 2, 4, 5, 6, 9, 10],
    syntaxDiagnostic: {
      detectedSyntaxCode: 3,
      focoCode: 8,
      isCableadoConnected: true,
      syntaxCharacteristics: "Transición de la secuencia física C3 hacia la síntesis de polaridad C8.",
    },
    groundingStatus: {
      isFullyGrounded: true,
      diagnosticMessage: "La escritura sostiene título y secuencia.",
    },
    immediateAdjustment:
      "Tu quiebre real ocurrió en la Ley de Polaridad (C8). Mañana, aplica este mismo criterio de inversión de polo a un escenario distinto.",
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
    assert.match(html, /Título sistémico/);
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
  it("marca firma C3, vacíos y candado de Matrícula en C5+", () => {
    const html = renderToStaticMarkup(
      createElement(MapaCalorV3, {
        result: fixture(),
        userTier: "MATRICULA",
      }),
    );
    assert.match(html, /deposito-v3-mapa/);
    assert.match(html, /FIRMA C3/);
    assert.match(html, /FOCO C8/);
    assert.match(html, /VACÍOS/);
    assert.match(html, /Cimiento/);
    assert.match(html, /deposito-v3-eye-3/);
    assert.match(html, /data-caracter="1"/);
    assert.match(html, /data-foco="1"/);
    assert.match(html, /deposito-v3-eye-8/);
    assert.match(html, /data-locked="1"/);
    assert.match(html, /BLOQ/);
    assert.doesNotMatch(html, /ÓPTICA/);
    assert.doesNotMatch(html, /deposito-v3-friccion/);
  });
});

describe("HistorialV3", () => {
  it("lista firma de carácter sin Δ ni Óptica", () => {
    const html = renderToStaticMarkup(
      createElement(HistorialV3, {
        entries: [
          {
            id: "local_v3_1",
            userId: "u1",
            createdAt: new Date("2026-01-01"),
            rawFact: "Vi el patrón a las 9:00.",
            userTier: "MATRICULA",
            result: fixture(),
            source: "local_fallback",
          },
        ],
        onSelect: () => {},
      }),
    );
    assert.match(html, /deposito-v3-historial/);
    assert.match(html, /C3 Trabajo/);
    assert.doesNotMatch(html, /Δ 4/);
    assert.doesNotMatch(html, /OJO DOMINANTE/);
    assert.doesNotMatch(html, /sistemicar_volcados[^\-_]/);
  });
});

describe("GradoConsistenciaV3", () => {
  it("muestra Título cuando 7 de 10 están estables y no toca V2", () => {
    const estable = {
      ...fixture(),
      characterSignedCode: 3 as const,
      syntacticVacios: [1, 2] as DepotAnalysisResult["syntacticVacios"],
      syntaxDiagnostic: {
        detectedSyntaxCode: 3 as const,
        focoCode: 3 as const,
        isCableadoConnected: true,
        syntaxCharacteristics: "Firma estable.",
      },
      groundingStatus: {
        isFullyGrounded: true,
        diagnosticMessage: "Firma cableada.",
      },
    };
    const entries = Array.from({ length: 7 }, (_, i) => ({
      id: `e${i}`,
      userId: "u1",
      createdAt: new Date(2026, 0, i + 1),
      rawFact: "secuencia medida",
      userTier: "CARRERA" as const,
      result: { ...estable, id: `depot_${i}`, timestamp: i + 1 },
      source: "local_fallback" as const,
    }));
    const html = renderToStaticMarkup(
      createElement(GradoConsistenciaV3, { entries }),
    );
    assert.match(html, /deposito-v3-grado/);
    assert.match(html, />TITULO</);
    assert.match(html, /7 de 7 volcados estables/);
    assert.match(html, /deposito-v3-grado-firma/);
    assert.doesNotMatch(html, /OJO DOMINANTE/);
    assert.doesNotMatch(html, /doble canal/i);
  });

  it("no rendera sin historial", () => {
    const html = renderToStaticMarkup(
      createElement(GradoConsistenciaV3, { entries: [] }),
    );
    assert.equal(html, "");
  });
});

describe("DictamenCardV3", () => {
  it("muestra firma, vacíos y ajuste frío, sin Δ ni Óptica", () => {
    const html = renderToStaticMarkup(
      createElement(DictamenCardV3, { result: fixture() }),
    );
    assert.match(html, /deposito-v3-dictamen/);
    assert.match(html, /C3 · Trabajo/);
    assert.match(html, /deposito-v3-foco/);
    assert.match(html, /Foco de revelación/);
    assert.match(html, /C8 · Ciclos/);
    assert.match(html, /Ritmo|Secuencia Vectorial/);
    assert.match(html, /Ley de Polaridad \(C8\)/);
    assert.match(html, /Ajuste técnico inmediato · C8/);
    assert.match(html, /deposito-v3-cableado/);
    assert.match(html, /Cableado título↔cierre: conectado/);
    assert.match(html, /deposito-v3-vacios/);
    assert.match(html, /C1 · C2 · C4/);
    assert.doesNotMatch(html, /Δ 4/);
    assert.doesNotMatch(html, /Ojo de percepción/);
    assert.doesNotMatch(html, /Causa real de ingeniería/);
  });
});
