/**
 * Pruebas deterministas del carácter del código.
 * Gemini y el fallback de keywords no sustituyen este candado.
 */

import type { PromptEvaluacionInput } from "./engineConfig.ts";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/**
 * Costo temporal explícito y bajo: número + unidad
 * (8 minutos, 10 min, 2 horas, media hora).
 */
export function tieneCostoTemporalExplicito(texto: string): boolean {
  const t = normalizar(texto);
  return (
    /\b\d{1,3}\s*(minutos?|mins?|min|horas?|hrs?|h)\b/.test(t) ||
    /\b(media hora|un cuarto de hora|cuarto de hora)\b/.test(t)
  );
}

/**
 * Primer paso ejecutable — no «hoy día», no «es simple».
 * Verbos de corte o el objeto operativo (bloque / segmento / jornada).
 */
export function tienePrimerPasoPractico(texto: string): boolean {
  const t = normalizar(texto);
  return /\b(primer\s+paso|empez[ae]|entr[aeo]|abr[ei]|nombr[ae]|crea(?:r|s)?|cort[ae]|anot[ae]|part[ei]|bloque|segmentos?|jornada)\b/.test(
    t,
  );
}

/**
 * C3 Arena (Relojero): sin minutos/horas + primer paso no hay cruce.
 * Los demás códigos no tienen candado local extra.
 */
export function pasaCandadoCodigo(input: PromptEvaluacionInput): boolean {
  const texto = input.respuestaUsuario.trim();
  if (input.codigo === 3 && input.modo === "EXTERNO_VENTAS") {
    return tieneCostoTemporalExplicito(texto) && tienePrimerPasoPractico(texto);
  }
  return true;
}

/**
 * Espejo + rewrite. La plantilla vieja no nombraba lo que trajeron
 * y el operador no podía distinguir «el Maestro leyó» de un sello.
 */
export function feedbackRechazoC3Arena(texto: string): string {
  const t = normalizar(texto);
  const traido: string[] = [];
  if (/\bjornada\b/.test(t)) traido.push("jornada");
  if (/\bsegmentos?\b/.test(t)) traido.push("segmentos");
  if (/\brevelaci/.test(t)) traido.push("revelación");
  if (/\breloj\b/.test(t)) traido.push("el reloj");
  if (/\bmedible\b/.test(t)) traido.push("día medible");
  if (/\bsimple\b/.test(t)) traido.push("«es simple»");

  const espejo = traido.length
    ? `Trajiste ${traido.join(", ")}. Sin número de minutos.`
    : "Hay discurso del tiempo. Sin número de minutos.";

  return [
    espejo,
    "Eso es ocupación. Dame minutos y un primer paso.",
    "Rewrite de hoy: En 8 minutos entras a Jornada, partes el día en 3 segmentos y le das nombre al primero.",
  ].join(" ");
}
