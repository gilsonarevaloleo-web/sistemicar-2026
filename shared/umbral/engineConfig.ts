/**
 * Umbral v2 — Motor de los 10 Códigos
 * Núcleo de datos, lenguaje y validación (sin UI).
 *
 * Modos:
 * - INTERNO_HABILIDAD → "La Forja" (desarrollo de habilidad)
 * - EXTERNO_VENTAS → "La Arena" (entrenador de ventas)
 *
 * Nota: no usar "Espejo" aquí — ese nombre es el módulo clínico `/espejo`.
 *
 * Spec: umbral v2. primera parte (WPS)
 */

export type ModoUmbral = "INTERNO_HABILIDAD" | "EXTERNO_VENTAS";

export type CodigoNumero = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface ModoInternoConfig {
  preguntaDisparadora: string;
  estadoMentalUsuario: string;
  criterioAprobacion: string;
  instruccionEvaluadorGemini: string;
}

export interface ModoExternoConfig {
  objecionCliente: string;
  estadoMentalCliente: string;
  criterioAprobacionVendedor: string;
  instruccionEvaluadorGemini: string;
  /** Nombre del arquetipo de cliente (La Arena). */
  arquetipoNombre: string;
  /** Resumen breve del comportamiento psicológico del cliente. */
  actitudCliente: string;
  /** Objeción / barrera de entrada en primera persona. */
  fraseTipica: string;
  /** Instrucción táctica: qué debe desactivar el vendedor. */
  misionVendedor: string;
}

export interface ConfiguracionCodigo {
  numero: CodigoNumero;
  nombre: string;
  conceptoClave: string;
  modoInterno: ModoInternoConfig;
  modoExterno: ModoExternoConfig;
}

export interface HistorialUmbralItem {
  rol: "user" | "system";
  texto: string;
}

export interface PromptEvaluacionInput {
  codigo: CodigoNumero;
  modo: ModoUmbral;
  respuestaUsuario: string;
  /** Contexto opcional de turnos previos (Umbral v2 parte 2). */
  historialPrevio?: HistorialUmbralItem[];
}

export interface EvaluacionGeminiJson {
  aprobado: boolean;
  feedbackConfrontativo: string;
  codigoSiguiente: number | null;
}

export interface PromptEvaluacion {
  system: string;
  user: string;
  responseSchema: EvaluacionGeminiJson;
  codigo: CodigoNumero;
  modo: ModoUmbral;
  nombreCodigo: string;
}

export const MODOS_UMBRAL: Record<
  ModoUmbral,
  { id: ModoUmbral; label: string; alias: string }
> = {
  INTERNO_HABILIDAD: {
    id: "INTERNO_HABILIDAD",
    label: "La Forja",
    alias: "Desarrollo de Habilidad",
  },
  EXTERNO_VENTAS: {
    id: "EXTERNO_VENTAS",
    label: "La Arena",
    alias: "Entrenador de Ventas",
  },
};

export const CODIGOS_NUMERO: readonly CodigoNumero[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
];

