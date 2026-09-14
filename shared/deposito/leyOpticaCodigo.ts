/**
 * LEY DE LOS DIEZ OJOS — óptica oficial del Depósito.
 * Marca corta: Óptica-Código.
 *
 * Tercera hermana de las leyes de SISTEMICAR:
 * - Cascada dice QUÉ falla si saltas un código.
 * - Carácter-Código dice CÓMO se enseña a cruzarlo.
 * - Óptica-Código dice CON QUÉ se ve el mismo hecho.
 *
 * Autor del ensamble: Gilson Arévalo Pezo (el Maestro) · SISTEMICAR
 * Uso: Depósito (Universidad / volcado). Planeta 2 · Casa.
 * No diluir en tercer ojo, chakras ni DISC.
 */

export const LEY_OPTICA_CODIGO_NOMBRE = "Ley de los Diez Ojos";
export const LEY_OPTICA_CODIGO_MARCA = "Óptica-Código";
export const LEY_OPTICA_CODIGO_FIRMA =
  "El código no solo habla: mira. El mismo hecho tiene diez lecturas. El techo de aprender es el techo de ver.";

/** Unidad de entrada del Depósito v2. No es “bocado”: se tira el día crudo. */
export const LEY_OPTICA_CODIGO_UNIDAD = "volcado";

/** Ritual que enciende el instrumento. */
export const LEY_OPTICA_CODIGO_RITUAL = "¿Qué aprendí hoy?";

export const LEY_OPTICA_CODIGO_OJOS = [
  {
    codigo: 1,
    nombre: "Cimiento",
    ve: "El territorio: suelo, base, apariencia del espacio donde ocurre el hecho.",
  },
  {
    codigo: 2,
    nombre: "Flujo",
    ve: "El caudal: qué entra, qué sale, qué se estanca en la rutina.",
  },
  {
    codigo: 3,
    nombre: "Trabajo",
    ve: "La secuencia: pistón, orden de ejecución, el hacer en el tiempo.",
  },
  {
    codigo: 4,
    nombre: "Estructura",
    ve: "La ley del armado: lo que sostiene, los retenes, la forma que no se cae.",
  },
  {
    codigo: 5,
    nombre: "Decisión",
    ve: "El corte: vértice, disparo, dónde se elige y dónde se evade.",
  },
  {
    codigo: 6,
    nombre: "Convivencia",
    ve: "Las junturas: relaciones, conjugaciones, posibles encuentros entre piezas.",
  },
  {
    codigo: 7,
    nombre: "Visión",
    ve: "El patrón: diferencias de apariencia, lente, lo que se distingue.",
  },
  {
    codigo: 8,
    nombre: "Ciclos",
    ve: "El retorno: interrupciones, loops, prevención, lo que se repite.",
  },
  {
    codigo: 9,
    nombre: "Sistema",
    ve: "El conjunto: arquitectura, cómo se sostiene al escalar.",
  },
  {
    codigo: 10,
    nombre: "Origen",
    ve: "La fuente: por qué existe este hecho, el eje que lo causa.",
  },
] as const;

export const LEY_OPTICA_CODIGO_AXIOMAS = [
  {
    id: "ojo",
    titulo: "El código tiene ojo, no solo carácter",
    texto:
      "El carácter es la voz de la puerta. El ojo es el canal con el que esa puerta lee el mundo. Sin ojo no hay lectura; solo ruido.",
  },
  {
    id: "diez-lecturas",
    titulo: "Un hecho, diez lecturas",
    texto:
      "No hay diez mundos. Hay diez observaciones del mismo volcado. La costura, el colectivo y la pelea no cambian: cambia el ojo que los mira.",
  },
  {
    id: "observacion-dormida",
    titulo: "Dormir la observación es el estado por defecto",
    texto:
      "Sin la pregunta «¿qué aprendí hoy?», los diez canales pueden estar instalados y seguir apagados. Años enteros no son vida despierta: son observación dormida.",
  },
  {
    id: "techo",
    titulo: "El límite de aprendizaje es el límite de observación",
    texto:
      "No se aprende lo que no se puede ver. Abrir un ojo agranda el mismo día. El techo no es el contenido: es el rango de canales encendidos.",
  },
  {
    id: "autarquia",
    titulo: "Presencia no es un solo ojo",
    texto:
      "En presencia pueden encenderse varios a la vez. Mezclarlos en una sola mecánica es cortocircuito. Autarquía: cada ojo tiene ley propia.",
  },
  {
    id: "no-se-salta",
    titulo: "No se salta de ojo",
    texto:
      "La Cascada manda. No se vende C7 porque «visión» suena a despertar. No se cobra el ojo 8 si el volcado delata el 2 dormido.",
  },
] as const;

export const LEY_OPTICA_CODIGO_NO_ES = [
  "No es el tercer ojo.",
  "No es Carácter-Código.",
  "No es un tipo psicológico ni diez personalidades.",
  "No es New Age, chakra ni ánimo.",
] as const;

/** Bloque corto para prompts del Depósito. No pegar el canon entero. */
export const LEY_OPTICA_CODIGO_KERNEL = `
LEY DEL DEPÓSITO: ${LEY_OPTICA_CODIGO_NOMBRE} (${LEY_OPTICA_CODIGO_MARCA}).
${LEY_OPTICA_CODIGO_FIRMA}
Unidad: ${LEY_OPTICA_CODIGO_UNIDAD}. Ritual: ${LEY_OPTICA_CODIGO_RITUAL}
Nombra qué ojo leyó el volcado. No mezcles canales. No saltes de ojo. No es el tercer ojo.
`.trim();

