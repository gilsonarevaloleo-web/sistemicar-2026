/**
 * Fichas vivas de la Puerta A (Límite).
 * Cada código: sensación + tres tiempos (plantar, rozar, sostener).
 * El maestro escribe la pregunta con el volcado. Estas semillas no se leen como quiz.
 */

import type { CodigoLimite } from "../umbral5/diccionarioLimites.ts";
import { DICCIONARIO_LIMITES } from "../umbral5/diccionarioLimites.ts";

export type TiempoId = 1 | 2 | 3;
export type NombreTiempo = "plantar" | "rozar" | "sostener";

export const ETIQUETA_TIEMPO: Record<TiempoId, string> = {
  1: "Plantar",
  2: "Rozar",
  3: "Sostener",
};

export const NOMBRE_TIEMPO: Record<TiempoId, NombreTiempo> = {
  1: "plantar",
  2: "rozar",
  3: "sostener",
};

export interface TiempoFicha {
  id: TiempoId;
  nombre: NombreTiempo;
  /** Qué debe pasar en el operador. */
  intencion: string;
  escenarioSemilla: string;
  preguntaSemilla: string;
  criterioMotor: string;
}

export interface FichaVivaLimite {
  codigo: CodigoLimite;
  nombre: string;
  sensacion: string;
  r1: string;
  r2: string;
  cruce: string;
  variante: string;
  tiempos: readonly [TiempoFicha, TiempoFicha, TiempoFicha];
}

function t(
  id: TiempoId,
  intencion: string,
  escenarioSemilla: string,
  preguntaSemilla: string,
  criterioMotor: string,
): TiempoFicha {
  return {
    id,
    nombre: NOMBRE_TIEMPO[id],
    intencion,
    escenarioSemilla,
    preguntaSemilla,
    criterioMotor,
  };
}

