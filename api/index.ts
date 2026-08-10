import express from "express";
import type { Request, Response } from "express";
import OpenAI from "openai";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { getPublicAppBaseUrl } from "../shared/publicBaseUrl";
import { SUBSCRIPTION_PLANS } from "../shared/mercadopagoPlans";
import { deliverCorazonSabioIfNeeded, parseMpExternalRef } from "../server/mercadopagoEspejo";
import { registerUmbralV2Routes } from "../server/umbralV2Routes";
import {
  createDefaultUmbralSessionStore,
  initUmbralSessionsTable,
} from "../server/umbralSessionStore";
import { GEMINI_MODELS } from "../shared/geminiConfig";

const app = express();
app.use(express.json({ limit: "5mb" }));

const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

async function callGeminiUmbral(
  prompt: string,
  maxTokens: number = 2048,
  jsonMode: boolean = false,
): Promise<string> {
  if (!gemini.apiKey) {
    throw new Error("Gemini no disponible: configura GEMINI_API_KEY");
  }
  const errors: string[] = [];
  for (const model of GEMINI_MODELS) {
    try {
      const response = await gemini.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        ...(jsonMode
          ? { response_format: { type: "json_object" as const } }
          : {}),
      });
      const content = response.choices?.[0]?.message?.content || "";
      if (!content.trim()) throw new Error(`respuesta vacía (${model})`);
      return content;
    } catch (err: any) {
      errors.push(`${model}:${err?.message || err}`);
      continue;
    }
  }
  throw new Error(`Gemini no disponible: ${errors.join(" | ")}`);
}

initUmbralSessionsTable().catch((err) =>
  console.warn("[umbralSessions] Table init failed (non-fatal):", err?.message),
);
registerUmbralV2Routes(app, {
  callGemini: callGeminiUmbral,
  sessionStore: createDefaultUmbralSessionStore(),
});

app.post("/api/alquimia/validate", async (req: Request, res: Response) => {
  try {
    const { observacion, crisis, leccion, maestria, oro } = req.body;
    
    if (!observacion || !crisis || !leccion || !maestria || !oro) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    const prompt = `Eres el Auditor de Sistemicar. Tu lenguaje es técnico, directo y orientado a la ingeniería de conciencia. No uses lenguaje motivacional genérico. Evalúa con rigor.

PLOMO (Observación inicial):
${observacion}

CRISIS (Conflicto/Resistencia):
${crisis}

LECCIÓN (Conocimiento extraído):
${leccion}

MAESTRÍA (Aplicación futura):
${maestria}

ORO (Frase de síntesis):
"${oro}"

CRITERIOS DE AUDITORÍA ESTRICTA:
1. Si la CRISIS no describe una resistencia REAL (interna o externa), deduce -20%
2. Si la LECCIÓN no tiene pasos ACCIONABLES y concretos, deduce -15%
3. Si el ORO no tiene relación DIRECTA con el PLOMO (observación), deduce -30%
4. Si los ejes no muestran progresión lógica (Observación→Crisis→Lección→Maestría→Oro), deduce -10%

Empiezas en 100% y deduces según los criterios.

RESPONDE EN FORMATO JSON EXACTO:
{
  "score": <número 0-100>,
  "ejeFlojo": "<nombre del eje más débil: observacion|crisis|leccion|maestria|oro o null si todos bien>",
  "feedback": "<Si score < 90, explica qué eje está flojo y qué pregunta debe responder el usuario para mejorar. Si score >= 90, escribe 'Transmutación de alta calidad.'>",
  "deducciones": "<lista de deducciones aplicadas, ej: 'Crisis genérica (-20%), Oro desconectado (-30%)'>"
}

Responde SOLO con el JSON, sin texto adicional.`;

    const response = await gemini.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content || '{"score": 75}';
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const score = Math.min(100, Math.max(0, parseInt(parsed.score) || 75));
        res.json({ 
          score,
          ejeFlojo: parsed.ejeFlojo || null,
          feedback: parsed.feedback || null,
          deducciones: parsed.deducciones || null
        });
      } else {
        const numMatch = content.match(/\d+/);
        res.json({ score: numMatch ? parseInt(numMatch[0]) : 75, ejeFlojo: null, feedback: null, deducciones: null });
      }
    } catch {
      const numMatch = content.match(/\d+/);
      res.json({ score: numMatch ? parseInt(numMatch[0]) : 75, ejeFlojo: null, feedback: null, deducciones: null });
    }
  } catch (error) {
    console.error("Alquimia validation error:", error);
    res.status(503).json({
      error: "AUDITOR_UNAVAILABLE",
      score: null,
      ejeFlojo: null,
      feedback: "El servicio de auditoría no respondió. Reintenta en unos minutos.",
      deducciones: null,
    });
  }
});

