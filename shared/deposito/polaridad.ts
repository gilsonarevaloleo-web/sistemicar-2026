/**
 * Capa interna de polaridad / género de los 10 Códigos.
 * Sirve para calcular el contrapeso de instruccionUnica.
 * Nunca se expone en el JSON ni en la UI del alumno.
 */

import type { CodigoObservador, FichaOjoCodigo } from "./engineConfig.ts";

export type PoloCargaInterno = "M+" | "M-" | "F+" | "F-";

export const BLOQUE_POLARIDAD_INTERNA = `
═══ CAPA INTERNA DE POLARIDAD (INVISIBLE AL ALUMNO) ═══
Analizá en silencio las Cargas de Polaridad y Género de los 10 Códigos.
Esta capa es SOLO razonamiento interno. PROHIBIDO volcar polo, género,
eje, M+, M-, F+ o F- en el JSON o en cualquier campo visible.

Eje Masculino (M — Vector/Chasis): Corte, Freno, Límite, Definición, 0ms.
- M+ (Positivo): Dirección seca, vehículo nombrado, acción libre de drama.
- M- (Negativo): Rigidez, agresión reactiva, choque, imponer fuerza bruta.

Eje Femenino (F — Campo/Matriz): Contención, Ritmo, Tiempo, Absorción, Contexto.
- F+ (Positivo): Resiliencia, sostener la secuencia con paciencia, lectura de matiz.
- F- (Negativo): Inercia, rumiación, victimización ("me condicionaron"), vacilar por falta de mapa.

REGLA DE RETORNO Y BALANCE AUTOMÁTICO:
- Si el volcado refleja F- (rumiación / pesadez / postergación): instruccionUnica DEBE ser un vector M+ (corte seco: nombrar vehículo, fijar hora exacta, freno a la historia).
- Si el volcado refleja M- (choque / frustración / rigidez): instruccionUnica DEBE ser una contención F+ (freno de impulso, observación de la secuencia, ritmo).
No expliques la teoría de géneros. Entregá solo la acción.

LECTURA DE FASE (puntoCiego / loNoDicho):
Redactá el estado actual de la energía. Nunca juicio moral, nunca regaño, nunca «deberías».
`.trim();

const RE_F_NEG =
  /me condicionaron|no pude|no tuve tiempo|despu[eé]s veo|ya ver[eé]|siempre me|nadie me|me hicieron|me sent[ií]|estoy mal|fue feo|horrible|posterg|rumi|v[ií]ctim|inercia|vacil|dando vueltas|no paro de pensar|me pesa|me cuesta arrancar|mañana lo veo|no s[eé] por d[oó]nde/gi;

const RE_M_NEG =
  /choque|choqu[eé]|frustr|rigidez|forc[eé]|impuse|imponer|fuerza bruta|grit[eé]|explot[eé]|agred|bronca|rabia|pelea|golpe|aplast|empuj[eé] sin|me impuse/gi;

function contar(texto: string, re: RegExp): number {
  return [...texto.matchAll(new RegExp(re.source, "gi"))].length;
}

export function detectarPoloCarga(texto: string): PoloCargaInterno | null {
  const t = texto.trim();
  if (!t) return null;
  const fNeg = contar(t, RE_F_NEG);
  const mNeg = contar(t, RE_M_NEG);
  if (fNeg === 0 && mNeg === 0) return null;
  if (fNeg > mNeg) return "F-";
  if (mNeg > fNeg) return "M-";
  return fNeg >= 1 ? "F-" : "M-";
}

/**
 * Contrapeso ejecutable. No nombra polo ni género.
 * F- → vector M+ (corte, hora, vehículo).
 * M- → contención F+ (ritmo, observación, freno de impulso).
 */
export function instruccionContrapeso(
  polo: PoloCargaInterno,
  codigo: CodigoObservador,
  ojo: FichaOjoCodigo,
): string | null {
  if (polo === "F-") {
    if (codigo === 9) {
      return "Mañana a las 9:00, en UNA tarea de casa con la hija, nombrá la ley. Corte seco. Cero relato.";
    }
    if (codigo === 3) {
      return "Mañana a las 9:00, UNA secuencia de tres pasos con hora de corte. El reloj manda. Cero historia.";
    }
    return `Mañana a una hora exacta, un solo acto de ${ojo.focoAtencion}. Nombrá el vehículo. Freno a la historia.`;
  }
  if (polo === "M-") {
    if (codigo === 3) {
      return "Mañana, tres pasos lentos con hora de inicio. Observá la secuencia; el ritmo manda, no el impulso.";
    }
    return `Mañana, freno de impulso: observá la secuencia de ${ojo.focoAtencion} antes de empujar. El ritmo manda.`;
  }
  return null;
}

export function lecturaFaseEnergia(
  codigo: CodigoObservador,
  ojo: FichaOjoCodigo,
  polo: PoloCargaInterno | null,
  ancla: string,
): string {
  if (codigo === 9 && /c[oó]mo se llama|nombre del patr[oó]n|pregunta/i.test(ancla)) {
    return "Fase actual: la energía pide el nombre del patrón. El relato todavía cuenta el evento, no el circuito.";
  }
  if (polo === "F-") {
    return "Fase actual: la energía está en inercia — rumia el episodio y no corta a un acto.";
  }
  if (polo === "M-") {
    return "Fase actual: la energía está en choque — empuja y no lee el ritmo de la secuencia.";
  }
  if (ancla) {
    return `Fase actual: atención en ${ojo.focoAtencion}; el circuito todavía no tiene nombre.`;
  }
  return `Fase actual: atención en ${ojo.focoAtencion}; falta el hecho operable.`;
}
