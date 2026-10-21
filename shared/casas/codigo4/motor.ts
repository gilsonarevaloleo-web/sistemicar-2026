/**
 * Motor local del Juez Serio.
 * El prompt instruye al modelo. Este archivo sella la Ley de Perímetro:
 * la tijera no sube de C_conquistado aunque el relato nombre códigos altos.
 */

import {
  CASA_CODIGO4_FIRMA,
  principioDe,
  recursosDelPerimetro,
} from "./prompt.ts";
import {
  EYE_CODES,
  type EyeCode,
  type JuezSerioInput,
  type JuezSerioParseResult,
  type JuezSerioResult,
} from "./types.ts";

const CODIGO_SUPERIOR_LEX = [
  { codigo: 5 as EyeCode, re: /\b(decid[eéí]|tijera|corte ejecutivo|par[aá]lisis)\b/i },
  { codigo: 6 as EyeCode, re: /\b(convivencia|acople|reglas del medio)\b/i },
  { codigo: 7 as EyeCode, re: /\b(visi[oó]n|patr[oó]n axiom|estrat[eé]gic|mapeo)\b/i },
  { codigo: 8 as EyeCode, re: /\b(ciclo|retorno diferido|bucle temporal)\b/i },
  { codigo: 9 as EyeCode, re: /\b(sistema|multihilo|arquitectura)\b/i },
  { codigo: 10 as EyeCode, re: /\b(prop[oó]sito fundamental|matriz de origen|sentido de vida)\b/i },
] as const;

const EMPATIA_BLANDA =
  /\b(te entiendo|es normal|est[aá] bien sentir|[aá]nimo|valid[oa] tu|no pasa nada)\b/i;

const TEORIA_ACADEMICA =
  /\b(seg[uú]n la psicolog|la literatura|en teor[ií]a|estudios indican|desde el coaching)\b/i;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hitsDe(norm: string, pats: RegExp[]): number {
  let n = 0;
  for (const p of pats) {
    if (p.test(norm)) n += 1;
  }
  return n;
}

export function isEyeCode(value: unknown): value is EyeCode {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (EYE_CODES as readonly number[]).includes(value)
  );
}

export function parseEyeCode(value: unknown): EyeCode | null {
  if (isEyeCode(value)) return value;
  if (typeof value === "string") {
    const m = value.trim().match(/^(?:C\s*)?([1-9]|10)$/i);
    if (m) return Number(m[1]) as EyeCode;
  }
  return null;
}

function clampEye(n: number): EyeCode {
  if (n < 1) return 1;
  if (n > 10) return 10;
  return n as EyeCode;
}

const MARCAS_PROBLEMA: Record<EyeCode, RegExp[]> = {
  1: [
    /\bno me sostengo\b/,
    /\bno se quien soy\b/,
    /\bse me cae la postura\b/,
    /\bno tengo ancla\b/,
    /\bme desarmo\b/,
    /\bse me va la identidad\b/,
  ],
  2: [
    /\bse estanca\b/,
    /\bno fluye\b/,
    /\broce\b/,
    /\bentropia\b/,
    /\bcaudal\b/,
    /\bfriccion (con|relacional)\b/,
    /\bla gente me\b/,
  ],
  3: [
    /\bautomatico\b/,
    /\bapagar incendios\b/,
    /\bel dia se me fue\b/,
    /\bpiston\b/,
    /\bdesglosador\b/,
    /\bejeci?uto\b/,
    /\bsin parar\b/,
    /\britmo\b/,
  ],
  4: [
    /\bdeberia\b/,
    /\bmanana lo hago\b/,
    /\bno es para tanto\b/,
    /\besta bien porque\b/,
    /\bjustific\w*\b/,
    /\bexcusa\b/,
    /\bcoartada\b/,
    /\bmoralina\b/,
    /\bme convenzo\b/,
    /\bno quiero ver\b/,
    /\bsiempre igual y no se\b/,
    /\bculpa\b/,
  ],
  5: [
    /\bno decido\b/,
    /\bparalisis\b/,
    /\bentre dos\b/,
    /\bno corto\b/,
    /\bno se si\b/,
    /\bme quedo en el medio\b/,
  ],
  6: [
    /\bentorno\b/,
    /\bno encajo\b/,
    /\breglas del medio\b/,
    /\bel ambiente\b/,
    /\bcasa no deja\b/,
  ],
  7: [
    /\bno veo el patron\b/,
    /\bestrategia\b/,
    /\bno se hacia donde\b/,
    /\bno tengo vision\b/,
    /\bmapeo\b/,
  ],
  8: [
    /\bse repite\b/,
    /\bel ciclo\b/,
    /\bvuelve otra vez\b/,
    /\bno cierra el bucle\b/,
    /\bcada semana lo mismo\b/,
  ],
  9: [
    /\bmuchos frentes\b/,
    /\bno doy abasto\b/,
    /\bvariables\b/,
    /\btodo a la vez\b/,
    /\bsistema se cae\b/,
  ],
  10: [
    /\bpara que hago esto\b/,
    /\bno tiene sentido\b/,
    /\bproposito\b/,
    /\bpor que existo\b/,
  ],
};

