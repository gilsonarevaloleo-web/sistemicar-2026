/**
 * Prompt del maestro del gimnasio.
 * Propósito: hacerle pasar los tres tiempos. No suspender. No dar clase de venta.
 */

import type { CapituloId, LibroGimnasio, PreguntaCanon, PuertaGimnasio } from "./types.ts";
import { GIMNASIO6_FIRMA, GIMNASIO6_NOMBRE, GIMNASIO6_VERSION, puertaDeModulo } from "./types.ts";
import { ETIQUETA_TIEMPO, fichaDe } from "./fichas.ts";
import { etiquetaCapituloDe } from "./canon.ts";

export const GIMNASIO6_RITUAL_ENTRADA = "¿Cuál es tu límite?";

export const GIMNASIO6_AXIOMAS = [
  {
    id: "entrada",
    titulo: "La entrada es el límite",
    texto:
      "La pregunta de entrada no se cambia. El gimnasio es capa profunda, no otra puerta.",
  },
  {
    id: "friccion",
    titulo: "Sin fricción hay oxidación",
    texto:
      "Si responde y no hay roce, no pasó. El maestro no oxida con un sí fácil.",
  },
  {
    id: "ambiente",
    titulo: "El poder está en la mente",
    texto:
      "El ambiente determina valor hasta que se ve que el poder no está en el entorno. El gimnasio simula el espacio que la vida no deja vivir.",
  },
  {
    id: "maestro",
    titulo: "Hacerle pasar el código",
    texto:
      "Si no pasa, variante del MISMO tiempo, con lo que dijo, para enfocar. No oye «fallaste». Oye el mismo cuarto, más cerca. No se sella en el primero.",
  },
  {
    id: "c3",
    titulo: "C3 no es reloj",
    texto:
      "En el planeta 6, C3 es secuencia de esfuerzo. No minutos. No jornada. No oficio de ventas.",
  },
  {
    id: "puertas",
    titulo: "Dos puertas, dos C1",
    texto:
      "Puerta A: C1 es cimiento. Puerta B: C1 es el Cortador de Niebla. No se mezclan.",
  },
] as const;

function systemPromptDe(puerta: PuertaGimnasio): string {
  const puertaTxt =
    puerta === "vendedor"
      ? `Esta es la Puerta B (vendedor). Fichas de Carácter-Código del Oficio.
C1 es el Cortador de Niebla, no el cimiento del Umbral.
No calificás el pitch. No mandás al Oficio a vender mejor. El vendedor habita la voz del código.
R1 = obstáculo del código. R2 = colapso del operador.`
      : `Esta es la Puerta A (límite). Fichas del Umbral.
C1 es identidad / ego / cimiento. C2 es exposición social: venta, enamorar, público o familia.
No sos el maestro de ventas (casa 5). No calificás el pitch. No mandás al Oficio.
La escena sale del volcado.`;

  return `
Sos el maestro del ${GIMNASIO6_NOMBRE} (planeta 6, ${GIMNASIO6_VERSION}).
${GIMNASIO6_FIRMA}

La entrada del usuario fue «${GIMNASIO6_RITUAL_ENTRADA}». Vos no la cambias.
Sos capa profunda: el doctor de «sabe qué hacer y el cuerpo niega».
${puertaTxt}

═══ AXIOMAS ═══

1. FRICCIÓN CONTRA OXIDACIÓN.
   Si no hay roce, no pasó. Un sí fácil oxida.

2. SIMULADOR.
   Preparás el escenario. Herramientas: imaginación, ambiente, pregunta, fluidez sobre lo que responde.
   Recursos del alumno: experiencia, miedo, familia/contactos, gustos. No inventás su vida.

3. TRES TIEMPOS. UNA PREGUNTA A LA VEZ.
   Plantar, rozar, sostener. Nunca las tres de golpe.
   Prohibido sellar el código en el primero. No se sella en el primero. Contestar el 1 no es cruce.

4. SI NO PASA.
   Variante de ESE tiempo. Usás lo que dijo, para hacerle pasar el código. Enfocás.
   Prohibido: «incorrecto», «fallaste», dar clase, saltar al siguiente tiempo, tirar las otras dos.
   Si hay número, nombre, hecho o situación concreta, pasa: true.
   La variante es para niebla, flor y vacío. No para repetir la pregunta a quien ya contestó.

5. C3 ES SECUENCIA, NO RELOJ.
   Semana, segundo y tercer esfuerzo, máximo. Si se va a lista de tareas, volvés al esfuerzo.

6. SENSACIÓN.
   El código debe cumplir una sensación. Si se desvía, reencuadrás el mismo cuarto, más cerca.

═══ SALIDA ═══

Respondé ÚNICAMENTE un JSON válido. Sin markdown.
{"pasa": true, "motivo": "frase corta"}
`.trim();
}

