import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildActiveCharacterMap,
  calendarioAsistencia,
  cerebroVacio,
  formatFechaPrincipio,
  libroVacio,
  marcarSesionCumplida,
  medirEvolucionOjos,
  preguntaConciencia,
  registrarIntencion,
  resumenAsistencia,
  type CerebroMadre,
  type DepotAnalysisResult,
} from "@shared/deposito/v3";
import { FormularioAuditoriaV3 } from "./FormularioAuditoriaV3.tsx";
import { MapaCalorV3 } from "./MapaCalorV3.tsx";
import { DictamenCardV3 } from "./DictamenCardV3.tsx";
import { HistorialV3 } from "./HistorialV3.tsx";
import { GradoConsistenciaV3 } from "./GradoConsistenciaV3.tsx";
import { CerebroMadreV3 } from "./CerebroMadreV3.tsx";
import { VentanaConcienciaAsistencia } from "./VentanaConcienciaAsistencia.tsx";
import { ControlAsistencia } from "./ControlAsistencia.tsx";
import { GraficoEvolucionOjos } from "./GraficoEvolucionOjos.tsx";
import { MensajeSesionCumplida } from "./MensajeSesionCumplida.tsx";

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

  it("ancla el laboratorio para el sí de la ventana", () => {
    const html = renderToStaticMarkup(
      createElement(FormularioAuditoriaV3, {
        userTier: "MATRICULA",
        onAnalysisComplete: () => {},
      }),
    );
    assert.match(html, /id="deposito-v3-sesion"/);
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

  it("C10 FOCO vacío no se pinta como activo: muestra VACÍO y data-activo=0", () => {
    const result: DepotAnalysisResult = {
      ...fixture(),
      characterSignedCode: 8,
      focoRevelacionCode: 10,
      activeCharacterMap: buildActiveCharacterMap([1, 2, 3, 4, 5, 6, 7, 8]),
      syntacticVacios: [9, 10],
      syntaxDiagnostic: {
        detectedSyntaxCode: 8,
        focoCode: 10,
        isCableadoConnected: false,
        syntaxCharacteristics: "Sierra C8 hacia el escalón C10.",
      },
      groundingStatus: {
        isFullyGrounded: false,
        diagnosticMessage:
          "ENLACE_EN_TRANSMUTACIÓN. Falta C10 para abrochar el título con la última oración.",
      },
    };
    const html = renderToStaticMarkup(
      createElement(MapaCalorV3, {
        result,
        userTier: "CARRERA",
      }),
    );
    const c8 = html.match(
      /data-testid="deposito-v3-eye-8"[\s\S]*?<\/li>/,
    )?.[0];
    const c10 = html.match(
      /data-testid="deposito-v3-eye-10"[\s\S]*?<\/li>/,
    )?.[0];
    assert.ok(c8);
    assert.ok(c10);
    assert.match(c8, /data-activo="1"/);
    assert.match(c8, /data-foco="0"/);
    assert.match(c10, /data-foco="1"/);
    assert.match(c10, /data-vacio="1"/);
    assert.match(c10, /data-activo="0"/);
    assert.match(c10, />VACÍO</);
    assert.match(c10, />FOCO</);
    assert.match(c10, /background-color:transparent/);
    assert.doesNotMatch(c10, /#D4AF3722/);
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
          aplicacion: "",
          anclas: ["patron"],
          usos: 1,
          pedidos: 1,
          confirmados: 1,
        },
      ],
    };
  }

  function cerebroConFiltro(): CerebroMadre {
    const base = cerebroConCandidato().principios[0];
    return {
      principios: [
        {
          ...base,
          id: "cm_filtro",
          estado: "filtro",
          foco: 9,
          firma: 9,
          percepcion: "Sistema",
          enunciado:
            "Por eso digo que el cansancio solo es enfoque en lo mismo a mayor de 90 minutos.",
          aplicacion: "",
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
        onEscribirAplicacion: () => {},
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
    assert.match(html, /deposito-v3-cm-oraculo/);
    assert.match(html, /deposito-v3-cm-oraculo-input/);
    assert.match(html, /Qué dice Sistemicar/);
  });

  it("en filtro pide la aplicación operativa antes de promover", () => {
    const html = renderToStaticMarkup(
      createElement(CerebroMadreV3, {
        cerebro: cerebroConFiltro(),
        onEnviarAFiltro: () => {},
        onPromover: () => {},
        onRechazar: () => {},
        onEscribirAplicacion: () => {},
      }),
    );
    assert.match(html, /deposito-v3-cm-aplicacion-cm_filtro/);
    assert.match(html, /APLICACIÓN OPERATIVA/);
    assert.match(html, /Promover a ley/);
    assert.match(html, /deposito-v3-cm-oraculo/);
  });
});

describe("VentanaConcienciaAsistencia", () => {
  it("nombra fecha-disciplina y deja entrar con sí o no", () => {
    const html = renderToStaticMarkup(
      createElement(VentanaConcienciaAsistencia, {
        pregunta: preguntaConciencia(Date.UTC(2026, 10, 1, 15, 32, 0)),
        onSi: () => {},
        onNo: () => {},
      }),
    );
    assert.match(html, /deposito-conciencia-modal/);
    assert.match(html, /¿Vas a iniciar tu sesión de Depósito hoy\?/);
    assert.match(html, /domingo · 1 de noviembre de 2026 · 10:32/);
    assert.match(html, /deposito-conciencia-si/);
    assert.match(html, /deposito-conciencia-no/);
    assert.match(html, /persistencia del estudio/);
  });
});

describe("ControlAsistencia", () => {
  it("marca días con sesión y días sin sesión", () => {
    let libro = marcarSesionCumplida(libroVacio(), "2026-10-28");
    libro = registrarIntencion(libro, "2026-10-31", "no");
    const celdas = calendarioAsistencia(libro, "2026-11-01", 4);
    const html = renderToStaticMarkup(
      createElement(ControlAsistencia, {
        celdas,
        resumen: resumenAsistencia(celdas),
      }),
    );
    assert.match(html, /deposito-asistencia/);
    assert.match(html, /1 con sesión/);
    assert.match(html, /sin sesión/);
    assert.match(html, /data-estado="cumplida"/);
    assert.match(html, /data-estado="dijo_no"/);
    assert.match(html, /data-hoy="1"/);
  });
});

describe("GraficoEvolucionOjos", () => {
  it("declara cascada como medida y presencia como no-evolución", () => {
    const evo = medirEvolucionOjos([
      {
        result: {
          ...fixture(),
          activeCharacterMap: buildActiveCharacterMap([1, 2, 4]),
          syntacticVacios: [3, 5, 6, 7, 8, 9, 10],
          timestamp: 1,
        },
      },
    ]);
    const html = renderToStaticMarkup(
      createElement(GraficoEvolucionOjos, { evo }),
    );
    assert.match(html, /deposito-evolucion/);
    assert.match(html, /no la cantidad de volcados/);
    assert.match(html, /PRESENCIA · no es evolución/);
    assert.match(html, /deposito-evolucion-peldano-4/);
    assert.match(html, /data-alcanzado="1"/);
  });
});

describe("MensajeSesionCumplida", () => {
  it("sella la persistencia sin bloquear el dictamen", () => {
    const html = renderToStaticMarkup(createElement(MensajeSesionCumplida));
    assert.match(html, /deposito-sesion-cumplida/);
    assert.match(html, /Sesión Sistemicar cumplida/);
    assert.match(html, /Continúa así con tu desarrollo/);
  });
});

describe("CerebroMadreV3 vacio extra", () => {
  it("vacío cita la firma de casa", () => {
    const html = renderToStaticMarkup(
      createElement(CerebroMadreV3, {
        cerebro: cerebroVacio(),
        onEnviarAFiltro: () => {},
        onPromover: () => {},
        onRechazar: () => {},
        onEscribirAplicacion: () => {},
      }),
    );
    assert.match(html, /No publica sola/);
    assert.match(html, /Bandeja vacía/);
  });
});
