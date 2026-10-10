/**
 * Umbral Arena — Oferta nombrada.
 *
 * El sujeto de La Arena no es el operador: es el nombre del producto.
 * Cada nombre abre su propia carrera 1–10. Un rename (otra clave) no
 * hereda sellos. Forja no usa este módulo.
 */

import {
  CODIGOS_NUMERO,
  isCodigoNumero,
  type CodigoNumero,
} from "./engineConfig.ts";
import { primerCodigoPendiente } from "./progreso.ts";
import {
  anclarTextoAOferta,
  bloquePromptOferta,
} from "./ofertaArenaTexto.ts";

export { anclarTextoAOferta, bloquePromptOferta };

export const OFERTA_NOMBRE_MIN = 2;
export const OFERTA_NOMBRE_MAX = 64;
export const OFERTA_FRASE_MIN = 8;
export const OFERTA_FRASE_MAX = 240;

const NOMBRES_GENERICOS = new Set([
  "esto",
  "eso",
  "producto",
  "el producto",
  "mi producto",
  "tu producto",
  "la oferta",
  "mi oferta",
  "product",
  "my product",
  "this",
  "offer",
]);

export interface SelloOfertaArena {
  codigo: CodigoNumero;
  respuestaAprobada: string;
  feedbackGemini: string;
  intentos: number;
  fechaAprobacion: string;
  sesionId: string;
}

export interface OfertaArena {
  id: string;
  userId: string;
  /** Nombre de display, tal como lo escribió el operador. */
  nombre: string;
  /** Identidad normalizada: mismo clave = misma oferta. */
  nombreClave: string;
  /** Frase de utilidad (semilla C1). */
  fraseUtilidad: string;
  sellos: Partial<Record<CodigoNumero, SelloOfertaArena>>;
  createdAt: string;
  updatedAt: string;
}

export interface ProgresoOfertaArena {
  ofertaId: string;
  nombre: string;
  superados: CodigoNumero[];
  siguiente: CodigoNumero | null;
  codigoPorDefecto: CodigoNumero;
  elegibles: CodigoNumero[];
  sellosCount: number;
}

export type ValidacionOferta<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function newOfertaId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `ofa-${Date.now().toString(36)}-${rand}`;
}

export function colapsarEspacios(raw: string): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

export function claveNombreOferta(nombre: string): string {
  const base = colapsarEspacios(nombre)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return base;
}

export function validarNombreOferta(
  raw: string,
): ValidacionOferta<{ nombre: string; clave: string }> {
  const nombre = colapsarEspacios(raw);
  if (nombre.length < OFERTA_NOMBRE_MIN) {
    return { ok: false, error: "El nombre necesita al menos 2 caracteres." };
  }
  if (nombre.length > OFERTA_NOMBRE_MAX) {
    return {
      ok: false,
      error: `El nombre no puede pasar de ${OFERTA_NOMBRE_MAX} caracteres.`,
    };
  }
  if (!/[a-záéíóúñ]/i.test(nombre)) {
    return { ok: false, error: "El nombre tiene que llevar una letra." };
  }
  const clave = claveNombreOferta(nombre);
  if (!clave || NOMBRES_GENERICOS.has(clave)) {
    return {
      ok: false,
      error: "Eso no es un nombre: nombra lo que vendes, no «producto» ni «esto».",
    };
  }
  return { ok: true, value: { nombre, clave } };
}

export function validarFraseUtilidad(raw: string): ValidacionOferta<string> {
  const frase = colapsarEspacios(raw);
  if (frase.length < OFERTA_FRASE_MIN) {
    return {
      ok: false,
      error: "La frase de utilidad tiene que caber en una línea usable (mín. 8).",
    };
  }
  if (frase.length > OFERTA_FRASE_MAX) {
    return {
      ok: false,
      error: `La frase no puede pasar de ${OFERTA_FRASE_MAX} caracteres.`,
    };
  }
  return { ok: true, value: frase };
}

