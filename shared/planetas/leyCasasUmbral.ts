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
 * Cada planeta es un círculo cerrado para un tipo de cliente ya en esa
 * frecuencia. No se encadenan. Entre mundos rige la ley del perímetro.
 *
 * Autor del ensamble: Gilson Arévalo Pezo (el Maestro) · SISTEMICAR
 */

export const LEY_CASAS_UMBRAL_NOMBRE = "Ley de las Casas y el Umbral";
export const LEY_CASAS_UMBRAL_MARCA = "Casa-Umbral";
export const LEY_CASAS_UMBRAL_FIRMA =
  "El planeta dice el acto. El ojo dice la lectura. Cada planeta es un círculo cerrado.";

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
    nombre: "Juez Serio",
    tipo: "casa",
    acto: "Hacer consciente el inconsciente. Delimitar la solución al perímetro conquistado.",
    prohibido: "Consejos de códigos superiores. Empatía blanda. Teoría académica.",
  },
  {
    numero: 5,
    nombre: "Oficio",
    tipo: "casa",
    acto: "Perfeccionar el deber. Cobrar. Dominar el oficio.",
    prohibido: "Nombrar el límite. Entrenar el chasis. Mandar al gimnasio.",
  },
  {
    numero: 6,
    nombre: "Umbral",
    tipo: "casa",
    acto: "Nombrar el límite. Atravesar el confort del cuerpo.",
    prohibido: "Enseñar a vender. Perfeccionar el oficio. Hablar de cobro.",
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
    nombre: "—",
    tipo: "sin_mundo",
    acto: "Aún no es mundo.",
    prohibido: "Habitar estrategia. Vender origen como puerta.",
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
export const PLANETA_JUEZ = 4 as const;
export const PLANETA_CODIGO4 = PLANETA_JUEZ;
export const PLANETA_OFICIO = 5 as const;
export const PLANETA_UMBRAL = 6 as const;

export const LEY_CASAS_UMBRAL_AXIOMAS = [
  {
    id: "acto",
    titulo: "El planeta dice el acto",
    texto:
      "No dice rango espiritual. Dice qué verbo es moneda aquí. Mezclar verbos de otro mundo es contrabando.",
  },
  {
    id: "circulo",
    titulo: "Cada planeta es un círculo cerrado",
    texto:
      "Diez códigos caben adentro. El cliente ya está en esa frecuencia. No se le hace subir los mundos. No hay pasaporte de producto.",
  },
  {
    id: "perimetro",
    titulo: "Entre mundos, ley del perímetro",
    texto:
      "Oficio no es límite. Límite no es cobro. El 5 no manda al gimnasio. El 6 no enseña a vender.",
  },
  {
    id: "adentro",
    titulo: "Diez canales caben en un mundo",
    texto:
      "El Depósito abre diez ojos y sigue siendo el 2. El Oficio recorre diez códigos y sigue siendo el 5. El Umbral nombra el límite y sigue siendo el 6. El canal no sube el planeta.",
  },
  {
    id: "deposito-dos",
    titulo: "El Depósito es 2, no superior",
    texto:
      "Aprender no es más noble que la mancha. Sin planeta 1 no hay volcado. La universidad vive en el 2 porque ahí aprender es legal.",
  },
  {
    id: "umbral-seis",
    titulo: "El Umbral es 6, no Oficio",
    texto:
      "Sabe qué hacer y el cuerpo niega. Gimnasio del chasis. No es el módulo de ventas. El cobro vive en el 5.",
  },
] as const;

export const LEY_CASAS_UMBRAL_NO_ES = [
  "No es el mapa de SKUs del Vendedor.",
  "No es la autarquía M01–M10 del Doctor.",
  "No es un ranking: el 6 no es más alto que el 2.",
  "No es una escalera de clientes ni un planeta de ventas cómodo.",
] as const;

export const LEY_CASAS_UMBRAL_KERNEL = `
LEY DE MUNDOS: ${LEY_CASAS_UMBRAL_NOMBRE} (${LEY_CASAS_UMBRAL_MARCA}).
${LEY_CASAS_UMBRAL_FIRMA}
Casas: 1 Espejo, 2 Depósito, 3 Jornada, 4 Juez, 5 Oficio, 6 Umbral.
El canal no sube el planeta. No se encadenan los mundos.
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

El planeta es un círculo cerrado. El cliente de ese mundo ya está
en esa frecuencia. No se le sube 1→2→3→4→5→6.

El Espejo no es “bajo”. Es la casa de la mancha.
El Depósito no es “superior”. Es la casa del aprendizaje.
La Jornada no es “productividad”. Es la casa del día.
El Juez Serio no es “crítica”. Es la casa que desnuda el automático y acota al perímetro.
El Oficio no es “el módulo de ventas”. Es la casa del deber.
El Umbral no es Oficio. Es la casa del límite.

═══ CASAS ═══

1  ESPEJO     — Nombrar la mancha. Ahí no hay aula.
2  DEPÓSITO   — Volcar y abrir ojos. Ahí no se cierra el día.
3  JORNADA    — Cerrar el día. Ahí no se queja ni se da clase.
4  JUEZ SERIO — Hacer consciente el inconsciente. Delimitar al perímetro conquistado.
5  OFICIO     — Perfeccionar el deber. Cobrar. Dominar el oficio. Ahí no se nombra el límite.
6  UMBRAL     — Nombrar el límite. Atravesar el confort del cuerpo. Ahí no se enseña a vender.

Entre mundos: ley del perímetro. Mezclar verbos es contrabando.

═══ AÚN NO SON MUNDO ═══

7  Proyector — en camino.
8  — sin mundo.
9  — sin mundo.
10 — sin mundo. Prohibido vender origen como puerta.

═══ LOS SEIS AXIOMAS ═══

1. EL PLANETA DICE EL ACTO.
2. CADA PLANETA ES UN CÍRCULO CERRADO.
3. ENTRE MUNDOS, LEY DEL PERÍMETRO.
4. DIEZ CANALES CABEN EN UN MUNDO.
5. EL DEPÓSITO ES 2, NO SUPERIOR.
6. EL UMBRAL ES 6, NO OFICIO.

═══ LO QUE ESTA LEY NO ES ═══

No es el mapa de SKUs del Vendedor.
No es la autarquía M01–M10 del Doctor.
No es un ranking: el 6 no es más alto que el 2.
No es una escalera de clientes ni un planeta de ventas cómodo.

═══ RELACIÓN CON LAS HERMANAS ═══

Cascada: QUÉ falla si saltas un código.
Carácter-Código (Oficio / Maestro): CÓMO se perfecciona el deber en el 5.
Óptica-Código (Depósito): CON QUÉ se ve, en la casa 2.
Casa-Umbral: EN QUÉ MUNDO estás parado.

═══ PROMESA AL OPERADOR ═══

No te prometo un planeta más alto.
Te prometo que vas a saber qué verbo es legal aquí —
y no vas a vender el oficio como si fuera el límite.
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