app.post("/api/cierre-jornada", async (req: Request, res: Response) => {
  try {
    const { energyLogs, aliados, alquimias, userName } = req.body;
    
    const energyFrequency: Record<string, number> = { enfoque: 0, conflicto: 0, pasos: 0, alcance: 0 };
    const todayLogs = (energyLogs || []).filter((log: any) => {
      const logDate = new Date(log.timestamp);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    });
    
    todayLogs.forEach((log: any) => {
      if (energyFrequency[log.type] !== undefined) {
        energyFrequency[log.type]++;
      }
    });
    
    const dominantAxis = Object.entries(energyFrequency)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "ninguno";
    
    const lastAliado = (aliados || [])[0];
    const lastShadow = lastAliado?.shadow?.lenguaje || "No has identificado límites recientemente";
    
    const lastAlquimia = (alquimias || [])[0];
    const lastOro = lastAlquimia?.oro || null;
    const lastAlquimiaScore = lastAlquimia?.alquimiaScore || null;
    
    const prompt = `Eres el Mentor de Cierre de Sistemicar. Tu lenguaje es técnico, directo y orientado a la ingeniería de conciencia. No uses lenguaje motivacional genérico. Usa los datos del usuario para confrontarlo con su propia estructura.

DATOS DEL USUARIO (${userName || "Guerrero"}):

FRECUENCIA DE ENERGÍA HOY:
- ENFOQUE (atención): ${energyFrequency.enfoque} registros
- CONFLICTO (resistencia): ${energyFrequency.conflicto} registros
- PASOS (distribución): ${energyFrequency.pasos} registros
- ALCANCE (límites): ${energyFrequency.alcance} registros
- Eje predominante: ${dominantAxis.toUpperCase()}
- Total registros hoy: ${todayLogs.length}

ÚLTIMO LÍMITE IDENTIFICADO (Umbral):
"${lastShadow}"

${lastOro ? `ÚLTIMA FRASE DE ORO (Alquimia ${lastAlquimiaScore}%):
"${lastOro}"` : "No hay alquimias recientes."}

ESTRUCTURA DE RESPUESTA:
1. RECONOCIMIENTO DE DATA: Empieza con un dato específico del usuario ("Hoy registraste X..." o "Tu eje dominante fue...")
2. DIAGNÓSTICO SISTÉMICO: Conecta el patrón con su límite identificado o su alquimia reciente
3. PRESCRIPCIÓN TÉCNICA: Una acción concreta para mañana (no motivacional, sino técnica)

RESPONDE EN FORMATO JSON:
{
  "reconocimiento": "<1 frase con datos específicos>",
  "diagnostico": "<1-2 frases conectando patrones>",
  "prescripcion": "<1 acción técnica concreta para mañana>",
  "ejeDebil": "<enfoque|conflicto|pasos|alcance - el que menos usó o más necesita trabajar>"
}

Responde SOLO con el JSON.`;

    const response = await gemini.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({
          reconocimiento: parsed.reconocimiento || "Hoy trabajaste en tu conciencia.",
          diagnostico: parsed.diagnostico || "Tu estructura muestra áreas de crecimiento.",
          prescripcion: parsed.prescripcion || "Mañana, registra al menos un eje diferente al de hoy.",
          ejeDebil: parsed.ejeDebil || dominantAxis,
          stats: {
            energyFrequency,
            dominantAxis,
            totalLogsToday: todayLogs.length,
            lastShadow,
            lastOro
          }
        });
      } else {
        res.json({
          reconocimiento: "Hoy trabajaste en tu conciencia.",
          diagnostico: "Tu estructura muestra áreas de crecimiento.",
          prescripcion: "Mañana, registra al menos un eje diferente al de hoy.",
          ejeDebil: dominantAxis,
          stats: { energyFrequency, dominantAxis, totalLogsToday: todayLogs.length }
        });
      }
    } catch {
      res.json({
        reconocimiento: "Hoy trabajaste en tu conciencia.",
        diagnostico: "Tu estructura muestra áreas de crecimiento.",
        prescripcion: "Mañana, registra al menos un eje diferente al de hoy.",
        ejeDebil: dominantAxis,
        stats: { energyFrequency, dominantAxis, totalLogsToday: todayLogs.length }
      });
    }
  } catch (error) {
    console.error("Cierre jornada error:", error);
    res.json({
      reconocimiento: "Hoy trabajaste en tu transformación.",
      diagnostico: "Continúa registrando tu energía para obtener mejores diagnósticos.",
      prescripcion: "Mañana, comienza el día con un registro de ENFOQUE.",
      ejeDebil: "enfoque",
      stats: {}
    });
  }
});

