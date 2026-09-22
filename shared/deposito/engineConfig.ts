/**
 * Depósito v2 — La Universidad de Sistemicar
 * Motor de Volcados de Aprendizaje (sin UI).
 *
 * El alumno no elige código. Volca el día al ritual «¿Qué aprendí hoy?».
 * Los 10 Ojos diagnostican el centro de gravedad.
 * El Muro de Dominancia obliga a UN solo Código Dominante.
 * Los 4 Grados de Maestría Perceptiva expanden la captura, no la ruta.
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
import {
  bloquePlacementTest,
  bloqueTemperamento,
  buildDepositoSystemPrompt,
  evaluarMeritoVolcado,
  obtenerTemperamento,
  parseCodigoOjo,
} from "./merito.ts";
export {
  MATRIZ_TEMPERAMENTO,
  TEMPERAMENTO_MODO_OPERATIVO,
  bloquePlacementTest,
  bloqueTemperamento,
  buildDepositoSystemPrompt,
  calcularDensidadEstructural,
  detectarFlorMerito,
  detectarGradoPorMerito,
  etiquetaCodigoOjo,
  evaluarMeritoVolcado,
  mensajeMeritoDetectado,
  obtenerTemperamento,
  parseCodigoOjo,
  toDepositoEngineResponse,
} from "./merito.ts";
export type { FichaTemperamento, ResultadoMerito } from "./merito.ts";

export type CodigoObservador = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type NivelCargaSugerido = "BASICO" | "INTERMEDIO" | "SUPERIOR";

/** Escala de Maestría Perceptiva — Universidad de Sistemicar. */
export type GradoMaestria = 1 | 2 | 3 | 4;

export type CampoCapturaVolcado =
  | "volcadoCrudo"
  | "friccionDetectada"
  | "sombraOmision"
  | "codigoHipotesis";

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

export type TemperamentoGrado =
  | "NUTRITIVO_INERCIA"
  | "FRICCION_MODERADA"
  | "RIGOR_QUIRURGICO"
  | "MATEMATICA_PURA";

export interface EvaluacionGrado {
  /** Grado que merece ESTE volcado por densidad perceptiva (placement). */
  gradoDetectado: GradoMaestria;
  /** true si gradoDetectado > gradoActualDelUsuario. El mérito solo calibra al alza. */
  meritoReconocido: boolean;
  /** Reconocimiento o calibración. No sermón. */
  mensajeEncuadre: string;
}

export interface MetricasMerito {
  /** 0–100. Ratio de hechos secos vs flor. */
  densidadEstructural: number;
  /** Código sugerido para equilibrar el mapa de calor (ej. "C1"). */
  variedadRotacionCodigo: string;
  /** true si el usuario vio su propio sesgo. */
  metacognicionDetectada: boolean;
}

/**
 * Contrato de respuesta estructurada del Depósito V2
 * (esquema JSON que le exigimos a Gemini).
 */
export interface DepositoEngineResponse {
  ojoDominante: {
    codigo: string; // Ej: "C9"
    nombre: string; // Ej: "El Ojo del Sistema"
    explicacion: string;
  };
  puntoCiego: {
    loNoDicho: string;
    florDetectada: string[]; // Listado de excusas, comparaciones o adjetivos
  };
  mecanicaAbsorcion: {
    instruccionUnica: string; // Tarea práctica ejecutable en 1 frase sin sermón
  };
  evaluacionGrado: EvaluacionGrado;
  metricasMerito: MetricasMerito;
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
  /** Validación del grado activo. Opcional para no romper diagnósticos previos. */
  validacionGrado?: ValidacionGradoVolcado;
  /** Placement test: grado que merece el volcado vs grado activo. */
  evaluacionGrado?: EvaluacionGrado;
  /** Tres ejes de mérito: estructura, rotación, metacognición. */
  metricasMerito?: MetricasMerito;
  /** Flor aislada (excusas, comparaciones, adjetivos). */
  florDetectada?: string[];
}

export interface FichaGradoMaestria {
  grado: GradoMaestria;
  /** Ej. "Aprendiz de Ojo". */
  nombre: string;
  titulo: string;
  descripcion: string;
  camposVisibles: readonly CampoCapturaVolcado[];
  preguntaVolcado: string;
  preguntaFriccion?: string;
  preguntaSombra?: string;
  preguntaHipotesis?: string;
}

/** Captura canónica de la interfaz expansiva (una sola ruta: /esperanza). */
export interface CapturaVolcadoExpansiva {
  gradoMaestria: GradoMaestria;
  volcadoCrudo: string;
  friccionDetectada?: string;
  sombraOmision?: string;
  codigoHipotesis?: CodigoObservador;
}

/** Input laxo (API, UI, persistencia) — se normaliza a CapturaVolcadoExpansiva. */
export interface CapturaVolcadoInput {
  volcadoCrudo?: string;
  textoVolcado?: string;
  texto?: string;
  gradoMaestria?: unknown;
  friccionDetectada?: string;
  sombraOmision?: string;
  codigoHipotesis?: unknown;
}

export interface ValidacionGradoVolcado {
  gradoEvaluado: GradoMaestria;
  /** G2+: ¿aisló flor/excusa sin justificarse? */
  ruidoDetectadoCorrectamente?: boolean;
  /** G3+: ¿la omisión construye el punto ciego? */
  sombraIntegrada?: boolean;
  /** G4: ¿la hipótesis coincide con el Código Dominante? */
  hipotesisOjoAcierta?: boolean;
  comentarioMaestro: string;
}

