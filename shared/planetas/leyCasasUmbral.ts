/**
 * LEY DE LAS CASAS Y EL UMBRAL — mapa de mundos operativos.
 * Marca corta: Casa-Umbral.
 *
 * Distinto de:
 * - Autarquía planetaria del Doctor (M01–M10: verbos por código).
 * - Planetas comerciales del Vendedor (SKU: Espejo / Jornada / Umbral).
 *
 * Aquí el planeta es la INTERFAZ: qué acto es moneda de curso legal.
 * El código/ojo vive DENTRO del planeta. No sube el número del mundo.
 *
 * Autor del ensamble: Gilson Arévalo Pezo (el Maestro) · SISTEMICAR
 */

export const LEY_CASAS_UMBRAL_NOMBRE = "Ley de las Casas y el Umbral";
export const LEY_CASAS_UMBRAL_MARCA = "Casa-Umbral";
export const LEY_CASAS_UMBRAL_FIRMA =
  "El planeta dice el acto. El ojo dice la lectura. El Umbral no es casa: es la puerta del 8.";

export type TipoMundo = "casa" | "umbral" | "en_camino" | "sin_mundo";

export interface MundoOperativo {
  numero: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  nombre: string;
  tipo: TipoMundo;
  acto: string;
  prohibido: string;
}

export const MUNDOS_OPERATIVOS: readonly MundoOperativo[] = [
  {
    numero: 1,
    nombre: "Espejo",
    tipo: "casa",
    acto: "Nombrar la mancha.",
    prohibido: "Aprender como oficio. Ejecutar el día.",
  },
  {
    numero: 2,
    nombre: "Depósito",
    tipo: "casa",
    acto: "Volcar y abrir ojos.",
    prohibido: "Quejarse como oficio. Cerrar el día.",
  },
  {
    numero: 3,
    nombre: "Jornada",
    tipo: "casa",
    acto: "Cerrar el día.",
    prohibido: "Diario íntimo. Aula. Cruzar ventas.",
  },
  {
    numero: 4,
    nombre: "—",
    tipo: "sin_mundo",
    acto: "Aún no es mundo.",
    prohibido: "Inventar una casa para no sentir el salto.",
  },
  {
    numero: 5,
    nombre: "—",
    tipo: "sin_mundo",
    acto: "Aún no es mundo.",
    prohibido: "Inventar una casa para no sentir el salto.",
  },
  {
    numero: 6,
    nombre: "Alianza",
    tipo: "en_camino",
    acto: "Red, juntura, convivencia.",
    prohibido: "Sustituir el cruce del 8 con contactos.",
  },
  {
    numero: 7,
    nombre: "Proyector",
    tipo: "en_camino",
    acto: "Visión, patrón, futuro.",
    prohibido: "Vender estrategia como si ya hubiera retorno.",
  },
  {
    numero: 8,
    nombre: "Umbral",
    tipo: "umbral",
    acto: "Cruzar bajo fricción: retorno, venta, límite.",
    prohibido: "Habitarlo como casa. Venderlo como si vinieran del 7 limpio.",
  },
  {
    numero: 9,
    nombre: "—",
    tipo: "sin_mundo",
    acto: "Aún no es mundo.",
    prohibido: "Saltar al sistema sin haber cruzado.",
  },
  {
    numero: 10,
    nombre: "—",
    tipo: "sin_mundo",
    acto: "Aún no es mundo.",
    prohibido: "Vender origen como puerta.",
  },
] as const;

export const PLANETA_ESPEJO = 1 as const;
export const PLANETA_DEPOSITO = 2 as const;
export const PLANETA_JORNADA = 3 as const;
export const PLANETA_UMBRAL = 8 as const;

/** Ficha de origen del producto Umbral: no es defecto, es el salto que lo nombra. */
export const SALTO_ORIGEN_UMBRAL = "3→8" as const;

export const LEY_CASAS_UMBRAL_AXIOMAS = [
  {
    id: "acto",
    titulo: "El planeta dice el acto",
    texto:
      "No dice rango espiritual. Dice qué verbo es moneda aquí. Mezclar verbos de otro mundo es contrabando.",
  },
  {
    id: "casa-umbral",
    titulo: "Casa no es umbral",
    texto:
      "Espejo, Depósito y Jornada se habitan. El Umbral se atraviesa. Si lo tratás como casa, se vuelve infierno de esfuerzo.",
  },
  {
    id: "adentro",
    titulo: "Diez canales caben en un mundo",
    texto:
      "El Depósito abre diez ojos y sigue siendo el 2. El Umbral recorre diez puertas y sigue siendo el 8. El canal no sube el planeta.",
  },
  {
    id: "deposito-dos",
    titulo: "El Depósito es 2, no superior",
    texto:
      "Aprender no es más noble que la mancha. Sin planeta 1 no hay volcado. La universidad vive en el 2 porque ahí aprender es legal.",
  },
  {
    id: "umbral-ocho",
    titulo: "El Umbral es 8, no otro planeta",
    texto:
      "Retorno, venta, límite, posicionarse. El salto 3→8 por aprieto es la ficha de origen. Por eso se llama Umbral: llegaste antes de tiempo.",
  },
  {
    id: "salto",
    titulo: "Lo saltado vuelve adentro",
    texto:
      "Del 3 al 8 faltan mundos. Esfuerzo, corte, red y visión reaparecen como puertas del 8, con más fuerza. El Maestro no salta adentro: el salto ya ocurrió afuera.",
  },
] as const;