const MARCAS_CONQUISTA: Record<EyeCode, RegExp[]> = {
  1: [/\bme sostengo\b/, /\bpostura\b/, /\bancla\b/, /\bidentidad\b/, /\bdefino\b/],
  2: [/\bentonces\b/, /\bdespues\b/, /\bflujo\b/, /\bcaudal\b/, /\brelato\b/],
  3: [
    /\btrabajo\b/,
    /\bdia\b/,
    /\bbloque\b/,
    /\bpiston\b/,
    /\bsecuencia\b/,
    /\britmo\b/,
    /\bejeci?ut\w*\b/,
    /\bdesglosador\b/,
    /\bincendio\b/,
  ],
  4: [
    /\bel problema es\b/,
    /\bme doy cuenta\b/,
    /\bcoartada\b/,
    /\bpor que\b/,
    /\binflexion\b/,
  ],
  5: [/\bdecid\w*\b/, /\bcort[eé]\b/, /\bhasta aqui\b/, /\bbasta\b/],
  6: [/\bentorno\b/, /\bcon ella\b/, /\bcon el\b/, /\bcliente\b/, /\bhogar\b/],
  7: [/\bel patron\b/, /\baxioma\b/, /\bmi solucion\b/, /\bla ley es\b/],
  8: [/\bciclo\b/, /\bretorno\b/, /\b48\s*h\b/, /\bloop\b/],
  9: [/\bmultihilo\b/, /\bvarios frentes\b/, /\bal mismo tiempo\b/],
  10: [/\bvuelvo al titulo\b/, /\borigen\b/, /\besto cierra\b/],
};

function puntuar(norm: string, tabla: Record<EyeCode, RegExp[]>): Record<EyeCode, number> {
  const scores = {} as Record<EyeCode, number>;
  for (const n of EYE_CODES) scores[n] = hitsDe(norm, tabla[n]);
  return scores;
}

function codigoDominante(
  scores: Record<EyeCode, number>,
  fallback: EyeCode,
): EyeCode {
  let best: EyeCode = fallback;
  let max = -1;
  for (const n of EYE_CODES) {
    if (scores[n] > max) {
      max = scores[n];
      best = n;
    }
  }
  return max > 0 ? best : fallback;
}

/**
 * Superficie C3 sin inflexión → el problema inconsciente es C4.
 * El Juez no confunde el pistón con la vía de agua.
 */
