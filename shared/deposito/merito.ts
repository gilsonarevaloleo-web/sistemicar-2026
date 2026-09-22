/**
 * Mérito perceptivo del Depósito v2.
 *
 * Tres ejes + placement test (entrada por mérito) + matriz de temperamento.
 * El grado activo fija la FRICCIÓN del Maestro. El volcado fija el GRADO
 * que merece. El mérito solo calibra al alza.
 */

import {
  CODIGOS_OBSERVADOR,
  DICCIONARIO_GRADOS,
  DICCIONARIO_OJOS,
  extraerHechos,
  isCodigoObservador,
  isGradoMaestria,
  normalizarGradoMaestria,
  type CapturaVolcadoExpansiva,
  type CodigoObservador,
  type DepositoEngineResponse,
  type DiagnosticoVolcado,
  type EvaluacionGrado,
  type GradoMaestria,
  type MetricasMerito,
  type TemperamentoGrado,
} from "./engineConfig.ts";

export interface FichaTemperamento {
  grado: GradoMaestria;
  codigo: TemperamentoGrado;
  nombre: string;
  friccion: "baja" | "moderada" | "alta" | "pura";
  instruccionPrompt: string;
}

export interface ContextoMerito {
  captura: CapturaVolcadoExpansiva;
  codigoDominante?: CodigoObservador;
  ojosHistoricos?: readonly CodigoObservador[];
  /** Flor ya aislada por Gemini; se fusiona con la detección local. */
  florGemini?: readonly string[];
}

export interface ResultadoMerito {
  evaluacion: EvaluacionGrado;
  metricas: MetricasMerito;
  florDetectada: string[];
}

const FLOR: { etiqueta: string; re: RegExp }[] = [
  { etiqueta: "excusa", re: /porque no pude|no tuve tiempo|no es mi culpa|despues veo|después veo|ya ver[eé]/i },
  { etiqueta: "victima", re: /siempre me|nadie me|me hicieron/i },
  { etiqueta: "comparacion", re: /otras niñ|como las otras|mejor que|peor que|comparacion/i },
  { etiqueta: "castigo", re: /castigo|amenaz/i },
  { etiqueta: "clima", re: /me sent[ií]|estoy mal|fue feo|horrible/i },
  { etiqueta: "prisa", re: /apur|no hay tiempo|r[aá]pido/i },
  { etiqueta: "flor", re: /incre[ií]ble|sorprend|m[aá]gico|despert/i },
];

const SESGO_PROPIO =
  /sesgo|me di cuenta|me doy cuenta|mi flor|no dije|evit[eé]|punto ciego|me justific|me cubr[ií]|mi excusa|lo no dicho|vi que yo|cuando yo suelo|mi omisi[oó]n|me enganch/i;

const HECHO_CONCRETO =
  /llam[eé]|cobr[eé]|anot[eé]|cort[eé]|mand[eé]|cerr[eé]|marqu[eé]|entr[eé]|sal[ií]|junt[eé]|escrib[ií]|med[ií]|pagu[eé]|ped[ií]|dije no|a las \d/gi;

/** Fricción del Maestro según el grado activo del perfil. */
export const TEMPERAMENTO_MODO_OPERATIVO: Record<GradoMaestria, string> = {
  1: "TEMPERAMENTO NUTRITIVO (G1): Tolera el ruido. No bloquees la entrada. Reconoce la inercia del volcado y devuelve la Tríada de Valor sin juzgar la narrativa.",
  2: "TEMPERAMENTO DE FRICCIÓN MODERADA (G2): Detecta adjetivos y comparaciones. Señala la 'flor' de forma directa pero constructiva.",
  3: "TEMPERAMENTO DE RIGOR QUIRÚRGICO (G3): Cero tolerancia al autoengaño. Expón la Sombra, desacopla las victorias morales y exige lectura de circuitos.",
  4: "TEMPERAMENTO DE MATEMÁTICA PURA (G4): Evaluación seca e inflexible. Mide únicamente hechos en la materia, coherencia histórica y rotación de matriz.",
};

