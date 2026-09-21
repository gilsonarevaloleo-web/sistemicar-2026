/**
 * Depósito v2 — La Universidad de Sistemicar
 * Motor de Volcados de Aprendizaje (sin UI).
 *
 * El alumno no elige código. Volca el día al ritual «¿Qué aprendí hoy?».
 * Los 10 Ojos diagnostican el centro de gravedad.
 * El Muro de Dominancia obliga a UN solo Código Dominante.
 *
 * Encaje con el tronco:
 * - Misma numeración 1–10 que Umbral (`DICCIONARIO_CODIGOS`).
 * - Ritual y unidad de `leyOpticaCodigo` (volcado / ¿Qué aprendí hoy?).
 * - `analizarVolcado` sigue siendo el frente óptico local (cascada).
 *   Este motor es la devolución de alto valor: Ojo + Ceguera + Absorción.
 *
 * Spec pedía `src/lib/deposito/engineConfig.ts`; el núcleo vive aquí
 * para uso dual client/server (mismo patrón que Umbral v2).
 */

import { LEY_OPTICA_CODIGO_KERNEL } from "./leyOpticaCodigo.ts";

export type CodigoObservador = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type NivelCargaSugerido = "BASICO" | "INTERMEDIO" | "SUPERIOR";

export interface FichaOjoCodigo {
  numero: CodigoObservador;
  /** Ej. "El Ojo de la Claridad", "El Ojo del Ritmo". */
  nombreOjo: string;
  /** Lo que este Código observa. */
  focoAtencion: string;
  /** Voz del Maestro cuando este código es el dominante. */
  voz: string;
  /** Ceguera típica que este ojo revela en el relato. */
  cegueraActiva: string;
  /** Gesto de absorción: una sola acción ejecutable mañana. */
  gestoAbsorcion: string;
}

export interface DiagnosticoVolcado {
  codigoDominante: CodigoObservador;
  nombreOjoDominante: string;
  justificacionDominante: string;
  puntoCiego: string;
  /** Redactada desde el carácter del Código activo. */
  devolucionMaestro: string;
  /** Acción concreta para mañana. */
  mecanicaAbsorcion: string;
  nivelCargaSugerido: NivelCargaSugerido;
}

export interface PromptVolcadoAprendizaje {
  system: string;
  user: string;
  responseSchema: DiagnosticoVolcado;
  ritual: string;
}

export type GeminiVolcadoCaller = (
  prompt: string,
  maxTokens?: number,
  jsonMode?: boolean,
) => Promise<string>;

export interface ProcesarVolcadoDeps {
  callGemini?: GeminiVolcadoCaller;
}

export interface ResultadoVolcadoAprendizaje {
  diagnostico: DiagnosticoVolcado;
  source: "gemini" | "local_fallback";
}

export const RITUAL_VOLCADO = "¿Qué aprendí hoy?";

export const CODIGOS_OBSERVADOR: readonly CodigoObservador[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
];

export const NIVELES_CARGA: readonly NivelCargaSugerido[] = [
  "BASICO",
  "INTERMEDIO",
  "SUPERIOR",
];

/**
 * Los 10 Ojos — lentes de observación activa.
 * Numeración idéntica a los 10 Códigos de Umbral.
 * No son personalidades ni chakras: son proyectores del mismo hecho.
 */