export function detectarCodigoProblema(friccion: string): EyeCode {
  const norm = normalizar(friccion);
  const scores = puntuar(norm, MARCAS_PROBLEMA);
  const superficieC3 = scores[3] > 0;
  const hayInflexion = scores[4] > 0;
  const otroMasAlto = EYE_CODES.filter((n) => n >= 5).some((n) => scores[n] > scores[4]);

  if (superficieC3 && !hayInflexion && !otroMasAlto) return 4;
  if (scores[4] > 0 && scores[4] >= scores[5] && !otroMasAlto) return 4;
  return codigoDominante(scores, 4);
}

/**
 * El chasis se mide por lo que sostiene, no por lo que nombra.
 * Un volcado de día sin C4+ sostiene como máximo C3.
 */
export function inferirPerimetroConquistado(friccion: string): EyeCode {
  const norm = normalizar(friccion);
  const scores = puntuar(norm, MARCAS_CONQUISTA);
  let max: EyeCode = 1;
  for (const n of EYE_CODES) {
    if (scores[n] > 0) max = n;
    else break;
  }
  if (scores[3] > 0 && max < 3) return 3;
  if (max === 1 && scores[3] === 0 && /dia|hoy|trabajo|bloque/.test(norm)) {
    return 3;
  }
  return max;
}

export function directivaDelPerimetro(
  max: EyeCode,
  problema: EyeCode,
): string {
  const techo = principioDe(max);
  const mapa: Record<EyeCode, string> = {
    1: "Nombrá la postura que se te cayó hoy. Una frase. Sostenela. No cambies de identidad.",
    2: "Cortá UNA fuga de caudal: la conversación, la pantalla o el roce que se come el flujo. No agregues trabajo.",
    3: "Interrumpí el pistón automático. Nombrá UN paso de hoy y cerra. No abras el siguiente.",
    4: "Escribí la coartada en una línea. Esa es la vía de agua. No la moralices. Dejala a la vista.",
    5: "Una tijera: sí o no. Un objeto. Hoy.",
    6: "Nombrá la regla del medio que estás violando o aguantando. Ajustá UNA juntura.",
    7: "Dibujá el patrón en una frase. No armes un plan.",
    8: "Marcá el bucle que no cerró. Fecha de retorno. Nada más.",
    9: "Bajá a UN hilo. Los demás quedan fuera del día.",
    10: "Una línea de origen: para qué este acto. Si no sale, no hay sistema que sostener.",
  };
  const corte = mapa[max];
  if (problema > max) {
    return `${corte} El acto cabe en ${techo.nombre}. No subas el perímetro.`;
  }
  return corte;
}

export function fugaInconscienteDe(
  problema: EyeCode,
  max: EyeCode,
): string {
  const p = principioDe(problema);
  if (problema === 4 && max <= 3) {
    return "Operás el día en automático. La vía de agua no es falta de ritmo: es la coartada que sostiene el pistón para no mirar el quiebre.";
  }
  if (problema > max) {
    return `El relato opera en C${max}. El vicio habita en ${p.nombre} C${problema} y el chasis no lo sostiene. Eso es lo que no veías.`;
  }
  return `La vía de agua está en ${p.nombre} C${problema}: ${p.vectores.join(", ").toLowerCase()}. No es un defecto de carácter. Es el principio que el automático tapa.`;
}

export function lecturaPerimetroDe(
  problema: EyeCode,
  max: EyeCode,
): string {
  const recursos = recursosDelPerimetro(max);
  return `El problema habita en C${problema}. El chasis sostiene hasta C${max} (${recursos}). La tijera no puede subir de C${max}.`;
}

export function directivaFiltraPerimetro(
  texto: string,
  max: EyeCode,
): boolean {
  if (EMPATIA_BLANDA.test(texto) || TEORIA_ACADEMICA.test(texto)) return false;
  for (const marca of CODIGO_SUPERIOR_LEX) {
    if (marca.codigo > max && marca.re.test(texto)) return false;
  }
  const mencionados = [...texto.matchAll(/\bC\s*([1-9]|10)\b/gi)].map((m) =>
    Number(m[1]),
  );
  return mencionados.every((n) => n <= max);
}