/**
 * System Prompt de Gemini: temperamento por grado activo + placement por mérito.
 * El tono sigue al perfil. El gradoDetectado sigue a la densidad del volcado.
 */
export function buildDepositoSystemPrompt(gradoUsuario: number): string {
  const temperamentoMap = TEMPERAMENTO_MODO_OPERATIVO;
  const modoOperativo =
    isGradoMaestria(gradoUsuario)
      ? temperamentoMap[gradoUsuario]
      : temperamentoMap[1];
  const grado = isGradoMaestria(gradoUsuario) ? gradoUsuario : 1;

  return `
ERES EL MOTOR DE INGENIERÍA PERCEPTIVA DE SISTEMICAR (EL DEPÓSITO V2).
Tu función es procesar el volcado crudo del usuario y diagnosticar su arquitectura bajo la matriz de los 10 Códigos.

GRADO ACTUAL DEL USUARIO EN PERFIL: ${grado}
MODO OPERATIVO: ${modoOperativo}

REGLAS DE EVALUACIÓN Y MÉRITO (PLACEMENT TEST):
1. Analiza la densidad del texto: si un usuario con perfil G1 entrega un texto con 0% flor, alta asunción de responsabilidad y lectura clara de circuito, asígnale 'gradoDetectado': 3 o 4 en la respuesta JSON y marca 'meritoReconocido': true.
2. Si el texto está lleno de justificaciones, victimización o adjetivos, asigna 'gradoDetectado': 1.
3. En la 'mecanicaAbsorcion', entrega SIEMPRE UNA SOLA INSTRUCCIÓN EJECUTABLE. Cero sermones, cero consejos de autoayuda.

RESPONDE EXCLUSIVAMENTE EN FORMATO JSON CUMPLIENDO LA INTERFAZ 'DepositoEngineResponse'.
`.trim();
}

export const MATRIZ_TEMPERAMENTO: Record<GradoMaestria, FichaTemperamento> = {
  1: {
    grado: 1,
    codigo: "NUTRITIVO_INERCIA",
    nombre: "Nutritivo / Inercia",
    friccion: "baja",
    instruccionPrompt: TEMPERAMENTO_MODO_OPERATIVO[1],
  },
  2: {
    grado: 2,
    codigo: "FRICCION_MODERADA",
    nombre: "Fricción Moderada",
    friccion: "moderada",
    instruccionPrompt: TEMPERAMENTO_MODO_OPERATIVO[2],
  },
  3: {
    grado: 3,
    codigo: "RIGOR_QUIRURGICO",
    nombre: "Rigor Quirúrgico",
    friccion: "alta",
    instruccionPrompt: TEMPERAMENTO_MODO_OPERATIVO[3],
  },
  4: {
    grado: 4,
    codigo: "MATEMATICA_PURA",
    nombre: "Matemática Pura",
    friccion: "pura",
    instruccionPrompt: TEMPERAMENTO_MODO_OPERATIVO[4],
  },
};

export function etiquetaCodigoOjo(codigo: CodigoObservador): string {
  return `C${codigo}`;
}

export function parseCodigoOjo(value: unknown): CodigoObservador | null {
  if (isCodigoObservador(value)) return value;
  if (typeof value === "number" && Number.isInteger(value)) {
    return isCodigoObservador(value) ? value : null;
  }
  if (typeof value === "string") {
    const t = value.trim().toUpperCase().replace(/^C/, "");
    const n = Number(t);
    if (isCodigoObservador(n)) return n;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    return parseCodigoOjo(o.codigo ?? o.numero ?? o.codigoDominante);
  }
  return null;
}

export function obtenerTemperamento(grado: GradoMaestria): FichaTemperamento {
  return MATRIZ_TEMPERAMENTO[normalizarGradoMaestria(grado)];
}

