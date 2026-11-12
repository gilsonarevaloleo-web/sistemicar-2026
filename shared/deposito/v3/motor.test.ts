import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEPOT_V3_MASTER_PROMPT,
  DEPOT_V3_SYNTAX_ONLY_PROMPT,
  INTENT_AWARE_SYNTAX_PROMPT,
  TONOS_MAESTRO,
  UPDATED_DEPOT_ENGINE_PROMPT,
  buildDepositoV3SystemPrompt,
  diagnosticarAuditoriaLocal,
  evaluarDepositoV3,
  procesarAuditoriaV3,
  serializarPromptAuditoria,
} from "./index.ts";

const PATRON_PISTON =
  "Vi el patrón: cada vez que salteo la secuencia a las 9:00, 9:20, 9:40 el pistón se atasca. El modelo se repite. No es que deba ser más productivo.";

describe("Depósito V3 — prompt", () => {
  it("exige geometría pura, cascada y prohíbe Óptica, Δ y juicio moral", () => {
    const system = buildDepositoV3SystemPrompt();
    assert.equal(DEPOT_V3_SYNTAX_ONLY_PROMPT, DEPOT_V3_MASTER_PROMPT);
    assert.match(DEPOT_V3_MASTER_PROMPT, /FOCO DE REVELACIÓN/i);
    assert.match(DEPOT_V3_MASTER_PROMPT, /focoRevelacionCode/);
    assert.match(system, /HIGHLY ACCURATE, MATURE adjustment/i);
    assert.match(system, /DO NOT evaluate moral truth|philosophical depth/i);
    assert.match(system, /DO NOT calculate "Perception Delta/i);
    assert.match(system, /Do NOT just pick the code with the most words/i);
    assert.match(system, /NEVER give generic advice like "repeat C3 with a number"/i);
    assert.match(INTENT_AWARE_SYNTAX_PROMPT, /ADAPT TO THE USER'S NATURAL LANGUAGE/);
    assert.match(INTENT_AWARE_SYNTAX_PROMPT, /dejé el trabajo|puse pausa al desglosador/);
    assert.match(INTENT_AWARE_SYNTAX_PROMPT, /cambio de atención|cambiar de enfoque/);
    assert.match(INTENT_AWARE_SYNTAX_PROMPT, /aprendí que|me lleva a la conclusión/);
    assert.match(INTENT_AWARE_SYNTAX_PROMPT, /el deber es el enemigo instalado/);
    assert.match(INTENT_AWARE_SYNTAX_PROMPT, /entonces.*después.*luego|narrative vessels/i);
    assert.match(UPDATED_DEPOT_ENGINE_PROMPT, /Cold Telemetry Auditor/);
    assert.match(UPDATED_DEPOT_ENGINE_PROMPT, /Do NOT force or simulate activation of higher codes/);
    assert.match(UPDATED_DEPOT_ENGINE_PROMPT, /pure transition from Flujo \(C2\) to Axiomatic Vision \(C7\)/);
    assert.match(UPDATED_DEPOT_ENGINE_PROMPT, /RESPECT SYNTACTIC VOIDS/);
    assert.match(INTENT_AWARE_SYNTAX_PROMPT, /onda de sierra|batería that empties|attention as a battery/i);
    assert.match(system, /ADAPT TO THE USER'S NATURAL LANGUAGE/);
    assert.match(system, /Deep Intent Syntax Auditor/);
    assert.match(system, /Cold Telemetry Auditor/);
    assert.match(system, /TELEMETRÍA FRÍA/);
    assert.match(system, /LEY DE LA CASCADA|C1 → C2 → C4 → C5 → C7 → C10/);
    assert.match(system, /Título es C1|Vector Cero/i);
    assert.match(system, /lowestMissingCascadeCode/);
    assert.match(system, /titleConnectedToClose/);
    assert.match(system, /Tono del Maestro/i);
    assert.match(system, /mi decisión es|decido|voy a/);
    assert.match(system, /Si C5 y C6|C5 y C6 están/);
    assert.match(system, /pregunta de inflexión|Inflection question/i);
    assert.match(system, /alma del código no cambia/i);
    assert.match(system, /TEMPERAMENTO/);
    assert.match(system, /syntacticVacios/);
    assert.match(system, /isCableadoConnected/);
    assert.match(system, /characterSignedCode/);
    assert.match(system, /activeCharacterMap/);
    assert.match(system, /Antecedent/i);
    assert.match(system, /Independent of clock time|NO EXIGE RELOJ/i);
    assert.doesNotMatch(system, /perceptionEye/);
    assert.doesNotMatch(system, /deltaGap/);
    assert.doesNotMatch(system, /FORMA \(SINTAXIS\) VS FONDO \(ÓPTICA\)/);
    assert.doesNotMatch(system, /UN solo Código Dominante/);
  });

  it("el user prompt manda diagnosticar geometría y cascada, no verdad", () => {
    const user = serializarPromptAuditoria({
      rawFact: "hoy corté a las 14:00",
      userTier: "MATRICULA",
    });
    assert.match(user, /MATRICULA/);
    assert.match(user, /geometría real/);
    assert.match(user, /hoy corté a las 14:00/);
    assert.match(user, /FOCO DE REVELACIÓN/);
    assert.match(user, /Cero Óptica|Cero Δ/);
    assert.match(user, /lenguaje natural|INTENCIÓN/);
    assert.match(user, /Telemetría fría|no fuerces C8\/C9\/C10/);
    assert.match(user, /TEMPERAMENTO NUTRITIVO \(G1\)/);
    assert.match(user, /Tono del Maestro|peldaño pendiente/i);
  });

  it("Carrera y Título cambian el temperamento del prompt, no el alma del código", () => {
    const carrera = serializarPromptAuditoria({
      rawFact: "hoy corté a las 14:00",
      userTier: "CARRERA",
      detectedNoise: "flor",
      omittedShadow: "sombra",
    });
    const titulo = serializarPromptAuditoria({
      rawFact: "hoy corté a las 14:00",
      userTier: "TITULO",
      detectedNoise: "flor",
      omittedShadow: "sombra",
    });
    assert.match(carrera, /TEMPERAMENTO DE RIGOR QUIRÚRGICO \(G3\)/);
    assert.match(titulo, /TEMPERAMENTO DE MATEMÁTICA PURA \(G4\)/);
  });

  it("las leyes de casa viajan al prompt; un candidato no", () => {
    const nacimiento = Date.UTC(2026, 9, 18, 12, 0, 0);
    const candidato = {
      id: "cm_c",
      createdAt: nacimiento,
      estado: "candidato" as const,
      foco: 7 as const,
      firma: 2 as const,
      percepcion: "Visión",
      escritura: "escribí el patrón",
      enunciado: "candidato que no debe citarse",
      anclas: [],
      usos: 1,
    };
    const ley = {
      ...candidato,
      id: "cm_l",
      estado: "ley" as const,
      enunciado: "Para que tu percepción de C7 se desarrolle, escribí el patrón.",
      promotedAt: nacimiento,
    };
    const sinLeyes = serializarPromptAuditoria({
      rawFact: "hoy corté a las 14:00",
      userTier: "MATRICULA",
    });
    assert.doesNotMatch(sinLeyes, /LEYES DE CASA/);
    const conCandidato = serializarPromptAuditoria(
      { rawFact: "hoy corté a las 14:00", userTier: "MATRICULA" },
      [candidato],
    );
    assert.doesNotMatch(conCandidato, /LEYES DE CASA|candidato que no debe citarse/);
    const conLey = serializarPromptAuditoria(
      { rawFact: "hoy corté a las 14:00", userTier: "MATRICULA" },
      [ley],
    );
    assert.match(conLey, /LEYES DE CASA/);
    assert.match(conLey, /percepción de C7/);
    assert.match(conLey, /18.*oct.*2026/i);
  });
});

describe("Depósito V3 — geometría fría y cascada", () => {
  it("sin título: firma C3 y C7 activos, pero enseña C1 y C10 queda vacío", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: PATRON_PISTON,
      userTier: "MATRICULA",
    });
    assert.equal(r.characterSignedCode, 3);
    assert.equal(r.activeCharacterMap[3], true);
    assert.equal(r.activeCharacterMap[7], true);
    assert.equal(r.activeCharacterMap[1], false);
    assert.equal(r.activeCharacterMap[10], false);
    assert.equal(r.titleConnectedToClose, false);
    assert.equal(r.lowestMissingCascadeCode, 1);
    assert.equal(r.estadoAlumno, "PRINCIPIANTE_SIN_ANCLA");
    assert.equal(r.masterTone, 1);
    assert.equal(r.focoRevelacionCode, 1);
    assert.equal(r.pedagogicalFeedback, TONOS_MAESTRO[1]);
    assert.equal(r.immediateAdjustment, TONOS_MAESTRO[1]);
    assert.ok(r.activeCodes?.includes(3));
    assert.ok(r.syntacticVacios.includes(1));
    assert.equal(r.syntacticVacios.includes(3), false);
    assert.doesNotMatch(r.immediateAdjustment, /bueno|malo|eficaz|calidad de vida/i);
    assert.doesNotMatch(r.groundingStatus.diagnosticMessage, /óptica|delta|flojo moral/i);
    assert.equal("perceptionEye" in r, false);
    assert.equal("deltaGap" in r, false);
  });

  it("C3 se activa por secuencia vectorial, no por reloj", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Vi el patrón. Primero aislé el territorio, entonces ocurrió el atasco, me llevó a cortar el segundo paso. El modelo se repite.",
      userTier: "MATRICULA",
    });
    assert.equal(r.characterSignedCode, 3);
    assert.equal(r.syntaxDiagnostic.detectedSyntaxCode, 3);
    assert.equal(r.activeCharacterMap[3], true);
    assert.equal(r.lowestMissingCascadeCode, 1);
  });

  it("48h / loop marca firma C8, no flojera moral; sin título enseña C1", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Anteayer corté. A las 48h me volvió la ansiedad en loop. El retorno no es flojera. El ciclo incubó.",
      userTier: "CARRERA",
      detectedNoise: "me sentí flojo",
      omittedShadow: "no nombré la onda de 48h",
    });
    assert.equal(r.characterSignedCode, 8);
    assert.equal(r.activeCharacterMap[8], true);
    assert.equal(r.lowestMissingCascadeCode, 1);
    assert.doesNotMatch(r.groundingStatus.diagnosticMessage, /flojo moral/i);
    assert.doesNotMatch(r.immediateAdjustment, /debo|virtud|calidad de vida/i);
    assert.equal(r.immediateAdjustment, TONOS_MAESTRO[1]);
  });

  it("volcado corto no inventa firma alta ni exige códigos superiores", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: "hoy mal",
      userTier: "FREE",
    });
    assert.equal(r.characterSignedCode, 1);
    assert.equal(r.estadoAlumno, "PRINCIPIANTE_SIN_ANCLA");
    assert.equal(r.syntaxDiagnostic.isCableadoConnected, false);
    assert.equal(r.groundingStatus.isFullyGrounded, false);
    assert.equal(r.immediateAdjustment, TONOS_MAESTRO[1]);
  });

  it("el título enciende C1, no C10; sin C2 enseña cauce", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "A las 9:00 arranqué. A las 9:20 el segundo paso. A las 9:40 el pistón se atasca. El modelo se repite.",
      studentHypothesis: "C7 El patrón del pistón",
      userTier: "TITULO",
      detectedNoise: "culpa de productividad",
      omittedShadow: "no nombré el atasco de las 9:40",
    });
    assert.equal(r.activeCharacterMap[1], true);
    assert.equal(r.activeCharacterMap[3], true);
    assert.equal(r.activeCharacterMap[7], true);
    assert.equal(r.activeCharacterMap[10], false);
    assert.equal(r.titleConnectedToClose, false);
    assert.equal(r.lowestMissingCascadeCode, 2);
    assert.equal(r.estadoAlumno, "EXPLORADOR_NARRATIVO");
    assert.equal(r.immediateAdjustment, TONOS_MAESTRO[2]);
    assert.doesNotMatch(r.groundingStatus.diagnosticMessage, /evasi[oó]n|flor moral/i);
  });

  it("título C10 que flota no cablea: C1 enciende y C10 sigue vacío", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Hoy no hice nada. Me sentí con poca energía. Debo ser más productivo. Ya veré.",
      studentHypothesis: "C10 La matriz de mi abundancia cuántica",
      userTier: "CARRERA",
      detectedNoise: "energía y culpa",
      omittedShadow: "no nombré que no arranqué",
    });
    assert.equal(r.activeCharacterMap[1], true);
    assert.equal(r.titleConnectedToClose, false);
    assert.equal(r.activeCharacterMap[10], false);
    assert.equal(r.syntaxDiagnostic.isCableadoConnected, false);
    assert.ok(r.lowestMissingCascadeCode === 2 || r.lowestMissingCascadeCode === 4);
    assert.doesNotMatch(r.immediateAdjustment, /filosofía|óptica|calidad de vida/i);
  });

  it("secuencia C3 que cierra en polaridad enciende C8 en el mapa, no como consejo moral", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Armé el pistón: primero el aceite, entonces el segundo paso, después el corte. Al cerrar vi la ley: el polo que empujo se invierte y el ciclo vuelve.",
      userTier: "CARRERA",
      detectedNoise: "culpa de ritmo",
      omittedShadow: "no nombré el retorno",
    });
    assert.equal(r.characterSignedCode, 3);
    assert.equal(r.activeCharacterMap[8], true);
    assert.equal(r.lowestMissingCascadeCode, 1);
    assert.doesNotMatch(r.immediateAdjustment, /flojo|debo|virtud/i);
  });

  it("volcado 24/10/2026: C5, C7 y C3 ya están en el papel; firma C8; FOCO C10", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: `Hoy aprendi que la atención tiene siclo de vida no mayor a dos horas. 
Cómo estos días estoy prestando atención a los mensajes de mí subconciente para poder fluir con él.  Ya que mí experiencia de concentrarme a fuerza de voluntad me trajo problemas hasta de salud: está vez inmediatamente me aparece las dos alertas de que mí cerebro se está quemando ( cuando parece el Debo, cuando parezca el deseo de que la hora de trabajo se termine porque lo estoy sintiendo largo al tiempo) entonces al parecer uno de eso dos mí atención lo saco del trabajo pero no saco mí cuerpo, en ese momento empiezo ha escuchar audio y el ciclo de atención empieza; con ese cambio de atención logro que no se active las dos señales de que mí cerebro se está quemando. Lobqu estaba buscando saber es: ¿Suprime el cansancio corporal de la primera intención manual y cuánto tiempo dura? La respuesta es que suprime en un 75 a 80% y dura aproximadamente 90 a 120 minutos.  Esto me lleva a la conclusión que puede cuidarnos estando trabajando en nuestra trabajo de costura o manual y para que no salte la alerta de estar quemándose, se debe cambiar de enfoque de atención para empezar de nuevo otro ciclo de atención, siempre en cuando no haya riego de ausentarse cuando se trabaja en piloto automático, porque el hecho de poder cambiar de enfoque voluntariamente requiere haber dominado el trabajo de la primera atencion`,
      studentHypothesis: "El código 1, que la ley tiene siclo de vida",
      detectedNoise: "No hay flor",
      omittedShadow:
        "Lo no dicho es:  que el mayor daño que podemos hacer a nuestro cerebro es cuando evitamos las dos alertas, el que debo terminar y cuando se siente las horas se ha alargado, la señal a sido enviada y nosotros elegimos ignorarlo. Ahí está el daño.",
      userTier: "MATRICULA",
    });
    assert.equal(r.characterSignedCode, 8);
    assert.equal(r.activeCharacterMap[1], true);
    assert.equal(r.activeCharacterMap[2], true);
    assert.equal(r.activeCharacterMap[3], true);
    assert.equal(r.activeCharacterMap[4], true);
    assert.equal(r.activeCharacterMap[5], true);
    assert.equal(r.activeCharacterMap[6], true);
    assert.equal(r.activeCharacterMap[7], true);
    assert.equal(r.activeCharacterMap[8], true);
    assert.equal(r.activeCharacterMap[9], false);
    assert.equal(r.activeCharacterMap[10], false);
    assert.equal(r.syntacticVacios.includes(3), false);
    assert.equal(r.syntacticVacios.includes(5), false);
    assert.equal(r.syntacticVacios.includes(7), false);
    assert.equal(r.focoRevelacionCode, 10);
    assert.equal(r.syntaxDiagnostic.focoCode, 10);
    assert.equal(r.lowestMissingCascadeCode, 10);
    assert.notEqual(r.focoRevelacionCode, 5);
    assert.equal(r.immediateAdjustment, TONOS_MAESTRO[10]);
    assert.equal(r.estadoAlumno, "ENLACE_EN_TRANSMUTACION");
  });

  it("volcado 01/11/2026: la sierra de atención enciende C8; C10 queda vacío y no se enseña como tijera", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: `Hoy aprendí que la mente bloquea la atención prolongada en algo. 
Ayer había tenido todo el día sin trabajar costura porque no había corte y como tengo mí componente jornada donde cada momento no pasa inconciente. Pues me tocó desarrollarme en la aria de desarrollo personal.  A las 5:00 am como de costumbre avanso con mí desarrollo personal.  Después del desayuno  a las 8:30 también estudie hasta las 1:00 pm. Después vine a almorzar y hasta las dos ya me había aburrido en mí casa, entonces nuevamente volví ha estudiar hasta 7:00 pm.  En la noche también me sobraba tiempo, ahí se había alterado mí emociones, no sabía que hacer, si mirar tele, seguir estudiando porque todavía tenía para avanzar, pero mí mente se bloqueó para pensar en pasos, había desglosado tareas para concentrarme en una responsabilidad que tenía, pero ya no podía ejecutarlo.  Y para ese tipo de situaciones tenía una solución y era que debía distraerme con chistociada o dramas, pero eso también ya estaba cubierto por lo tanto mí deseo de distraerme, mí hambre de saber, de ejecutar tarea se había apagado y no es que estaba cansado o quería dormir. Más por el contrario me ha agarrado un sentimiento de impotencia porque no estoy avansando con mí publicidad y el dinero no llega. Entonces aca nace la pregunta ¿Porque despues de haber aprovechado el tiempo desde temprano y casi todo el día al final me sentía vasio como si no hubiera trabajado todo el día? Y perque me sentía vasio ¿Será porque  todo enfoque es como una batería que se acaba? Después que se ha acabado la batería de la atención si lo insistimos con deber, ahí ocurre el desgaste multiplicado.  Ahora, pero ¿porque me sentí vasio a pesar que trabaje todo el dia? ¿Será que otra identidad se había quedado de hambre? Esto pudiera ser Sierto. Otra identidad se quedó de hambre.`,
      studentHypothesis:
        "Código 1.  La atención tiene límite y el sentimiento de deber te avisa que la duración de batería está en su límite más bajo",
      detectedNoise: "No hay",
      omittedShadow:
        "Lo no dicho es que para cuidar el cuerpo se debe estar atento o sensitivo para identificar que la batería está bajo y inmediatamente llevar al cuerpo a descansar",
      userTier: "CARRERA",
    });
    assert.equal(r.activeCharacterMap[8], true);
    assert.equal(r.activeCharacterMap[10], false);
    assert.equal(r.syntacticVacios.includes(8), false);
    assert.equal(r.syntacticVacios.includes(10), true);
    assert.equal(r.characterSignedCode, 8);
    assert.equal(r.focoRevelacionCode, 10);
    assert.equal(r.lowestMissingCascadeCode, 10);
    assert.equal(r.titleConnectedToClose, false);
    assert.equal(r.estadoAlumno, "ENLACE_EN_TRANSMUTACION");
    assert.match(r.groundingStatus.diagnosticMessage, /Falta C10 para abrochar/);
    assert.doesNotMatch(
      r.groundingStatus.diagnosticMessage,
      /tijera|idea propia/,
    );
    assert.equal(r.immediateAdjustment, TONOS_MAESTRO[10]);
  });

  it("volcado 02/11/2026: firma C8 por ley del ciclo; C10 abrocha el límite de la habilidad, no pide cerrar de nuevo", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: `Hoy aprendí que el desarrollo de habilidades tienen límite. 
Hace una semana atrás había ido a trabajar en otro taller porque en mí taller no me habían dado corte, ahí te pagan por puntos y yo me fui con todo las ganas  ganar a mí record y sacar una ganancia atractiva y entonces  me apegue a mí ring de conquista . Ahí es que me di cuenta que hasta 3 días había podido tener un incremento de velocidad, al cuarto día solo mantenía ni recor pero no avansaba. La pregunta que me plantines ¿Porque no seguía incrementando mí velocidad si seguía con el esfuerzo de enfocarme-conciente de mí ring de enfoque en cada momento? La respuesta qué de forma natural el desarrollo de habilidad tiene un límite de resistencia, cuando choca esa resistencia  ahi la habilidad funciona en bucle, por lo más que se esfuerse  siempre nuestro va ha ser lo mismo ¿Porque no se puede pasar ese límite de velocidad o habilidad? La respues en esta profundidad es que:  no se puede desarrollar una habilidad de resistencia 2 en un estado donde el tiempo es el enfoque, eso apuro, la idea de avanzar. Entonces ¿en qué estado se pudiera llevarlo al otro nivel nuestra habilidad? La respuesta es la reprogramación, la simulación donde puedas ver el máximo detalle los pasos, simular el tiempo objetivo en un reloj. 
En conclusión si se quiere pasar al siguiente nivel de desarrollo con nuestra habilidad, ya no se tiene que esforzarse en un estado de práctica real donde existe el apuro, se tiene que llevar a otro plano mental`,
      studentHypothesis:
        "Acá pareció la ley del ciclo, código 8 porque es como funciona la nayuraleza",
      detectedNoise: "No hay",
      omittedShadow:
        "Lo no dicho es que porgusto nos esforsamos en querer incrementar nuestra habilidad en un estado de práctica. La habilidad se pasa al siguiente nivel con reprogramacion",
      userTier: "CARRERA",
    });
    assert.equal(r.characterSignedCode, 8);
    assert.equal(r.activeCharacterMap[8], true);
    assert.equal(r.activeCharacterMap[10], true);
    assert.equal(r.titleConnectedToClose, true);
    assert.equal(r.syntacticVacios.includes(10), false);
    assert.equal(r.lowestMissingCascadeCode, null);
    assert.equal(r.estadoAlumno, "ARQUITECTO_GROUNDED");
    assert.equal(r.focoRevelacionCode, 10);
    assert.doesNotMatch(
      r.groundingStatus.diagnosticMessage,
      /Falta C10|tijera/,
    );
    assert.match(r.groundingStatus.diagnosticMessage, /abroch|cerrado/i);
    assert.notEqual(r.characterSignedCode, 2);
  });

  it("volcado 04/11/2026: desición ya está escrita; firma C7; no pide tijera C5", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: `Hoy aprendi que los problemas no solamente son por falta de desición sino por falta de visión. 
Hace como 4 días hize un volcado en el juez serio, donde se tiene que responde r la pregunta ¿Cual es tu problema? Y mí problema era que hace tiempo que no podía crear ni un vídeo para publicar sobre mí producto, donde que el problema no era código 1, no saber cuál era el problema, código dos tampoco-no saber cuál es la prioridad, código 3 saber que pasos dar. Todo eso se sabía, pero por alguna razón mí cuerpo no quería ejecutar. Entonces la pregunta que surge acá es ¿Porque mí cuerpo no puede ejecutar sabiendo cual es el proble, sabiendo cual es la prioridad, los pasos y hasta la desición que debería ejecutar? El motivo no es por ser flojo, sino el problema es que la mente obliga al cuerpo a ejecutar lo que tiene pistas neuronales,  si pongo fuerza de voluntad no habiendo pistas neuronales: entonces lo único que se va a conseguir son desvíos mentales, procrastinacion, etc.  Entonces aca nos damos cuenta que la solución de este tipos de problemas no está en el esfuerzo de los pasos o fuerza de voluntad. La solución de este tipo de problemas esta  en engruesar las pistas neuronales y las pistas neuronales no se crean haciendo pasos largos con esfuerzo de voluntad sino  visión estructurada.  Esto es la razón por lo que que las desiciones que puedes tomar si no esta creado la pista neuronal  puede ser un torbellino. 
La conclusión es que si se siente que el cuerpo no quiere ejecutar una desición , lo sabio es crear la vista neuronal con visión planeta 7.`,
      studentHypothesis: "Acá pareció el código 7, la vision",
      detectedNoise: "No hay",
      omittedShadow:
        "Lo no dicho es que  la enfermera de procrastinación, la pereza puede ser eliminado con una metodología de vision, donde una se aprende ha ver antes de ejecutar",
      userTier: "CARRERA",
    });
    assert.equal(r.activeCharacterMap[5], true);
    assert.equal(r.activeCharacterMap[7], true);
    assert.equal(r.syntacticVacios.includes(5), false);
    assert.equal(r.characterSignedCode, 7);
    assert.notEqual(r.characterSignedCode, 2);
    assert.notEqual(r.focoRevelacionCode, 5);
    assert.equal(r.activeCharacterMap[10], true);
    assert.equal(r.titleConnectedToClose, true);
    assert.equal(r.lowestMissingCascadeCode, null);
    assert.equal(r.estadoAlumno, "ARQUITECTO_GROUNDED");
    assert.doesNotMatch(
      r.groundingStatus.diagnosticMessage,
      /Falta C5|tijera/,
    );
    assert.doesNotMatch(r.immediateAdjustment, /traza una línea|decisión firme/i);
  });

  it("volcado 06/11/2026: el curso/anuncio enciende C6; desidí enciende C5; no pide tijera", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: `Hoy aprendí que la necesidad no está en lo que nos rodea sino en nuestra propia mente. 
Hace como 10 días atrás estaba escroliando en Facebook y vi un anuncio que decía algo parecido a esto:  desarrolla tu capacidad comprensión lectora de 0 a 10 en menos de un mes. Ese curso le termine comprando y ¿para que compre? Recuerdo que ese curso lo leí como 3 dias, de ahí me di cuenta que no era importante desarrollar una habilidad de lectura y lo deje. Pero ¿Que paso en ese momento que leí la publicidad? ¿Porque desidí gastar mí dinero hasta mí tiempo sino era mí necesidad? La necesidad no es que debas convertirte en un buen lector para ganar dinero, lo que pasa que hay un código que está hambriento (código 2- el desarrollo-aprender) y cuando ese codigo está hambriento va a ser llamado por cualquier publicidad que hable sobre superación y si promete crecimiento rápido mejor, ¿porque desidí comprar el curso si no  era importante o necesario de manera razonable? Acá me me doy cuenta hay dos conocimientos: 
1.  Sino alimentas a las identidades, las identidades internas te obligarán a actuar a favor de ellos.  Y eso es lo que causa las compras compulsivas. Las compras compulsivas son códigos hambrientos.  No es que los códigos sean malos, lo que pasa que el está pidiendo alimento y va a depender de tipo de alimento le dan su amo. 
2.  También acá nos damos cuenta que siendo un vendedor, no hay necesidad de tener un producto llamativo o ser un florero en ventas. Solamente hay que activar la necesidad del código.  Porque la necesidad tal vez no está en la urgencia de necesidad material, pero puede ser que tiempos no están alimentando a uno de  sus identidades. 
Por eso digo que la necesidad no necesariamente tiene que estar en lo urgente o necesario, sino en la sed de cada código.`,
      studentHypothesis: "El código 2. La sed d aprender, de mejorar",
      detectedNoise: "No hay",
      omittedShadow:
        "Lo que no quise nombrar es que si una persona comprende el arte de activar el hambre de cada código va ha ser verdero vendedor sin importar la simplicidad del producto que venda",
      userTier: "CARRERA",
    });
    assert.equal(r.activeCharacterMap[6], true);
    assert.equal(r.syntacticVacios.includes(6), false);
    assert.equal(r.activeCharacterMap[5], true);
    assert.equal(r.syntacticVacios.includes(5), false);
    assert.notEqual(r.focoRevelacionCode, 5);
    assert.equal(r.characterSignedCode, 9);
    assert.equal(r.activeCharacterMap[9], true);
    assert.equal(r.activeCharacterMap[10], true);
    assert.equal(r.titleConnectedToClose, true);
    assert.equal(r.lowestMissingCascadeCode, null);
    assert.doesNotMatch(r.groundingStatus.diagnosticMessage, /Falta C5|tijera/);
  });

  it("volcado 08/11/2026: C9 principio sistémico firma; no acredita C1; no pide tijera", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: `Hoy aprendi que el valor interno se siente más de que puede gritar el ego exterior. 
Hace como 15 días atrás mí esposa me había hecho un reclamo, sobre que es ella el que trabaja más en la casa: yo inmediatamente rechase esa idea porque mí planificación abarca un hora antes de que ella se levante y dos horas después de que ella a dormido.  Pero una semana después ocurrió algo:  he empesado a ver qué mí mujer más de lo que antes veía y lo hacía sin quejar, sin decirme que es ella la que trabaja más o tal vez la que no trabaja más porque yo también trabajo, solo que empecé a valorar más lo que hace mí mujer. He empesado ha sentirme afortunado por tener una mujer laboriosa: mantiene cu casa  limpio, busca tiempo aparte de la costura para lavar la ropa sin dejar vasitos en la costura. La pregunta acá es ¿Porque cuando antes me dijo de que ella trabaja más que yo no lo valore y por el contrario se resal mí valor mío sobre ella? La respuesta ha esto pudiera ser dos cosa: 
1.  Cuando se reclama del valor ha voz lo que realmente le está diciendo al subconsciente de la persona es: yo tengo una necesidad de que me digan que soy laboriosa, porque yo no lo soy. ¿Que tiene que pasar para que sea entonces? A la hora de trabajar no lo debe hacer para la aprobación exterior, sino por su responsabilidad de utilidad en la casa, actuar lo contrario es ego- es el valor de la apariencia. 
2. El valor de alguien se siente cuando una persona a crusado el umbral del deseo de  recibir algo a cambio en los demás sobre lo que hace. 
Por eso dado este aprendisaje a partir de hoy en adelante cuando me encuentre en la situación de cobrar o compararme con los demás lo primero que debo hacer es si soy, porque el mismo hecho de reclamar o decir yo soy mejor que tu significa  que no soy, eso sería autodespreciarme a mí primero o más que al que le reclamo. 
Por eso razón el valor personal no se expresa hablando de nuestro valor, sino nuestro valor se expresa crusando el valor de importancia en los demás.`,
      studentHypothesis: "Acá apareció el código 1  la ley del valor en los demas",
      detectedNoise: "No hay",
      omittedShadow:
        "Lo no dicho es que nuestra boca sirve para engañar más no para decir la verdad.  La boca habla de lo que nos falta no de lo que queremos o somos",
      userTier: "CARRERA",
    });
    assert.equal(r.activeCharacterMap[5], true);
    assert.equal(r.syntacticVacios.includes(5), false);
    assert.equal(r.activeCharacterMap[9], true);
    assert.equal(r.syntacticVacios.includes(9), false);
    assert.notEqual(r.focoRevelacionCode, 5);
    assert.equal(r.characterSignedCode, 9);
    assert.notEqual(r.characterSignedCode, 1);
    assert.notEqual(r.characterSignedCode, 2);
    assert.equal(r.activeCharacterMap[10], true);
    assert.equal(r.titleConnectedToClose, true);
    assert.equal(r.lowestMissingCascadeCode, null);
    assert.equal(r.estadoAlumno, "ARQUITECTO_GROUNDED");
    assert.doesNotMatch(r.groundingStatus.diagnosticMessage, /Falta C5|tijera/);
    assert.doesNotMatch(r.immediateAdjustment, /traza una línea|decisión firme/i);
    assert.match(r.immediateAdjustment, /Fortalezas en el papel: Firma C9/);
    assert.match(r.immediateAdjustment, /abrochado/i);
    assert.match(r.immediateAdjustment, /C9/);
  });

  it("volcado 09/11/2026: el principio de cansancio/polo enciende C9; no pide C10 de nuevo", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: `Hoy aprendi que el cansancio es el enfoque el polo positivo a más de 90 minutos. 
Hace como un mes atrás estaba trabajando en otro taller aparte de mí taller, me fui a ganar por puntos de operación.  Ya están en su tercer día y un día antes había medido mí operaciones, al día siguiente me propuse usar solo dos desglosadores (en el tiempo de la mañana meter todo las tareas que alcanza ese horario que eera hasta las 12:30 pm, hasta esa hora alcansaba hacer 10 paquetes y en la tarde usar el segundo desglosador)  el resultado: en el turno de la mañana había llegado más de mí objetivo, hice 11 paquetes. En la tarde esperaba lo mismo, pero por una razón desconocida me agarró un sueño insoportable; yo dije esto será por el almuerzo-voy a trabajar relajado en dos paquetes que cosa relajado ya me pasa, pero no fue a si, el sueño o cansancio no físico me dominaba, ahí es donde probé en abandonar el enfoque de avansar y probé enfocarme en el punto medio de los movimientos, esa parte donde no se llega al final de la operación, esa parte antes de t rminar el ciclo de una operación (las pausa, el puente donde empieza el siguiente paso)  y ocurrió algo que no me esperaba:  la respirqcion se automatismo para llenar más aire a mis pulmones sin pensar respirar profundo,  el sueño desminuyo un 30%, el ritmo de velocidad no bajo sin pensar en avanzar. Entonces ha raíz de esta experiencia la pregunta es:  ¿Porque el cansancio se freno cuando cambie el punto de enfoque- deje la intención de avanzar y solo observe sin intención, me enfoque en los puntos puentes? ¿Será que el cansancio es el enfoque repetitivo en el polo positivo de avanzar y el descanso es el enfoque contrario de avanzar? 
Parece que el cansancio es el foco o intención del polo positivo y el cuerpo pasa ha ser un tema secundario para generar el cansancio, más es la intención en el polo positivo. Si esto es a si se pudiera descansar solamente cambiando de foco sin cambiar de movimiento, solamente jugamos con la observación respondiendo la pregunta ¿Donde observo? 
Por eso digo que el cansancio solo es enfoque en lo mismo a mayor de 90 minutos si cambiamos de enfoque al polo contrario- los puentes sin cambiar la mecánica de movimiento: pudiera disipar el cansancio o al menos frenar el progreso de cansancio`,
      studentHypothesis: "Acá pareció la ley de la economía de energía código 7",
      detectedNoise: "No hay",
      omittedShadow:
        "Lo que no dije es que el cuerpo sigue a la atención,  si la atención está en el polo posito, por ley de causa efecto el cuerpo se va ha cansar, pero cambiamos de polo sin cambiar de movimiento el cuerpo puede frenar el cansancio",
      userTier: "CARRERA",
    });
    assert.equal(r.activeCharacterMap[9], true);
    assert.equal(r.syntacticVacios.includes(9), false);
    assert.equal(r.characterSignedCode, 9);
    assert.notEqual(r.characterSignedCode, 2);
    assert.equal(r.activeCharacterMap[10], true);
    assert.equal(r.titleConnectedToClose, true);
    assert.equal(r.lowestMissingCascadeCode, null);
    assert.equal(r.estadoAlumno, "ARQUITECTO_GROUNDED");
    assert.doesNotMatch(r.groundingStatus.diagnosticMessage, /Falta C10|abrochar el título/);
    assert.match(r.immediateAdjustment, /Firma C9/);
  });

  it("volcado 11/11/2026: C9 sella; C5 vacío no es FOCO ni tijera", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: `Hoy aprendi que la necesidad de un cliente puede que no exista, hasta que se lo haga conciente. 
Habeces me encuentro aburrido de hacer lo mismo y me voy por a distraerme en Facebook, ahí encuentro publicidad y resulta que esa publicidad crea una necesidad que antes no tenía. Me fui  fui ha Facebook por aburrimiento y resulta que ahora necesito algo que hay final termino comprando ese producto que antes ni siquiera veía esa necesidad.  Quiere decir ¿Que la necesidad se impone en una persona? ¿Porque se impone? Parece que se impone porque el publicista sabe hablar el lenguaje de los códigos que se encuentran ambriento.  Esto me hace pensar que hay una mecánica para activar un código interno ¿Cual sería esa mecánica? Hay 10 códigos, cada código se activa de manera diferente. Por ejemplo al código 1 para activarlo debemos ofrecer el nacimiento del ego (eso es alimento del ese código) del código 2 su alimento es la dopamina, la importancia. Código 3 es la sensación de que se está avansando, etc. Ahora ¿Cual sería la mecánica para activar uno de estés códigos? Sospecho que pudiera ser el beneficio del código y después una pregunta de creación de necesidad y etiquetacio de lo puedo de ese código, donde obligatoriamente tuviera que responder que si.  Llevemos a un ejemplo real.  Supongamos que estoy queriendo vender jornada base ¿Cómo hablo de la necesidad específica que cubre o abarca?  Eres un trabajador que tu salario depende de producción de unidades? Jornada base es para ti.  Acá va la creación de necesidad Jordan para que responda que si. ¿Porque es para ti? Porque tu no quieres terminar el día sintiendo que se ha perdido el día ¿Sierto! Tu quieres terminar el día sabiendo en que se te ha ido el día, tu quieres terminar el día el día sabiendo antes que tú jornada empiece en que vas a utilizar tu tiempo duro medido en minutos sin que ese tiempo pase ¿Sierto?. 
Ahí hemos creado una necesidad que antes no había. 
Por eso digo que la necesidad no existe hasta que un vendedor lo haga conciente de la necesidad del cliente.`,
      studentHypothesis: "La ley de si no lo ve, no existe. Código 1",
      detectedNoise: "No hay",
      omittedShadow:
        "Lo no dicho es que a cualquier cliente podemos convencer si utilizando el arte de  mostrar la necesidad y después obligarle a que tenga que decir que si ha esa necesidad y en realidad no es forsarlo, sino mensionar una necesidad de un código, antes no lo veía esa necesidad de codigo porque nadie no le mostraba",
      userTier: "CARRERA",
    });
    assert.equal(r.activeCharacterMap[9], true);
    assert.equal(r.syntacticVacios.includes(9), false);
    assert.equal(r.characterSignedCode, 9);
    assert.notEqual(r.characterSignedCode, 1);
    assert.notEqual(r.characterSignedCode, 2);
    assert.equal(r.activeCharacterMap[10], true);
    assert.equal(r.titleConnectedToClose, true);
    assert.equal(r.lowestMissingCascadeCode, null);
    assert.notEqual(r.focoRevelacionCode, 5);
    assert.equal(r.estadoAlumno, "ARQUITECTO_GROUNDED");
    assert.doesNotMatch(r.immediateAdjustment, /traza una línea|decisión firme/i);
    assert.match(r.immediateAdjustment, /Firma C9/);
  });

  it("lenguaje natural: C5, C7 y C8 se leen en el mapa; sin título no se enseña C7", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Hoy dejé el trabajo. Puse pausa al desglosador: el cuerpo pedía parar y yo le dije no al deber. El deber es el enemigo instalado. Entonces me fui a Facebook, puse un audio y descansé. Después volví a producir con la energía cargada. Donde está tu atención está tu energía.",
      userTier: "CARRERA",
      detectedNoise: "culpa de productividad",
      omittedShadow: "el deber automático",
    });
    assert.equal(r.activeCharacterMap[5], true);
    assert.equal(r.activeCharacterMap[7], true);
    assert.equal(r.activeCharacterMap[8], true);
    assert.notEqual(r.focoRevelacionCode, 2);
    assert.equal(r.lowestMissingCascadeCode, 1);
    assert.equal(r.immediateAdjustment, TONOS_MAESTRO[1]);
  });

  it("C4 se enciende por pregunta de inflexión; sin título la cascada pide C1", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "¿El atasco es el paso o el muro que di por sentado? El muro se cayó. La norma ya no sostiene.",
      userTier: "MATRICULA",
    });
    assert.equal(r.activeCharacterMap[4], true);
    assert.equal(r.lowestMissingCascadeCode, 1);
    assert.equal(r.immediateAdjustment, TONOS_MAESTRO[1]);
  });

  it("con título y relato, la cascada pide la pregunta C4", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "El atasco del martes. Entonces abrí el taller y después el segundo paso se trabó. El pistón se quedó ahí.",
      studentHypothesis: "El atasco del martes",
      userTier: "MATRICULA",
    });
    assert.equal(r.activeCharacterMap[1], true);
    assert.equal(r.activeCharacterMap[2], true);
    assert.equal(r.activeCharacterMap[4], false);
    assert.equal(r.lowestMissingCascadeCode, 4);
    assert.equal(r.estadoAlumno, "EXPLORADOR_NARRATIVO");
    assert.equal(r.masterTone, 4);
    assert.equal(r.immediateAdjustment, TONOS_MAESTRO[4]);
  });

  it("con C4 abierta, la cascada pide la tijera C5", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "El muro. Entonces pasó esto. ¿Por qué salto el aceite? El problema es: el muro se cayó.",
      studentHypothesis: "El muro",
      userTier: "MATRICULA",
    });
    assert.equal(r.activeCharacterMap[1], true);
    assert.equal(r.activeCharacterMap[2], true);
    assert.equal(r.activeCharacterMap[4], true);
    assert.equal(r.activeCharacterMap[5], false);
    assert.equal(r.lowestMissingCascadeCode, 5);
    assert.equal(r.estadoAlumno, "ENLACE_EN_TRANSMUTACION");
    assert.equal(r.immediateAdjustment, TONOS_MAESTRO[5]);
  });

  it("conectores ejecutivos encienden C5: mi decisión es / decido / voy a", () => {
    for (const frase of [
      "Hoy mi decisión es cortar el salteo y parar.",
      "Hoy decido parar el desglosador sin excusa.",
      "Hoy voy a trazar una línea y cortar el paso.",
    ]) {
      const r = diagnosticarAuditoriaLocal({
        rawFact: frase,
        userTier: "MATRICULA",
      });
      assert.equal(r.activeCharacterMap[5], true, frase);
      assert.ok(r.activeCodes?.includes(5), frase);
      assert.equal(r.syntacticVacios.includes(5), false, frase);
    }
  });

  it("con C1–C6 activos el Maestro pide C7, nunca C5, y C5 no es vacío", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: `El muro del martes.
Entonces abrí el taller y después el segundo paso se trabó.
¿Por qué salto el aceite? El problema es: el muro se cayó.
Mi decisión es cortar el salteo. Decido parar. Voy a trazar una línea.
Lo saqué del libro de banco y de la experiencia en el taller.`,
      studentHypothesis: "El muro del martes",
      userTier: "MATRICULA",
    });
    assert.equal(r.activeCharacterMap[1], true);
    assert.equal(r.activeCharacterMap[2], true);
    assert.equal(r.activeCharacterMap[4], true);
    assert.equal(r.activeCharacterMap[5], true);
    assert.equal(r.activeCharacterMap[6], true);
    assert.ok(r.activeCodes?.includes(5));
    assert.ok(r.activeCodes?.includes(6));
    assert.equal(r.syntacticVacios.includes(5), false);
    assert.equal(r.focoRevelacionCode, 7);
    assert.equal(r.syntaxDiagnostic.focoCode, 7);
    assert.equal(r.lowestMissingCascadeCode, 7);
    assert.notEqual(r.masterTone, 5);
    assert.equal(r.immediateAdjustment, TONOS_MAESTRO[7]);
    assert.equal(
      r.syntacticVacios.includes(r.focoRevelacionCode) &&
        Boolean(r.activeCodes?.includes(r.focoRevelacionCode)),
      false,
    );
  });

  it("lenguaje natural: parar el desglosador enciende C5 en el mapa", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Hoy paré. Dejé el trabajo y puse pausa al desglosador para proteger el cuerpo. Le dije no al deber, sin explicación.",
      userTier: "CARRERA",
      detectedNoise: "el deber",
      omittedShadow: "el cuerpo",
    });
    assert.equal(r.activeCharacterMap[5], true);
    assert.equal(r.lowestMissingCascadeCode, 1);
  });

  it("lenguaje natural: Facebook/audio y volver enciende C8, no flojera", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Salí del trabajo, me fui a Facebook, escuché un audio y descansé. Después volví a producir refrescado, con la energía de vuelta.",
      userTier: "CARRERA",
      detectedNoise: "pérdida de tiempo",
      omittedShadow: "el descanso",
    });
    assert.equal(r.activeCharacterMap[8], true);
    assert.doesNotMatch(r.immediateAdjustment, /flojo|debo|virtud/i);
  });

  it("transición pura C2→C7 no inventa C8/C9 en el mapa de calor", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact:
        "Entonces me fui. Al día siguiente vi la ley: el deber es el enemigo instalado. Donde está tu atención está tu energía.",
      userTier: "CARRERA",
      detectedNoise: "culpa de ocio",
      omittedShadow: "el descanso",
    });
    assert.equal(r.characterSignedCode, 2);
    assert.equal(r.activeCharacterMap[2], true);
    assert.equal(r.activeCharacterMap[7], true);
    assert.equal(r.syntacticVacios.includes(8), true);
    assert.equal(r.syntacticVacios.includes(9), true);
    assert.equal(r.lowestMissingCascadeCode, 1);
  });

  it("C10 solo abrocha si el cierre responde al título", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: `El pistón del martes.
Primero abrí el taller. Entonces el segundo paso se trabó. El problema es: ¿por qué salto el aceite? Decidí cortar el paso. Lo saqué del libro de banco y de la experiencia en el taller. Mi encaje: el patrón del salteo se corta con una sola línea. Así el pistón del martes vuelve a ser el pistón del martes.`,
      studentHypothesis: "El pistón del martes",
      userTier: "TITULO",
      detectedNoise: "culpa",
      omittedShadow: "el aceite",
    });
    assert.equal(r.activeCharacterMap[1], true);
    assert.equal(r.activeCharacterMap[2], true);
    assert.equal(r.activeCharacterMap[4], true);
    assert.equal(r.activeCharacterMap[5], true);
    assert.equal(r.activeCharacterMap[6], true);
    assert.equal(r.activeCharacterMap[7], true);
    assert.equal(r.titleConnectedToClose, true);
    assert.equal(r.activeCharacterMap[10], true);
    assert.equal(r.lowestMissingCascadeCode, null);
    assert.equal(r.estadoAlumno, "ARQUITECTO_GROUNDED");
    assert.equal(r.groundingStatus.isFullyGrounded, true);
    assert.equal(r.masterTone, 10);
    assert.match(r.immediateAdjustment, /C1→C10|abrochado/i);
    assert.doesNotMatch(r.immediateAdjustment, /bueno|eficaz|calidad de vida/i);
  });

  it("detectedNoise declarado no altera la geometría", () => {
    const r = diagnosticarAuditoriaLocal({
      rawFact: PATRON_PISTON,
      userTier: "CARRERA",
      detectedNoise: "me sentí flojo",
      omittedShadow: "el atasco de las 9:40",
    });
    assert.equal(r.characterSignedCode, 3);
    assert.equal(r.titleConnectedToClose, false);
    assert.doesNotMatch(r.groundingStatus.diagnosticMessage, /flor moral/i);
  });
});

