import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatearAuditoriaJuez,
  publicHistorialItem,
} from "./historial.ts";
import type { SesionJuez } from "./sesion.ts";

function sesion(parcial: Partial<SesionJuez> = {}): SesionJuez {
  return {
    id: "s1",
    userId: "u1",
    textoVolcado: "Hoy el pistón no paró.",
    fase1: {
      codigoProblemaDetectado: 4,
      codigoQueHabla: 4,
      codigoConquistadoMax: 3,
      participaciones: [{ codigo: 4, fuerza: "Desnudar" }],
      codigoQueCerroTeorico: null,
      fuerzaUsada: null,
      fuerzaDebida: 3,
      cascadaCumple: false,
      desajusteFuerza: "Habla C4.",
      fugaInconsciente: "La vía de agua es la coartada.",
      lecturaPerimetroFria: "El problema habita en C4.",
    },
    fase2: {
      requiereInversionCreditos: true,
      confrontacionDeFuerza: "Interrumpí el pistón automático.",
      directivaOperacional: "Interrumpí el pistón automático.",
    },
    source: "local_fallback",
    estado: "FASE1",
    createdAt: "2026-10-21T20:05:00.000Z",
    updatedAt: "2026-10-21T20:05:00.000Z",
    ...parcial,
  };
}

describe("historial Juez Serio", () => {
  it("en Fase 1 no filtra la directiva", () => {
    const item = publicHistorialItem(sesion());
    assert.equal(item.fase2Desbloqueada, false);
    assert.equal(item.directivaOperacional, null);
    assert.equal(item.textoVolcado, "Hoy el pistón no paró.");
    const texto = formatearAuditoriaJuez(item);
    assert.match(texto, /¿Cuál es tu problema\?/);
    assert.match(texto, /C4 Estructura/);
    assert.match(texto, /C1 → C3 Trabajo/);
    assert.match(texto, /sin desbloquear/);
    assert.match(texto, /CONFRONTACIÓN DE FUERZA/);
    assert.doesNotMatch(texto, /Interrumpí el pistón/);
  });

  it("en Fase 2 incluye la confrontación", () => {
    const item = publicHistorialItem(sesion({ estado: "FASE2_ABIERTA" }));
    assert.equal(item.fase2Desbloqueada, true);
    assert.match(item.directivaOperacional ?? "", /Interrumpí/);
    assert.match(item.confrontacionDeFuerza ?? "", /Interrumpí/);
    const texto = formatearAuditoriaJuez(item);
    assert.match(texto, /CONFRONTACIÓN DE FUERZA/);
    assert.match(texto, /Interrumpí el pistón automático/);
  });
});
