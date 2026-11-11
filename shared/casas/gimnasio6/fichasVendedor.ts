/**
 * Fichas vivas de la Puerta B (Vendedor).
 * C1 es el Cortador de Niebla, no el cimiento del Umbral.
 * Tres tiempos por código. No se califica el pitch.
 */

import {
  FICHAS_MAESTRO,
  type FichaMaestroCodigo,
} from "../../umbral/maestroConfig.ts";
import type { CodigoLimite } from "../umbral5/diccionarioLimites.ts";
import type { FichaVivaLimite, TiempoFicha, TiempoId } from "./fichasLimite.ts";
import { NOMBRE_TIEMPO } from "./fichasLimite.ts";

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

function deMaestro(
  f: FichaMaestroCodigo,
  tiempos: readonly [TiempoFicha, TiempoFicha, TiempoFicha],
): FichaVivaLimite {
  return {
    codigo: f.numero as CodigoLimite,
    nombre: f.voz,
    sensacion: f.caracter,
    r1: f.resistencia1Arena,
    r2: f.resistencia2Arena,
    cruce: f.fraseCruce,
    variante: f.fraseQuiebre,
    tiempos,
  };
}

export const FICHAS_VENDEDOR: Record<CodigoLimite, FichaVivaLimite> = {
  1: deMaestro(FICHAS_MAESTRO[1], [
    t(
      1,
      "Una frase. Un crack. Cero lista.",
      "Estás en [escena]. El Apático pide utilidad o se va. Vos no explicás más.",
      "¿Cuál es LA frase, no la lista?",
      "¿Hay una frase cortable, o niebla / biografía?",
    ),
    t(
      2,
      "Sentir el crack. R1 es la niebla.",
      "Esa lista es niebla. El Cortador no consuela.",
      "Devolvé la UNA frase con la que te desviás. ¿Cuál es?",
      "¿Cortó a una frase, o explicó más?",
    ),
    t(
      3,
      "Cuando R2 pega (explica más), sostener el corte.",
      "El cliente bosteza. R2 quiere otro párrafo.",
      "Hoy. Una oración. ¿Cuál se puede cortar ahora?",
      "¿Sostuvo el corte, o volvió a la lista?",
    ),
  ]),
  2: deMaestro(FICHAS_MAESTRO[2], [
    t(
      1,
      "Suma fina sobre lo que ya tiene. Nunca resta.",
      "Estás en [escena]. El Abrumado compara y resta.",
      "¿Qué ya tiene, que no hay que tirar?",
      "¿Nombró un recurso ya disponible, o restó?",
    ),
    t(
      2,
      "Partir la limitación. Plus delgado.",
      "No le pidas que tire lo que tiene.",
      "¿Cuál es el plus que no pesa?",
      "¿Hay suma, o otra carga?",
    ),
    t(
      3,
      "R2 ataca el status quo. Sostener la suma.",
      "R2 quiere agregar otra carga o quejarse del entorno.",
      "Sin restar. ¿Cuál es la facilidad que queda?",
      "¿Sostuvo la suma, o restó?",
    ),
  ]),
  3: deMaestro(FICHAS_MAESTRO[3], [
    t(
      1,
      "Minutos, bloque, primer paso. El reloj manda.",
      "Estás en [escena]. «Después lo veo» es escudo.",
      "¿Cuántos minutos y cuál es el primer paso?",
      "¿Hay bloque temporal, o ocupación?",
    ),
    t(
      2,
      "Sentir la tracción del bloque, no el sermón.",
      "«No tengo tiempo» es restricción de diseño.",
      "¿Cuál es el bloque creíble de hoy, no la jornada?",
      "¿Hay bloque, o «organizarme mejor»?",
    ),
    t(
      3,
      "R2 acepta el «después». Cortar la fuga.",
      "R2 minimiza el esfuerzo para no tensionar.",
      "El «después» se cae. ¿Qué se ejecuta en esos minutos?",
      "¿Cortó la fuga, o aceptó el después?",
    ),
  ]),
  4: deMaestro(FICHAS_MAESTRO[4], [
    t(
      1,
      "Hechos, límites, evidencia. Cero flor.",
      "Estás en [escena]. El Cínico trae trauma comercial.",
      "¿Cuál es el hecho, no la flor?",
      "¿Hay hecho, o humo?",
    ),
    t(
      2,
      "Pararse al lado con un límite. La seriedad es el respeto.",
      "No suavices la cicatriz.",
      "¿Cuál es el límite de esta ruta?",
      "¿Hay límite, o inspiración?",
    ),
    t(
      3,
      "Acción mínima de hoy. R2 seduce o se defiende.",
      "R2 promete o se pone a la defensiva.",
      "Hecho + límite + ¿qué se hace hoy?",
      "¿Hay acción de hoy, o flor?",
    ),
  ]),
  5: deMaestro(FICHAS_MAESTRO[5], [
    t(
      1,
      "Números, rangos. La anécdota no alcanza.",
      "Estás en [escena]. El Escéptico Frío pide datos.",
      "¿Cuál es el número o el rango, no la gesta?",
      "¿Hay cálculo, o sensación?",
    ),
    t(
      2,
      "Un rango que se puede defender.",
      "No cuentes una gesta.",
      "¿Qué caso sostiene o tumba ese rango?",
      "¿Hay caso, o precisión falsa?",
    ),
    t(
      3,
      "R2 inventa precisión o se esconde en historias.",
      "La hipótesis ya no es clima.",
      "Sin cuento. ¿Qué métrica queda en pie?",
      "¿Sostuvo el frío, o volvió a la anécdota?",
    ),
  ]),
  6: deMaestro(FICHAS_MAESTRO[6], [
    t(
      1,
      "Contacto mínimo. El cuerpo entra.",
      "Estás en [escena]. El Temeroso compra paz.",
      "¿Cuál es la puerta de hoy, no el ensayo?",
      "¿Hay puerta, o preparación infinita?",
    ),
    t(
      2,
      "El miedo como señal de cuerpo, no discurso.",
      "Una puerta más chica. No un discurso.",
      "¿Qué roce concreto ofrece el cuerpo hoy?",
      "¿Hay roce, o anestesia?",
    ),
    t(
      3,
      "R2 promete tranquilidad abstracta. Ejecutar.",
      "El rechazo no manda el día.",
      "Sin ensayo. ¿Qué contacto se ejecuta, no se piensa?",
      "¿Puso el cuerpo, o prometió paz?",
    ),
  ]),
  7: deMaestro(FICHAS_MAESTRO[7], [
    t(
      1,
      "Valor contra intercambio. Sin descuento emocional.",
      "Estás en [escena]. El Moralista sentencia «está caro».",
      "¿Qué sostiene el precio, no la culpa?",
      "¿Hay balanza, o descuento?",
    ),
    t(
      2,
      "«Caro» es sentencia moral. Ponerla en la balanza.",
      "No descontás. Qué se pierde al elegir barato.",
      "¿Qué se pierde si elegís barato?",
      "¿Sostuvo el valor, o moralizó?",
    ),
    t(
      3,
      "R2 baja el precio por pánico.",
      "La culpa no cobra.",
      "Sin bajar. ¿Cuál es el intercambio que no negociás?",
      "¿Sostuvo, o bajó?",
    ),
  ]),
  8: deMaestro(FICHAS_MAESTRO[8], [
    t(
      1,
      "Ritmo, checkpoint. Lo que no se negocia en el valle.",
      "Estás en [escena]. El Negociador estira: «lo pienso».",
      "¿Dónde suelta el marco cuando aparece el desgaste?",
      "¿Nombró el valle, o empujó?",
    ),
    t(
      2,
      "Ritmo que atraviesa el valle. No heroísmo.",
      "No lo llames débil por cansarse.",
      "¿Cuál es el ritmo que no se negocia?",
      "¿Hay ritmo, o chase?",
    ),
    t(
      3,
      "R2 persigue o cierra agresivo y vacío.",
      "El proceso no se regala.",
      "Checkpoint. ¿Qué no se negocia bajo desgaste?",
      "¿Sostuvo el marco, o lo soltó?",
    ),
  ]),
  9: deMaestro(FICHAS_MAESTRO[9], [
    t(
      1,
      "Circuito diario. El pico heroico no escala.",
      "Estás en [escena]. El Perfeccionista teme que se caiga al mes.",
      "Si vos no estás, ¿qué sigue encendido?",
      "¿Hay circuito, o evento?",
    ),
    t(
      2,
      "Cuándo, dónde, duración, trigger.",
      "No le vendas el pico.",
      "¿Cuándo, dónde, cuánto, qué lo dispara?",
      "¿Hay trigger, o teatro de escala?",
    ),
    t(
      3,
      "R2 cierra con teatro o «cuando pueda».",
      "El sistema no depende del heroísmo.",
      "Nombrá la rutina integrable. No el pico.",
      "¿Hay rutina, o otro evento?",
    ),
  ]),
  10: deMaestro(FICHAS_MAESTRO[10], [
    t(
      1,
      "Autoría limpia. Dominio es responsabilidad, no pose.",
      "Estás en [escena]. El Soberano pregunta «¿por qué usted?».",
      "¿De dónde hablás: eje o título?",
      "¿Hay autoría, o aprendiz eterno?",
    ),
    t(
      2,
      "Habitar el rol que ya opera. No coronar.",
      "La fidelidad se sostiene con estándar, no con ruego.",
      "Si te sacan el título, ¿qué conducta queda?",
      "¿Hay conducta de dueño, o corona vacía?",
    ),
    t(
      3,
      "R2 se endiosa o se subordina.",
      "El rol no se pide prestado.",
      "Hoy. ¿Cuál es la conducta de dueño del estándar?",
      "¿Habitó el rol, o pose / servilismo?",
    ),
  ]),
};

export function fichaVendedorDe(codigo: CodigoLimite): FichaVivaLimite {
  return FICHAS_VENDEDOR[codigo];
}

export function tiempoVendedorDe(
  codigo: CodigoLimite,
  tiempo: TiempoId,
): TiempoFicha {
  return FICHAS_VENDEDOR[codigo].tiempos[tiempo - 1];
}