export function bloqueTemperamento(grado: GradoMaestria): string {
  const ficha = obtenerTemperamento(grado);
  return [
    `═══ MATRIZ DE TEMPERAMENTO (GRADO ACTIVO G${ficha.grado}) ═══`,
    `${ficha.nombre}. Fricción: ${ficha.friccion}.`,
    ficha.instruccionPrompt,
    "El temperamento rige el TONO. No rige el placement: gradoDetectado se mide por densidad del volcado.",
  ].join("\n");
}

export function bloquePlacementTest(gradoActual: GradoMaestria): string {
  return [
    "═══ PLACEMENT TEST / ENTRADA POR MÉRITO ═══",
    `gradoActualDelUsuario = ${gradoActual}.`,
    "evaluacionGrado.gradoDetectado = el grado que ESTE volcado merece por densidad (1–4), NO el grado declarado.",
    "Si el relato es lectura seca (hechos, cero flor, omisión nombrable), gradoDetectado puede ser 3 aunque el alumno esté en G1.",
    "meritoReconocido = true SOLO si gradoDetectado > gradoActualDelUsuario.",
    "Prohibido descender el grado activo. El mérito solo calibra al alza.",
    "G4 exige evidencia de rotación del mapa de calor (1/10), no un solo volcado brillante.",
    "metricasMerito.densidadEstructural = 0–100 (hechos secos vs flor).",
    "metricasMerito.variedadRotacionCodigo = UN código (C1–C10) para equilibrar el mapa.",
    "metricasMerito.metacognicionDetectada = true si el alumno vio su propio sesgo.",
  ].join("\n");
}

