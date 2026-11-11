/**
 * Motor local de La Casa 6: Umbral.
 * Canal (C1–C10) ≠ intento (piso) ≠ tipo.
 * C8–C10 se nombran; el asiento que se le dice es C1–C7.
 */

import { detectarModuloGimnasio } from "../gimnasio6/oferta.ts";
import { CASA_UMBRAL5_FIRMA } from "./prompt.ts";
import {
  CODIGOS_LIMITE,
  DICCIONARIO_LIMITES,
  asientoDeCanal,
  type CodigoLimite,
  type PoloLimite,
} from "./diccionarioLimites.ts";
import {
  CODIGOS_USUARIO,
  type CodigoUsuario,
  type ModuloGimnasioOferta,
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

function hits(norm: string, pats: readonly RegExp[]): number {
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

export function isCodigoLimite(value: unknown): value is CodigoLimite {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (CODIGOS_LIMITE as readonly number[]).includes(value)
  );
}

export function parseCodigoLimite(value: unknown): CodigoLimite | null {
  if (isCodigoLimite(value)) return value;
  if (typeof value === "string") {
    const m = value.trim().match(/^(?:C\s*)?([1-9]|10)$/i);
    if (!m) return null;
    const n = Number(m[1]);
    if (isCodigoLimite(n)) return n;
  }
  if (typeof value === "number" && value === 10) return 10;
  return null;
}

export function parseCodigoUsuario(value: unknown): CodigoUsuario | null {
  if (isCodigoUsuario(value)) return value;
  if (typeof value === "string") {
    const m = value.trim().match(/^(?:C\s*)?([1-7])$/i);
    if (!m) return null;
    const n = Number(m[1]);
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

export function detectarCanal(limite: string): {
  codigoLimite: CodigoLimite;
  polo: PoloLimite;
} {
  const norm = normalizar(limite);
  let bestContra: CodigoLimite | null = null;
  let maxContra = 0;
  let bestPro: CodigoLimite | null = null;
  let maxPro = 0;
  for (const n of CODIGOS_LIMITE) {
    const entrada = DICCIONARIO_LIMITES[n];
    const contra = hits(norm, entrada.marcasContra);
    const pro = hits(norm, entrada.marcasPro);
    if (contra > maxContra) {
      maxContra = contra;
      bestContra = n;
    }
    if (pro > maxPro) {
      maxPro = pro;
      bestPro = n;
    }
  }
  if (bestContra && maxContra > 0) {
    return { codigoLimite: bestContra, polo: "contra" };
  }
  if (bestPro && maxPro > 0) {
    return { codigoLimite: bestPro, polo: "pro" };
  }
  return { codigoLimite: 1, polo: "contra" };
}

export function esQuejaEspejo(limite: string): boolean {
  const norm = normalizar(limite);
  if (hits(norm, QUEJA_ESPEJO) === 0) return false;
  const canal = detectarCanal(limite);
  const canalMarcado =
    canal.codigoLimite !== 1 ||
    hits(norm, DICCIONARIO_LIMITES[1].marcasContra) +
      hits(norm, DICCIONARIO_LIMITES[1].marcasPro) +
      hits(norm, DICCIONARIO_LIMITES[2].marcasContra) >
      0;
  if (canalMarcado && canal.codigoLimite !== 1) return false;
  if (hits(norm, DICCIONARIO_LIMITES[2].marcasContra) > 0) return false;
  return hits(norm, MARCAS_C1) === 0 && hits(norm, MARCAS_C2) === 0 && hits(norm, MARCAS_C3) === 0;
}

function moduloDeCanal(
  canal: CodigoLimite,
  polo: PoloLimite,
  limite: string,
): ModuloGimnasioOferta {
  if (esQuejaEspejo(limite)) return null;
  if (canal === 2 && polo === "contra") return "social_producto";
  return detectarModuloGimnasio(limite) === "social_producto" && canal === 2
    ? "social_producto"
    : null;
}

function lecturaDelCanal(
  canal: CodigoLimite,
  polo: PoloLimite,
  piso: PisoIntento,
  tipo: TipoLimite | null,
): string {
  const entrada = DICCIONARIO_LIMITES[canal];
  const poloTxt = polo === "pro" ? entrada.pro : entrada.contra;
  const tipoTxt = tipo
    ? tipo === "impronta"
      ? " El tipo es impronta: se nombra, no se habita el 10."
      : ` Tipo: ${tipo}.`
    : "";
  const intentoTxt =
    piso === 1
      ? " Intento: lo sé, no actué."
      : piso === 2
        ? " Intento: lo hablé con el alrededor."
        : " Intento: trabajé y no se mueve.";
  const asiento = asientoDeCanal(canal);
  const asientoTxt =
    canal >= 8
      ? ` Se nombra C${canal}. El asiento es C${asiento}.`
      : ` El asiento es C${asiento}.`;
  return `Canal C${canal} ${entrada.nombre}. ${poloTxt}${asientoTxt}${intentoTxt}${tipoTxt}`;
}

function porqueDelCanal(canal: CodigoLimite, polo: PoloLimite, piso: PisoIntento): string {
  const entrada = DICCIONARIO_LIMITES[canal];
  if (polo === "contra") return entrada.contra;
  if (piso === 1) return "Solo hay saber. Cero acto.";
  if (piso === 2) return "La palabra del círculo no lo movió.";
  return "El trabajo propio no lo modificó.";
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
  const polo: PoloLimite = lectura.polo === "pro" ? "pro" : "contra";
  let canal = lectura.codigoLimite;
  if (!isCodigoLimite(canal)) {
    canal = isCodigoUsuario(lectura.codigoUsuario)
      ? (lectura.codigoUsuario as CodigoLimite)
      : 1;
  }
  const asiento = asientoDeCanal(canal);
  return {
    codigoLimite: canal,
    polo,
    codigoUsuario: asiento,
    pisoIntento: piso,
    tipoLimite: tipo,
    lecturaFria: lectura.lecturaFria.trim(),
    porQueNoEjecuta: lectura.porQueNoEjecuta.trim(),
    moduloGimnasio:
      lectura.moduloGimnasio === "social_producto" ? "social_producto" : null,
  };
}

export function diagnosticarUmbral5Local(input: Umbral5Input): Umbral5Lectura {
  const texto = input.limiteConocido?.trim() ?? "";
  if (!texto) {
    return {
      codigoLimite: 1,
      polo: "contra",
      codigoUsuario: 1,
      pisoIntento: 1,
      tipoLimite: null,
      lecturaFria: `${CASA_UMBRAL5_FIRMA} Sin límite escrito no hay asiento.`,
      porQueNoEjecuta: "No hay volcado.",
      moduloGimnasio: null,
    };
  }
  const piso = detectarPisoIntento(texto);
  const tipo = detectarTipoLimite(texto);
  const { codigoLimite, polo } = detectarCanal(texto);

  if (esQuejaEspejo(texto)) {
    return sellarLectura({
      codigoLimite: 1,
      polo: "contra",
      codigoUsuario: 1,
      pisoIntento: 1,
      tipoLimite: null,
      lecturaFria:
        "Eso es mancha o queja. Pertenece al Espejo, no a esta casa. C1 no se gana por autoestima. C1 es identidad, no el cuerpo.",
      porQueNoEjecuta: "No hay límite ya nombrado. Hay queja.",
      moduloGimnasio: null,
    });
  }

  return sellarLectura({
    codigoLimite,
    polo,
    codigoUsuario: asientoDeCanal(codigoLimite),
    pisoIntento: piso,
    tipoLimite: tipo,
    lecturaFria: lecturaDelCanal(codigoLimite, polo, piso, tipo),
    porQueNoEjecuta: porqueDelCanal(codigoLimite, polo, piso),
    moduloGimnasio: moduloDeCanal(codigoLimite, polo, texto),
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
  let canal = parseCodigoLimite(o.codigoLimite);
  if (!canal) {
    const rawAsiento = o.codigoUsuario;
    const n =
      typeof rawAsiento === "number"
        ? rawAsiento
        : typeof rawAsiento === "string"
          ? Number(String(rawAsiento).replace(/^C/i, "").trim())
          : NaN;
    if (n >= 1 && n <= 10) canal = n as CodigoLimite;
  }
  if (!canal) {
    return { ok: false, error: "codigoLimite debe ser 1 a 10." };
  }
  const pisoRaw = parseCodigoUsuario(o.pisoIntento);
  const piso: PisoIntento = pisoRaw === 2 || pisoRaw === 3 ? pisoRaw : 1;
  const tipoRaw = o.tipoLimite;
  const tipo: TipoLimite | null =
    tipoRaw === "opinion" ||
    tipoRaw === "creencia" ||
    tipoRaw === "conviccion" ||
    tipoRaw === "impronta"
      ? tipoRaw
      : null;
  const polo: PoloLimite = o.polo === "pro" ? "pro" : "contra";
  const lectura = trimText(o.lecturaFria);
  const porque = trimText(o.porQueNoEjecuta);
  if (!lectura || !porque) {
    return { ok: false, error: "Faltan campos de texto de la lectura." };
  }
  const moduloRaw = o.moduloGimnasio;
  const modulo: ModuloGimnasioOferta =
    moduloRaw === "social_producto" ? "social_producto" : null;
  return {
    ok: true,
    result: sellarLectura({
      codigoLimite: canal,
      polo,
      codigoUsuario: asientoDeCanal(canal),
      pisoIntento: piso,
      tipoLimite: tipo,
      lecturaFria: lectura,
      porQueNoEjecuta: porque,
      moduloGimnasio: modulo,
    }),
  };
}

export function adjuntarModuloGimnasio(
  lectura: Umbral5Lectura,
  limite: string,
): Umbral5Lectura {
  if (esQuejaEspejo(limite) && /queja/i.test(lectura.porQueNoEjecuta)) {
    return { ...lectura, moduloGimnasio: null };
  }
  return {
    ...lectura,
    moduloGimnasio: moduloDeCanal(lectura.codigoLimite, lectura.polo, limite),
  };
}

export function evaluarUmbral5(input: Umbral5Input): Umbral5Lectura {
  return diagnosticarUmbral5Local(input);
}
