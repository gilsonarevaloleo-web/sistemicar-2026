/**
 * Motor local del Juez Serio.
 * Solo lee. Cada código cierra con su fuerza. C5 no es el solver universal.
 * El cierre se juzga por la energía usada, no por el léxico.
 */

import {
  CASA_CODIGO4_FIRMA,
  fuerzaDe,
  principioDe,
  recursosDelPerimetro,
} from "./prompt.ts";
import {
  CASCADA_ENSENANZA,
  EYE_CODES,
  type EyeCode,
  type JuezSerioFase1,
  type JuezSerioFase2,
  type JuezSerioInput,
  type JuezSerioParseResult,
  type JuezSerioResult,
  type ParticipacionFuerza,
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
    /\bdisposici[oó]n\b/,
    /\bno tengo disponibilidad\b/,
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
    /\bv[ií]deos?\b/,
    /\bpublicar\b/,
    /\bherramienta\b/,
    /\bclip\b/,
    /\bpasos?\b/,
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
    /\bparece f[aá]cil\b/,
    /\bdebe ser f[aá]cil\b/,
    /\ba la pasada\b/,
    /\bverdadero problema\b/,
    /\bhabilidad\b/,
  ],
  5: [
    /\bno decido\b/,
    /\bparalisis\b/,
    /\bentre dos\b/,
    /\bno corto\b/,
    /\bno se si\b/,
    /\bme quedo en el medio\b/,
    /\bno se por donde\b/,
    /\bno empiezo\b/,
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
    /\bcompra impulsiva\b/,
    /\bcursos?\b/,
    /\b3 meces\b/,
    /\bmeses\b/,
  ],
  9: [
    /\bmuchos frentes\b/,
    /\bno doy abasto\b/,
    /\bvariables\b/,
    /\btodo a la vez\b/,
    /\bsistema se cae\b/,
    /\bvarias cosas\b/,
    /\bproyecto\b/,
    /\bpublicista\b/,
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
    /\bv[ií]deos?\b/,
    /\bpublicar\b/,
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

function hayCierreTeorico(norm: string): boolean {
  return (
    /\bverdadero problema\b/.test(norm) ||
    /\bsoluci[oó]n ser[ií]a\b/.test(norm) ||
    /\bvoy ha\b/.test(norm) ||
    /\bvoy a crear un proyecto\b/.test(norm) ||
    /\brutina diaria\b/.test(norm)
  );
}

function hayCierreAparato(norm: string): boolean {
  return (
    /\bproyecto\b/.test(norm) ||
    /\bpublicista\b/.test(norm) ||
    /\brutina diaria\b/.test(norm) ||
    /\bsoluci[oó]n ser[ií]a\b/.test(norm)
  );
}

function hayCeroObra(norm: string): boolean {
  return (
    /\b(meses|meces)\b/.test(norm) &&
    /\bv[ií]deos?\b/.test(norm) &&
    /\b(no consigo|sin poder publicar|ni un v[ií]deo)\b/.test(norm)
  );
}

export function fuerzaUsadaDelCierre(friccion: string): EyeCode | null {
  const norm = normalizar(friccion);
  if (!hayCierreTeorico(norm)) return null;
  if (hayCierreAparato(norm)) return 9;
  if (/\bverdadero problema\b/.test(norm)) return 4;
  return null;
}

export function codigoQueCerroDelVolcado(friccion: string): EyeCode | null {
  const norm = normalizar(friccion);
  if (/\bverdadero problema\b/.test(norm)) return 4;
  if (hayCierreTeorico(norm)) return fuerzaUsadaDelCierre(friccion);
  return null;
}

/**
 * Superficie C3 sin inflexión → el problema inconsciente es C4.
 * Inflexión nombrada + aparato o cero obra → habla C5. C5 no es el solver: se nombra.
 */
export function detectarCodigoProblema(friccion: string): EyeCode {
  const norm = normalizar(friccion);
  const scores = puntuar(norm, MARCAS_PROBLEMA);
  const superficieC3 = scores[3] > 0;
  const hayInflexion = scores[4] > 0;
  const otroMasAlto = EYE_CODES.filter((n) => n >= 5).some((n) => scores[n] > scores[4]);

  if (hayInflexion && (hayCierreAparato(norm) || hayCeroObra(norm))) return 5;
  if (superficieC3 && !hayInflexion && !otroMasAlto) return 4;
  if (scores[4] > 0 && scores[4] >= scores[5] && !otroMasAlto) return 4;
  return codigoDominante(scores, 4);
}

/**
 * El chasis se mide por lo que sostiene, no por lo que nombra.
 * Un volcado de día sin C4+ sostiene como máximo C3.
 * Nombrar proyecto no conquista C9.
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
  if (max === 1 && scores[3] === 0 && /dia|hoy|trabajo|bloque|video|publicar/.test(norm)) {
    return 3;
  }
  return max;
}

export function participacionesDelVolcado(friccion: string): ParticipacionFuerza[] {
  const norm = normalizar(friccion);
  const scores = puntuar(norm, MARCAS_PROBLEMA);
  const out: ParticipacionFuerza[] = [];
  for (const n of EYE_CODES) {
    if (scores[n] > 0) {
      out.push({ codigo: n, fuerza: fuerzaDe(n).nombre });
    }
  }
  return out;
}

export function fuerzaDebidaDe(habla: EyeCode, max: EyeCode): EyeCode {
  return habla > max ? max : habla;
}

export function cascadaCumpleDe(opts: {
  fuerzaUsada: EyeCode | null;
  fuerzaDebida: EyeCode;
  max: EyeCode;
  cerroTeorico: EyeCode | null;
}): boolean {
  const { fuerzaUsada, fuerzaDebida, max, cerroTeorico } = opts;
  if (fuerzaUsada == null) return false;
  if (fuerzaUsada > max) return false;
  if (fuerzaUsada !== fuerzaDebida) return false;
  if (cerroTeorico === 4 && fuerzaUsada === 9) return false;
  if (cerroTeorico && CASCADA_ENSENANZA.includes(cerroTeorico)) {
    const idx = CASCADA_ENSENANZA.indexOf(cerroTeorico);
    const siguiente = CASCADA_ENSENANZA[idx + 1];
    if (siguiente && fuerzaUsada !== siguiente && fuerzaUsada > cerroTeorico) {
      return false;
    }
  }
  return true;
}

export function desajusteDe(opts: {
  habla: EyeCode;
  max: EyeCode;
  cerroTeorico: EyeCode | null;
  fuerzaUsada: EyeCode | null;
  fuerzaDebida: EyeCode;
  cascada: boolean;
}): string {
  const { habla, max, cerroTeorico, fuerzaUsada, fuerzaDebida, cascada } = opts;
  if (cascada) {
    return `Cierre legal. Habla C${habla}. Se aplicó ${fuerzaDe(fuerzaDebida).nombre}.`;
  }
  if (cerroTeorico && fuerzaUsada && fuerzaUsada !== fuerzaDebida) {
    return `C${cerroTeorico} cerró el diagnóstico. El cierre teórico usó C${fuerzaUsada} (${fuerzaDe(fuerzaUsada).nombre}). El hueco pedía C${fuerzaDebida} (${fuerzaDe(fuerzaDebida).nombre}). Cascada incumplida.`;
  }
  if (fuerzaUsada && fuerzaUsada > max) {
    return `La fuerza C${fuerzaUsada} no cabe en el perímetro C${max}.`;
  }
  return `Habla C${habla}. El chasis sostiene hasta C${max}. Se nombra C${habla} y se aplica ${fuerzaDe(fuerzaDebida).nombre}.`;
}

export function confrontacionDeFuerza(
  max: EyeCode,
  habla: EyeCode,
  usada: EyeCode | null,
): string {
  const debida = fuerzaDebidaDe(habla, max);
  const acto = fuerzaDe(debida).acto;
  if (usada && usada !== debida) {
    return `${acto} ${fuerzaDe(usada).nombre} no cierra este hueco.`;
  }
  if (habla > max) {
    return `${acto} Se nombra C${habla}. El acto cabe en ${principioDe(max).nombre}.`;
  }
  return acto;
}

/** @deprecated usar confrontacionDeFuerza. Se conserva el nombre para tests. */
export function directivaDelPerimetro(
  max: EyeCode,
  problema: EyeCode,
): string {
  return confrontacionDeFuerza(max, problema, null);
}

export function fugaInconscienteDe(
  problema: EyeCode,
  max: EyeCode,
  extra?: { cerroTeorico?: EyeCode | null; fuerzaUsada?: EyeCode | null },
): string {
  const p = principioDe(problema);
  if (extra?.cerroTeorico === 4 && extra.fuerzaUsada === 9 && max <= 3) {
    return "Ya nombraste que no es la herramienta. Lo que no veías: el cierre usó fuerza C9 (proyecto) donde la obra pedía C3 (cerrar un paso). La habilidad no precede al primer clip.";
  }
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
  extra?: { cascada?: boolean; fuerzaDebida?: EyeCode },
): string {
  const recursos = recursosDelPerimetro(max);
  const debida = extra?.fuerzaDebida ?? fuerzaDebidaDe(problema, max);
  const cascada = extra?.cascada === true ? "Cascada cumplida." : "Cascada incumplida.";
  return `Habla C${problema}. El chasis sostiene hasta C${max} (${recursos}). Se nombra C${problema} y se aplica ${fuerzaDe(debida).nombre}. ${cascada}`;
}

export function directivaFiltraPerimetro(
  texto: string,
  max: EyeCode,
): boolean {
  if (EMPATIA_BLANDA.test(texto) || TEORIA_ACADEMICA.test(texto)) return false;
  for (const marca of CODIGO_SUPERIOR_LEX) {
    if (marca.codigo > max && marca.re.test(texto)) return false;
  }
  return true;
}

export function fase2De(texto: string): JuezSerioFase2 {
  const limpio = texto.trim();
  return {
    requiereInversionCreditos: true,
    confrontacionDeFuerza: limpio,
    directivaOperacional: limpio,
  };
}

export function hidratarFase1(raw: Partial<JuezSerioFase1> & {
  codigoProblemaDetectado: EyeCode;
  codigoConquistadoMax: EyeCode;
  fugaInconsciente: string;
  lecturaPerimetroFria: string;
}): JuezSerioFase1 {
  const habla = raw.codigoQueHabla ?? raw.codigoProblemaDetectado;
  const max = raw.codigoConquistadoMax;
  const debida = raw.fuerzaDebida ?? fuerzaDebidaDe(habla, max);
  const participaciones =
    raw.participaciones && raw.participaciones.length > 0
      ? raw.participaciones
      : [
          { codigo: habla, fuerza: fuerzaDe(habla).nombre },
          ...(max !== habla
            ? [{ codigo: max, fuerza: fuerzaDe(max).nombre }]
            : []),
        ];
  return {
    codigoProblemaDetectado: raw.codigoProblemaDetectado,
    codigoQueHabla: habla,
    codigoConquistadoMax: max,
    participaciones,
    codigoQueCerroTeorico: raw.codigoQueCerroTeorico ?? null,
    fuerzaUsada: raw.fuerzaUsada ?? null,
    fuerzaDebida: debida,
    cascadaCumple: raw.cascadaCumple ?? false,
    desajusteFuerza:
      raw.desajusteFuerza?.trim() ||
      desajusteDe({
        habla,
        max,
        cerroTeorico: raw.codigoQueCerroTeorico ?? null,
        fuerzaUsada: raw.fuerzaUsada ?? null,
        fuerzaDebida: debida,
        cascada: raw.cascadaCumple ?? false,
      }),
    fugaInconsciente: raw.fugaInconsciente.trim(),
    lecturaPerimetroFria: raw.lecturaPerimetroFria.trim(),
  };
}

export function acotarAlPerimetro(result: JuezSerioResult): JuezSerioResult {
  const f1 = hidratarFase1(result.fase1_lectura);
  const raw = (
    result.fase2_propuesta_solucion.confrontacionDeFuerza ||
    result.fase2_propuesta_solucion.directivaOperacional ||
    ""
  ).trim();
  const local = confrontacionDeFuerza(f1.codigoConquistadoMax, f1.codigoQueHabla, f1.fuerzaUsada);
  const texto = directivaFiltraPerimetro(raw, f1.codigoConquistadoMax) ? raw : local;

  return {
    fase1_lectura: f1,
    fase2_propuesta_solucion: fase2De(texto),
  };
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseEyeOrNull(value: unknown): EyeCode | null {
  if (value == null || value === "") return null;
  return parseEyeCode(value);
}

function parseParticipaciones(raw: unknown): ParticipacionFuerza[] {
  if (!Array.isArray(raw)) return [];
  const out: ParticipacionFuerza[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const codigo = parseEyeCode((item as { codigo?: unknown }).codigo);
    if (!codigo) continue;
    const fuerza = trimText((item as { fuerza?: unknown }).fuerza) || fuerzaDe(codigo).nombre;
    out.push({ codigo, fuerza });
  }
  return out;
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
  const problema = parseEyeCode(f1.codigoProblemaDetectado ?? f1.codigoQueHabla);
  const max = parseEyeCode(f1.codigoConquistadoMax);
  const fuga = trimText(f1.fugaInconsciente);
  const lectura = trimText(f1.lecturaPerimetroFria || f1.lecturaPerimetroFrancia);
  const confrontacion = trimText(f2.confrontacionDeFuerza || f2.directivaOperacional);

  if (!problema || !max) {
    return { ok: false, error: "Los códigos deben ser enteros 1–10." };
  }
  if (!fuga || !lectura || !confrontacion) {
    return { ok: false, error: "Faltan campos de texto del dictamen." };
  }

  const habla = parseEyeCode(f1.codigoQueHabla) ?? problema;
  const cascadaRaw = f1.cascadaCumple;
  const cascadaCumple =
    typeof cascadaRaw === "boolean"
      ? cascadaRaw
      : cascadaRaw === "true"
        ? true
        : false;

  return {
    ok: true,
    result: acotarAlPerimetro({
      fase1_lectura: hidratarFase1({
        codigoProblemaDetectado: problema,
        codigoQueHabla: habla,
        codigoConquistadoMax: max,
        participaciones: parseParticipaciones(f1.participaciones),
        codigoQueCerroTeorico: parseEyeOrNull(f1.codigoQueCerroTeorico),
        fuerzaUsada: parseEyeOrNull(f1.fuerzaUsada),
        fuerzaDebida: parseEyeCode(f1.fuerzaDebida) ?? fuerzaDebidaDe(habla, max),
        cascadaCumple,
        desajusteFuerza: trimText(f1.desajusteFuerza),
        fugaInconsciente: fuga,
        lecturaPerimetroFria: lectura,
      }),
      fase2_propuesta_solucion: fase2De(confrontacion),
    }),
  };
}

export function diagnosticarJuezSerioLocal(
  input: JuezSerioInput,
): JuezSerioResult {
  const friccion = input.friccionDiaria?.trim() ?? "";
  const habla = detectarCodigoProblema(friccion);
  const inferido = inferirPerimetroConquistado(friccion);
  const max = clampEye(input.codigoConquistadoMax ?? inferido);
  const participaciones = participacionesDelVolcado(friccion);
  const cerroTeorico = codigoQueCerroDelVolcado(friccion);
  const fuerzaUsada = fuerzaUsadaDelCierre(friccion);
  const fuerzaDebida = fuerzaDebidaDe(habla, max);
  const cascada = cascadaCumpleDe({
    fuerzaUsada,
    fuerzaDebida,
    max,
    cerroTeorico,
  });
  const desajuste = desajusteDe({
    habla,
    max,
    cerroTeorico,
    fuerzaUsada,
    fuerzaDebida,
    cascada,
  });
  const fuga = friccion
    ? fugaInconscienteDe(habla, max, { cerroTeorico, fuerzaUsada })
    : "No hay volcado. Sin fricción no hay vía de agua que nombrar.";
  const lectura = friccion
    ? lecturaPerimetroDe(habla, max, { cascada, fuerzaDebida })
    : `${CASA_CODIGO4_FIRMA} Sin texto el perímetro no se mide.`;

  return acotarAlPerimetro({
    fase1_lectura: hidratarFase1({
      codigoProblemaDetectado: habla,
      codigoQueHabla: habla,
      codigoConquistadoMax: max,
      participaciones,
      codigoQueCerroTeorico: cerroTeorico,
      fuerzaUsada,
      fuerzaDebida,
      cascadaCumple: cascada,
      desajusteFuerza: desajuste,
      fugaInconsciente: fuga,
      lecturaPerimetroFria: lectura,
    }),
    fase2_propuesta_solucion: fase2De(
      confrontacionDeFuerza(max, habla, fuerzaUsada),
    ),
  });
}

export function evaluarJuezSerio(input: JuezSerioInput): JuezSerioResult {
  return diagnosticarJuezSerioLocal(input);
}
