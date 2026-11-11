/**
 * Servicio del gimnasio (planeta 6).
 * Se abre desde la lectura del límite. Entrenar no cobra. Precio: después.
 */

import type { Express, Request, Response } from "express";
import {
  GIMNASIO6_FIRMA,
  GIMNASIO6_MARCA,
  GIMNASIO6_NOMBRE,
  GIMNASIO6_VERSION,
} from "../../shared/casas/gimnasio6/index.ts";
import {
  abrirSiguienteCapitulo,
  aplicarRespuesta,
  evaluarRespuestaLocal,
  parseEvaluacion,
  puedeAbrirCapitulo,
  preguntaVivaDe,
  recursosVacios,
  resolverEvaluacion,
  textoCopiaLibro,
} from "../../shared/casas/gimnasio6/motor.ts";
import { serializarPromptGimnasio6 } from "../../shared/casas/gimnasio6/prompt.ts";
import { preguntaCanon } from "../../shared/casas/gimnasio6/canon.ts";
import {
  SESION_PUERTA_VENDEDOR,
  puertaDeModulo,
  type CapituloId,
  type LibroGimnasio,
  type PreguntaViva,
} from "../../shared/casas/gimnasio6/types.ts";
import { hayPesoParaGimnasio, pesoDeVolcados } from "../../shared/casas/umbral5/peso.ts";
import type { Umbral5SessionStore } from "./umbral5Store.ts";
import { createDefaultUmbral5Store } from "./umbral5Store.ts";
import {
  createDefaultGimnasio6Store,
  hydrateLibroGimnasio,
  newLibroGimnasioId,
  type Gimnasio6Store,
} from "./gimnasio6Store.ts";

export type Gimnasio6GeminiCaller = (
  prompt: string,
  maxTokens?: number,
  jsonMode?: boolean,
) => Promise<string>;

export interface Gimnasio6EngineDeps {
  callGemini?: Gimnasio6GeminiCaller;
  store?: Gimnasio6Store;
  umbral5Store?: Umbral5SessionStore;
  /** Tope para no perder el turno si Gemini se cuelga (Netlify corta la función). */
  geminiTimeoutMs?: number;
}

const GEMINI_TURNO_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("gimnasio6 Gemini timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface Gimnasio6EngineErr {
  ok: false;
  status: 400 | 404 | 409;
  error: string;
  codigo?:
    | "FALTA_USER"
    | "SESION_NO_ENCONTRADA"
    | "SIN_MAPA"
    | "SIN_PESO"
    | "SIN_MODULO"
    | "TOPE_DIARIO"
    | "LIBRO_NO_ENCONTRADO"
    | "RESPUESTA_VACIA"
    | "CAPITULO_NO_PREPARADO";
}

function userIdDe(body: unknown, headerUserId?: string): string {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return String(raw.userId ?? raw.uid ?? headerUserId ?? "").trim();
}

function payloadVivo(libro: LibroGimnasio) {
  const pregunta: PreguntaViva | null = preguntaVivaDe(libro);
  return {
    libro,
    pregunta: libro.estado === "ABIERTO" ? pregunta : null,
    copia: textoCopiaLibro(libro),
    topeDiario: libro.estado === "TOPE_DIARIO",
    ritualEntrada: "¿Cuál es tu límite?",
    version: GIMNASIO6_VERSION,
  };
}

async function evaluarTurno(
  libro: LibroGimnasio,
  respuesta: string,
  callGemini?: Gimnasio6GeminiCaller,
  geminiTimeoutMs: number = GEMINI_TURNO_MS,
) {
  const puerta = puertaDeModulo(libro.modulo);
  const canon = preguntaCanon(
    libro.puntero.capitulo,
    1,
    libro.puntero.indice,
    puerta,
    libro.limiteOrigen,
  );
  const local = evaluarRespuestaLocal(
    canon ?? {
      capitulo: 1,
      subcodigo: 1,
      indice: 1,
      escenario: "",
      pregunta: "",
      criterioMotor: "",
    },
    respuesta,
  );
  // Ya raspó y no es la primera variante: no esperamos a Gemini para no perder el turno.
  if (local.pasa && libro.puntero.variante >= 1) return local;
  if (!callGemini || !canon) return local;
  try {
    const raw = await withTimeout(
      callGemini(
        serializarPromptGimnasio6({
          limiteOrigen: libro.limiteOrigen,
          pregunta: canon,
          respuesta,
          variante: libro.puntero.variante,
          puerta,
        }),
        512,
        true,
      ),
      geminiTimeoutMs,
    );
    const parsed = parseEvaluacion(raw);
    return resolverEvaluacion(local, parsed, libro.puntero.variante);
  } catch (error) {
    console.warn("[gimnasio6Engine] Gemini falló → fallback local:", error);
  }
  return local;
}

