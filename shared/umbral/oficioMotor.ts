/**
 * Motor local de La Casa 5: Oficio.
 * Lee el saber del deber. Fija un código de la matriz del 5.
 * No sienta límite. No nombra mancha. El recurso legal es el cálculo.
 */

import { DICCIONARIO_CODIGOS, isCodigoNumero, type CodigoNumero } from "./engineConfig.ts";
import {
  CASA_OFICIO_FIRMA,
  CASA_OFICIO_PERIMETRO,
  CASA_OFICIO_PROHIBIDO,
  CASA_OFICIO_RECURSO,
  fichaMatrizOficio,
} from "./oficioCasa.ts";

export const PROMPT_OFICIO_MOTOR =
  "Lees el saber del deber. Fijas UN código de la matriz Oficio (C1 Claridad … C5 Cálculo … C10 Dominio). No enseñes límite. No mandes al Juez. No consueles. No mandes al 6. Tecnología legal: número, tasa, casuística, cobro, cuenta. C5 Oficio es Cálculo, no Decisión.";

export type ContrabandoOficio = "limite" | "mancha" | "aula" | "dia" | null;

export interface OficioLectura {
  codigo: CodigoNumero;
  marca: string;
  nombre: string;
  huecos: string[];
  lecturaFria: string;
  recurso: string;
  prohibido: string;
  perimetro: string;
  contrabando: ContrabandoOficio;
  firma: string;
}