export function crearOfertaArena(input: {
  userId: string;
  nombre: string;
  fraseUtilidad: string;
  id?: string;
  nowIso?: string;
}): OfertaArena {
  const nom = validarNombreOferta(input.nombre);
  if (!nom.ok) throw new Error(nom.error);
  const frase = validarFraseUtilidad(input.fraseUtilidad);
  if (!frase.ok) throw new Error(frase.error);
  const now = input.nowIso ?? new Date().toISOString();
  return {
    id: input.id ?? newOfertaId(),
    userId: String(input.userId ?? "").trim(),
    nombre: nom.value.nombre,
    nombreClave: nom.value.clave,
    fraseUtilidad: frase.value,
    sellos: {},
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeSello(
  raw: Partial<SelloOfertaArena> | null | undefined,
): SelloOfertaArena | null {
  if (!raw) return null;
  const codigoNum = Number(raw.codigo);
  if (!isCodigoNumero(codigoNum)) return null;
  const respuesta = String(raw.respuestaAprobada ?? "").trim();
  if (!respuesta) return null;
  return {
    codigo: codigoNum,
    respuestaAprobada: respuesta,
    feedbackGemini: String(raw.feedbackGemini ?? ""),
    intentos: Math.max(1, Number(raw.intentos) || 1),
    fechaAprobacion: String(raw.fechaAprobacion ?? ""),
    sesionId: String(raw.sesionId ?? ""),
  };
}

export function normalizeOferta(
  raw: Partial<OfertaArena> | null | undefined,
): OfertaArena | null {
  if (!raw) return null;
  const nom = validarNombreOferta(String(raw.nombre ?? ""));
  if (!nom.ok) return null;
  const fraseRaw = String(raw.fraseUtilidad ?? "").trim();
  const frase = fraseRaw
    ? validarFraseUtilidad(fraseRaw)
    : { ok: true as const, value: "" };
  if (!frase.ok) return null;
  const sellos: Partial<Record<CodigoNumero, SelloOfertaArena>> = {};
  const rawSellos = raw.sellos && typeof raw.sellos === "object" ? raw.sellos : {};
  for (const n of CODIGOS_NUMERO) {
    const sello = normalizeSello(
      (rawSellos as Partial<Record<CodigoNumero, SelloOfertaArena>>)[n],
    );
    if (sello) sellos[n] = sello;
  }
  const id = String(raw.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    userId: String(raw.userId ?? "").trim(),
    nombre: nom.value.nombre,
    nombreClave: nom.value.clave,
    fraseUtilidad: frase.value,
    sellos,
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export function calcularProgresoOferta(
  oferta: OfertaArena,
): ProgresoOfertaArena {
  const superados = CODIGOS_NUMERO.filter((n) => oferta.sellos[n] != null);
  const siguiente = primerCodigoPendiente(superados);
  return {
    ofertaId: oferta.id,
    nombre: oferta.nombre,
    superados,
    siguiente,
    codigoPorDefecto: siguiente ?? 1,
    elegibles:
      siguiente == null
        ? [...CODIGOS_NUMERO]
        : CODIGOS_NUMERO.filter((n) => superados.includes(n) || n === siguiente),
    sellosCount: superados.length,
  };
}

/**
 * Sella un código. El primer pase fija la fecha; un repaso actualiza
 * la respuesta aprobada (copy fresco para la carta, más adelante).
 */
export function aplicarSelloOferta(
  oferta: OfertaArena,
  sello: SelloOfertaArena,
  nowIso?: string,
): OfertaArena {
  const prev = oferta.sellos[sello.codigo];
  const nextSello: SelloOfertaArena = prev
    ? { ...sello, fechaAprobacion: prev.fechaAprobacion || sello.fechaAprobacion }
    : sello;
  return {
    ...oferta,
    sellos: { ...oferta.sellos, [sello.codigo]: nextSello },
    updatedAt: nowIso ?? new Date().toISOString(),
  };
}

export function resolverOfertaPorNombre(
  ofertas: OfertaArena[],
  nombre: string,
): OfertaArena | null {
  const clave = claveNombreOferta(nombre);
  if (!clave) return null;
  return ofertas.find((o) => o.nombreClave === clave) ?? null;
}

