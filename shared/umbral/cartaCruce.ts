/**
 * Carta de Cruce + piezas de anuncio.
 * Se componen solo con sellos aprobados de una OfertaArena.
 * Sin 10/10 no hay carta lista ni anuncio publicable.
 */

import {
  CODIGOS_NUMERO,
  DICCIONARIO_CODIGOS,
  type CodigoNumero,
} from "./engineConfig.ts";
import {
  anclarTextoAOferta,
  calcularProgresoOferta,
  colapsarEspacios,
  type OfertaArena,
} from "./ofertaArena.ts";

export const CARTA_CRUCE_KICKER = "SISTEMICAR · LA ARENA · CARTA DE CRUCE";

export const SECCIONES_CARTA_CRUCE: Record<
  CodigoNumero,
  { label: string; titulo: string }
> = {
  1: { label: "I · Utilidad", titulo: "Para qué sirve" },
  2: { label: "II · Suma", titulo: "Qué gana encima de lo que ya tiene" },
  3: { label: "III · Primer paso", titulo: "Minutos y acción de empezar" },
  4: { label: "IV · Prueba", titulo: "Evidencia y límite — cero flor" },
  5: { label: "V · Números", titulo: "Costo, retorno o rango honesto" },
  6: { label: "VI · Roce", titulo: "Prueba de bajo miedo" },
  7: { label: "VII · Intercambio", titulo: "Qué sostiene el precio" },
  8: { label: "VIII · Cierre", titulo: "Siguiente paso, sin chase" },
  9: { label: "IX · Continuidad", titulo: "Qué pasa el mes 2" },
  10: { label: "X · Autoridad", titulo: "Por qué tú y qué queda después" },
};

export const ANUNCIOS_CARTA_CRUCE = [1, 4, 5] as const;
export type CodigoAnuncioCruce = (typeof ANUNCIOS_CARTA_CRUCE)[number];

export type EstadoCartaCruce = "BORRADOR" | "LISTA";

export interface BloqueCartaCruce {
  codigo: CodigoNumero;
  label: string;
  titulo: string;
  cuerpo: string | null;
}

export interface PiezaAnuncioArena {
  codigo: CodigoAnuncioCruce;
  arquetipo: string;
  gancho: string;
  objecion: string;
  corte: string;
  textoAnuncio: string;
  lista: boolean;
}

export interface CartaCruce {
  estado: EstadoCartaCruce;
  kicker: string;
  titular: string;
  nombre: string;
  sellosCount: number;
  faltantes: CodigoNumero[];
  bloques: BloqueCartaCruce[];
  sello: string;
  textoPlano: string;
  textoWhatsapp: string;
  anuncios: PiezaAnuncioArena[];
}

export function primeraFrase(texto: string, max = 180): string {
  const t = colapsarEspacios(texto);
  if (!t) return "";
  const m = t.match(/^(.+?[.!?])(\s|$)/);
  const cut = m ? m[1] : t;
  if (cut.length <= max) return cut;
  return `${cut.slice(0, max - 1).trimEnd()}…`;
}

