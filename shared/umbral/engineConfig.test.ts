import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CODIGOS_NUMERO,
  DICCIONARIO_CODIGOS,
  obtenerCodigo,
  obtenerPromptEvaluacion,
  resolverCodigoSiguiente,
  siguienteCodigo,
  type CodigoNumero,
  type ModoUmbral,
} from "./engineConfig.ts";

describe("Umbral v2 — engineConfig", () => {
  it("DICCIONARIO_CODIGOS cubre 1–10 sin huecos", () => {
    assert.equal(CODIGOS_NUMERO.length, 10);
    for (const n of CODIGOS_NUMERO) {
      const c = DICCIONARIO_CODIGOS[n];
      assert.equal(c.numero, n);
      assert.ok(c.nombre.length > 0);
      assert.ok(c.conceptoClave.length > 0);
      assert.ok(c.modoInterno.preguntaDisparadora.length > 0);
      assert.ok(c.modoInterno.estadoMentalUsuario.length > 0);
      assert.ok(c.modoInterno.criterioAprobacion.length > 0);
      assert.ok(c.modoInterno.instruccionEvaluadorGemini.length > 0);
      assert.ok(c.modoExterno.objecionCliente.length > 0);
      assert.ok(c.modoExterno.estadoMentalCliente.length > 0);
      assert.ok(c.modoExterno.criterioAprobacionVendedor.length > 0);
      assert.ok(c.modoExterno.instruccionEvaluadorGemini.length > 0);
    }
  });

  it("nombres canónicos de códigos clave", () => {
    assert.match(obtenerCodigo(1).nombre, /Claridad/i);
    assert.match(obtenerCodigo(4).nombre, /Seriedad/i);
    assert.match(obtenerCodigo(10).nombre, /Dominio Total/i);
  });

  it("siguienteCodigo avanza hasta null en 10", () => {
    assert.equal(siguienteCodigo(1), 2);
    assert.equal(siguienteCodigo(9), 10);
    assert.equal(siguienteCodigo(10), null);
  });

  it("resolverCodigoSiguiente aplica regla de avance parte 2", () => {
    assert.equal(resolverCodigoSiguiente(false, 4), 4);
    assert.equal(resolverCodigoSiguiente(true, 4), 5);
    assert.equal(resolverCodigoSiguiente(true, 10), null);
  });

  it("obtenerPromptEvaluacion (interno) incluye criterio y schema JSON", () => {
    const prompt = obtenerPromptEvaluacion({
      codigo: 4,
      modo: "INTERNO_HABILIDAD",
      respuestaUsuario: "Hoy corto la flor y hago la acción mínima: una llamada.",
      historialPrevio: [{ rol: "user", texto: "intento previo vago" }],
    });
    assert.equal(prompt.codigo, 4);
    assert.equal(prompt.modo, "INTERNO_HABILIDAD");
    assert.match(prompt.system, /INTERNO_HABILIDAD/);
    assert.match(prompt.system, /feedbackConfrontativo/);
    assert.match(prompt.system, /accion mínima|acción mínima|Seriedad/i);
    assert.match(prompt.user, /acción mínima: una llamada/i);
    assert.match(prompt.user, /intento previo vago/);
    assert.equal(prompt.responseSchema.codigoSiguiente, 4);
  });

  it("obtenerPromptEvaluacion (externo) usa objecionCliente", () => {
    const prompt = obtenerPromptEvaluacion({
      codigo: 1 as CodigoNumero,
      modo: "EXTERNO_VENTAS" as ModoUmbral,
      respuestaUsuario: "Te sirve para cortar la estática en 15 minutos.",
    });
    assert.match(prompt.system, /EXTERNO_VENTAS/);
    assert.match(prompt.system, /Objeción típica/);
    assert.match(prompt.system, /utilidad/i);
  });

  it("en código 10 el prompt indica codigoSiguiente null al aprobar", () => {
    const prompt = obtenerPromptEvaluacion({
      codigo: 10,
      modo: "INTERNO_HABILIDAD",
      respuestaUsuario: "Asumo el rol. Yo marco el estándar.",
    });
    assert.match(prompt.system, /codigoSiguiente = null/);
    assert.match(prompt.system, /codigoSiguiente = 10/);
  });
});
