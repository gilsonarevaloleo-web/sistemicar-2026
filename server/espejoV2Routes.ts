import {
  CODIGO_HIERARCHY,
  ESPEJO_V2_CODIGOS,
  ESPEJO_V2_ENTRY_PROMPT,
  ESPEJO_V2_PHASES,
  buildHierarchyPromptBlock,
  classifyQueja,
  detectRefraction,
  densityPercent,
  getCodigoHierarchy,
  getPhasePrompt,
  isCodigoSuperior,
  isValidCodigo,
  isValidPhase,
  type EspejoV2CodigoId,
  type EspejoV2PhaseId,
  type FrictionLevel,
} from "../shared/espejoV2";
import type { Express, Request, Response } from "express";

export type GeminiCaller = (
  prompt: string,
  maxTokens?: number,
  jsonMode?: boolean,
) => Promise<string>;

export type GeminiJsonParser = (raw: string) => any;

export interface EspejoV2RouteDeps {
  callGemini?: GeminiCaller;
  parseGeminiJSON?: GeminiJsonParser;
}

interface HistorialItem {
  phaseId?: string;
  phaseLabel?: string;
  respuesta?: string;
}

function safeParseJson(raw: string): any {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in Gemini response");
  return JSON.parse(match[0]);
}

function buildReasoningPrompt(args: {
  codigo: EspejoV2CodigoId;
  currentPhase: (typeof ESPEJO_V2_PHASES)[number];
  nextPhase: (typeof ESPEJO_V2_PHASES)[number] | null;
  queja: string;
  historial: HistorialItem[];
  respuesta: string;
  friction: FrictionLevel;
  completed: boolean;
}): string {
  const def = ESPEJO_V2_CODIGOS[args.codigo];
  const marcoFaseBase = args.nextPhase
    ? getPhasePrompt(args.codigo, args.nextPhase.id)
    : getPhasePrompt(args.codigo, "gobernador");

  const historialTxt =
    args.historial.length === 0
      ? "(sin respuestas previas)"
      : args.historial
          .map((h, i) => {
            const label = h.phaseLabel || h.phaseId || `turno-${i + 1}`;
            return `- ${label}: ${String(h.respuesta || "").trim()}`;
          })
          .join("\n");

  const hierarchy = getCodigoHierarchy(args.codigo);
  const superiorQuestionRule = isCodigoSuperior(args.codigo)
    ? `
REGLA DE PREGUNTA (Código Mayor ${args.codigo}): la "pregunta" debe hablar de soberanía, presencia, dignidad, honor o gobernancia del territorio/familia — NUNCA de gestión del tiempo, agenda ni lista de tareas.`
    : "";

  const nextInstr = args.completed
    ? `El protocolo cierra en Fase 5 (Gobernador). Devuelve:
- "devolucion": 1-2 oraciones que sellen dignidad/soberanía según lo dicho.
- "pregunta": reformula el Mandato del Gobernador anclado al contexto (una sola pregunta o mandato corto).
- "senales": array corto de señales detectadas (evasión, victimismo, dispersión, claridad, acción).${superiorQuestionRule}`
    : `La siguiente fase es Fase ${args.nextPhase!.index} — ${args.nextPhase!.label} (${args.nextPhase!.codigoFase}, polo ${args.nextPhase!.polo}).
Marco base de esa fase (adáptalo, no lo copies literal si el contexto permite precisión):
"${marcoFaseBase}"
${superiorQuestionRule}

Devuelve:
- "devolucion": 1-2 oraciones que confronten o validen quirúrgicamente lo que el usuario acaba de decir.
- "pregunta": la pregunta de la Fase ${args.nextPhase!.index} adaptada al contexto ESPECÍFICO revelado.
- "senales": array corto de señales (evasión, victimismo, dispersión, claridad, acción, etc.).`;

  const hierarchyBlock = buildHierarchyPromptBlock(args.codigo);
  const superiorGuard = isCodigoSuperior(args.codigo)
    ? `\nVALIDACIÓN FINAL ANTES DE RESPONDER: Si tu "pregunta" habla de agenda, tareas, horas o gestión del tiempo, DESCÁRTALA y reformúlala desde soberanía/dignidad/territorio.`
    : "";

  return `Eres el Gobernador de Sistemicar. Lenguaje técnico, directo, sin consuelo motivacional genérico.
Analiza quirúrgicamente la respuesta del usuario. Detecta si hay evasión, victimismo o dispersión.
Genera una devolución breve que confronte o valide, y LUEGO formula la siguiente intervención adaptada al contexto.

${hierarchyBlock}

CÓDIGO ACTIVO: ${args.codigo} — ${def.frecuencia} [${hierarchy.level}]
PUNTO CORPORAL / DIAGNÓSTICO: ${def.puntoCorporal}
QUEJA TÍPICA DEL CÓDIGO: ${def.quejaTipica}
FRICCIÓN ACTUAL: NIVEL ${args.friction}${args.friction === 2 ? " (REFRACCIÓN REENCUADRADA)" : ""}

VOLCADO INICIAL DEL USUARIO:
"""${args.queja || "(no enviado)"}"""

HISTORIAL DE FASES:
${historialTxt}

FASE ACTUAL RESPONDIDA: Fase ${args.currentPhase.index} — ${args.currentPhase.label} (${args.currentPhase.polo})
RESPUESTA RECIÉN INGRESADA:
"""${args.respuesta}"""

${nextInstr}
${superiorGuard}

Responde SOLO JSON válido:
{
  "devolucion": "...",
  "pregunta": "...",
  "senales": ["..."]
}`;
}

