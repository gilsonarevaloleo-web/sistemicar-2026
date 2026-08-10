import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcularMetricasUmbral } from "./metrics.ts";
import {
  aplicarEvaluacionASesion,
  crearSesionUmbral,
} from "./sessionLogic.ts";
import type { SesionUmbral } from "./sessionTypes.ts";

function sesionConFriccion(): SesionUmbral {
  let s = crearSesionUmbral({
    id: "arena-1",
    userId: "u1",
    modo: "EXTERNO_VENTAS",
  });
  // 3 rechazos + 1 aprobación en código 4
  for (let i = 0; i < 3; i++) {
    s = aplicarEvaluacionASesion(s, {
      codigo: 4,
      aprobado: false,
      respuestaUsuario: `intento ${i}`,
      feedbackGemini: "No.",
      codigoSiguiente: 4,
    });
  }
  s = aplicarEvaluacionASesion(s, {
    codigo: 4,
    aprobado: true,
    respuestaUsuario: "Evidencia seria sin flor.",
    feedbackGemini: "Ok.",
    codigoSiguiente: 5,
  });
  // Corte limpio en código 5
  s = aplicarEvaluacionASesion(s, {
    codigo: 5,
    aprobado: true,
    respuestaUsuario: "ROI 2.1x en 90 días, rango 1.5–2.5.",
    feedbackGemini: "Números claros.",
    codigoSiguiente: 6,
  });
  return s;
}

describe("Umbral v2 — metrics", () => {
  it("sin sesiones: métricas en cero", () => {
    const m = calcularMetricasUmbral([]);
    assert.equal(m.totalSesiones, 0);
    assert.equal(m.tasaCorteLimpio, 0);
    assert.equal(m.cuelloBotella, null);
  });

  it("detecta cuello de botella y recomienda arquetipo en La Arena", () => {
    const m = calcularMetricasUmbral([sesionConFriccion()]);
    assert.ok(m.cuelloBotella);
    assert.equal(m.cuelloBotella?.codigo, 4);
    assert.equal(m.cuelloBotella?.modo, "EXTERNO_VENTAS");
    assert.match(m.cuelloBotella?.arquetipoNombre ?? "", /Cínico/i);
    assert.match(m.cuelloBotella?.recomendacion ?? "", /trauma|evidencia|flor/i);
    assert.equal(m.friccionArena[3].intentos, 4);
  });

  it("tasa de corte limpio cuenta aprobados al primer intento", () => {
    const m = calcularMetricasUmbral([sesionConFriccion()]);
    // C4 con 4 intentos (no limpio) + C5 con 1 (limpio) → 50%
    assert.equal(m.codigosAprobados, 2);
    assert.equal(m.cortesLimpios, 1);
    assert.equal(m.tasaCorteLimpio, 50);
  });

  it("separa fricción Forja vs Arena", () => {
    let forja = crearSesionUmbral({
      id: "forja-1",
      userId: "u1",
      modo: "INTERNO_HABILIDAD",
    });
    forja = aplicarEvaluacionASesion(forja, {
      codigo: 1,
      aprobado: false,
      respuestaUsuario: "a",
      feedbackGemini: "no",
      codigoSiguiente: 1,
    });
    forja = aplicarEvaluacionASesion(forja, {
      codigo: 1,
      aprobado: true,
      respuestaUsuario: "Excusa puntual nombrada con densidad.",
      feedbackGemini: "ok",
      codigoSiguiente: 2,
    });

    const m = calcularMetricasUmbral([forja, sesionConFriccion()]);
    assert.equal(m.friccionForja[0].intentos, 2);
    assert.equal(m.friccionArena[3].intentos, 4);
    assert.ok((m.cuelloBotella?.intentos ?? 0) >= 4);
  });
});
