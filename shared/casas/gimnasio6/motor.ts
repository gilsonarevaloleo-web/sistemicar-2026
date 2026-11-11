/**
 * Motor del gimnasio: una pregunta a la vez, tres tiempos por código,
 * variante del MISMO tiempo si no raspa, sello de código, tope de uno por día.
 */

import {
  capituloPreparable,
  etiquetaCapituloDe,
  preguntaCanon,
  siguienteCodigo,
  siguientePuntero,
} from "./canon.ts";
import { ETIQUETA_TIEMPO, fichaDe } from "./fichas.ts";
import { copiarLibro } from "./prompt.ts";
import type {
  CapituloId,
  EvaluacionTurno,
  LibroGimnasio,
  PreguntaCanon,
  PreguntaViva,
  RecursosGimnasio,
  TurnoGimnasio,
} from "./types.ts";
import { puertaDeModulo } from "./types.ts";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const NIEBLA_TOTAL =
  /^(no se|ns|nada|ok|bueno|mas o menos|este|ya|si|no|no se si)$/;

const NIEBLA = [
  /\bmas o menos\b/,
  /\bla gente\b/,
  /\bdespues hablamos\b/,
  /\bno es para (mi|vos|el|ella|ellos)\b/,
];

const FLOR = [
  /\banimo\b/,
  /\bvamos a poder\b/,
  /\btodo va a estar bien\b/,
  /\bla proxima vez\b/,
  /\bconfio en mi\b/,
];

export function diaLima(now: Date | string = new Date()): string {
  const d = typeof now === "string" ? new Date(now) : now;
  return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

export function recursosVacios(): RecursosGimnasio {
  return { experiencia: "", miedo: "", familia: "", gustos: "" };
}

export function extraerEscala(texto: string): number | null {
  const m = texto.match(/\b(10|[1-9])\b/);
  if (!m) return null;
  return Number(m[1]);
}

function esCorto(texto: string): boolean {
  return texto.trim().length < 8;
}

function hayNiebla(norm: string): boolean {
  if (NIEBLA_TOTAL.test(norm)) return true;
  if (norm.length < 28 && /\bno se\b/.test(norm)) return true;
  return NIEBLA.some((p) => p.test(norm));
}

function hayFlor(norm: string): boolean {
  if (/\bsin (flor|promesa|animo|promet)/.test(norm)) return false;
  return FLOR.some((p) => p.test(norm));
}

function hayNombrePropio(texto: string): boolean {
  return /(?:\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}\b)|(?:\bmi (mama|papá|papa|hermano|hermana|esposo|esposa|jefe|amigo|amiga|primo|prima|tio|tia|vecino|cliente|vecina)\b)/i.test(
    texto.trim(),
  );
}

export function evaluarRespuestaLocal(
  pregunta: PreguntaCanon,
  respuesta: string,
): EvaluacionTurno {
  const texto = respuesta.trim();
  const norm = normalizar(texto);
  if (!texto) {
    return { pasa: false, motivo: "Vacío. El cuarto sigue esperando." };
  }

  if (hayNiebla(norm) && esCorto(texto)) {
    return { pasa: false, motivo: "Niebla. El mismo tiempo, más cerca." };
  }
  if (esCorto(texto) || hayNiebla(norm)) {
    return { pasa: false, motivo: "Eso no raspa. El cuarto sigue." };
  }
  if (hayFlor(norm) && pregunta.indice !== 1) {
    return { pasa: false, motivo: "Flor. El hecho no apareció." };
  }

  if (pregunta.capitulo === 1 && pregunta.indice === 1) {
    if (/\bquien soy yo para\b/.test(norm) || /\bno soy nadie\b/.test(norm)) {
      return { pasa: false, motivo: "Eso es permiso. El cimiento no pide permiso." };
    }
  }

  if (pregunta.capitulo === 2 && pregunta.indice === 1) {
    if (!hayNombrePropio(texto) || /\bla gente\b/.test(norm)) {
      return { pasa: false, motivo: "Un nombre. No la masa." };
    }
  }

  if (pregunta.capitulo === 2 && /\bno es para (mi|vos|el)\b/.test(norm)) {
    return { pasa: false, motivo: "Se escondió. Esa persona sigue en el cuarto." };
  }

  return { pasa: true, motivo: "Roce." };
}

export function parseEvaluacion(raw: unknown): EvaluacionTurno | null {
  let data: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try {
      data = JSON.parse(text);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.pasa !== "boolean") return null;
  return {
    pasa: o.pasa,
    motivo: typeof o.motivo === "string" && o.motivo.trim() ? o.motivo.trim() : o.pasa ? "Roce." : "Sin roce.",
  };
}

/**
 * Gemini puede hacer pasar. No puede retener a quien ya contestó el cuarto.
 * Una sola variante extra si el maestro pide ir más cerca; la segunda con
 * sustancia avanza. Si Gemini no llega, vale el motor local.
 */
export function resolverEvaluacion(
  local: EvaluacionTurno,
  remota: EvaluacionTurno | null,
  variante: number,
): EvaluacionTurno {
  if (remota?.pasa) return remota;
  if (local.pasa) {
    if (!remota || variante >= 1) return local;
    return remota;
  }
  return remota ?? local;
}