/**
 * Espejo V2 — clasificador + motor de fases + razonamiento Gemini.
 */
export function registerEspejoV2Routes(app: Express, deps: EspejoV2RouteDeps = {}) {
  const callGemini = deps.callGemini;
  const parseJson = deps.parseGeminiJSON ?? safeParseJson;

  app.get("/api/espejo-v2/meta", (_req: Request, res: Response) => {
    res.json({
      version: "2.1.0-jerarquia",
      header: "PROC-ESPEJO // SISTEMICAR V2",
      entryPrompt: ESPEJO_V2_ENTRY_PROMPT,
      phases: ESPEJO_V2_PHASES,
      reasoning: Boolean(callGemini),
      jerarquia: {
        regla:
          "Cuando el volcado active múltiples códigos, el de mayor jerarquía anula a los de menor. Códigos 1.8–1.10 nunca se responden con preguntas tácticas de 1.3.",
        niveles: {
          superior: ["1.10", "1.9", "1.8"],
          medio: ["1.4", "1.5", "1.6", "1.7"],
          base: ["1.1", "1.2", "1.3"],
        },
      },
      codigos: Object.values(ESPEJO_V2_CODIGOS).map((c) => {
        const h = CODIGO_HIERARCHY[c.id];
        return {
          id: c.id,
          secuencia: c.secuencia,
          frecuencia: c.frecuencia,
          puntoCorporal: c.puntoCorporal,
          quejaTipica: c.quejaTipica,
          hierarchyLevel: h.level,
          hierarchyRank: h.rank,
          hierarchyLabel: h.label,
        };
      }),
    });
  });

  app.post("/api/espejo-v2/clasificar", (req: Request, res: Response) => {
    try {
      const texto = String(req.body?.texto ?? "").trim();
      if (texto.length < 8) {
        return res.status(400).json({
          error: "Texto insuficiente. Describe la queja con al menos una oración clara.",
        });
      }

      const classification = classifyQueja(texto);
      const codigo = ESPEJO_V2_CODIGOS[classification.codigo];
      const hierarchy = getCodigoHierarchy(classification.codigo);
      const firstPhase = ESPEJO_V2_PHASES[0];

      res.json({
        ok: true,
        classification,
        hierarchy: {
          level: hierarchy.level,
          rank: hierarchy.rank,
          label: hierarchy.label,
          applied: classification.hierarchyApplied,
          dominatedCodes: classification.dominatedCodes,
        },
        sessionSeed: {
          codigo: classification.codigo,
          frecuencia: classification.frecuencia,
          puntoCorporal: classification.puntoCorporal,
          hierarchyLevel: hierarchy.level,
          friction: 1 as FrictionLevel,
          phaseId: firstPhase.id,
          phaseIndex: firstPhase.index,
          density: densityPercent(firstPhase.index, 1),
          prompt: getPhasePrompt(classification.codigo, firstPhase.id),
          devolucion: null,
          quejaTipica: codigo.quejaTipica,
        },
      });
    } catch (error) {
      console.error("[espejo-v2/clasificar]", error);
      res.status(500).json({ error: "Error al clasificar la queja" });
    }
  });

  app.post("/api/espejo-v2/fase", async (req: Request, res: Response) => {
    try {
      const codigoRaw = String(req.body?.codigo ?? "");
      const phaseRaw = String(req.body?.phaseId ?? "");
      const respuesta = String(req.body?.respuesta ?? "").trim();
      const queja = String(req.body?.queja ?? "").trim();
      const frictionIn = Number(req.body?.friction ?? 1) === 2 ? 2 : 1;
      const historial = Array.isArray(req.body?.historial)
        ? (req.body.historial as HistorialItem[]).slice(-12)
        : [];

      if (!isValidCodigo(codigoRaw)) {
        return res.status(400).json({ error: "codigo inválido (use 1.1–1.10)" });
      }
      if (!isValidPhase(phaseRaw)) {
        return res.status(400).json({
          error: "phaseId inválido (claridad|control|ejecucion|seriedad|gobernador)",
        });
      }
      if (respuesta.length < 2) {
        return res.status(400).json({ error: "respuesta requerida" });
      }

      const codigo = codigoRaw as EspejoV2CodigoId;
      const phaseId = phaseRaw as EspejoV2PhaseId;
      const phaseIdx = ESPEJO_V2_PHASES.findIndex((p) => p.id === phaseId);
      const phase = ESPEJO_V2_PHASES[phaseIdx];

      let activeCodigo = codigo;
      let friction: FrictionLevel = frictionIn as FrictionLevel;
      let refraction = detectRefraction("");
      let interruptMessage: string | null = null;
      let nextPromptOverride: string | null = null;

      // Refracción ANTES de Gemini en Fase 4 o 5.
      if (phaseId === "seriedad" || phaseId === "gobernador") {
        refraction = detectRefraction(respuesta);
        if (refraction.detected && refraction.rule) {
          friction = 2;
          activeCodigo = refraction.rule.codigoSalto;
          interruptMessage =
            refraction.notification ??
            "La resistencia no está en la tarea, está en tu reserva de energía vital.";
          nextPromptOverride = refraction.frictionPrompt ?? null;
        }
      }

      const isLast = phaseIdx >= ESPEJO_V2_PHASES.length - 1;
      const nextPhase = isLast || refraction.detected ? null : ESPEJO_V2_PHASES[phaseIdx + 1];

      let nextPhaseId: EspejoV2PhaseId | null = nextPhase?.id ?? null;
      let nextPhaseIndex = nextPhase?.index ?? null;
      let nextPrompt: string | null = null;
      let devolucion: string | null = null;
      let senales: string[] = [];
      let reasoningSource: "gemini" | "static" | "refraction" = "static";
      let completed = false;

      if (refraction.detected) {
        nextPhaseId = "claridad";
        nextPhaseIndex = 1;
        nextPrompt =
          nextPromptOverride ?? getPhasePrompt(activeCodigo, "claridad");
        devolucion =
          interruptMessage ||
          "La resistencia no está en la tarea, está en tu reserva de energía vital.";
        reasoningSource = "refraction";
      } else if (isLast) {
        completed = true;
        nextPhaseId = null;
        nextPhaseIndex = null;
        nextPrompt = null;
      } else if (nextPhase) {
        nextPrompt = getPhasePrompt(activeCodigo, nextPhase.id);
      }

      // Gemini: analiza respuesta y personaliza siguiente pregunta (si no hubo refracción).
      if (!refraction.detected && callGemini) {
        try {
          const prompt = buildReasoningPrompt({
            codigo: activeCodigo,
            currentPhase: phase,
            nextPhase: completed ? null : nextPhase,
            queja,
            historial,
            respuesta,
            friction,
            completed,
          });
          const raw = await callGemini(prompt, 700, true);
          const parsed = parseJson(raw);
          const d = String(parsed?.devolucion ?? "").trim();
          const q = String(parsed?.pregunta ?? "").trim();
          if (Array.isArray(parsed?.senales)) {
            senales = parsed.senales
              .map((s: unknown) => String(s).trim())
              .filter(Boolean)
              .slice(0, 6);
          }
          if (d) devolucion = d.slice(0, 600);
          if (q) {
            if (completed) {
              // En cierre, la "pregunta" reformula el mandato del gobernador.
              nextPrompt = q.slice(0, 700);
            } else {
              nextPrompt = q.slice(0, 700);
            }
            reasoningSource = "gemini";
          } else if (d) {
            reasoningSource = "gemini";
          }
        } catch (err) {
          console.warn("[espejo-v2/fase] Gemini fallback a prompt estático:", err);
          reasoningSource = "static";
        }
      }

      const density = densityPercent(nextPhaseIndex ?? phase.index, friction);

      const accionMinima = String(req.body?.accionMinima ?? "").trim() || null;
      const accionMaxima = String(req.body?.accionMaxima ?? "").trim() || null;

      const gobernadorText =
        (completed && nextPrompt) || getPhasePrompt(activeCodigo, "gobernador");

      const mandate =
        completed || phaseId === "gobernador" || phaseId === "seriedad"
          ? {
              accionMinima: accionMinima,
              accionMaxima: accionMaxima,
              accionMinimaHint:
                accionMinima ||
                "La tarea atómica e inmediata de hoy (presencia, no entusiasmo).",
              accionMaximaHint:
                accionMaxima ||
                "El movimiento estratégico que corta el problema de raíz.",
              gobernador: gobernadorText,
              frecuencia: ESPEJO_V2_CODIGOS[activeCodigo].frecuencia,
              leyFriccion:
                friction === 2
                  ? "EL SISTEMA NO REQUIERE FE NI GANAS PARA EJECUTAR. LA ACCIÓN MÍNIMA EXIGE PRESENCIA, NO ENTUSIASMO."
                  : null,
            }
          : null;

      // En proceso normal, el prompt de pantalla es: devolución + pregunta.
      const composedPrompt =
        !completed && nextPrompt
          ? devolucion
            ? `${devolucion}\n\n${nextPrompt}`
            : nextPrompt
          : nextPrompt;

      res.json({
        ok: true,
        recorded: {
          codigo,
          phaseId,
          phaseLabel: phase.label,
          polo: phase.polo,
          respuesta,
          accionMinima,
          accionMaxima,
        },
        refraction: {
          detected: refraction.detected,
          diagnostico: refraction.rule?.diagnostico ?? null,
          codigoSalto: refraction.rule?.codigoSalto ?? null,
          estrategia: refraction.rule?.estrategia ?? null,
          notification: interruptMessage,
          banner: refraction.detected
            ? `[INTERRUPCIÓN DE PROTOCOLO: REFRACCIÓN DETECTADA]\nLa resistencia no está en la tarea, está en tu reserva de energía vital. Se ha reencuadrado la frecuencia al CÓDIGO ${refraction.rule?.codigoSalto}.`
            : null,
        },
        reasoning: {
          source: reasoningSource,
          devolucion,
          pregunta: nextPrompt,
          senales,
        },
        next: {
          codigo: activeCodigo,
          frecuencia: ESPEJO_V2_CODIGOS[activeCodigo].frecuencia,
          phaseId: nextPhaseId,
          phaseIndex: nextPhaseIndex,
          prompt: composedPrompt,
          devolucion,
          friction,
          density,
          frictionLabel:
            friction === 2
              ? "FRICCIÓN: REFRACCIÓN DETECTADA (NIVEL 2)"
              : "FRICCIÓN: ESTÁNDAR (NIVEL 1)",
          completed,
          mandate,
        },
      });
    } catch (error) {
      console.error("[espejo-v2/fase]", error);
      res.status(500).json({ error: "Error al procesar la fase" });
    }
  });
}