/** Diccionario completo de los 10 Códigos — lenguaje Sistemicar. */
export const DICCIONARIO_CODIGOS: Record<CodigoNumero, ConfiguracionCodigo> = {
  1: {
    numero: 1,
    nombre: "Código 1: La Claridad / La Atención / Utilidad",
    conceptoClave:
      "Nombrar la excusa puntual (interno) y demostrar utilidad directa sin floritura (externo).",
    modoInterno: {
      preguntaDisparadora:
        "¿Cuál es la excusa exacta —una sola frase— con la que estás desviando la atención de lo que sí tracciona hoy?",
      estadoMentalUsuario:
        "Niebla operativa: se siente ocupado, pero no delimita el punto de interferencia. Confunde ruido con trabajo.",
      criterioAprobacion:
        "Nombra una excusa puntual, concreta y medible (qué, cuándo, dónde). Sin generalidades tipo «estoy mal» o «no tengo tiempo».",
      instruccionEvaluadorGemini:
        "Evalúa si el operador aisló UNA excusa puntual con densidad quirúrgica. Rechaza vaguedad, victimismo difuso o listas infinitas. Aprueba solo si hay un crack nombrado que pueda cortarse hoy.",
    },
    modoExterno: {
      objecionCliente:
        "«No veo para qué me sirve esto» / «Suena interesante, pero no es para mí».",
      estadoMentalCliente:
        "Atención fragmentada: busca una utilidad inmediata o sale. Desconfía del discurso abstracto.",
      criterioAprobacionVendedor:
        "El vendedor enuncia un beneficio concreto ligado al dolor del cliente en una frase útil, sin jerga ni promesa mágica.",
      instruccionEvaluadorGemini:
        "Evalúa si el vendedor demostró utilidad directa y específica al cliente. Rechaza pitch genérico, features sin beneficio o lenguaje de «flor». Aprueba solo si el cliente podría repetir en una frase para qué le sirve.",
      arquetipoNombre: "El Apático / Distraído",
      actitudCliente:
        "Atención fragmentada: escucha a medias y solo se engancha si percibe utilidad inmediata. Cualquier abstracción lo hace desconectar.",
      fraseTipica:
        "Suena interesante… pero no veo para qué me sirve esto. No es para mí.",
      misionVendedor:
        "Desactivar la apatía con un beneficio concreto, ligado a su dolor, en una sola frase útil — cero jerga, cero flor.",
    },
  },
  2: {
    numero: 2,
    nombre: "Código 2: El Social / El Apalancamiento / La Suma",
    conceptoClave:
      "Desglosar limitaciones propias (interno) y sumar beneficios + facilidad percibida (externo).",
    modoInterno: {
      preguntaDisparadora:
        "¿Qué limitación estás tratando como destino fijo, y qué parte de esa limitación sí se puede desglosar y mover hoy?",
      estadoMentalUsuario:
        "Se siente solo o «sin respaldo». Convierte expectativas sociales en freno y no apalanca lo que ya tiene.",
      criterioAprobacion:
        "Desglosa la limitación en piezas accionables y nombra al menos un apalancamiento real (persona, recurso, activo o hábito ya disponible).",
      instruccionEvaluadorGemini:
        "Evalúa si hay desglose de limitaciones (no queja social) y un apalancamiento concreto. Rechaza victimismo de «nadie me ayuda» sin tracción. Aprueba si aparece suma: limitación partida + recurso usable.",
    },
    modoExterno: {
      objecionCliente:
        "«Ya tengo algo parecido» / «No necesito más» / «Mi entorno no lo va a entender».",
      estadoMentalCliente:
        "Compara y resta. Necesita ver que esto SUMA encima de lo que ya tiene, no que lo reemplaza con más carga.",
      criterioAprobacionVendedor:
        "El vendedor suma un beneficio adicional claro y reduce fricción percibida (facilidad de adopción) sin atacar lo que el cliente ya usa.",
      instruccionEvaluadorGemini:
        "Evalúa si el vendedor agregó valor incremental (suma) y facilidad. Rechaza descalificar al competidor o al status quo sin aportar. Aprueba si el cliente gana un plus concreto con menor esfuerzo aparente.",
      arquetipoNombre: "El Abrumado / Incapaz",
      actitudCliente:
        "Se siente saturado: compara, resta y teme sumar otra carga. Protege lo que ya tiene porque cree que no da para más.",
      fraseTipica:
        "Ya tengo algo parecido. No necesito más — mi entorno no lo va a entender.",
      misionVendedor:
        "Desactivar la sensación de sobrecarga mostrando suma incremental y facilidad de adopción, sin atacar su status quo.",
    },
  },
  3: {
    numero: 3,
    nombre: "Código 3: El Tiempo / La Laboriosidad / Practicidad",
    conceptoClave:
      "Reconocer esfuerzo sin tracción (interno) y vencer pereza demostrando factibilidad (externo).",
    modoInterno: {
      preguntaDisparadora:
        "¿En qué estás gastando horas que solo te hacen sentir laborioso, pero te dejan en el mismo punto de tracción?",
      estadoMentalUsuario:
        "Trabajador ciego: confunde movimiento con avance. El tiempo se le escapa entre tareas de ocupación.",
      criterioAprobacion:
        "Admite falta de resultados a pesar del tiempo invertido y nombra una acción práctica que mide tracción real (no ocupación).",
      instruccionEvaluadorGemini:
        "Evalúa reconocimiento de esfuerzo estéril + acción práctica de tracción. Rechaza más listas de tareas o «voy a organizarme mejor» sin métrica. Aprueba si hay corte a la fuga de tiempo.",
    },
    modoExterno: {
      objecionCliente:
        "«No tengo tiempo» / «Suena trabajoso» / «Después lo veo».",
      estadoMentalCliente:
        "Pereza disfrazada de agenda. Necesita ver que es factible en un bloque corto y concreto.",
      criterioAprobacionVendedor:
        "El vendedor demuestra practicidad: un primer paso factible en minutos/horas, con costo temporal explícito y bajo.",
      instruccionEvaluadorGemini:
        "Evalúa si se venció la objeción de tiempo con factibilidad real. Rechaza minimizar el esfuerzo con frases vacías. Aprueba si hay un camino práctico, acotado y creíble para empezar.",
      arquetipoNombre: "El Postergador / Perezoso",
      actitudCliente:
        "Aplaza con la agenda como escudo. No rechaza de frente: diluye el momento de decisión hasta que se enfríe.",
      fraseTipica:
        "No tengo tiempo. Suena trabajoso… después lo veo.",
      misionVendedor:
        "Desactivar la postergación con un primer paso factible, acotado en minutos/horas y con costo temporal explícito.",
    },
  },
  4: {
    numero: 4,
    nombre: 'Código 4: La Seriedad / Cero "Flor"',
    conceptoClave:
      "Romper la ilusión y fijar ruta estructurada (interno); validar el trauma de engaños previos (externo).",
    modoInterno: {
      preguntaDisparadora:
        "¿Qué ilusión o «flor» estás usando para no mirar la ruta dura, y cuál es la acción mínima + máxima de hoy?",
      estadoMentalUsuario:
        "Oscila entre fantasía motivacional y evitación. Evita la seriedad porque implica exponerse al estándar.",
      criterioAprobacion:
        "Rompe la ilusión con una ruta estructurada: acción mínima (hoy) y acción máxima (estándar). Cero floritura.",
      instruccionEvaluadorGemini:
        "Evalúa ruptura de ilusión + estructura mínima/máxima. Rechaza frases inspiracionales, promesas vagas o «ya veré». Aprueba solo con seriedad operativa: hechos, plazos, estándar.",
    },
    modoExterno: {
      objecionCliente:
        "«Ya me han engañado antes» / «Suena demasiado bonito» / «No confío».",
      estadoMentalCliente:
        "Trauma comercial: busca señales de seriedad y odia el humo. Cualquier «flor» confirma su desconfianza.",
      criterioAprobacionVendedor:
        "El vendedor valida el trauma sin dramatizar y responde con evidencia, límites claros y cero floritura.",
      instruccionEvaluadorGemini:
        "Evalúa validación del trauma + prueba de seriedad (hechos, condiciones, evidencia). Rechaza seducción emocional o promesas absolutas. Aprueba si hay tono de ingeniería, no de marketing.",
      arquetipoNombre: "El Cínico / Curado de Espantos",
      actitudCliente:
        "Trauma comercial activo: asume humo hasta prueba contraria. Cualquier floritura confirma que «otra vez es lo mismo».",
      fraseTipica:
        "Ya me han engañado antes. Suena demasiado bonito — no confío.",
      misionVendedor:
        "Desactivar el cinismo validando el trauma y respondiendo con evidencia, límites claros y cero floritura.",
    },
  },
  5: {
    numero: 5,
    nombre: "Código 5: El Cálculo / La Estadística",
    conceptoClave:
      "Métricas frías y casuística (interno); números, ROI y tasas de conversión (externo).",
    modoInterno: {
      preguntaDisparadora:
        "¿Cuáles son los números reales de tu situación —no la sensación— y qué casuística demuestra que tu hipótesis está rota o viva?",
      estadoMentalUsuario:
        "Navega por intuición y anécdotas. Evita el frío del cálculo porque confronta la fantasía de avance.",
      criterioAprobacion:
        "Presenta métricas concretas (cantidades, tasas, frecuencias) y al menos un caso que sostenga o tumbe su relato.",
      instruccionEvaluadorGemini:
        "Evalúa presencia de números y casuística. Rechaza sensaciones («siento que va bien») sin datos. Aprueba si hay cálculo frío usable para decidir.",
    },
    modoExterno: {
      objecionCliente:
        "«¿Y los números?» / «¿Cuánto retorno?» / «Muéstreme datos, no historias».",
      estadoMentalCliente:
        "Modo auditor: quiere ROI, conversión y rangos creíbles. Descuenta el storytelling.",
      criterioAprobacionVendedor:
        "El vendedor formula números claros (costo, retorno esperado, tasa o rango) sin inventar precisión falsa.",
      instruccionEvaluadorGemini:
        "Evalúa formulación numérica (ROI, conversión, rangos). Rechaza estadísticas inventadas o vaguedad cuantitativa. Aprueba si los números son coherentes y honestos sobre incertidumbre.",
      arquetipoNombre: "El Escéptico Frío",
      actitudCliente:
        "Modo auditor: descuenta el storytelling y solo se mueve con ROI, tasas y rangos creíbles. La anécdota no le alcanza.",
      fraseTipica:
        "¿Y los números? Muéstreme datos y retorno — no historias.",
      misionVendedor:
        "Desactivar el escepticismo con números claros (costo, retorno, tasa o rango) sin inventar precisión falsa.",
    },
  },
  6: {
    numero: 6,
    nombre: "Código 6: La Experiencia / El Roce",
    conceptoClave:
      "Enfrentar fricción física y miedo al rechazo (interno); transferir alivio sensorial y tranquilidad (externo).",
    modoInterno: {
      preguntaDisparadora:
        "¿Dónde estás evitando el roce real —la exposición, la llamada, la puerta— por miedo al rechazo, y cuál es el contacto mínimo de hoy?",
      estadoMentalUsuario:
        "Fobia al rechazo y fatiga anticipada. Prefiere ensayar en la mente antes que entrar en la arena.",
      criterioAprobacion:
        "Nombra la fricción física concreta y un acto de roce mínimo que se ejecutará (no se «pensará»).",
      instruccionEvaluadorGemini:
        "Evalúa enfrentamiento con fricción real. Rechaza planes de preparación infinita. Aprueba si hay contacto/exposición definida con cuerpo en juego.",
    },
    modoExterno: {
      objecionCliente:
        "«No quiero complicarme» / «Me genera ansiedad» / «Necesito sentirme seguro».",
      estadoMentalCliente:
        "Busca alivio: menos carga sensorial, más tranquilidad percibida. Compra paz, no solo producto.",
      criterioAprobacionVendedor:
        "El vendedor transfiere sensación de alivio/tranquilidad con una experiencia concreta (demo, prueba, ritual de uso) sin anestesia falsa.",
      instruccionEvaluadorGemini:
        "Evalúa transferencia sensorial de alivio. Rechaza promesas abstractas de «tranquilidad». Aprueba si el cliente puede imaginar/vivir un roce concreto que reduce miedo.",
      arquetipoNombre: "El Temeroso / Tímido",
      actitudCliente:
        "Compra paz, no solo producto. Anticipa fricción y rechazo; necesita alivio sensorial y un camino de bajo riesgo.",
      fraseTipica:
        "No quiero complicarme. Me genera ansiedad — necesito sentirme seguro.",
      misionVendedor:
        "Desactivar el miedo con una experiencia concreta (demo, prueba, ritual) que transfiera alivio real, sin anestesia falsa.",
    },
  },
  7: {
    numero: 7,
    nombre: "Código 7: La Justicia / Lo Bueno y lo Malo",
    conceptoClave:
      "Desmontar culpa por cobrar/exponerse (interno); equilibrar valor e intercambio (externo).",
    modoInterno: {
      preguntaDisparadora:
        "¿Qué culpa te impide cobrar, exponer tu habilidad o marcar territorio, y qué estándar de intercambio justo vas a sostener?",
      estadoMentalUsuario:
        "Juicio moral interno: «cobrar es malo», «exponerme es soberbia». Confunde humildad con autodescuento.",
      criterioAprobacion:
        "Desmonta la culpa con un criterio de justicia operativa: valor entregado ↔ intercambio exigido.",
      instruccionEvaluadorGemini:
        "Evalúa desmontaje de culpa y definición de intercambio justo. Rechaza autoflagelación o justificación eterna. Aprueba si el operador sostiene precio/estándar sin pedirle permiso a la culpa.",
    },
    modoExterno: {
      objecionCliente:
        "«Está caro» / «No es justo» / «Otro cobra menos por lo mismo».",
      estadoMentalCliente:
        "Negocia desde equidad percibida. Necesita ver la balanza valor/precio, no un descuento emocional.",
      criterioAprobacionVendedor:
        "El vendedor equilibra valor e intercambio: explica qué sostiene el precio y qué se pierde al elegir lo barato, sin humillar.",
      instruccionEvaluadorGemini:
        "Evalúa equilibrio de valor/intercambio. Rechaza bajar precio por pánico o moralizar al cliente. Aprueba si la justicia del intercambio queda clara y firme.",
      arquetipoNombre: "El Moralista / Justiciero",
      actitudCliente:
        "Juzga el intercambio desde equidad percibida. «Caro» es una sentencia moral: necesita ver la balanza valor/precio, no un descuento emocional.",
      fraseTipica:
        "Está caro. No es justo — otro cobra menos por lo mismo.",
      misionVendedor:
        "Desactivar el juicio moral equilibrando valor e intercambio: qué sostiene el precio y qué se pierde al elegir lo barato, sin humillar.",
    },
  },
  8: {
    numero: 8,
    nombre: "Código 8: La Persistencia / La Estrategia",
    conceptoClave:
      "Constancia frente al desgaste (interno); manejar negociaciones complejas (externo).",
    modoInterno: {
      preguntaDisparadora:
        "¿En qué punto del desgaste sueles abandonar, y cuál es la estrategia de constancia (no de motivacion) para atravesarlo?",
      estadoMentalUsuario:
        "Arranca fuerte y colapsa. Confunde persistencia con sufrimiento heroico; le falta estrategia de mantenimiento.",
      criterioAprobacion:
        "Define una estrategia de persistencia: ritmo, checkpoints y qué no se negocia cuando aparece el desgaste.",
      instruccionEvaluadorGemini:
        "Evalúa constancia estratégica frente al desgaste. Rechaza «voy a esforzarme más» sin método. Aprueba si hay plan de atravesar el valle, no solo deseo.",
    },
    modoExterno: {
      objecionCliente:
        "«Lo tengo que pensar» / «Hablemos con más personas» / «Vuelva en dos semanas» (negociaciones largas).",
      estadoMentalCliente:
        "Multiplica stakeholders y diluye. Prueba si el vendedor sostiene el marco o se desgasta.",
      criterioAprobacionVendedor:
        "El vendedor maneja la negociación compleja: sostiene marco, aclara siguientes pasos y no regala el proceso por ansiedad.",
      instruccionEvaluadorGemini:
        "Evalúa manejo estratégico de negociación compleja. Rechaza chase desesperado o cierre agresivo vacío. Aprueba si hay persistencia con marco y movimiento claro.",
      arquetipoNombre: "El Negociador Duro",
      actitudCliente:
        "Estira el proceso: multiplica stakeholders y diluye la decisión. Prueba si el vendedor sostiene el marco o se desgasta.",
      fraseTipica:
        "Lo tengo que pensar. Hablemos con más personas — vuelva en dos semanas.",
      misionVendedor:
        "Desactivar la dilación sosteniendo el marco, aclarando siguientes pasos y sin regalar el proceso por ansiedad.",
    },
  },
  9: {
    numero: 9,
    nombre: "Código 9: La Integración / El Sistema",
    conceptoClave:
      "Consolidar rutina diaria (interno); cierre natural y escalabilidad (externo).",
    modoInterno: {
      preguntaDisparadora:
        "¿Qué parte de tu práctica sigue siendo evento heroico y aún no es sistema/rutina diaria integrable?",
      estadoMentalUsuario:
        "Picos de intensidad sin integración. Sabe qué hacer, pero no lo convierte en circuito estable.",
      criterioAprobacion:
        "Consolida una rutina diaria concreta (cuándo, dónde, duración, trigger) que integre el código al sistema de vida/trabajo.",
      instruccionEvaluadorGemini:
        "Evalúa consolidación sistémica. Rechaza planes semanales vagos o «cuando pueda». Aprueba si hay rutina integrable y repetible.",
    },
    modoExterno: {
      objecionCliente:
        "«¿Y después del cierre?» / «¿Escala conmigo?» / «No quiero algo que se caiga al mes».",
      estadoMentalCliente:
        "Piensa en continuidad. Teme soluciones puntuales que no escalan ni se sostienen.",
      criterioAprobacionVendedor:
        "El vendedor muestra cierre natural + vía de escalabilidad/continuidad sin presión teatral.",
      instruccionEvaluadorGemini:
        "Evalúa cierre natural y escalabilidad del sistema ofrecido. Rechaza cierres forzados o promesas de escala sin mecanismo. Aprueba si el siguiente estado post-compra es claro y sostenible.",
      arquetipoNombre: "El Perfeccionista / Exigente",
      actitudCliente:
        "Exige continuidad y estándar: teme soluciones puntuales que se caen al mes. No compra el pico; compra el sistema que sostiene.",
      fraseTipica:
        "¿Y después del cierre? ¿Escala conmigo? No quiero algo que se caiga al mes.",
      misionVendedor:
        "Desactivar la exigencia mostrando cierre natural y una vía creíble de escalabilidad/continuidad, sin presión teatral.",
    },
  },
  10: {
    numero: 10,
    nombre: "Código 10: El Dominio Total / La Identidad",
    conceptoClave:
      "Asumir el rol por completo (interno); fidelizar desde autoridad (externo).",
    modoInterno: {
      preguntaDisparadora:
        "¿Qué identidad vieja sigues habitando para no asumir el rol completo de quien ya opera este sistema?",
      estadoMentalUsuario:
        "Sabe el mapa pero aún se presenta como aprendiz eterno. Evita la autoría del dominio.",
      criterioAprobacion:
        "Asume el rol con declaración de identidad operativa + conducta coherente (no pose). Dominio = responsabilidad, no ego.",
      instruccionEvaluadorGemini:
        "Evalúa asunción plena del rol/identidad. Rechaza pose motivacional o título vacío. Aprueba si hay autoría: el operador habla y actúa como dueño del estándar.",
    },
    modoExterno: {
      objecionCliente:
        "«¿Por qué usted?» / «¿Me van a acompañar después?» / búsqueda de autoridad confiable y relación continua.",
      estadoMentalCliente:
        "Busca un referente, no solo un producto. Quiere fidelización con autoridad real.",
      criterioAprobacionVendedor:
        "El vendedor sostiene autoridad limpia y propone continuidad/fidelización sin subordinarse ni endiosarse.",
      instruccionEvaluadorGemini:
        "Evalúa autoridad + fidelización. Rechaza arrogancia vacía o servilismo. Aprueba si el vendedor se posiciona como referente creíble con relación post-venta clara.",
      arquetipoNombre: "El Soberano / Aliado",
      actitudCliente:
        "Busca un referente con autoridad real y relación continua — no solo un producto. Decide con quien se alía, no con quien ruega.",
      fraseTipica:
        "¿Por qué usted? ¿Me van a acompañar después, o desaparecen al cobrar?",
      misionVendedor:
        "Desactivar la prueba de autoridad posicionándote como referente creíble y proponiendo fidelización sin subordinarte ni endiosarte.",
    },
  },
};

