/**
 * Servicio de La Casa 5: Umbral.
 * Volcado gratis. Lectura-mapa a 1 crédito. Sin gimnasio en A–D.
 */

import type { Express, Request, Response } from "express";
import {
  CASA_UMBRAL5_FIRMA,
  CASA_UMBRAL5_MARCA,
  CASA_UMBRAL5_NOMBRE,
  CASA_UMBRAL5_RITUAL,
  CASA_UMBRAL5_VERSION,
  CREDITO_LECTURA_MAPA,
  PROMPT_UMBRAL5,
  buildUmbral5Prompt,
  diagnosticarUmbral5Local,
  mensajeSaldoInsuficiente,
  parseUmbral5Lectura,
} from "../../shared/casas/umbral5/index.ts";
import type { SesionUmbral5 } from "../../shared/casas/umbral5/sesion.ts";
import type { Umbral5Input, Umbral5Lectura } from "../../shared/casas/umbral5/types.ts";
import {
  createDefaultJuezWallet,
  type JuezCreditWallet,
} from "./juezCreditos.ts";
import {
  createDefaultUmbral5Store,
  newSesionUmbral5Id,
  type Umbral5SessionStore,
} from "./umbral5Store.ts";

export type Umbral5GeminiCaller = (
  prompt: string,
  maxTokens?: number,
  jsonMode?: boolean,
) => Promise<string>;

export interface Umbral5EngineDeps {
  callGemini?: Umbral5GeminiCaller;
  wallet?: JuezCreditWallet;
  store?: Umbral5SessionStore;
}

export interface Umbral5EngineErr {
  ok: false;
  status: 400 | 402 | 404;
  error: string;
  codigo?: "SALDO_INSUFICIENTE" | "VOLCADO_VACIO" | "SESION_NO_ENCONTRADA" | "SESION_AJENA";
  requeridos?: number;
  saldo?: number;
}

export interface VolcadoOk {
  ok: true;
  sesionUmbral5Id: string;
  textoVolcado: string;
  creditosDescontados: 0;
  saldo: number;
  ritual: typeof CASA_UMBRAL5_RITUAL;
  version: typeof CASA_UMBRAL5_VERSION;
}

export interface LecturaOk {
  ok: true;
  sesionUmbral5Id: string;
  lectura: Umbral5Lectura;
  creditosDescontados: number;
  saldo: number;
  source: "gemini" | "local_fallback";
  ritual: typeof CASA_UMBRAL5_RITUAL;
  version: typeof CASA_UMBRAL5_VERSION;
}

export type VolcadoResult = VolcadoOk | Umbral5EngineErr;
export type LecturaResult = LecturaOk | Umbral5EngineErr;

export function normalizarInputUmbral5(body: unknown): Umbral5Input | Umbral5EngineErr {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const limite = String(
    raw.limiteConocido ?? raw.volcado ?? raw.texto ?? raw.textoVolcado ?? "",
  ).trim();
  if (limite.length < 8) {
    return {
      ok: false,
      status: 400,
      error: "Falta limiteConocido: escribí el límite que ya sabés.",
      codigo: "VOLCADO_VACIO",
    };
  }
  return { limiteConocido: limite };
}

function userIdDe(body: unknown, headerUserId?: string): string {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return String(raw.userId ?? raw.uid ?? headerUserId ?? "").trim();
}

function sesionIdDe(body: unknown): string {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return String(raw.sesionUmbral5Id ?? raw.sesionId ?? raw.id ?? "").trim();
}

async function dictaminar(
  input: Umbral5Input,
  callGemini?: Umbral5GeminiCaller,
): Promise<{ lectura: Umbral5Lectura; source: "gemini" | "local_fallback" }> {
  const local = diagnosticarUmbral5Local(input);
  if (callGemini) {
    try {
      const raw = await callGemini(buildUmbral5Prompt(input), 1024, true);
      const parsed = parseUmbral5Lectura(raw);
      if (parsed.ok) {
        return { lectura: parsed.result, source: "gemini" };
      }
    } catch (error) {
      console.warn("[umbral5Engine] Gemini falló → fallback local:", error);
    }
  }
  return { lectura: local, source: "local_fallback" };
}

