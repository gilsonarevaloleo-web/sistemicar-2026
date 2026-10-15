import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { CODIGOS_NUMERO } from "../../shared/umbral/engineConfig.ts";
import { armarBloqueMaestro, FIRMAS_KERNEL_MAESTRO } from "./kernel.ts";
import { obtenerPromptEvaluacion } from "./promptEvaluacion.ts";
import {
  afirmarCuerpoSinPrompt,
  contieneKernelMaestro,
  sellarPromptEvaluacion,
} from "./vault.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

describe("Vault del Maestro", () => {
  it("el bloque inyecta solo la ficha activa + kernel compacto", () => {
    const bloque = armarBloqueMaestro(4, "EXTERNO_VENTAS");
    assert.match(bloque, /Ingeniero sin Flor/);
    assert.match(bloque, /La Arena/);
    assert.match(bloque, /Cínico|trauma/i);
    assert.match(bloque, /Carácter-Código|EMPATÍA DE CÓDIGO|DOS RESISTENCIAS/);
    assert.match(bloque, /BLINDAJE DE KERNEL/);
    assert.doesNotMatch(bloque, /Cortador de Niebla/);
    assert.doesNotMatch(bloque, /El Autor/);
    assert.ok(bloque.length < 3600);
  });

  it("Forja y Arena no mezclan R1", () => {
    const forja = armarBloqueMaestro(3, "INTERNO_HABILIDAD");
    const arena = armarBloqueMaestro(3, "EXTERNO_VENTAS");
    assert.match(forja, /La Forja/);
    assert.match(arena, /Postergador|agenda/i);
    assert.doesNotMatch(forja, /Postergador/);
  });

  it("SISTEMICAR_MAESTRO_KERNEL reemplaza el kernel del repo", () => {
    const env = {
      SISTEMICAR_MAESTRO_KERNEL:
        "KERNEL SECRETO DE PRUEBA — Eres el Maestro del código activo del Umbral en modo vault.",
    };
    const bloque = armarBloqueMaestro(1, "INTERNO_HABILIDAD", env);
    assert.match(bloque, /KERNEL SECRETO DE PRUEBA/);
    assert.doesNotMatch(bloque, /EMPATÍA DE CÓDIGO \(no emocional\)/);
    assert.match(bloque, /Cortador de Niebla/);
  });

  it("obtenerPromptEvaluacion (interno) incluye criterio, schema y Maestro", () => {
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
    assert.match(prompt.system, /Ingeniero sin Flor/);
    assert.match(prompt.system, /segunda resistencia/i);
    assert.match(prompt.system, /BLINDAJE DE KERNEL/);
    assert.doesNotMatch(prompt.system, /Evaluador Confrontativo/);
    assert.match(prompt.user, /acción mínima: una llamada/i);
    assert.match(prompt.user, /intento previo vago/);
    assert.equal(prompt.responseSchema.codigoSiguiente, 4);
  });

  it("obtenerPromptEvaluacion (externo) usa objecionCliente y ficha de Arena", () => {
    const prompt = obtenerPromptEvaluacion({
      codigo: 1,
      modo: "EXTERNO_VENTAS",
      respuestaUsuario: "Te sirve para cortar la estática en 15 minutos.",
    });
    assert.match(prompt.system, /EXTERNO_VENTAS/);
    assert.match(prompt.system, /Objeción típica/);
    assert.match(prompt.system, /utilidad/i);
    assert.match(prompt.system, /Cortador de Niebla/);
    assert.match(prompt.system, /La Arena/);
    assert.doesNotMatch(prompt.system, /OFERTA EN JUICIO/);
  });

  it("Arena con oferta nombra el producto en el prompt y ancla la objeción", () => {
    const prompt = obtenerPromptEvaluacion({
      codigo: 1,
      modo: "EXTERNO_VENTAS",
      respuestaUsuario: "Corte Limpio te nombra el crack en una frase.",
      ofertaNombre: "Corte Limpio",
      fraseUtilidad: "Nombra el crack y lo corta hoy.",
    });
    assert.match(prompt.system, /OFERTA EN JUICIO/);
    assert.match(prompt.system, /Corte Limpio/);
    assert.match(prompt.system, /Nombra el crack y lo corta hoy/);
    assert.match(prompt.system, /no veo para qué me sirve Corte Limpio/i);
  });

  it("Forja ignora ofertaNombre: no es sujeto del modo interno", () => {
    const prompt = obtenerPromptEvaluacion({
      codigo: 1,
      modo: "INTERNO_HABILIDAD",
      respuestaUsuario: "La excusa puntual es abrir el celular al vender.",
      ofertaNombre: "Corte Limpio",
      fraseUtilidad: "No debería aparecer.",
    });
    assert.doesNotMatch(prompt.system, /OFERTA EN JUICIO/);
    assert.doesNotMatch(prompt.system, /Corte Limpio/);
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

  it("prompt C3 Arena inyecta el candado de minutos + primer paso", () => {
    const prompt = obtenerPromptEvaluacion({
      codigo: 3,
      modo: "EXTERNO_VENTAS",
      respuestaUsuario: "Entrar a la jornada y nombrar el tiempo.",
    });
    assert.match(prompt.system, /CANDADO C3 ARENA/);
    assert.match(prompt.system, /ocupación/);
    assert.match(prompt.system, /Relojero Práctico/);
  });

  it("sellarPromptEvaluacion no reexpone system/user en el sello", () => {
    const sellado = sellarPromptEvaluacion({
      codigo: 1,
      modo: "INTERNO_HABILIDAD",
      respuestaUsuario: "La excusa puntual es el celular.",
    });
    assert.ok(sellado.paraGemini.includes("Cortador de Niebla"));
    assert.equal(sellado.nombreCodigo.length > 0, true);
    assert.equal("system" in sellado, false);
    assert.equal("user" in sellado, false);
  });

  it("afirmarCuerpoSinPrompt deja pasar el veredicto y corta una fuga", () => {
    afirmarCuerpoSinPrompt({
      success: true,
      feedbackConfrontativo: "Hay crack. Cruce del Cortador de Niebla.",
    });
    assert.equal(
      contieneKernelMaestro({ feedbackConfrontativo: "Hay crack." }),
      false,
    );
    assert.throws(
      () =>
        afirmarCuerpoSinPrompt({
          leaked: FIRMAS_KERNEL_MAESTRO[0],
        }),
      /Fuga de kernel Maestro/,
    );
  });

  it("client/ y shared/ no contienen firmas del kernel", () => {
    const zonas = [join(REPO, "client"), join(REPO, "shared")];
    const fugas: string[] = [];
    for (const zona of zonas) {
      for (const file of walkFiles(zona)) {
        const text = readFileSync(file, "utf8");
        for (const firma of FIRMAS_KERNEL_MAESTRO) {
          if (text.includes(firma)) {
            fugas.push(`${relative(REPO, file)} :: ${firma}`);
          }
        }
      }
    }
    assert.deepEqual(fugas, []);
  });

  it("cubre los 10 códigos al sellar", () => {
    for (const n of CODIGOS_NUMERO) {
      const sellado = sellarPromptEvaluacion({
        codigo: n,
        modo: "INTERNO_HABILIDAD",
        respuestaUsuario: "Acción mínima de hoy con un número y un primer paso.",
      });
      assert.equal(sellado.codigo, n);
      assert.ok(contieneKernelMaestro(sellado.paraGemini));
    }
  });
});