export async function abrirLibroGimnasio(
  userId: string,
  sesionUmbral5Id: string,
  deps: Gimnasio6EngineDeps = {},
): Promise<{ ok: true } & ReturnType<typeof payloadVivo> | Gimnasio6EngineErr> {
  const uid = userId.trim();
  const sid = sesionUmbral5Id.trim();
  if (!uid) return { ok: false, status: 400, error: "Falta userId.", codigo: "FALTA_USER" };
  if (!sid) {
    return { ok: false, status: 400, error: "Falta sesionUmbral5Id.", codigo: "SESION_NO_ENCONTRADA" };
  }

  const umbralStore = deps.umbral5Store ?? createDefaultUmbral5Store();
  const store = deps.store ?? createDefaultGimnasio6Store();
  const sesion = await umbralStore.getById(sid);
  if (!sesion || sesion.userId !== uid) {
    return {
      ok: false,
      status: 404,
      error: "Sesión de límite no encontrada.",
      codigo: "SESION_NO_ENCONTRADA",
    };
  }
  if (!sesion.lectura) {
    return {
      ok: false,
      status: 409,
      error: "Primero el volcado del límite. El gimnasio es capa profunda.",
      codigo: "SIN_MAPA",
    };
  }
  const serie = await umbralStore.listByUser(uid);
  if (!hayPesoParaGimnasio(serie)) {
    return {
      ok: false,
      status: 409,
      error: "Todavía no hay peso. Seguí volcando el límite.",
      codigo: "SIN_PESO",
    };
  }
  const peso = pesoDeVolcados(serie);
  const canal = peso.canal ?? sesion.lectura.codigoLimite ?? 1;
  const codigo: CapituloId = canal;

  const existente = await store.getBySesionUmbral5(uid, sid);
  if (existente) {
    return { ok: true, ...payloadVivo(existente) };
  }

  const now = new Date().toISOString();
  const libro: LibroGimnasio = {
    id: newLibroGimnasioId(),
    userId: uid,
    sesionUmbral5Id: sid,
    modulo: "limite",
    limiteOrigen: sesion.textoVolcado,
    recursos: recursosVacios(),
    puntero: { capitulo: codigo, subcodigo: 1, indice: 1, variante: 0 },
    estado: "ABIERTO",
    capituloSelladoDia: null,
    capitulosSellados: [],
    turnos: [],
    createdAt: now,
    updatedAt: now,
  };
  await store.save(libro);
  return { ok: true, ...payloadVivo(libro) };
}

export async function abrirLibroVendedor(
  userId: string,
  textoOficio = "",
  deps: Gimnasio6EngineDeps = {},
): Promise<{ ok: true } & ReturnType<typeof payloadVivo> | Gimnasio6EngineErr> {
  const uid = userId.trim();
  if (!uid) return { ok: false, status: 400, error: "Falta userId.", codigo: "FALTA_USER" };

  const store = deps.store ?? createDefaultGimnasio6Store();
  const existente = await store.getBySesionUmbral5(uid, SESION_PUERTA_VENDEDOR);
  if (existente) {
    return { ok: true, ...payloadVivo(existente) };
  }

  const origen =
    textoOficio.trim() ||
    "El oficio. Sabés qué hacer. El cuerpo niega el deber de vender.";
  const now = new Date().toISOString();
  const libro: LibroGimnasio = {
    id: newLibroGimnasioId(),
    userId: uid,
    sesionUmbral5Id: SESION_PUERTA_VENDEDOR,
    modulo: "vendedor",
    limiteOrigen: origen,
    recursos: recursosVacios(),
    puntero: { capitulo: 1, subcodigo: 1, indice: 1, variante: 0 },
    estado: "ABIERTO",
    capituloSelladoDia: null,
    capitulosSellados: [],
    turnos: [],
    createdAt: now,
    updatedAt: now,
  };
  await store.save(libro);
  return { ok: true, ...payloadVivo(libro) };
}

