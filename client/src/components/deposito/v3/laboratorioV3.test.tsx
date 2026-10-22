import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildActiveCharacterMap,
  cerebroVacio,
  formatFechaPrincipio,
  type CerebroMadre,
  type DepotAnalysisResult,
} from "@shared/deposito/v3";
import { FormularioAuditoriaV3 } from "./FormularioAuditoriaV3.tsx";
import { MapaCalorV3 } from "./MapaCalorV3.tsx";
import { DictamenCardV3 } from "./DictamenCardV3.tsx";
import { HistorialV3 } from "./HistorialV3.tsx";
import { GradoConsistenciaV3 } from "./GradoConsistenciaV3.tsx";
import { CerebroMadreV3 } from "./CerebroMadreV3.tsx";

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
    assert.match(html, /HISTORIAL DE AUDITORÍAS/);
    assert.match(html, /deposito-v3-historial-reductor/);
    assert.match(html, /<select/);
    assert.match(html, /C3 Trabajo/);
    assert.match(html, /Vi el patrón a las 9:00/);
    assert.match(html, /Copiar Auditoría/);
    assert.match(html, /ver volcado/);
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
    assert.match(html, /Escalón de la cascada/);
    assert.match(html, /C8 · Ciclos/);
    assert.match(html, /Ritmo|Secuencia Vectorial/);
    assert.match(html, /Ley de Polaridad \(C8\)/);
    assert.match(html, /Ajuste de percepción · C8/);
    assert.match(html, /deposito-v3-cableado/);
    assert.match(html, /Cableado título↔cierre: conectado/);
    assert.match(html, /deposito-v3-vacios/);
    assert.match(html, /C1 · C2 · C4/);
    assert.doesNotMatch(html, /Δ 4/);
    assert.doesNotMatch(html, /Ojo de percepción/);
    assert.doesNotMatch(html, /Causa real de ingeniería/);
  });
});

describe("CerebroMadreV3", () => {
  const nacimiento = Date.UTC(2026, 9, 18, 12, 0, 0);

  function cerebroConCandidato(): CerebroMadre {
    return {
      principios: [
        {
          id: "cm_test",
          createdAt: nacimiento,
          estado: "candidato",
          foco: 7,
          firma: 2,
          percepcion: "Visión",
          escritura: "escribí el patrón en una frase",
          enunciado:
            "Para que tu percepción de C7 (Visión) se desarrolle, escribí el patrón en una frase.",
          acomodo:
            "Acomodo: el relato narra en C2 (Flujo) y la revelación se forja en C7 (Visión).",
          anclas: ["patron"],
          usos: 1,
          pedidos: 1,
          confirmados: 1,
        },
      ],
    };
  }

  it("muestra las tres bandejas, la fecha de creación y no publica sola", () => {
    const html = renderToStaticMarkup(
      createElement(CerebroMadreV3, {
        cerebro: cerebroConCandidato(),
        onEnviarAFiltro: () => {},
        onPromover: () => {},
        onRechazar: () => {},
      }),
    );
    assert.match(html, /deposito-v3-cerebro-madre/);
    assert.match(html, /CEREBRO MADRE|Recinto de casa/i);
    assert.match(html, /deposito-v3-cm-candidatos/);
    assert.match(html, /deposito-v3-cm-filtro/);
    assert.match(html, /deposito-v3-cm-leyes/);
    assert.match(html, /No publica sola/);
    assert.match(html, /Creado · /);
    assert.ok(html.includes(formatFechaPrincipio(nacimiento)));
    assert.match(html, /18 oct 2026/);
    assert.match(html, /Enviar a filtro/);
    assert.match(html, /deposito-v3-cm-acomodo-cm_test/);
    assert.match(html, /narra en C2/);
    assert.match(html, /deposito-v3-cm-medida-cm_test/);
    assert.match(html, /Próximo · 1\/1 construyeron C7/);
    assert.doesNotMatch(html, /Promover a ley/);
    assert.doesNotMatch(html, /axioma del operador|Criterio Vivo/i);
  });

  it("vacío cita la firma de casa", () => {
    const html = renderToStaticMarkup(
      createElement(CerebroMadreV3, {
        cerebro: cerebroVacio(),
        onEnviarAFiltro: () => {},
        onPromover: () => {},
        onRechazar: () => {},
      }),
    );
    assert.match(html, /No publica sola/);
    assert.match(html, /Bandeja vacía/);
  });
});