export function obtenerCodigo(
  codigo: CodigoNumero,
): ConfiguracionCodigo {
  return DICCIONARIO_CODIGOS[codigo];
}

export function siguienteCodigo(
  codigo: CodigoNumero,
): CodigoNumero | null {
  if (codigo >= 10) return null;
  return (codigo + 1) as CodigoNumero;
}

export function isCodigoNumero(value: unknown): value is CodigoNumero {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 10
  );
}

export function isModoUmbral(value: unknown): value is ModoUmbral {
  return value === "INTERNO_HABILIDAD" || value === "EXTERNO_VENTAS";
}

/**
 * Regla de avance del Umbral v2 (parte 2):
 * - aprobado + código < 10 → codigoActual + 1
 * - aprobado + código 10 → null (módulo completado)
 * - no aprobado → permanece en codigoActual
 */
export function resolverCodigoSiguiente(
  aprobado: boolean,
  codigoActual: CodigoNumero,
): CodigoNumero | null {
  if (!aprobado) return codigoActual;
  return siguienteCodigo(codigoActual);
}

/**
 * Arma el prompt de evaluación para Gemini.
 * La respuesta del modelo DEBE ser JSON estricto:
 * { aprobado: boolean, feedbackConfrontativo: string, codigoSiguiente: number | null }
 */