app.post("/api/embudo/clasificar", async (req: Request, res: Response) => {
  try {
    const { profesion } = req.body;
    
    if (!profesion || profesion.trim().length < 2) {
      return res.json({
        categoria: "base",
        multiplicador: 1.0,
        terminoValor: "Crecimiento Personal",
        terminoLibertad: "Libertad Financiera"
      });
    }

    const prompt = `Eres un clasificador de profesiones para determinar pricing.
    
Analiza esta profesión/negocio: "${profesion}"

Clasifica en UNA de estas categorías:
1. "alto_capital" - Si maneja inversiones, trading, bienes raíces, fondos, crypto, forex, o gestión de patrimonio significativo
2. "base" - Cualquier otra profesión (coaching, ecommerce, agencias, servicios, etc.)

Responde SOLO con este JSON:
{
  "categoria": "alto_capital" o "base",
  "terminoValor": "término que describa el valor principal (ej: Retorno de Inversión, Escalamiento, Impacto)",
  "terminoLibertad": "término que describa su meta (ej: Disciplina de Mercado, Libertad de Tiempo)"
}`;

    const response = await gemini.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const esAltoCapital = parsed.categoria === "alto_capital";
        res.json({
          categoria: esAltoCapital ? "alto_capital" : "base",
          multiplicador: esAltoCapital ? 1.4 : 1.0,
          terminoValor: parsed.terminoValor || "Crecimiento Personal",
          terminoLibertad: parsed.terminoLibertad || "Libertad Financiera"
        });
      } else {
        res.json({
          categoria: "base",
          multiplicador: 1.0,
          terminoValor: "Crecimiento Personal",
          terminoLibertad: "Libertad Financiera"
        });
      }
    } catch {
      res.json({
        categoria: "base",
        multiplicador: 1.0,
        terminoValor: "Crecimiento Personal",
        terminoLibertad: "Libertad Financiera"
      });
    }
  } catch (error) {
    console.error("Clasificador error:", error);
    res.json({
      categoria: "base",
      multiplicador: 1.0,
      terminoValor: "Crecimiento Personal",
      terminoLibertad: "Libertad Financiera"
    });
  }
});

app.post("/api/send-welcome-email", async (_req: Request, res: Response) => {
  res.json({ success: true, message: "Email service configured in production" });
});

