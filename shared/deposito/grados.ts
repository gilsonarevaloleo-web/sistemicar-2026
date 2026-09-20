/**
 * Grados de La Universidad (Depósito).
 *
 * No es Umbral. Umbral cruza el código (carácter).
 * La Universidad nombra el ojo (óptica) y mide la profundidad
 * de ESA observación.
 *
 * Hacia dónde: el techo observacional.
 * El título no es C10. Es el rango de ojos que han sido
 * centro de gravedad de un volcado real, sin mezclar mecánicas.
 * El siguiente paso del expediente es el HUECO (el ojo que
 * nunca fue dominante), no «saltar al más glamuroso».
 *
 * El ruido no se tira: el no-dicho ya es un ojo.
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

/** Profundidad de UN volcado. No es el número del código. */
export type GradoUniversidad =
  | "RUIDO"
  | "NOMBRADO"
  | "ANCLADO"
  | "ABSORCION";

export const GRADOS_UNIVERSIDAD: readonly GradoUniversidad[] = [
  "RUIDO",
  "NOMBRADO",
  "ANCLADO",
  "ABSORCION",
];

export const GRADO_UNIVERSIDAD_META: Record<
  GradoUniversidad,
  { orden: 0 | 1 | 2 | 3; label: string; promesa: string }
> = {
  RUIDO: {
    orden: 0,
    label: "Ruido",
    promesa: "El no-dicho ya es el ojo. No se tira el volcado.",
  },
  NOMBRADO: {
    orden: 1,
    label: "Nombrado",
    promesa: "El Muro fijó un solo centro de gravedad.",
  },
  ANCLADO: {
    orden: 2,
    label: "Anclado",
    promesa: "Hay hecho: tesis, pregunta o cita de este día.",
  },
  ABSORCION: {
    orden: 3,
    label: "Absorción",
    promesa: "La mecánica de mañana está atada a la escena de este volcado.",
  },
};

export interface LecturaGradoVolcado {
  grado: GradoUniversidad;
  codigoDominante: CodigoObservador;
  nombreOjoDominante: string;
  noDicho: string;
}

export interface ExpedienteOjos {
  ojosNombrados: CodigoObservador[];
  rango: number;
  /** Primer código 1–10 que nunca fue dominante. Null si el techo está lleno. */
  hueco: CodigoObservador | null;
  techo: 10;
  haciaDonde: string;
}

function contarPalabras(texto: string): number {
  const t = texto.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function piezaDe(texto: string): { tesis: string; cita: string; pregunta: string; ancla: string } {
  const h = extraerHechos(texto);
  return {
    ...h,
    ancla: h.pregunta || h.cita || h.tesis,
  };
}

function mecanicaAncladaAEscena(
  diagnostico: DiagnosticoVolcado | undefined,
  ancla: string,
  texto: string,
): boolean {
  if (!diagnostico) return false;
  const mec = diagnostico.mecanicaAbsorcion.toLowerCase();
  if (!mec) return false;
  if (ancla && mec.includes(ancla.slice(0, 24).toLowerCase())) return true;
  const norm = texto.toLowerCase();
  const ganchos = ["hija", "esposa", "tarea", "juego", "casa", "llamar", "cobr", "puerta"];
  return ganchos.some((g) => norm.includes(g) && mec.includes(g));
}

/**
 * Grado de ESTE volcado.
 * El ruido también entrega código dominante: lo no dicho.
 */
export function calcularGradoVolcado(
  textoVolcado: string,
  diagnostico?: DiagnosticoVolcado,
): LecturaGradoVolcado {
  const texto = textoVolcado.trim();
  const palabras = contarPalabras(texto);
  const { tesis, cita, pregunta, ancla } = piezaDe(texto);
  const diag = diagnostico ?? (texto ? diagnosticarVolcadoLocal(texto) : undefined);
  const codigo = diag?.codigoDominante ?? 1;
  const ojo = DICCIONARIO_OJOS[codigo];

  let grado: GradoUniversidad = "RUIDO";
  if (palabras >= 6 && (tesis || diagnostico)) {
    grado = "NOMBRADO";
  }
  if (cita || pregunta || (tesis && palabras >= 20)) {
    grado = "ANCLADO";
  }
  if (grado !== "RUIDO" && mecanicaAncladaAEscena(diag, ancla, texto)) {
    grado = "ABSORCION";
  }
  if (palabras < 6 && !tesis) {
    grado = "RUIDO";
  }

  const noDicho =
    grado === "RUIDO"
      ? ojo.cegueraActiva
      : diag?.puntoCiego ||
        (ancla
          ? `Lo que no se nombra alrededor de «${ancla}» es el punto ciego.`
          : ojo.cegueraActiva);

  return {
    grado,
    codigoDominante: codigo,
    nombreOjoDominante: ojo.nombreOjo,
    noDicho,
  };
}

export function calcularExpedienteOjos(
  dominantes: readonly CodigoObservador[],
): ExpedienteOjos {
  const vistos = new Set<CodigoObservador>();
  for (const n of dominantes) {
    if (CODIGOS_OBSERVADOR.includes(n)) vistos.add(n);
  }
  const ojosNombrados = CODIGOS_OBSERVADOR.filter((n) => vistos.has(n));
  let hueco: CodigoObservador | null = null;
  for (const n of CODIGOS_OBSERVADOR) {
    if (!vistos.has(n)) {
      hueco = n;
      break;
    }
  }
  const rango = ojosNombrados.length;
  const haciaDonde = hueco
    ? `El expediente no salta. El hueco es C${hueco} ${DICCIONARIO_OJOS[hueco].nombreOjo}. El techo no es C10: es ${rango}/10 ojos que ya fueron centro de un volcado.`
    : "Los diez ojos ya fueron centro de gravedad. El techo ahora es autarquía: un ojo, una mecánica, sin inventario.";

  return {
    ojosNombrados,
    rango,
    hueco,
    techo: 10,
    haciaDonde,
  };
}

export function etiquetaGrado(grado: GradoUniversidad): string {
  return `G${GRADO_UNIVERSIDAD_META[grado].orden} · ${GRADO_UNIVERSIDAD_META[grado].label}`;
}