export async function ejecutarVolcadoGratis(
  userId: string,
  textoVolcado: string,
  deps: Umbral5EngineDeps = {},
): Promise<VolcadoResult> {
  const uid = userId.trim();
  if (!uid) {
    return { ok: false, status: 400, error: "Falta userId." };
  }
  const input = normalizarInputUmbral5({ limiteConocido: textoVolcado });
  if ("ok" in input && input.ok === false) return input;

  const wallet = deps.wallet ?? createDefaultJuezWallet();
  const store = deps.store ?? createDefaultUmbral5Store();
  const now = new Date().toISOString();
  const sesion: SesionUmbral5 = {
    id: newSesionUmbral5Id(),
    userId: uid,
    textoVolcado: input.limiteConocido,
    lectura: null,
    source: null,
    estado: "VOLCADO_GRATIS",
    createdAt: now,
    updatedAt: now,
  };
  await store.save(sesion);

  return {
    ok: true,
    sesionUmbral5Id: sesion.id,
    textoVolcado: sesion.textoVolcado,
    creditosDescontados: 0,
    saldo: await wallet.saldo(uid),
    ritual: CASA_UMBRAL5_RITUAL,
    version: CASA_UMBRAL5_VERSION,
  };
}

export async function listarSesionesUmbral5(
  userId: string,
  deps: Umbral5EngineDeps = {},
): Promise<{ ok: true; sesiones: SesionUmbral5[] } | Umbral5EngineErr> {
  const uid = userId.trim();
  if (!uid) return { ok: false, status: 400, error: "Falta userId." };
  const store = deps.store ?? createDefaultUmbral5Store();
  return { ok: true, sesiones: await store.listByUser(uid) };
}

export async function leerSesionUmbral5(
  userId: string,
  sesionUmbral5Id: string,
  deps: Umbral5EngineDeps = {},
): Promise<{ ok: true; sesion: SesionUmbral5 } | Umbral5EngineErr> {
  const uid = userId.trim();
  const sid = sesionUmbral5Id.trim();
  if (!uid) return { ok: false, status: 400, error: "Falta userId." };
  if (!sid) return { ok: false, status: 400, error: "Falta sesionUmbral5Id." };
  const store = deps.store ?? createDefaultUmbral5Store();
  const sesion = await store.getById(sid);
  if (!sesion || sesion.userId !== uid) {
    return {
      ok: false,
      status: 404,
      error: "Sesión de Umbral no encontrada.",
      codigo: sesion ? "SESION_AJENA" : "SESION_NO_ENCONTRADA",
    };
  }
  return { ok: true, sesion };
}