export function obtenerPromptEvaluacion(
  input: PromptEvaluacionInput,
): PromptEvaluacion {
  const { codigo, modo, respuestaUsuario, historialPrevio = [] } = input;
  const cfg = obtenerCodigo(codigo);
  const modoMeta = MODOS_UMBRAL[modo];
  const next = siguienteCodigo(codigo);

  const bloqueModo =
    modo === "INTERNO_HABILIDAD"
      ? [
          `MODO: INTERNO_HABILIDAD ("${modoMeta.label}" / ${modoMeta.alias})`,
          `Pregunta disparadora: ${cfg.modoInterno.preguntaDisparadora}`,
          `Estado mental esperado del usuario: ${cfg.modoInterno.estadoMentalUsuario}`,
          `Criterio de aprobación: ${cfg.modoInterno.criterioAprobacion}`,
          `Instrucción de evaluación: ${cfg.modoInterno.instruccionEvaluadorGemini}`,
        ].join("\n")
      : [
          `MODO: EXTERNO_VENTAS ("${modoMeta.label}" / ${modoMeta.alias})`,
          `Objeción típica del cliente: ${cfg.modoExterno.objecionCliente}`,
          `Estado mental del cliente: ${cfg.modoExterno.estadoMentalCliente}`,
          `Criterio de aprobación del vendedor: ${cfg.modoExterno.criterioAprobacionVendedor}`,
          `Instrucción de evaluación: ${cfg.modoExterno.instruccionEvaluadorGemini}`,
        ].join("\n");

  const historialTxt =
    historialPrevio.length === 0
      ? "(sin historial previo)"
      : historialPrevio
          .slice(-16)
          .map((h, i) => {
            const rol = h.rol === "system" ? "system" : "user";
            const texto = String(h.texto ?? "").trim();
            return `${i + 1}. [${rol}] ${texto || "(vacío)"}`;
          })
          .join("\n");

  const system = [
    "Eres el Evaluador Confrontativo del Umbral v2 (Sistemicar).",
    "Tu trabajo es aprobar o rechazar con criterio clínico-técnico, sin New Age y sin floritura.",
    "Lenguaje: tracción, caudal, territorio, soberanía, fricción, estándar, intercambio.",
    "Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto fuera del JSON) con esta forma exacta:",
    '{"aprobado": boolean, "feedbackConfrontativo": string, "codigoSiguiente": number | null}',
    "",
    "Reglas de codigoSiguiente:",
    `- Si aprobado === true y codigo < 10: codigoSiguiente = ${next ?? "null"}.`,
    `- Si aprobado === true y codigo === 10: codigoSiguiente = null (módulo completado).`,
    `- Si aprobado === false: codigoSiguiente = ${codigo} (el operador no avanza).`,
    "",
    "feedbackConfrontativo: 2–5 frases. Directo, densificado, sin consuelo vacío. Si rechazas, nombra el fallo exacto y qué faltó.",
    "",
    `CÓDIGO EN EVALUACIÓN: ${cfg.nombre}`,
    `Concepto clave: ${cfg.conceptoClave}`,
    bloqueModo,
  ].join("\n");

  const user = [
    "HISTORIAL PREVIO:",
    historialTxt,
    "",
    "Respuesta del operador a evaluar:",
    "---",
    respuestaUsuario.trim() || "(vacío)",
    "---",
    "Evalúa ahora y responde solo el JSON.",
  ].join("\n");

  return {
    system,
    user,
    responseSchema: {
      aprobado: false,
      feedbackConfrontativo: "",
      codigoSiguiente: codigo,
    },
    codigo,
    modo,
    nombreCodigo: cfg.nombre,
  };
}

