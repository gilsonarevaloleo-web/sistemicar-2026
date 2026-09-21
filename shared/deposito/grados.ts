/**
 * Grados de La Universidad (Depósito).
 *
 * No es Umbral. Umbral cruza el carácter. Aquí se gradúa la ÓPTICA:
 * cómo mira el operador, no qué código conquistó.
 *
 * G1 Aprendiz de Ojo — hechos crudos, ritual, sin evasión.
 * G2 Detector de Ruido — el alumno filtra su propia flor.
 * G3 Arquitecto de Punto Ciego — lee lo no dicho e integra la mecánica.
 * G4 Operador de Soberanía — rota los 10 lentes; no vive atascado en uno.
 *
 * El título no es C10. G4 es sintonía (mapa de calor balanceado).
 * El motor silencioso (señal / ruido / omisión) corre desde G1.
 * El Muro nombra UN ojo: el de la falla real, no el del discurso.
 */

import {
  CODIGOS_OBSERVADOR,
  DICCIONARIO_OJOS,
  diagnosticarVolcadoLocal,
  extraerHechos,
  type CodigoObservador,
  type DiagnosticoVolcado,
} from "./engineConfig.ts";

export type { CodigoObservador };

export type GradoUniversidad =
  | "APRENDIZ_OJO"
  | "DETECTOR_RUIDO"
  | "ARQUITECTO_PUNTO_CIEGO"
  | "OPERADOR_SOBERANIA";

export const GRADOS_UNIVERSIDAD: readonly GradoUniversidad[] = [
  "APRENDIZ_OJO",
  "DETECTOR_RUIDO",
  "ARQUITECTO_PUNTO_CIEGO",
  "OPERADOR_SOBERANIA",
];

export const GRADO_UNIVERSIDAD_META: Record<
  GradoUniversidad,
  { orden: 1 | 2 | 3 | 4; label: string; promesa: string }
> = {
  APRENDIZ_OJO: {
    orden: 1,
    label: "Aprendiz de Ojo",
    promesa: "Percepción literal. Nombra el hecho crudo sin evasión.",
  },
  DETECTOR_RUIDO: {
    orden: 2,
    label: "Detector de Ruido",
    promesa: "Filtro de fricción. Reduce el relato a estructura pura.",
  },
  ARQUITECTO_PUNTO_CIEGO: {
    orden: 3,
    label: "Arquitecto de Punto Ciego",
    promesa: "Lee lo no dicho e integra la mecánica en la vida real.",
  },
  OPERADOR_SOBERANIA: {
    orden: 4,
    label: "Operador de Soberanía",
    promesa: "Sintonía de los 10 Ojos. Rota el lente; no se atasca.",
  },
};

export interface CapasVolcado {
  senal: string;
  ruido: string;
  noDicho: string;
}

export interface LecturaGradoVolcado {
  grado: GradoUniversidad;
  codigoDominante: CodigoObservador;
  nombreOjoDominante: string;
  capas: CapasVolcado;
}

export interface ExpedienteOjos {
  ojosNombrados: CodigoObservador[];
  rango: number;
  /** Ojo que acapara el mapa si hay atasco. */
  atasco: CodigoObservador | null;
  /** Primer lente que nunca fue dominante. No es «próximo código de Forja». */
  hueco: CodigoObservador | null;
  techo: 10;
  balance: number;
  gradoOperador: GradoUniversidad;
  haciaDonde: string;
}

const FLOR: { etiqueta: string; re: RegExp }[] = [
  { etiqueta: "excusa", re: /porque no pude|no tuve tiempo|no es mi culpa/i },
  { etiqueta: "victima", re: /siempre me|nadie me|me hicieron/i },
  { etiqueta: "comparacion", re: /otras niñ|como las otras|mejor que|peor que|comparacion/i },
  { etiqueta: "castigo", re: /castigo|amenaz/i },
  { etiqueta: "clima", re: /me sent[ií]|estoy mal|fue feo|horrible/i },
  { etiqueta: "prisa", re: /apur|no hay tiempo|r[aá]pido/i },
  { etiqueta: "flor", re: /incre[ií]ble|sorprend|m[aá]gico|despert/i },
];

