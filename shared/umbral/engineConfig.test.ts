import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CODIGOS_NUMERO,
  DICCIONARIO_CODIGOS,
  MODOS_UMBRAL,
  evaluarUmbralLocal,
  obtenerCodigo,
  obtenerPromptEvaluacion,
  parseEvaluacionGemini,
  resolverCodigoSiguiente,
  siguienteCodigo,
  type CodigoNumero,
  type ModoUmbral,
} from "./engineConfig.ts";

describe("Umbral v2 — engineConfig", () => {
  it("modo interno se llama La Forja (no Espejo)", () => {
    assert.equal(MODOS_UMBRAL.INTERNO_HABILIDAD.label, "La Forja");
    assert.equal(MODOS_UMBRAL.EXTERNO_VENTAS.label, "La Arena");
    assert.doesNotMatch(MODOS_UMBRAL.INTERNO_HABILIDAD.label, /Espejo/i);
  });

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
      assert.ok(c.modoExterno.arquetipoNombre.length > 0);
      assert.ok(c.modoExterno.actitudCliente.length > 0);
      assert.ok(c.modoExterno.fraseTipica.length > 0);
      assert.ok(c.modoExterno.misionVendedor.length > 0);
    }
  });

  it("arquetipos de La Arena mapean 1–10", () => {
    const esperados: Record<CodigoNumero, RegExp> = {
      1: /Apático/i,
      2: /Abrumado/i,
      3: /Postergador/i,
      4: /Cínico/i,
      5: /Escéptico/i,
      6: /Temeroso/i,
      7: /Moralista/i,
      8: /Negociador/i,
      9: /Perfeccionista/i,
      10: /Soberano/i,
    };
    for (const n of CODIGOS_NUMERO) {
      assert.match(obtenerCodigo(n).modoExterno.arquetipoNombre, esperados[n]);
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

  it("parseEvaluacionGemini acepta alias feedback", () => {
    const ev = parseEvaluacionGemini(
      '```json\n{"aprobado":true,"feedback":"Listo.","codigoSiguiente":2}\n```',
      1,
    );
    assert.equal(ev.aprobado, true);
    assert.equal(ev.feedbackConfrontativo, "Listo.");
    assert.equal(ev.codigoSiguiente, 2);
  });

  it("evaluarUmbralLocal rechaza respuestas vacías y aprueba densas", () => {
    const ko = evaluarUmbralLocal({
      codigo: 1,
      modo: "INTERNO_HABILIDAD",
      respuestaUsuario: "ok",
    });
    assert.equal(ko.aprobado, false);
    assert.equal(ko.codigoSiguiente, 1);

    const ok = evaluarUmbralLocal({
      codigo: 1,
      modo: "INTERNO_HABILIDAD",
      respuestaUsuario:
        "La excusa puntual de hoy es abrir el celular cada vez que voy a vender, y mi acción mínima es una llamada sin pantalla.",
    });
    assert.equal(ok.aprobado, true);
    assert.equal(ok.codigoSiguiente, 2);
  });
});
