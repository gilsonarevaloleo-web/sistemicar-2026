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
