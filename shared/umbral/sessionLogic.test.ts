import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aplicarEvaluacionASesion,
  crearSesionUmbral,
  estimarPsCodigoAprobado,
  intentosPorCodigoDeSesion,
} from "./sessionLogic.ts";

describe("Umbral v2 — sessionLogic", () => {
  it("crearSesionUmbral inicia EN_PROGRESO en código 1", () => {
    const s = crearSesionUmbral({
      id: "s1",
      userId: "u1",
      modo: "INTERNO_HABILIDAD",
      nowIso: "2026-01-01T00:00:00.000Z",
    });
    assert.equal(s.estado, "EN_PROGRESO");
    assert.equal(s.codigoActual, 1);
    assert.equal(s.intentosTotales, 0);
    assert.equal(s.historialCodigos.length, 0);
  });

  it("rechazo acumula intentos sin avanzar", () => {
    let s = crearSesionUmbral({
      id: "s1",
      userId: "u1",
      modo: "EXTERNO_VENTAS",
    });
    s = aplicarEvaluacionASesion(s, {
      codigo: 1,
      aprobado: false,
      respuestaUsuario: "pitch genérico",
      feedbackGemini: "Sin utilidad.",
      codigoSiguiente: 1,
    });
    s = aplicarEvaluacionASesion(s, {
      codigo: 1,
      aprobado: false,
      respuestaUsuario: "otro intento",
      feedbackGemini: "Sigue vago.",
      codigoSiguiente: 1,
    });
    assert.equal(s.intentosTotales, 2);
    assert.equal(s.intentosCodigoActual, 2);
    assert.equal(s.codigoActual, 1);
    assert.equal(s.historialCodigos.length, 0);
    assert.deepEqual(intentosPorCodigoDeSesion(s), { 1: 2 });
  });

  it("aprobación registra historial, PS y avanza", () => {
    let s = crearSesionUmbral({
      id: "s1",
      userId: "u1",
      modo: "INTERNO_HABILIDAD",
    });
    s = aplicarEvaluacionASesion(s, {
      codigo: 1,
      aprobado: false,
      respuestaUsuario: "corto",
      feedbackGemini: "No.",
      codigoSiguiente: 1,
    });
    s = aplicarEvaluacionASesion(s, {
      codigo: 1,
      aprobado: true,
      respuestaUsuario: "Excusa puntual: abrir el celular antes de vender.",
      feedbackGemini: "Avanzas.",
      codigoSiguiente: 2,
      nowIso: "2026-01-02T12:00:00.000Z",
    });
    assert.equal(s.codigoActual, 2);
    assert.equal(s.intentosCodigoActual, 0);
    assert.equal(s.historialCodigos.length, 1);
    assert.equal(s.historialCodigos[0].intentos, 2);
    assert.equal(s.historialCodigos[0].psGanados, estimarPsCodigoAprobado(1, 2));
    assert.equal(s.estado, "EN_PROGRESO");
  });

  it("código 10 aprobado completa el módulo", () => {
    let s = crearSesionUmbral({
      id: "s1",
      userId: "u1",
      modo: "INTERNO_HABILIDAD",
      codigoActual: 10,
    });
    s = aplicarEvaluacionASesion(s, {
      codigo: 10,
      aprobado: true,
      respuestaUsuario: "Asumo el rol.",
      feedbackGemini: "Dominio.",
      codigoSiguiente: null,
    });
    assert.equal(s.estado, "COMPLETADO");
    assert.equal(s.historialCodigos.length, 1);
    assert.ok(
      s.historialCodigos[0].psGanados >= estimarPsCodigoAprobado(10, 1),
    );
  });

  it("corte limpio otorga más PS que reintento", () => {
    const limpio = estimarPsCodigoAprobado(4, 1);
    const reintento = estimarPsCodigoAprobado(4, 3);
    assert.ok(limpio > reintento);
  });

  it("repasar un código ya aprobado agrega otro logro y no cierra el módulo", () => {
    let s = crearSesionUmbral({
      id: "s1",
      userId: "u1",
      modo: "INTERNO_HABILIDAD",
    });
    s = aplicarEvaluacionASesion(s, {
      codigo: 1,
      aprobado: true,
      respuestaUsuario: "Primer pase: excusa puntual del celular.",
      feedbackGemini: "Avanzas.",
      codigoSiguiente: 2,
      nowIso: "2026-08-01T10:00:00.000Z",
    });
    s = aplicarEvaluacionASesion(s, {
      codigo: 1,
      aprobado: true,
      respuestaUsuario: "Repaso: la misma excusa, ahora con horario.",
      feedbackGemini: "Sigue válido.",
      codigoSiguiente: 2,
      nowIso: "2026-08-02T10:00:00.000Z",
    });
    assert.equal(s.estado, "EN_PROGRESO");
    assert.equal(s.historialCodigos.length, 2);
    assert.equal(s.historialCodigos[0].codigo, 1);
    assert.equal(s.historialCodigos[1].codigo, 1);
    assert.match(s.historialCodigos[1].respuestaAprobada, /Repaso/);
    assert.equal(s.codigoActual, 2);
  });

  it("diez códigos únicos cierran el módulo; un repaso extra no lo reabre", () => {
    let s = crearSesionUmbral({
      id: "s1",
      userId: "u1",
      modo: "INTERNO_HABILIDAD",
    });
    for (let n = 1; n <= 10; n++) {
      const codigo = n as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
      s = aplicarEvaluacionASesion(s, {
        codigo,
        aprobado: true,
        respuestaUsuario: `Pase denso del código ${n} con acción concreta.`,
        feedbackGemini: "Ok.",
        codigoSiguiente: n < 10 ? ((n + 1) as 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) : null,
      });
    }
    assert.equal(s.estado, "COMPLETADO");
    assert.equal(new Set(s.historialCodigos.map((h) => h.codigo)).size, 10);
    s = aplicarEvaluacionASesion(s, {
      codigo: 3,
      aprobado: true,
      respuestaUsuario: "Repaso del 3 después de cerrar el módulo.",
      feedbackGemini: "Ok.",
      codigoSiguiente: 4,
    });
    assert.equal(s.estado, "COMPLETADO");
    assert.equal(s.historialCodigos.length, 11);
  });
});