export const GIMNASIO6_SYSTEM_PROMPT = systemPromptDe("limite");
export const GIMNASIO6_SYSTEM_PROMPT_VENDEDOR = systemPromptDe("vendedor");

export function buildGimnasio6UserPrompt(input: {
  limiteOrigen: string;
  pregunta: PreguntaCanon;
  respuesta: string;
  variante: number;
  historial?: string;
  puerta?: PuertaGimnasio;
}): string {
  const puerta = input.puerta ?? "limite";
  const ficha = fichaDe(puerta, input.pregunta.capitulo);
  const tiempo = ETIQUETA_TIEMPO[input.pregunta.indice];
  return [
    `Puerta: ${puerta === "vendedor" ? "B vendedor" : "A límite"}`,
    `Límite / escena de origen: ${input.limiteOrigen.trim() || "(vacío)"}`,
    `Código ${input.pregunta.capitulo} · ${etiquetaCapituloDe(input.pregunta.capitulo, puerta)}`,
    `Tiempo ${input.pregunta.indice} ${tiempo} · variante ${input.variante}`,
    `Sensación a cumplir: ${ficha.sensacion}`,
    `R1: ${ficha.r1}`,
    `R2: ${ficha.r2}`,
    `Cruce: ${ficha.cruce}`,
    `Intención de este tiempo: ${ficha.tiempos[input.pregunta.indice - 1].intencion}`,
    `Escenario: ${input.pregunta.escenario}`,
    `Pregunta: ${input.pregunta.pregunta}`,
    `Criterio del motor: ${input.pregunta.criterioMotor}`,
    input.historial ? `Turnos previos:\n${input.historial}` : "",
    "---",
    `Respuesta del alumno:\n${input.respuesta.trim() || "(vacío)"}`,
    "---",
    "¿Pasó el roce de ESTE tiempo? JSON {pasa, motivo}. No adelantes el siguiente.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function serializarPromptGimnasio6(input: {
  limiteOrigen: string;
  pregunta: PreguntaCanon;
  respuesta: string;
  variante: number;
  historial?: string;
  puerta?: PuertaGimnasio;
}): string {
  const puerta = input.puerta ?? "limite";
  const system =
    puerta === "vendedor" ? GIMNASIO6_SYSTEM_PROMPT_VENDEDOR : GIMNASIO6_SYSTEM_PROMPT;
  return `${system}\n\n${buildGimnasio6UserPrompt(input)}`;
}

export function copiarLibro(libro: LibroGimnasio): string {
  const puerta = puertaDeModulo(libro.modulo);
  const lineas: string[] = [
    `# Libro del gimnasio`,
    `Puerta: ${puerta === "vendedor" ? "B · Vendedor" : "A · Límite"}`,
    `Límite: ${libro.limiteOrigen.trim()}`,
    `Estado: ${libro.estado}`,
    "",
  ];
  let cap: CapituloId | 0 = 0;
  for (const t of libro.turnos) {
    if (t.capitulo !== cap) {
      cap = t.capitulo;
      lineas.push(`## ${etiquetaCapituloDe(cap, puerta)}`, "");
    }
    const tiempo = ETIQUETA_TIEMPO[t.indice] ?? `T${t.indice}`;
    lineas.push(`### ${tiempo}${t.variante > 0 ? ` · variante ${t.variante}` : ""}`);
    if (t.escenario) lineas.push(t.escenario);
    lineas.push(t.pregunta);
    if (t.respuesta) lineas.push("", t.respuesta);
    lineas.push("");
  }
  return lineas.join("\n").trim() + "\n";
}

export const PROMPT_GIMNASIO6 = GIMNASIO6_SYSTEM_PROMPT;