export async function ejecutarLecturaMapa(
  userId: string,
  sesionUmbral5Id: string,
  deps: Umbral5EngineDeps = {},
): Promise<LecturaResult> {
  const uid = userId.trim();
  const sid = sesionUmbral5Id.trim();
  if (!uid) return { ok: false, status: 400, error: "Falta userId." };
  if (!sid) return { ok: false, status: 400, error: "Falta sesionUmbral5Id." };

  const wallet = deps.wallet ?? createDefaultJuezWallet();
  const store = deps.store ?? createDefaultUmbral5Store();
  const sesion = await store.getById(sid);
  if (!sesion) {
    return {
      ok: false,
      status: 404,
      error: "Sesión de Umbral no encontrada.",
      codigo: "SESION_NO_ENCONTRADA",
    };
  }
  if (sesion.userId !== uid) {
    return {
      ok: false,
      status: 404,
      error: "Sesión de Umbral no encontrada.",
      codigo: "SESION_AJENA",
    };
  }

  if (sesion.estado === "MAPA_PAGO" && sesion.lectura) {
    return {
      ok: true,
      sesionUmbral5Id: sesion.id,
      lectura: sesion.lectura,
      creditosDescontados: 0,
      saldo: await wallet.saldo(uid),
      source: sesion.source === "gemini" ? "gemini" : "local_fallback",
      ritual: CASA_UMBRAL5_RITUAL,
      version: CASA_UMBRAL5_VERSION,
    };
  }

  const saldoAntes = await wallet.saldo(uid);
  if (saldoAntes < CREDITO_LECTURA_MAPA) {
    return {
      ok: false,
      status: 402,
      error: mensajeSaldoInsuficiente(CREDITO_LECTURA_MAPA, saldoAntes),
      codigo: "SALDO_INSUFICIENTE",
      requeridos: CREDITO_LECTURA_MAPA,
      saldo: saldoAntes,
    };
  }

  const dictamen = await dictaminar(
    { limiteConocido: sesion.textoVolcado },
    deps.callGemini,
  );
  const debito = await wallet.debitar(uid, CREDITO_LECTURA_MAPA);
  if (!debito.ok) {
    return {
      ok: false,
      status: 402,
      error: mensajeSaldoInsuficiente(CREDITO_LECTURA_MAPA, debito.saldo),
      codigo: "SALDO_INSUFICIENTE",
      requeridos: CREDITO_LECTURA_MAPA,
      saldo: debito.saldo,
    };
  }

  sesion.lectura = dictamen.lectura;
  sesion.source = dictamen.source;
  sesion.estado = "MAPA_PAGO";
  sesion.updatedAt = new Date().toISOString();
  await store.save(sesion);

  return {
    ok: true,
    sesionUmbral5Id: sesion.id,
    lectura: sesion.lectura,
    creditosDescontados: CREDITO_LECTURA_MAPA,
    saldo: debito.saldo,
    source: dictamen.source,
    ritual: CASA_UMBRAL5_RITUAL,
    version: CASA_UMBRAL5_VERSION,
  };
}

function bodyError(err: Umbral5EngineErr) {
  return {
    success: false as const,
    error: err.error,
    codigo: err.codigo ?? null,
    requeridos: err.requeridos ?? null,
    saldo: err.saldo ?? null,
    result: null,
  };
}

