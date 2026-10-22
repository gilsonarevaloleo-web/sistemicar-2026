/**
 * Motor local de La Casa 5: Umbral.
 * Clasifica intento (C1–C3) y tipo. Nunca sienta C8–C10.
 */

import { CASA_UMBRAL5_FIRMA } from "./prompt.ts";
import {
  CODIGOS_USUARIO,
  type CodigoUsuario,
  type PisoIntento,
  type TipoLimite,
  type Umbral5Input,
  type Umbral5Lectura,
  type Umbral5ParseResult,
} from "./types.ts";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const MARCAS_C1 = [
  /\bno hice nada\b/,
  /\bno hice nada todavia\b/,
  /\bsolo lo se\b/,
  /\bya lo se\b/,
  /\bno actu[eé]\b/,
  /\bno movi\b/,
  /\btodavia no hice\b/,
  /\bno di un paso\b/,
  /\bcero acto\b/,
];

const MARCAS_C2 = [
  /\bhabl[eé]\b/,
  /\ble cont[eé]\b/,
  /\ble dije\b/,
  /\balrededor\b/,
  /\ba mi familia\b/,
  /\ba mis amigos\b/,
  /\bpedi consejo\b/,
  /\bpregunte a\b/,
  /\bbuscando solucion\b/,
];

const MARCAS_C3 = [
  /\btrabaj[eé] (en|el|mi)\b/,
  /\blo intent[eé]\b/,
  /\bpractiqu[eé]\b/,
  /\bno se modifica\b/,
  /\bno lo consigo\b/,
  /\bno lo modifico\b/,
  /\bejercit[eé]\b/,
  /\btrabaj[eé] yo mismo\b/,
];

const MARCAS_OPINION = [
  /\bme parece\b/,
  /\bopino\b/,
  /\bcreo que todavia\b/,
  /\bcreo que no es el mes\b/,
  /\bno es el momento\b/,
  /\bcon otra app\b/,
  /\bsi bajo el precio\b/,
];

const MARCAS_CREENCIA = [
  /\basi es\b/,
  /\bsiempre es asi\b/,
  /\bes verdad que\b/,
  /\basi son las cosas\b/,
  /\bel medio dice\b/,
  /\base se vive\b/,
];

const MARCAS_CONVICCION = [
  /\byo no soy\b/,
  /\basi me paro\b/,
  /\buno no cobra\b/,
  /\bhasta merecerlo\b/,
  /\bpedir es soberbia\b/,
  /\bno soy vendedor\b/,
  /\bprimero el trabajo\b/,
  /\bel dinero viene solo\b/,
];

const MARCAS_IMPRONTA = [
  /\bimpronta\b/,
  /\bestampad[ao]\b/,
  /\bde cuna\b/,
  /\bdesde chico\b/,
  /\bdesde nino\b/,
  /\bsiempre fui\b/,
  /\bno se discute\b/,
  /\besta clavado\b/,
];

const QUEJA_ESPEJO = [
  /\bbaja autoestima\b/,
  /\bno valgo\b/,
  /\btengo miedo\b/,
  /\bme da verguenza\b/,
  /\bme quejo\b/,
];

function hits(norm: string, pats: RegExp[]): number {
  let n = 0;
  for (const p of pats) if (p.test(norm)) n += 1;
  return n;
}

export function isCodigoUsuario(value: unknown): value is CodigoUsuario {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (CODIGOS_USUARIO as readonly number[]).includes(value)
  );
}

export function parseCodigoUsuario(value: unknown): CodigoUsuario | null {
  if (isCodigoUsuario(value)) return value;
  if (typeof value === "string") {
    const m = value.trim().match(/^(?:C\s*)?([1-7])$/i);
    if (!m) return null;
    const n = Number(m[1]);
    if (n === 4) return null;
    if (isCodigoUsuario(n)) return n;
  }
  return null;
}

