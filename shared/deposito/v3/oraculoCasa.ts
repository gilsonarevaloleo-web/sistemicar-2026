/**
 * Oráculo de Casa — voz de Sistemicar sobre leyes selladas.
 * Recupera y cita. No genera. Cero internet, cero Gemini, cero diario.
 */

import {
  categoriaDe,
  leyesDeCasa,
  tokensDeTextoCasa,
  type CerebroMadre,
  type PrincipioAprendizaje,
} from "./cerebroMadre.ts";
import type { EyeCode } from "./types.ts";

export const ORACULO_CASA_VACIO =
  "No hay ley registrada para este estado; ejecuta un volcado.";

export const ORACULO_CASA_TONO =
  "Voz de Sistemicar. Implacable, sobria, directa. Sin adornos, sin adulación, sin autoayuda. Solo leyes selladas.";

const SINONIMOS: Record<string, readonly string[]> = {
  fatiga: ["cansancio", "cansado"],
  cansancio: ["fatiga"],
  apatico: ["necesidad", "cliente"],
  apatica: ["necesidad", "cliente"],
  apatia: ["necesidad", "cliente"],
  consciente: ["conciente"],
  conciente: ["consciente"],
};

export type RespuestaOraculoHit = {
  vacio: false;
  axioma: string;
  aplicacion: string;
  codigo: EyeCode;
  categoria: string;
  leyId: string;
};

export type RespuestaOraculoVacio = {
  vacio: true;
  texto: string;
};

export type RespuestaOraculo = RespuestaOraculoHit | RespuestaOraculoVacio;

function expandirTokens(tokens: Set<string>): Set<string> {
  const out = new Set(tokens);
  for (const t of tokens) {
    const extra = SINONIMOS[t];
    if (!extra) continue;
    for (const e of extra) out.add(e);
  }
  return out;
}

function tokensDeLey(ley: PrincipioAprendizaje): Set<string> {
  const out = tokensDeTextoCasa(
    `${ley.enunciado} ${ley.aplicacion ?? ""} ${ley.anclas.join(" ")} ${categoriaDe(ley.foco)}`,
  );
  return out;
}

function puntuarLey(preguntaTokens: Set<string>, ley: PrincipioAprendizaje): number {
  const doc = tokensDeLey(ley);
  let n = 0;
  for (const t of preguntaTokens) {
    if (doc.has(t)) n += 1;
  }
  return n;
}

export function consultarLeyesCasa(
  pregunta: string,
  leyes: readonly PrincipioAprendizaje[],
): PrincipioAprendizaje | null {
  const selladas = leyes.filter((p) => p.estado === "ley");
  const q = expandirTokens(tokensDeTextoCasa(pregunta));
  if (q.size === 0 || selladas.length === 0) return null;

  let mejor: PrincipioAprendizaje | null = null;
  let mejorScore = 0;
  for (const ley of selladas) {
    const score = puntuarLey(q, ley);
    if (score < 1) continue;
    if (
      score > mejorScore ||
      (score === mejorScore &&
        mejor !== null &&
        ley.createdAt > mejor.createdAt)
    ) {
      mejor = ley;
      mejorScore = score;
    } else if (mejor === null) {
      mejor = ley;
      mejorScore = score;
    }
  }
  return mejorScore >= 1 ? mejor : null;
}

export function responderConsulta(
  pregunta: string,
  leyes: readonly PrincipioAprendizaje[],
): RespuestaOraculo {
  const ley = consultarLeyesCasa(pregunta, leyes);
  if (!ley) {
    return { vacio: true, texto: ORACULO_CASA_VACIO };
  }
  return {
    vacio: false,
    axioma: ley.enunciado,
    aplicacion: (ley.aplicacion ?? "").trim(),
    codigo: ley.foco,
    categoria: categoriaDe(ley.foco),
    leyId: ley.id,
  };
}

export function responderConsultaDeCerebro(
  pregunta: string,
  cerebro: CerebroMadre,
): RespuestaOraculo {
  return responderConsulta(pregunta, leyesDeCasa(cerebro));
}