function contarPalabras(texto: string): number {
  const t = texto.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function detectarFlor(texto: string): string[] {
  return FLOR.filter((f) => f.re.test(texto)).map((f) => f.etiqueta);
}

export function descomponerVolcado(
  textoVolcado: string,
  diagnostico?: DiagnosticoVolcado,
): CapasVolcado {
  const texto = textoVolcado.trim();
  const hechos = extraerHechos(texto);
  const flor = detectarFlor(texto);
  const senal =
    hechos.tesis ||
    hechos.cita ||
    (texto.slice(0, 160) || "sin hecho nombrado");
  const ruido =
    flor.length > 0
      ? `Flor detectada: ${flor.join(", ")}.`
      : "Sin flor evidente en la superficie.";
  const noDicho =
    diagnostico?.puntoCiego ||
    (hechos.pregunta
      ? `La pregunta «${hechos.pregunta}» señala una omisión: pide nombre y el relato no lo da.`
      : hechos.cita
        ? `La cita quedó suelta: «${hechos.cita}». Falta de qué se hace cargo el operador.`
        : "El no-dicho es la utilidad o la fuga que el relato no nombra.");
  return { senal, ruido, noDicho };
}

function mecanicaAncladaAEscena(
  diagnostico: DiagnosticoVolcado | undefined,
  texto: string,
): boolean {
  if (!diagnostico) return false;
  const mec = diagnostico.mecanicaAbsorcion.toLowerCase();
  if (!mec) return false;
  const hechos = extraerHechos(texto);
  const ancla = hechos.pregunta || hechos.cita || hechos.tesis;
  if (ancla && mec.includes(ancla.slice(0, 24).toLowerCase())) return true;
  const norm = texto.toLowerCase();
  const ganchos = ["hija", "esposa", "tarea", "juego", "casa", "llamar", "cobr", "puerta"];
  return ganchos.some((g) => norm.includes(g) && mec.includes(g));
}

/**
 * Grado que ESTE volcado evidencia (G1–G3).
 * G4 solo se declara en el expediente (sintonía en el tiempo).
 */
export function calcularGradoVolcado(
  textoVolcado: string,
  diagnostico?: DiagnosticoVolcado,
): LecturaGradoVolcado {
  const texto = textoVolcado.trim();
  const palabras = contarPalabras(texto);
  const diag = diagnostico ?? (texto ? diagnosticarVolcadoLocal(texto) : undefined);
  const codigo = diag?.codigoDominante ?? 1;
  const ojo = DICCIONARIO_OJOS[codigo];
  const hechos = extraerHechos(texto);
  const flor = detectarFlor(texto);
  const capas = descomponerVolcado(texto, diag);

  let grado: GradoUniversidad = "APRENDIZ_OJO";
  const hechoCrudo = palabras >= 6 || Boolean(hechos.tesis);
  if (!hechoCrudo) {
    grado = "APRENDIZ_OJO";
  }
  if (flor.length > 0 && (hechos.tesis || palabras >= 12)) {
    grado = "DETECTOR_RUIDO";
  }
  const sombra =
    Boolean(hechos.pregunta || hechos.cita) &&
    Boolean(diag?.puntoCiego) &&
    mecanicaAncladaAEscena(diag, texto);
  if (sombra) {
    grado = "ARQUITECTO_PUNTO_CIEGO";
  }

  return {
    grado,
    codigoDominante: codigo,
    nombreOjoDominante: ojo.nombreOjo,
    capas,
  };
}

function conteoOjos(
  dominantes: readonly CodigoObservador[],
): Map<CodigoObservador, number> {
  const c = new Map<CodigoObservador, number>();
  for (const n of dominantes) {
    if (!CODIGOS_OBSERVADOR.includes(n)) continue;
    c.set(n, (c.get(n) ?? 0) + 1);
  }
  return c;
}

/**
 * Expediente + grado del operador.
 * G4 = mapa de calor balanceado, no «llegar a C10».
 */
export function calcularExpedienteOjos(
  dominantes: readonly CodigoObservador[],
  lecturas: readonly LecturaGradoVolcado[] = [],
): ExpedienteOjos {
  const conteo = conteoOjos(dominantes);
  const ojosNombrados = CODIGOS_OBSERVADOR.filter((n) => conteo.has(n));
  const total = dominantes.filter((n) => CODIGOS_OBSERVADOR.includes(n)).length;
  let hueco: CodigoObservador | null = null;
  for (const n of CODIGOS_OBSERVADOR) {
    if (!conteo.has(n)) {
      hueco = n;
      break;
    }
  }
  let atasco: CodigoObservador | null = null;
  let max = 0;
  for (const [n, k] of conteo) {
    if (k > max) {
      max = k;
      atasco = n;
    }
  }
  const ratioAtasco = total > 0 && atasco ? max / total : 0;
  if (ratioAtasco < 0.45 || total < 4) atasco = null;

  const rango = ojosNombrados.length;
  const balance = total === 0 ? 0 : rango / 10;
  const vioSombra = lecturas.some((l) => l.grado === "ARQUITECTO_PUNTO_CIEGO");
  const vioRuido = lecturas.some(
    (l) =>
      l.grado === "DETECTOR_RUIDO" || l.grado === "ARQUITECTO_PUNTO_CIEGO",
  );

  let gradoOperador: GradoUniversidad = "APRENDIZ_OJO";
  if (total >= 1) gradoOperador = "APRENDIZ_OJO";
  if (vioRuido || rango >= 2) gradoOperador = "DETECTOR_RUIDO";
  if (vioSombra && rango >= 1) gradoOperador = "ARQUITECTO_PUNTO_CIEGO";
  if (rango >= 6 && !atasco && total >= 8) {
    gradoOperador = "OPERADOR_SOBERANIA";
  }

  let haciaDonde: string;
  if (gradoOperador === "OPERADOR_SOBERANIA") {
    haciaDonde =
      "Sintonía: los lentes rotan según la realidad. El título no es C10; es no atascarse.";
  } else if (atasco) {
    haciaDonde = `El mapa de calor se atasca en C${atasco} ${DICCIONARIO_OJOS[atasco].nombreOjo}. G4 pide rotar el lente, no coronar ese código.`;
  } else if (gradoOperador === "ARQUITECTO_PUNTO_CIEGO") {
    haciaDonde =
      "G3 activo: lo no dicho ya manda el ojo. G4 se gana rotando lentes en el tiempo, no saltando de número.";
  } else if (hueco) {
    haciaDonde = `Hay ${rango}/10 lentes con calor. Un lente aún sin uso es C${hueco} ${DICCIONARIO_OJOS[hueco].nombreOjo}: no es tarea de Forja; es un canal que la realidad todavía no exigió — o que el operador no mira.`;
  } else {
    haciaDonde = "Los diez lentes ya tuvieron calor. Falta balance: que ninguno gobierne el mapa.";
  }

  return {
    ojosNombrados,
    rango,
    atasco,
    hueco,
    techo: 10,
    balance,
    gradoOperador,
    haciaDonde,
  };
}

export function etiquetaGrado(grado: GradoUniversidad): string {
  const m = GRADO_UNIVERSIDAD_META[grado];
  return `G${m.orden} · ${m.label}`;
}
