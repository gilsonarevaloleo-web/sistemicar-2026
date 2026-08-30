/**
 * Umbral v2 — Progreso de carrera e historial de logros.
 *
 * El avance de códigos no es solo de la sesión en curso: si el operador
 * ya superó un código, ese logro permanece y puede consultarse en métricas.
 * La práctica abre por defecto el primer código aún no superado; los
 * ya superados siguen eligibles para repasar.
 */

import {
  CODIGOS_NUMERO,
  DICCIONARIO_CODIGOS,
  isCodigoNumero,
  type CodigoNumero,
  type ModoUmbral,
} from "./engineConfig.ts";
import type { HistorialCodigoUmbral, SesionUmbral } from "./sessionTypes.ts";

export interface LogroCodigoUmbral {
  modo: ModoUmbral;
  codigo: CodigoNumero;
  nombreCodigo: string;
  intentos: number;
  respuestaAprobada: string;
  feedbackGemini: string;
  psGanados: number;
  fechaAprobacion: string;
  sesionId: string;
}

export interface ProgresoModoUmbral {
  modo: ModoUmbral;
  superados: CodigoNumero[];
  /** Primer código 1–10 que aún no tiene logro. Null si los 10 están superados. */
  siguiente: CodigoNumero | null;
  /** Dónde debe abrir la consola: el siguiente pendiente, o 1 si el modo está cerrado. */
  codigoPorDefecto: CodigoNumero;
  /** Superados + el siguiente pendiente (o todos si el modo está cerrado). */
  elegibles: CodigoNumero[];
}

export interface ProgresoCarreraUmbral {
  porModo: Record<ModoUmbral, ProgresoModoUmbral>;
  logros: LogroCodigoUmbral[];
}

export function logroKey(logro: LogroCodigoUmbral): string {
  return [
    logro.sesionId,
    logro.modo,
    String(logro.codigo),
    logro.fechaAprobacion,
    logro.respuestaAprobada.slice(0, 80),
  ].join("|");
}

function asModo(value: unknown): ModoUmbral {
  return value === "EXTERNO_VENTAS" ? "EXTERNO_VENTAS" : "INTERNO_HABILIDAD";
}

export function normalizeLogro(
  raw: Partial<LogroCodigoUmbral> | null | undefined,
): LogroCodigoUmbral | null {
  if (!raw) return null;
  const codigoNum = Number(raw.codigo);
  if (!isCodigoNumero(codigoNum)) return null;
  const respuesta = String(raw.respuestaAprobada ?? "").trim();
  if (!respuesta) return null;
  const modo = asModo(raw.modo);
  return {
    modo,
    codigo: codigoNum,
    nombreCodigo:
      String(raw.nombreCodigo ?? "").trim() ||
      DICCIONARIO_CODIGOS[codigoNum].nombre,
    intentos: Math.max(1, Number(raw.intentos) || 1),
    respuestaAprobada: respuesta,
    feedbackGemini: String(raw.feedbackGemini ?? ""),
    psGanados: Math.max(0, Number(raw.psGanados) || 0),
    fechaAprobacion: String(raw.fechaAprobacion ?? ""),
    sesionId: String(raw.sesionId ?? ""),
  };
}

export function extraerLogrosDeSesiones(
  sesiones: SesionUmbral[],
): LogroCodigoUmbral[] {
  const out: LogroCodigoUmbral[] = [];
  for (const sesion of sesiones) {
    for (const h of sesion.historialCodigos) {
      const logro = normalizeLogro({
        modo: sesion.modo,
        codigo: isCodigoNumero(h.codigo) ? h.codigo : undefined,
        nombreCodigo: isCodigoNumero(h.codigo)
          ? DICCIONARIO_CODIGOS[h.codigo].nombre
          : "",
        intentos: h.intentos,
        respuestaAprobada: h.respuestaAprobada,
        feedbackGemini: h.feedbackGemini,
        psGanados: h.psGanados,
        fechaAprobacion: h.fechaAprobacion,
        sesionId: sesion.id,
      });
      if (logro) out.push(logro);
    }
  }
  return out;
}