export function detectarPisoIntento(limite: string): PisoIntento {
  const norm = normalizar(limite);
  const c3 = hits(norm, MARCAS_C3);
  const c2 = hits(norm, MARCAS_C2);
  const c1 = hits(norm, MARCAS_C1);
  if (c3 > 0 && c3 >= c2 && c3 >= c1) return 3;
  if (c2 > 0 && c2 >= c1) return 2;
  if (c1 > 0) return 1;
  return 1;
}

export function detectarTipoLimite(limite: string): TipoLimite | null {
  const norm = normalizar(limite);
  const scores: Record<TipoLimite, number> = {
    opinion: hits(norm, MARCAS_OPINION),
    creencia: hits(norm, MARCAS_CREENCIA),
    conviccion: hits(norm, MARCAS_CONVICCION),
    impronta: hits(norm, MARCAS_IMPRONTA),
  };
  let best: TipoLimite | null = null;
  let max = 0;
  for (const t of ["impronta", "conviccion", "creencia", "opinion"] as const) {
    if (scores[t] > max) {
      max = scores[t];
      best = t;
    }
  }
  return max > 0 ? best : null;
}

export function esQuejaEspejo(limite: string): boolean {
  const norm = normalizar(limite);
  if (hits(norm, QUEJA_ESPEJO) === 0) return false;
  return hits(norm, MARCAS_C1) === 0 && hits(norm, MARCAS_C2) === 0 && hits(norm, MARCAS_C3) === 0;
}

function asientoDe(
  piso: PisoIntento,
  tipo: TipoLimite | null,
  hayIntentoClaro: boolean,
): CodigoUsuario {
  if (hayIntentoClaro) return piso;
  if (tipo === "opinion") return 5;
  if (tipo === "creencia") return 6;
  if (tipo === "conviccion" || tipo === "impronta") return 7;
  return piso;
}

export function sellarLectura(lectura: Umbral5Lectura): Umbral5Lectura {
  const piso = (lectura.pisoIntento === 2 || lectura.pisoIntento === 3
    ? lectura.pisoIntento
    : 1) as PisoIntento;
  const tipo: TipoLimite | null =
    lectura.tipoLimite === "opinion" ||
    lectura.tipoLimite === "creencia" ||
    lectura.tipoLimite === "conviccion" ||
    lectura.tipoLimite === "impronta"
      ? lectura.tipoLimite
      : null;
  let codigo = lectura.codigoUsuario;
  if (!isCodigoUsuario(codigo)) {
    codigo = asientoDe(piso, tipo, true);
  }
  return {
    codigoUsuario: codigo,
    pisoIntento: piso,
    tipoLimite: tipo,
    lecturaFria: lectura.lecturaFria.trim(),
    porQueNoEjecuta: lectura.porQueNoEjecuta.trim(),
  };
}

export function lecturaDelPiso(piso: PisoIntento, tipo: TipoLimite | null): string {
  const tipoTxt = tipo
    ? tipo === "impronta"
      ? " El tipo es impronta: se nombra, no se habita el 10."
      : ` Tipo: ${tipo}.`
    : "";
  if (piso === 1) return `Lo sabés. No hiciste nada. El asiento es C1.${tipoTxt}`;
  if (piso === 2) return `Lo hablaste con el alrededor. El asiento es C2.${tipoTxt}`;
  return `Trabajaste el límite y no se mueve. El asiento es C3.${tipoTxt}`;
}

export function porqueDelPiso(piso: PisoIntento): string {
  if (piso === 1) return "Solo hay saber. Cero acto.";
  if (piso === 2) return "La palabra del círculo no lo movió.";
  return "El trabajo propio no lo modificó.";
}

function lecturaDelAsiento(
  codigo: CodigoUsuario,
  piso: PisoIntento,
  tipo: TipoLimite | null,
  hayIntentoClaro: boolean,
): string {
  if (hayIntentoClaro || codigo === 1 || codigo === 2 || codigo === 3) {
    return lecturaDelPiso(piso, tipo);
  }
  if (codigo === 5) return "El tipo es opinión. El asiento es C5.";
  if (codigo === 6) return "El tipo es creencia. El asiento es C6.";
  if (tipo === "impronta") {
    return "El tipo es impronta. Se nombra. El asiento es C7. No se habita el 10.";
  }
  return "El tipo es convicción. El asiento es C7.";
}