export const DICCIONARIO_OJOS: Record<CodigoObservador, FichaOjoCodigo> = {
  1: {
    numero: 1,
    nombreOjo: "El Ojo de la Claridad",
    focoAtencion: "utilidad",
    voz: "El Cortador de Niebla",
    cegueraActiva:
      "Confunde ruido con trabajo: se siente ocupado y no nombra la utilidad directa de lo que ocurrió.",
    gestoAbsorcion:
      "Mañana, nombra en una sola frase la utilidad concreta de UNA acción — qué sirve, a quién, para qué — y descarta el resto como ruido.",
  },
  2: {
    numero: 2,
    nombreOjo: "El Ojo de la Suma",
    focoAtencion: "combinaciones",
    voz: "El Apalancador",
    cegueraActiva:
      "Ve piezas sueltas o restas. No observa la combinación, la coincidencia ni el apalancamiento ya disponible.",
    gestoAbsorcion:
      "Mañana, junta DOS recursos que ya tenés (persona, hábito, herramienta) y usalos juntos en un solo movimiento. No agregues carga nueva.",
  },
  3: {
    numero: 3,
    nombreOjo: "El Ojo del Ritmo y la Repetición",
    focoAtencion: "secuencias",
    voz: "El Relojero Práctico",
    cegueraActiva:
      "Confunde velocidad con absorción: se mueve mucho y no mide ritmo, frecuencia ni secuencia real.",
    gestoAbsorcion:
      "Mañana, ejecutá UNA secuencia de tres pasos con hora de inicio y de corte. No aceleres: repetí el orden hasta que el reloj mande, no el apuro.",
  },
  4: {
    numero: 4,
    nombreOjo: "El Ojo de la Seriedad",
    focoAtencion: "prevención",
    voz: "El Ingeniero sin Flor",
    cegueraActiva:
      "No observa la interrupción ni el quiebre que se está armando. Cubre el riesgo con flor, ilusión o «ya veré».",
    gestoAbsorcion:
      "Mañana, nombrá el quiebre más probable del día y ejecutá UNA acción mínima de prevención (hecho + límite) antes de las 12:00. Cero floritura.",
  },
  5: {
    numero: 5,
    nombreOjo: "El Ojo del Cálculo",
    focoAtencion: "métricas",
    voz: "El Auditor",
    cegueraActiva:
      "Navega por sensación. Evita márgenes, proporciones y cifras objetivas que tumbarían el relato.",
    gestoAbsorcion:
      "Mañana, anotá TRES cifras reales de lo que vas a operar (cantidad, tiempo, tasa o monto). Decidí con esos números, no con el clima.",
  },
  6: {
    numero: 6,
    nombreOjo: "El Ojo del Roce",
    focoAtencion: "fricción",
    voz: "El Cuerpo en la Puerta",
    cegueraActiva:
      "Ensaya en la cabeza y evita el contacto. El miedo al rechazo manda; el cuerpo no entra.",
    gestoAbsorcion:
      "Mañana, un solo roce físico mínimo: una llamada, una puerta o un mensaje enviado. El cuerpo entra; la mente deja de ensayar.",
  },
  7: {
    numero: 7,
    nombreOjo: "El Ojo de la Justicia",
    focoAtencion: "balanza",
    voz: "El Balancero",
    cegueraActiva:
      "No observa la balanza de valor. Da de más, cobra de menos o se culpa por marcar precio.",
    gestoAbsorcion:
      "Mañana, sostené UN intercambio sin descuento emocional: nombrá qué das, qué pedís, y no bajes el precio por culpa.",
  },
  8: {
    numero: 8,
    nombreOjo: "El Ojo de la Persistencia",
    focoAtencion: "estrategia",
    voz: "El que Sostiene el Marco",
    cegueraActiva:
      "Arranca y suelta. Confunde empuje con estrategia: no observa el desgaste ni el marco que hay que sostener en el tiempo.",
    gestoAbsorcion:
      "Mañana, definí el checkpoint del día y UNA cosa que no se negocia cuando aparezca el desgaste. Ejecutá el ritmo, no el heroísmo.",
  },
  9: {
    numero: 9,
    nombreOjo: "El Ojo del Sistema",
    focoAtencion: "sistema",
    voz: "El Integrador",
    cegueraActiva:
      "Ve el evento y no el circuito. No observa las leyes invisibles ni la red de causa-efecto que sostiene (o tumba) el conjunto.",
    gestoAbsorcion:
      "Mañana, convertí UN gesto suelto en circuito: cuándo, dónde, duración, trigger. Que se repita sin depender del pico de ánimo.",
  },
  10: {
    numero: 10,
    nombreOjo: "El Ojo del Dominio",
    focoAtencion: "soberanía",
    voz: "El Autor",
    cegueraActiva:
      "Sabe el mapa y se presenta como aprendiz eterno. No observa la soberanía: evita asumir el rol de autor.",
    gestoAbsorcion:
      "Mañana, actuá UNA vez como dueño del estándar: una decisión que no pida permiso y una conducta coherente con ese rol.",
  },
};