app.post("/api/proyector/generate-narrative", async (req: Request, res: Response) => {
  try {
    const { capsulas } = req.body;
    
    if (!capsulas) {
      return res.status(400).json({ error: "Cápsulas requeridas" });
    }

    let context = "Información de las cápsulas de proyección futura:\n\n";
    
    const capsuleLabels: Record<string, string> = {
      vision: "VISIÓN",
      arquitectura: "ARQUITECTURA", 
      recurso: "RECURSO",
      colapso: "COLAPSO"
    };

    for (const [capsuleId, levels] of Object.entries(capsulas)) {
      const label = capsuleLabels[capsuleId] || capsuleId.toUpperCase();
      context += `== ${label} ==\n`;
      for (const [nivel, value] of Object.entries(levels as Record<number, string>)) {
        if (value && String(value).trim()) {
          context += `Nivel ${nivel}: ${value}\n`;
        }
      }
      context += "\n";
    }

    const response = await gemini.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Eres un oráculo de manifestación de realidad en SISTEMICAR.
Tu tarea es crear una narrativa INMERSIVA en PRIMERA PERSONA que proyecte al usuario a su realidad futura.

REGLAS:
1. Escribe en primera persona del usuario ("Yo soy...", "Yo veo...", "Yo siento...")
2. Usa tiempo PRESENTE como si ya fuera su realidad actual
3. Integra TODOS los elementos de las cápsulas en una narrativa fluida
4. Sé específico con los detalles que el usuario proporcionó
5. Hazlo emocional y poderoso, que sienta que ya está viviendo esa realidad
6. Máximo 400 palabras
7. Termina con una afirmación de poder
8. Escribe en español`
        },
        {
          role: "user",
          content: `Basándote en esta información de proyección futura, crea una narrativa inmersiva en primera persona:\n\n${context}`
        }
      ],
      max_tokens: 800,
      temperature: 0.8
    });

    const narrative = response.choices?.[0]?.message?.content || 
      "Tu realidad proyectada está tomando forma. Cada paso que das te acerca a la manifestación de tu visión. Confía en el proceso.";

    res.json({ narrative });
  } catch (error) {
    console.error("Proyector narrative error:", error);
    res.json({ 
      narrative: "Estoy de pie en mi nueva realidad. Todo lo que visualicé se ha manifestado. Siento la certeza de que cada paso me trajo aquí. Esta es mi vida ahora, y cada día la expando más."
    });
  }
});

app.post("/api/proyector/guided-prompt", async (req: Request, res: Response) => {
  try {
    const { eje, respuestaActual, respuestasAnteriores } = req.body;
    
    if (!eje) {
      return res.status(400).json({ error: "Eje requerido" });
    }

    const ejesInfo: Record<string, { nombre: string; descripcion: string; preguntaBase: string }> = {
      vision: { 
        nombre: "VISIÓN", 
        descripcion: "Lo que deseas manifestar en tu realidad futura",
        preguntaBase: "¿Qué ves en tu realidad futura ideal?"
      },
      tension: { 
        nombre: "TENSIÓN", 
        descripcion: "La brecha entre donde estás y donde quieres estar",
        preguntaBase: "¿Qué tensión o brecha existe entre tu realidad actual y la que deseas?"
      },
      accion: { 
        nombre: "ACCIÓN", 
        descripcion: "Los pasos concretos para cerrar la brecha",
        preguntaBase: "¿Qué acciones específicas te acercan a tu visión?"
      },
      colapso: { 
        nombre: "COLAPSO", 
        descripcion: "El momento donde la visión se manifiesta",
        preguntaBase: "¿Cómo sabrás que tu visión se ha manifestado?"
      }
    };

    const ejeInfo = ejesInfo[eje];
    if (!ejeInfo) {
      return res.status(400).json({ error: "Eje no válido" });
    }

    let contexto = "";
    if (respuestasAnteriores && Object.keys(respuestasAnteriores).length > 0) {
      contexto = "\nRESPUESTAS ANTERIORES DEL USUARIO:\n";
      for (const [ejeId, resp] of Object.entries(respuestasAnteriores)) {
        const info = ejesInfo[ejeId];
        if (info && resp) {
          contexto += `${info.nombre}: "${resp}"\n`;
        }
      }
    }

    const prompt = `Eres un coach de manifestación en SISTEMICAR. Tu rol es hacer preguntas CLARIFICADORAS que ayuden al usuario a profundizar en su ${ejeInfo.nombre}.

EJE ACTUAL: ${ejeInfo.nombre}
DESCRIPCIÓN: ${ejeInfo.descripcion}
PREGUNTA BASE: ${ejeInfo.preguntaBase}
${contexto}

${respuestaActual ? `RESPUESTA ACTUAL DEL USUARIO: "${respuestaActual}"

Basándote en su respuesta, genera UNA pregunta clarificadora que lo ayude a profundizar. La pregunta debe:
1. Hacer referencia a algo específico que mencionó
2. Buscar más detalle, emoción o concreción
3. Ser breve y directa (máximo 20 palabras)
4. NO ser motivacional, sino exploradora` 
: `Es el primer paso. Genera una pregunta inicial que invite al usuario a explorar su ${ejeInfo.nombre}. Debe ser:
1. Abierta pero enfocada
2. Que invite a visualizar con detalle
3. Breve (máximo 20 palabras)`}

RESPONDE EN JSON:
{
  "pregunta": "<tu pregunta clarificadora>",
  "sugerencia": "<una frase corta de 5-10 palabras para ayudar si se bloquea, ej: 'Piensa en cómo te sentirás cuando...'>"
}

Solo responde con el JSON.`;

    const response = await gemini.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.7
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({
          pregunta: parsed.pregunta || ejeInfo.preguntaBase,
          sugerencia: parsed.sugerencia || "Cierra los ojos y visualiza con detalle..."
        });
      } else {
        res.json({ pregunta: ejeInfo.preguntaBase, sugerencia: "Cierra los ojos y visualiza..." });
      }
    } catch {
      res.json({ pregunta: ejeInfo.preguntaBase, sugerencia: "Tómate tu tiempo para responder..." });
    }
  } catch (error) {
    console.error("Guided prompt error:", error);
    res.json({ 
      pregunta: "¿Qué ves cuando imaginas tu realidad ideal?",
      sugerencia: "Describe lo primero que viene a tu mente..."
    });
  }
});

app.post("/api/proyector/guided-synthesis", async (req: Request, res: Response) => {
  try {
    const { respuestas } = req.body;
    
    if (!respuestas || Object.keys(respuestas).length < 4) {
      return res.status(400).json({ error: "Se requieren las 4 respuestas" });
    }

    const prompt = `Eres el sintetizador de SISTEMICAR. Crea una DECLARACIÓN DE MANIFESTACIÓN poderosa basada en las respuestas del usuario.

VISIÓN: "${respuestas.vision}"
TENSIÓN: "${respuestas.tension}"
ACCIÓN: "${respuestas.accion}"
COLAPSO: "${respuestas.colapso}"

REGLAS:
1. Escribe en PRIMERA PERSONA como si ya fuera realidad
2. Integra los 4 elementos en una narrativa fluida de 2-3 párrafos
3. Usa tiempo PRESENTE
4. Sé específico con los detalles que el usuario proporcionó
5. Termina con una afirmación de certeza
6. Máximo 150 palabras
7. Español

Responde SOLO con la declaración, sin explicaciones.`;

    const response = await gemini.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.8
    });

    const sintesis = response.choices?.[0]?.message?.content || 
      "Mi visión es clara. La tensión me impulsa. Cada acción me acerca. El colapso es inevitable.";

    res.json({ sintesis });
  } catch (error) {
    console.error("Guided synthesis error:", error);
    res.json({ 
      sintesis: "Veo mi realidad futura con claridad. Reconozco la tensión entre donde estoy y donde voy. Mis acciones son el puente. El momento de manifestación se acerca."
    });
  }
});

app.post("/api/embudo/lead", async (req: Request, res: Response) => {
  try {
    const { email, profesion, categoriaPrecios, multiplicador, planSeleccionado, retoAceptado, abandonoEnPaso } = req.body;
    console.log("Nuevo lead:", { email, profesion, categoriaPrecios, multiplicador, planSeleccionado, retoAceptado, abandonoEnPaso, timestamp: new Date() });
    res.json({ success: true });
  } catch (error) {
    console.error("Lead save error:", error);
    res.status(500).json({ error: "Error guardando lead" });
  }
});

const mpClient = process.env.MP_ACCESS_TOKEN 
  ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  : null;

app.post("/api/mercadopago/create-preference", async (req: Request, res: Response) => {
  try {
    if (!mpClient) {
      return res.status(500).json({ error: "Mercado Pago no configurado" });
    }

    const { planId, email, userName, sellerRef } = req.body;
    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
    
    if (!plan) {
      return res.status(400).json({ error: "Plan no válido" });
    }

    const preference = new Preference(mpClient);
    const baseUrl = getPublicAppBaseUrl();

    const isOneTime = "isOneTime" in plan && plan.isOneTime;
    const itemDescription = isOneTime
      ? `Pago único — ${plan.name}`
      : `Suscripción mensual al Plan ${plan.name}`;

    const response = await preference.create({
      body: {
        items: [{
          id: plan.id,
          title: `SISTEMICAR - ${plan.name}`,
          description: itemDescription,
          quantity: 1,
          unit_price: plan.price,
          currency_id: "USD"
        }],
        payer: { email: email || undefined },
        back_urls: {
          success: `${baseUrl}/pagos?status=success&plan=${plan.id}`,
          failure: `${baseUrl}/pagos?status=failure`,
          pending: `${baseUrl}/pagos?status=pending`
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/mercadopago/webhook`,
        external_reference: JSON.stringify({
          planId: plan.id,
          email,
          userName,
          sellerRef: typeof sellerRef === "string" ? sellerRef.trim().toUpperCase() : undefined,
          timestamp: Date.now(),
        }),
        statement_descriptor: "SISTEMICAR",
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    });

    console.log(`[MP] Preferencia creada: ${response.id} para plan ${plan.name}`);
    
    res.json({
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      plan: plan
    });
  } catch (error) {
    console.error("[MP] Error creando preferencia:", error);
    res.status(500).json({ error: "Error creando preferencia de pago" });
  }
});

