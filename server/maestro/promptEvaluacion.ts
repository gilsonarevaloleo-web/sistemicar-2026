/**
 * Ensambla el prompt de evaluación del Maestro.
 * Solo el servidor. El cliente nunca importa este módulo.
 */

import {
  MODOS_UMBRAL,
  obtenerCodigo,
  siguienteCodigo,
  type PromptEvaluacion,
  type PromptEvaluacionInput,
} from "../../shared/umbral/engineConfig.ts";
import {
  anclarTextoAOferta,
  bloquePromptOferta,
} from "../../shared/umbral/ofertaArenaTexto.ts";
import { armarBloqueMaestro } from "./kernel.ts";

export function obtenerPromptEvaluacion(
  input: PromptEvaluacionInput,
  env: NodeJS.ProcessEnv = process.env,
): PromptEvaluacion {
  const { codigo, modo, respuestaUsuario, historialPrevio = [] } = input;
  const cfg = obtenerCodigo(codigo);
  const modoMeta = MODOS_UMBRAL[modo];
  const next = siguienteCodigo(codigo);
  const bloqueMaestro = armarBloqueMaestro(codigo, modo, env);
  const ofertaNombre = String(input.ofertaNombre ?? "").trim();
  const fraseUtilidad = String(input.fraseUtilidad ?? "").trim();
  const ofertaActiva = modo === "EXTERNO_VENTAS" && ofertaNombre.length > 0;
  const bloqueOferta = ofertaActiva
    ? bloquePromptOferta({ nombre: ofertaNombre, fraseUtilidad })
    : "";

  const objecionAnclada = ofertaActiva
    ? anclarTextoAOferta(cfg.modoExterno.objecionCliente, ofertaNombre)
    : cfg.modoExterno.objecionCliente;
  const estadoAnclado = ofertaActiva
    ? anclarTextoAOferta(cfg.modoExterno.estadoMentalCliente, ofertaNombre)
    : cfg.modoExterno.estadoMentalCliente;

  const bloqueModo =
    modo === "INTERNO_HABILIDAD"
      ? [
          `MODO: INTERNO_HABILIDAD ("${modoMeta.label}" / ${modoMeta.alias})`,
          `Pregunta disparadora: ${cfg.modoInterno.preguntaDisparadora}`,
          `Estado mental esperado del usuario: ${cfg.modoInterno.estadoMentalUsuario}`,
          `Criterio de aprobación: ${cfg.modoInterno.criterioAprobacion}`,
          `Instrucción de evaluación: ${cfg.modoInterno.instruccionEvaluadorGemini}`,
        ].join("\n")
      : [
          `MODO: EXTERNO_VENTAS ("${modoMeta.label}" / ${modoMeta.alias})`,
          `Objeción típica del cliente: ${objecionAnclada}`,
          `Estado mental del cliente: ${estadoAnclado}`,
          `Criterio de aprobación del vendedor: ${cfg.modoExterno.criterioAprobacionVendedor}`,
          `Instrucción de evaluación: ${cfg.modoExterno.instruccionEvaluadorGemini}`,
        ].join("\n");

  const historialTxt =
    historialPrevio.length === 0
      ? "(sin historial previo)"
      : historialPrevio
          .slice(-16)
          .map((h, i) => {
            const rol = h.rol === "system" ? "system" : "user";
            const texto = String(h.texto ?? "").trim();
            return `${i + 1}. [${rol}] ${texto || "(vacío)"}`;
          })
          .join("\n");

  const system = [
    bloqueMaestro,
    "",
    "Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto fuera del JSON) con esta forma exacta:",
    '{"aprobado": boolean, "feedbackConfrontativo": string, "codigoSiguiente": number | null}',
    "",
    "Reglas de codigoSiguiente:",
    `- Si aprobado === true y codigo < 10: codigoSiguiente = ${next ?? "null"}.`,
    `- Si aprobado === true y codigo === 10: codigoSiguiente = null (módulo completado).`,
    `- Si aprobado === false: codigoSiguiente = ${codigo} (el operador no avanza).`,
    "",
    "feedbackConfrontativo: 2–5 frases en la voz de la ficha. Tres tiempos: espejo → segunda resistencia → corte o cruce. Si rechazas, el corte es un rewrite de HOY, no un sermón.",
    codigo === 3 && modo === "EXTERNO_VENTAS"
      ? "CANDADO C3 ARENA: no apruebes sin un número de minutos u horas y un primer paso ejecutable. Filosofía del reloj sin costo temporal es ocupación."
      : "",
    "",
    `CÓDIGO EN EVALUACIÓN: ${cfg.nombre}`,
    `Concepto clave: ${cfg.conceptoClave}`,
    bloqueOferta,
    bloqueModo,
  ].join("\n");

  const user = [
    "HISTORIAL PREVIO:",
    historialTxt,
    "",
    "Respuesta del operador a evaluar:",
    "---",
    respuestaUsuario.trim() || "(vacío)",
    "---",
    "Evalúa ahora y responde solo el JSON.",
  ].join("\n");

  return {
    system,
    user,
    responseSchema: {
      aprobado: false,
      feedbackConfrontativo: "",
      codigoSiguiente: codigo,
    },
    codigo,
    modo,
    nombreCodigo: cfg.nombre,
  };
}

export function serializarPromptEvaluacion(prompt: PromptEvaluacion): string {
  return `${prompt.system}\n\n${prompt.user}`;
}