const SENALES_OJO: Record<CodigoObservador, RegExp[]> = {
  1: [
    /utilidad/,
    /clarid/,
    /esencial/,
    /sin ruido/,
    /una frase/,
    /para que sirve/,
    /para qué sirve/,
  ],
  2: [
    /combin/,
    /relacion/,
    /relación/,
    /coincid/,
    /confusion/,
    /confusión/,
    /apalanc/,
    /\bsuma\b/,
    /mezcl/,
  ],
  3: [
    /ritmo/,
    /frecuencia/,
    /secuencia/,
    /velocidad/,
    /paso a paso/,
  ],
  4: [
    /interrump/,
    /problema/,
    /preven/,
    /quiebre/,
    /\bflor\b/,
    /seriedad/,
    /estandar/,
    /estándar/,
    /limite/,
    /límite/,
    /riesgo/,
  ],
  5: [
    /metric/,
    /métric/,
    /cifra/,
    /tasa/,
    /margen/,
    /proporcion/,
    /proporción/,
    /porcentaje/,
    /\b\d+\s*%/,
  ],
  6: [
    /rechazo/,
    /miedo/,
    /contacto/,
    /puerta/,
    /llamada/,
    /friccion/,
    /fricción/,
    /cuerpo/,
    /expos/,
    /roce/,
    /ansiedad/,
  ],
  7: [
    /precio/,
    /cobr/,
    /justo/,
    /justicia/,
    /culpa/,
    /barato/,
    /caro/,
    /intercambio/,
    /balanza/,
    /descuento/,
  ],
  8: [
    /desgaste/,
    /sosten/,
    /sostén/,
    /estrateg/,
    /abandon/,
    /valle/,
    /persist/,
    /marco/,
    /constancia/,
    /siempre pasa/,
  ],
  9: [
    /sistema/,
    /circuito/,
    /proceso/,
    /alrededor/,
    /carga cognitiva/,
    /como se llama/,
    /cómo se llama/,
    /leccion/,
    /lección/,
    /observ/,
    /causa/,
    /efecto/,
    /patron/,
    /patrón/,
    /entiende/,
  ],
  10: [
    /\bautor/,
    /\brol\b/,
    /soberan/,
    /identidad/,
    /dueño/,
    /dueno/,
    /dominio/,
    /asumo/,
    /se defend/,
  ],
};

export function obtenerOjo(codigo: CodigoObservador): FichaOjoCodigo {
  return DICCIONARIO_OJOS[codigo];
}

export function isCodigoObservador(value: unknown): value is CodigoObservador {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 10
  );
}

export function isNivelCargaSugerido(
  value: unknown,
): value is NivelCargaSugerido {
  return (
    value === "BASICO" || value === "INTERMEDIO" || value === "SUPERIOR"
  );
}

function coerceCodigoObservador(value: unknown): CodigoObservador | null {
  if (isCodigoObservador(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.trim());
    if (isCodigoObservador(n)) return n;
  }
  return null;
}

function diccionarioCompacto(): string {
  return CODIGOS_OBSERVADOR.map((n) => {
    const o = DICCIONARIO_OJOS[n];
    return `C${n} ${o.nombreOjo} — observa ${o.focoAtencion}. Voz: ${o.voz}. Ceguera típica: ${o.cegueraActiva}`;
  }).join("\n");
}

