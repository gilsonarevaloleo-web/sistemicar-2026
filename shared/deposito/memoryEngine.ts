/**
 * MemoryEngine — criterio adaptativo del Depósito v2.
 *
 * Sintetiza hallazgos del operador (estructura > 85/100) y los recuerda
 * para refinar la devolución del Maestro. No sustituye Óptica-Código:
 * actualiza la base de conocimiento del alumno, no las reglas enlatadas.
 *
 * Spec: UserMetacognitionStore · Axiomas Descubiertos.
 */

import type { CodigoObservador, DiagnosticoVolcado } from "./engineConfig.ts";

export const UMBRAL_AXIOMA_ESTRUCTURA = 85;

export const INSTRUCCION_CRITERIO_ADAPTATIVO =
  "Evalúa el volcado de hoy considerando los principios previamente descubiertos por el operador. Si el usuario cae en un automatismo que él mismo ya desmanteló en el pasado, usa sus propios principios y metáforas para la devolución.";

export type CodigoRelacionado = `C${CodigoObservador}`;

export interface AxiomaDescubierto {
  fecha: number;
  codigoRelacionado: CodigoRelacionado;
  principioDescubierto: string;
  metaforaClave: string;
  id?: string;
}

export interface UserMetacognitionStore {
  axiomas: AxiomaDescubierto[];
}

export interface HallazgoMemoria {
  store: UserMetacognitionStore;
  diagnostico: DiagnosticoVolcado;
  axiomaNuevo?: AxiomaDescubierto;
  evolucion: "nuevo" | "refinado" | "sin-cambio";
}

export interface SintesisAxiomaInput {
  volcadoCrudo: string;
  codigoDominante: CodigoObservador;
  densidadEstructural: number;
  principioSugerido?: string;
  metaforaSugerida?: string;
  now?: number;
  id?: string;
}

const MAX_AXIOMAS = 20;
const MAX_POR_CODIGO = 4;
const MIN_PRINCIPIO = 18;
const MAX_PRINCIPIO = 220;
const MAX_METAFORA = 80;
const UMBRAL_DUPLICADO = 0.7;
const UMBRAL_REFINO = 0.55;
const UMBRAL_RESONANCIA = 0.28;

const STOP = new Set([
  "este",
  "esta",
  "esto",
  "para",
  "porque",
  "como",
  "cuando",
  "donde",
  "tiene",
  "tengo",
  "hacer",
  "hace",
  "desde",
  "entre",
  "sobre",
  "hasta",
  "pero",
  "solo",
  "tambien",
  "muy",
  "mas",
  "todo",
  "toda",
  "cada",
  "otro",
  "hoy",
  "ayer",
  "luego",
  "despues",
  "antes",
  "nada",
  "aqui",
  "fue",
  "era",
  "son",
  "ser",
  "hay",
  "sin",
  "con",
  "del",
  "los",
  "las",
  "una",
  "uno",
  "que",
  "por",
]);

export function storeVacio(): UserMetacognitionStore {
  return { axiomas: [] };
}

export function etiquetaCodigoRelacionado(
  codigo: CodigoObservador,
): CodigoRelacionado {
  return `C${codigo}`;
}

export function parseCodigoRelacionado(
  raw: unknown,
): CodigoObservador | undefined {
  if (typeof raw === "number" && raw >= 1 && raw <= 10) {
    return raw as CodigoObservador;
  }
  if (typeof raw !== "string") return undefined;
  const n = Number(raw.trim().replace(/^C/i, ""));
  if (n >= 1 && n <= 10) return n as CodigoObservador;
  return undefined;
}

