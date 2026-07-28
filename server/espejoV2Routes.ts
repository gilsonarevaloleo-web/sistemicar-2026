import {
  ESPEJO_V2_CODIGOS,
  ESPEJO_V2_ENTRY_PROMPT,
  ESPEJO_V2_PHASES,
  classifyQueja,
  detectRefraction,
  densityPercent,
  getPhasePrompt,
  isValidCodigo,
  isValidPhase,
  type EspejoV2CodigoId,
  type EspejoV2PhaseId,
  type FrictionLevel,
} from "../shared/espejoV2";
import type { Express, Request, Response } from "express";

/**
 * Primer paso Espejo V2: clasificador + motor de fases (sin tocar V1).
 */
export function registerEspejoV2Routes(app: Express) {
  app.get("/api/espejo-v2/meta", (_req: Request, res: Response) => {
    res.json({
      version: "2.0.0-paso-1",
      header: "PROC-ESPEJO // SISTEMICAR V2",
      entryPrompt: ESPEJO_V2_ENTRY_PROMPT,
      phases: ESPEJO_V2_PHASES,
      codigos: Object.values(ESPEJO_V2_CODIGOS).map((c) => ({
        id: c.id,
        secuencia: c.secuencia,
        frecuencia: c.frecuencia,
        puntoCorporal: c.puntoCorporal,
        quejaTipica: c.quejaTipica,
      })),
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
      const firstPhase = ESPEJO_V2_PHASES[0];

      res.json({
        ok: true,
        classification,
        sessionSeed: {
          codigo: classification.codigo,
          frecuencia: classification.frecuencia,
          puntoCorporal: classification.puntoCorporal,
          friction: 1 as FrictionLevel,
          phaseId: firstPhase.id,
          phaseIndex: firstPhase.index,
          density: densityPercent(firstPhase.index, 1),
          prompt: getPhasePrompt(classification.codigo, firstPhase.id),
          quejaTipica: codigo.quejaTipica,
        },
      });
    } catch (error) {
      console.error("[espejo-v2/clasificar]", error);
      res.status(500).json({ error: "Error al clasificar la queja" });
    }
  });

  app.post("/api/espejo-v2/fase", (req: Request, res: Response) => {
    try {
      const codigoRaw = String(req.body?.codigo ?? "");
      const phaseRaw = String(req.body?.phaseId ?? "");
      const respuesta = String(req.body?.respuesta ?? "").trim();
      const frictionIn = Number(req.body?.friction ?? 1) === 2 ? 2 : 1;

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

      // Refracción solo se evalúa al responder Fase 4 (Seriedad).
      if (phaseId === "seriedad") {
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

      // Si hay refracción: salto al código maestro y reinicio en Claridad (fricción N2).
      let nextPhaseId: EspejoV2PhaseId | null = nextPhase?.id ?? null;
      let nextPhaseIndex = nextPhase?.index ?? null;
      let nextPrompt: string | null = null;
      let completed = false;

      if (refraction.detected) {
        nextPhaseId = "claridad";
        nextPhaseIndex = 1;
        nextPrompt =
          nextPromptOverride ?? getPhasePrompt(activeCodigo, "claridad");
      } else if (isLast) {
        completed = true;
        nextPhaseId = null;
        nextPhaseIndex = null;
        nextPrompt = null;
      } else if (nextPhase) {
        nextPrompt = getPhasePrompt(activeCodigo, nextPhase.id);
      }

      const density = densityPercent(
        nextPhaseIndex ?? phase.index,
        friction,
      );

      const mandate =
        completed
          ? {
              accionMinimaHint:
                "Extrae de tu respuesta de Seriedad la Acción Mínima concreta de hoy.",
              accionMaximaHint:
                "Extrae de tu respuesta de Seriedad la Acción Máxima que corta el problema de raíz.",
              gobernador: getPhasePrompt(activeCodigo, "gobernador"),
              frecuencia: ESPEJO_V2_CODIGOS[activeCodigo].frecuencia,
            }
          : null;

      res.json({
        ok: true,
        recorded: {
          codigo,
          phaseId,
          phaseLabel: phase.label,
          polo: phase.polo,
          respuesta,
        },
        refraction: {
          detected: refraction.detected,
          diagnostico: refraction.rule?.diagnostico ?? null,
          codigoSalto: refraction.rule?.codigoSalto ?? null,
          estrategia: refraction.rule?.estrategia ?? null,
          notification: interruptMessage,
        },
        next: {
          codigo: activeCodigo,
          frecuencia: ESPEJO_V2_CODIGOS[activeCodigo].frecuencia,
          phaseId: nextPhaseId,
          phaseIndex: nextPhaseIndex,
          prompt: nextPrompt,
          friction,
          density,
          frictionLabel:
            friction === 2 ? "NIVEL 2 (REFRACCIÓN REENCUADRADA)" : "NIVEL 1 (ESTÁNDAR)",
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