async function cargarLibroVivo(
  store: Gimnasio6Store,
  uid: string,
  lid: string,
  snapshot?: unknown,
): Promise<LibroGimnasio | null> {
  const found = await store.getById(lid);
  if (found && found.userId === uid) return found;
  const recovered = hydrateLibroGimnasio(snapshot, { userId: uid, id: lid });
  if (!recovered) return null;
  return store.save(recovered);
}

export async function responderGimnasio(
  userId: string,
  libroId: string,
  respuesta: string,
  deps: Gimnasio6EngineDeps = {},
  snapshot?: unknown,
): Promise<{ ok: true } & ReturnType<typeof payloadVivo> | Gimnasio6EngineErr> {
  const uid = userId.trim();
  const lid = libroId.trim();
  const texto = respuesta.trim();
  if (!uid) return { ok: false, status: 400, error: "Falta userId.", codigo: "FALTA_USER" };
  if (!lid) {
    return { ok: false, status: 404, error: "Libro no encontrado.", codigo: "LIBRO_NO_ENCONTRADO" };
  }
  if (!texto) {
    return { ok: false, status: 400, error: "Falta la respuesta.", codigo: "RESPUESTA_VACIA" };
  }

  const store = deps.store ?? createDefaultGimnasio6Store();
  const libro = await cargarLibroVivo(store, uid, lid, snapshot);
  if (!libro || libro.userId !== uid) {
    return { ok: false, status: 404, error: "Libro no encontrado.", codigo: "LIBRO_NO_ENCONTRADO" };
  }
  if (libro.estado === "TOPE_DIARIO") {
    return {
      ok: false,
      status: 409,
      error: "A lo mucho un capítulo por día. Mañana sigue el libro.",
      codigo: "TOPE_DIARIO",
    };
  }
  if (libro.estado === "LIBRO_CERRADO") {
    return { ok: true, ...payloadVivo(libro) };
  }
  if (libro.estado !== "ABIERTO") {
    return {
      ok: false,
      status: 409,
      error: "Este capítulo no está abierto.",
      codigo: "CAPITULO_NO_PREPARADO",
    };
  }

  const evaluacion = await evaluarTurno(
    libro,
    texto,
    deps.callGemini,
    deps.geminiTimeoutMs ?? GEMINI_TURNO_MS,
  );
  const next = aplicarRespuesta(libro, texto, evaluacion);
  await store.save(next);
  return { ok: true, ...payloadVivo(next) };
}

export async function continuarCapituloGimnasio(
  userId: string,
  libroId: string,
  deps: Gimnasio6EngineDeps = {},
  now: Date | string = new Date(),
  snapshot?: unknown,
): Promise<{ ok: true } & ReturnType<typeof payloadVivo> | Gimnasio6EngineErr> {
  const uid = userId.trim();
  const lid = libroId.trim();
  if (!uid) return { ok: false, status: 400, error: "Falta userId.", codigo: "FALTA_USER" };
  const store = deps.store ?? createDefaultGimnasio6Store();
  const libro = await cargarLibroVivo(store, uid, lid, snapshot);
  if (!libro || libro.userId !== uid) {
    return { ok: false, status: 404, error: "Libro no encontrado.", codigo: "LIBRO_NO_ENCONTRADO" };
  }
  if (!puedeAbrirCapitulo(libro, now)) {
    return {
      ok: false,
      status: 409,
      error: "A lo mucho un capítulo por día. Mañana sigue el libro.",
      codigo: "TOPE_DIARIO",
    };
  }
  const next = abrirSiguienteCapitulo(libro, now);
  await store.save(next);
  return { ok: true, ...payloadVivo(next) };
}

