import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DiagnosticoUniversidad } from "./DiagnosticoUniversidad.tsx";
import { diagnosticarVolcadoLocal } from "@shared/deposito/engineConfig.ts";
import {
  calcularExpedienteOjos,
  calcularGradoVolcado,
} from "@shared/deposito/grados.ts";

const RITMO =
  "Hoy repetí la secuencia tres veces: primero el corte, después el orden, luego el ritmo. Confundí velocidad con avance.";

const SECO = `Hoy a las 9:10 llamé al cliente. Pedí 40 mil. Dijo que no. Anoté el rechazo. El sesgo: yo suelo disculparme. No lo hice. No dije «después veo». Cerré a las 9:14.`;

describe("DiagnosticoUniversidad", () => {
  it("muestra ojo dominante, punto ciego y mecánica de absorción", () => {
    const base = diagnosticarVolcadoLocal(RITMO);
    const diagnostico = {
      ...base,
      evaluacionGrado: {
        gradoDetectado: 1 as const,
        meritoReconocido: false,
        mensajeEncuadre: "Calibración G1.",
      },
    };
    const html = renderToStaticMarkup(
      createElement(DiagnosticoUniversidad, {
        diagnostico,
        lectura: calcularGradoVolcado(RITMO, diagnostico),
        expediente: calcularExpedienteOjos([diagnostico.codigoDominante]),
      }),
    );
    assert.match(html, /OJO DOMINANTE/);
    assert.match(html, /PUNTO CIEGO/);
    assert.match(html, /MECÁNICA DE ABSORCIÓN/);
    assert.match(html, /El Ojo del Ritmo/);
    assert.match(html, /VALIDACIÓN DE GRADO/);
    assert.match(html, /PLACEMENT/);
    assert.match(html, /MÉRITO · 3 EJES/);
    assert.match(html, new RegExp(`Rotación C${diagnostico.codigoDominante}`));
    assert.match(html, /G\d/);
    assert.match(html, /MAPA DE CALOR/);
    assert.doesNotMatch(html, /C1 y C2/);
  });

  it("mérito G3 oculta G1 y deja solo Arquitecto de Punto Ciego", () => {
    const base = diagnosticarVolcadoLocal({
      gradoMaestria: 1,
      volcadoCrudo: SECO,
    });
    assert.equal(base.evaluacionGrado?.meritoReconocido, true);
    assert.equal(base.evaluacionGrado?.gradoDetectado, 3);

    const diagnostico = {
      ...base,
      nivelCargaSugerido: "SUPERIOR" as const,
      validacionGrado: {
        gradoEvaluado: 1 as const,
        comentarioMaestro: "Operó en la barra de G1.",
      },
    };
    const html = renderToStaticMarkup(
      createElement(DiagnosticoUniversidad, {
        diagnostico,
        lectura: {
          grado: "APRENDIZ_OJO",
          codigoDominante: diagnostico.codigoDominante,
          nombreOjoDominante: diagnostico.nombreOjoDominante,
          capas: {
            senal: "hecho",
            ruido: "sin flor",
            noDicho: "omisión",
          },
        },
        expediente: {
          ...calcularExpedienteOjos([diagnostico.codigoDominante]),
          gradoOperador: "APRENDIZ_OJO",
        },
      }),
    );
    assert.match(html, /Carga Superior/);
    assert.match(html, /G3 · Arquitecto de Punto Ciego/);
    assert.doesNotMatch(html, /VALIDACIÓN DE GRADO 1/);
    assert.doesNotMatch(html, /G1 · Aprendiz de Ojo/);
    assert.doesNotMatch(html, /PLACEMENT · MÉRITO G3/);
    const badgesG3 = html.match(/G3 · Arquitecto de Punto Ciego/g) ?? [];
    assert.ok(badgesG3.length >= 1);
  });

  it("G3 detectado sin mérito también oculta G1/G2 en Carga Superior", () => {
    const base = diagnosticarVolcadoLocal(SECO);
    const diagnostico = {
      ...base,
      nivelCargaSugerido: "SUPERIOR" as const,
      evaluacionGrado: {
        gradoDetectado: 3 as const,
        meritoReconocido: false,
        mensajeEncuadre: "Calibración G3.",
      },
      validacionGrado: {
        gradoEvaluado: 1 as const,
        comentarioMaestro: "Operó en la barra de G1.",
      },
    };
    const html = renderToStaticMarkup(
      createElement(DiagnosticoUniversidad, {
        diagnostico,
        lectura: {
          grado: "APRENDIZ_OJO",
          codigoDominante: diagnostico.codigoDominante,
          nombreOjoDominante: diagnostico.nombreOjoDominante,
          capas: { senal: "hecho", ruido: "sin flor", noDicho: "omisión" },
        },
        expediente: {
          ...calcularExpedienteOjos([diagnostico.codigoDominante]),
          gradoOperador: "APRENDIZ_OJO",
        },
      }),
    );
    assert.match(html, /Carga Superior/);
    assert.match(html, /G3 · Arquitecto de Punto Ciego/);
    assert.doesNotMatch(html, /VALIDACIÓN DE GRADO 1/);
    assert.doesNotMatch(html, /G1 · Aprendiz de Ojo/);
    assert.doesNotMatch(html, /G2 · Detector de Ruido/);
  });

  it("rotación C1 por fatiga de C4 se lee en el pie, no el dominante", () => {
    const diagnostico = diagnosticarVolcadoLocal(
      "Hoy a las 8:10 aprendí que ante la incomodidad la mente opera en 3 capas: la intención, el automatismo biológico y el deber moral. Los 10 códigos no son adorno. C4 · Seriedad/Producción se sobre-explota hasta la fatiga y tapa C1 · Cimiento/Dopamina. El circuito es causa-efecto: la culpa moral exige más control y niega nutrición y descanso. Analogía de estructura: la matriz no es un inventario, es física seca. El sesgo: yo suelo cubrir la fatiga con un gesto de prevención. Anoté las 3 capas. No hay flor. Cerré a las 8:40.",
    );
    assert.equal(diagnostico.metricasMerito?.variedadRotacionCodigo, "C1");
    const html = renderToStaticMarkup(
      createElement(DiagnosticoUniversidad, { diagnostico }),
    );
    assert.match(html, /Rotación C1/);
    assert.match(html, /nutrición y descanso biológico/);
    assert.match(html, /desmantelado en su física seca/);
  });
});
