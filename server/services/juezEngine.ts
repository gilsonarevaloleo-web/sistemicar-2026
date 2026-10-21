/**
 * Servicio del Juez Serio (planeta 4).
 * Consume PROMPT_JUEZ_SERIO / buildJuezSerioPrompt.
 * Fase 1 cobra la lectura. Fase 2 desbloquea la directiva.
 */

import type { Express, Request, Response } from "express";
import {
  CASA_CODIGO4_FIRMA,
  CASA_CODIGO4_MARCA,
  CASA_CODIGO4_NOMBRE,
  CASA_CODIGO4_RITUAL,
  CASA_CODIGO4_VERSION,
  PROMPT_JUEZ_SERIO,
  buildJuezSerioPrompt,
} from "../../shared/casas/codigo4/prompt.ts";
import {
  diagnosticarJuezSerioLocal,
  parseEyeCode,
  parseJuezSerioResult,
} from "../../shared/casas/codigo4/motor.ts";
import {
  CREDITO_FASE1_LECTURA,
  CREDITO_FASE2_SOLUCION,
  creditosDeFase,
  mensajeSaldoInsuficiente,
} from "../../shared/casas/codigo4/creditos.ts";
import type { SesionJuez } from "../../shared/casas/codigo4/sesion.ts";
import type {
  EyeCode,
  JuezSerioFase1,
  JuezSerioFase2,
  JuezSerioInput,
  JuezSerioResult,
} from "../../shared/casas/codigo4/types.ts";
import {
  createDefaultJuezWallet,
  type JuezCreditWallet,
} from "./juezCreditos.ts";
import {
  createDefaultJuezStore,
  newSesionJuezId,
  type JuezSessionStore,
} from "./juezStore.ts";

export type JuezGeminiCaller = (
  prompt: string,
  maxTokens?: number,
  jsonMode?: boolean,
) => Promise<string>;

export interface JuezEngineDeps {
  callGemini?: JuezGeminiCaller;
  wallet?: JuezCreditWallet;
  store?: JuezSessionStore;
}

export interface JuezEngineOk {
  ok: true;
  result: JuezSerioResult;
  source: "gemini" | "local_fallback";
  ritual: typeof CASA_CODIGO4_RITUAL;
  version: typeof CASA_CODIGO4_VERSION;
}

export interface JuezEngineErr {
  ok: false;
  status: 400 | 402 | 404;
  error: string;
  codigo?: "SALDO_INSUFICIENTE" | "VOLCADO_VACIO" | "SESION_NO_ENCONTRADA" | "SESION_AJENA";
  fase?: 1 | 2;
  requeridos?: number;
  saldo?: number;
}

export type JuezEngineResult = JuezEngineOk | JuezEngineErr;

export interface Fase1Ok {
  ok: true;
  sesionJuezId: string;
  fase1_lectura: JuezSerioFase1;
  requiereInversionCreditos: true;
  creditosDescontados: number;
  saldo: number;
  source: "gemini" | "local_fallback";
  ritual: typeof CASA_CODIGO4_RITUAL;
  version: typeof CASA_CODIGO4_VERSION;
}

export interface Fase2Ok {
  ok: true;
  sesionJuezId: string;
  fase2_propuesta_solucion: JuezSerioFase2;
  creditosDescontados: number;
  saldo: number;
  version: typeof CASA_CODIGO4_VERSION;
}

export type Fase1Result = Fase1Ok | JuezEngineErr;
export type Fase2Result = Fase2Ok | JuezEngineErr;

export function normalizarInputJuez(body: unknown): JuezSerioInput | JuezEngineErr {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const friccion = String(
    raw.friccionDiaria ?? raw.volcado ?? raw.texto ?? raw.textoVolcado ?? "",
  ).trim();
  if (friccion.length < 8) {
    return {
      ok: false,
      status: 400,
      error: "Falta friccionDiaria: volcá la fricción del día.",
      codigo: "VOLCADO_VACIO",
    };
  }
  const input: JuezSerioInput = { friccionDiaria: friccion };
  const max = parseEyeCode(
    raw.codigoConquistadoMax ?? raw.perimetro ?? raw.chasis,
  );
  if (max) input.codigoConquistadoMax = max;
  return input;
}

function userIdDe(body: unknown, headerUserId?: string): string {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return String(raw.userId ?? raw.uid ?? headerUserId ?? "").trim();
}

function sesionIdDe(body: unknown): string {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return String(raw.sesionJuezId ?? raw.sesionId ?? raw.id ?? "").trim();
}

/**
 * Dictamen interno: prompt maestro → Gemini → perímetro.
 * No cobra. No expone Fase 2.
 */