app.post("/api/mercadopago/webhook", async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    // Nota: la entrega real (DB, emails, API keys) solo está en server/index.ts.
    // Si PUBLIC_APP_URL apunta aquí, configura el mismo origen donde corre el servidor Node completo.
    console.log(`[MP Webhook] Tipo: ${type}, Data:`, data);

    if (type === "payment" && data?.id && mpClient) {
      const payment = new Payment(mpClient);
      const paymentInfo = await payment.get({ id: data.id });
      console.log(`[MP Webhook] Pago ${paymentInfo.id} - Estado: ${paymentInfo.status}`);

      if (paymentInfo.status === "approved") {
        const externalRef = parseMpExternalRef(paymentInfo);
        if (externalRef.planId === "corazon-sabio") {
          await deliverCorazonSabioIfNeeded(paymentInfo, externalRef);
        }
      }
    }
    
    res.status(200).send("OK");
  } catch (error) {
    console.error("[MP Webhook] Error:", error);
    res.status(200).send("OK");
  }
});

app.post("/api/seduction-message", async (req: Request, res: Response) => {
  try {
    const { progression, energyLogs, extraContext } = req.body;
    
    const prompt = `Eres el sistema de SISTEMICAR. Genera un mensaje corto (máximo 50 palabras) que sea:
1. Técnico, no motivacional genérico
2. Basado en datos del usuario cuando estén disponibles
3. Orientado a acción

Contexto: ${extraContext || "Usuario activo"}
Puntos de Soberanía: ${progression?.sovereigntyPoints || 0}
Registros de energía: ${energyLogs?.length || 0}

Responde SOLO con el mensaje, sin explicaciones.`;

    const response = await gemini.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.7
    });

    const message = response.choices?.[0]?.message?.content || "Tu estructura de conciencia está activa. Continúa registrando.";
    res.json({ message });
  } catch (error) {
    console.error("Seduction message error:", error);
    res.json({ message: "El sistema está listo para tu próximo registro." });
  }
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