const KERNEL_UNIVERSIDAD = `
${LEY_OPTICA_CODIGO_KERNEL}

Eres el Maestro de La Universidad de Sistemicar (Depósito v2).
El alumno volcó su día crudo respondiendo al ritual: ${RITUAL_VOLCADO}

No consolás. No animás. No moralizás. No vendés un tercer ojo.
Nombrás el centro de gravedad del volcado y devolvés una mecánica.

═══ REGLA DEL MURO DE DOMINANCIA (INQUEBRANTABLE) ═══
Queda estrictamente prohibido listar múltiples códigos.
Debes elegir UN SOLO Código Dominante (entero 1–10).
Si el volcado toca varios ojos, nombrás el centro de gravedad, no el inventario.
Prohibido: "también C4", "mezcla de 3 y 6", arrays de códigos, empates.
El resto de ojos no se mencionan por número.

═══ DEVOLUCIÓN (tres tiempos, prosa, sin markdown, sin títulos) ═══
devolucionMaestro se redacta desde el CARÁCTER del Código dominante:
1) ESPEJO: nombrá lo que trajo, en la metáfora de ese ojo.
2) REVELACIÓN DE 2ª RESISTENCIA: lo que hace cuando el código le pega (freeze, flor, chase, huida, pose).
3) VEREDICTO: un corte limpio. No sermón.

puntoCiego = lo que ESTE relato revela que el alumno NO está observando.
mecanicaAbsorcion = UNA sola tarea práctica, ejecutable mañana en LA ESCENA de este volcado.
nivelCargaSugerido = BASICO | INTERMEDIO | SUPERIOR según densidad y alcance del volcado.

═══ ANCLAJE AL VOLCADO (INQUEBRANTABLE) ═══
justificacionDominante, puntoCiego, devolucionMaestro y mecanicaAbsorcion
DEBEN citar un hecho de ESTE texto (una frase dicha, una pregunta, un nombre, una prueba).
Prohibido copiar las cegueras típicas del diccionario si no calzan.
Prohibido un espejo que sea el párrafo pegado o recortado a 140 caracteres.
Prohibido Carga BASICO si el volcado trae hipótesis + escena + prueba.
El centro de gravedad es lo que el alumno APRENDIÓ, no la palabra más repetida.
«no sirve», «después» o «minutos» no eligen código por sí solos.

═══ FILTRO DE DESCOMPOSICIÓN (MOTOR SILENCIOSO) ═══
El lenguaje humano tiene tres capas. Analizá en este orden:
A) LIMPIEZA DE RUIDO: descartá flor (excusas, adornos, victimización, comparaciones, prisa). Quedate con la mecánica de los hechos. El ruido no se tira: informa el punto ciego.
B) OMISIÓN: ¿qué está evitando nombrar? ¿dónde está la fuga de la que no se hace cargo?
C) OJO ÚNICO: si lo dicho habla de un discurso (moral, pedagogía, prisa) pero lo no dicho revela la falla real, elegí el código de la FALLA, no el del discurso superficial.

Cero New Age, cero flor, cero «ánimo», cero listas de códigos.
Cero plantilla. Si no podés nombrar el hecho, el JSON es inválido.
`.trim();

const JSON_SCHEMA_EJEMPLO = `{
  "codigoDominante": 3,
  "nombreOjoDominante": "El Ojo del Ritmo y la Repetición",
  "justificacionDominante": "Explicación de por qué este volcado pertenece a este centro de gravedad.",
  "puntoCiego": "Lo que el relato del usuario revela que él no está viendo (ej. confundir velocidad con absorción).",
  "devolucionMaestro": "Mensaje en 3 tiempos: Espejo -> Revelación de 2ª resistencia -> Veredicto.",
  "mecanicaAbsorcion": "Instrucción exacta y única para que el alumno aplique mañana en su vida real.",
  "nivelCargaSugerido": "INTERMEDIO"
}`;

export function obtenerPromptVolcado(
  textoVolcado: string,
): PromptVolcadoAprendizaje {
  const system = [
    KERNEL_UNIVERSIDAD,
    "",
    "LOS 10 OJOS (elegí uno; no los listes en la respuesta):",
    diccionarioCompacto(),
    "",
    "Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto fuera del JSON) con esta forma exacta:",
    JSON_SCHEMA_EJEMPLO,
    "",
    "codigoDominante DEBE ser un entero 1–10. nombreOjoDominante DEBE coincidir con el diccionario del código elegido.",
  ].join("\n");

  const user = [
    `Ritual: ${RITUAL_VOLCADO}`,
    "Volcado de aprendizaje del alumno:",
    "---",
    textoVolcado.trim() || "(vacío)",
    "---",
    "Diagnosticá el centro de gravedad. UN solo código. Respondé solo el JSON.",
  ].join("\n");

  return {
    system,
    user,
    responseSchema: {
      codigoDominante: 1,
      nombreOjoDominante: DICCIONARIO_OJOS[1].nombreOjo,
      justificacionDominante: "",
      puntoCiego: "",
      devolucionMaestro: "",
      mecanicaAbsorcion: "",
      nivelCargaSugerido: "BASICO",
    },
    ritual: RITUAL_VOLCADO,
  };
}

export function serializarPromptVolcado(
  prompt: PromptVolcadoAprendizaje,
): string {
  return `${prompt.system}\n\n${prompt.user}`;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function extraerJsonObject(raw: string): Record<string, unknown> {
  const text = String(raw ?? "").trim();
  if (!text) throw new Error("Respuesta vacía de Gemini");

  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON en respuesta de Gemini");

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    const repaired = match[0]
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
      .replace(/,\s*([}\]])/g, "$1");
    parsed = JSON.parse(repaired);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON de diagnóstico inválido");
  }
  return parsed as Record<string, unknown>;
}

