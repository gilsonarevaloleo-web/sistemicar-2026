/**
 * Servicio de La Casa 5: Oficio.
 * Volcado de entrada gratis. Lectura local. Sin cobro en este corte.
 */

import { randomUUID } from "crypto";
import type { Express, Request, Response } from "express";
import {
  CASA_OFICIO_FIRMA,
  CASA_OFICIO_MARCA,
  CASA_OFICIO_NOMBRE,
  CASA_OFICIO_PERIMETRO,
  CASA_OFICIO_RITUAL,
  CASA_OFICIO_RITUAL_CORTO,
  CASA_OFICIO_VERSION,
  MATRIZ_OFICIO,
} from "../../shared/umbral/oficioCasa.ts";
import {
  diagnosticarOficioLocal,
  type OficioLectura,
  type SesionOficio,
} from "../../shared/umbral/oficioMotor.ts";

export interface OficioEngineErr {
  ok: false;
  status: 400;
  error: string;
  codigo?: "VOLCADO_VACIO";
}

export interface VolcadoOficioOk {
  ok: true;
  sesionOficioId: string;
  textoVolcado: string;
  lectura: OficioLectura;
  creditosDescontados: 0;
  source: "local";
  ritual: typeof CASA_OFICIO_RITUAL_CORTO;
  version: typeof CASA_OFICIO_VERSION;
}

const MIN_VOLCADO = 8;
const LIST_LIMIT = 20;

export interface OficioSessionStore {
  getById(id: string): Promise<SesionOficio | null>;
  listByUser(userId: string, limit?: number): Promise<SesionOficio[]>;
  save(sesion: SesionOficio): Promise<SesionOficio>;
}

export function createMemoryOficioStore(): OficioSessionStore {
  const byId = new Map<string, SesionOficio>();
  return {
    async getById(id) {
      return byId.get(id) ?? null;
    },
    async listByUser(userId, limit = LIST_LIMIT) {
      const uid = String(userId ?? "").trim();
      if (!uid) return [];
      return [...byId.values()]
        .filter((s) => s.userId === uid)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, Math.max(1, limit));
    },
    async save(sesion) {
      byId.set(sesion.id, sesion);
      return sesion;
    },
  };
}

let defaultStore: OficioSessionStore | null = null;

export function createDefaultOficioStore(): OficioSessionStore {
  if (!defaultStore) defaultStore = createMemoryOficioStore();
  return defaultStore;
}

function userIdDe(body: unknown, headerUserId?: string): string {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return String(raw.userId ?? raw.uid ?? headerUserId ?? "oficio-publico").trim() || "oficio-publico";
}

export function normalizarInputOficio(body: unknown):
  | { ok: true; texto: string }
  | OficioEngineErr {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const texto = String(
    raw.textoVolcado ?? raw.texto ?? raw.volcado ?? raw.oficio ?? "",
  ).trim();
  if (texto.length < MIN_VOLCADO) {
    return {
      ok: false,
      status: 400,
      error: "El volcado del oficio está vacío.",
      codigo: "VOLCADO_VACIO",
    };
  }
  return { ok: true, texto };
}

export async function ejecutarVolcadoOficio(
  userId: string,
  texto: string,
  store: OficioSessionStore,
): Promise<VolcadoOficioOk> {
  const lectura = diagnosticarOficioLocal(texto);
  const sesion: SesionOficio = {
    id: randomUUID(),
    userId,
    textoVolcado: texto.trim(),
    lectura,
    createdAt: new Date().toISOString(),
  };
  await store.save(sesion);
  return {
    ok: true,
    sesionOficioId: sesion.id,
    textoVolcado: sesion.textoVolcado,
    lectura,
    creditosDescontados: 0,
    source: "local",
    ritual: CASA_OFICIO_RITUAL_CORTO,
    version: CASA_OFICIO_VERSION,
  };
}

function bodyError(err: OficioEngineErr) {
  return {
    success: false,
    error: err.error,
    codigo: err.codigo ?? null,
    result: null,
  };
}

export function registerOficioRoutes(
  app: Express,
  deps: { store?: OficioSessionStore } = {},
): void {
  const store = deps.store ?? createDefaultOficioStore();

  app.get("/api/casas/oficio/meta", (_req: Request, res: Response) => {
    return res.json({
      success: true,
      casa: CASA_OFICIO_NOMBRE,
      marca: CASA_OFICIO_MARCA,
      ritual: CASA_OFICIO_RITUAL_CORTO,
      ritualLargo: CASA_OFICIO_RITUAL,
      firma: CASA_OFICIO_FIRMA,
      perimetro: CASA_OFICIO_PERIMETRO,
      version: CASA_OFICIO_VERSION,
      matriz: MATRIZ_OFICIO,
      creditos: { volcado: 0 },
      endpoints: {
        volcado: "POST /api/casas/oficio/volcado",
        meta: "GET /api/casas/oficio/meta",
      },
    });
  });

  app.post("/api/casas/oficio/volcado", async (req: Request, res: Response) => {
    try {
      const userId = userIdDe(req.body, req.header("x-user-id") ?? undefined);
      const input = normalizarInputOficio(req.body);
      if (input.ok === false) {
        return res.status(input.status).json(bodyError(input));
      }
      const resultado = await ejecutarVolcadoOficio(userId, input.texto, store);
      return res.status(200).json({
        success: true,
        sesionOficioId: resultado.sesionOficioId,
        textoVolcado: resultado.textoVolcado,
        lectura: resultado.lectura,
        creditosDescontados: 0,
        source: resultado.source,
        ritual: resultado.ritual,
        version: resultado.version,
      });
    } catch (error) {
      console.error("[casas/oficio/volcado]", error);
      return res.status(500).json({
        success: false,
        error: "Error leyendo el volcado de Oficio.",
        result: null,
      });
    }
  });
}