describe("Depósito V3 — orquestación", () => {
  it("Gemini válido sella geometría local de cascada y marca source gemini", async () => {
    const out = await procesarAuditoriaV3(
      { rawFact: PATRON_PISTON, userTier: "MATRICULA" },
      async () =>
        JSON.stringify({
          characterSignedCode: 3,
          focoRevelacionCode: 7,
          activeCharacterMap: { "3": true, "7": true },
          syntacticVacios: [1, 2, 4, 5, 6, 8, 9, 10],
          syntaxDiagnostic: {
            detectedSyntaxCode: 3,
            focoCode: 7,
            isCableadoConnected: true,
            syntaxCharacteristics: "Transición de C3 hacia la ley C7.",
          },
          groundingStatus: {
            isFullyGrounded: true,
            diagnosticMessage: "Secuencia cableada al patrón.",
          },
          immediateAdjustment: "Tu quiebre real está en la Ley (C7).",
        }),
    );
    assert.equal(out.source, "gemini");
    assert.equal(out.result.characterSignedCode, 3);
    assert.equal(out.result.activeCharacterMap[3], true);
    assert.equal(out.result.activeCharacterMap[7], true);
    assert.equal(out.result.lowestMissingCascadeCode, 1);
    assert.equal(out.result.focoRevelacionCode, 1);
    assert.equal(out.result.titleConnectedToClose, false);
    assert.equal(out.result.syntaxDiagnostic.isCableadoConnected, false);
    assert.equal(out.result.immediateAdjustment, TONOS_MAESTRO[1]);
    assert.equal("deltaGap" in out.result, false);
  });

  it("Gemini que deja C8/C9 vacíos en una firma C2→C7 no se rellena por inferencia", async () => {
    const out = await procesarAuditoriaV3(
      {
        rawFact:
          "Entonces me fui. Al día siguiente vi la ley: el deber es el enemigo instalado. Donde está tu atención está tu energía.",
        userTier: "CARRERA",
      },
      async () =>
        JSON.stringify({
          characterSignedCode: 2,
          focoRevelacionCode: 7,
          activeCharacterMap: { "2": true, "7": true },
          syntacticVacios: [1, 3, 4, 5, 6, 8, 9, 10],
          syntaxDiagnostic: {
            detectedSyntaxCode: 2,
            focoCode: 7,
            isCableadoConnected: true,
            syntaxCharacteristics: "Firma C2 hacia la ley C7.",
          },
          groundingStatus: {
            isFullyGrounded: true,
            diagnosticMessage: "Transición C2 hacia C7.",
          },
          immediateAdjustment: "Tu quiebre real está en la Ley (C7).",
        }),
    );
    assert.equal(out.source, "gemini");
    assert.equal(out.result.characterSignedCode, 2);
    assert.equal(out.result.activeCharacterMap[8] ?? false, false);
    assert.equal(out.result.activeCharacterMap[9] ?? false, false);
    assert.equal(out.result.lowestMissingCascadeCode, 1);
  });

  it("JSON roto cae a local y no tira 500", async () => {
    const out = await procesarAuditoriaV3(
      { rawFact: PATRON_PISTON, userTier: "FREE" },
      async () => "esto no es json",
    );
    assert.equal(out.source, "local_fallback");
    assert.equal(out.result.characterSignedCode, 3);
    assert.equal(out.result.lowestMissingCascadeCode, 1);
  });

  it("evaluar rechaza Carrera sin sombra", async () => {
    const r = await evaluarDepositoV3({
      rawFact: PATRON_PISTON,
      detectedNoise: "culpa",
      userTier: "CARRERA",
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /omittedShadow/);
  });

  it("evaluar Matrícula pasa solo con hecho crudo y devuelve la salida de cascada", async () => {
    const r = await evaluarDepositoV3({
      volcadoCrudo: PATRON_PISTON,
      userTier: "MATRICULA",
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.source, "local_fallback");
    assert.equal(r.userTier, "MATRICULA");
    assert.equal(r.result.characterSignedCode, 3);
    assert.ok(Array.isArray(r.result.activeCodes));
    assert.equal(r.result.lowestMissingCascadeCode, 1);
    assert.equal(r.result.titleConnectedToClose, false);
    assert.equal(r.result.masterTone, 1);
    assert.ok(r.result.pedagogicalFeedback);
  });
});