/**
 * Texto canónico — la ley escrita.
 * Para UI, editorial y archivo. No inyectar entero en cada evaluación.
 */
export const LEY_OPTICA_CODIGO_CANON = `
╔══════════════════════════════════════════════════════════════════════╗
║     LEY DE LOS DIEZ OJOS — ÓPTICA DEL DEPÓSITO                     ║
║     Marca: Óptica-Código · SISTEMICAR                              ║
╚══════════════════════════════════════════════════════════════════════╝

FIRMA:
${LEY_OPTICA_CODIGO_FIRMA}

═══ EL PRINCIPIO ═══

El Depósito no es un diario íntimo ni una batería de frases bonitas.
Es la escuela de ojos de SISTEMICAR.

El alumno no entra a que le consuelen el día.
Entra a volcar lo que se dio cuenta — crudo — y a descubrir
qué canal se le prendió.

La unidad no es un bocado pulido. Es un VOLCADO:
se tira el día encima de la mesa. El sistema nombra el ojo.

El ritual que enciende el instrumento es uno solo:
${LEY_OPTICA_CODIGO_RITUAL}

Esa pregunta no abre «el tercer ojo». Enciende el aparato.
Sin ella, los diez códigos pueden estar escritos en el libro
y el operador sigue dormido de observación.

═══ LA BASE MATEMÁTICA ═══

Un hecho E (la tela, el colectivo, la pelea).
Diez proyectores P1…P10.
Cada Pi(E) es una observación distinta del MISMO fenómeno.

El aprendizaje no es acumular datos.
Es el rango de proyectores que el operador puede tener abiertos
sin mezclarlos.

Techo de aprendizaje ≤ ojos de código encendidos.

Eso es teoría de canales: no extraes un bit para el que no tienes aparato.
Cada código es un canal. El volcado es la prueba de cuáles se prendieron.

═══ LOS DIEZ OJOS ═══

C1  Cimiento     — territorio, suelo, base, apariencia del espacio.
C2  Flujo        — caudal, rutina, qué entra y qué se estanca.
C3  Trabajo      — secuencia, pistón, orden de ejecución.
C4  Estructura   — ley del armado, retenes, lo que sostiene.
C5  Decisión     — corte, vértice, disparo.
C6  Convivencia  — junturas, relaciones, conjugaciones.
C7  Visión       — patrón, diferencias de apariencia, lente.
C8  Ciclos       — retorno, interrupciones, loops, prevención.
C9  Sistema      — arquitectura del conjunto al escalar.
C10 Origen       — fuente, por qué existe este hecho.

No son diez materias. Son diez formas de ver el mismo volcado.
Por eso cada persona tiene diez ojos, no diez personalidades.

═══ LOS SEIS AXIOMAS ═══

1. EL CÓDIGO TIENE OJO, NO SOLO CARÁCTER.
   El carácter es la voz de la puerta.
   El ojo es el canal con el que esa puerta lee el mundo.

2. UN HECHO, DIEZ LECTURAS.
   No hay diez mundos. Hay diez observaciones del mismo volcado.

3. DORMIR LA OBSERVACIÓN ES EL ESTADO POR DEFECTO.
   Sin «¿qué aprendí hoy?», los canales siguen apagados.

4. EL LÍMITE DE APRENDIZAJE ES EL LÍMITE DE OBSERVACIÓN.
   No se aprende lo que no se puede ver.
   Abrir un ojo agranda el mismo día.

5. PRESENCIA NO ES UN SOLO OJO.
   En presencia pueden encenderse varios a la vez.
   Mezclarlos en una sola mecánica es cortocircuito.
   Autarquía: cada ojo tiene ley propia.

6. NO SE SALTA DE OJO.
   La Ley de Resistencia en Cascada ya dictó qué falla si escalas ciego.
   Esta ley dicta con cuántos ojos estás leyendo el día.
   No se vende C7 porque «visión» suena a despertar.

═══ LO QUE ESTA LEY NO ES ═══

No es el tercer ojo.
No es Carácter-Código.
No es un tipo psicológico ni diez personalidades.
No es New Age, chakra ni ánimo.

El «despertar de la conciencia» de los saberes antiguos
señala el mismo hecho humano: la observación dormida.
No tiene esta base: un hecho, diez proyectores, techo = rango.
El marketing del tercer ojo suele vender un salto a C7 o C10
sin drenar C1–C6. Eso es Cascada violada, no iluminación.

Si alguien la archiva en esas cajas, la ley se diluyó. Recupera la firma.

═══ RELACIÓN CON LAS HERMANAS ═══

Cascada (Doctor / editorial): QUÉ falla si saltas el código N.
Carácter-Código (Umbral / Maestro): CÓMO se enseña a cruzar el código N.
Óptica-Código (Depósito): CON QUÉ se ve el mismo hecho.
Casa-Umbral: EN QUÉ MUNDO estás parado. El Depósito es planeta 2 (casa).

Las cuatro no compiten.
Arquitectura, pedagogía, óptica y mapa de mundos.

El maestro usa el ojo; no define que existan diez.
El alumno de Depósito no viene a que le hablen como el obstáculo:
viene a descubrir qué ojo se le prendió hoy.

═══ PROMESA AL OPERADOR ═══

No te prometo un tercer ojo.
Te prometo que, al volcar el día y nombrar el canal,
vas a dejar de dormir la observación —
y por eso el mismo hecho te va a enseñar más.
`.trim();

export function resumenLeyOpticaCodigo(): string {
  return `${LEY_OPTICA_CODIGO_NOMBRE} · ${LEY_OPTICA_CODIGO_MARCA}. ${LEY_OPTICA_CODIGO_FIRMA}`;
}