function porqueDelAsiento(
  codigo: CodigoUsuario,
  piso: PisoIntento,
  tipo: TipoLimite | null,
  hayIntentoClaro: boolean,
): string {
  if (hayIntentoClaro || codigo === 1 || codigo === 2 || codigo === 3) {
    return porqueDelPiso(piso);
  }
  if (codigo === 5) return "Es opinión. Se mueve con un hecho.";
  if (codigo === 6) return "Lo da por verdadero. El medio lo sostiene.";
  if (tipo === "impronta") return "Está estampada. El origen no se habita.";
  return "Vive desde ahí. No se discute.";
}

export function diagnosticarUmbral5Local(input: Umbral5Input): Umbral5Lectura {
  const texto = input.limiteConocido?.trim() ?? "";
  if (!texto) {
    return {
      codigoUsuario: 1,
      pisoIntento: 1,
      tipoLimite: null,
      lecturaFria: `${CASA_UMBRAL5_FIRMA} Sin límite escrito no hay asiento.`,
      porQueNoEjecuta: "No hay volcado.",
    };
  }
  const piso = detectarPisoIntento(texto);
  const tipo = detectarTipoLimite(texto);
  const norm = normalizar(texto);
  const hayIntentoClaro =
    hits(norm, MARCAS_C1) + hits(norm, MARCAS_C2) + hits(norm, MARCAS_C3) > 0;
  const codigo = asientoDe(piso, tipo, hayIntentoClaro);

  if (esQuejaEspejo(texto) && !hayIntentoClaro && !tipo) {
    return sellarLectura({
      codigoUsuario: 1,
      pisoIntento: 1,
      tipoLimite: null,
      lecturaFria:
        "Eso es mancha o queja. Pertenece al Espejo, no a esta casa. C1 no se gana por autoestima.",
      porQueNoEjecuta: "No hay límite ya nombrado. Hay queja.",
    });
  }

  return sellarLectura({
    codigoUsuario: codigo,
    pisoIntento: piso,
    tipoLimite: tipo,
    lecturaFria: lecturaDelAsiento(codigo, piso, tipo, hayIntentoClaro),
    porQueNoEjecuta: porqueDelAsiento(codigo, piso, tipo, hayIntentoClaro),
  });
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseUmbral5Lectura(raw: unknown): Umbral5ParseResult {
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
    return { ok: false, error: "La lectura no es un objeto." };
  }
  const o = data as Record<string, unknown>;
  const codigo = parseCodigoUsuario(o.codigoUsuario);
  const pisoRaw = parseCodigoUsuario(o.pisoIntento);
  const piso: PisoIntento =
    pisoRaw === 2 || pisoRaw === 3 ? pisoRaw : 1;
  const tipoRaw = o.tipoLimite;
  const tipo: TipoLimite | null =
    tipoRaw === "opinion" ||
    tipoRaw === "creencia" ||
    tipoRaw === "conviccion" ||
    tipoRaw === "impronta"
      ? tipoRaw
      : tipoRaw === null || tipoRaw === "null" || tipoRaw === ""
        ? null
        : null;
  const lectura = trimText(o.lecturaFria);
  const porque = trimText(o.porQueNoEjecuta);
  if (!codigo) {
    return { ok: false, error: "codigoUsuario debe ser 1, 2, 3, 5, 6 o 7." };
  }
  if (!lectura || !porque) {
    return { ok: false, error: "Faltan campos de texto de la lectura." };
  }
  return {
    ok: true,
    result: sellarLectura({
      codigoUsuario: codigo,
      pisoIntento: piso,
      tipoLimite: tipo,
      lecturaFria: lectura,
      porQueNoEjecuta: porque,
    }),
  };
}

export function evaluarUmbral5(input: Umbral5Input): Umbral5Lectura {
  return diagnosticarUmbral5Local(input);
}