export interface SesionOficio {
  id: string;
  userId: string;
  textoVolcado: string;
  lectura: OficioLectura;
  createdAt: string;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hits(norm: string, pats: RegExp[]): number {
  let n = 0;
  for (const p of pats) if (p.test(norm)) n += 1;
  return n;
}

const HAY_NUMERO = /\d|\$|s\/\s*\d|%\b/;

const MARCAS: Record<CodigoNumero, RegExp[]> = {
  1: [
    /\bexcusa\b/,
    /\butilidad\b/,
    /\bpara que (me |le )?sirve\b/,
    /\bno se (que|qué) cerrar\b/,
    /\bniebla\b/,
    /\batencion\b/,
    /\bclaridad\b/,
  ],
  2: [
    /\bnadie me ayuda\b/,
    /\bsolo estoy\b/,
    /\bya tengo\b/,
    /\bno doy para mas\b/,
    /\bapalanc\b/,
    /\bsaturad\b/,
    /\bsin respaldo\b/,
  ],
  3: [
    /\bno tengo tiempo\b/,
    /\bdespues lo veo\b/,
    /\bposterg\b/,
    /\bocupad[oa]\b/,
    /\blaborios\b/,
    /\bse me va el dia\b/,
    /\bapago incendios\b/,
  ],
  4: [
    /\bme han enganado\b/,
    /\bno confio\b/,
    /\bhumo\b/,
    /\bfloritura\b/,
    /\bcero flor\b/,
    /\bsuena (bonito|lindo)\b/,
    /\bseriedad\b/,
  ],
  5: [
    /\bno (tengo|se) (los )?numeros\b/,
    /\bsin (numero|cuenta|cifra|metrica)\b/,
    /\bno se cuanto\b/,
    /\bsiento que va\b/,
    /\bcalculo\b/,
    /\bestadistic\b/,
    /\bcasuistic\b/,
    /\bsin cuenta\b/,
    /\bno cuantific\b/,
  ],
  6: [
    /\bmiedo al rechazo\b/,
    /\bansiedad\b/,
    /\bno quiero complicarme\b/,
    /\broce\b/,
    /\bno (llamo|salgo|me expongo)\b/,
    /\bme da miedo\b/,
  ],
  7: [
    /\bculpa (de |al |por )?cobr/,
    /\bcobrar me\b/,
    /\bpedir (precio|plata) es\b/,
    /\besta caro\b/,
    /\bno es justo\b/,
    /\bno merezco cobr/,
    /\bsoberbia\b/,
    /\bvalia que no se cobra\b/,
    /\bfavor salio sin cuenta\b/,
  ],
  8: [
    /\babandon\b/,
    /\bdesgaste\b/,
    /\blo tengo que pensar\b/,
    /\bno persisto\b/,
    /\barranco y (paro|caigo)\b/,
    /\bestrategia\b/,
  ],
  9: [
    /\bno es sistema\b/,
    /\bno tengo rutina\b/,
    /\bse cae al mes\b/,
    /\bevento heroic\b/,
    /\bno integra\b/,
    /\bsin circuito\b/,
  ],
  10: [
    /\bno soy (el |la )?(dueno|operador|quien)\b/,
    /\bsigo de aprendiz\b/,
    /\bno asumo el rol\b/,
    /\bidentidad vieja\b/,
    /\bno es mi oficio todavia\b/,
  ],
};

const MARCAS_LIMITE = [
  /\bmi limite\b/,
  /\bcual es tu limite\b/,
  /\bno hice nada\b/,
  /\bel cuerpo niega\b/,
  /\bgimnasio\b/,
];

const MARCAS_MANCHA = [
  /\bme quejo\b/,
  /\bbaja autoestima\b/,
  /\bno valgo\b/,
  /\bla mancha\b/,
  /\bculpa emocional\b/,
];

const MARCAS_AULA = [/\baprendi hoy\b/, /\bclase\b/, /\buniversidad\b/];
const MARCAS_DIA = [/\bcerrar el dia\b/, /\bunidades cerradas\b/, /\bjornada base\b/];

const OFICIO_HECHO = [
  /\boficio\b/,
  /\bdeber\b/,
  /\bresponsabilidad\b/,
  /\bentrego\b/,
  /\btrabajo\b/,
  /\bpieza\b/,
  /\bfavor\b/,
  /\bcobrar\b/,
  /\bcliente\b/,
  /\bservicio\b/,
];

function detectarContrabando(norm: string): ContrabandoOficio {
  if (hits(norm, MARCAS_LIMITE) > 0) return "limite";
  if (hits(norm, MARCAS_MANCHA) > 0) return "mancha";
  if (hits(norm, MARCAS_AULA) > 0) return "aula";
  if (hits(norm, MARCAS_DIA) > 0) return "dia";
  return null;
}

function detectarHuecos(norm: string, codigo: CodigoNumero): string[] {
  const huecos: string[] = [];
  const conNumero = HAY_NUMERO.test(norm);
  if (!conNumero) {
    huecos.push("No hay número: el oficio habló sin cuenta.");
  }
  if (/\b(precio|cobr|vale|valia|tarifa)\b/.test(norm) && !conNumero) {
    huecos.push("Hay cobro o precio sin cifra.");
  }
  if (/\b(hora|tiempo|dia|minuto)\b/.test(norm) && !/\d/.test(norm)) {
    huecos.push("Hay tiempo sin cantidad.");
  }
  if (/\b(pieza|favor|entrega|servicio)\b/.test(norm) && !/\d/.test(norm)) {
    huecos.push("Hay pieza o favor sin cantidad.");
  }
  if (codigo === 5 && huecos.length === 0) {
    huecos.push(
      "El cálculo pide tasa, casuística o cuenta. La sensación no alcanza.",
    );
  }
  if (huecos.length === 0) {
    huecos.push("El hueco es el recurso que este código aún no cuantifica.");
  }
  return huecos;
}

function elegirCodigo(norm: string): CodigoNumero {
  const scores: Partial<Record<CodigoNumero, number>> = {};
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const) {
    scores[n] = hits(norm, MARCAS[n]);
  }
  const oficio = hits(norm, OFICIO_HECHO);
  const sinNumero = !HAY_NUMERO.test(norm);
  if (oficio > 0 && sinNumero) {
    scores[5] = (scores[5] ?? 0) + 2;
  }
  if ((scores[7] ?? 0) >= 1) {
    scores[7] = (scores[7] ?? 0) + 2;
  }
  let best: CodigoNumero = 5;
  let max = -1;
  for (const n of [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const) {
    const s = scores[n] ?? 0;
    if (s > max) {
      max = s;
      best = n;
    }
  }
  if (max <= 0) return 5;
  return best;
}

function fraseContrabando(c: ContrabandoOficio): string {
  if (c === "limite") {
    return " Eso no se cubre en el 6: el límite no cobra.";
  }
  if (c === "mancha") {
    return " Eso no se nombra en el Espejo: aquí el acto es la cuenta.";
  }
  if (c === "aula") {
    return " El Depósito no perfecciona el deber.";
  }
  if (c === "dia") {
    return " La Jornada cierra el día; aquí se cobra el oficio.";
  }
  return "";
}

export function diagnosticarOficioLocal(texto: string): OficioLectura {
  const crudo = texto.trim();
  const norm = normalizar(crudo);
  const codigo = elegirCodigo(norm);
  const ficha = fichaMatrizOficio(codigo);
  const huecos = detectarHuecos(norm, codigo);
  const contrabando = detectarContrabando(norm);
  const lecturaFria =
    `Hablas C${codigo} Oficio · ${ficha.marca}. ${huecos[0]} El recurso legal es el cálculo, no el límite.${fraseContrabando(contrabando)}`.trim();

  return sellarLecturaOficio({
    codigo,
    marca: ficha.marca,
    nombre: DICCIONARIO_CODIGOS[codigo].nombre,
    huecos,
    lecturaFria,
    recurso: CASA_OFICIO_RECURSO,
    prohibido: CASA_OFICIO_PROHIBIDO,
    perimetro: CASA_OFICIO_PERIMETRO,
    contrabando,
    firma: CASA_OFICIO_FIRMA,
  });
}

export function sellarLecturaOficio(lectura: OficioLectura): OficioLectura {
  const codigo = isCodigoNumero(lectura.codigo) ? lectura.codigo : 5;
  const ficha = fichaMatrizOficio(codigo);
  return {
    ...lectura,
    codigo,
    marca: ficha.marca,
    nombre: DICCIONARIO_CODIGOS[codigo].nombre,
    huecos: lectura.huecos.length ? lectura.huecos : ["El hueco es el recurso que este código aún no cuantifica."],
    lecturaFria: lectura.lecturaFria.trim() || `Hablas C${codigo} Oficio · ${ficha.marca}.`,
    recurso: CASA_OFICIO_RECURSO,
    prohibido: CASA_OFICIO_PROHIBIDO,
    perimetro: CASA_OFICIO_PERIMETRO,
    contrabando: lectura.contrabando ?? null,
    firma: CASA_OFICIO_FIRMA,
  };
}