export function mergeLogros(
  ...lists: Array<LogroCodigoUmbral[] | undefined>
): LogroCodigoUmbral[] {
  const seen = new Set<string>();
  const out: LogroCodigoUmbral[] = [];
  for (const list of lists) {
    if (!list) continue;
    for (const raw of list) {
      const logro = normalizeLogro(raw);
      if (!logro) continue;
      const key = logroKey(logro);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(logro);
    }
  }
  out.sort((a, b) => {
    const byDate = a.fechaAprobacion.localeCompare(b.fechaAprobacion);
    if (byDate !== 0) return byDate;
    if (a.codigo !== b.codigo) return a.codigo - b.codigo;
    return a.modo.localeCompare(b.modo);
  });
  return out;
}

function toCodigoList(
  superados: ReadonlySet<number> | readonly number[],
): number[] {
  if (Array.isArray(superados)) return superados.slice();
  const out: number[] = [];
  superados.forEach((n) => out.push(n));
  return out;
}

export function primerCodigoPendiente(
  superados: ReadonlySet<number> | readonly number[],
): CodigoNumero | null {
  const set = new Set<number>();
  toCodigoList(superados).forEach((n) => {
    if (isCodigoNumero(n)) set.add(n);
  });
  for (const n of CODIGOS_NUMERO) {
    if (!set.has(n)) return n;
  }
  return null;
}

export function calcularProgresoModo(
  modo: ModoUmbral,
  logros: LogroCodigoUmbral[],
): ProgresoModoUmbral {
  const superadosSet = new Set<CodigoNumero>();
  for (const l of logros) {
    if (l.modo === modo) superadosSet.add(l.codigo);
  }
  const superados = CODIGOS_NUMERO.filter((n) => superadosSet.has(n));
  const siguiente = primerCodigoPendiente(superadosSet);
  const codigoPorDefecto: CodigoNumero = siguiente ?? 1;
  const elegibles: CodigoNumero[] =
    siguiente == null
      ? [...CODIGOS_NUMERO]
      : CODIGOS_NUMERO.filter((n) => superadosSet.has(n) || n === siguiente);
  return {
    modo,
    superados,
    siguiente,
    codigoPorDefecto,
    elegibles,
  };
}

export function calcularProgresoCarrera(
  logros: LogroCodigoUmbral[],
): ProgresoCarreraUmbral {
  return {
    porModo: {
      INTERNO_HABILIDAD: calcularProgresoModo("INTERNO_HABILIDAD", logros),
      EXTERNO_VENTAS: calcularProgresoModo("EXTERNO_VENTAS", logros),
    },
    logros,
  };
}

export function calcularProgresoDesdeSesiones(
  sesiones: SesionUmbral[],
): ProgresoCarreraUmbral {
  return calcularProgresoCarrera(extraerLogrosDeSesiones(sesiones));
}

export function esCodigoElegible(
  progreso: ProgresoModoUmbral,
  codigo: CodigoNumero,
): boolean {
  return progreso.elegibles.includes(codigo);
}

/** Tras aprobar (nuevo o repaso), la consola vuelve al primer pendiente. */
export function codigoTrasAprobar(
  superados: ReadonlySet<CodigoNumero> | readonly CodigoNumero[],
  codigoAprobado: CodigoNumero,
): CodigoNumero {
  const next = toCodigoList(superados);
  next.push(codigoAprobado);
  return primerCodigoPendiente(next) ?? 1;
}

export function logrosDeCodigo(
  logros: LogroCodigoUmbral[],
  modo: ModoUmbral,
  codigo: CodigoNumero,
): LogroCodigoUmbral[] {
  return logros.filter((l) => l.modo === modo && l.codigo === codigo);
}

export function ultimoLogroDeCodigo(
  logros: LogroCodigoUmbral[],
  modo: ModoUmbral,
  codigo: CodigoNumero,
): LogroCodigoUmbral | null {
  const list = logrosDeCodigo(logros, modo, codigo);
  return list.length ? list[list.length - 1] : null;
}

export function historialDesdeLogro(
  h: HistorialCodigoUmbral,
  modo: ModoUmbral,
  sesionId: string,
): LogroCodigoUmbral | null {
  return normalizeLogro({
    modo,
    codigo: isCodigoNumero(h.codigo) ? h.codigo : undefined,
    intentos: h.intentos,
    respuestaAprobada: h.respuestaAprobada,
    feedbackGemini: h.feedbackGemini,
    psGanados: h.psGanados,
    fechaAprobacion: h.fechaAprobacion,
    sesionId,
  });
}