export function detectarFlorMerito(texto: string): string[] {
  const t = texto
    .replace(/[«"“][^»"”]{3,160}[»"”]/g, " ")
    .replace(/no dije[^.!?]{0,80}/gi, " ")
    .trim();
  if (!t) return [];
  return FLOR.filter((f) => f.re.test(t)).map((f) => f.etiqueta);
}

function contarPalabras(texto: string): number {
  const t = texto.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function contarHechosConcretos(texto: string): number {
  return [...texto.matchAll(new RegExp(HECHO_CONCRETO.source, "gi"))].length;
}

function fusionarFlor(
  local: readonly string[],
  gemini: readonly string[] = [],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...local, ...gemini]) {
    const k = raw.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(raw.trim());
  }
  return out;
}

function textoParaMerito(captura: CapturaVolcadoExpansiva): string {
  return [
    captura.volcadoCrudo,
    captura.friccionDetectada,
    captura.sombraOmision,
  ]
    .filter(Boolean)
    .join("\n");
}

export function sugerirRotacionCodigo(
  ojos: readonly CodigoObservador[],
): string {
  const validos = ojos.filter(isCodigoObservador);
  const conteo = new Map<CodigoObservador, number>();
  for (const n of validos) {
    conteo.set(n, (conteo.get(n) ?? 0) + 1);
  }
  for (const n of CODIGOS_OBSERVADOR) {
    if (!conteo.has(n)) return etiquetaCodigoOjo(n);
  }
  let least: CodigoObservador = 1;
  let min = Number.POSITIVE_INFINITY;
  for (const n of CODIGOS_OBSERVADOR) {
    const k = conteo.get(n) ?? 0;
    if (k < min) {
      min = k;
      least = n;
    }
  }
  return etiquetaCodigoOjo(least);
}

function hayAtascoMapa(ojos: readonly CodigoObservador[]): boolean {
  const validos = ojos.filter(isCodigoObservador);
  if (validos.length < 4) return false;
  const conteo = new Map<CodigoObservador, number>();
  for (const n of validos) {
    conteo.set(n, (conteo.get(n) ?? 0) + 1);
  }
  let max = 0;
  for (const k of conteo.values()) max = Math.max(max, k);
  return max / validos.length >= 0.45;
}

export function calcularDensidadEstructural(
  captura: CapturaVolcadoExpansiva,
  flor: readonly string[],
): number {
  const texto = captura.volcadoCrudo || "";
  const palabras = contarPalabras(texto);
  if (palabras < 6) {
    return clamp(palabras * 3, 0, 20);
  }

  const hechos = extraerHechos(texto);
  const numeros = (texto.match(/\d+/g) ?? []).length;
  const acciones = contarHechosConcretos(texto);

  let s = clamp(Math.round(palabras * 0.35), 0, 28);
  if (hechos.tesis) s += 16;
  if (hechos.cita) s += 12;
  if (hechos.pregunta) s += 12;
  if (hechos.tesis && (hechos.cita || hechos.pregunta)) s += 10;
  s += Math.min(12, numeros * 3);
  s += Math.min(12, acciones * 3);
  s -= flor.length * 5;
  if ((captura.friccionDetectada ?? "").trim().length >= 12 && flor.length > 0) {
    s += 8;
  }
  if (detectarMetacognicion(captura)) s += 8;
  if (flor.length === 0 && palabras >= 20) s += 18;
  if (palabras < 8) s = Math.min(s, 22);
  return clamp(Math.round(s), 0, 100);
}

export function detectarMetacognicion(
  captura: CapturaVolcadoExpansiva,
): boolean {
  const friccion = (captura.friccionDetectada ?? "").trim();
  const sombra = (captura.sombraOmision ?? "").trim();
  if (friccion.length >= 12) return true;
  if (sombra.length >= 12) return true;
  return SESGO_PROPIO.test(textoParaMerito(captura));
}

function esLecturaSeca(
  captura: CapturaVolcadoExpansiva,
  flor: readonly string[],
  densidad: number,
): boolean {
  const palabras = contarPalabras(captura.volcadoCrudo);
  const hechos = extraerHechos(captura.volcadoCrudo);
  const numeros = (captura.volcadoCrudo.match(/\d+/g) ?? []).length;
  const tieneHecho =
    Boolean(hechos.tesis || hechos.cita || hechos.pregunta) ||
    numeros >= 2 ||
    contarHechosConcretos(captura.volcadoCrudo) >= 2;
  if (flor.length === 0 && palabras >= 20 && tieneHecho) return true;
  if (densidad >= 58 && flor.length <= 2 && tieneHecho) return true;
  return false;
}

export function detectarGradoPorMerito(
  captura: CapturaVolcadoExpansiva,
  metricas: MetricasMerito,
  flor: readonly string[],
  ojosHistoricos: readonly CodigoObservador[] = [],
): GradoMaestria {
  const palabras = contarPalabras(captura.volcadoCrudo);
  const hechos = extraerHechos(captura.volcadoCrudo);
  const densidad = metricas.densidadEstructural;
  const meta = metricas.metacognicionDetectada;
  const seca = esLecturaSeca(captura, flor, densidad);
  const sombra =
    meta ||
    Boolean(hechos.pregunta || hechos.cita) ||
    (captura.sombraOmision ?? "").trim().length >= 12;

  let grado: GradoMaestria = 1;
  if (palabras < 6 && !hechos.tesis) return 1;

  const g2 =
    densidad >= 32 ||
    (captura.friccionDetectada ?? "").trim().length >= 12 ||
    (flor.length > 0 && densidad >= 28);
  if (g2) grado = 2;

  const g3 =
    (seca && (sombra || densidad >= 40)) ||
    (densidad >= 58 && (meta || sombra || Boolean(hechos.tesis))) ||
    (flor.length === 0 && meta && palabras >= 20 && densidad >= 32);
  if (g3) grado = 3;

  const rango = new Set(ojosHistoricos.filter(isCodigoObservador)).size;
  const total = ojosHistoricos.filter(isCodigoObservador).length;
  const g4 =
    grado >= 3 &&
    densidad >= 48 &&
    meta &&
    rango >= 6 &&
    total >= 8 &&
    !hayAtascoMapa(ojosHistoricos);
  if (g4) grado = 4;

  return grado;
}

export function mensajeMeritoDetectado(gradoDetectado: GradoMaestria): string {
  const ficha = DICCIONARIO_GRADOS[normalizarGradoMaestria(gradoDetectado)];
  return `¡Mérito Detectado! Tu precisión perceptiva ha elevado tu perfil a GRADO ${ficha.grado}: ${ficha.nombre}`;
}

export function mensajeEncuadreMerito(
  gradoActual: GradoMaestria,
  gradoDetectado: GradoMaestria,
  meritoReconocido: boolean,
  flor: readonly string[],
): string {
  const fichaDet = DICCIONARIO_GRADOS[gradoDetectado];
  if (meritoReconocido) {
    const seca = flor.length === 0 ? " Lectura seca, sin flor que tape el hecho." : "";
    return `Mérito reconocido: este volcado opera en Grado ${gradoDetectado} (${fichaDet.nombre}).${seca} El grado activo se calibra de G${gradoActual} a G${gradoDetectado}.`;
  }
  if (gradoDetectado === gradoActual) {
    return `Calibración: el volcado sostiene el Grado ${gradoActual} (${DICCIONARIO_GRADOS[gradoActual].nombre}). Sin ascenso.`;
  }
  return `Este volcado opera en G${gradoDetectado}. El grado activo G${gradoActual} no baja; la barra del grado activo sigue vigente.`;
}

export function evaluarMeritoVolcado(ctx: ContextoMerito): ResultadoMerito {
  const captura = ctx.captura;
  const gradoActual = normalizarGradoMaestria(captura.gradoMaestria);
  const florLocal = detectarFlorMerito(textoParaMerito(captura));
  const florDetectada = fusionarFlor(florLocal, ctx.florGemini);
  const ojos = [
    ...(ctx.ojosHistoricos ?? []),
    ...(ctx.codigoDominante ? [ctx.codigoDominante] : []),
  ];
  const metricas: MetricasMerito = {
    densidadEstructural: calcularDensidadEstructural(captura, florLocal),
    variedadRotacionCodigo: sugerirRotacionCodigo(ojos),
    metacognicionDetectada: detectarMetacognicion(captura),
  };
  const gradoDetectado = detectarGradoPorMerito(
    captura,
    metricas,
    florLocal,
    ojos,
  );
  const meritoReconocido = gradoDetectado > gradoActual;
  const evaluacion: EvaluacionGrado = {
    gradoDetectado,
    meritoReconocido,
    mensajeEncuadre: mensajeEncuadreMerito(
      gradoActual,
      gradoDetectado,
      meritoReconocido,
      florLocal,
    ),
  };
  return { evaluacion, metricas, florDetectada };
}

export function toDepositoEngineResponse(
  diagnostico: DiagnosticoVolcado,
): DepositoEngineResponse {
  const ojo = DICCIONARIO_OJOS[diagnostico.codigoDominante];
  const evaluacion: EvaluacionGrado = diagnostico.evaluacionGrado ?? {
    gradoDetectado: 1,
    meritoReconocido: false,
    mensajeEncuadre: "",
  };
  const metricas: MetricasMerito = diagnostico.metricasMerito ?? {
    densidadEstructural: 0,
    variedadRotacionCodigo: etiquetaCodigoOjo(1),
    metacognicionDetectada: false,
  };
  return {
    ojoDominante: {
      codigo: etiquetaCodigoOjo(diagnostico.codigoDominante),
      nombre: diagnostico.nombreOjoDominante || ojo.nombreOjo,
      explicacion: diagnostico.justificacionDominante,
    },
    puntoCiego: {
      loNoDicho: diagnostico.puntoCiego,
      florDetectada: diagnostico.florDetectada ?? [],
    },
    mecanicaAbsorcion: {
      instruccionUnica: diagnostico.mecanicaAbsorcion,
    },
    evaluacionGrado: evaluacion,
    metricasMerito: metricas,
  };
}