/** Prompt único (system + user) listo para callGemini. */
export function serializarPromptEvaluacion(prompt: PromptEvaluacion): string {
  return `${prompt.system}\n\n${prompt.user}`;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickBool(obj: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "true" || s === "sí" || s === "si" || s === "aprobado") return true;
      if (s === "false" || s === "no" || s === "rechazado") return false;
    }
    if (typeof v === "number") return v !== 0;
  }
  return null;
}

/**
 * Parsea la respuesta cruda de Gemini a EvaluacionGeminiJson.
 * Tolera aliases de campos y JSON envuelto en markdown.
 */
export function parseEvaluacionGemini(
  raw: string,
  codigoActual: CodigoNumero,
): EvaluacionGeminiJson {
  const text = String(raw ?? "").trim();
  if (!text) throw new Error("Respuesta vacía de Gemini");

  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON en respuesta de Gemini");

  let parsed: any;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    // Segundo intento: quitar control chars frecuentes.
    const repaired = match[0]
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
      .replace(/,\s*([}\]])/g, "$1");
    parsed = JSON.parse(repaired);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("JSON de evaluación inválido");
  }

  const obj = parsed as Record<string, unknown>;
  const aprobado =
    pickBool(obj, ["aprobado", "approved", "pass", "ok"]) ?? false;
  const feedbackConfrontativo = pickString(obj, [
    "feedbackConfrontativo",
    "feedback_confrontativo",
    "feedback",
    "devolucion",
    "mensaje",
    "razon",
    "motivo",
  ]);

  if (!feedbackConfrontativo) {
    throw new Error("Gemini omitió feedbackConfrontativo");
  }

  return {
    aprobado,
    feedbackConfrontativo: feedbackConfrontativo.slice(0, 1200),
    codigoSiguiente: resolverCodigoSiguiente(aprobado, codigoActual),
  };
}