export function puedeRegistrarAxioma(densidadEstructural: number): boolean {
  return densidadEstructural > UMBRAL_AXIOMA_ESTRUCTURA;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensDe(texto: string): Set<string> {
  const out = new Set<string>();
  for (const t of normalizar(texto).split(" ")) {
    if (t.length >= 4 && !STOP.has(t)) out.add(t);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (b.size === 0) return 0;
  let hit = 0;
  for (const t of b) if (a.has(t)) hit += 1;
  return hit / b.size;
}

function clampFrase(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max);
  const ultimo = corte.lastIndexOf(" ");
  return (ultimo > 24 ? corte.slice(0, ultimo) : corte).trim();
}

export function extraerMetaforaClave(volcadoCrudo: string): string {
  const comillas =
    volcadoCrudo.match(/[«"]([^»"]{4,60})[»"]/) ??
    volcadoCrudo.match(/'([^']{4,60})'/);
  if (comillas?.[1]) return clampFrase(comillas[1], MAX_METAFORA);

  const pastor = volcadoCrudo.match(
    /\bel pastor(?:e?s)?(?:\s+de(?:\s+los)?\s+[\wáéíóúñ]+(?:\s+[\wáéíóúñ]+){0,4})?/i,
  );
  if (pastor) return clampFrase(pastor[0], MAX_METAFORA);

  const como = volcadoCrudo.match(
    /\bcomo (?:un |una |el |la )?([^\n.!?]{6,50})/i,
  );
  if (como) return clampFrase(`como ${como[1]}`, MAX_METAFORA);

  const imagen = volcadoCrudo.match(
    /\b((?:el|la|los|las) (?:pastor|rebaño|máquina|anillo|ojo|matriz|animal(?:es)?|puerta|hilo|botón)(?:\s+\w+){0,4})/i,
  );
  if (imagen) return clampFrase(imagen[1], MAX_METAFORA);

  return "";
}

export function extraerPrincipioDescubierto(
  volcadoCrudo: string,
  codigo: CodigoObservador,
  sugerido?: string,
): string {
  const hint = (sugerido ?? "").trim();
  if (hint.length >= MIN_PRINCIPIO) return clampFrase(hint, MAX_PRINCIPIO);

  const aprendí = volcadoCrudo.match(
    /aprend[ií] que ([^\n.!?]{12,160})/i,
  );
  if (aprendí?.[1]) {
    return clampFrase(
      `En ${etiquetaCodigoRelacionado(codigo)}, ${aprendí[1].trim()}.`,
      MAX_PRINCIPIO,
    );
  }

  const sesgo = volcadoCrudo.match(
    /(?:el )?sesgo[:\s]+([^\n.!?]{12,140})/i,
  );
  const hecho = clampFrase(volcadoCrudo.replace(/\s+/g, " "), 110);
  if (sesgo?.[1]) {
    return clampFrase(
      `En ${etiquetaCodigoRelacionado(codigo)} el operador desmanteló: ${sesgo[1].trim()}. ${hecho}`,
      MAX_PRINCIPIO,
    );
  }
  return clampFrase(
    `En ${etiquetaCodigoRelacionado(codigo)} el volcado nombra una regla de la matriz: ${hecho}`,
    MAX_PRINCIPIO,
  );
}

export function sintetizarAxioma(
  input: SintesisAxiomaInput,
): AxiomaDescubierto | null {
  if (!puedeRegistrarAxioma(input.densidadEstructural)) return null;
  const principio = extraerPrincipioDescubierto(
    input.volcadoCrudo,
    input.codigoDominante,
    input.principioSugerido,
  );
  if (principio.length < MIN_PRINCIPIO) return null;
  const metafora =
    clampFrase(input.metaforaSugerida ?? "", MAX_METAFORA) ||
    extraerMetaforaClave(input.volcadoCrudo) ||
    `C${input.codigoDominante} · hallazgo de estructura`;
  const now = input.now ?? Date.now();
  return {
    id: input.id ?? `ax_${now}_C${input.codigoDominante}`,
    fecha: now,
    codigoRelacionado: etiquetaCodigoRelacionado(input.codigoDominante),
    principioDescubierto: principio,
    metaforaClave: metafora,
  };
}

function esMismoAxioma(a: AxiomaDescubierto, b: AxiomaDescubierto): boolean {
  if (a.codigoRelacionado !== b.codigoRelacionado) return false;
  return (
    jaccard(
      tokensDe(a.principioDescubierto),
      tokensDe(b.principioDescubierto),
    ) >= UMBRAL_DUPLICADO
  );
}

function esRefino(a: AxiomaDescubierto, b: AxiomaDescubierto): boolean {
  if (a.codigoRelacionado !== b.codigoRelacionado) return false;
  const j = jaccard(
    tokensDe(a.principioDescubierto),
    tokensDe(b.principioDescubierto),
  );
  return j >= UMBRAL_REFINO && j < UMBRAL_DUPLICADO;
}

/**
 * Criterio evolutivo: una nueva regla entra; un gemelo se refina;
 * el resto no toca la ley enlatada.
 */
export function actualizarBaseConocimiento(
  store: UserMetacognitionStore,
  candidato: AxiomaDescubierto,
): { store: UserMetacognitionStore; evolucion: HallazgoMemoria["evolucion"] } {
  const axiomas = [...store.axiomas];
  const gemelo = axiomas.find((a) => esMismoAxioma(a, candidato));
  if (gemelo) {
    return { store: { axiomas }, evolucion: "sin-cambio" };
  }
  const refino = axiomas.find((a) => esRefino(a, candidato));
  if (refino) {
    const siguiente = axiomas.map((a) =>
      a.id === refino.id ||
      (a.fecha === refino.fecha &&
        a.principioDescubierto === refino.principioDescubierto)
        ? {
            ...a,
            principioDescubierto: candidato.principioDescubierto,
            metaforaClave: candidato.metaforaClave || a.metaforaClave,
            fecha: candidato.fecha,
          }
        : a,
    );
    return { store: { axiomas: siguiente }, evolucion: "refinado" };
  }

  let siguiente = [...axiomas, candidato];
  const delCodigo = siguiente.filter(
    (a) => a.codigoRelacionado === candidato.codigoRelacionado,
  );
  if (delCodigo.length > MAX_POR_CODIGO) {
    const masViejo = [...delCodigo].sort((a, b) => a.fecha - b.fecha)[0];
    siguiente = siguiente.filter((a) => a !== masViejo);
  }
  if (siguiente.length > MAX_AXIOMAS) {
    const masViejo = [...siguiente]
      .filter((a) => a !== candidato)
      .sort((x, y) => x.fecha - y.fecha)[0];
    siguiente = siguiente.filter((a) => a !== masViejo);
  }
  return { store: { axiomas: siguiente }, evolucion: "nuevo" };
}

export function reconocerNuevaRegla(
  store: UserMetacognitionStore,
  candidato: AxiomaDescubierto,
): boolean {
  return actualizarBaseConocimiento(store, candidato).evolucion === "nuevo";
}

export function axiomasQueResuenan(
  store: UserMetacognitionStore,
  volcadoCrudo: string,
): AxiomaDescubierto[] {
  return store.axiomas
    .map((a) => ({
      axioma: a,
      r: overlap(
        tokensDe(volcadoCrudo),
        tokensDe(`${a.principioDescubierto} ${a.metaforaClave}`),
      ),
    }))
    .filter((x) => x.r >= UMBRAL_RESONANCIA)
    .sort((a, b) => b.r - a.r)
    .map((x) => x.axioma);
}

export function bloqueInyeccionMaestro(
  store: UserMetacognitionStore,
): string {
  const lineas = [
    "═══ CRITERIO ADAPTATIVO — AXIOMAS DEL OPERADOR ═══",
    INSTRUCCION_CRITERIO_ADAPTATIVO,
    "Prohibido inventar un axioma que el operador no descubrió. La ley (Óptica-Código) no se diluye.",
  ];
  if (store.axiomas.length === 0) {
    lineas.push("UserMetacognitionStore vacío. Sin principios previos.");
    return lineas.join("\n");
  }
  lineas.push("Principios previamente descubiertos:");
  for (const a of store.axiomas.slice(0, MAX_AXIOMAS)) {
    lineas.push(
      `- ${a.codigoRelacionado}: ${a.principioDescubierto} (metáfora: ${a.metaforaClave})`,
    );
  }
  return lineas.join("\n");
}

export function citarAxiomasEnDevolucion(
  devolucion: string,
  axiomas: readonly AxiomaDescubierto[],
  tope = 1200,
): string {
  if (axiomas.length === 0) return devolucion;
  if (/axioma del operador|principio que ya desmantel/i.test(devolucion)) {
    return devolucion;
  }
  const a = axiomas[0];
  const texto = `${devolucion} Axioma del operador (${a.codigoRelacionado}): ${a.principioDescubierto} Metáfora: ${a.metaforaClave}.`;
  return texto.length <= tope ? texto : texto.slice(0, tope).trim();
}

export function isAxiomaDescubierto(
  value: unknown,
): value is AxiomaDescubierto {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    parseCodigoRelacionado(v.codigoRelacionado ?? v.codigo) !== undefined &&
    typeof (v.principioDescubierto ?? v.principio) === "string" &&
    String(v.principioDescubierto ?? v.principio).trim().length >= 8
  );
}