export function componerCartaCruce(oferta: OfertaArena): CartaCruce {
  const progreso = calcularProgresoOferta(oferta);
  const faltantes = CODIGOS_NUMERO.filter((n) => oferta.sellos[n] == null);
  const estado: EstadoCartaCruce =
    progreso.sellosCount >= 10 ? "LISTA" : "BORRADOR";

  const bloques: BloqueCartaCruce[] = CODIGOS_NUMERO.map((n) => {
    const meta = SECCIONES_CARTA_CRUCE[n];
    const cuerpo = oferta.sellos[n]?.respuestaAprobada.trim() || null;
    return {
      codigo: n,
      label: meta.label,
      titulo: meta.titulo,
      cuerpo,
    };
  });

  const titular =
    colapsarEspacios(oferta.fraseUtilidad) ||
    primeraFrase(oferta.sellos[1]?.respuestaAprobada ?? "") ||
    oferta.nombre;

  const sello =
    estado === "LISTA"
      ? "10/10 · La Arena"
      : `${progreso.sellosCount}/10 · borrador`;

  const textoPlano = armarTextoPlano({
    oferta,
    titular,
    bloques,
    sello,
    estado,
    faltantes,
  });
  const textoWhatsapp = armarTextoWhatsapp({
    oferta,
    titular,
    bloques,
    sello,
    estado,
    faltantes,
  });

  return {
    estado,
    kicker: CARTA_CRUCE_KICKER,
    titular,
    nombre: oferta.nombre,
    sellosCount: progreso.sellosCount,
    faltantes,
    bloques,
    sello,
    textoPlano,
    textoWhatsapp,
    anuncios: ANUNCIOS_CARTA_CRUCE.map((n) =>
      componerPiezaAnuncio(oferta, n, titular),
    ),
  };
}

export function cartaCruceEstaLista(carta: CartaCruce): boolean {
  return carta.estado === "LISTA" && carta.faltantes.length === 0;
}

function componerPiezaAnuncio(
  oferta: OfertaArena,
  codigo: CodigoAnuncioCruce,
  titular: string,
): PiezaAnuncioArena {
  const cfg = DICCIONARIO_CODIGOS[codigo];
  const sello = oferta.sellos[codigo];
  const lista = Boolean(sello?.respuestaAprobada.trim());
  const gancho = lista
    ? primeraFrase(sello!.respuestaAprobada)
    : codigo === 1
      ? colapsarEspacios(oferta.fraseUtilidad) || titular
      : "";
  const objecion = anclarTextoAOferta(
    cfg.modoExterno.fraseTipica,
    oferta.nombre,
  );
  const corte = lista ? colapsarEspacios(sello!.respuestaAprobada) : "";
  const textoAnuncio = lista
    ? [
        `${oferta.nombre} · ${cfg.modoExterno.arquetipoNombre}`,
        "",
        gancho,
        "",
        `«${objecion}»`,
        "",
        corte,
      ].join("\n")
    : "";

  return {
    codigo,
    arquetipo: cfg.modoExterno.arquetipoNombre,
    gancho,
    objecion,
    corte,
    textoAnuncio,
    lista,
  };
}

function armarTextoPlano(input: {
  oferta: OfertaArena;
  titular: string;
  bloques: BloqueCartaCruce[];
  sello: string;
  estado: EstadoCartaCruce;
  faltantes: CodigoNumero[];
}): string {
  const lineas = [
    CARTA_CRUCE_KICKER,
    input.oferta.nombre,
    input.titular,
    input.sello,
    "",
  ];
  if (input.estado === "BORRADOR") {
    lineas.push(
      `BORRADOR · faltan C${input.faltantes.join(", C")}. No se publica.`,
      "",
    );
  }
  for (const b of input.bloques) {
    lineas.push(`${b.label} — ${b.titulo}`);
    lineas.push(b.cuerpo ?? `[FALTA C${b.codigo}]`);
    lineas.push("");
  }
  return lineas.join("\n").trim();
}

function armarTextoWhatsapp(input: {
  oferta: OfertaArena;
  titular: string;
  bloques: BloqueCartaCruce[];
  sello: string;
  estado: EstadoCartaCruce;
  faltantes: CodigoNumero[];
}): string {
  const lineas = [
    `*${input.oferta.nombre}* · ${input.sello}`,
    input.titular,
    "",
  ];
  if (input.estado === "BORRADOR") {
    lineas.push(`_Borrador. Faltan C${input.faltantes.join(", C")}._`, "");
  }
  for (const b of input.bloques) {
    lineas.push(`*${b.label}*`);
    lineas.push(b.cuerpo ?? `_Falta C${b.codigo}_`);
    lineas.push("");
  }
  return lineas.join("\n").trim();
}
