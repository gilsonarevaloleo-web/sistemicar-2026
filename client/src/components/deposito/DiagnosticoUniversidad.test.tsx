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

describe("DiagnosticoUniversidad", () => {
  it("muestra ojo dominante, punto ciego y mecánica de absorción", () => {
    const diagnostico = diagnosticarVolcadoLocal(
      "Hoy repetí la secuencia tres veces: primero el corte, después el orden, luego el ritmo. Confundí velocidad con avance.",
    );
    const texto =
      "Hoy repetí la secuencia tres veces: primero el corte, después el orden, luego el ritmo. Confundí velocidad con avance.";
    const html = renderToStaticMarkup(
      createElement(DiagnosticoUniversidad, {
        diagnostico,
        lectura: calcularGradoVolcado(texto, diagnostico),
        expediente: calcularExpedienteOjos([diagnostico.codigoDominante]),
      }),
    );
    assert.match(html, /OJO DOMINANTE/);
    assert.match(html, /PUNTO CIEGO/);
    assert.match(html, /MECÁNICA DE ABSORCIÓN/);
    assert.match(html, /El Ojo del Ritmo/);
    assert.match(html, /G\d/);
    assert.match(html, /EXPEDIENTE/);
    assert.doesNotMatch(html, /C1 y C2/);
  });
});