export function preguntaVivaDe(libro: LibroGimnasio): PreguntaViva | null {
  const { capitulo, indice, variante } = libro.puntero;
  const puerta = puertaDeModulo(libro.modulo);
  const canon = preguntaCanon(capitulo, 1, indice, puerta, libro.limiteOrigen);
  if (!canon) return null;
  const ficha = fichaDe(puerta, capitulo);
  const escenario =
    variante === 0
      ? canon.escenario
      : fluidezVariante(canon, ultimoTexto(libro), variante, ficha.variante);
  return {
    escenario,
    pregunta: canon.pregunta,
    capitulo,
    subcodigo: 1,
    indice,
    variante,
    etiquetaCapitulo: etiquetaCapituloDe(capitulo, puerta),
    etiquetaTiempo: ETIQUETA_TIEMPO[indice],
  };
}

function ultimoTexto(libro: LibroGimnasio): string {
  for (let i = libro.turnos.length - 1; i >= 0; i -= 1) {
    const r = libro.turnos[i]?.respuesta;
    if (r) return r;
  }
  return "";
}

export function fluidezVariante(
  pregunta: PreguntaCanon,
  respuesta: string,
  variante: number,
  semilla?: string,
): string {
  const recorte = respuesta.trim().replace(/\s+/g, " ").slice(0, 120);
  const dicho = recorte ? `Dijiste: «${recorte}».` : "Eso no llenó el cuarto.";
  const misma =
    semilla?.trim() ||
    "El mismo tiempo. Más cerca. No adelantes.";
  if (variante === 1) {
    return `${pregunta.escenario} ${dicho} ${misma}`;
  }
  return `${pregunta.escenario} ${dicho} Otra vez, con gente de tu vida. No teatro.`;
}

function nuevoTurnoId(libro: LibroGimnasio): string {
  return `${libro.id}-t${libro.turnos.length + 1}`;
}

export function aplicarRespuesta(
  libro: LibroGimnasio,
  respuesta: string,
  evaluacion: EvaluacionTurno,
  now: Date | string = new Date(),
): LibroGimnasio {
  const viva = preguntaVivaDe(libro);
  const puerta = puertaDeModulo(libro.modulo);
  const canon = preguntaCanon(
    libro.puntero.capitulo,
    1,
    libro.puntero.indice,
    puerta,
    libro.limiteOrigen,
  );
  if (!viva || !canon) return libro;

  const nowDate = typeof now === "string" ? new Date(now) : now;
  const iso = nowDate.toISOString();
  const turno: TurnoGimnasio = {
    id: nuevoTurnoId(libro),
    capitulo: viva.capitulo,
    subcodigo: 1,
    indice: viva.indice,
    variante: viva.variante,
    escenario: viva.escenario,
    pregunta: viva.pregunta,
    respuesta: respuesta.trim(),
    pasa: evaluacion.pasa,
    creadoAt: iso,
  };

  const turnos = [...libro.turnos, turno];
  const recursos = absorberRecursos(libro.recursos, viva.indice, respuesta);

  if (!evaluacion.pasa) {
    return {
      ...libro,
      recursos,
      turnos,
      puntero: { ...libro.puntero, variante: libro.puntero.variante + 1 },
      estado: "ABIERTO",
      updatedAt: iso,
    };
  }

  const next = siguientePuntero(viva.capitulo, 1, viva.indice);
  if (next === "sellar") {
    const sellados = libro.capitulosSellados.includes(viva.capitulo)
      ? libro.capitulosSellados
      : [...libro.capitulosSellados, viva.capitulo];
    const siguiente = siguienteCodigo(viva.capitulo);
    const siguienteExiste = siguiente != null && capituloPreparable(siguiente);
    return {
      ...libro,
      recursos,
      turnos,
      capitulosSellados: sellados,
      capituloSelladoDia: diaLima(nowDate),
      puntero: siguienteExiste
        ? { capitulo: siguiente, subcodigo: 1, indice: 1, variante: 0 }
        : libro.puntero,
      estado: siguienteExiste ? "TOPE_DIARIO" : "LIBRO_CERRADO",
      updatedAt: iso,
    };
  }

  return {
    ...libro,
    recursos,
    turnos,
    puntero: { ...next, variante: 0 },
    estado: "ABIERTO",
    updatedAt: iso,
  };
}

function absorberRecursos(
  recursos: RecursosGimnasio,
  tiempo: PreguntaIndiceDeMotor,
  respuesta: string,
): RecursosGimnasio {
  const t = respuesta.trim();
  if (!t) return recursos;
  if (tiempo === 1) return { ...recursos, experiencia: recursos.experiencia || t };
  if (tiempo === 2) return { ...recursos, miedo: recursos.miedo || t };
  return { ...recursos, familia: recursos.familia || t };
}

type PreguntaIndiceDeMotor = 1 | 2 | 3;

export function puedeAbrirCapitulo(libro: LibroGimnasio, now: Date | string = new Date()): boolean {
  if (libro.estado === "LIBRO_CERRADO") return false;
  if (libro.estado !== "TOPE_DIARIO" && libro.estado !== "CAPITULO_SELLADO") return false;
  if (!libro.capituloSelladoDia) return true;
  return diaLima(now) !== libro.capituloSelladoDia;
}

export function abrirSiguienteCapitulo(
  libro: LibroGimnasio,
  now: Date | string = new Date(),
): LibroGimnasio {
  if (!puedeAbrirCapitulo(libro, now)) return libro;
  const cap = libro.puntero.capitulo;
  if (!capituloPreparable(cap)) {
    return { ...libro, estado: "LIBRO_CERRADO" };
  }
  const iso = (typeof now === "string" ? new Date(now) : now).toISOString();
  return {
    ...libro,
    estado: "ABIERTO",
    puntero: { capitulo: cap, subcodigo: 1, indice: 1, variante: 0 },
    updatedAt: iso,
  };
}

export function textoCopiaLibro(libro: LibroGimnasio): string {
  return copiarLibro(libro);
}

export { copiarLibro };