/**
 * Evaluador local de respaldo cuando Gemini falla/timeout/parsea mal.
 * Criterio mínimo: densidad + señales del código activo.
 */
export function evaluarUmbralLocal(
  input: PromptEvaluacionInput,
): EvaluacionGeminiJson {
  const cfg = obtenerCodigo(input.codigo);
  const texto = input.respuestaUsuario.trim();
  const words = texto.split(/\s+/).filter(Boolean);
  const denseEnough = texto.length >= 40 && words.length >= 8;

  const signalsInterno = [
    /excusa|puntual|hoy|acción|accion|mínima|minima|número|numero|métrica|metrica|ruta|estándar|estandar|fricción|friccion|cobrar|rechazo|rutina|identidad|rol/i,
  ];
  const signalsExterno = [
    /beneficio|utilidad|cliente|roi|precio|valor|cierre|prueba|minutos|fácil|facil|evidencia|retorno|escala|autoridad/i,
  ];
  const signals =
    input.modo === "INTERNO_HABILIDAD" ? signalsInterno : signalsExterno;
  const hasSignal = signals.some((re) => re.test(texto));
  const aprobado = denseEnough && hasSignal;

  const feedbackConfrontativo = aprobado
    ? `APROBADO (evaluador local de respaldo). Cumples densidad mínima y señales del ${cfg.nombre}. El criterio clave: ${cfg.conceptoClave}`
    : `RECHAZADO (evaluador local de respaldo). Tu respuesta es demasiado vaga o no toca el criterio del ${cfg.nombre}. ` +
      (input.modo === "INTERNO_HABILIDAD"
        ? `Reescribe nombrando el hecho puntual y la acción concreta. Criterio: ${cfg.modoInterno.criterioAprobacion}`
        : `Reescribe con utilidad/evidencia concreta ante la objeción. Criterio: ${cfg.modoExterno.criterioAprobacionVendedor}`);

  return {
    aprobado,
    feedbackConfrontativo,
    codigoSiguiente: resolverCodigoSiguiente(aprobado, input.codigo),
  };
}