export const VOLCADOS_REQUERIDOS_RITUAL_PASO = 3;

export interface VolcadoHistoricoRitual {
  texto?: string;
  volcadoCrudo?: string;
  captura?: CapturaVolcadoExpansiva;
  diagnostico?: DiagnosticoVolcado;
  createdAt?: Date | string | number;
}

export interface AnalisisUsuarioRitual {
  gradoActual: GradoMaestria;
  /** Auto-observación del alumno al pedir el paso de grado. */
  respuesta?: string;
  diagnosticoActual?: DiagnosticoVolcado;
}

export interface ResultadoRitualPasoGrado {
  autorizado: boolean;
  gradoActual: GradoMaestria;
  gradoSiguiente: GradoMaestria | null;
  /** 0–1. Placeholder hasta cablear densidad real. */
  densidadAbsorcion: number;
  volcadosEvaluados: number;
  motivo: string;
  pendienteImplementacion: boolean;
}

export interface PromptVolcadoAprendizaje {
  system: string;
  user: string;
  responseSchema: DiagnosticoVolcado;
  engineSchema: DepositoEngineResponse;
  ritual: string;
  gradoMaestria: GradoMaestria;
  temperamento: TemperamentoGrado;
}

export type GeminiVolcadoCaller = (
  prompt: string,
  maxTokens?: number,
  jsonMode?: boolean,
) => Promise<string>;