export const FICHAS_LIMITE: Record<CodigoLimite, FichaVivaLimite> = {
  1: {
    codigo: 1,
    nombre: DICCIONARIO_LIMITES[1].nombre,
    sensacion:
      "Suelo. Un yo parado antes de actuar. No confianza teatral. No un CV.",
    r1: "No hay ego; no hay con qué pararse.",
    r2: "Pide permiso, se compara, lista roles, espera un título para poder ser.",
    cruce:
      "Pasó plantar, rozar y sostener. Nombra una identidad operativa y no pide permiso.",
    variante:
      "Eso que dijiste es permiso. El cimiento no pide permiso. Una frase: quién está parado.",
    tiempos: [
      t(
        1,
        "Que nombre un yo, no un CV.",
        "Estás en [escena]. Antes de hacer nada. La acción está congelada.",
        "¿Quién sos vos en este cuarto?",
        "¿Hay un yo nombrado, o nadie / un currículum / «quién soy yo para»?",
      ),
      t(
        2,
        "Que sienta el suelo, no que lo explique.",
        "Esa frase tiene que pesar. La escena sigue. No se vende. No se enamora.",
        "Sostené esa frase. ¿Qué cambia en el cuerpo si no pedís permiso?",
        "¿Sintió el suelo o explicó identidad?",
      ),
      t(
        3,
        "Que no se vuelva «quién soy yo para».",
        "R2 pega. Te dicen que no sos nadie para esto.",
        "Ahora te dicen que no sos nadie para esto. ¿Qué queda parado?",
        "¿Quedó un yo sin permiso, o volvió a pedir título?",
      ),
    ],
  },
  2: {
    codigo: 2,
    nombre: DICCIONARIO_LIMITES[2].nombre,
    sensacion: "Ser visto y no irse. Calor, mirada ajena, quedarse.",
    r1: "Miedo a la crítica / a ser visto.",
    r2: "Se esconde, cambia de tema, ensaya el discurso, pide que apaguen la luz.",
    cruce:
      "Pasó los tres tiempos. Nombra la mirada y se queda. El pretexto (venta, chica, público) no se califica.",
    variante: "Eso es huida. La mirada sigue. No vendas. No enamores. Quedate.",
    tiempos: [
      t(
        1,
        "Que nombre quién lo está mirando (cliente, chica, público, familia).",
        "La escena de [escena] ya está. Alguien mira.",
        "¿Quién te está mirando ahora?",
        "¿Hay una persona concreta, o «la gente» / nadie?",
      ),
      t(
        2,
        "Que sienta el cuerpo bajo la mirada, no que arme un discurso.",
        "Esa persona te está mirando. No hace falta convencerla.",
        "¿Qué hace tu cuerpo con esa mirada?",
        "¿Nombró el roce del cuerpo o ensayó pitch / galanteo?",
      ),
      t(
        3,
        "Que se quede. R2 pide irse.",
        "El cuerpo pide esconderte. El cuarto no apaga la luz.",
        "Quedate. No vendas. No enamores. ¿Qué queda si no te vas?",
        "¿Se quedó bajo la mirada o se fue?",
      ),
    ],
  },
  3: {
    codigo: 3,
    nombre: DICCIONARIO_LIMITES[3].nombre,
    sensacion: "Tracción. El golpe mueve, no gira en vacío. C3 no es reloj de Oficio.",
    r1: "Ocupación estéril: trabaja y no se mueve.",
    r2: "Otra lista. «Me voy a organizar». Más horas.",
    cruce: "Secuencia de esfuerzos con tracción nombrada. No más ocupación.",
    variante: "Eso es ocupación. No más horas. Otro golpe al mismo punto.",
    tiempos: [
      t(
        1,
        "Que nombre el último esfuerzo real, no la agenda.",
        "Estás en [escena]. El pistón, no el reloj.",
        "Nombrá el último esfuerzo. ¿Qué se movió?",
        "¿Hay un golpe concreto, o lista de tareas?",
      ),
      t(
        2,
        "Si nada se movió, que sienta el vacío del pistón.",
        "Si nada se movió, el siguiente no es más horas.",
        "¿Dónde giró en vacío? ¿Cuál es el mismo punto para el siguiente golpe?",
        "¿Nombró el punto, o pidió organizarse?",
      ),
      t(
        3,
        "Tres esfuerzos en secuencia. Tracción.",
        "Ahora la secuencia. No el día. No la jornada.",
        "Tres esfuerzos al mismo punto. ¿Cuál es el segundo y el tercero?",
        "¿Hay secuencia que mueve, o otra lista?",
      ),
    ],
  },
  4: {
    codigo: 4,
    nombre: DICCIONARIO_LIMITES[4].nombre,
    sensacion: "Peso de ley. El cuarto deja de ser flor.",
    r1: "Ilusión, flor, no hay estructura.",
    r2: "Inspiración, «ya veré», promesa vaga.",
    cruce: "Mínimo y máximo de hoy. Hecho y límite. Cero humo.",
    variante: "Hay flor. Sacala. Hecho y límite.",
    tiempos: [
      t(
        1,
        "Separar ruta de ilusión.",
        "Estás en [escena]. Una es ruta. La otra es flor.",
        "Eso, ¿es ruta o es flor? Sacá una.",
        "¿Cortó la flor, o las dejó mezcladas?",
      ),
      t(
        2,
        "Que sienta el peso del hecho, no el ánimo.",
        "La flor ya no está. Queda el hecho.",
        "¿Cuál es el hecho y el límite de esta ruta?",
        "¿Hay hecho + límite, o inspiración?",
      ),
      t(
        3,
        "Mínimo y máximo de hoy.",
        "La seriedad se sostiene hoy, no «ya veré».",
        "¿Cuál es el mínimo y el máximo de hoy?",
        "¿Hay rango de hoy, o «ya veré»?",
      ),
    ],
  },
  5: {
    codigo: 5,
    nombre: DICCIONARIO_LIMITES[5].nombre,
    sensacion: "El antes y el después en el pecho. El corte.",
    r1: "Parálisis: no elige.",
    r2: "«Después», niebla, lo deja para otro mes.",
    cruce: "Elige y nombra lo que cae. El primero solo no alcanza.",
    variante: "Eso no es corte. Hay dos. Uno se cae ahora.",
    tiempos: [
      t(
        1,
        "Que nombre los dos caminos.",
        "Estás en [escena]. Hay dos. No hay tercero de niebla.",
        "Hay dos. ¿Cuáles son?",
        "¿Nombró dos caminos, o evadió?",
      ),
      t(
        2,
        "Que sienta el corte, no la deliberación.",
        "Uno se cierra ahora. El que no elegís se cae del cuarto.",
        "¿Cuál cortás ahora?",
        "¿Disparó, o lo dejó para después?",
      ),
      t(
        3,
        "Nombrar lo que muere.",
        "El corte ya pegó. R2 quiere reabrir lo cerrado.",
        "¿Qué muere con esa elección? Nombralo.",
        "¿Nombró lo que cae, o reabrió la parálisis?",
      ),
    ],
  },
  6: {
    codigo: 6,
    nombre: DICCIONARIO_LIMITES[6].nombre,
    sensacion: "El chasis en la puerta. Contacto, no ensayo.",
    r1: "El cuerpo niega: freeze, ansiedad.",
    r2: "Ensayo infinito. Plan de preparación. Nunca pone el cuerpo.",
    cruce: "Roce concreto, no pensado. El cuerpo entra.",
    variante: "Eso es ensayo. Poné el cuerpo en un roce de hoy.",
    tiempos: [
      t(
        1,
        "Ubicar el cuerpo respecto de la puerta, no el plan.",
        "Estás en [escena]. No me cuentes el plan.",
        "¿Dónde está tu cuerpo respecto de esa puerta?",
        "¿Hay ubicación de cuerpo, o un plan?",
      ),
      t(
        2,
        "Que sienta el freeze y no lo cubra con más mente.",
        "El cuerpo niega. La mente quiere ensayar.",
        "¿Qué hace el chasis ahora, sin el discurso?",
        "¿Nombró el freeze/roce, o volvió al ensayo?",
      ),
      t(
        3,
        "Un roce mínimo de hoy, ejecutado no pensado.",
        "La puerta más chica. Hoy. El rechazo no manda el día.",
        "¿Cuál es el roce de hoy que el cuerpo ejecuta, no piensa?",
        "¿Hay roce concreto de hoy, o otra preparación?",
      ),
    ],
  },
  7: {
    codigo: 7,
    nombre: DICCIONARIO_LIMITES[7].nombre,
    sensacion: "Derecho a estar. Valor sin pedir perdón.",
    r1: "«No merezco». Descuento moral.",
    r2: "Descuenta, pide permiso, se autoflagela.",
    cruce: "Sostiene el intercambio. La culpa ya no cobra.",
    variante: "La culpa está mandando. Sostén la balanza.",
    tiempos: [
      t(
        1,
        "Poner la culpa en el cuarto, no negociarla.",
        "Estás en [escena]. La culpa está hablando.",
        "La culpa está hablando. ¿Qué está descontando?",
        "¿Nombró el descuento, o se autoflageló?",
      ),
      t(
        2,
        "Sentir el valor si ella se calla.",
        "Si la culpa se calla, queda una balanza.",
        "¿Qué sostiene el valor si ella se calla?",
        "¿Hay valor nombrado, o más culpa?",
      ),
      t(
        3,
        "No descontar. Sostener el intercambio.",
        "R2 quiere bajar el precio o pedir permiso.",
        "Sin descuento. ¿Cuál es el intercambio que no negociás con la culpa?",
        "¿Sostuvo, o descontó?",
      ),
    ],
  },
  8: {
    codigo: 8,
    nombre: DICCIONARIO_LIMITES[8].nombre,
    sensacion: "Cansancio sin abandono. El valle.",
    r1: "Abandono / óxido / loop.",
    r2: "«Me voy a esforzar más» sin marco.",
    cruce: "Checkpoint + lo no negociable bajo desgaste.",
    variante: "Eso es empuje, no estrategia. Sostené el marco.",
    tiempos: [
      t(
        1,
        "Marcar el punto exacto donde suelta.",
        "Estás en [escena]. Acá es donde sueltás.",
        "Acá es donde sueltás. ¿En qué punto del valle?",
        "¿Nombró el punto, o prometió esforzarse más?",
      ),
      t(
        2,
        "Sentir el cansancio sin irse.",
        "El desgaste ya está. No es heroísmo.",
        "¿Qué se siente en el valle cuando ya no hay ganas y no te vas?",
        "¿Habitó el valle, o se fue al óxido?",
      ),
      t(
        3,
        "Una cosa que no se negocia bajo desgaste.",
        "Ritmo + checkpoint. R2 quiere abandonar o perseguir.",
        "¿Qué no se negocia en este valle?",
        "¿Hay marco, o empuje vacío?",
      ),
    ],
  },
  9: {
    codigo: 9,
    nombre: DICCIONARIO_LIMITES[9].nombre,
    sensacion: "El sistema sigue sin el héroe.",
    r1: "Evento heroico. Pico sin sistema.",
    r2: "«Cuando pueda». Plan vago.",
    cruce: "Rutina integrable: cuándo, dónde, duración, trigger.",
    variante: "Eso es evento. Convertilo en circuito.",
    tiempos: [
      t(
        1,
        "Separar el pico del circuito.",
        "Estás en [escena]. Eso que hiciste, ¿fue evento o circuito?",
        "Si vos no estás, ¿qué sigue encendido?",
        "¿Hay algo que sigue, o solo el pico?",
      ),
      t(
        2,
        "Sentir la continuidad, no el teatro de escala.",
        "El perfeccionista pide escala. El cuarto pide trigger.",
        "¿Cuándo, dónde, cuánto dura, qué lo dispara?",
        "¿Hay trigger, o «cuando pueda»?",
      ),
      t(
        3,
        "Rutina integrable nombrada.",
        "R2 arma un plan semanal vago.",
        "Nombrá la rutina que sigue encendida cuando vos no estás.",
        "¿Hay circuito, o otro evento?",
      ),
    ],
  },
  10: {
    codigo: 10,
    nombre: DICCIONARIO_LIMITES[10].nombre,
    sensacion: "Autoría. El origen no se pide prestado.",
    r1: "Extravío. Desconexión de la fuente.",
    r2: "Se corona o se hace aprendiz eterno. Pose.",
    cruce: "Habita el eje con una conducta, no con un lema. El asiento que se le dice sigue siendo 7.",
    variante: "Eso es pose. Habla y actúa como dueño del estándar.",
    tiempos: [
      t(
        1,
        "De dónde habla: título o eje.",
        "Estás en [escena]. Si es título, se cae. Si es eje, se queda.",
        "¿De dónde hablás?",
        "¿Hay origen, o título / aprendiz eterno?",
      ),
      t(
        2,
        "Sentir la autoría, no la corona.",
        "No se corona. El eje pesa.",
        "Si te sacan el título, ¿qué queda operando?",
        "¿Quedó conducta de dueño, o vacío de eje?",
      ),
      t(
        3,
        "Una conducta coherente, no un lema.",
        "R2 declara un lema o se subordina.",
        "¿Cuál es la conducta de hoy que no se pide prestada?",
        "¿Hay conducta, o pose?",
      ),
    ],
  },
};

export function fichaLimiteDe(codigo: CodigoLimite): FichaVivaLimite {
  return FICHAS_LIMITE[codigo];
}

export function tiempoLimiteDe(
  codigo: CodigoLimite,
  tiempo: TiempoId,
): TiempoFicha {
  return FICHAS_LIMITE[codigo].tiempos[tiempo - 1];
}

export function conEscena(plantilla: string, origen: string): string {
  const escena = origen.trim().replace(/\s+/g, " ").slice(0, 180) || "este cuarto";
  return plantilla.replace(/\[escena\]/g, escena);
}

export function esCodigoGimnasio(n: number): n is CodigoLimite {
  return Number.isInteger(n) && n >= 1 && n <= 10;
}

export function esTiempoId(n: number): n is TiempoId {
  return n === 1 || n === 2 || n === 3;
}