function clamp(texto: string, max: number): string {
  return texto.length <= max ? texto : texto.slice(0, max).trim();
}

function hidratarDiagnostico(
  codigo: CodigoObservador,
  campos: Partial<DiagnosticoVolcado>,
): DiagnosticoVolcado {
  const ojo = DICCIONARIO_OJOS[codigo];
  const justificacionDominante = clamp(
    campos.justificacionDominante?.trim() ||
      `El centro de gravedad de este volcado es ${ojo.nombreOjo}: observa ${ojo.focoAtencion}.`,
    800,
  );
  const puntoCiego = clamp(
    campos.puntoCiego?.trim() || ojo.cegueraActiva,
    600,
  );
  const devolucionMaestro = clamp(
    campos.devolucionMaestro?.trim() ||
      `${ojo.voz} nombra el crack. La 2ª resistencia es no mirar ${ojo.focoAtencion}. Veredicto: un solo gesto, no un inventario.`,
    1200,
  );
  const mecanicaAbsorcion = clamp(
    campos.mecanicaAbsorcion?.trim() || ojo.gestoAbsorcion,
    600,
  );
  const nivelCargaSugerido = isNivelCargaSugerido(campos.nivelCargaSugerido)
    ? campos.nivelCargaSugerido
    : "INTERMEDIO";

  return {
    codigoDominante: codigo,
    nombreOjoDominante: ojo.nombreOjo,
    justificacionDominante,
    puntoCiego,
    devolucionMaestro,
    mecanicaAbsorcion,
    nivelCargaSugerido,
  };
}

/**
 * Parsea la respuesta cruda de Gemini a DiagnosticoVolcado.
 * Tolera aliases, markdown y codigoDominante como string.
 * Fuerza el Muro: un solo código, nombre canónico del diccionario.
 */
export function parseDiagnosticoVolcado(raw: string): DiagnosticoVolcado {
  const obj = extraerJsonObject(raw);

  const codigo = coerceCodigoObservador(
    obj.codigoDominante ??
      obj.codigo_dominante ??
      obj.codigo ??
      obj.ojoDominante,
  );
  if (!codigo) {
    throw new Error("Gemini omitió codigoDominante válido (1–10)");
  }

  const justificacionDominante = pickString(obj, [
    "justificacionDominante",
    "justificacion_dominante",
    "justificacion",
    "razon",
  ]);
  const puntoCiego = pickString(obj, [
    "puntoCiego",
    "punto_ciego",
    "cegueraActiva",
    "ceguera",
  ]);
  const devolucionMaestro = pickString(obj, [
    "devolucionMaestro",
    "devolucion_maestro",
    "devolucion",
    "mensaje",
    "feedback",
  ]);
  const mecanicaAbsorcion = pickString(obj, [
    "mecanicaAbsorcion",
    "mecanica_absorcion",
    "mecanica",
    "tarea",
  ]);
  const nivelRaw =
    obj.nivelCargaSugerido ?? obj.nivel_carga_sugerido ?? obj.nivelCarga;
  const nivelNorm =
    typeof nivelRaw === "string" ? nivelRaw.trim().toUpperCase() : nivelRaw;

  if (!justificacionDominante || !puntoCiego || !devolucionMaestro || !mecanicaAbsorcion) {
    throw new Error("Gemini omitió campos de diagnóstico");
  }

  return hidratarDiagnostico(codigo, {
    justificacionDominante,
    puntoCiego,
    devolucionMaestro,
    mecanicaAbsorcion,
    nivelCargaSugerido: isNivelCargaSugerido(nivelNorm)
      ? nivelNorm
      : undefined,
  });
}