export const LEY_CASAS_UMBRAL_NO_ES = [
  "No es el mapa de SKUs del Vendedor.",
  "No es la autarquía M01–M10 del Doctor.",
  "No es un ranking: el 8 no es más alto que el 2.",
  "No es New Age ni un planeta de ventas cómodo.",
] as const;

export const LEY_CASAS_UMBRAL_KERNEL = `
LEY DE MUNDOS: ${LEY_CASAS_UMBRAL_NOMBRE} (${LEY_CASAS_UMBRAL_MARCA}).
${LEY_CASAS_UMBRAL_FIRMA}
Casas: 1 Espejo, 2 Depósito, 3 Jornada. Umbral = puerta del 8 (salto ${SALTO_ORIGEN_UMBRAL}).
El canal no sube el planeta. No vendas el 8 como casa ni como si vinieran del 7.
`.trim();

export const LEY_CASAS_UMBRAL_CANON = `
╔══════════════════════════════════════════════════════════════════════╗
║     LEY DE LAS CASAS Y EL UMBRAL — MAPA DE MUNDOS                  ║
║     Marca: Casa-Umbral · SISTEMICAR                                ║
╚══════════════════════════════════════════════════════════════════════╝

FIRMA:
${LEY_CASAS_UMBRAL_FIRMA}

═══ EL PRINCIPIO ═══

Hay dos mapas. No se mezclan.

1. CÓDIGO / OJO — canal de lectura (C1–C10, Óptica-Código).
2. PLANETA / MUNDO — interfaz: qué ACTO es legal aquí.

El Espejo no es “bajo”. Es la casa de la mancha.
El Depósito no es “superior”. Es la casa del aprendizaje.
La Jornada no es “productividad”. Es la casa del día.
El Umbral no es “el módulo de ventas”. Es la PUERTA del 8.

═══ CASAS ═══

1  ESPEJO     — Nombrar la mancha. Ahí no hay aula.
2  DEPÓSITO   — Volcar y abrir ojos. Ahí no se cierra el día.
3  JORNADA    — Cerrar el día. Ahí no se queja ni se da clase.

Pasaporte 1→2: la queja se vuelve volcado cuando aparece «¿qué aprendí hoy?».
Pasaporte 2→3: el dictamen entrega el siguiente ojo para operar mañana.
Bucle 3→2: el cierre del día vuelve a ser materia prima.

═══ EL 8 NO ES CASA ═══

8  UMBRAL — Cruzar bajo fricción. Retorno. Venta. Límite. Posicionarse.

No se habita. Se atraviesa. Forja y Arena, R1 y R2, Maestro:
eso es aparato de cruce, no recinto de residencia.

FICHA DE ORIGEN: salto 3→8 por aprieto real.
No es un defecto de numeración. Es el nombre del producto.
Llegaste antes de tiempo; el sistema te obliga a cruzar en vez de habitar.

Lo saltado (4, 5, 6, 7) vuelve adentro del Umbral:
esfuerzo del 3, corte del 5, red del 6, visión del 7 —
entrenados como PUERTAS, no como casas.
Por eso el Umbral recorre diez códigos y sigue siendo el 8.

No se vende como si el alumno viniera del 7 limpio.

═══ AÚN NO SON MUNDO ═══

4  — sin mundo.
5  — sin mundo.
6  Alianza   — en camino.
7  Proyector — en camino.
9  — sin mundo.
10 — sin mundo. Prohibido vender origen como puerta.

═══ LOS SEIS AXIOMAS ═══

1. EL PLANETA DICE EL ACTO.
2. CASA NO ES UMBRAL.
3. DIEZ CANALES CABEN EN UN MUNDO.
4. EL DEPÓSITO ES 2, NO SUPERIOR.
5. EL UMBRAL ES 8, NO OTRO PLANETA.
6. LO SALTADO VUELVE ADENTRO.

═══ LO QUE ESTA LEY NO ES ═══

No es el mapa de SKUs del Vendedor.
No es la autarquía M01–M10 del Doctor.
No es un ranking: el 8 no es más alto que el 2.
No es New Age ni un planeta de ventas cómodo.

═══ RELACIÓN CON LAS HERMANAS ═══

Cascada: QUÉ falla si saltas un código.
Carácter-Código (Umbral / Maestro): CÓMO se cruza una puerta del 8.
Óptica-Código (Depósito): CON QUÉ se ve, en la casa 2.
Casa-Umbral: EN QUÉ MUNDO estás parado.

═══ PROMESA AL OPERADOR ═══

No te prometo un planeta más alto.
Te prometo que vas a saber si estás en casa o en la puerta —
y no vas a vender el cruce como si fuera un hogar.
`.trim();

export function mundoPorNumero(
  n: MundoOperativo["numero"]
): MundoOperativo {
  return MUNDOS_OPERATIVOS[n - 1];
}

export function resumenLeyCasasUmbral(): string {
  return `${LEY_CASAS_UMBRAL_NOMBRE} · ${LEY_CASAS_UMBRAL_MARCA}. ${LEY_CASAS_UMBRAL_FIRMA}`;
}

export function etiquetaMundo(n: MundoOperativo["numero"]): string {
  const m = mundoPorNumero(n);
  if (m.tipo === "casa") return `Planeta ${n} · Casa · ${m.nombre}`;
  if (m.tipo === "umbral") return `Planeta ${n} · Puerta · ${m.nombre}`;
  if (m.tipo === "en_camino") return `Planeta ${n} · En camino · ${m.nombre}`;
  return `Planeta ${n} · Sin mundo`;
}