export function registerUmbral5Routes(
  app: Express,
  deps: Umbral5EngineDeps = {},
): void {
  const callGemini = deps.callGemini;
  const wallet = deps.wallet ?? createDefaultJuezWallet();
  const store = deps.store ?? createDefaultUmbral5Store();
  const runtime: Umbral5EngineDeps = { callGemini, wallet, store };

  const meta = {
    version: CASA_UMBRAL5_VERSION,
    planeta: 5,
    nombre: CASA_UMBRAL5_NOMBRE,
    marca: CASA_UMBRAL5_MARCA,
    firma: CASA_UMBRAL5_FIRMA,
    ritual: CASA_UMBRAL5_RITUAL,
    endpoints: {
      volcado: "POST /api/casas/umbral5/volcado",
      lectura: "POST /api/casas/umbral5/lectura",
      sesiones: "GET /api/casas/umbral5/sesiones",
      sesion: "GET /api/casas/umbral5/sesion/:id",
    },
    promptExport: "PROMPT_UMBRAL5",
    promptChars: PROMPT_UMBRAL5.length,
    gemini: Boolean(callGemini),
    fallbackLocal: true,
    creditos: { lectura: CREDITO_LECTURA_MAPA, volcado: 0 },
    dominioUsuario: [1, 2, 3, 5, 6, 7],
    dominioNuestro: [8, 9, 10],
  };

  app.get("/api/casas/umbral5/meta", (_req: Request, res: Response) => {
    res.json(meta);
  });

  app.get("/api/casas/umbral5/sesiones", async (req: Request, res: Response) => {
    try {
      const userId = String(req.query.userId ?? req.header("x-user-id") ?? "").trim();
      const resultado = await listarSesionesUmbral5(userId, runtime);
      if (!resultado.ok) {
        return res.status(resultado.status).json(bodyError(resultado));
      }
      return res.json({
        success: true,
        userId,
        sesiones: resultado.sesiones,
      });
    } catch (error) {
      console.error("[casas/umbral5/sesiones]", error);
      return res.status(500).json({
        success: false,
        error: "Error listando volcados de Umbral.",
        result: null,
      });
    }
  });

  app.get("/api/casas/umbral5/sesion/:id", async (req: Request, res: Response) => {
    try {
      const userId = String(req.query.userId ?? req.header("x-user-id") ?? "").trim();
      const id = String(req.params.id ?? "").trim();
      const resultado = await leerSesionUmbral5(userId, id, runtime);
      if (!resultado.ok) {
        return res.status(resultado.status).json(bodyError(resultado));
      }
      return res.json({
        success: true,
        sesion: resultado.sesion,
      });
    } catch (error) {
      console.error("[casas/umbral5/sesion]", error);
      return res.status(500).json({
        success: false,
        error: "Error leyendo la sesión de Umbral.",
        result: null,
      });
    }
  });

  app.get("/api/casas/umbral5/saldo", async (req: Request, res: Response) => {
    const userId = String(req.query.userId ?? req.header("x-user-id") ?? "").trim();
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Falta userId.",
        saldo: null,
      });
    }
    const saldo = await wallet.saldo(userId);
    return res.json({
      success: true,
      saldo,
      creditos: { lectura: CREDITO_LECTURA_MAPA, volcado: 0 },
    });
  });

  app.post("/api/casas/umbral5/volcado", async (req: Request, res: Response) => {
    try {
      const userId = userIdDe(req.body, req.header("x-user-id") ?? undefined);
      const input = normalizarInputUmbral5(req.body);
      if ("ok" in input && input.ok === false) {
        return res.status(input.status).json(bodyError(input));
      }
      const resultado = await ejecutarVolcadoGratis(userId, input.limiteConocido, runtime);
      if (!resultado.ok) {
        return res.status(resultado.status).json(bodyError(resultado));
      }
      return res.status(200).json({
        success: true,
        sesionUmbral5Id: resultado.sesionUmbral5Id,
        textoVolcado: resultado.textoVolcado,
        creditosDescontados: 0,
        saldo: resultado.saldo,
        ritual: resultado.ritual,
        version: resultado.version,
      });
    } catch (error) {
      console.error("[casas/umbral5/volcado]", error);
      return res.status(500).json({
        success: false,
        error: "Error guardando el volcado de Umbral.",
        result: null,
      });
    }
  });

  app.post("/api/casas/umbral5/lectura", async (req: Request, res: Response) => {
    try {
      const userId = userIdDe(req.body, req.header("x-user-id") ?? undefined);
      const sesionUmbral5Id = sesionIdDe(req.body);
      const resultado = await ejecutarLecturaMapa(userId, sesionUmbral5Id, runtime);
      if (!resultado.ok) {
        return res.status(resultado.status).json(bodyError(resultado));
      }
      return res.status(200).json({
        success: true,
        sesionUmbral5Id: resultado.sesionUmbral5Id,
        lectura: resultado.lectura,
        creditosDescontados: resultado.creditosDescontados,
        saldo: resultado.saldo,
        source: resultado.source,
        ritual: resultado.ritual,
        version: resultado.version,
      });
    } catch (error) {
      console.error("[casas/umbral5/lectura]", error);
      return res.status(500).json({
        success: false,
        error: "Error procesando la lectura de Umbral.",
        result: null,
      });
    }
  });
}

export { CREDITO_LECTURA_MAPA };
