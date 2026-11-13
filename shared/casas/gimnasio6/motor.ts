/**
 * Motor del gimnasio: una pregunta a la vez, variante si no raspa,
 * sello de capítulo, tope de un capítulo por día.
 */

import { capituloPreparable, ETIQUETA_CAPITULO, preguntaCanon, siguientePuntero } from "./canon.ts";
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
  // «no se» solo es niebla en respuestas cortas. En un texto largo es español normal.
  if (norm.length < 28 && /\bno se\b/.test(norm)) return true;
  return NIEBLA.some((p) => p.test(norm));
}

function hayFlor(norm: string): boolean {
  if (/\bsin (flor|promesa|animo|promet)/.test(norm)) return false;
  return FLOR.some((p) => p.test(norm));
}

function hayNombrePropio(texto: string): boolean {
  return /(?:\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}\b)|(?:\bmi (mama|papá|papa|hermano|hermana|esposo|esposa|jefe|amigo|amiga|primo|prima|tio|tia|vecino|cliente)\b)/i.test(
    texto.trim(),
  );
}

function hayTajo(norm: string): boolean {
  return (
    /\b(me detendr\w*|me detengo|me paro|pararia|me bajo|abandon\w*|renunci\w*|no sigo|dejaria|lo dejo)\b/.test(
      norm,
    ) ||
    /\b(seguiria|sigo|seguire|continu\w*|no paro|no me detengo|me quedo|sigo adelante)\b/.test(
      norm,
    )
  );
}

const SLOGAN_PERSISTENCIA = [
  /\bsoy persistente\b/,
  /\bnunca me rindo\b/,
  /\bno me rindo\b/,
  /\bhay que seguir\b/,
  /\bsiempre sigo\b/,
];

function haySloganPersistencia(norm: string): boolean {
  return SLOGAN_PERSISTENCIA.some((p) => p.test(norm));
}