export interface ProcesarVolcadoDeps {
  callGemini?: GeminiVolcadoCaller;
  gradoMaestria?: GradoMaestria;
  captura?: CapturaVolcadoInput;
  /** Dominantes previos para el eje de rotación del mapa de calor 1/10. */
  ojosHistoricos?: readonly CodigoObservador[];
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

export const GRADOS_MAESTRIA: readonly GradoMaestria[] = [1, 2, 3, 4];

export const GRADO_MAESTRIA_INICIAL: GradoMaestria = 1;

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

/**
 * Los 4 Grados de Maestría Perceptiva.
 * Una sola entrada (`/esperanza`); la captura se expande, no se ramifica.
 */
export const DICCIONARIO_GRADOS: Record<GradoMaestria, FichaGradoMaestria> = {
  1: {
    grado: 1,
    nombre: "Aprendiz de Ojo",
    titulo: "Grado 1 — Aprendiz de Ojo",
    descripcion:
      "Entrada estándar. Diagnóstico directo de Ojo Dominante, Punto Ciego básico y Mecánica de Absorción.",
    camposVisibles: ["volcadoCrudo"],
    preguntaVolcado: "¿Qué aprendí hoy?",
  },
  2: {
    grado: 2,
    nombre: "Detector de Ruido",
    titulo: "Grado 2 — Detector de Ruido",
    descripcion:
      "Requerimiento de filtro activo. Identifica «flor», excusas y justificaciones en el relato.",
    camposVisibles: ["volcadoCrudo", "friccionDetectada"],
    preguntaVolcado: "¿Qué aprendí hoy?",
    preguntaFriccion: "¿Dónde detectas 'flor' o excusa hoy?",
  },
  3: {
    grado: 3,
    nombre: "Arquitecto de Punto Ciego",
    titulo: "Grado 3 — Arquitecto de Punto Ciego",
    descripcion:
      "Identificación de «lo no dicho», la sombra, la omisión y las intenciones ocultas.",
    camposVisibles: ["volcadoCrudo", "friccionDetectada", "sombraOmision"],
    preguntaVolcado: "¿Qué aprendí hoy?",
    preguntaFriccion: "¿Dónde detectas 'flor' o excusa hoy?",
    preguntaSombra: "¿Qué es lo que NO dijiste en este relato?",
  },
  4: {
    grado: 4,
    nombre: "Operador de Soberanía",
    titulo: "Grado 4 — Operador de Soberanía",
    descripcion:
      "Diagnóstico integrado de rotación de los 10 Ojos y balance del mapa de calor de percepción.",
    camposVisibles: [
      "volcadoCrudo",
      "friccionDetectada",
      "sombraOmision",
      "codigoHipotesis",
    ],
    preguntaVolcado: "¿Qué aprendí hoy?",
    preguntaFriccion: "¿Dónde detectas 'flor' o excusa hoy?",
    preguntaSombra: "¿Qué es lo que NO dijiste en este relato?",
    preguntaHipotesis:
      "¿Cuál ojo creés que es el dominante de este volcado?",
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

export function isGradoMaestria(value: unknown): value is GradoMaestria {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 4
  );
}

export function normalizarGradoMaestria(value: unknown): GradoMaestria {
  if (isGradoMaestria(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.trim());
    if (isGradoMaestria(n)) return n;
  }
  return GRADO_MAESTRIA_INICIAL;
}

export function obtenerGrado(grado: GradoMaestria): FichaGradoMaestria {
  return DICCIONARIO_GRADOS[grado];
}

export function camposVisiblesPorGrado(
  grado: GradoMaestria,
): readonly CampoCapturaVolcado[] {
  return DICCIONARIO_GRADOS[normalizarGradoMaestria(grado)].camposVisibles;
}

export function gradoSiguienteDe(
  grado: GradoMaestria,
): GradoMaestria | null {
  const actual = normalizarGradoMaestria(grado);
  return actual < 4 ? ((actual + 1) as GradoMaestria) : null;
}

export function campoVisibleEnGrado(
  campo: CampoCapturaVolcado,
  grado: GradoMaestria,
): boolean {
  return camposVisiblesPorGrado(grado).includes(campo);
}

export function normalizarCapturaVolcado(
  input: CapturaVolcadoInput | string,
  gradoFallback: GradoMaestria = GRADO_MAESTRIA_INICIAL,
): CapturaVolcadoExpansiva {
  if (typeof input === "string") {
    return {
      gradoMaestria: normalizarGradoMaestria(gradoFallback),
      volcadoCrudo: input.trim(),
    };
  }

  const grado = normalizarGradoMaestria(
    input.gradoMaestria ?? gradoFallback,
  );
  const volcadoCrudo = String(
    input.volcadoCrudo ?? input.textoVolcado ?? input.texto ?? "",
  ).trim();
  const captura: CapturaVolcadoExpansiva = {
    gradoMaestria: grado,
    volcadoCrudo,
  };

  if (grado >= 2) {
    const friccion = String(input.friccionDetectada ?? "").trim();
    if (friccion) captura.friccionDetectada = friccion;
  }
  if (grado >= 3) {
    const sombra = String(input.sombraOmision ?? "").trim();
    if (sombra) captura.sombraOmision = sombra;
  }
  if (grado >= 4) {
    const hipotesis = coerceCodigoObservador(input.codigoHipotesis);
    if (hipotesis) captura.codigoHipotesis = hipotesis;
  }

  return captura;
}

/**
 * Devuelve el primer error de captura para el grado activo, o null si está lista.
 */
export function validarCapturaParaGrado(
  captura: CapturaVolcadoExpansiva | CapturaVolcadoInput | string,
  gradoFallback: GradoMaestria = GRADO_MAESTRIA_INICIAL,
): string | null {
  const c = normalizarCapturaVolcado(captura, gradoFallback);
  if (!c.volcadoCrudo) return "volcadoCrudo es requerido";
  if (c.gradoMaestria >= 2 && !c.friccionDetectada) {
    return "friccionDetectada es requerido en Grado 2+";
  }
  if (c.gradoMaestria >= 3 && !c.sombraOmision) {
    return "sombraOmision es requerido en Grado 3+";
  }
  if (c.gradoMaestria >= 4 && !c.codigoHipotesis) {
    return "codigoHipotesis es requerido en Grado 4";
  }
  return null;
}

function coerceCodigoObservador(value: unknown): CodigoObservador | null {
  return parseCodigoOjo(value);
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

function jsonSchemaEjemplo(grado: GradoMaestria): string {
  const validacion: Record<string, unknown> = {
    gradoEvaluado: grado,
    comentarioMaestro:
      "Veredicto corto de si el alumno operó a la altura de su grado.",
  };
  if (grado >= 2) validacion.ruidoDetectadoCorrectamente = true;
  if (grado >= 3) validacion.sombraIntegrada = true;
  if (grado >= 4) validacion.hipotesisOjoAcierta = false;

  return `{
  "ojoDominante": {
    "codigo": "C3",
    "nombre": "El Ojo del Ritmo y la Repetición",
    "explicacion": "Por qué este volcado gravita aquí. Citá un hecho de ESTE texto."
  },
  "puntoCiego": {
    "loNoDicho": "Lo que el relato revela que el alumno no está observando.",
    "florDetectada": ["excusa", "comparación"]
  },
  "mecanicaAbsorcion": {
    "instruccionUnica": "UNA tarea práctica ejecutable mañana en UNA frase, sin sermón."
  },
  "evaluacionGrado": {
    "gradoDetectado": 2,
    "meritoReconocido": false,
    "mensajeEncuadre": "Reconocimiento de mérito o calibración. Sin sermón."
  },
  "metricasMerito": {
    "densidadEstructural": 64,
    "variedadRotacionCodigo": "C1",
    "metacognicionDetectada": false
  },
  "devolucionMaestro": "Tres tiempos, temperamento del grado activo: Espejo -> Revelación de 2ª resistencia -> Veredicto.",
  "nivelCargaSugerido": "INTERMEDIO",
  "codigoDominante": 3,
  "justificacionDominante": "Alias de ojoDominante.explicacion.",
  "validacionGrado": ${JSON.stringify(validacion, null, 2).replace(/\n/g, "\n  ")}
}`;
}

function bloqueInstruccionGrado(grado: GradoMaestria): string {
  const ficha = DICCIONARIO_GRADOS[grado];
  const lines = [
    `═══ GRADO DE MAESTRÍA ACTIVO: ${grado} — ${ficha.nombre} ═══`,
    ficha.descripcion,
    "La Triada de Valor (Ojo Dominante, Punto Ciego, Mecánica de Absorción) sigue siendo obligatoria.",
    "validacionGrado enriquece esa triada; no la reemplaza. El Muro de Dominancia no se rompe.",
    "",
    bloqueTemperamento(grado),
    "",
    bloquePlacementTest(grado),
  ];

  if (grado >= 2) {
    lines.push(
      "",
      "REGLA G2+ (DETECTOR DE RUIDO):",
      "Analizá ACTIVAMENTE si el alumno detectó correctamente su propio ruido, flor o excusa.",
      "Compará el campo friccionDetectada con el volcado crudo.",
      "Si se justifica, se cubre o adorna la grieta, nombralo: sigue en pose.",
      "validacionGrado.ruidoDetectadoCorrectamente = true SOLO si aisló la flor/excusa sin justificarse.",
    );
  }
  if (grado >= 3) {
    lines.push(
      "",
      "REGLA G3+ (ARQUITECTO DE PUNTO CIEGO):",
      "Profundizá en la sombra/omisión (campo sombraOmision + lo no dicho del relato).",
      "El puntoCiego de la Devolución del Maestro DEBE construirse desde esa omisión, no desde un adorno.",
      "validacionGrado.sombraIntegrada = true si nombra un no-dicho operable.",
    );
  }
  if (grado >= 4) {
    lines.push(
      "",
      "REGLA G4 (OPERADOR DE SOBERANÍA):",
      "El alumno hipotetizó su propio ojo (codigoHipotesis) ANTES de tu diagnóstico.",
      "Diagnosticá el centro de gravedad con el Muro: UN solo Código Dominante.",
      "Observá la rotación de los 10 Ojos y el balance del mapa de calor de percepción,",
      "pero la SALIDA sigue siendo UN código. Prohibido listar múltiples códigos.",
      "validacionGrado.hipotesisOjoAcierta = true si codigoHipotesis coincide con codigoDominante.",
    );
  }

  lines.push(
    "",
    "validacionGrado.gradoEvaluado = el grado activo.",
    "validacionGrado.comentarioMaestro = veredicto corto de si el alumno operó a la altura de su grado.",
  );
  return lines.join("\n");
}

function bloqueUserCaptura(
  captura: CapturaVolcadoExpansiva,
  ojosHistoricos: readonly CodigoObservador[] = [],
): string {
  const ficha = DICCIONARIO_GRADOS[captura.gradoMaestria];
  const temperamento = obtenerTemperamento(captura.gradoMaestria);
  const lines = [
    `Ritual: ${RITUAL_VOLCADO}`,
    `Grado activo del alumno (no es el grado que merece el volcado): ${captura.gradoMaestria} — ${ficha.nombre}`,
    `Temperamento del Maestro: ${temperamento.nombre} (${temperamento.codigo})`,
    "Volcado de aprendizaje del alumno:",
    "---",
    captura.volcadoCrudo || "(vacío)",
    "---",
  ];
  if (captura.gradoMaestria >= 2) {
    lines.push(
      "Fricción detectada (flor / excusa / justificación):",
      "---",
      captura.friccionDetectada || "(no declarada)",
      "---",
    );
  }
  if (captura.gradoMaestria >= 3) {
    lines.push(
      "Sombra / omisión (lo no dicho):",
      "---",
      captura.sombraOmision || "(no declarada)",
      "---",
    );
  }
  if (captura.gradoMaestria >= 4) {
    const h = captura.codigoHipotesis;
    const nombre = h ? DICCIONARIO_OJOS[h].nombreOjo : "sin hipótesis";
    lines.push(
      `Hipótesis del alumno (ojo autodiagnosticado): ${h ? `C${h} ${nombre}` : "(no declarada)"}`,
    );
  }
  if (ojosHistoricos.length > 0) {
    lines.push(
      `Mapa de calor histórico (códigos dominantes previos): ${ojosHistoricos
        .map((n) => `C${n}`)
        .join(", ")}`,
    );
  }
  lines.push(
    "Diagnosticá el centro de gravedad. UN solo código. Evaluá densidad y placement. Respondé solo el JSON.",
  );
  return lines.join("\n");
}

export function obtenerPromptVolcado(
  textoVolcado: string,
  capturaInput?: CapturaVolcadoInput,
  ojosHistoricos: readonly CodigoObservador[] = [],
): PromptVolcadoAprendizaje {
  const captura = normalizarCapturaVolcado(
    capturaInput
      ? { ...capturaInput, volcadoCrudo: capturaInput.volcadoCrudo ?? textoVolcado }
      : textoVolcado,
  );
  const grado = captura.gradoMaestria;
  const temperamento = obtenerTemperamento(grado);

  const system = [
    buildDepositoSystemPrompt(grado),
    "",
    KERNEL_UNIVERSIDAD,
    "",
    bloqueInstruccionGrado(grado),
    "",
    "LOS 10 OJOS (elegí uno; no los listes en la respuesta):",
    diccionarioCompacto(),
    "",
    "Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto fuera del JSON) con esta forma exacta:",
    jsonSchemaEjemplo(grado),
    "",
    "ojoDominante.codigo DEBE ser C1–C10. codigoDominante (entero 1–10) es alias coherente.",
    "nombreOjoDominante / ojoDominante.nombre DEBE coincidir con el diccionario del código elegido.",
    "puntoCiego.florDetectada lista excusas, comparaciones o adjetivos aislados del volcado.",
    "mecanicaAbsorcion.instruccionUnica = UNA frase ejecutable, sin sermón.",
  ].join("\n");

  const engineSchema: DepositoEngineResponse = {
    ojoDominante: {
      codigo: "C1",
      nombre: DICCIONARIO_OJOS[1].nombreOjo,
      explicacion: "",
    },
    puntoCiego: { loNoDicho: "", florDetectada: [] },
    mecanicaAbsorcion: { instruccionUnica: "" },
    evaluacionGrado: {
      gradoDetectado: 1,
      meritoReconocido: false,
      mensajeEncuadre: "",
    },
    metricasMerito: {
      densidadEstructural: 0,
      variedadRotacionCodigo: "C1",
      metacognicionDetectada: false,
    },
  };

  return {
    system,
    user: bloqueUserCaptura(captura, ojosHistoricos),
    responseSchema: {
      codigoDominante: 1,
      nombreOjoDominante: DICCIONARIO_OJOS[1].nombreOjo,
      justificacionDominante: "",
      puntoCiego: "",
      devolucionMaestro: "",
      mecanicaAbsorcion: "",
      nivelCargaSugerido: "BASICO",
      validacionGrado: {
        gradoEvaluado: grado,
        comentarioMaestro: "",
      },
      evaluacionGrado: engineSchema.evaluacionGrado,
      metricasMerito: engineSchema.metricasMerito,
      florDetectada: [],
    },
    engineSchema,
    ritual: RITUAL_VOLCADO,
    gradoMaestria: grado,
    temperamento: temperamento.codigo,
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

  const diagnostico: DiagnosticoVolcado = {
    codigoDominante: codigo,
    nombreOjoDominante: ojo.nombreOjo,
    justificacionDominante,
    puntoCiego,
    devolucionMaestro,
    mecanicaAbsorcion,
    nivelCargaSugerido,
  };
  if (campos.validacionGrado) {
    diagnostico.validacionGrado = campos.validacionGrado;
  }
  if (campos.evaluacionGrado) {
    diagnostico.evaluacionGrado = campos.evaluacionGrado;
  }
  if (campos.metricasMerito) {
    diagnostico.metricasMerito = campos.metricasMerito;
  }
  if (campos.florDetectada?.length) {
    diagnostico.florDetectada = campos.florDetectada;
  }
  return diagnostico;
}

function parseBooleanLoose(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const n = value.trim().toLowerCase();
    if (n === "true" || n === "si" || n === "sí" || n === "1") return true;
    if (n === "false" || n === "no" || n === "0") return false;
  }
  return undefined;
}

function extraerValidacionGrado(
  obj: Record<string, unknown>,
  grado: GradoMaestria,
): ValidacionGradoVolcado | undefined {
  const raw = obj.validacionGrado ?? obj.validacion_grado;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const v = raw as Record<string, unknown>;
  const comentario = pickString(v, [
    "comentarioMaestro",
    "comentario_maestro",
    "comentario",
    "veredicto",
  ]);
  const gradoEvaluado = normalizarGradoMaestria(
    v.gradoEvaluado ?? v.grado_evaluado ?? grado,
  );
  const validacion: ValidacionGradoVolcado = {
    gradoEvaluado,
    comentarioMaestro: comentario,
  };
  if (gradoEvaluado >= 2) {
    validacion.ruidoDetectadoCorrectamente = parseBooleanLoose(
      v.ruidoDetectadoCorrectamente ?? v.ruido_detectado_correctamente,
    );
  }
  if (gradoEvaluado >= 3) {
    validacion.sombraIntegrada = parseBooleanLoose(
      v.sombraIntegrada ?? v.sombra_integrada,
    );
  }
  if (gradoEvaluado >= 4) {
    validacion.hipotesisOjoAcierta = parseBooleanLoose(
      v.hipotesisOjoAcierta ?? v.hipotesis_ojo_acierta,
    );
  }
  return validacion;
}

function validacionGradoLocal(
  captura: CapturaVolcadoExpansiva,
  codigo: CodigoObservador,
): ValidacionGradoVolcado {
  const grado = captura.gradoMaestria;
  const partes: string[] = [];
  const validacion: ValidacionGradoVolcado = {
    gradoEvaluado: grado,
    comentarioMaestro: "",
  };

  if (grado === 1) {
    partes.push(
      "G1: diagnóstico directo de ojo, punto ciego y mecánica. Aún no se exige detector de ruido.",
    );
  }
  if (grado >= 2) {
    const friccion = captura.friccionDetectada ?? "";
    const haySenal =
      friccion.length >= 12 ||
      /flor|excusa|justific|ruido|adorno/i.test(friccion);
    validacion.ruidoDetectadoCorrectamente = haySenal;
    partes.push(
      haySenal
        ? "G2: aisló una fricción nombrable."
        : "G2: la fricción sigue siendo clima. No hay flor/excusa aislada.",
    );
  }
  if (grado >= 3) {
    const sombra = captura.sombraOmision ?? "";
    const integrada = sombra.length >= 12;
    validacion.sombraIntegrada = integrada;
    partes.push(
      integrada
        ? "G3: la omisión tiene peso para construir el punto ciego."
        : "G3: lo no dicho sigue vacío; el punto ciego no tiene sombra.",
    );
  }
  if (grado >= 4) {
    const acierta =
      captura.codigoHipotesis != null && captura.codigoHipotesis === codigo;
    validacion.hipotesisOjoAcierta = acierta;
    partes.push(
      acierta
        ? "G4: la hipótesis del ojo coincide con el centro de gravedad."
        : `G4: hipotetizó C${captura.codigoHipotesis ?? "?"} y el muro nombra C${codigo}.`,
    );
  }

  validacion.comentarioMaestro = partes.join(" ");
  return validacion;
}

function extraerStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extraerPuntoCiego(obj: Record<string, unknown>): {
  texto: string;
  flor: string[];
} {
  const raw = obj.puntoCiego ?? obj.punto_ciego;
  const nested = asRecord(raw);
  if (nested) {
    return {
      texto: pickString(nested, [
        "loNoDicho",
        "lo_no_dicho",
        "texto",
        "ceguera",
        "puntoCiego",
      ]),
      flor: extraerStringArray(
        nested.florDetectada ?? nested.flor_detectada ?? nested.flor,
      ),
    };
  }
  return {
    texto: pickString(obj, [
      "puntoCiego",
      "punto_ciego",
      "cegueraActiva",
      "ceguera",
    ]),
    flor: extraerStringArray(obj.florDetectada ?? obj.flor_detectada),
  };
}

function extraerMecanica(obj: Record<string, unknown>): string {
  const raw = obj.mecanicaAbsorcion ?? obj.mecanica_absorcion;
  const nested = asRecord(raw);
  if (nested) {
    return pickString(nested, [
      "instruccionUnica",
      "instruccion_unica",
      "instruccion",
      "tarea",
    ]);
  }
  return pickString(obj, [
    "mecanicaAbsorcion",
    "mecanica_absorcion",
    "mecanica",
    "tarea",
  ]);
}

function extraerOjoDominante(obj: Record<string, unknown>): {
  codigo: CodigoObservador | null;
  explicacion: string;
} {
  const nested = asRecord(obj.ojoDominante ?? obj.ojo_dominante);
  const codigo = coerceCodigoObservador(
    nested ??
      obj.codigoDominante ??
      obj.codigo_dominante ??
      obj.codigo ??
      obj.ojoDominante,
  );
  const explicacion = nested
    ? pickString(nested, [
        "explicacion",
        "justificacion",
        "justificacionDominante",
      ])
    : "";
  return { codigo, explicacion };
}

function extraerEvaluacionGradoGemini(
  obj: Record<string, unknown>,
): EvaluacionGrado | undefined {
  const raw = asRecord(obj.evaluacionGrado ?? obj.evaluacion_grado);
  if (!raw) return undefined;
  const gradoDetectado = normalizarGradoMaestria(
    raw.gradoDetectado ?? raw.grado_detectado,
  );
  const merito = parseBooleanLoose(
    raw.meritoReconocido ?? raw.merito_reconocido,
  );
  const mensaje = pickString(raw, [
    "mensajeEncuadre",
    "mensaje_encuadre",
    "mensaje",
  ]);
  return {
    gradoDetectado,
    meritoReconocido: merito === true,
    mensajeEncuadre: mensaje,
  };
}

function extraerMetricasMeritoGemini(
  obj: Record<string, unknown>,
): MetricasMerito | undefined {
  const raw = asRecord(obj.metricasMerito ?? obj.metricas_merito);
  if (!raw) return undefined;
  const densRaw = raw.densidadEstructural ?? raw.densidad_estructural;
  const dens =
    typeof densRaw === "number"
      ? densRaw
      : typeof densRaw === "string"
        ? Number(densRaw)
        : NaN;
  const rot = pickString(raw, [
    "variedadRotacionCodigo",
    "variedad_rotacion_codigo",
    "rotacion",
  ]);
  const meta = parseBooleanLoose(
    raw.metacognicionDetectada ?? raw.metacognicion_detectada,
  );
  return {
    densidadEstructural: Number.isFinite(dens)
      ? Math.max(0, Math.min(100, Math.round(dens)))
      : 0,
    variedadRotacionCodigo: rot || "C1",
    metacognicionDetectada: meta === true,
  };
}

function anexarMerito(
  diagnostico: DiagnosticoVolcado,
  captura: CapturaVolcadoExpansiva,
  ojosHistoricos: readonly CodigoObservador[] = [],
): DiagnosticoVolcado {
  const local = evaluarMeritoVolcado({
    captura,
    codigoDominante: diagnostico.codigoDominante,
    ojosHistoricos,
    florGemini: diagnostico.florDetectada,
  });
  const geminiEval = diagnostico.evaluacionGrado;
  const mensaje =
    geminiEval &&
    geminiEval.meritoReconocido === local.evaluacion.meritoReconocido &&
    geminiEval.mensajeEncuadre.trim()
      ? geminiEval.mensajeEncuadre.trim()
      : local.evaluacion.mensajeEncuadre;
  return {
    ...diagnostico,
    evaluacionGrado: {
      ...local.evaluacion,
      mensajeEncuadre: mensaje,
    },
    metricasMerito: local.metricas,
    florDetectada: local.florDetectada,
  };
}

function sellarDiagnostico(
  diagnostico: DiagnosticoVolcado,
  captura: CapturaVolcadoExpansiva,
  ojosHistoricos: readonly CodigoObservador[] = [],
): DiagnosticoVolcado {
  return anexarMerito(
    anexarValidacion(diagnostico, captura),
    captura,
    ojosHistoricos,
  );
}

function anexarValidacion(
  diagnostico: DiagnosticoVolcado,
  captura: CapturaVolcadoExpansiva,
): DiagnosticoVolcado {
  const local = validacionGradoLocal(captura, diagnostico.codigoDominante);
  const gemini = diagnostico.validacionGrado;
  if (!gemini) {
    return { ...diagnostico, validacionGrado: local };
  }
  return {
    ...diagnostico,
    validacionGrado: {
      gradoEvaluado: captura.gradoMaestria,
      ruidoDetectadoCorrectamente:
        gemini.ruidoDetectadoCorrectamente ??
        local.ruidoDetectadoCorrectamente,
      sombraIntegrada: gemini.sombraIntegrada ?? local.sombraIntegrada,
      hipotesisOjoAcierta:
        gemini.hipotesisOjoAcierta ?? local.hipotesisOjoAcierta,
      comentarioMaestro:
        gemini.comentarioMaestro.trim() || local.comentarioMaestro,
    },
  };
}

function resolverCaptura(
  textoVolcado: string,
  deps: ProcesarVolcadoDeps = {},
): CapturaVolcadoExpansiva {
  return normalizarCapturaVolcado(
    deps.captura
      ? {
          ...deps.captura,
          volcadoCrudo: deps.captura.volcadoCrudo ?? textoVolcado,
          gradoMaestria:
            deps.captura.gradoMaestria ?? deps.gradoMaestria,
        }
      : textoVolcado,
    deps.gradoMaestria ?? GRADO_MAESTRIA_INICIAL,
  );
}

function componerTextoDiagnostico(captura: CapturaVolcadoExpansiva): string {
  const partes = [captura.volcadoCrudo];
  if (captura.friccionDetectada) {
    partes.push(`Fricción/flor detectada: ${captura.friccionDetectada}`);
  }
  if (captura.sombraOmision) {
    partes.push(`Sombra/omisión: ${captura.sombraOmision}`);
  }
  return partes.join("\n");
}

/**
 * Parsea la respuesta cruda de Gemini a DiagnosticoVolcado.
 * Tolera el contrato V2 (ojoDominante / puntoCiego objeto) y aliases legacy.
 * Fuerza el Muro: un solo código, nombre canónico del diccionario.
 */
export function parseDiagnosticoVolcado(
  raw: string,
  gradoActual: GradoMaestria = GRADO_MAESTRIA_INICIAL,
): DiagnosticoVolcado {
  const obj = extraerJsonObject(raw);
  const ojo = extraerOjoDominante(obj);
  const codigo = ojo.codigo;
  if (!codigo) {
    throw new Error("Gemini omitió codigoDominante válido (1–10)");
  }

  const justificacionDominante =
    ojo.explicacion ||
    pickString(obj, [
      "justificacionDominante",
      "justificacion_dominante",
      "justificacion",
      "razon",
    ]);
  const punto = extraerPuntoCiego(obj);
  const puntoCiego = punto.texto;
  const florDetectada = punto.flor;
  const mecanicaAbsorcion = extraerMecanica(obj);
  const devolucionMaestro =
    pickString(obj, [
      "devolucionMaestro",
      "devolucion_maestro",
      "devolucion",
      "mensaje",
      "feedback",
    ]) || justificacionDominante;
  const nivelRaw =
    obj.nivelCargaSugerido ?? obj.nivel_carga_sugerido ?? obj.nivelCarga;
  const nivelNorm =
    typeof nivelRaw === "string" ? nivelRaw.trim().toUpperCase() : nivelRaw;

  if (!justificacionDominante || !puntoCiego || !mecanicaAbsorcion) {
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
    validacionGrado: extraerValidacionGrado(obj, gradoActual),
    evaluacionGrado: extraerEvaluacionGradoGemini(obj),
    metricasMerito: extraerMetricasMeritoGemini(obj),
    florDetectada,
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
  capturaInput?: CapturaVolcadoInput,
  ojosHistoricos: readonly CodigoObservador[] = [],
): DiagnosticoVolcado {
  const captura = normalizarCapturaVolcado(
    capturaInput
      ? { ...capturaInput, volcadoCrudo: capturaInput.volcadoCrudo ?? textoVolcado }
      : textoVolcado,
  );
  const texto = componerTextoDiagnostico(captura) || textoVolcado.trim();
  const palabras = contarPalabras(captura.volcadoCrudo || texto);
  const hechos = extraerHechos(captura.volcadoCrudo || texto);
  const codigo = elegirCodigoDominanteLocal(texto);
  const ojo = DICCIONARIO_OJOS[codigo];

  if (palabras < 6) {
    return sellarDiagnostico(
      hidratarDiagnostico(1, {
        justificacionDominante:
          "El volcado todavía es ruido. El centro de gravedad por defecto es El Ojo de la Claridad: hace falta nombrar utilidad, no clima.",
        puntoCiego:
          "El relato no observa nada operable: hay emoción suelta y cero utilidad nombrada.",
        devolucionMaestro:
          "Espejo: trajiste clima. 2ª resistencia: la niebla se hace pasar por aprendizaje. Veredicto: El Cortador de Niebla pide una frase útil de hoy.",
        mecanicaAbsorcion: DICCIONARIO_OJOS[1].gestoAbsorcion,
        nivelCargaSugerido: "BASICO",
      }),
      captura,
      ojosHistoricos,
    );
  }

  const tesis = hechos.tesis
    ? `El aprendizaje («${clamp(hechos.tesis, 180)}») gravita en ${ojo.nombreOjo}: se observa ${ojo.focoAtencion}, no un inventario de códigos.`
    : `El relato gravita en ${ojo.nombreOjo} porque el peso observable es ${ojo.focoAtencion}, no un inventario de códigos.`;

  let puntoCiego = puntoCiegoAnclado(codigo, ojo, hechos);
  if (captura.gradoMaestria >= 3 && captura.sombraOmision) {
    puntoCiego = `Sombra declarada: «${clamp(captura.sombraOmision, 180)}». ${puntoCiego}`;
  }

  return sellarDiagnostico(
    hidratarDiagnostico(codigo, {
      justificacionDominante: tesis,
      puntoCiego,
      devolucionMaestro: devolucionAnclada(ojo, hechos),
      mecanicaAbsorcion: mecanicaAnclada(codigo, ojo, hechos),
      nivelCargaSugerido: nivelCargaLocal(palabras, codigo, hechos),
    }),
    captura,
    ojosHistoricos,
  );
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
  const captura = resolverCaptura(textoVolcado, deps);
  const ojosHistoricos = deps.ojosHistoricos ?? [];
  const prompt = obtenerPromptVolcado(
    captura.volcadoCrudo,
    captura,
    ojosHistoricos,
  );
  const serialized = serializarPromptVolcado(prompt);
  const caller = deps.callGemini;

  if (caller) {
    try {
      const raw = await caller(serialized, 2048, true);
      return {
        diagnostico: sellarDiagnostico(
          parseDiagnosticoVolcado(raw, captura.gradoMaestria),
          captura,
          ojosHistoricos,
        ),
        source: "gemini",
      };
    } catch (err) {
      try {
        const raw2 = await caller(
          `${serialized}\n\nIMPORTANTE: responde SOLO un objeto JSON con las claves ojoDominante, puntoCiego, mecanicaAbsorcion, evaluacionGrado, metricasMerito, devolucionMaestro, nivelCargaSugerido, validacionGrado.`,
          2048,
          false,
        );
        return {
          diagnostico: sellarDiagnostico(
            parseDiagnosticoVolcado(raw2, captura.gradoMaestria),
            captura,
            ojosHistoricos,
          ),
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
    diagnostico: diagnosticarVolcadoLocal(
      captura.volcadoCrudo,
      captura,
      ojosHistoricos,
    ),
    source: "local_fallback",
  };
}

function densidadPlaceholder(
  volcados: readonly VolcadoHistoricoRitual[],
  analisis: AnalisisUsuarioRitual,
): number {
  if (volcados.length === 0) return 0;
  let suma = 0;
  for (const v of volcados) {
    const texto = String(
      v.captura?.volcadoCrudo ?? v.volcadoCrudo ?? v.texto ?? "",
    ).trim();
    const palabras = texto ? texto.split(/\s+/).filter(Boolean).length : 0;
    const tieneTriada = Boolean(
      v.diagnostico?.puntoCiego && v.diagnostico?.mecanicaAbsorcion,
    );
    const pieza = Math.min(1, palabras / 80) * 0.6 + (tieneTriada ? 0.4 : 0);
    suma += pieza;
  }
  const respuesta = String(analisis.respuesta ?? "").trim();
  const bonusRespuesta = respuesta.length >= 40 ? 0.1 : 0;
  return Math.max(
    0,
    Math.min(1, suma / volcados.length + bonusRespuesta),
  );
}

/**
 * Ritual de Paso de Grado — firma lista; densidad real pendiente.
 *
 * Toma hasta 3 volcados históricos y evalúa si hay materia suficiente
 * para autorizar el ascenso. El veredicto de densidad aún no asciende:
 * `pendienteImplementacion` queda en true hasta cablear el motor.
 */
export function evaluarRitualPasoGrado(
  volcadosHistoricos: readonly VolcadoHistoricoRitual[],
  analisisUsuario: AnalisisUsuarioRitual,
): ResultadoRitualPasoGrado {
  const gradoActual = normalizarGradoMaestria(analisisUsuario.gradoActual);
  const gradoSiguiente = gradoSiguienteDe(gradoActual);
  const recientes = volcadosHistoricos.slice(0, VOLCADOS_REQUERIDOS_RITUAL_PASO);
  const densidadAbsorcion = densidadPlaceholder(recientes, analisisUsuario);

  if (gradoActual >= 4) {
    return {
      autorizado: false,
      gradoActual,
      gradoSiguiente: null,
      densidadAbsorcion,
      volcadosEvaluados: recientes.length,
      motivo:
        "Grado 4 es el techo de la Universidad. No hay ascenso posterior.",
      pendienteImplementacion: true,
    };
  }

  if (recientes.length < VOLCADOS_REQUERIDOS_RITUAL_PASO) {
    return {
      autorizado: false,
      gradoActual,
      gradoSiguiente,
      densidadAbsorcion,
      volcadosEvaluados: recientes.length,
      motivo: `Se requieren ${VOLCADOS_REQUERIDOS_RITUAL_PASO} volcados históricos para el Ritual de Paso.`,
      pendienteImplementacion: true,
    };
  }

  return {
    autorizado: false,
    gradoActual,
    gradoSiguiente,
    densidadAbsorcion,
    volcadosEvaluados: recientes.length,
    motivo:
      "Ritual de Paso: evaluación de densidad de absorción pendiente de implementación. La firma queda lista; el veredicto aún no autoriza el ascenso.",
    pendienteImplementacion: true,
  };
}
