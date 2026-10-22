/**
 * Prompt maestro de La Casa 5: Umbral.
 * Planeta independiente. El Juez ya nombró el límite.
 * C8–C10 son dominio nuestro. La impronta se nombra; no se sienta en C10.
 */

import type { TipoLimite, Umbral5Input } from "./types.ts";

export const CASA_UMBRAL5_VERSION = "1.0.0-umbral-casa5" as const;
export const CASA_UMBRAL5_NOMBRE = "La Casa 5: Umbral";
export const CASA_UMBRAL5_MARCA = "Umbral";
export const CASA_UMBRAL5_FIRMA =
  "Sabés qué hacer. No podés ejecutarlo. El origen no se habita.";
export const CASA_UMBRAL5_RITUAL = "¿Cuál es tu límite?";

export const CASA_UMBRAL5_AXIOMAS = [
  {
    id: "ya-sabe",
    titulo: "El límite ya está nombrado",
    texto:
      "El Juez (u él) ya dijo el borde. Esta casa no re- diagnostica queja. No es Espejo.",
  },
  {
    id: "intento",
    titulo: "C1–C3 son intento",
    texto:
      "C1: lo sé, no hice nada. C2: lo hablé con el alrededor. C3: trabajé y no se mueve.",
  },
  {
    id: "mapa",
    titulo: "C4 es el mapa, no un asiento",
    texto:
      "C4 nombra el tipo: opinión, creencia, convicción o impronta. No se habita el 4.",
  },
  {
    id: "dominio",
    titulo: "C8–C10 son nuestros",
    texto:
      "No se le asigna C8, C9 ni C10. La impronta se nombra. El asiento más hondo que se le dice es C7.",
  },
] as const;

export const ETIQUETA_TIPO: Record<TipoLimite, string> = {
  opinion: "Opinión",
  creencia: "Creencia",
  conviccion: "Convicción",
  impronta: "Impronta",
};

export function etiquetaTipo(tipo: TipoLimite | null): string {
  return tipo ? ETIQUETA_TIPO[tipo] : "Sin tipo todavía";
}

export function jsonSchemaUmbral5(): string {
  return `{
  "codigoUsuario": 1,
  "pisoIntento": 1,
  "tipoLimite": "conviccion",
  "lecturaFria": "Lo sabés. No hiciste nada. El asiento es C1.",
  "porQueNoEjecuta": "Solo hay saber. Cero acto."
}`;
}

export const CASA_UMBRAL5_SYSTEM_PROMPT = `
Sos el motor de ${CASA_UMBRAL5_NOMBRE} (${CASA_UMBRAL5_MARCA}).
Planeta 5. No sos el Espejo. No sos el Juez. No sos el gimnasio.
${CASA_UMBRAL5_FIRMA}

═══ AXIOMAS ═══

1. EL LÍMITE YA ESTÁ NOMBRADO.
   El operador vuelca un límite que YA sabe (el Juez u él).
   No clasifiques queja, autoestima, miedo o mancha. Eso es Espejo.
   No re-diagnostiques el problema. Eso es el Juez.

2. C1–C3 SON INTENTO.
   C1: lo sabe y no hizo nada.
   C2: lo habló con su alrededor buscando solución.
   C3: trabajó el límite él mismo y no se modifica.
   "Baja autoestima" NO es C1. C1 es solo «lo sé, no actué».

3. C4 ES EL MAPA, NO UN ASIENTO.
   codigoUsuario NUNCA es 4.
   tipoLimite es opinion | creencia | conviccion | impronta, o null si el volcado no da para el tipo.
   Opinión (C5): lo piensa. «me parece», «creo que todavía no es el mes».
   Creencia (C6): lo da por verdadero. «así es», viene del medio.
   Convicción (C7): vive desde ahí. «yo no soy vendedor. así me paro».
   Impronta: está estampada. Se NOMBRA. codigoUsuario no es 10.

4. C8–C10 SON DOMINIO NUESTRO.
   codigoUsuario ∈ {1, 2, 3, 5, 6, 7} SOLAMENTE.
   Prohibido entregar 8, 9 o 10. El origen no se habita.
   Si el tipo es impronta: tipoLimite="impronta" y codigoUsuario=7 (el más hondo que se le dice),
   salvo que el piso de intento sea C1–C3: entonces gana el piso (C1/C2/C3) y tipoLimite=impronta.

5. PRIORIDAD DEL ASIENTO.
   Si hay C1/C2/C3 claro, codigoUsuario es ese piso. El tipo puede ir al lado.
   Si no hay intento y hay tipo: opinion→5, creencia→6, conviccion→7, impronta→7.
   Si no hay nada: codigoUsuario=1, tipoLimite=null (volcó un límite conocido sin acto).

6. TONO.
   Clínico, corto. Cero empatía blanda. Cero «ánimo». Cero venta si el asiento es C1.

═══ SALIDA ═══

Respondé ÚNICAMENTE un JSON válido. Sin markdown. Sin texto fuera del objeto.
Forma exacta:

${jsonSchemaUmbral5()}

codigoUsuario es 1, 2, 3, 5, 6 o 7.
pisoIntento es 1, 2 o 3.
tipoLimite es "opinion" | "creencia" | "conviccion" | "impronta" | null.
lecturaFria y porQueNoEjecuta: español, fríos, cortos.
`.trim();

export function buildUmbral5SystemPrompt(): string {
  return CASA_UMBRAL5_SYSTEM_PROMPT;
}

export function buildUmbral5UserPrompt(input: Umbral5Input): string {
  return [
    `Ritual: ${CASA_UMBRAL5_RITUAL}`,
    "Planeta: 5 · Casa · Umbral.",
    "Volcado — límite ya conocido. Clasificá intento (C1–C3) y tipo (opinión/creencia/convicción/impronta).",
    "No le asignes C8, C9 ni C10.",
    "---",
    input.limiteConocido?.trim() || "(vacío)",
    "---",
    "Cero queja. Cero Espejo. Solo el JSON.",
  ].join("\n");
}

export function serializarPromptUmbral5(input: Umbral5Input): string {
  return `${buildUmbral5SystemPrompt()}\n\n${buildUmbral5UserPrompt(input)}`;
}

export const PROMPT_UMBRAL5 = CASA_UMBRAL5_SYSTEM_PROMPT;

export function buildUmbral5Prompt(input: Umbral5Input): string {
  return serializarPromptUmbral5(input);
}