export function normalizarAxioma(raw: unknown): AxiomaDescubierto | null {
  if (!isAxiomaDescubierto(raw)) return null;
  const v = raw as Record<string, unknown>;
  const codigo = parseCodigoRelacionado(v.codigoRelacionado ?? v.codigo);
  if (!codigo) return null;
  const principio = String(v.principioDescubierto ?? v.principio).trim();
  if (principio.length < MIN_PRINCIPIO) return null;
  return {
    id: typeof v.id === "string" ? v.id : undefined,
    fecha: Number(v.fecha) || Date.now(),
    codigoRelacionado: etiquetaCodigoRelacionado(codigo),
    principioDescubierto: clampFrase(principio, MAX_PRINCIPIO),
    metaforaClave: clampFrase(
      String(v.metaforaClave ?? v.metafora ?? ""),
      MAX_METAFORA,
    ),
  };
}

export function normalizarStore(
  raw: unknown,
): UserMetacognitionStore {
  if (!raw) return storeVacio();
  const lista = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as UserMetacognitionStore).axiomas)
      ? (raw as UserMetacognitionStore).axiomas
      : [];
  const axiomas: AxiomaDescubierto[] = [];
  for (const item of lista) {
    const a = normalizarAxioma(item);
    if (a) axiomas.push(a);
  }
  return { axiomas: axiomas.slice(0, MAX_AXIOMAS) };
}