export async function listarLibrosGimnasio(
  userId: string,
  deps: Gimnasio6EngineDeps = {},
): Promise<{ ok: true; libros: LibroGimnasio[] } | Gimnasio6EngineErr> {
  const uid = userId.trim();
  if (!uid) return { ok: false, status: 400, error: "Falta userId.", codigo: "FALTA_USER" };
  const store = deps.store ?? createDefaultGimnasio6Store();
  return { ok: true, libros: await store.listByUser(uid) };
}

export async function leerLibroGimnasio(
  userId: string,
  libroId: string,
  deps: Gimnasio6EngineDeps = {},
): Promise<{ ok: true } & ReturnType<typeof payloadVivo> | Gimnasio6EngineErr> {
  const uid = userId.trim();
  const lid = libroId.trim();
  if (!uid) return { ok: false, status: 400, error: "Falta userId.", codigo: "FALTA_USER" };
  const store = deps.store ?? createDefaultGimnasio6Store();
  const libro = await store.getById(lid);
  if (!libro || libro.userId !== uid) {
    return { ok: false, status: 404, error: "Libro no encontrado.", codigo: "LIBRO_NO_ENCONTRADO" };
  }
  return { ok: true, ...payloadVivo(libro) };
}

function bodyError(err: Gimnasio6EngineErr) {
  return {
    success: false as const,
    error: err.error,
    codigo: err.codigo ?? null,
    result: null,
  };
}