export function acotarAlPerimetro(result: JuezSerioResult): JuezSerioResult {
  const problema = result.fase1_lectura.codigoProblemaDetectado;
  const max = result.fase1_lectura.codigoConquistadoMax;
  const raw = result.fase2_propuesta_solucion.directivaOperacional.trim();
  const directiva = directivaFiltraPerimetro(raw, max)
    ? raw
    : directivaDelPerimetro(max, problema);

  return {
    fase1_lectura: {
      codigoProblemaDetectado: problema,
      codigoConquistadoMax: max,
      fugaInconsciente: result.fase1_lectura.fugaInconsciente.trim(),
      lecturaPerimetroFria: result.fase1_lectura.lecturaPerimetroFria.trim(),
    },
    fase2_propuesta_solucion: {
      requiereInversionCreditos: true,
      directivaOperacional: directiva,
    },
  };
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseJuezSerioResult(raw: unknown): JuezSerioParseResult {
  let data: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, error: "JSON inválido." };
    }
  }
  if (!data || typeof data !== "object") {
    return { ok: false, error: "El dictamen no es un objeto." };
  }

  const fase1 = (data as { fase1_lectura?: unknown }).fase1_lectura;
  const fase2 = (data as { fase2_propuesta_solucion?: unknown }).fase2_propuesta_solucion;
  if (!fase1 || typeof fase1 !== "object" || !fase2 || typeof fase2 !== "object") {
    return { ok: false, error: "Faltan fase1_lectura o fase2_propuesta_solucion." };
  }

  const f1 = fase1 as Record<string, unknown>;
  const f2 = fase2 as Record<string, unknown>;
  const problema = parseEyeCode(f1.codigoProblemaDetectado);
  const max = parseEyeCode(f1.codigoConquistadoMax);
  const fuga = trimText(f1.fugaInconsciente);
  const lectura = trimText(f1.lecturaPerimetroFria || f1.lecturaPerimetroFrancia);
  const directiva = trimText(f2.directivaOperacional);

  if (!problema || !max) {
    return { ok: false, error: "Los códigos deben ser enteros 1–10." };
  }
  if (!fuga || !lectura || !directiva) {
    return { ok: false, error: "Faltan campos de texto del dictamen." };
  }

  return {
    ok: true,
    result: acotarAlPerimetro({
      fase1_lectura: {
        codigoProblemaDetectado: problema,
        codigoConquistadoMax: max,
        fugaInconsciente: fuga,
        lecturaPerimetroFria: lectura,
      },
      fase2_propuesta_solucion: {
        requiereInversionCreditos: true,
        directivaOperacional: directiva,
      },
    }),
  };
}

export function diagnosticarJuezSerioLocal(
  input: JuezSerioInput,
): JuezSerioResult {
  const friccion = input.friccionDiaria?.trim() ?? "";
  const problema = detectarCodigoProblema(friccion);
  const inferido = inferirPerimetroConquistado(friccion);
  const max = clampEye(input.codigoConquistadoMax ?? inferido);
  const fuga = friccion
    ? fugaInconscienteDe(problema, max)
    : "No hay volcado. Sin fricción no hay vía de agua que nombrar.";
  const lectura = friccion
    ? lecturaPerimetroDe(problema, max)
    : `${CASA_CODIGO4_FIRMA} Sin texto el perímetro no se mide.`;

  return acotarAlPerimetro({
    fase1_lectura: {
      codigoProblemaDetectado: problema,
      codigoConquistadoMax: max,
      fugaInconsciente: fuga,
      lecturaPerimetroFria: lectura,
    },
    fase2_propuesta_solucion: {
      requiereInversionCreditos: true,
      directivaOperacional: directivaDelPerimetro(max, problema),
    },
  });
}

export function evaluarJuezSerio(input: JuezSerioInput): JuezSerioResult {
  return diagnosticarJuezSerioLocal(input);
}