function contarPalabras(texto: string): number {
  const t = texto.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function hitsDe(norm: string, pats: RegExp[]): number {
  let n = 0;
  for (const p of pats) {
    if (p.test(norm)) n += 1;
  }
  return n;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface HechosVolcado {
  tesis: string;
  cita: string;
  pregunta: string;
}

function limpiarPieza(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function extraerHechos(texto: string): HechosVolcado {
  const tesisMatch = texto.match(
    /aprend[ií](?:\s+\w+){0,4}\s+que\s+([^?.!]{10,220})/i,
  );
  const tesis = limpiarPieza(tesisMatch?.[1] ?? "");

  const marcadas = [...texto.matchAll(/¿([^?]{8,160})\?/g)].map((m) =>
    limpiarPieza(m[1]),
  );
  const sueltas = [...texto.matchAll(/([^?.!\n]{10,120}\?)/g)].map((m) =>
    limpiarPieza(m[1].replace(/^¿/, "")),
  );
  const preguntas = marcadas.length > 0 ? marcadas : sueltas;
  const pregunta =
    preguntas.find((p) =>
      /c[oó]mo se llama|qu[eé] es eso|qu[eé] hace/i.test(p),
    ) ||
    preguntas.find((p) => !/por\s*qu[eé]\s+digo/i.test(p)) ||
    "";

  const citas = [
    ...texto.matchAll(/[«"“]([^»"”]{8,160})[»"”]/g),
  ].map((m) => limpiarPieza(m[1]));
  const cita = citas.find((c) => c.length >= 12) ?? "";

  return { tesis, cita, pregunta };
}

function anclaDe(h: HechosVolcado): string {
  return h.pregunta || h.cita || h.tesis;
}

function elegirCodigoDominanteLocal(textoVolcado: string): CodigoObservador {
  const norm = normalizar(textoVolcado);
  let mejor: CodigoObservador = 1;
  let mejorHits = -1;
  for (const n of CODIGOS_OBSERVADOR) {
    const hits = hitsDe(norm, SENALES_OJO[n]);
    if (hits > mejorHits) {
      mejorHits = hits;
      mejor = n;
    }
  }
  if (mejorHits <= 0) return 1;
  return mejor;
}

function nivelCargaLocal(
  palabras: number,
  codigo: CodigoObservador,
  hechos: HechosVolcado,
): NivelCargaSugerido {
  if (palabras < 12) return "BASICO";
  const tienePrueba = Boolean(hechos.cita || hechos.pregunta);
  if (palabras >= 80 || codigo >= 8 || (tienePrueba && palabras >= 40)) {
    return "SUPERIOR";
  }
  return "INTERMEDIO";
}

function puntoCiegoAnclado(
  codigo: CodigoObservador,
  ojo: FichaOjoCodigo,
  h: HechosVolcado,
): string {
  if (codigo === 9 && h.pregunta) {
    return `Ella ya pidió el nombre del patrón («${h.pregunta}»). El relato todavía cuenta el evento —quién enseñó mejor— y no el circuito que se va a repetir mañana en cada frase adulta de la casa.`;
  }
  const ancla = anclaDe(h);
  if (ancla) {
    return `${ojo.cegueraActiva} Quedó suelto en este volcado: «${clamp(ancla, 160)}».`;
  }
  return ojo.cegueraActiva;
}

function mecanicaAnclada(
  codigo: CodigoObservador,
  ojo: FichaOjoCodigo,
  h: HechosVolcado,
): string {
  const pieza = anclaDe(h);
  if (!pieza) return ojo.gestoAbsorcion;
  const corto = clamp(pieza, 120);
  if (codigo === 9) {
    return `Mañana, en UNA tarea de casa (juntar, guardar o vestir), al cierre nombrá en voz alta la ley. Si aparece «${corto}», contestá con un nombre, no con un sermón. Una frase. Sin comparaciones ni castigo.`;
  }
  if (codigo === 3) {
    return `Mañana, UNA secuencia de tres pasos con hora de inicio y de corte, anclada a «${corto}». El reloj manda, no el apuro.`;
  }
  return `Mañana, un solo gesto de ${ojo.focoAtencion} en la escena de este volcado. Ancla: «${corto}». ${ojo.gestoAbsorcion}`;
}

function devolucionAnclada(
  ojo: FichaOjoCodigo,
  h: HechosVolcado,
): string {
  const espejo = h.tesis
    ? `Espejo: el aprendizaje que nombraste es que ${clamp(h.tesis, 180)}.`
    : `Espejo: trajiste «${clamp(anclaDe(h) || "el día crudo", 160)}».`;
  const prueba = h.cita
    ? ` La prueba que quedó en la mesa: «${clamp(h.cita, 140)}».`
    : "";
  const r2 = `2ª resistencia: convertir el hallazgo en victoria de método, en vez de instalar ${ojo.focoAtencion}.`;
  const veredicto = `Veredicto: ${ojo.voz} corta a un solo gesto. Mañana el circuito tiene nombre, no héroe.`;
  return `${espejo}${prueba} ${r2} ${veredicto}`;
}

/**
 * Diagnóstico local de respaldo cuando Gemini falla/timeout/parsea mal.
 * Aplica el Muro: un solo código (el de más señales; empate → el más bajo).
 * La devolución se ancla a tesis / pregunta / cita de ESTE volcado.
 */
export function diagnosticarVolcadoLocal(
  textoVolcado: string,
): DiagnosticoVolcado {
  const texto = textoVolcado.trim();
  const palabras = contarPalabras(texto);
  const hechos = extraerHechos(texto);
  const codigo = elegirCodigoDominanteLocal(texto);
  const ojo = DICCIONARIO_OJOS[codigo];

  if (palabras < 6) {
    return hidratarDiagnostico(1, {
      justificacionDominante:
        "El volcado todavía es ruido. El centro de gravedad por defecto es El Ojo de la Claridad: hace falta nombrar utilidad, no clima.",
      puntoCiego:
        "El relato no observa nada operable: hay emoción suelta y cero utilidad nombrada.",
      devolucionMaestro:
        "Espejo: trajiste clima. 2ª resistencia: la niebla se hace pasar por aprendizaje. Veredicto: El Cortador de Niebla pide una frase útil de hoy.",
      mecanicaAbsorcion: DICCIONARIO_OJOS[1].gestoAbsorcion,
      nivelCargaSugerido: "BASICO",
    });
  }

  const tesis = hechos.tesis
    ? `El aprendizaje («${clamp(hechos.tesis, 180)}») gravita en ${ojo.nombreOjo}: se observa ${ojo.focoAtencion}, no un inventario de códigos.`
    : `El relato gravita en ${ojo.nombreOjo} porque el peso observable es ${ojo.focoAtencion}, no un inventario de códigos.`;

  return hidratarDiagnostico(codigo, {
    justificacionDominante: tesis,
    puntoCiego: puntoCiegoAnclado(codigo, ojo, hechos),
    devolucionMaestro: devolucionAnclada(ojo, hechos),
    mecanicaAbsorcion: mecanicaAnclada(codigo, ojo, hechos),
    nivelCargaSugerido: nivelCargaLocal(palabras, codigo, hechos),
  });
}

/**
 * Procesa un Volcado de Aprendizaje: envía el texto a Gemini
 * con el Muro de Dominancia y devuelve DiagnosticoVolcado.
 * Si no hay caller o Gemini falla, usa el diagnóstico local.
 */
export async function procesarVolcadoAprendizaje(
  textoVolcado: string,
  deps: ProcesarVolcadoDeps = {},
): Promise<DiagnosticoVolcado> {
  const resultado = await procesarVolcadoAprendizajeConFuente(
    textoVolcado,
    deps,
  );
  return resultado.diagnostico;
}

export async function procesarVolcadoAprendizajeConFuente(
  textoVolcado: string,
  deps: ProcesarVolcadoDeps = {},
): Promise<ResultadoVolcadoAprendizaje> {
  const prompt = obtenerPromptVolcado(textoVolcado);
  const serialized = serializarPromptVolcado(prompt);
  const caller = deps.callGemini;

  if (caller) {
    try {
      const raw = await caller(serialized, 2048, true);
      return {
        diagnostico: parseDiagnosticoVolcado(raw),
        source: "gemini",
      };
    } catch (err) {
      try {
        const raw2 = await caller(
          `${serialized}\n\nIMPORTANTE: responde SOLO un objeto JSON con las claves codigoDominante, nombreOjoDominante, justificacionDominante, puntoCiego, devolucionMaestro, mecanicaAbsorcion, nivelCargaSugerido.`,
          2048,
          false,
        );
        return {
          diagnostico: parseDiagnosticoVolcado(raw2),
          source: "gemini",
        };
      } catch (err2) {
        console.warn(
          "[deposito/volcado] Gemini falló → fallback local:",
          err2 instanceof Error ? err2.message : String(err2 ?? err),
        );
      }
    }
  }

  return {
    diagnostico: diagnosticarVolcadoLocal(textoVolcado),
    source: "local_fallback",
  };
}
