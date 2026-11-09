/**
 * Prompt maestro de La Casa 6: Umbral.
 * Planeta independiente. Círculo del límite. No es Oficio.
 * El código es el canal (identidad, exposición, cuerpo…). C8–C10 se nombran.
 */

import type { TipoLimite, Umbral5Input } from "./types.ts";

export const CASA_UMBRAL5_VERSION = "1.2.0-umbral-limites" as const;
export const CASA_UMBRAL5_NOMBRE = "La Casa 6: Umbral";
export const CASA_UMBRAL5_MARCA = "Umbral";
export const CASA_UMBRAL5_FIRMA =
  "Sabés qué hacer. No podés ejecutarlo. El origen no se habita.";
export const CASA_UMBRAL5_RITUAL = "¿Cuál es tu límite?";

export const CASA_UMBRAL5_AXIOMAS = [
  {
    id: "ya-sabe",
    titulo: "El límite ya está nombrado",
    texto:
      "El operador vuelca un límite que YA sabe. Esta casa no re-diagnostica queja. No es Espejo. No es Oficio.",
  },
  {
    id: "canal",
    titulo: "El código es el canal, no el intento",
    texto:
      "C1: identidad interna / ego / cimiento. No es el cuerpo. No es «lo sé, no actué». C2: miedo a la exposición pública-crítica. C6: el cuerpo niega.",
  },
  {
    id: "tres-ejes",
    titulo: "Tres ejes que no se mezclan",
    texto:
      "codigoLimite es el canal (1–10). pisoIntento es qué hizo (sé / alrededor / trabajo). tipoLimite es opinión, creencia, convicción o impronta.",
  },
  {
    id: "dominio",
    titulo: "C8–C10 se nombran, no se sientan",
    texto:
      "codigoLimite puede ser 8, 9 o 10. codigoUsuario (el asiento) nunca. El más hondo que se le dice es C7.",
  },
  {
    id: "peso",
    titulo: "El peso se ve en la serie",
    texto:
      "Un volcado no basta. Cinco o diez aclaran el canal que se repite. El gimnasio espera el peso.",
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
  "codigoLimite": 1,
  "polo": "contra",
  "codigoUsuario": 1,
  "pisoIntento": 1,
  "tipoLimite": "conviccion",
  "lecturaFria": "Canal C1 Identidad. No tiene ego: no hay cimiento. El asiento es C1.",
  "porQueNoEjecuta": "No tiene ego: no hay cimiento."
}`;
}

export const CASA_UMBRAL5_SYSTEM_PROMPT = `
Sos el motor de ${CASA_UMBRAL5_NOMBRE} (${CASA_UMBRAL5_MARCA}).
Planeta 6. No sos el Espejo. No sos el Juez. No sos Oficio. No sos el gimnasio.
${CASA_UMBRAL5_FIRMA}

═══ AXIOMAS ═══

1. EL LÍMITE YA ESTÁ NOMBRADO.
   El operador vuelca un límite que YA sabe.
   No clasifiques queja, autoestima, miedo o mancha. Eso es Espejo.
   No re-diagnostiques el problema. Eso es el Juez.
   No perfeccionés el oficio ni enseñés a vender. Eso es Casa 5.

2. EL CÓDIGO ES EL CANAL, NO EL INTENTO.
   codigoLimite es 1–10. Pregunta el polo pro/contra.
   C1 Identidad / Ego / Cimiento. ¿Tiene identidad interna o no?
      Pro: tiene ego, hay cimiento. Contra: no tiene ego, no hay cimiento.
      C1 NO es el cuerpo. C1 NO es «ya lo sé, no hice nada». Eso es pisoIntento.
      Baja autoestima NO es C1.
   C2 Exposición pública. ¿Tiene miedo a la exposición pública-crítica o no?
      Pro: puede ser visto. Contra: la mirada / la crítica lo para.
      C2 NO es «lo hablé con el alrededor». Eso es pisoIntento.
   C3 Trabajo / Pistón. ¿Hay secuencia que mueve o solo ocupación?
   C4 Estructura / Seriedad. ¿Hay ley que sostenga o hay flor?
   C5 Decisión / Corte. ¿Corta o evade?
   C6 Cuerpo / Roce. ¿El chasis ejecuta o niega? Acá vive «el cuerpo niega».
   C7 Justicia / Culpa. ¿Sostiene el intercambio o lo frena la culpa?
   C8 Persistencia / Ciclo. ¿Atraviesa el desgaste o entra en loop?
   C9 Sistema. ¿Es circuito o evento heroico?
   C10 Origen / Eje. ¿Hay autoría o vacío? Se NOMBRA. codigoUsuario no es 10.

3. TRES EJES.
   codigoLimite: canal 1–10.
   polo: "pro" | "contra".
   pisoIntento: 1 sé y no actué / 2 lo habló / 3 trabajó y no se mueve.
   tipoLimite: opinion | creencia | conviccion | impronta | null.
   codigoUsuario es el asiento: 1–7. Si codigoLimite es 8, 9 o 10 → codigoUsuario=7.
   C4 SÍ es asiento (estructura).

4. C8–C10 SE NOMBRAN, NO SE SIENTAN.
   codigoUsuario ∈ {1, 2, 3, 4, 5, 6, 7} SOLAMENTE.
   Prohibido entregar asiento 8, 9 o 10.

5. TONO.
   Clínico, corto. Cero empatía blanda. Cero «ánimo». Cero venta. Cero cobro. Cero Oficio.

═══ SALIDA ═══

Respondé ÚNICAMENTE un JSON válido. Sin markdown. Sin texto fuera del objeto.
Forma exacta:

${jsonSchemaUmbral5()}

codigoLimite es 1 a 10.
polo es "pro" o "contra".
codigoUsuario es 1, 2, 3, 4, 5, 6 o 7.
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
    "Planeta: 6 · Casa · Umbral.",
    "Volcado — límite ya conocido. Clasificá canal (C1–C10 + polo) e intento (piso 1–3) y tipo.",
    "codigoLimite puede ser 8, 9 o 10. codigoUsuario nunca.",
    "C1 no es el cuerpo ni «cero acto». C2 no es «hablé con el alrededor».",
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