export function absorberHallazgo(input: {
  store: UserMetacognitionStore;
  diagnostico: DiagnosticoVolcado;
  volcadoCrudo: string;
  principioSugerido?: string;
  metaforaSugerida?: string;
  now?: number;
}): HallazgoMemoria {
  const store = normalizarStore(input.store);
  const resonantes = axiomasQueResuenan(store, input.volcadoCrudo);
  let diagnostico: DiagnosticoVolcado = {
    ...input.diagnostico,
    devolucionMaestro: citarAxiomasEnDevolucion(
      input.diagnostico.devolucionMaestro,
      resonantes,
    ),
  };

  const densidad = diagnostico.metricasMerito?.densidadEstructural ?? 0;
  const candidato = sintetizarAxioma({
    volcadoCrudo: input.volcadoCrudo,
    codigoDominante: diagnostico.codigoDominante,
    densidadEstructural: densidad,
    principioSugerido:
      input.principioSugerido ?? diagnostico.axiomaDescubierto?.principioDescubierto,
    metaforaSugerida:
      input.metaforaSugerida ?? diagnostico.axiomaDescubierto?.metaforaClave,
    now: input.now,
  });

  if (!candidato) {
    return { store, diagnostico, evolucion: "sin-cambio" };
  }

  const { store: siguiente, evolucion } = actualizarBaseConocimiento(
    store,
    candidato,
  );
  diagnostico = {
    ...diagnostico,
    axiomaDescubierto: candidato,
  };
  return {
    store: siguiente,
    diagnostico,
    axiomaNuevo: evolucion === "nuevo" ? candidato : undefined,
    evolucion,
  };
}