export async function ejecutarJuezEngine(
  input: JuezSerioInput,
  callGemini?: JuezGeminiCaller,
): Promise<Omit<JuezEngineOk, "ok">> {
  const prompt = buildJuezSerioPrompt(input);
  const local = diagnosticarJuezSerioLocal(input);

  if (callGemini) {
    try {
      const raw = await callGemini(prompt, 2048, true);
      const parsed = parseJuezSerioResult(raw);
      if (parsed.ok) {
        return {
          result: parsed.result,
          source: "gemini",
          ritual: CASA_CODIGO4_RITUAL,
          version: CASA_CODIGO4_VERSION,
        };
      }
    } catch {
      // reintento abajo
    }
    try {
      const raw2 = await callGemini(
        `${prompt}\n\nIMPORTANTE: responde SOLO el JSON con fase1_lectura y fase2_propuesta_solucion. requiereInversionCreditos=true. La directiva no sube de C_conquistado.`,
        2048,
        false,
      );
      const parsed2 = parseJuezSerioResult(raw2);
      if (parsed2.ok) {
        return {
          result: parsed2.result,
          source: "gemini",
          ritual: CASA_CODIGO4_RITUAL,
          version: CASA_CODIGO4_VERSION,
        };
      }
    } catch (err) {
      console.warn(
        "[juezEngine] Gemini falló → fallback local:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return {
    result: local,
    source: "local_fallback",
    ritual: CASA_CODIGO4_RITUAL,
    version: CASA_CODIGO4_VERSION,
  };
}

export async function evaluarJuezEngine(
  body: unknown,
  callGemini?: JuezGeminiCaller,
): Promise<JuezEngineResult> {
  const input = normalizarInputJuez(body);
  if ("ok" in input && input.ok === false) return input;
  const out = await ejecutarJuezEngine(input, callGemini);
  return { ok: true, ...out };
}

function saldoInsuficiente(fase: 1 | 2, saldo: number): JuezEngineErr {
  const requeridos = creditosDeFase(fase);
  return {
    ok: false,
    status: 402,
    error: mensajeSaldoInsuficiente(fase, requeridos, saldo),
    codigo: "SALDO_INSUFICIENTE",
    fase,
    requeridos,
    saldo,
  };
}

export async function ejecutarFase1(
  userId: string,
  textoVolcado: string,
  deps: JuezEngineDeps = {},
  extra: { codigoConquistadoMax?: EyeCode } = {},
): Promise<Fase1Result> {
  const uid = userId.trim();
  if (!uid) {
    return {
      ok: false,
      status: 400,
      error: "Falta userId.",
    };
  }
  const input = normalizarInputJuez({
    friccionDiaria: textoVolcado,
    codigoConquistadoMax: extra.codigoConquistadoMax,
  });
  if ("ok" in input && input.ok === false) return input;

  const wallet = deps.wallet ?? createDefaultJuezWallet();
  const store = deps.store ?? createDefaultJuezStore();
  const saldoAntes = await wallet.saldo(uid);
  if (saldoAntes < CREDITO_FASE1_LECTURA) {
    return saldoInsuficiente(1, saldoAntes);
  }

  const dictamen = await ejecutarJuezEngine(input, deps.callGemini);
  const debito = await wallet.debitar(uid, CREDITO_FASE1_LECTURA);
  if (!debito.ok) return saldoInsuficiente(1, debito.saldo);

  const now = new Date().toISOString();
  const sesion: SesionJuez = {
    id: newSesionJuezId(),
    userId: uid,
    textoVolcado: input.friccionDiaria,
    fase1: dictamen.result.fase1_lectura,
    fase2: dictamen.result.fase2_propuesta_solucion,
    source: dictamen.source,
    estado: "FASE1",
    createdAt: now,
    updatedAt: now,
  };
  await store.save(sesion);

  return {
    ok: true,
    sesionJuezId: sesion.id,
    fase1_lectura: sesion.fase1,
    requiereInversionCreditos: true,
    creditosDescontados: CREDITO_FASE1_LECTURA,
    saldo: debito.saldo,
    source: dictamen.source,
    ritual: CASA_CODIGO4_RITUAL,
    version: CASA_CODIGO4_VERSION,
  };
}

export async function ejecutarFase2(
  userId: string,
  sesionJuezId: string,
  deps: JuezEngineDeps = {},
): Promise<Fase2Result> {
  const uid = userId.trim();
  const sid = sesionJuezId.trim();
  if (!uid) {
    return { ok: false, status: 400, error: "Falta userId." };
  }
  if (!sid) {
    return { ok: false, status: 400, error: "Falta sesionJuezId." };
  }

  const wallet = deps.wallet ?? createDefaultJuezWallet();
  const store = deps.store ?? createDefaultJuezStore();
  const sesion = await store.getById(sid);
  if (!sesion) {
    return {
      ok: false,
      status: 404,
      error: "Sesión del Juez no encontrada.",
      codigo: "SESION_NO_ENCONTRADA",
    };
  }
  if (sesion.userId !== uid) {
    return {
      ok: false,
      status: 404,
      error: "Sesión del Juez no encontrada.",
      codigo: "SESION_AJENA",
    };
  }

  if (sesion.estado === "FASE2_ABIERTA") {
    return {
      ok: true,
      sesionJuezId: sesion.id,
      fase2_propuesta_solucion: sesion.fase2,
      creditosDescontados: 0,
      saldo: await wallet.saldo(uid),
      version: CASA_CODIGO4_VERSION,
    };
  }

  const saldoAntes = await wallet.saldo(uid);
  if (saldoAntes < CREDITO_FASE2_SOLUCION) {
    return saldoInsuficiente(2, saldoAntes);
  }
  const debito = await wallet.debitar(uid, CREDITO_FASE2_SOLUCION);
  if (!debito.ok) return saldoInsuficiente(2, debito.saldo);

  sesion.estado = "FASE2_ABIERTA";
  sesion.updatedAt = new Date().toISOString();
  await store.save(sesion);

  return {
    ok: true,
    sesionJuezId: sesion.id,
    fase2_propuesta_solucion: sesion.fase2,
    creditosDescontados: CREDITO_FASE2_SOLUCION,
    saldo: debito.saldo,
    version: CASA_CODIGO4_VERSION,
  };
}

function bodyError(err: JuezEngineErr) {
  return {
    success: false as const,
    error: err.error,
    codigo: err.codigo ?? null,
    fase: err.fase ?? null,
    requeridos: err.requeridos ?? null,
    saldo: err.saldo ?? null,
    result: null,
  };
}

export function registerJuezRoutes(
  app: Express,
  deps: JuezEngineDeps = {},
): void {
  const callGemini = deps.callGemini;
  const wallet = deps.wallet ?? createDefaultJuezWallet();
  const store = deps.store ?? createDefaultJuezStore();
  const runtime: JuezEngineDeps = { callGemini, wallet, store };

  const meta = {
    version: CASA_CODIGO4_VERSION,
    planeta: 4,
    nombre: CASA_CODIGO4_NOMBRE,
    marca: CASA_CODIGO4_MARCA,
    firma: CASA_CODIGO4_FIRMA,
    ritual: CASA_CODIGO4_RITUAL,
    endpoints: {
      fase1: "POST /api/casas/codigo4/fase1",
      fase2: "POST /api/casas/codigo4/fase2",
    },
    promptExport: "PROMPT_JUEZ_SERIO",
    promptFn: "buildJuezSerioPrompt",
    promptChars: PROMPT_JUEZ_SERIO.length,
    gemini: Boolean(callGemini),
    fallbackLocal: true,
    requiereInversionCreditos: true,
    creditos: {
      fase1: CREDITO_FASE1_LECTURA,
      fase2: CREDITO_FASE2_SOLUCION,
    },
  };

  app.get("/api/casas/codigo4/meta", (_req: Request, res: Response) => {
    res.json(meta);
  });
  app.get("/api/juez/meta", (_req: Request, res: Response) => {
    res.json({ ...meta, endpoint: meta.endpoints.fase1 });
  });

  const handleFase1 = async (req: Request, res: Response) => {
    try {
      const userId = userIdDe(req.body, req.header("x-user-id") ?? undefined);
      const input = normalizarInputJuez(req.body);
      if ("ok" in input && input.ok === false) {
        return res.status(input.status).json(bodyError(input));
      }
      const resultado = await ejecutarFase1(userId, input.friccionDiaria, runtime, {
        codigoConquistadoMax: input.codigoConquistadoMax,
      });
      if (!resultado.ok) {
        return res.status(resultado.status).json(bodyError(resultado));
      }
      return res.status(200).json({
        success: true,
        sesionJuezId: resultado.sesionJuezId,
        fase1_lectura: resultado.fase1_lectura,
        requiereInversionCreditos: true,
        creditosDescontados: resultado.creditosDescontados,
        saldo: resultado.saldo,
        source: resultado.source,
        ritual: resultado.ritual,
        version: resultado.version,
      });
    } catch (error) {
      console.error("[casas/codigo4/fase1]", error);
      return res.status(500).json({
        success: false,
        error: "Error procesando la Fase 1 del Juez Serio.",
        result: null,
      });
    }
  };

  const handleFase2 = async (req: Request, res: Response) => {
    try {
      const userId = userIdDe(req.body, req.header("x-user-id") ?? undefined);
      const sesionJuezId = sesionIdDe(req.body);
      const resultado = await ejecutarFase2(userId, sesionJuezId, runtime);
      if (!resultado.ok) {
        return res.status(resultado.status).json(bodyError(resultado));
      }
      return res.status(200).json({
        success: true,
        sesionJuezId: resultado.sesionJuezId,
        fase2_propuesta_solucion: resultado.fase2_propuesta_solucion,
        creditosDescontados: resultado.creditosDescontados,
        saldo: resultado.saldo,
        version: resultado.version,
      });
    } catch (error) {
      console.error("[casas/codigo4/fase2]", error);
      return res.status(500).json({
        success: false,
        error: "Error procesando la Fase 2 del Juez Serio.",
        result: null,
      });
    }
  };

  app.post("/api/casas/codigo4/fase1", handleFase1);
  app.post("/api/casas/codigo4/fase2", handleFase2);
  app.post("/api/juez/evaluar", handleFase1);
}

export type { EyeCode, JuezSerioInput, JuezSerioResult };
export {
  CREDITO_FASE1_LECTURA,
  CREDITO_FASE2_SOLUCION,
} from "../../shared/casas/codigo4/creditos.ts";