export function registerGimnasio6Routes(
  app: Express,
  deps: Gimnasio6EngineDeps = {},
): void {
  const runtime: Gimnasio6EngineDeps = {
    callGemini: deps.callGemini,
    store: deps.store ?? createDefaultGimnasio6Store(),
    umbral5Store: deps.umbral5Store ?? createDefaultUmbral5Store(),
    geminiTimeoutMs: deps.geminiTimeoutMs,
  };

  app.get("/api/casas/gimnasio6/meta", (_req: Request, res: Response) => {
    res.json({
      version: GIMNASIO6_VERSION,
      planeta: 6,
      nombre: GIMNASIO6_NOMBRE,
      marca: GIMNASIO6_MARCA,
      firma: GIMNASIO6_FIRMA,
      ritualEntrada: "¿Cuál es tu límite?",
      puertas: { limite: "A", vendedor: "B" },
      modulo: "limite",
      creditos: { abrir: 0, responder: 0, abrirVendedor: 0 },
      endpoints: {
        abrir: "POST /api/casas/gimnasio6/abrir",
        abrirVendedor: "POST /api/casas/gimnasio6/abrir-vendedor",
        responder: "POST /api/casas/gimnasio6/responder",
        continuar: "POST /api/casas/gimnasio6/continuar",
        libros: "GET /api/casas/gimnasio6/libros",
        libro: "GET /api/casas/gimnasio6/libro/:id",
      },
    });
  });

  app.get("/api/casas/gimnasio6/libros", async (req: Request, res: Response) => {
    try {
      const userId = String(req.query.userId ?? req.header("x-user-id") ?? "").trim();
      const resultado = await listarLibrosGimnasio(userId, runtime);
      if (!resultado.ok) return res.status(resultado.status).json(bodyError(resultado));
      return res.json({ success: true, libros: resultado.libros });
    } catch (error) {
      console.error("[casas/gimnasio6/libros]", error);
      return res.status(500).json({ success: false, error: "Error listando libros.", result: null });
    }
  });

  app.get("/api/casas/gimnasio6/libro/:id", async (req: Request, res: Response) => {
    try {
      const userId = String(req.query.userId ?? req.header("x-user-id") ?? "").trim();
      const id = String(req.params.id ?? "").trim();
      const resultado = await leerLibroGimnasio(userId, id, runtime);
      if (!resultado.ok) return res.status(resultado.status).json(bodyError(resultado));
      return res.json({
        success: true,
        libro: resultado.libro,
        pregunta: resultado.pregunta,
        copia: resultado.copia,
        topeDiario: resultado.topeDiario,
        ritualEntrada: resultado.ritualEntrada,
      });
    } catch (error) {
      console.error("[casas/gimnasio6/libro]", error);
      return res.status(500).json({ success: false, error: "Error leyendo el libro.", result: null });
    }
  });

  app.post("/api/casas/gimnasio6/abrir-vendedor", async (req: Request, res: Response) => {
    try {
      const userId = userIdDe(req.body, req.header("x-user-id") ?? undefined);
      const raw = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      const textoOficio = String(raw.textoOficio ?? raw.texto ?? raw.limiteOrigen ?? "").trim();
      const resultado = await abrirLibroVendedor(userId, textoOficio, runtime);
      if (!resultado.ok) return res.status(resultado.status).json(bodyError(resultado));
      return res.json({
        success: true,
        libro: resultado.libro,
        pregunta: resultado.pregunta,
        copia: resultado.copia,
        topeDiario: resultado.topeDiario,
        ritualEntrada: resultado.ritualEntrada,
      });
    } catch (error) {
      console.error("[casas/gimnasio6/abrir-vendedor]", error);
      return res.status(500).json({ success: false, error: "Error abriendo la puerta B.", result: null });
    }
  });

  app.post("/api/casas/gimnasio6/abrir", async (req: Request, res: Response) => {
    try {
      const userId = userIdDe(req.body, req.header("x-user-id") ?? undefined);
      const raw = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      const sesionUmbral5Id = String(raw.sesionUmbral5Id ?? raw.sesionId ?? "").trim();
      const resultado = await abrirLibroGimnasio(userId, sesionUmbral5Id, runtime);
      if (!resultado.ok) return res.status(resultado.status).json(bodyError(resultado));
      return res.json({
        success: true,
        libro: resultado.libro,
        pregunta: resultado.pregunta,
        copia: resultado.copia,
        topeDiario: resultado.topeDiario,
        ritualEntrada: resultado.ritualEntrada,
      });
    } catch (error) {
      console.error("[casas/gimnasio6/abrir]", error);
      return res.status(500).json({ success: false, error: "Error abriendo el gimnasio.", result: null });
    }
  });

  app.post("/api/casas/gimnasio6/responder", async (req: Request, res: Response) => {
    try {
      const userId = userIdDe(req.body, req.header("x-user-id") ?? undefined);
      const raw = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      const libroId = String(raw.libroId ?? raw.id ?? "").trim();
      const respuesta = String(raw.respuesta ?? raw.texto ?? "").trim();
      const resultado = await responderGimnasio(
        userId,
        libroId,
        respuesta,
        runtime,
        raw.libro ?? raw.snapshot,
      );
      if (!resultado.ok) return res.status(resultado.status).json(bodyError(resultado));
      return res.json({
        success: true,
        libro: resultado.libro,
        pregunta: resultado.pregunta,
        copia: resultado.copia,
        topeDiario: resultado.topeDiario,
        ritualEntrada: resultado.ritualEntrada,
      });
    } catch (error) {
      console.error("[casas/gimnasio6/responder]", error);
      return res.status(500).json({ success: false, error: "Error en el turno del gimnasio.", result: null });
    }
  });

  app.post("/api/casas/gimnasio6/continuar", async (req: Request, res: Response) => {
    try {
      const userId = userIdDe(req.body, req.header("x-user-id") ?? undefined);
      const raw = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      const libroId = String(raw.libroId ?? raw.id ?? "").trim();
      const resultado = await continuarCapituloGimnasio(
        userId,
        libroId,
        runtime,
        new Date(),
        raw.libro ?? raw.snapshot,
      );
      if (!resultado.ok) return res.status(resultado.status).json(bodyError(resultado));
      return res.json({
        success: true,
        libro: resultado.libro,
        pregunta: resultado.pregunta,
        copia: resultado.copia,
        topeDiario: resultado.topeDiario,
        ritualEntrada: resultado.ritualEntrada,
      });
    } catch (error) {
      console.error("[casas/gimnasio6/continuar]", error);
      return res.status(500).json({ success: false, error: "Error continuando el capítulo.", result: null });
    }
  });
}
