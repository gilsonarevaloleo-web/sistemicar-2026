import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SesionUmbral5 } from "./sesion.ts";
import {
  cabeceraVolcado,
  etiquetaCanalVolcado,
  formatearCopiaVolcado,
  formatearFechaVolcado,
  numeroVolcado,
  ordenarVolcadosPorCreacion,
} from "./historial.ts";

function sesion(
  over: Partial<SesionUmbral5> & Pick<SesionUmbral5, "id" | "createdAt">,
): SesionUmbral5 {
  return {
    userId: "u1",
    textoVolcado: "El límite ya lo sé.",
    lectura: null,
    source: "local_gratis",
    estado: "VOLCADO_GRATIS",
    updatedAt: over.updatedAt ?? over.createdAt,
    ...over,
  };
}

describe("Casa 6 — orden y copia de volcados", () => {
  it("numera por createdAt y el mapa no reordena", () => {
    const viejo = sesion({
      id: "a",
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-03T10:00:00.000Z",
      estado: "MAPA_PAGO",
      textoVolcado: "primero",
    });
    const nuevo = sesion({
      id: "b",
      createdAt: "2026-01-02T10:00:00.000Z",
      updatedAt: "2026-01-02T10:00:00.000Z",
      textoVolcado: "segundo",
    });
    const orden = ordenarVolcadosPorCreacion([viejo, nuevo]);
    assert.equal(orden[0]?.id, "b");
    assert.equal(orden[1]?.id, "a");
    assert.equal(numeroVolcado([viejo, nuevo], "a"), 1);
    assert.equal(numeroVolcado([viejo, nuevo], "b"), 2);
  });

  it("formatea fecha, canal y el texto completo para copiar", () => {
    const s = sesion({
      id: "s1",
      createdAt: "2026-01-01T00:00:00.000Z",
      textoVolcado: "Hoy mi límite ha sido no poder abstenerne.",
      lectura: {
        codigoLimite: 1,
        polo: "contra",
        codigoUsuario: 1,
        pisoIntento: 1,
        tipoLimite: null,
        lecturaFria: "Canal C1 Identidad.",
        porQueNoEjecuta: "No hay cimiento.",
        moduloGimnasio: null,
      },
    });
    assert.equal(etiquetaCanalVolcado(s), "C1");
    assert.match(cabeceraVolcado(s, 1), /Volcado 1 · /);
    assert.match(cabeceraVolcado(s, 1), /C1/);
    const copia = formatearCopiaVolcado(s, 1);
    assert.match(copia, /¿Cuál es tu límite\?/);
    assert.match(copia, /Hoy mi límite ha sido no poder abstenerne/);
    assert.match(copia, /Canal C1 Identidad/);
    assert.match(copia, /Fecha y hora: /);
    assert.equal(formatearFechaVolcado("no-es-fecha"), "no-es-fecha");
  });
});