function esAgendaNoValor(norm: string): boolean {
  return /\b(deberes?|tareas?|agenda|calendario|entre todo lo que (tengo|hay) que hacer)\b/.test(
    norm,
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

  const pideEscala =
    pregunta.capitulo === 1 &&
    ((pregunta.subcodigo === 1 && pregunta.indice === 1) ||
      (pregunta.subcodigo === 2 && pregunta.indice === 1) ||
      (pregunta.subcodigo === 3 && pregunta.indice === 2) ||
      (pregunta.subcodigo === 4 && pregunta.indice === 2));

  if (pideEscala && extraerEscala(texto) == null) {
    return { pasa: false, motivo: "Falta la posición. El 1 al 10 es un lugar, no un adorno." };
  }

  if (pregunta.capitulo === 1 && pregunta.subcodigo === 1 && pregunta.indice === 2) {
    if (esCorto(texto) || hayNiebla(norm)) {
      return { pasa: false, motivo: "Eso no es conocimiento del producto. Niebla." };
    }
  }

  if (pregunta.capitulo === 1 && pregunta.subcodigo === 1 && pregunta.indice === 3) {
    if (esCorto(texto) || hayNiebla(norm)) {
      return { pasa: false, motivo: "El 10 no se imaginó." };
    }
  }

  if (pregunta.capitulo === 1 && pregunta.subcodigo === 2 && pregunta.indice === 2) {
    if (esCorto(texto) || hayNiebla(norm)) {
      return { pasa: false, motivo: "No hay por qué de ese número." };
    }
  }

  if (pregunta.capitulo === 1 && pregunta.subcodigo === 2 && pregunta.indice === 3) {
    if (esCorto(texto) || hayNiebla(norm)) {
      return { pasa: false, motivo: "No hay situación del 10." };
    }
  }

  if (pregunta.capitulo === 1 && pregunta.subcodigo === 3 && pregunta.indice === 1) {
    if (esCorto(texto) || hayNiebla(norm)) {
      return { pasa: false, motivo: "La semana no se sostuvo." };
    }
  }

  if (pregunta.capitulo === 1 && pregunta.subcodigo === 3 && pregunta.indice === 3) {
    if (esCorto(texto) || hayNiebla(norm)) {
      return { pasa: false, motivo: "Falta el máximo esfuerzo." };
    }
  }

  if (pregunta.capitulo === 1 && pregunta.subcodigo === 4 && pregunta.indice === 1) {
    const palabras = texto.split(/\s+/).filter(Boolean).length;
    if (
      !hayTajo(norm) ||
      palabras < 8 ||
      hayNiebla(norm) ||
      haySloganPersistencia(norm)
    ) {
      return { pasa: false, motivo: "Falta el tajo: te detienes o sigues, y por qué. No el slogan." };
    }
  }

  if (pregunta.capitulo === 1 && pregunta.subcodigo === 4 && pregunta.indice === 2) {
    if (esCorto(texto) || hayNiebla(norm) || esAgendaNoValor(norm)) {
      return { pasa: false, motivo: "Ese número es valor entre propósitos, no otra vez la agenda." };
    }
  }

  if (pregunta.capitulo === 1 && pregunta.subcodigo === 4 && pregunta.indice === 3) {
    if (hayFlor(norm) || esCorto(texto) || hayNiebla(norm)) {
      return { pasa: false, motivo: "Flor. Pedí una escena de esa vida, no un afiche." };
    }
  }

  if (pregunta.capitulo === 2 && pregunta.indice === 1 && (pregunta.subcodigo === 1 || pregunta.subcodigo === 2)) {
    if (!hayNombrePropio(texto) || /\bla gente\b/.test(norm)) {
      return { pasa: false, motivo: "Un nombre. No la masa." };
    }
  }

  if (pregunta.capitulo === 2 && esCorto(texto)) {
    return { pasa: false, motivo: "Eso no raspa. El cuarto sigue." };
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
  const { capitulo, subcodigo, indice, variante } = libro.puntero;
  const canon = preguntaCanon(capitulo, subcodigo, indice);
  if (!canon) return null;
  const escenario =
    variante === 0
      ? canon.escenario
      : fluidezVariante(canon, ultimoTexto(libro), variante);
  return {
    escenario,
    pregunta: canon.pregunta,
    capitulo,
    subcodigo,
    indice,
    variante,
    etiquetaCapitulo: ETIQUETA_CAPITULO[capitulo],
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
): string {
  const recorte = respuesta.trim().replace(/\s+/g, " ").slice(0, 120);
  const dicho = recorte ? `Dijiste: «${recorte}».` : "Eso no llenó el cuarto.";
  if (variante === 1) {
    return `${pregunta.escenario} ${dicho} El mismo cuarto. Más cerca.`;
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
  const canon = preguntaCanon(
    libro.puntero.capitulo,
    libro.puntero.subcodigo,
    libro.puntero.indice,
  );
  if (!viva || !canon) return libro;

  const nowDate = typeof now === "string" ? new Date(now) : now;
  const iso = nowDate.toISOString();
  const turno: TurnoGimnasio = {
    id: nuevoTurnoId(libro),
    capitulo: viva.capitulo,
    subcodigo: viva.subcodigo,
    indice: viva.indice,
    variante: viva.variante,
    escenario: viva.escenario,
    pregunta: viva.pregunta,
    respuesta: respuesta.trim(),
    pasa: evaluacion.pasa,
    creadoAt: iso,
  };

  const turnos = [...libro.turnos, turno];
  const recursos = absorberRecursos(libro.recursos, canon, respuesta);

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

  const next = siguientePuntero(viva.capitulo, viva.subcodigo, viva.indice);
  if (next === "sellar") {
    const sellados = libro.capitulosSellados.includes(viva.capitulo)
      ? libro.capitulosSellados
      : [...libro.capitulosSellados, viva.capitulo];
    const haySiguiente = (viva.capitulo + 1) as CapituloId;
    const siguienteExiste = haySiguiente <= 4 && capituloPreparable(haySiguiente);
    return {
      ...libro,
      recursos,
      turnos,
      capitulosSellados: sellados,
      capituloSelladoDia: diaLima(nowDate),
      puntero: siguienteExiste
        ? { capitulo: haySiguiente, subcodigo: 1, indice: 1, variante: 0 }
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
  pregunta: PreguntaCanon,
  respuesta: string,
): RecursosGimnasio {
  const t = respuesta.trim();
  if (!t) return recursos;
  if (pregunta.capitulo === 1 && pregunta.subcodigo === 1 && pregunta.indice === 2) {
    return { ...recursos, experiencia: recursos.experiencia || t };
  }
  if (pregunta.capitulo === 2 && pregunta.subcodigo === 1 && pregunta.indice === 1) {
    return { ...recursos, familia: recursos.familia || t };
  }
  if (pregunta.capitulo === 2 && pregunta.subcodigo === 2 && pregunta.indice === 1) {
    return { ...recursos, familia: recursos.familia || t };
  }
  if (pregunta.capitulo === 1 && pregunta.subcodigo === 4 && pregunta.indice === 1) {
    return { ...recursos, miedo: recursos.miedo || t };
  }
  return recursos;
}

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
