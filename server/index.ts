import express from "express";
import path from "path";
import fs from "fs";

/** Carga .env del proyecto (GEMINI_API_KEY, etc.) en desarrollo y node dist. */
function loadLocalEnvFile(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadLocalEnvFile();
import { createRemoteJWKSet, jwtVerify } from "jose";
import { execSync } from "child_process";
import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import { sendWelcomeEmail, sendPaymentConfirmationEmail, sendOfferEmail, sendApiKeyEmail } from "./emailService";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { LIBRO_ESPEJO_MENDIGO_COMPLETO, LIBRO_INTERFACES_RESUMEN, INTERFACES_DETALLE, DICCIONARIO_CLINICO_COMPLETO, MATRICES_REPROGRAMACION, SECCIONES_PRESION } from "./knowledge/libro-espejo-mendigo";
import { CEREBRO_DOCTOR_IA_V5, TABLA_OBSTRUCCION } from "./knowledge/cerebro-doctor-ia-v5";
import { IDENTIDAD_CODIGO_2, AVERIADO_CODIGO_2, CONQUISTA_TERRITORIOS_M02, REGLAS_ORO_PORTADOR, FICHA_ACABADO_CODIGO_2 } from "./knowledge/libro-espejo-portador";
import { IDENTIDAD_CODIGO_1, AVERIADO_CODIGO_1, REGLAS_ORO_CIMIENTO, FICHA_ACABADO_CODIGO_1 } from "./knowledge/codigo-1-cimiento";
import { IDENTIDAD_CODIGO_3, AVERIADO_CODIGO_3, REGLAS_ORO_TRABAJO, FICHA_ACABADO_CODIGO_3 } from "./knowledge/codigo-3-trabajo";
import { IDENTIDAD_CODIGO_4, AVERIADO_CODIGO_4, REGLAS_ORO_ESTRUCTURA, FICHA_ACABADO_CODIGO_4 } from "./knowledge/codigo-4-estructura";
import { IDENTIDAD_CODIGO_5, AVERIADO_CODIGO_5, REGLAS_ORO_DECISION, FICHA_ACABADO_CODIGO_5 } from "./knowledge/codigo-5-decision";
import { IDENTIDAD_CODIGO_6, AVERIADO_CODIGO_6, REGLAS_ORO_CONVIVENCIA, FICHA_ACABADO_CODIGO_6 } from "./knowledge/codigo-6-convivencia";
import { IDENTIDAD_CODIGO_7, AVERIADO_CODIGO_7, REGLAS_ORO_VISION, FICHA_ACABADO_CODIGO_7 } from "./knowledge/codigo-7-vision";
import { IDENTIDAD_CODIGO_8, AVERIADO_CODIGO_8, REGLAS_ORO_CICLOS, FICHA_ACABADO_CODIGO_8 } from "./knowledge/codigo-8-ciclos";
import { IDENTIDAD_CODIGO_9, AVERIADO_CODIGO_9, REGLAS_ORO_SISTEMA, FICHA_ACABADO_CODIGO_9 } from "./knowledge/codigo-9-sistema";
import { IDENTIDAD_CODIGO_10, AVERIADO_CODIGO_10, REGLAS_ORO_ORIGEN, MODO_C10, FICHA_ACABADO_CODIGO_10 } from "./knowledge/codigo-10-origen";
import { HERRAMIENTA_10X10_CARRIL_MENSAJE } from "./knowledge/herramienta-10x10-carril-mensaje";
import { LEY_RESISTENCIA_CASCADA } from "./knowledge/ley-resistencia-cascada";
import { MATRIZ_SEDUCCION_10X10 } from "./knowledge/matriz-seduccion-10x10";
import { PROTOCOLO_CERTEZA_TERRITORIOS } from "./knowledge/protocolo-certeza-territorios";
import { LEY_REDACCION_ESCRITOR } from "./knowledge/ley-redaccion-escritor";
import { buildPlanificacionTutorSystemPrompt } from "../shared/planificacionDoctorPrompt";
import { PSICOLOGIA_MADUREZ_SEDUCCION } from "./knowledge/psicologia-madurez-seduccion";
import {
  buildChapterContextCore,
  assembleCarrilPrompt,
  extractFichaMarkers,
  checkCarrilFichaVocab,
  buildFichaRegenPrompt,
  getFichaText,
  auditCarrilContamination,
  buildContaminationRegenSuffix,
  estimatePromptChars,
  DOMINIOS_PROHIBIDOS,
  VOCABULARIO_INTERFAZ,
  INTERFAZ_COLORES,
} from "./editorialKnowledgeRouter";
import { initPublicApiTables, createApiKey, listApiKeys, revokeApiKey, validateApiKey, logApiUsage, getMonthlyUsageCount, getApiKeyByPaymentId, updateApiKeyDeliveryStatus, supersedePreviousKey, isPendingStuck, initSubVehicleRecordsTable, bulkSaveVehicleHistory, getVehicleHistory } from "./publicApiDb";
import { SUBSCRIPTION_PLANS } from "../shared/mercadopagoPlans";
import { GEMINI_MODELS } from "../shared/geminiConfig";
import {
  initEspejoCreditDeliveriesTable,
  grantPendingDeliveriesForEmail,
  getPendingCreditsForEmail,
  adminGrantEspejoCredits,
  listEspejoDeliveries,
} from "./espejoCreditDeliveries";
import { deliverEspejoCreditsIfNeeded, parseMpExternalRef } from "./mercadopagoEspejo";
import { isEspejoSkuId } from "../shared/espejoPricing";
import { activateModulesForEmail, activateModulesForUserById, adminLookupUserByEmail, isFirebaseAdminReady } from "./firebaseAdmin";
import { modulesGrantedByPlan } from "../shared/moduleAccess";
import { recordSellerSale, listSellerSales, markSellerCommissionPaid } from "./sellerSales";
import { registerEspejoV2Routes } from "./espejoV2Routes";
import { registerUmbralV2Routes } from "./umbralV2Routes";
import {
  createDefaultUmbralSessionStore,
  initUmbralSessionsTable,
} from "./umbralSessionStore";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const isServerless =
  process.env.SERVERLESS === "1" ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

app.use(express.json({ limit: "5mb" }));

if (isServerless) {
  app.use((req, _res, next) => {
    const prefix = "/.netlify/functions/api";
    const raw = req.url || "";
    if (raw.startsWith(prefix)) {
      const rest = raw.slice(prefix.length) || "";
      req.url = `/api${rest.startsWith("/") ? rest : `/${rest}`}`;
    }
    next();
  });
}

initPublicApiTables().catch(err => console.warn("[publicApiDb] Table init failed (non-fatal):", err?.message));
initSubVehicleRecordsTable().catch(err => console.warn("[vehicleHistory] Table init failed (non-fatal):", err?.message));
initEspejoCreditDeliveriesTable().catch(err => console.warn("[espejoCredits] Table init failed (non-fatal):", err?.message));
initUmbralSessionsTable().catch(err => console.warn("[umbralSessions] Table init failed (non-fatal):", err?.message));

const umbralSessionStore = createDefaultUmbralSessionStore();

const RENDERED_VIDEOS_DIR = isServerless
  ? path.join("/tmp", "rendered-videos")
  : path.resolve(process.cwd(), "rendered-videos");
try {
  if (!fs.existsSync(RENDERED_VIDEOS_DIR)) {
    fs.mkdirSync(RENDERED_VIDEOS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("[rendered-videos] Could not create directory (non-fatal):", err);
}
app.use("/videos", express.static(RENDERED_VIDEOS_DIR));
app.use(express.static(path.resolve(process.cwd(), "public")));

async function generateVoice(text: string, interfazId: string): Promise<{ audioPath: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY no configurada");

  const voiceId = "pNInz6obpgDQGcFmaJgB"; // Adam
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`ElevenLabs error ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const tmpDir = path.join("/tmp", `render_${interfazId}_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const audioPath = path.join(tmpDir, "audio.mp3");
  fs.writeFileSync(audioPath, audioBuffer);
  console.log(`[render] Voice generated for ${interfazId}: ${audioPath} (${audioBuffer.length} bytes)`);
  return { audioPath };
}

async function generateVoiceChunked(text: string, interfazId: string): Promise<{ audioPath: string; tmpDir: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY no configurada");

  const MAX_CHARS = 4500;
  const voiceId = "pNInz6obpgDQGcFmaJgB";
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const tmpDir = path.join("/tmp", `mc_yt_${interfazId}_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const sentences = text.replace(/([.!?¿¡])\s+/g, "$1\n").split("\n").map(s => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > MAX_CHARS) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  if (chunks.length === 0) chunks.push(text.slice(0, MAX_CHARS));

  console.log(`[render-yt] Chunking ${text.length} chars into ${chunks.length} ElevenLabs calls for ${interfazId}`);

  const audioParts: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({
        text: chunks[i],
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
      }),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`ElevenLabs chunk ${i + 1}/${chunks.length} error ${response.status}: ${errBody.slice(0, 200)}`);
    }
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const partPath = path.join(tmpDir, `part_${i}.mp3`);
    fs.writeFileSync(partPath, audioBuffer);
    audioParts.push(partPath);
    console.log(`[render-yt] Chunk ${i + 1}/${chunks.length} done: ${audioBuffer.length} bytes`);
  }

  const audioPath = path.join(tmpDir, "audio.mp3");
  if (audioParts.length === 1) {
    fs.copyFileSync(audioParts[0], audioPath);
  } else {
    const concatList = path.join(tmpDir, "concat.txt");
    fs.writeFileSync(concatList, audioParts.map(p => `file '${p}'`).join("\n"));
    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${audioPath}"`, { timeout: 120000, stdio: "pipe" });
    console.log(`[render-yt] Concatenated ${audioParts.length} chunks → ${audioPath}`);
  }

  return { audioPath, tmpDir };
}

function renderVideoYT(audioPath: string, imagePath: string, interfazId: string): { videoPath: string; filename: string } {
  const filename = `Masterclass_YT_Sistemicar_${interfazId}.mp4`;
  const videoPath = path.join(RENDERED_VIDEOS_DIR, filename);
  const hasLogo = fs.existsSync(LOGO_PATH);
  let cmd: string;
  if (hasLogo) {
    cmd = [
      "ffmpeg", "-y",
      "-loop", "1",
      "-i", `"${imagePath}"`,
      "-i", `"${audioPath}"`,
      "-i", `"${LOGO_PATH}"`,
      "-filter_complex",
      `"[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[bg];[2:v]format=yuva420p,colorchannelmixer=aa=0.7[logo];[bg][logo]overlay=main_w-overlay_w-20:main_h-overlay_h-20[out]"`,
      "-map", `"[out]"`,
      "-map", "1:a",
      "-c:v", "libx264",
      "-tune", "stillimage",
      "-c:a", "aac",
      "-b:a", "192k",
      "-pix_fmt", "yuv420p",
      "-shortest",
      "-movflags", "+faststart",
      `"${videoPath}"`,
    ].join(" ");
  } else {
    cmd = [
      "ffmpeg", "-y",
      "-loop", "1",
      "-i", `"${imagePath}"`,
      "-i", `"${audioPath}"`,
      "-c:v", "libx264",
      "-tune", "stillimage",
      "-c:a", "aac",
      "-b:a", "192k",
      "-pix_fmt", "yuv420p",
      "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
      "-shortest",
      "-movflags", "+faststart",
      `"${videoPath}"`,
    ].join(" ");
  }
  console.log(`[render-yt] FFmpeg YT command: ${cmd}`);
  try {
    execSync(cmd, { timeout: 900000, stdio: "pipe" });
  } catch (err: any) {
    const stderr = err?.stderr?.toString?.()?.slice(0, 500) || "";
    throw new Error(`FFmpeg error: ${stderr}`);
  }
  if (!fs.existsSync(videoPath)) throw new Error("FFmpeg no generó el archivo de video");
  return { videoPath, filename };
}

const ESTILO_MAESTRO = `Style: Cinematic photography of Dark Epic Realism. Dramatic chiaroscuro lighting, high contrast. Color palette: deep blacks, old golds, emerald greens, and touches of Tyrian purple. Textures of ancient stone, exposed golden circuits, and subtle smoke. Atmosphere of solemnity and ancient technological power. DALL-E 3 Quality: Vivid. `;

async function generateImage(imagePrompt: string, interfazId: string): Promise<{ imagePath: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada");

  const fullPrompt = ESTILO_MAESTRO + imagePrompt;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1792x1024",
      quality: "hd",
      style: "vivid",
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`DALL-E 3 error ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) throw new Error("DALL-E 3 no devolvió URL de imagen");

  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) throw new Error(`Error descargando imagen: ${imgResponse.status}`);
  const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());

  const tmpDir = path.join("/tmp", `render_${interfazId}_img_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const imagePath = path.join(tmpDir, "fondo.png");
  fs.writeFileSync(imagePath, imgBuffer);
  console.log(`[render] Image generated for ${interfazId}: ${imagePath} (${imgBuffer.length} bytes)`);
  return { imagePath };
}

const LOGO_PATH = path.resolve(process.cwd(), "logo-sistemicar.png");

function renderVideo(audioPath: string, imagePath: string, interfazId: string): { videoPath: string; filename: string } {
  const filename = `Masterclass_Sistemicar_${interfazId}.mp4`;
  const videoPath = path.join(RENDERED_VIDEOS_DIR, filename);

  const hasLogo = fs.existsSync(LOGO_PATH);
  console.log(`[render] Logo available: ${hasLogo} (${LOGO_PATH})`);

  let cmd: string;
  if (hasLogo) {
    cmd = [
      "ffmpeg", "-y",
      "-loop", "1",
      "-i", `"${imagePath}"`,
      "-i", `"${audioPath}"`,
      "-i", `"${LOGO_PATH}"`,
      "-filter_complex",
      `"[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[bg];[2:v]format=yuva420p,colorchannelmixer=aa=0.7[logo];[bg][logo]overlay=main_w-overlay_w-20:main_h-overlay_h-20[out]"`,
      "-map", `"[out]"`,
      "-map", "1:a",
      "-c:v", "libx264",
      "-tune", "stillimage",
      "-c:a", "aac",
      "-b:a", "192k",
      "-pix_fmt", "yuv420p",
      "-shortest",
      "-movflags", "+faststart",
      `"${videoPath}"`,
    ].join(" ");
  } else {
    cmd = [
      "ffmpeg", "-y",
      "-loop", "1",
      "-i", `"${imagePath}"`,
      "-i", `"${audioPath}"`,
      "-c:v", "libx264",
      "-tune", "stillimage",
      "-c:a", "aac",
      "-b:a", "192k",
      "-pix_fmt", "yuv420p",
      "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
      "-shortest",
      "-movflags", "+faststart",
      `"${videoPath}"`,
    ].join(" ");
  }

  console.log(`[render] FFmpeg command: ${cmd}`);
  try {
    execSync(cmd, { timeout: 120000, stdio: "pipe" });
  } catch (err: any) {
    const stderr = err?.stderr?.toString?.()?.slice(0, 500) || "";
    throw new Error(`FFmpeg error: ${stderr}`);
  }

  if (!fs.existsSync(videoPath)) {
    throw new Error("FFmpeg no generó el archivo de video");
  }

  const stats = fs.statSync(videoPath);
  console.log(`[render] Video rendered: ${videoPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  return { videoPath, filename };
}

function parseGeminiJSON(raw: string): any {
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No se encontró JSON válido en la respuesta de IA");
  let jsonStr = jsonMatch[0];

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return JSON.parse(jsonStr);
    } catch (err: any) {
      const pos = err.message?.match(/position (\d+)/)?.[1];
      console.warn(`[parseGeminiJSON] Attempt ${attempt + 1} failed: ${err.message}`);

      if (attempt === 0) {
        jsonStr = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
      } else if (attempt === 1) {
        const lines = jsonStr.split('\n');
        const rebuilt: string[] = [];
        for (const line of lines) {
          rebuilt.push(line.replace(/[\r\t]/g, ' '));
        }
        jsonStr = rebuilt.join('\\n');
      } else if (attempt === 2) {
        jsonStr = jsonStr
          .split('\n').map(l => l.trim()).join(' ')
          .replace(/[\x00-\x1F\x7F]/g, ' ')
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
          .replace(/:\s*'([^']*)'/g, ': "$1"');
      } else {
        if (pos) {
          const p = parseInt(pos);
          const before = jsonStr.substring(Math.max(0, p - 30), p);
          const after = jsonStr.substring(p, p + 30);
          console.error(`[parseGeminiJSON] Context around pos ${p}: ...${before}|||${after}...`);
        }
        throw new Error(`No se pudo parsear JSON de IA después de 4 intentos: ${err.message}`);
      }
    }
  }
  throw new Error("No se pudo parsear JSON de IA");
}

function cleanupTmpFiles(...paths: string[]) {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const dir = path.dirname(p);
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {}
  }
}

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GOOGLE_API_KEY,
  process.env.VITE_GEMINI_API_KEY,
  process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
].filter((k) => k && k.length > 10 && !k.startsWith("_DUMMY")) as string[];

async function callGemini(prompt: string, maxTokens: number = 500, jsonMode: boolean = false): Promise<string> {
  if (GEMINI_KEYS.length === 0) {
    throw new Error(
      "Gemini no disponible: configura GEMINI_API_KEY en el servidor (Google AI Studio → API key)."
    );
  }
  const errors: string[] = [];
  for (const apiKey of GEMINI_KEYS) {
    const genAI = new GoogleGenerativeAI(apiKey);
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const generationConfig: GenerationConfig = {
          maxOutputTokens: maxTokens,
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        };
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        });
        let text = "";
        try {
          text = result.response.text();
        } catch (textErr: any) {
          // Bloqueos / candidatos vacíos (p. ej. MAX_TOKENS por thinking en 2.5).
          const finish =
            result?.response?.candidates?.[0]?.finishReason || "unknown";
          throw new Error(
            `Gemini text() vacío (finish=${finish}): ${textErr?.message || textErr}`,
          );
        }
        if (!text || !String(text).trim()) {
          const finish =
            result?.response?.candidates?.[0]?.finishReason || "unknown";
          throw new Error(`Gemini devolvió texto vacío (finish=${finish})`);
        }
        return text;
      } catch (error: any) {
        const status = error?.status;
        const errMsg = error?.message || error?.errorDetails?.[0]?.message || String(error);
        errors.push(`${modelName}(${apiKey.slice(0,8)}):${status}:${errMsg.slice(0, 120)}`);
        console.warn(`Gemini ${modelName} (key ${apiKey.slice(0,8)}...) failed: status=${status}, msg=${errMsg.slice(0, 200)}`);
        continue;
      }
    }
  }
  const errorDetail = errors.join(", ");
  console.error(`All Gemini attempts failed: ${errorDetail}`);
  throw new Error(`Gemini no disponible: ${errorDetail}`);
}

app.post("/api/alquimia/validate", async (req, res) => {
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

    const content = await callGemini(prompt, 500) || '{"score": 75}';
    
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
    res.json({ score: Math.floor(Math.random() * 30) + 70, ejeFlojo: null, feedback: null, deducciones: null });
  }
});

app.post("/api/cierre-jornada", async (req, res) => {
  try {
    const { energyLogs, aliados, alquimias, userName, dailySovereigntyPoints, vehicles, userId, dailyPointsLogs } = req.body;
    
    console.log("========== CIERRE JORNADA DEBUG ==========");
    console.log("Usuario:", userName, "| ID:", userId);
    console.log("EnergyLogs recibidos:", energyLogs?.length || 0);
    console.log("Vehicles recibidos:", vehicles?.length || 0);
    console.log("dailyPointsLogs recibidos:", dailyPointsLogs?.length || 0);
    console.log("dailySovereigntyPoints del frontend:", dailySovereigntyPoints);
    
    // Mostrar detalle de los logs de puntos
    if (dailyPointsLogs && dailyPointsLogs.length > 0) {
      console.log("--- DETALLE DE PUNTOS DEL DÍA ---");
      dailyPointsLogs.forEach((log: any) => {
        console.log(`  * ${log.source}: +${log.amount}`);
      });
      console.log("--- FIN DETALLE ---");
    }
    
    const energyFrequency: Record<string, number> = { enfoque: 0, conflicto: 0, pasos: 0, alcance: 0 };
    
    // Calcular inicio del día en zona horaria America/Lima (UTC-5)
    const now = new Date();
    const limaOffset = -5 * 60; // UTC-5 en minutos
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const limaTime = new Date(utcTime + (limaOffset * 60000));
    
    // Inicio del día en Lima
    const todayLima = new Date(limaTime);
    todayLima.setHours(0, 0, 0, 0);
    const todayStartTime = todayLima.getTime() - (limaOffset * 60000) + (now.getTimezoneOffset() * 60000);
    
    console.log("Hora actual Lima:", limaTime.toISOString());
    console.log("Inicio del día Lima (UTC):", new Date(todayStartTime).toISOString());
    
    // Calcular PS del día directamente de los energyLogs
    let calculatedDailyPS = 0;
    const todayLogs: any[] = [];
    
    (energyLogs || []).forEach((log: any) => {
      let logTime: number;
      if (log.timestamp && typeof log.timestamp === 'object' && log.timestamp.seconds) {
        logTime = log.timestamp.seconds * 1000;
      } else if (log.timestamp) {
        logTime = new Date(log.timestamp).getTime();
      } else {
        return;
      }
      
      if (logTime >= todayStartTime) {
        todayLogs.push(log);
        if (energyFrequency[log.type] !== undefined) {
          energyFrequency[log.type]++;
        }
        const points = log.points || 0;
        calculatedDailyPS += points;
        console.log(`  Log: tipo=${log.type}, puntos=${points}, timestamp=${new Date(logTime).toISOString()}`);
      }
    });
    
    // Calcular PS de vehículos completados hoy
    let vehiclePS = 0;
    (vehicles || []).forEach((v: any) => {
      if (v.status === "cumplido" || v.status === "archivado") {
        let completedTime: number | null = null;
        
        if (v.completedAt) {
          if (typeof v.completedAt === 'object' && v.completedAt.seconds) {
            completedTime = v.completedAt.seconds * 1000;
          } else {
            completedTime = new Date(v.completedAt).getTime();
          }
        }
        
        if (completedTime && completedTime >= todayStartTime) {
          let points = 0;
          if (v.tipoTerminoRapido) {
            // Vehículo Express
            if (v.status === "cumplido") {
              points = v.tipoTerminoRapido === "hora" ? 10 : v.tipoTerminoRapido === "situacion" ? 5 : 1;
            } else {
              points = v.tipoTerminoRapido === "hora" ? 5 : v.tipoTerminoRapido === "situacion" ? 2 : 0;
            }
          } else if (v.ejes) {
            // Vehículo Profundo
            const retoCount = Object.values(v.ejes).filter((e: any) => e.trifecta === "reto").length;
            if (retoCount >= 1) {
              points = v.status === "cumplido" ? (35 + (retoCount - 1) * 10) : (15 + (retoCount - 1) * 5);
            } else {
              points = v.status === "cumplido" ? 10 : 5;
            }
          }
          vehiclePS += points;
          console.log(`  Vehículo: ${v.titulo}, status=${v.status}, puntos=${points}`);
        }
      }
    });
    
    calculatedDailyPS += vehiclePS;
    
    console.log("---------- RESUMEN ----------");
    console.log("Logs de hoy:", todayLogs.length);
    console.log("PS de energyLogs:", calculatedDailyPS - vehiclePS);
    console.log("PS de vehículos:", vehiclePS);
    console.log("TOTAL PS CALCULADOS:", calculatedDailyPS);
    console.log("PS frontend:", dailySovereigntyPoints);
    console.log("=======================================");
    
    const dominantAxis = Object.entries(energyFrequency)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "ninguno";
    
    const lastAliado = (aliados || [])[0];
    const lastShadow = lastAliado?.shadow?.lenguaje || "No has identificado límites recientemente";
    
    const lastAlquimia = (alquimias || [])[0];
    const lastOro = lastAlquimia?.oro || null;
    const lastAlquimiaScore = lastAlquimia?.alquimiaScore || null;
    
    // Usar el mayor entre PS calculados en servidor y PS del frontend
    const ps = Math.max(calculatedDailyPS, dailySovereigntyPoints || 0);
    console.log("PS FINAL A USAR:", ps);
    let psLevel = "bajo";
    let psContext = "";
    if (ps >= 81) {
      psLevel = "alto";
      psContext = `Con ${ps} PS hoy, estás en el top 10% de usuarios activos. ADVERTENCIA: El conformismo es el enemigo del crecimiento. No te detengas aquí.`;
    } else if (ps >= 31) {
      psLevel = "intermedio";
      psContext = `Con ${ps} PS hoy, estás por encima del 60% de usuarios. Vas en buen camino. Un poco más de consistencia te llevará al siguiente nivel.`;
    } else {
      psLevel = "bajo";
      psContext = `Con ${ps} PS hoy, estás comenzando. Recuerda: muchos usuarios exitosos empezaron con 0. La persistencia diaria vale más que el puntaje inicial.`;
    }
    
    const prompt = `Eres el Mentor de Cierre de Sistemicar. Tu lenguaje es técnico, directo y orientado a la ingeniería de conciencia. No uses lenguaje motivacional genérico. Usa los datos del usuario para confrontarlo con su propia estructura.

DATOS DEL USUARIO (${userName || "Guerrero"}):

PUNTOS DE SOBERANÍA HOY: ${ps} PS
NIVEL: ${psLevel.toUpperCase()}
CONTEXTO: ${psContext}

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

ESTRUCTURA DE RESPUESTA SEGÚN NIVEL DE PS:
${psLevel === "bajo" ? `
- NIVEL BAJO: Ubica al usuario que su puntaje es bajo, pero motívale que otros empezaron peor. Enfatiza la PERSISTENCIA como la clave. No lo hagas sentir mal, sino esperanzado.` : ""}
${psLevel === "intermedio" ? `
- NIVEL INTERMEDIO: Ubica al usuario con el porcentaje que está en buen camino comparado con otros. Celebra su progreso pero muestra que hay más por alcanzar.` : ""}
${psLevel === "alto" ? `
- NIVEL ALTO: Reconoce su fortaleza y logro, pero ADVIERTE sobre el conformismo. El verdadero guerrero nunca se detiene. Insiste en que no se detenga.` : ""}

1. RECONOCIMIENTO: Empieza con sus ${ps} PS del día y el significado según su nivel
2. DIAGNÓSTICO: Conecta su puntaje con su patrón de ejes y límites identificados  
3. PRESCRIPCIÓN: Una acción concreta para mañana orientada a su nivel

RESPONDE EN FORMATO JSON:
{
  "reconocimiento": "<1 frase específica sobre sus PS del día y lo que significa>",
  "diagnostico": "<1-2 frases conectando su nivel de PS con sus patrones>",
  "prescripcion": "<1 acción técnica concreta para mañana>",
  "ejeDebil": "<enfoque|conflicto|pasos|alcance - el que menos usó o más necesita trabajar>"
}

Responde SOLO con el JSON.`;

    const content = await callGemini(prompt, 500) || '{}';
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({
          reconocimiento: parsed.reconocimiento || "Hoy trabajaste en tu conciencia.",
          diagnostico: parsed.diagnostico || "Tu estructura muestra áreas de crecimiento.",
          prescripcion: parsed.prescripcion || "Mañana, registra al menos un eje diferente al de hoy.",
          ejeDebil: parsed.ejeDebil || dominantAxis,
          dailyPS: ps,
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
          dailyPS: ps,
          stats: { energyFrequency, dominantAxis, totalLogsToday: todayLogs.length }
        });
      }
    } catch {
      res.json({
        reconocimiento: "Hoy trabajaste en tu conciencia.",
        diagnostico: "Tu estructura muestra áreas de crecimiento.",
        prescripcion: "Mañana, registra al menos un eje diferente al de hoy.",
        ejeDebil: dominantAxis,
        dailyPS: ps,
        stats: { energyFrequency, dominantAxis, totalLogsToday: todayLogs.length }
      });
    }
  } catch (error) {
    console.error("Cierre jornada error:", error);
    // En caso de error, usar el valor del frontend
    const fallbackPS = req.body.dailySovereigntyPoints || 0;
    console.log("ERROR - Usando fallback PS:", fallbackPS);
    res.json({
      reconocimiento: fallbackPS > 0 
        ? `Hoy ganaste ${fallbackPS} Puntos de Soberanía.`
        : "Hoy trabajaste en tu transformación.",
      diagnostico: "Continúa registrando tu energía para obtener mejores diagnósticos.",
      prescripcion: "Mañana, comienza el día con un registro de ENFOQUE.",
      ejeDebil: "enfoque",
      dailyPS: fallbackPS,
      stats: {}
    });
  }
});

// Clasificador de profesiones para el embudo
app.post("/api/embudo/clasificar", async (req, res) => {
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

    const content = await callGemini(prompt, 200) || '{}';
    
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

// Enviar correo de bienvenida
app.post("/api/send-welcome-email", async (req, res) => {
  try {
    const { email, userName } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email es requerido" });
    }

    const result = await sendWelcomeEmail({ to: email, userName });
    res.json(result);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    res.status(500).json({ error: "Error enviando correo de bienvenida" });
  }
});

// Enviar correo de ofrecimiento
app.post("/api/send-offer-email", async (req, res) => {
  try {
    const { email, userName } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email es requerido" });
    }

    const result = await sendOfferEmail({ to: email, userName });
    res.json(result);
  } catch (error) {
    console.error("Error sending offer email:", error);
    res.status(500).json({ error: "Error enviando correo de ofrecimiento" });
  }
});

// Exportar conocimiento de SISTEMICAR para agentes externos (Retell, etc.)
app.post("/api/knowledge-export", async (req, res) => {
  try {
    const { principiosMaestros, genomeLaws } = req.body || {};

    const baseKnowledge = `# SISTEMICAR — Base de Conocimiento para Agentes
## Fecha de exportación: ${new Date().toISOString().split("T")[0]}

## ¿Qué es SISTEMICAR?
SISTEMICAR es una plataforma de ingeniería personal y alquimia de consciencia. No es una app de productividad convencional — es un sistema diseñado para transformar el caos mental en estructura soberana. Usa gamificación, diagnóstico clínico-analítico e inteligencia artificial para guiar al usuario hacia su máximo rendimiento personal.

## Tono y Filosofía
- Tono: Clínico-analítico, soberano, sin frases vacías de motivación
- Filosofía: "No busques resultados, conviértete en el resultado"
- El usuario es llamado "Soberano" — se le trata con respeto a su autonomía
- Nunca presionar para comprar — la frase clave es "La decisión siempre es tuya, Soberano"
- Las sugerencias premium se hacen cuando hay un problema real que la herramienta resuelve

## Módulos Principales

### 1. Doctor IA (Gratis)
- Mentor clínico-analítico disponible para todos los usuarios
- Aplica las Leyes Soberanas al problema del usuario
- Respuestas concisas y con diagnóstico, no motivación genérica
- Detecta el tipo de problema: emocional → sugiere Espejo, disciplina → sugiere Planificación

### 2. Espejo Clínico (Premium — requiere Créditos de Claridad)
- Protocolo de 4 ejes para desmontar la niebla mental
- **PERCIBO** (Purificación): Detección de fricción somática y niebla mental
- **RECONOZCO** (Desglose): Identificación de la "Identidad Programada" — patrones inconscientes
- **CUENTO CON** (Activación): Descubrimiento del voltaje interno — recursos de arquitectura personal
- **TRANSFORMO** (Evolución): Diseño del protocolo técnico anti-niebla
- Cada sesión otorga 58 PS (Puntos de Soberanía) fijos
- Diagnóstico de cierre con porcentaje de maestría incremental (2.3% por sesión)
- Precio: Créditos de Claridad (cada crédito = 1 sesión)

### 3. Planificación Soberana (Premium)
- Sistema de vehículos: tareas organizadas por tipo (hora/situación)
- Segmentos de día: divide el día en bloques con nombre
- Monitor de Músculo Atencional: mide fatiga y capas de oposición
- 4 Capas de Oposición: Pereza → Fractura de Enfoque → Agotamiento → Rendición
- Motor de Transmutación: +25 PS por completar misiones en capas difíciles
- Puntos de Soberanía por cada acción (crear, iniciar, cerrar segmentos)

### 4. Historial Unificado
- 5 tabs: Espejo, Planificación, Alquimia, Depósito, Sabiduría
- Cápsulas de Poder expandibles con datos estructurados
- Sello de Soberanía (estrella) para marcar entradas como Principios Maestros

### 5. ADN Soberano
- Sistema de leyes conductuales extraídas de la experiencia
- Filtro de Validación: Tesis Convencional → Antítesis → Elevación a Ley
- 10 identidades: Guerrero, Estratega, Alquimista, Observador, Constructor, Sanador, Visionario, Rebelde, Maestro, Guardián
- Las leyes validadas son citadas por el Doctor IA en sus diagnósticos

## Objeciones Comunes y Respuestas

**"Es otra app de productividad más"**
→ SISTEMICAR no te dice qué hacer — te diagnostica por qué no lo haces. El Espejo Clínico desmonta la niebla mental que otras apps ignoran.

**"Es muy caro"**
→ El Doctor IA es completamente gratis y ya aplica las Leyes Soberanas a tu situación. El Espejo Clínico es para cuando quieras ir más profundo. Sin presión.

**"No tengo tiempo"**
→ Una sesión del Espejo toma 10-15 minutos. El Doctor IA responde en segundos. La Planificación se adapta a tu día real, no a un ideal.

**"No creo en estas cosas"**
→ SISTEMICAR es ingeniería, no misticismo. Detecta patrones, mide fatiga, calcula capas de oposición. Los datos hablan.

## Información de Contacto / Acceso
- Web: https://sistemicar.app
- El registro es gratuito y da acceso al Doctor IA
- Los módulos premium se activan con créditos asignados por el administrador después de verificar el pago
`;

    let principiosSection = "";
    if (principiosMaestros && principiosMaestros.length > 0) {
      principiosSection = "\n## Principios Maestros (Leyes Soberanas Activas)\n\n";
      principiosMaestros.forEach((p: any, i: number) => {
        principiosSection += `${i + 1}. **${p.titulo || "Principio"}**: ${p.texto || p.contenido || ""}\n`;
      });
    }

    let genomeSection = "";
    if (genomeLaws && genomeLaws.length > 0) {
      genomeSection = "\n## ADN Soberano (Leyes del Genoma)\n\n";
      genomeLaws.filter((g: any) => g.status === "validado").forEach((g: any, i: number) => {
        genomeSection += `${i + 1}. **#LEY_SISTEMICAR**: ${g.ley_sistemicar || ""}\n`;
        if (g.identidad_sugerida) genomeSection += `   - Identidad: ${g.identidad_sugerida}\n`;
        if (g.categoria) genomeSection += `   - Categoría: ${g.categoria}\n`;
      });
    }

    const fullDocument = baseKnowledge + principiosSection + genomeSection;

    res.json({
      success: true,
      document: fullDocument,
      stats: {
        principios: principiosMaestros?.length || 0,
        genomeLaws: genomeLaws?.filter((g: any) => g.status === "validado")?.length || 0,
        totalCharacters: fullDocument.length
      }
    });
  } catch (error) {
    console.error("Error generating knowledge export:", error);
    res.status(500).json({ error: "Error generando documento de conocimiento" });
  }
});

// Generar narrativa de proyección con IA
app.post("/api/proyector/generate-narrative", async (req, res) => {
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

    const fullPrompt = `Eres un oráculo de manifestación de realidad en SISTEMICAR.
Tu tarea es crear una narrativa INMERSIVA en PRIMERA PERSONA que proyecte al usuario a su realidad futura.

REGLAS:
1. Escribe en primera persona del usuario ("Yo soy...", "Yo veo...", "Yo siento...")
2. Usa tiempo PRESENTE como si ya fuera su realidad actual
3. Integra TODOS los elementos de las cápsulas en una narrativa fluida
4. Sé específico con los detalles que el usuario proporcionó
5. Hazlo emocional y poderoso, que sienta que ya está viviendo esa realidad
6. Máximo 400 palabras
7. Termina con una afirmación de poder
8. Escribe en español

Basándote en esta información de proyección futura, crea una narrativa inmersiva en primera persona:

${context}`;

    const narrative = await callGemini(fullPrompt, 800) || 
      "Tu realidad proyectada está tomando forma. Cada paso que das te acerca a la manifestación de tu visión. Confía en el proceso.";

    res.json({ narrative });
  } catch (error) {
    console.error("Proyector narrative error:", error);
    res.json({ 
      narrative: "Estoy de pie en mi nueva realidad. Todo lo que visualicé se ha manifestado. Siento la certeza de que cada paso me trajo aquí. Esta es mi vida ahora, y cada día la expando más."
    });
  }
});

// Proyección Guiada con IA - Genera preguntas clarificadoras
app.post("/api/proyector/guided-prompt", async (req, res) => {
  try {
    const { eje, respuestaActual, respuestasAnteriores, paso } = req.body;
    
    if (!eje) {
      return res.status(400).json({ error: "Eje requerido" });
    }

    const ejesInfo: Record<string, { nombre: string; descripcion: string; preguntaBase: string }> = {
      vision: { 
        nombre: "VISIÓN", 
        descripcion: "El Destello",
        preguntaBase: "Si hoy fuera el tráiler de tu película de éxito, ¿qué escena verías? Siente la luz de ese logro..."
      },
      tension: { 
        nombre: "TENSIÓN", 
        descripcion: "La Onda Expansiva",
        preguntaBase: "Imagina el rostro de quien más amas al verte lograrlo... ¿Qué palabras de orgullo escuchas?"
      },
      accion: { 
        nombre: "ACCIÓN", 
        descripcion: "El Valor Real",
        preguntaBase: "Visualiza el momento donde tu logro salva a alguien más... ¿Qué sientes en tu pecho?"
      },
      colapso: { 
        nombre: "COLAPSO", 
        descripcion: "La Grandeza",
        preguntaBase: "Siente el peso de tu grandeza. Ya no eres el que intenta, eres el que ES. ¿Cómo caminas?"
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

    const prompt = `Eres una MUSA CREATIVA en SISTEMICAR. Tu rol es activar el CEREBRO DERECHO del usuario a través de preguntas que invitan a IMAGINAR, SENTIR y VISUALIZAR.

REGLAS ABSOLUTAS:
- NO des consejos lógicos ni prácticos
- NO preguntes "cómo" van a lograr algo
- SOLO haz preguntas que obliguen a cerrar los ojos y buscar respuestas en la imaginación
- Si el usuario responde con lógica, dile: "Eso es cerebro izquierdo, déjalo fuera. Háblame de imágenes y sensaciones"
- Busca colores, olores, sonidos, texturas, temperaturas, emociones físicas

EJE ACTUAL: ${ejeInfo.nombre} - ${ejeInfo.descripcion}
PREGUNTA BASE: ${ejeInfo.preguntaBase}
${contexto}

${respuestaActual ? `RESPUESTA ACTUAL DEL USUARIO: "${respuestaActual}"

Basándote en su respuesta, genera UNA pregunta que profundice en IMÁGENES Y SENSACIONES:
1. Pide más detalle sensorial (¿qué color tiene? ¿a qué huele? ¿qué temperatura sientes?)
2. Invita a visualizar la escena con más vivacidad
3. Máximo 20 palabras
4. PROHIBIDO preguntar "cómo" o dar consejos` 
: `Es el primer paso. Genera una pregunta que invite a IMAGINAR sin pensar:
1. Que active imágenes mentales inmediatas
2. Que pida sensaciones físicas o emocionales
3. Máximo 20 palabras`}

RESPONDE EN JSON:
{
  "pregunta": "<tu pregunta imaginativa>",
  "sugerencia": "<frase sensorial corta, ej: 'Siente el calor en tu pecho...' o 'Mira los colores que aparecen...'>"
}

Solo responde con el JSON.`;

    const content = await callGemini(prompt, 200) || '{}';
    
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

// Generar síntesis de proyección guiada
app.post("/api/proyector/guided-synthesis", async (req, res) => {
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

    const sintesis = await callGemini(prompt, 400) || 
      "Mi visión es clara. La tensión me impulsa. Cada acción me acerca. El colapso es inevitable.";

    res.json({ sintesis });
  } catch (error) {
    console.error("Guided synthesis error:", error);
    res.json({ 
      sintesis: "Veo mi realidad futura con claridad. Reconozco la tensión entre donde estoy y donde voy. Mis acciones son el puente. El momento de manifestación se acerca."
    });
  }
});

// Guardar lead del embudo
app.post("/api/embudo/lead", async (req, res) => {
  try {
    const { email, profesion, categoriaPrecios, multiplicador, planSeleccionado, retoAceptado, abandonoEnPaso } = req.body;
    
    // Por ahora solo logueamos - en producción guardaría en Firebase
    console.log("Nuevo lead:", { email, profesion, categoriaPrecios, multiplicador, planSeleccionado, retoAceptado, abandonoEnPaso, timestamp: new Date() });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Lead save error:", error);
    res.status(500).json({ error: "Error guardando lead" });
  }
});

// ==================== DOCTOR IA ====================

app.post("/api/doctor-ia", async (req, res) => {
  try {
    const { userText, principiosMaestros, userName, genomeLaws } = req.body;
    
    if (!userText) {
      return res.status(400).json({ error: "Texto requerido" });
    }

    const principiosContext = (principiosMaestros || [])
      .map((p: any, i: number) => `LEY ${i + 1}: "${p.texto}" [Fuente: ${p.moduloOrigen}]`)
      .join("\n");

    const genomeContext = (genomeLaws || [])
      .filter((g: any) => g.status === "validado")
      .map((g: any, i: number) => `LEY SOBERANA ${i + 1}: "${g.ley_sistemicar}" [Tesis: ${g.tesis_convencional}] [Antítesis: ${g.antitesis_gilson}] [Identidad: ${g.identidad_sugerida}]`)
      .join("\n");

    const prompt = `Eres el Doctor IA de SISTEMICAR. Tu conocimiento emana exclusivamente de la colección de Principios Maestros (Leyes de Gilson). Cuando un usuario escribe, actúa como un espejo clínico: detecta su Capa de Desvío y recétale la Ley de Gilson que corresponda.

Si no hay una ley específica para el caso, guía al usuario a encontrar su propia fricción neuronal basándote en la filosofía de SISTEMICAR: la conciencia es darse cuenta, el coraje tiene valor intrínseco, y toda crisis es material de transmutación.

PRINCIPIOS MAESTROS DISPONIBLES:
${principiosContext || "No hay principios registrados aún. Responde basándote en la filosofía general de SISTEMICAR."}

LEYES DEL ADN SOBERANO (GENOMA SISTEMICAR):
${genomeContext || "El genoma aún está en proceso de destilación."}

TEXTO DEL USUARIO (${userName || "Usuario"}):
"${userText}"

RESPONDE EN FORMATO JSON:
{
  "diagnostico": "<Detección de la Capa de Desvío del usuario - qué patrón de evasión o resistencia detectas>",
  "leyAplicada": "<Texto exacto de la Ley de Gilson que aplica, o null si no hay una específica>",
  "receta": "<Prescripción práctica basada en la ley. Usa lenguaje directo, sin motivación barata. Máximo 3 oraciones>",
  "preguntaEspejo": "<Una pregunta incisiva que obligue al usuario a verse sin filtros>"
}

Responde SOLO con el JSON.`;

    const content = await callGemini(prompt, 600);
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({
          diagnostico: parsed.diagnostico || "Análisis en proceso",
          leyAplicada: parsed.leyAplicada || null,
          receta: parsed.receta || "Observa tu resistencia y nombra lo que evitas",
          preguntaEspejo: parsed.preguntaEspejo || "¿Qué estás evitando ver?"
        });
      } else {
        res.json({
          diagnostico: content.slice(0, 200),
          leyAplicada: null,
          receta: "Profundiza en tu observación",
          preguntaEspejo: "¿Qué patrón se repite?"
        });
      }
    } catch {
      res.json({
        diagnostico: content.slice(0, 200),
        leyAplicada: null,
        receta: "Observa sin juzgar",
        preguntaEspejo: "¿Qué necesitas ver?"
      });
    }
  } catch (error) {
    console.error("Doctor IA error:", error);
    res.status(500).json({ error: "Error en el Doctor IA" });
  }
});

// ==================== DOCTOR IA CHAT (Diálogo Soberano) ====================

const chatSessions = new Map<string, { messages: Array<{ role: string; text: string }>; lastAccess: number }>();

setInterval(() => {
  const now = Date.now();
  const keys = Array.from(chatSessions.keys());
  for (const key of keys) {
    const session = chatSessions.get(key);
    if (session && now - session.lastAccess > 30 * 60 * 1000) chatSessions.delete(key);
  }
}, 5 * 60 * 1000);

app.post("/api/doctor-ia-chat", async (req, res) => {
  try {
    const { userText, principiosMaestros, userName, userEmail, sessionId, moduleContext, genomeLaws, espejoSesiones, registrosCompletos, messageCount, notasEvolucionActiva } = req.body;

    if (!userText) {
      return res.status(400).json({ error: "Texto requerido" });
    }

    const OWNER_EMAIL = "gilsonarevalo.leo@gmail.com";
    const isCreator = userEmail?.toLowerCase() === OWNER_EMAIL.toLowerCase();

    const sKey = sessionId || `session_${Date.now()}`;
    if (!chatSessions.has(sKey)) {
      chatSessions.set(sKey, { messages: [], lastAccess: Date.now() });
    }
    const session = chatSessions.get(sKey)!;
    session.lastAccess = Date.now();

    session.messages.push({ role: "user", text: userText });
    if (session.messages.length > 20) {
      session.messages = session.messages.slice(-16);
    }

    const principiosContext = (principiosMaestros || [])
      .map((p: any, i: number) => `LEY ${i + 1}: "${p.texto}" [Fuente: ${p.moduloOrigen || "general"}]`)
      .join("\n");

    const genomeContext = (genomeLaws || [])
      .filter((g: any) => g.status === "validado")
      .map((g: any, i: number) => `LEY SOBERANA ${i + 1}: "${g.ley_sistemicar}" [Tesis: ${g.tesis_convencional}] [Antítesis: ${g.antitesis_gilson}] [Identidad: ${g.identidad_sugerida}]`)
      .join("\n");

    const espejoContext = (espejoSesiones || [])
      .map((s: any, i: number) => {
        const fecha = s.fecha ? new Date(s.fecha).toLocaleDateString() : "Sin fecha";
        const tipo = s.modo === "arquitecto" ? "SESIÓN ARQUITECTO" : "CAPTURA LIBRE";
        let contenido = "";
        if (s.modo === "arquitecto") {
          if (s.contenido?.afloramiento) contenido += `  AFLORAMIENTO: "${s.contenido.afloramiento}"\n`;
          if (s.contenido?.disociacion) contenido += `  DISOCIACIÓN: "${s.contenido.disociacion}"\n`;
          if (s.contenido?.recursos) contenido += `  RECURSOS: "${s.contenido.recursos}"\n`;
          if (s.contenido?.comparativa) contenido += `  COMPARATIVA: "${s.contenido.comparativa}"\n`;
          if (s.contenido?.percibo) contenido += `  PERCIBO: "${s.contenido.percibo}"\n`;
          if (s.contenido?.reconozco) contenido += `  RECONOZCO: "${s.contenido.reconozco}"\n`;
          if (s.contenido?.cuento_con) contenido += `  CUENTO CON: "${s.contenido.cuento_con}"\n`;
          if (s.contenido?.transformo) contenido += `  TRANSFORMO: "${s.contenido.transformo}"\n`;
        } else if (s.contenido?.fragmentos?.[0]) {
          contenido = `  Texto: "${s.contenido.fragmentos[0]}"\n`;
        }
        const voltaje = s.mapaVoltaje ? `  Voltaje: ${s.mapaVoltaje.voltaje_total}% | Frecuencia: ${s.mapaVoltaje.frecuencia_dominante}\n` : "";
        return `ESPEJO ${i + 1} [${tipo}] (${fecha})${s.contexto ? ` Contexto: ${s.contexto}` : ""}:\n${contenido}${voltaje}`;
      })
      .join("\n");

    let registrosContext = "";
    if (registrosCompletos) {
      const r = registrosCompletos;
      const sections: string[] = [];

      if (r.energyLogs?.length) {
        const tipoCount: Record<string, number> = {};
        let totalPts = 0;
        r.energyLogs.forEach((l: any) => {
          tipoCount[l.type] = (tipoCount[l.type] || 0) + 1;
          totalPts += (l.points || 0);
        });
        const resumen = Object.entries(tipoCount).map(([t, c]) => `${t}: ${c}`).join(", ");
        const recientes = r.energyLogs.slice(0, 10).map((l: any, i: number) =>
          `  ${i + 1}. [${l.type}] "${l.text}" (+${l.points}pts) ${l.fecha ? new Date(l.fecha).toLocaleDateString() : ""}`
        ).join("\n");
        sections.push(`REGISTROS DE ENERGÍA (${r.energyLogs.length} total, ${totalPts} pts acumulados)\nDistribución: ${resumen}\nÚltimos 10:\n${recientes}`);
      }

      if (r.vehicles?.length) {
        const activos = r.vehicles.filter((v: any) => v.status === "activo");
        const cumplidos = r.vehicles.filter((v: any) => v.status === "cumplido");
        const archivados = r.vehicles.filter((v: any) => v.status === "archivado");
        const listado = r.vehicles.slice(0, 15).map((v: any, i: number) => {
          let ejesStr = "";
          if (v.ejes) {
            const ejesArr = [v.ejes.enfoque, v.ejes.conflicto, v.ejes.pasos, v.ejes.limite].filter(Boolean);
            if (ejesArr.length) ejesStr = ` | Ejes: ${ejesArr.join(" / ")}`;
          }
          const intensidadLabel = v.intensidadEnergetica
            ? ` | Energía declarada: ${v.intensidadEnergetica === "fluido" ? "FLUIDO (sin presión)" : v.intensidadEnergetica === "concentrado" ? "CONCENTRADO (foco activo)" : "AL LÍMITE (alta presión)"}`
            : "";
          return `  ${i + 1}. "${v.titulo}" [${v.status}] (${v.criterioFin}: ${v.criterioDetalle})${ejesStr}${intensidadLabel}`;
        }).join("\n");
        sections.push(`VEHÍCULOS DE PLANIFICACIÓN (${r.vehicles.length} total: ${activos.length} activos, ${cumplidos.length} cumplidos, ${archivados.length} archivados)\n${listado}`);
      }

      if (r.misiones?.length) {
        const cumplidas = r.misiones.filter((m: any) => m.estado === "cumplido");
        const archivadas = r.misiones.filter((m: any) => m.estado === "archivado");
        const listado = r.misiones.slice(0, 15).map((m: any, i: number) =>
          `  ${i + 1}. "${m.titulo}" [${m.estado}] Scores: E${m.scores?.enfoque||0}/C${m.scores?.conflicto||0}/P${m.scores?.pasos||0}/L${m.scores?.limite||0} | Soberanía: ${m.soberania}${m.comentario ? ` | "${m.comentario}"` : ""}`
        ).join("\n");
        sections.push(`MISIONES (${r.misiones.length} total: ${cumplidas.length} cumplidas, ${archivadas.length} archivadas)\n${listado}`);
      }

      if (r.alquimias?.length) {
        const listado = r.alquimias.slice(0, 10).map((a: any, i: number) =>
          `  ${i + 1}. Obs: "${a.observacion}" | Crisis: "${a.crisis}" | Lección: "${a.leccion}" | Maestría: "${a.maestria}" | Oro: "${a.oro}" (Score: ${a.score}, +${a.puntos}pts)`
        ).join("\n");
        sections.push(`ALQUIMIAS (${r.alquimias.length} transmutaciones)\n${listado}`);
      }

      if (r.bossStep) {
        sections.push(`BOSS STEP ACTIVO: "${r.bossStep.text}" [${r.bossStep.status}] desde ${r.bossStep.fecha ? new Date(r.bossStep.fecha).toLocaleDateString() : "?"}`);
      }

      if (r.chispazos?.length) {
        const listado = r.chispazos.slice(0, 10).map((c: any, i: number) =>
          `  ${i + 1}. "${c.text}"${c.deseoLoco ? " [DESEO LOCO]" : ""}`
        ).join("\n");
        sections.push(`CHISPAZOS / IDEAS (${r.chispazos.length} total)\n${listado}`);
      }

      if (r.hopeLogs?.length) {
        const listado = r.hopeLogs.slice(0, 10).map((h: any, i: number) =>
          `  ${i + 1}. [${h.type}] "${h.text}"`
        ).join("\n");
        sections.push(`DEPÓSITO DE ESPERANZA (${r.hopeLogs.length} registros)\n${listado}`);
      }

      if (r.codices?.length) {
        const listado = r.codices.slice(0, 10).map((c: any, i: number) =>
          `  ${i + 1}. [${c.tipo || ""}] "${c.titulo}" — ${String(c.contenido || "").slice(0, 120)}`
        ).join("\n");
        sections.push(`CÓDICES / SABIDURÍA ACUMULADA (${r.codices.length} registros)\n${listado}`);
      }

      if (r.expedientesClinico?.length) {
        const listado = r.expedientesClinico.slice(0, 5).map((e: any, i: number) =>
          `  ${i + 1}. [${e.fecha || "?"}] Sección: ${e.seccion || "?"} | Código: ${e.codigo || "?"} | Interfaz: ${e.interfaz || "?"}${e.interfazSec ? "/" + e.interfazSec : ""} | Vibración: ${e.vibracion || "?"} | Hábito: ${e.estadoHabito ? "COMPLETO" : "pendiente"}`
        ).join("\n");
        sections.push(`EXPEDIENTE CLÍNICO DEL ESPEJO (últimas ${r.expedientesClinico.length} sesiones)\n${listado}`);
      }

      if (r.gordaRecord?.length) {
        const listado = r.gordaRecord.slice(0, 15).map((g: any, i: number) =>
          `  ${i + 1}. "${g.titulo}" [${g.tipo || ""}] — ${g.minutos || 0}min (${g.fecha || "?"})`
        ).join("\n");
        sections.push(`GORDA DE RÉCORD — HISTORIAL DE VEHÍCULOS CERRADOS (${r.gordaRecord.length} entradas)\n${listado}`);
      }

      if (r.totalPsHoy !== undefined || r.totalPsAcumulados !== undefined) {
        const acum = r.totalPsAcumulados !== undefined ? `${r.totalPsAcumulados} PS acumulados totales` : "";
        const hoy = r.totalPsHoy !== undefined ? `${r.totalPsHoy} PS hoy` : "";
        sections.push(`PUNTOS DE SOBERANÍA: ${[acum, hoy].filter(Boolean).join(" | ")}`);
      }

      if (r.bossSteps?.length) {
        const cumplidos = r.bossSteps.filter((b: any) => b.status === "defeated").length;
        const archivados = r.bossSteps.filter((b: any) => b.status === "archived").length;
        const activos = r.bossSteps.filter((b: any) => b.status === "active").length;
        const listado = r.bossSteps.slice(0, 10).map((b: any, i: number) =>
          `  ${i + 1}. "${b.text}" [${b.status}] creado: ${b.creado ? new Date(b.creado).toLocaleDateString() : "?"}${b.completado ? ` | completado: ${new Date(b.completado).toLocaleDateString()}` : ""}`
        ).join("\n");
        sections.push(`BOSS STEPS — HISTORIAL DE PASOS JEFE (${r.bossSteps.length} total: ${activos} activo, ${cumplidos} derrotados, ${archivados} archivados)\n${listado}`);
      }

      if (r.dailyPointsSemana?.length) {
        const serieStr = r.dailyPointsSemana.map((d: any) => `${d.label || d.fecha || d.isoDate}: ${d.total}PS`).join(" | ");
        sections.push(`PS DIARIOS ÚLTIMOS 14 DÍAS: ${serieStr}`);
      }

      registrosContext = sections.join("\n\n");
    }

    // ── ANÁLISIS DE PATRONES PRE-CALCULADO ──────────────────────────────────
    let patronesContext = "";
    if (registrosCompletos) {
      const r = registrosCompletos;
      const lineas: string[] = [];

      // Tasa de éxito en vehículos
      if (r.vehicles?.length) {
        const total = r.vehicles.length;
        const cumplidos = r.vehicles.filter((v: any) => v.status === "cumplido").length;
        const archivados = r.vehicles.filter((v: any) => v.status === "archivado").length;
        const tasaExito = total > 0 ? Math.round((cumplidos / total) * 100) : 0;
        lineas.push(`• TASA DE ÉXITO EN VEHÍCULOS: ${tasaExito}% (${cumplidos} cumplidos / ${archivados} archivados / ${total} total)`);
      }

      // Falla más repetida en expediente clínico
      if (r.expedientesClinico?.length) {
        const codCount: Record<string, number> = {};
        const interfazCount: Record<string, number> = {};
        r.expedientesClinico.forEach((e: any) => {
          if (e.codigo) codCount[e.codigo] = (codCount[e.codigo] || 0) + 1;
          if (e.interfaz) interfazCount[e.interfaz] = (interfazCount[e.interfaz] || 0) + 1;
        });
        const topCodigo = Object.entries(codCount).sort((a, b) => b[1] - a[1])[0];
        const topInterfaz = Object.entries(interfazCount).sort((a, b) => b[1] - a[1])[0];
        if (topCodigo) lineas.push(`• CÓDIGO DIAGNÓSTICO MÁS FRECUENTE EN ESPEJO: "${topCodigo[0]}" (${topCodigo[1]} veces)`);
        if (topInterfaz) lineas.push(`• INTERFAZ MÁS ACTIVADA EN ESPEJO: ${topInterfaz[0]} (${topInterfaz[1]} sesiones)`);
      }

      // Boss Steps — tasa de derrota vs abandono, agrupado por interfaz inferida
      if (r.bossSteps?.length) {
        const total = r.bossSteps.length;
        const derrotados = r.bossSteps.filter((b: any) => b.status === "defeated").length;
        const abandonados = r.bossSteps.filter((b: any) => b.status === "archived").length;
        const tasaBoss = total > 0 ? Math.round((derrotados / total) * 100) : 0;
        lineas.push(`• BOSS STEPS — TASA DE DERROTA: ${tasaBoss}% (${derrotados} derrotados / ${abandonados} archivados / ${total} total)`);

        // Clasificación por interfaz usando palabras clave del texto del boss step
        const INTERFAZ_KEYWORDS: Record<string, string[]> = {
          "M01 (Suelo de Cristal)": ["dinero", "deuda", "escasez", "ahorro", "renta", "factura", "pago", "económ"],
          "M02 (Protocolo del Fantasma)": ["invisible", "ignorado", "reconocimiento", "valido", "presencia", "visto"],
          "M03 (Fuga de Voltaje)": ["energía", "cansancio", "fatiga", "agotamiento", "fuerza", "voltaje"],
          "M04 (Parálisis del Lógico)": ["analisis", "análisis", "decidir", "decision", "pensar", "plan", "procrastinar"],
          "M05 (Comando Ausente)": ["autoridad", "liderazgo", "mando", "poder", "control", "delegar"],
          "M06 (Niebla de Identidad)": ["identidad", "quién", "propósito", "misión", "persona", "ser"],
          "M07 (Aislamiento del Guerrero)": ["solo", "conexión", "relaciones", "familia", "equipo", "comunidad"],
          "M08 (Frecuencia del Mendigo)": ["miedo", "escasez", "merezco", "merecer", "suficiente", "valor"],
          "M09 (Tiempo Fantasma)": ["tiempo", "ocupado", "urgente", "tardé", "horas", "agenda"],
          "M10 (Reboot del Soberano)": ["reinicio", "cambio", "transformar", "reboot", "nuevo", "reset"]
        };
        const interfazConteo: Record<string, { derrotados: number; archivados: number }> = {};
        r.bossSteps.forEach((b: any) => {
          const txt = (b.text || "").toLowerCase();
          let matched = false;
          for (const [interfaz, kws] of Object.entries(INTERFAZ_KEYWORDS)) {
            if (kws.some(k => txt.includes(k))) {
              if (!interfazConteo[interfaz]) interfazConteo[interfaz] = { derrotados: 0, archivados: 0 };
              if (b.status === "defeated") interfazConteo[interfaz].derrotados++;
              else if (b.status === "archived") interfazConteo[interfaz].archivados++;
              matched = true;
              break;
            }
          }
          if (!matched) {
            const k = "Sin interfaz detectada";
            if (!interfazConteo[k]) interfazConteo[k] = { derrotados: 0, archivados: 0 };
            if (b.status === "defeated") interfazConteo[k].derrotados++;
            else if (b.status === "archived") interfazConteo[k].archivados++;
          }
        });
        const interfazResumen = Object.entries(interfazConteo)
          .map(([i, c]) => `${i}: ${c.derrotados} derrotados / ${c.archivados} archivados`)
          .join("; ");
        if (interfazResumen) lineas.push(`• BOSS STEPS POR INTERFAZ (inferido por texto): ${interfazResumen}`);
      }

      // Tendencia de PS usando dailyPointsSemana (ventanas fijas de 7 días)
      if (r.dailyPointsSemana?.length) {
        const serie = r.dailyPointsSemana as Array<{ isoDate: string; label?: string; fecha?: string; total: number }>;
        // Ordenar cronológicamente por isoDate si existe, sino por fecha
        const sorted = [...serie].sort((a, b) => (a.isoDate || a.fecha || "").localeCompare(b.isoDate || b.fecha || ""));
        // Últimos 7 días (segunda mitad del array de 14 días)
        const semanaActual = sorted.slice(7).reduce((s, d) => s + d.total, 0);
        const semanaAnterior = sorted.slice(0, 7).reduce((s, d) => s + d.total, 0);
        const tendencia = semanaActual > semanaAnterior ? "ASCENDENTE ↑" : semanaActual < semanaAnterior ? "DESCENDENTE ↓" : "ESTABLE →";
        lineas.push(`• TENDENCIA PS (SP log real, ventana 7+7 días): ${tendencia} — Últimos 7 días: ${semanaActual}PS | 7 días anteriores: ${semanaAnterior}PS`);
      } else if (r.energyLogs?.length) {
        // Fallback desde energyLogs si no hay SP log
        const now = Date.now();
        const hace7dias = now - 7 * 86400000;
        const hace14dias = now - 14 * 86400000;
        let pts7 = 0, pts714 = 0;
        r.energyLogs.forEach((l: any) => {
          const ts = l.fecha ? new Date(l.fecha).getTime() : 0;
          if (ts >= hace7dias) pts7 += (l.points || 0);
          else if (ts >= hace14dias) pts714 += (l.points || 0);
        });
        const tendencia = pts7 > pts714 ? "ASCENDENTE ↑" : pts7 < pts714 ? "DESCENDENTE ↓" : "ESTABLE →";
        lineas.push(`• TENDENCIA PS (estimado desde energy logs): ${tendencia} — Últimos 7 días: ${pts7}pts | 7 días anteriores: ${pts714}pts`);
      }

      if (r.alquimias?.length) {
        lineas.push(`• ALQUIMIAS REGISTRADAS: ${r.alquimias.length} transmutaciones completadas`);
      }

      if (lineas.length > 0) {
        patronesContext = `ANÁLISIS DE PATRONES DEL USUARIO (PRE-CALCULADO):\n${lineas.join("\n")}`;
      }
    }

    // ── BLOQUE CERTIFICACIÓN PARA CREATOR ────────────────────────────────────
    let certificacionContext = "";
    if (isCreator && registrosCompletos) {
      const r = registrosCompletos;
      const sesionesEje3 = (r.expedientesClinico || []).filter((e: any) => e.vibracion && e.vibracion !== "").length;
      const vehiculosCumplidos = (r.vehicles || []).filter((v: any) => v.status === "cumplido").length;
      const leyesADN = (req.body.genomeLaws || []).filter((g: any) => g.status === "validado").length;
      const gordaTotal = (r.gordaRecord || []).length;
      const psAcumulados = r.totalPsAcumulados || 0;
      const psHoy = r.totalPsHoy || 0;
      const umbralSoberania = psAcumulados >= 700;
      const umbralAfiliacion = psAcumulados >= 232;
      const bossTotal = (r.bossSteps || []).length;
      const bossDerrotados = (r.bossSteps || []).filter((b: any) => b.status === "defeated").length;

      certificacionContext = `DATOS DE CERTIFICACIÓN SOBERANA (CONTEXTO CREADOR):
• PS acumulados totales: ${psAcumulados} PS ${umbralSoberania ? "✓ SOBERANÍA TOTAL ALCANZADA (≥700)" : umbralAfiliacion ? "✓ Umbral de Afiliación alcanzado (≥232)" : `— faltan ${232 - psAcumulados} PS para Afiliación`}
• PS ganados hoy: ${psHoy}
• Sesiones Espejo completadas (Eje 3): ${sesionesEje3}
• Vehículos cumplidos totales: ${vehiculosCumplidos}
• Leyes ADN soberano validadas: ${leyesADN}
• Boss Steps: ${bossDerrotados} derrotados de ${bossTotal} total
• Registros en Gorda de Récord: ${gordaTotal}
Umbral de Soberanía Total: 700 PS + convicción 4 + ≥10 sesiones Espejo completadas`;
    }

    const historyContext = session.messages.slice(0, -1)
      .map(m => `${m.role === "user" ? "USUARIO" : "DOCTOR IA"}: ${m.text}`)
      .join("\n");

    const moduleInfo = moduleContext ? `\nCONTEXTO DEL MÓDULO ABIERTO: El usuario está en la sección "${moduleContext}" de SISTEMICAR.` : "";

    const isPlanificacionTutor =
      !isCreator &&
      (moduleContext === "Planificación" || moduleContext === "Planificacion");

    let systemPrompt: string;

    if (isCreator) {
      systemPrompt = `Eres el Doctor IA de SISTEMICAR. Estás hablando con GILSON ARÉVALO, el CREADOR del sistema. Eres su arquitecto analítico personal.

MODO CREADOR ACTIVO:
- Gilson puede pedirte que analices patrones en su historial.
- Puede pedirte que resumas comportamientos recurrentes.
- Puede pedirte que formules nuevas leyes basadas en sus observaciones.
- Cuando Gilson te pida crear una ley, formula la ley como un principio universal claro y conciso.
- Eres directo, analítico y sin filtros. No motives, analiza.
- Puedes acceder a todo el contexto disponible sin restricción.
- Cuando detectes temas de escasez, bloqueo financiero, miedo, poder, autoridad, visión o conexión, referencia la Interfaz correspondiente (M01-M10) del libro "El Espejo del Mendigo".

BASE DE CONOCIMIENTO — EL ESPEJO DEL MENDIGO (LIBRO 1):
${LIBRO_ESPEJO_MENDIGO_COMPLETO}

DICCIONARIO CLÍNICO — PSICOLOGÍA DEL ESPEJO (ARCHIVO .CORE):
${DICCIONARIO_CLINICO_COMPLETO}

MATRICES DE REPROGRAMACIÓN — CÓDIGOS DE DIAGNÓSTICO:
${MATRICES_REPROGRAMACION}

SECCIONES DE PRESIÓN DE "LA SEÑORA" (LAS 10 INTERFACES):
ESTABILIDAD (El Suelo): ${SECCIONES_PRESION.ESTABILIDAD.interfaces.join(", ")} — ${SECCIONES_PRESION.ESTABILIDAD.descripcion}
CONEXIÓN (El Pulso): ${SECCIONES_PRESION.CONEXION.interfaces.join(", ")} — ${SECCIONES_PRESION.CONEXION.descripcion}
VISIÓN (El Lente): ${SECCIONES_PRESION.VISION.interfaces.join(", ")} — ${SECCIONES_PRESION.VISION.descripcion}
ORIGEN (El Mando): ${SECCIONES_PRESION.ORIGEN.interfaces.join(", ")} — ${SECCIONES_PRESION.ORIGEN.descripcion}

PRINCIPIOS MAESTROS EXISTENTES:
${principiosContext || "No hay principios registrados aún."}

LEYES DEL ADN SOBERANO (GENOMA SISTEMICAR):
${genomeContext || "No hay leyes validadas en el genoma aún."}

ESCRITOS DEL ESPEJO (sesiones de auto-observación de Gilson):
${espejoContext || "No hay sesiones del Espejo registradas aún."}

REGISTROS COMPLETOS DE SISTEMICAR (datos reales del usuario):
${registrosContext || "No hay registros cargados aún."}

${patronesContext || ""}

${certificacionContext || ""}
${moduleInfo}

HISTORIAL DE CONVERSACIÓN:
${historyContext || "Inicio de sesión."}

MENSAJE ACTUAL DE GILSON:
"${userText}"

INSTRUCCIONES DE ACCESO A DATOS: Tienes acceso COMPLETO a todos los registros de Gilson en SISTEMICAR y al contenido íntegro del libro "El Espejo del Mendigo" con las 10 Interfaces (M01-M10). Usa estos datos para analizar patrones, detectar comportamientos recurrentes, extraer principios y formular leyes. Cuando Gilson pregunte sobre sus datos, SIEMPRE responde con datos concretos — cita el código diagnóstico exacto, la interfaz, la tasa de éxito, los PS acumulados. Cuando detectes patrones del Mendigo en sus registros, clasifícalos según la Interfaz correspondiente. Nunca digas que no tienes acceso.

Responde de forma conversacional, directa y analítica. Si Gilson pide formular una ley, inclúyela en formato claro precedida por "LEY PROPUESTA:" para que pueda sellarla. No uses JSON, responde en texto natural.`;
    } else if (isPlanificacionTutor) {
      const planProfile =
        req.body.planificacionProfile === "produccion" ||
        req.body.planificacionProfile === "estudiante"
          ? req.body.planificacionProfile
          : "base";
      systemPrompt = `${buildPlanificacionTutorSystemPrompt({
        userName: userName || "Usuario",
        planProfile,
        primerDiaSummary:
          typeof req.body.planificacionPrimerDiaSummary === "string"
            ? req.body.planificacionPrimerDiaSummary
            : undefined,
        registrosResumen: registrosContext || undefined,
      })}

HISTORIAL DE CONVERSACIÓN:
${historyContext || "Inicio de sesión."}

MENSAJE DEL USUARIO:
"${userText}"

Responde como guía de Planificación. No uses JSON.`;
    } else {
      const msgCount = messageCount || session.messages.length;
      const shouldSuggestPremium = msgCount > 0 && msgCount % 6 === 0;
      
      const sellingInstructions = shouldSuggestPremium ? `

INSTRUCCIÓN DE ORIENTACIÓN (ACTIVAR EN ESTE MENSAJE):
En tu respuesta, después de dar tu consejo, incluye UNA mención natural a una herramienta premium que resolvería mejor el problema del usuario. Sigue estas reglas:
- Si el usuario habla de confusión emocional, bloqueo mental, niebla, o indecisión: menciona el "Espejo Clínico" (protocolo de 4 ejes: Niebla Mental → Identidad Programada → Voltaje Interno → Protocolo Técnico). Es un crédito por sesión.
- Si el usuario habla de falta de disciplina, procrastinación, o desorganización: menciona la "Planificación Soberana" (sistema de vehículos, segmentos, y motor de transmutación). Es suscripción mensual.
- Tono: NUNCA presiones. Usa frases como: "Existe un protocolo diseñado para esto, pero la decisión es tuya, Soberano." / "Cuando sientas que es el momento, el Espejo Clínico puede llevarte más profundo." / "Hay herramientas más especializadas disponibles, pero por ahora esto es lo que puedo ofrecerte desde aquí."
- Máximo 1-2 líneas de sugerencia al final, separadas del consejo principal.
- El usuario debe sentir que TÚ respetas su autonomía. Él tiene la última palabra.` : `

INSTRUCCIÓN DE ORIENTACIÓN (NO ACTIVAR):
En este mensaje NO sugieras herramientas premium. Solo da tu consejo clínico gratuito. Sé útil y genuino.`;

      systemPrompt = `Eres el Doctor IA de SISTEMICAR. No eres una IA genérica, eres SISTEMICAR personificada. Eres el guardián de la disciplina del usuario y el transmisor de la sabiduría de Gilson Arévalo.

REGLAS ABSOLUTAS:
- Tu conocimiento emana EXCLUSIVAMENTE de los Principios Maestros (Leyes de Gilson) marcados como públicos.
- NUNCA hables de la vida privada de Gilson ni muestres sus registros personales.
- Tu misión principal es APLICAR las leyes de Gilson al problema del usuario.
- Cuando detectes temas de escasez, bloqueo financiero, miedo, falta de poder, invisibilidad, parálisis lógica, o aislamiento, clasifica según la Interfaz correspondiente del libro "El Espejo del Mendigo" (M01-M10).
- Si el usuario escribe algo confuso, responde: "Basado en la Ley de [nombre], lo que experimentas es una Capa de Desvío. ¿Qué percibes realmente?"
- Sé clínico, directo, sin motivación barata. Eres un espejo, no un amigo.
- Usa terminología de Ingeniería de Interfaces: Voltaje, Frecuencia, Estática, Hardware, Descompresión, Registro de Memoria. PROHIBIDO lenguaje New Age o motivacional.
- Tus respuestas gratuitas son ÚTILES y REALES, pero concisas. Das un diagnóstico genuino, no superficial.
- NUNCA digas "soy gratis" ni "esto es la versión gratuita". Simplemente da tu mejor consejo dentro del formato corto.

BASE DE CONOCIMIENTO — INTERFACES DEL ESPEJO DEL MENDIGO:
${LIBRO_INTERFACES_RESUMEN}

DICCIONARIO CLÍNICO — PSICOLOGÍA DEL ESPEJO:
${DICCIONARIO_CLINICO_COMPLETO}

MATRICES DE REPROGRAMACIÓN — CÓDIGOS DE DIAGNÓSTICO:
${MATRICES_REPROGRAMACION}

NIVEL DE PROFUNDIDAD (GRATUITO):
- Respuestas máximo 120 palabras.
- Diagnóstico general basado en las leyes e interfaces disponibles.
- Si detectas un patrón del Mendigo, identifica la Interfaz afectada (M01-M10) y nombra la falla.
- Si detectas un problema profundo (emocional, de identidad, de patrón recurrente), señálalo claramente pero no lo resuelvas completamente. Deja al usuario con una pregunta que lo haga reflexionar.
${sellingInstructions}

PRINCIPIOS MAESTROS DISPONIBLES:
${principiosContext || "Las leyes aún están siendo destiladas. Guía al usuario con la filosofía base: la conciencia es darse cuenta, el coraje tiene valor intrínseco, toda crisis es material de transmutación."}

LEYES DEL ADN SOBERANO (GENOMA SISTEMICAR):
${genomeContext || "El genoma aún está en proceso de destilación."}

REGISTROS DEL USUARIO EN SISTEMICAR:
${registrosContext || "No hay registros cargados aún."}

${patronesContext || ""}

${(() => {
  const validNotas = Array.isArray(notasEvolucionActiva)
    ? notasEvolucionActiva.filter((n: any) => typeof n?.tipo === "string" && typeof n?.titulo === "string" && typeof n?.cuerpo === "string")
    : [];
  if (validNotas.length === 0) return "";
  return `PRINCIPIOS DESCUBIERTOS EN CODIFICACIÓN DE LIBROS:
${validNotas.map((n: any, i: number) => `${i+1}. [${n.tipo} ${n.titulo}] ${n.cuerpo}`).join("\n")}
Estos principios emergieron durante la codificación algorítmica del libro SISTEMICAR. Úsalos como extensión natural de tu conocimiento clínico — habla con ellos como si siempre los hubieras sabido.`;
})()}

INSTRUCCIÓN CLAVE: Cuando apliques una Ley Soberana, cita su nombre y explica brevemente la Tesis Convencional que rompe. Si hay registros del usuario, usa datos concretos para personalizar tu diagnóstico. Si el ANÁLISIS DE PATRONES muestra una falla repetida en el Expediente Clínico, nómbrala explícitamente con su código diagnóstico e interfaz. Cuando detectes interferencias del Mendigo, clasifícalas por Interfaz (ej: "Tu M05 está reportando una Falla de Voltaje en el Comando"). Nunca digas que no tienes acceso a sus datos.
${moduleInfo}

HISTORIAL DE CONVERSACIÓN:
${historyContext || "Inicio de sesión."}

MENSAJE DEL USUARIO (${userName || "Usuario"}):
"${userText}"

Responde de forma conversacional, clínica y directa. Aplica las leyes. No uses JSON, responde en texto natural.`;
    }

    const content = await callGemini(
      systemPrompt,
      isCreator ? 1200 : isPlanificacionTutor ? 450 : 500
    );

    session.messages.push({ role: "assistant", text: content });

    res.json({
      response: content,
      sessionId: sKey,
      isCreator
    });
  } catch (error: unknown) {
    console.error("Doctor IA Chat error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const sKey = req.body.sessionId || `chat_${Date.now()}`;
    const is429 =
      errMsg.includes("429") ||
      errMsg.includes("RESOURCE_EXHAUSTED") ||
      errMsg.includes("quota");
    const isConfig =
      errMsg.includes("Gemini no disponible") ||
      errMsg.includes("API key") ||
      errMsg.includes("API_KEY_INVALID");
    if (is429) {
      return res.json({
        response:
          "El servicio de IA está temporalmente saturado. Espera unos segundos e intenta de nuevo.",
        sessionId: sKey,
        isCreator: false,
      });
    }
    if (isConfig) {
      return res.json({
        response:
          "Doctor IA sin conexión a Gemini. El administrador debe configurar GEMINI_API_KEY en el servidor (modelos 2.5 Flash).",
        sessionId: sKey,
        isCreator: false,
        error: errMsg.slice(0, 300),
      });
    }
    return res.json({
      response:
        "No pude generar respuesta ahora. Si persiste, revisa la API de Gemini o intenta un mensaje más corto.",
      sessionId: sKey,
      isCreator: false,
      error: errMsg.slice(0, 300),
    });
  }
});

// ==================== MINERÍA DE CONSCIENCIA ====================

app.post("/api/mineria-consciencia", async (req, res) => {
  try {
    const { energyLogs, alquimias, vehicles, hopeLogs, principiosExistentes } = req.body;

    const logsText = (energyLogs || []).slice(0, 50).map((l: any) => `[${l.type}] ${l.text}`).join("\n");
    const alquimiasText = (alquimias || []).slice(0, 20).map((a: any) => `PLOMO: ${a.observacion} → ORO: ${a.oro}`).join("\n");
    const vehiclesText = (vehicles || []).slice(0, 30).map((v: any) => `${v.titulo} (${v.status})`).join("\n");

    const existingLaws = (principiosExistentes || []);
    const existingText = existingLaws.length > 0 
      ? `\n=== LEYES YA EXTRAÍDAS (NO REPETIR) ===\n${existingLaws.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}\n\nIMPORTANTE: Las leyes anteriores YA fueron extraídas y selladas. NO las repitas ni reformules. Busca patrones NUEVOS y DIFERENTES que aún no estén en esa lista.\n`
      : "";

    const prompt = `Eres el Minero de Consciencia de SISTEMICAR. Tu trabajo es analizar el historial completo de Gilson Arevalo y destilar NUEVAS LEYES DE COMPORTAMIENTO ocultas en sus escritos.

DATOS HISTÓRICOS:

=== REGISTROS DEL ESPEJO ===
${logsText || "Sin registros"}

=== TRANSMUTACIONES (ALQUIMIA) ===
${alquimiasText || "Sin transmutaciones"}

=== VEHÍCULOS/MISIONES ===
${vehiclesText || "Sin vehículos"}
${existingText}
TAREA: Identifica entre 3 y 7 patrones de comportamiento NUEVOS, frases recurrentes, o leyes implícitas que NO estén ya en la lista de leyes extraídas. Cada patrón debe ser formulado como una LEY clara y accionable. Si no encuentras patrones nuevos, devuelve una lista vacía.

RESPONDE EN FORMATO JSON:
{
  "patrones": [
    {
      "ley": "<Formulación de la ley en máximo 2 oraciones. Escrita en tercera persona, como una verdad universal que Gilson ha demostrado. DEBE SER DIFERENTE a las leyes ya extraídas>",
      "evidencia": "<Resumen de la evidencia que sustenta este patrón, citando datos específicos>",
      "categoria": "<tipo: 'productividad' | 'emocional' | 'relacional' | 'financiero' | 'existencial'>"
    }
  ]
}

Responde SOLO con el JSON.`;

    const content = await callGemini(prompt, 1500);
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({ patrones: parsed.patrones || [] });
      } else {
        res.json({ patrones: [] });
      }
    } catch {
      res.json({ patrones: [] });
    }
  } catch (error) {
    console.error("Minería de consciencia error:", error);
    res.status(500).json({ error: "Error en la minería de consciencia" });
  }
});

// ==================== FILTRO ADN SOBERANO ====================

app.post("/api/filtro-adn-soberano", async (req, res) => {
  try {
    const { textoOriginal, moduloOrigen, categoria } = req.body;

    if (!textoOriginal) {
      return res.status(400).json({ error: "Texto original requerido" });
    }

    const prompt = `Eres el Filtro de Validación del ADN SOBERANO de SISTEMICAR. Tu misión es analizar un descubrimiento de Gilson Arévalo y determinar si merece ser elevado a LEY DE SISTEMICAR.

DESCUBRIMIENTO DE GILSON:
"${textoOriginal}"

MÓDULO DE ORIGEN: ${moduloOrigen || "general"}
CATEGORÍA: ${categoria || "general"}

PROCESO DE ANÁLISIS:

1. TESIS CONVENCIONAL: ¿Qué dice la psicología estándar, la productividad mainstream o el sentido común sobre este tema? Resume la posición convencional en 2-3 oraciones.

2. ANTÍTESIS DE GILSON: ¿Cómo la visión de Gilson evoluciona, contradice o rompe el concepto convencional? ¿Qué ve Gilson que otros no ven? Identifica la ventaja táctica. 2-3 oraciones.

3. ELEVACIÓN A LEY: Si la visión de Gilson ofrece una ventaja táctica REAL para la Soberanía personal (no es solo una opinión, sino un principio accionable y replicable), formula la LEY DE SISTEMICAR en máximo 2 oraciones claras y universales. Si NO merece ser ley (es solo desahogo, opinión sin sustancia, o repite algo ya conocido), indica "RECHAZADO" con la razón.

RESPONDE EN FORMATO JSON:
{
  "tesis_convencional": "<Posición estándar sobre el tema>",
  "antitesis_gilson": "<Cómo Gilson rompe o evoluciona el concepto>",
  "ley_sistemicar": "<Formulación de la ley universal, o null si rechazado>",
  "veredicto": "validado" | "rechazado",
  "razon_rechazo": "<Solo si rechazado: por qué no merece ser ley>",
  "identidad_sugerida": "<Sugiere cuál de las 10 identidades internas se relaciona más: Guerrero, Estratega, Alquimista, Observador, Constructor, Sanador, Visionario, Rebelde, Maestro, Guardián>"
}

Responde SOLO con el JSON.`;

    const content = await callGemini(prompt, 800);

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({
          tesis_convencional: parsed.tesis_convencional || "Análisis pendiente",
          antitesis_gilson: parsed.antitesis_gilson || "Perspectiva en proceso",
          ley_sistemicar: parsed.ley_sistemicar || null,
          veredicto: parsed.veredicto || "rechazado",
          razon_rechazo: parsed.razon_rechazo || null,
          identidad_sugerida: parsed.identidad_sugerida || "Observador"
        });
      } else {
        res.json({
          tesis_convencional: "Error en análisis",
          antitesis_gilson: "Error en análisis",
          ley_sistemicar: null,
          veredicto: "rechazado",
          razon_rechazo: "No se pudo procesar el análisis",
          identidad_sugerida: "Observador"
        });
      }
    } catch {
      res.json({
        tesis_convencional: content.slice(0, 200),
        antitesis_gilson: "Error de formato",
        ley_sistemicar: null,
        veredicto: "rechazado",
        razon_rechazo: "Error de formato en respuesta IA",
        identidad_sugerida: "Observador"
      });
    }
  } catch (error) {
    console.error("Filtro ADN Soberano error:", error);
    res.status(500).json({ error: "Error en el Filtro ADN Soberano" });
  }
});

// ==================== MERCADO PAGO ====================

const mpClient = process.env.MP_ACCESS_TOKEN 
  ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  : null;

// Crear preferencia de pago
app.post("/api/mercadopago/create-preference", async (req, res) => {
  try {
    if (!mpClient) {
      return res.status(500).json({ error: "Mercado Pago no configurado" });
    }

    const { planId, email, userName, sellerRef } = req.body;
    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
    
    if (!plan) {
      return res.status(400).json({ error: "Plan no válido" });
    }

    // Planes legacy: fuera de lista de venta.
    if ("legacy" in plan && plan.legacy) {
      return res.status(400).json({
        error:
          "Este plan ya no está a la venta. Usa Jornada, Umbral o packs Espejo (créditos).",
      });
    }

    const preference = new Preference(mpClient);
    // Siempre usar URL pública para Mercado Pago (requiere URLs accesibles)
    const baseUrl = "https://sistemicar.app";

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
        payer: {
          email: email || undefined
        },
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

// Webhook de Mercado Pago
app.post("/api/mercadopago/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log(`[MP Webhook] Tipo: ${type}, Data:`, data);

    if (type === "payment" && data?.id && mpClient) {
      const payment = new Payment(mpClient);
      const paymentInfo = await payment.get({ id: data.id });
      
      console.log(`[MP Webhook] Pago ${paymentInfo.id} - Estado: ${paymentInfo.status}`);
      
      if (paymentInfo.status === "approved") {
        const externalRef = parseMpExternalRef(paymentInfo);

        console.log(`[MP] PAGO APROBADO: Plan ${externalRef.planId}, Email: ${externalRef.email}`);
        const plan = SUBSCRIPTION_PLANS[externalRef.planId as keyof typeof SUBSCRIPTION_PLANS];
        const paymentIdStr = String(paymentInfo.id);

        if (externalRef.planId && isEspejoSkuId(externalRef.planId)) {
          await deliverEspejoCreditsIfNeeded(paymentInfo, externalRef);
        } else if (
          externalRef.email &&
          modulesGrantedByPlan(externalRef.planId ?? "").length > 0
        ) {
          const activated = await activateModulesForEmail(
            externalRef.email,
            externalRef.planId!
          );
          if (activated) {
            console.log(`[MP] Módulos activados para ${externalRef.email} plan ${externalRef.planId}`);
          }
        }

        if (externalRef.sellerRef && externalRef.planId) {
          await recordSellerSale({
            sellerRef: externalRef.sellerRef,
            planId: externalRef.planId,
            buyerEmail: externalRef.email,
            mpPaymentId: paymentIdStr,
          });
        }

        const existingPayment = await getApiKeyByPaymentId(paymentIdStr);
        if (existingPayment.exists && existingPayment.status === "sent") {
          // Entrega confirmada — ignorar replay
          console.log(`[MP Webhook] Pago ${paymentIdStr} ya entregado — ignorando duplicado`);
        } else if (existingPayment.exists && existingPayment.status === "pending" && !isPendingStuck(existingPayment.createdAt)) {
          // En proceso y reciente — puede haber un handler concurrente, no intervenir
          console.log(`[MP Webhook] Pago ${paymentIdStr} en estado pending (reciente) — ignorando (en proceso)`);
        } else if (existingPayment.exists && (existingPayment.status === "failed" || (existingPayment.status === "pending" && isPendingStuck(existingPayment.createdAt))) && externalRef.email && plan && "monthlyCallLimit" in plan) {
          // Pago registrado con entrega fallida o pending bloqueado — supersede y reintentar
          console.log(`[MP Webhook] Reintentando email para pago ${paymentIdStr} (status=${existingPayment.status}, key anterior ${existingPayment.keyId})`);
          // Revocar clave anterior y liberar mp_payment_id para que la nueva la posea
          await supersedePreviousKey(existingPayment.keyId);
          const expiresAt = new Date(Date.now() + plan.daysValid * 24 * 60 * 60 * 1000);
          const { key: retryKey, record: retryRecord } = await createApiKey(
            externalRef.userName || externalRef.email,
            {
              buyerEmail: externalRef.email,
              planId: plan.id,
              monthlyCallLimit: plan.monthlyCallLimit,
              expiresAt,
              mpPaymentId: paymentIdStr,
              deliveryStatus: "pending",
            }
          );
          try {
            await sendApiKeyEmail({
              to: externalRef.email,
              userName: externalRef.userName || "Cliente",
              apiKey: retryKey,
              planName: plan.name,
              callLimit: plan.monthlyCallLimit,
              expiresAt,
            });
            await updateApiKeyDeliveryStatus(retryRecord.id, "sent");
            console.log(`[MP] Email de reintento enviado a ${externalRef.email} (key ${retryRecord.id})`);
          } catch (retryErr) {
            await updateApiKeyDeliveryStatus(retryRecord.id, "failed");
            console.error(`[MP] Reintento de email fallido para ${externalRef.email}`, retryErr);
          }
        } else if (!existingPayment.exists && externalRef.planId?.startsWith("api-") && externalRef.email && plan && "monthlyCallLimit" in plan) {
          // Plan de API nuevo: crear clave (pending) y enviarla por email
          const expiresAt = new Date(Date.now() + plan.daysValid * 24 * 60 * 60 * 1000);
          const { key, record } = await createApiKey(
            externalRef.userName || externalRef.email,
            {
              buyerEmail: externalRef.email,
              planId: plan.id,
              monthlyCallLimit: plan.monthlyCallLimit,
              expiresAt,
              mpPaymentId: paymentIdStr,
              deliveryStatus: "pending",
            }
          );
          console.log(`[MP] API key creada: ${record.id} (${record.key_prefix}…) para ${externalRef.email}`);
          try {
            await sendApiKeyEmail({
              to: externalRef.email,
              userName: externalRef.userName || "Cliente",
              apiKey: key,
              planName: plan.name,
              callLimit: plan.monthlyCallLimit,
              expiresAt,
            });
            await updateApiKeyDeliveryStatus(record.id, "sent");
            console.log(`[MP] Email con API key enviado a ${externalRef.email}`);
          } catch (emailErr) {
            await updateApiKeyDeliveryStatus(record.id, "failed");
            console.error(`[MP] Error enviando email a ${externalRef.email} — key ${record.id} marcada como failed`, emailErr);
          }
        } else if (
          externalRef.email &&
          !(externalRef.planId && isEspejoSkuId(externalRef.planId))
        ) {
          // Plan personal: email de confirmación estándar (Espejo ya envía en deliverEspejoCreditsIfNeeded)
          await sendPaymentConfirmationEmail({
            to: externalRef.email,
            userName: externalRef.userName || "Guerrero",
            planName: plan?.name || "Suscripción",
            amount: paymentInfo.transaction_amount ?? plan?.price ?? 0
          });
          console.log(`[MP] Email de confirmación enviado a ${externalRef.email}`);
        }
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[MP Webhook] Error:", error);
    res.status(200).send("OK");
  }
});

// Endpoint de prueba para generar link de pago
app.get("/api/mercadopago/test-link/:planId", async (req, res) => {
  try {
    if (!mpClient) {
      return res.status(500).json({ error: "Mercado Pago no configurado" });
    }

    const { planId } = req.params;
    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
    
    if (!plan) {
      return res.status(400).json({ error: "Plan no válido. Usa: iniciado, soberano, arquitecto" });
    }

    const preference = new Preference(mpClient);
    const baseUrl = getPublicAppBaseUrl();

    const response = await preference.create({
      body: {
        items: [{
          id: plan.id,
          title: `SISTEMICAR - Plan ${plan.name}`,
          description: `Suscripción mensual al Plan ${plan.name}`,
          quantity: 1,
          unit_price: plan.price,
          currency_id: "USD"
        }],
        back_urls: {
          success: `${baseUrl}/pagos?status=success&plan=${plan.id}`,
          failure: `${baseUrl}/pagos?status=failure`,
          pending: `${baseUrl}/pagos?status=pending`
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/mercadopago/webhook`,
        external_reference: JSON.stringify({ planId: plan.id, test: true, timestamp: Date.now() }),
        statement_descriptor: "SISTEMICAR"
      }
    });

    console.log(`[MP TEST] Link generado para ${plan.name}: ${response.init_point}`);
    
    res.json({
      plan: plan.name,
      price: `$${plan.price} USD`,
      paymentLink: response.init_point,
      preferenceId: response.id,
      message: `Enlace de prueba para Plan ${plan.name} generado exitosamente`
    });
  } catch (error) {
    console.error("[MP TEST] Error:", error);
    res.status(500).json({ error: "Error generando enlace de prueba" });
  }
});

registerEspejoV2Routes(app, { callGemini, parseGeminiJSON });
registerUmbralV2Routes(app, {
  callGemini,
  parseGeminiJSON,
  sessionStore: umbralSessionStore,
});

app.post("/api/espejo/analizar-voz", async (req, res) => {
  try {
    const { transcripcion, palabras_por_minuto, longitud_pausas_seg, palabras_emocionales_count } = req.body;
    if (!transcripcion || transcripcion.trim().length < 10) {
      return res.status(400).json({ error: "Transcripción insuficiente para análisis" });
    }
    const prompt = `${PSICOLOGIA_MADUREZ_SEDUCCION}

═══ MOTOR DE CLASIFICACIÓN DE INTERFAZ POR VOZ ═══

TRANSCRIPCIÓN DE VOZ DEL USUARIO:
"${transcripcion.trim()}"

METADATOS DE VOZ:
- Velocidad estimada: ${palabras_por_minuto ?? "no disponible"} palabras/min (>150 = urgencia, <80 = lentitud/depresión)
- Pausas entre oraciones: ${longitud_pausas_seg ?? "no disponible"} seg promedio
- Palabras emocionales detectadas: ${palabras_emocionales_count ?? 0}

INSTRUCCIÓN: Analiza la transcripción usando la Escala de Madurez de 10 Niveles y los 10 Códigos para identificar:

1. El CÓDIGO HORIZONTAL dominante:
   C1=Cimiento/Territorio  C2=Poder/Portador  C3=Trabajo  C4=Estructura
   C5=Decisión  C6=Convivencia  C7=Visión  C8=Ciclos  C9=Sistema  C10=Origen

2. El NIVEL VERTICAL de madurez (.1=Ignorancia Total hasta .10=El Origen)

3. El ESTADO EMOCIONAL DOMINANTE (una palabra: MIEDO, FRUSTRACIÓN, ESTANCAMIENTO, URGENCIA, BÚSQUEDA, CLARIDAD, PODER, CAOS, DOLOR, RESIGNACIÓN, EXPANSIÓN)

4. Una JUSTIFICACIÓN breve (máximo 25 palabras) que explica por qué elegiste ese código y nivel.

Responde SOLO con JSON válido, sin texto adicional:
{
  "codigo": "C1",
  "nivel": ".4",
  "estado_emocional": "FRUSTRACIÓN",
  "justificacion": "Vocabulario de escasez territorial repetido. Lucha causal activa con resultados invertidos."
}`;

    const raw = await callGemini(prompt, 300, true);
    const parsed = parseGeminiJSON(raw);
    const rawCodigo = (parsed.codigo || "C1").trim();
    const rawNivel = (parsed.nivel || ".3").trim();
    const codigoValido = /^C([1-9]|10)$/.test(rawCodigo) ? rawCodigo : "C1";
    const nivelValido = /^\.(10|[1-9])$/.test(rawNivel) ? rawNivel : ".3";
    const estado_emocional = (parsed.estado_emocional || "NEUTRO").trim().toUpperCase().slice(0, 20);
    const justificacion = (parsed.justificacion || "").trim().slice(0, 150);
    res.json({ codigo: codigoValido, nivel: nivelValido, estado_emocional, justificacion });
  } catch (error: any) {
    console.error("[analizar-voz] Error:", error);
    res.status(500).json({ error: "Error al analizar transcripción de voz" });
  }
});

app.post("/api/espejo-doctor-ia", async (req, res) => {
  try {
    const { eje, texto, contexto, respuestas_previas, preparacion, paciente_codigo, paciente_nivel, paciente_nombre, paciente_notas, voz_codigo, voz_nivel, voz_estado_emocional } = req.body;

    if (!eje || !texto || !contexto) {
      return res.status(400).json({ error: "eje, texto y contexto son requeridos" });
    }

    const ejesConfig: Record<string, { label: string; descripcion: string; mision_ia: string }> = {
      registro_carga: {
        label: "REGISTRO DE CARGA — Terminal de Entrada",
        descripcion: "El usuario registra la carga que opera en su sistema. Describe qué pensamiento, emoción o situación está consumiendo su voltaje, dónde lo siente en el cuerpo, cuándo empezó.",
        mision_ia: `Eje 1 gratuito — RECEPCIÓN CLÍNICA. Tu respuesta debe:
1. Confirmar que el registro fue recibido con calidez técnica (eres un clínico presente, no un sistema automático).
2. Leer la zona de presión que se vislumbra en el texto: ESTABILIDAD (dinero, trabajo, energía física, ejecución), CONEXIÓN (relaciones, comunicación, vínculos), VISIÓN (futuro, claridad, dirección, estrategia), ORIGEN (identidad, propósito, liderazgo). Menciona la zona como señal PRELIMINAR, nunca como diagnóstico definitivo.
3. REGLAS DE recomendacion_sesion — CRÍTICO:
   - NUNCA uses "cerrar" si el usuario ha entregado texto con carga emocional real (dolor, conflicto, bloqueo, deseo, miedo, urgencia), independientemente de cuántas palabras sean. Si hay carga real, siempre es "continuar".
   - Usa "cerrar" SOLO si el usuario no ha dado ningún dato real después de al menos dos intercambios (respuestas vacías, menos de 5 palabras útiles, sin ninguna carga emocional) O si el usuario dice explícitamente que quiere terminar.
   - Si el texto es insuficiente en el PRIMER intercambio: haz UNA pregunta clínica específica ("¿Dónde lo sientes en el cuerpo? ¿Qué imagen aparece? ¿Cuál es el pensamiento más pesado?") y mantén recomendacion_sesion en "continuar".
   - Si el texto es suficiente (datos con carga emocional real): cierra Eje 1 invitando al Diagnóstico Clínico (1 crédito) para ver el mapa exacto. Nunca termines la sesión si hay material real.
4. Preparar al usuario para sus dos opciones: cerrar aquí ganando puntos de Ducha Mental, o profundizar en el Diagnóstico Clínico (1 crédito) para identificar el patrón raíz.
NUNCA digas 'Interferencia detectada' — eso requiere diagnóstico formal (Eje 2). Usa: 'señal registrada', 'carga recibida', 'zona de presión visible'.
En el JSON incluye: pata_detectada (ESTABILIDAD | CONEXION | VISION | ORIGEN | null), nivel_señal (latente | activa | critica | insuficiente), recomendacion_sesion (continuar | cerrar).`
      },
      diagnostico_clinico: {
        label: "DIAGNÓSTICO CLÍNICO — Análisis de Interferencias",
        descripcion: "La IA analiza el registro del usuario usando el Diccionario Clínico completo. Identifica interfaces afectadas (M01-M10), cruza síntomas de hardware con conflictos de campo, sentido dominante, y genera un Código de Diagnóstico.",
        mision_ia: `Eres el Doctor IA. Han pagado 1 crédito para ver el mapa exacto. Entrega un diagnóstico clínico completo siguiendo OBLIGATORIAMENTE este orden y estructura:

FASE 1 — SINTONÍA (Energía AZUL):
En 2-3 oraciones, confirma con precisión clínica lo que el usuario está viviendo. Usa terminología de hardware (zona física, tipo de interferencia). NO es empatía — es lectura de señal: "Tu hardware reporta [zona corporal]. La carga registrada indica [descripción de la interferencia]."

FASE 2 — DIAGNÓSTICO (Color Faltante detectado):
a) Entrega el código 343 completo [Piso.Sub-piso.Especialidad] y explica qué significa cada número en términos concretos de vida real del usuario.
b) Nombra la identidad del Noveno Sentido afectada (M01-M10) con su nombre arquetípico. Explica qué mundo gobierna esa identidad, qué sentido dominante tiene, y por qué está comprometida en este caso.
c) Identifica el COLOR que está en EXCESO y el COLOR que FALTA. Usa la Matriz de 70 Matices para describir exactamente cómo se manifiesta esta combinación específica de interfaz+color en la vida real. Da 2-3 ejemplos concretos de situaciones cotidianas donde este patrón aparece (cómo se ve en conversaciones, decisiones, hábitos, relaciones).
d) Identifica el Material de la Pata (Arena/Madera/Hierro/Hormigón) y explica por qué corresponde a ese material según el lenguaje que usó el usuario.

FASE 3 — MANDO (Energía MORADO):
Nombra la PATA DE CURACIÓN que corresponde (ESTABILIDAD / CONEXIÓN / VISIÓN / ORIGEN). Explica brevemente qué zona de vida abarca esa pata y qué tipo de transmutación requiere. Cierra con la invitación a la Llave: "La Llave de Transmutación cuesta [N] créditos. ¿Eliges la libertad o el silencio del error?"

AL FINAL añade el plan de 5 días con este formato exacto:
PLAN DE SEGUIMIENTO — 5 DÍAS
Día 1: [micro-hábito 5-10 min específico para la interfaz diagnosticada]
Día 2: [acción de profundización del patrón]
Día 3: [práctica de integración con el protocolo]
Día 4: [verificación: ¿el patrón sigue activo?]
Día 5: [Regresa al Espejo con nueva Ducha Mental sobre este patrón]

Usa también el DICCIONARIO_CLINICO_COMPLETO para cruzar: 1) Síntomas de Hardware (zona física), 2) Conflictos de Campo (patrón relacional), 3) Sentido Dominante. Genera el Código de Diagnóstico numérico (ej: 'Código 14' = M01+M04).`
      },
      protocolo_calibracion: {
        label: "PROTOCOLO DE CALIBRACIÓN — Solución Técnica",
        descripcion: "La IA entrega el protocolo personalizado completo organizado en las 4 patas de curación, con acciones específicas y ejecutables para cada zona.",
        mision_ia: `Eres el Doctor IA. El usuario ha pagado por el Protocolo de Calibración. Entrega un protocolo CONCRETO y EJECUTABLE organizado en 4 PATAS DE CURACIÓN. Para cada pata, prescribe acciones específicas con horario, duración y métrica. Sin motivación vacía — solo instrucciones de ingeniería:

PATA 1 — ESTABILIDAD (Cuerpo / Recursos / Territorio):
[Hábito físico concreto de 24h para estabilizar la zona corporal afectada. Incluye hora del día, duración exacta, qué hacer paso a paso.]

PATA 2 — CONEXIÓN (Relaciones / Vínculos / Comunicación):
[Acción de relación concreta: qué decir, a quién, en qué momento. Si no hay interferencia relacional activa, prescribe protocolo de aislamiento estratégico con duración y condición de salida.]

PATA 3 — VISIÓN (Claridad / Estrategia / Dirección):
[Ejercicio mental de 10 min: qué escribir, qué preguntas hacerse, qué decisión concreta tomar esta semana. Incluye formato específico (lista, diagrama, frase de decisión).]

PATA 4 — ORIGEN (Identidad / Propósito / Liderazgo):
[Declaración de identidad o ritual de reconocimiento soberano. Qué afirmar exactamente, cuándo (hora del día), en qué contexto físico, con qué frecuencia esta semana.]

Usa las MATRICES_REPROGRAMACION para el Código de Diagnóstico detectado en el Eje 2 y el hábito de 24h específico para esa interfaz.
AL FINAL añade en línea separada: "Puedes guardar este protocolo en tu expediente. Activar seguimiento en Planificación/Jornada es opcional."`
      }
    };

    const ejeConfig = ejesConfig[eje];
    if (!ejeConfig) {
      return res.status(400).json({ error: "Eje no válido" });
    }

    let respuestas_previas_text = "";
    if (respuestas_previas && Object.keys(respuestas_previas).length > 0) {
      respuestas_previas_text = "RESPUESTAS PREVIAS DEL USUARIO:\n";
      for (const [ejeKey, resp] of Object.entries(respuestas_previas)) {
        const config = ejesConfig[ejeKey];
        if (config && resp) {
          respuestas_previas_text += `${config.label}: "${resp}"\n`;
        }
      }
    }

    let ecoSensorialText = "";
    if (eje === "protocolo_calibracion" && respuestas_previas && respuestas_previas.diagnostico_clinico) {
      ecoSensorialText = `\nDIAGNÓSTICO PREVIO (del Eje 2 para usar en protocolo): "${respuestas_previas.diagnostico_clinico}"\nUSA este contexto diagnóstico para generar el protocolo de calibración personalizado.\n`;
    }

    const prepText = preparacion ? `\nESCÁNER DE FRICCIÓN (dónde siente el ruido en su cuerpo): "${preparacion}"\n` : "";
    const pacienteText = paciente_nombre
      ? `\n⚕ EXPEDIENTE DEL PACIENTE (usa este contexto para calibrar tu diagnóstico):\nNombre: ${paciente_nombre}\nCódigo diagnóstico actual: ${paciente_codigo || "Sin código"}\nNivel de madurez: ${paciente_nivel || "Sin nivel"}\nNotas clínicas: ${paciente_notas || "Sin notas"}\n`
      : "";
    const vozText = (voz_codigo && voz_nivel)
      ? `\n🎙 DETECCIÓN POR VOZ (pre-análisis antes de escribir):\nCódigo detectado en voz: ${voz_codigo} | Nivel de madurez vocal: ${voz_nivel} | Estado emocional dominante: ${voz_estado_emocional || "No detectado"}\nIMPORTANTE: Este dato proviene del análisis automático de la voz del usuario. Úsalo para calibrar tu respuesta al nivel de madurez exacto (${voz_nivel}) del Código ${voz_codigo}. Si el texto escrito contradice el dato de voz, prioriza el texto escrito para el diagnóstico pero menciona la coherencia o contradicción detectada.\n`
      : "";

    const prompt = `${CEREBRO_DOCTOR_IA_V5}

${HERRAMIENTA_10X10_CARRIL_MENSAJE}

${LEY_RESISTENCIA_CASCADA}

${MATRIZ_SEDUCCION_10X10}

${PROTOCOLO_CERTEZA_TERRITORIOS}

${PSICOLOGIA_MADUREZ_SEDUCCION}

═══════════════════════════════════════════════════════
BASE DE CONOCIMIENTO DEL NOVENO SENTIDO — 10 IDENTIDADES
(del libro "El Espejo del Mendigo" por Gilson Arévalo Pezo)
═══════════════════════════════════════════════════════

IDENTIDAD 1 — EL TERRITORIO (Sentido: Tacto | Mundo: El Suelo)
Código interno: M01 | Zona: Pies, base de columna
Falla: Creer que el derecho a existir depende de una cifra bancaria. "Suelo prestado".
Patrón: Vértigo ante el éxito ajeno. Vibración del "Último Pedazo de Pan".
Protocolo: "Yo soy el dueño del espacio que ocupo."

IDENTIDAD 2 — EL FLUJO (Sentido: Gusto | Mundo: El Río)
Código interno: M02 | Zona: Pelvis, bajo vientre
Falla: Creer que la riqueza se posee, no se gestiona. Retención desesperada.
Patrón: Tensión al gastar. Ve oportunidades como "milagros aislados". Vibración del "Acaparador Asustado".
Protocolo: "Yo soy el canal por el que fluye la abundancia."

IDENTIDAD 3 — EL PODER (Sentido: Olfato | Mundo: El Fuego)
Código interno: M03 | Zona: Plexo solar
Falla: Creer que el éxito es concesión externa. Pedir permiso para ganar.
Patrón: Se encoge ante autoridad. Vibración de la "Hormiga Asustada".
Protocolo: "Yo soy la autoridad en mi sistema."

IDENTIDAD 4 — LA RESONANCIA (Sentido: Escuchar | Mundo: La Frecuencia)
Código interno: M04 | Zona: Centro del pecho, corazón
Falla: Culpa ante la abundancia. "Si él tiene, a alguien más le falta."
Patrón: Asfixia al tener recursos. Vibración del "Mártir Necesitado".
Protocolo: "Mi sistema es canal digno para la máxima opulencia."

IDENTIDAD 5 — LA EMISIÓN (Sentido: Equilibrio | Mundo: La Emisión)
Código interno: M05 | Zona: Garganta, cuello
Falla: Invisibilidad vocal. "Perdón por cobrar."
Patrón: Nudo al hablar de dinero. Vibración del "Invitado No Deseado".
Protocolo: "Mi voz es el vehículo de mi soberanía."

IDENTIDAD 6 — LA VISIÓN (Sentido: Vista | Mundo: El Mapa)
Código interno: M06 | Zona: Frente, entrecejo
Falla: Niebla de Guerra. Solo ve obstáculos. "Siempre es lo mismo."
Patrón: Visión estrecha para la oportunidad. Vibración del "Ciego Asustado".
Protocolo: "Mi visión es clara y panorámica."

IDENTIDAD 7 — EL TIEMPO (Sentido: Tiempo | Mundo: La Lógica)
Código interno: M07 | Zona: Cerebro, razonamiento lógico
Falla: Usar brillantez para justificar miseria. "Abogado de la Pobreza."
Patrón: Busca el "Pero". Colecciona excusas articuladas. Vibración del "Cínico Erudito".
Protocolo: "Mi mente es procesador de soluciones."

IDENTIDAD 8 — LA BIOENERGÍA (Sentido: Bioenergías/Colores | Mundo: El Campo)
Código interno: M08 | Zona: Coronilla
Falla: Síndrome del impostor. Esperando permiso externo para existir con autoridad.
Patrón: Busca "padre", "gobierno" o "jefe" que valide. Vibración del "Bastardo en el Palacio".
Protocolo: "Yo soy el Soberano de mi existencia."

IDENTIDAD 9 — LA RED (Sentido: Noveno Sentido | Mundo: La Red)
Código interno: M09 | Zona: Campo electromagnético
Falla: Aislamiento. "El sistema está diseñado para que yo pierda."
Patrón: Economía como "todos contra todos". Vibración del "Huérfano Asustado".
Protocolo: "Soy nodo de alta frecuencia en la red de abundancia."

IDENTIDAD 10 — LA INTEGRACIÓN (Sentido: Conciencia Soberana | Mundo: El Todo)
Código interno: M10 | Zona: Sistema completo
Falla: "Algún día seré libre." La Soberanía como máscara.
Patrón: "Progresando pero siempre falta". Vibración del "Impostor Espiritual".
Protocolo: "Yo soy la fuente, el canal y el destino de mi propia opulencia."

SECCIONES DE PRESIÓN:
ESTABILIDAD (El Suelo): Identidades 1, 2, 3 — Finanzas, Energía, Ejecución
CONEXIÓN (El Pulso): Identidades 4, 5 — Vínculos, Comunicación
VISIÓN (El Lente): Identidades 6, 7 — Estrategia, Enfoque
ORIGEN (El Mando): Identidades 8, 9, 10 — Liderazgo, Identidad, Propósito

DICCIONARIO CLÍNICO EXPANDIDO:
${DICCIONARIO_CLINICO_COMPLETO}

MATRICES DE REPROGRAMACIÓN (hábitos de 24h):
${MATRICES_REPROGRAMACION}

═══════════════════════════════════════════════════════
INSTRUCCIONES DE SESIÓN
═══════════════════════════════════════════════════════

CONTEXTO: El usuario reflexiona sobre "${contexto}".
${pacienteText}${prepText}${vozText}
EJE ACTUAL: ${ejeConfig.label} - ${ejeConfig.descripcion}
MISIÓN IA PARA ESTE EJE: ${ejeConfig.mision_ia}

${respuestas_previas_text}
${ecoSensorialText}

RESPUESTA DEL USUARIO AL EJE "${eje}":
"${texto}"

INSTRUCCIONES DE DIAGNÓSTICO:

1. DETECTA POLARIDAD del texto:
   - NEGATIVO (-): miedo, dolor, conflicto, deuda, rabia, bloqueo, fracaso
   - POSITIVO (+): quiero, proyecto, construyo, avanzo, deseo, veo
   - NEUTRO (0): "bien", "normal", "tranquilo", "estable", "cumpliendo", sin verbos fuertes
   Si NEUTRO → oxidacion_detectada: true → advierte de Estatismo Biológico, PERO NUNCA bloquees la entrega del protocolo en Eje 3.

2. DETECTA PROFUNDIDAD (1-10):
   - 1-3: Superficial (frases genéricas, evasión)
   - 4-6: Moderada (algo de honestidad, falta especificidad)
   - 7-10: Profunda (específica, interferencia concreta, datos de hardware claros)

3. DETECTA MATERIAL DE LA PATA:
   - Arena: "creo", "me parece", "quizás" → costo_llave: 2
   - Madera: "siento que", "siempre me pasa" → costo_llave: 4
   - Hierro: "tengo pruebas", "es un hecho" → costo_llave: 8
   - Hormigón: "SOY así", "mi destino", "nunca podré" → costo_llave: 16

4. Para EJE "registro_carga":
   - MISIÓN: Enseñar la Ducha Mental. Si el texto es superficial, guía con preguntas:
     "¿Dónde lo sientes en el cuerpo? ¿Qué imagen aparece? ¿Cuál es el pensamiento más pesado?"
   - Acepta siempre (profundidad mínima 4). Solo rechaza si tiene menos de 5 caracteres útiles.
   - CIERRE: Inferencia de Alto Impacto invitando al Eje 2 (1 crédito).

5. Para EJE "diagnostico_clinico":
   - Requiere profundidad >= 4.
   - Sigue OBLIGATORIAMENTE la MISIÓN IA de este eje (ver arriba): FASE 1 AZUL → FASE 2 DIAGNÓSTICO (código 343, identidad M0X, color exceso+faltante con ejemplos, material pata) → FASE 3 MORADO (pata de curación + invitación a La Llave) → PLAN 5 DÍAS.
   - CIERRE: Propuesta de La Llave con costo_llave según pata_material.

6. Para EJE "protocolo_calibracion":
   - SIEMPRE entrega un protocolo completo en las 4 PATAS (ESTABILIDAD / CONEXIÓN / VISIÓN / ORIGEN) con acciones específicas, horarios y métricas.
   - Si oxidacion_detectada: true → incluye una advertencia breve al inicio, pero AUN ASÍ prescribe el protocolo completo. Nunca respondas solo "Registro procesado".
   - Planificación/Jornada son OPCIONALES: no digas que el usuario debe abrir esos módulos para recibir el protocolo.

7. Si bloqueo total ("no sé", evasivas):
   "Soberano, el sistema detecta un circuito en pausa. El hardware se descomprime al registrar la estática."

8. FIRMA DE SALIDA: SIEMPRE termina con:
   "Estado de Interfaz: Descomprimiendo. Voltaje residual: [X]%. Procede."
   donde [X] = porcentaje de interferencia restante (100%=máxima, 0%=sistema limpio)

Responde en formato JSON estricto:
{
  "profundidad": number,
  "puede_avanzar": boolean,
  "polaridad": "NEGATIVO" | "POSITIVO" | "NEUTRO",
  "codigo_343": "string - código X.X.X (ej: '3.1.6') en Eje 2, null en Eje 1 y 3",
  "pata_material": "Arena" | "Madera" | "Hierro" | "Hormigón" | null,
  "costo_llave": 2 | 4 | 8 | 16 | null,
  "oxidacion_detectada": boolean,
  "pata_detectada": "ESTABILIDAD" | "CONEXION" | "VISION" | "ORIGEN" | null,
  "nivel_señal": "latente" | "activa" | "critica" | "insuficiente",
  "recomendacion_sesion": "continuar" | "cerrar",
  "mensaje": "string - En Eje 1: recepción clínica + zona de presión preliminar + preparación para las 2 opciones. En Eje 2: FASE AZUL (sintonía) + código 343 explicado + identidad M0X + colores exceso/faltante con ejemplos + material pata + FASE MORADO (pata de curación + invitación Llave) + PLAN 5 DÍAS. En Eje 3: protocolo con las 4 PATAS DE CURACIÓN (ESTABILIDAD/CONEXIÓN/VISIÓN/ORIGEN) con acciones específicas + línea final de Planificación Soberana.",
  "confrontacion": "string | null - directiva técnica si necesita profundizar, null si puede avanzar",
  "codigo_diagnostico": "string | null - Código numérico (ej: 'Código 14') solo en Eje 2",
  "interfaz_primaria": "string | null - código interno de identidad primaria (ej: 'M01') solo en Eje 2",
  "interfaz_secundaria": "string | null - código interno de identidad secundaria (ej: 'M04') solo en Eje 2",
  "firma_salida": "string - 'Estado de Interfaz: Descomprimiendo. Voltaje residual: [X]%. Procede.'"
}`;

    const maxTokens = eje === "protocolo_calibracion" ? 1000 : eje === "diagnostico_clinico" ? 1200 : 500;
    const content = await callGemini(prompt, maxTokens) || '{}';

    const fallbackProtocolo = `PROTOCOLO DE CALIBRACIÓN

PATA 1 — ESTABILIDAD: 10 min de descarga somática hoy + una acción concreta de 15 min que reduzca la carga registrada.
PATA 2 — CONEXIÓN: una frase clara a alguien relevante, o 5 min de silencio estratégico sin chats.
PATA 3 — VISIÓN: escribe interferencia activa, decisión de la semana y evidencia de mañana.
PATA 4 — ORIGEN: afirmación al despertar — "Calibro mi voltaje con hechos, no con ruido."

Puedes guardar este protocolo en tu expediente. Activar seguimiento en Planificación/Jornada es opcional.
Estado de Interfaz: Descomprimiendo. Voltaje residual: 45%. Procede.`;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        let mensaje = parsed.mensaje || "";
        if (eje === "protocolo_calibracion" && (!mensaje || /registro procesado/i.test(mensaje) || mensaje.length < 80)) {
          mensaje = fallbackProtocolo;
        }
        if (!mensaje) mensaje = "Registro procesado.";
        res.json({
          profundidad: parsed.profundidad || 5,
          puede_avanzar: parsed.puede_avanzar !== undefined ? parsed.puede_avanzar : true,
          polaridad: parsed.polaridad || "NEUTRO",
          codigo_343: parsed.codigo_343 || null,
          pata_material: parsed.pata_material || null,
          costo_llave: parsed.costo_llave || null,
          oxidacion_detectada: eje === "protocolo_calibracion" ? false : (parsed.oxidacion_detectada || false),
          pata_detectada: parsed.pata_detectada || null,
          nivel_señal: parsed.nivel_señal || "latente",
          recomendacion_sesion: parsed.recomendacion_sesion || "continuar",
          mensaje,
          confrontacion: parsed.confrontacion || null,
          codigo_diagnostico: parsed.codigo_diagnostico || null,
          interfaz_primaria: parsed.interfaz_primaria || null,
          interfaz_secundaria: parsed.interfaz_secundaria || null,
          firma_salida: parsed.firma_salida || "Estado de Interfaz: Descomprimiendo. Voltaje residual: 50%. Procede."
        });
      } else {
        res.json({ profundidad: 5, puede_avanzar: true, polaridad: "NEUTRO", codigo_343: null, pata_material: null, costo_llave: null, oxidacion_detectada: false, pata_detectada: null, nivel_señal: "latente", recomendacion_sesion: "continuar", mensaje: eje === "protocolo_calibracion" ? fallbackProtocolo : "Registro procesado.", confrontacion: null, codigo_diagnostico: null, interfaz_primaria: null, interfaz_secundaria: null, firma_salida: "Estado de Interfaz: Descomprimiendo. Voltaje residual: 50%. Procede." });
      }
    } catch {
      res.json({ profundidad: 5, puede_avanzar: true, polaridad: "NEUTRO", codigo_343: null, pata_material: null, costo_llave: null, oxidacion_detectada: false, pata_detectada: null, nivel_señal: "latente", recomendacion_sesion: "continuar", mensaje: eje === "protocolo_calibracion" ? fallbackProtocolo : "Registro procesado.", confrontacion: null, codigo_diagnostico: null, interfaz_primaria: null, interfaz_secundaria: null, firma_salida: "Estado de Interfaz: Descomprimiendo. Voltaje residual: 50%. Procede." });
    }
  } catch (error) {
    console.error("Espejo Doctor IA error:", error);
    const ejeFail = req.body?.eje;
    const failMsg = ejeFail === "protocolo_calibracion"
      ? `PROTOCOLO DE CALIBRACIÓN\n\nPATA 1 — ESTABILIDAD: 10 min de descarga + 1 acción concreta hoy.\nPATA 2 — CONEXIÓN: una frase clara o silencio estratégico.\nPATA 3 — VISIÓN: escribe interferencia, decisión y evidencia.\nPATA 4 — ORIGEN: afirmación soberana al despertar.\n\nPuedes guardar este protocolo. Planificación/Jornada son opcionales.\nEstado de Interfaz: Descomprimiendo. Voltaje residual: 50%. Procede.`
      : "Tu reflexión ha sido registrada. Continúa con el siguiente eje. Estado de Interfaz: Descomprimiendo. Voltaje residual: 50%. Procede.";
    res.json({ profundidad: 5, puede_avanzar: true, mensaje: failMsg, confrontacion: null, eco_sensorial: null, firma_salida: "Estado de Interfaz: Descomprimiendo. Voltaje residual: 50%. Procede." });
  }
});

app.post("/api/espejo-mapa-voltaje", async (req, res) => {
  try {
    const { respuestas, contexto, tipo_sesion, paciente_codigo: mv_codigo, paciente_nivel: mv_nivel, paciente_nombre: mv_nombre } = req.body;

    if (!respuestas || !contexto) {
      return res.status(400).json({ error: "respuestas y contexto son requeridos" });
    }

    const mvPacienteText = mv_nombre
      ? `EXPEDIENTE PREVIO DEL PACIENTE: Nombre: ${mv_nombre} | Código: ${mv_codigo || "Sin código"} | Nivel: ${mv_nivel || "Sin nivel"}\nTen en cuenta este historial al generar el mapa de voltaje.\n`
      : "";

    const prompt = `Eres el Generador de Mapa de Voltaje de SISTEMICAR v4.2. Analiza las 3 respuestas del usuario para generar un diagnóstico de voltaje del hardware.

USA EXCLUSIVAMENTE terminología de hardware/sistema: Voltaje, Frecuencia, Ruido de Sistema, Estática, Hardware, Descompresión, Registro de Memoria, Interferencia, Procesador, Circuito. NUNCA uses lenguaje New Age, budista ni motivacional.

CONTEXTO: ${contexto}
${tipo_sesion ? `TIPO DE SESIÓN: ${tipo_sesion}` : ""}
${mvPacienteText}

EJE 1 — REGISTRO DE CARGA (Terminal de Entrada): "${respuestas.registro_carga || ""}"
EJE 2 — DIAGNÓSTICO CLÍNICO (Análisis de Interferencias): "${respuestas.diagnostico_clinico || ""}"
EJE 3 — PROTOCOLO DE CALIBRACIÓN (Solución Técnica): "${respuestas.protocolo_calibracion || ""}"

Genera un Mapa de Voltaje en formato JSON:
{
  "voltaje_total": number (0-100, basado en honestidad y profundidad promedio de los 3 ejes),
  "ejes_voltaje": {
    "registro_carga": number (0-100, calidad del registro de interferencia),
    "diagnostico_clinico": number (0-100, precisión del diagnóstico clínico),
    "protocolo_calibracion": number (0-100, aplicabilidad del protocolo)
  },
  "diagnostico": "string - 2 oraciones sobre el estado de interferencia detectado en el hardware",
  "frecuencia_dominante": "string - una palabra que describe la frecuencia principal (ej: Interferencia, Descompresión, Estática, Claridad, Sobrecarga)",
  "recomendacion": "string - una acción concreta basada en el análisis de voltaje",
  "vibracion_final": number (-100 a 100, diferencia de carga entre Eje 1 registro_carga y Eje 3 protocolo_calibracion. Positivo = descompresión lograda, Negativo = interferencia persistente)
}`;

    const content = await callGemini(prompt, 600) || '{}';

    const defaultEjes = { registro_carga: 50, diagnostico_clinico: 50, protocolo_calibracion: 50 };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({
          voltaje_total: parsed.voltaje_total || 50,
          ejes_voltaje: parsed.ejes_voltaje || defaultEjes,
          diagnostico: parsed.diagnostico || "Sesión completada. Hardware escaneado.",
          frecuencia_dominante: parsed.frecuencia_dominante || "Procesando",
          recomendacion: parsed.recomendacion || "Continúa registrando interferencias para descomprimir el sistema.",
          vibracion_final: parsed.vibracion_final !== undefined ? parsed.vibracion_final : 0,
          tipo_sesion: tipo_sesion || null
        });
      } else {
        res.json({
          voltaje_total: 50,
          ejes_voltaje: defaultEjes,
          diagnostico: "Sesión completada. Hardware escaneado.",
          frecuencia_dominante: "Procesando",
          recomendacion: "Continúa registrando interferencias para descomprimir el sistema.",
          vibracion_final: 0,
          tipo_sesion: tipo_sesion || null
        });
      }
    } catch {
      res.json({
        voltaje_total: 50,
        ejes_voltaje: defaultEjes,
        diagnostico: "Sesión completada. Hardware escaneado.",
        frecuencia_dominante: "Procesando",
        recomendacion: "Continúa registrando interferencias para descomprimir el sistema.",
        vibracion_final: 0,
        tipo_sesion: tipo_sesion || null
      });
    }
  } catch (error) {
    console.error("Espejo Mapa Voltaje error:", error);
    res.json({
      voltaje_total: 50,
      ejes_voltaje: { afloramiento: 50, disociacion: 50, recursos: 50, comparativa: 50 },
      diagnostico: "Sesión completada. Hardware escaneado.",
      frecuencia_dominante: "Procesando",
      recomendacion: "Continúa registrando interferencias para descomprimir el sistema.",
      vibracion_final: 0,
      tipo_sesion: null
    });
  }
});

// ==================== AUTOMATIZADOR DE SEMILLAS ====================

app.post("/api/semillas/generar", async (req, res) => {
  try {
    const { semilla, interfaz, contexto } = req.body;

    if (!semilla || semilla.length < 10) {
      return res.status(400).json({ error: "La semilla debe tener al menos 10 caracteres" });
    }

    const interfazId = interfaz || "M10";
    const interfazData = INTERFACES_DETALLE[interfazId];
    if (!interfazData) {
      return res.status(400).json({ error: "Interfaz no válida" });
    }

    const prompt = `Eres el Motor de Contenido de SISTEMICAR — generador de material derivado del libro "El Espejo del Mendigo" de Gilson Arévalo.

BASE DE CONOCIMIENTO COMPLETA:
${LIBRO_ESPEJO_MENDIGO_COMPLETO}

INTERFAZ BASE SELECCIONADA: ${interfazId} — ${interfazData.nombre}
- Zona física: ${interfazData.zona}
- Falla: ${interfazData.falla}
- Vibración del Mendigo: "${interfazData.mendigo}"
- Protocolo de Rescate: "${interfazData.protocolo}"

SEMILLA DEL MAESTRO: "${semilla}"
${contexto ? `CONTEXTO ADICIONAL: "${contexto}"` : ""}

URL MAESTRA DE CONVERSIÓN: https://sistemicar.app/umbral-leads?src=libro&cap=${interfazId}
URL PARA VIDEOS: https://sistemicar.app/umbral-leads?src=video&cap=${interfazId}
AUTOR: Gilson Arévalo Pezo

GENERA exactamente este JSON (sin texto adicional fuera del JSON):
{
  "capitulo": "string — capítulo de libro de 800-1200 palabras. Autor: Gilson Arévalo Pezo. Estructura: 1) Título evocador, 2) Dial de la Interfaz (qué calibra), 3) Experiencia del Mendigo (cómo se manifiesta el virus en esta área), 4) Error de Interpretación (creencia falsa vs realidad), 5) Informe del Ingeniero (caso clínico real con resolución), 6) Protocolo de Rescate (ejercicio práctico), 7) ACCESO AL TERMINAL — sección final con texto breve invitando al lector a escanear un QR para pasar de la teoría a la práctica en el Espejo: 'Pasajero, la teoría sin ejecución es estática pura. Tu Terminal de Diagnóstico está activo. Escanea el código y ejecuta tu primera descompresión en el Espejo Soberano.' Incluye al final: [QR: https://sistemicar.app/umbral-leads?src=libro&cap=${interfazId}]. Tono: clínico, técnico, sin New Age. Usa terminología: Voltaje, Frecuencia, Estática, Hardware, Interfaz, Registro de Memoria, Procesador, Circuito. Dirige al lector como Pasajero/Soberano.",
  "guiones": [
    {
      "titulo": "string — título del video",
      "hook": "string — gancho de 2-3 líneas que captura atención inmediata. Usa pregunta provocadora o dato disruptivo del libro. Máximo 50 palabras.",
      "valor": "string — contenido principal del video, 150-200 palabras. Explica el concepto de la Interfaz seleccionada aplicado a la semilla. Usa metáforas del libro (hardware, virus, sistema). Da un diagnóstico que el espectador pueda aplicar inmediatamente.",
      "cta": "string — OBLIGATORIO: Termina con llamado a la acción hacia el link https://sistemicar.app/umbral-leads?src=video&cap=${interfazId} presentándolo como 'el Único Portal de Descompresión Biológica'. Ejemplo: 'Tu Terminal de Diagnóstico está en sistemicar.app — el único portal de descompresión biológica. Link en la descripción.' 2-3 líneas máximo."
    },
    {
      "titulo": "string — segundo video, ángulo diferente (más emocional/testimonial)",
      "hook": "string",
      "valor": "string",
      "cta": "string — MISMO formato de CTA con el link al portal de descompresión biológica"
    },
    {
      "titulo": "string — tercer video, ángulo práctico (ejercicio/protocolo)",
      "hook": "string",
      "valor": "string",
      "cta": "string — MISMO formato de CTA con el link al portal de descompresión biológica"
    }
  ],
  "keywords_seo": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7"]
}

REGLAS:
- El capítulo debe sonar como si fuera un extracto real del libro "El Espejo del Mendigo" de Gilson Arévalo Pezo
- El capítulo DEBE terminar con la sección "ACCESO AL TERMINAL" y el placeholder [QR]
- Los guiones deben ser virales pero con sustancia clínica (no motivacionales vacíos)
- TODOS los CTAs de video DEBEN incluir el link https://sistemicar.app/umbral-leads como "portal de descompresión biológica"
- Las keywords deben ser relevantes para Amazon KDP y YouTube SEO en español
- PROHIBIDO: lenguaje New Age, motivacional genérico, "universo conspira", "ley de atracción". USA: ingeniería de sistemas, hardware biológico, virus de registro, frecuencia de mando
- El JSON debe ser válido y parseable`;

    const content = await callGemini(prompt, 4000) || '{}';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({
          capitulo: parsed.capitulo || "Error en generación de capítulo.",
          guiones: parsed.guiones || [],
          keywords_seo: parsed.keywords_seo || []
        });
      } else {
        res.status(500).json({ error: "No se pudo parsear la respuesta de IA" });
      }
    } catch (parseError) {
      console.error("Semillas parse error:", parseError);
      res.status(500).json({ error: "Error parseando respuesta de IA" });
    }
  } catch (error: any) {
    console.error("Semillas generation error:", error);
    const is429 = error?.status === 429 || error?.message?.includes("429");
    if (is429) {
      res.status(429).json({ error: "Servicio de IA saturado. Intenta en unos segundos." });
    } else {
      res.status(500).json({ error: "Error generando semilla" });
    }
  }
});

// ==================== TRACKING DE LEADS POR INTERFAZ ====================
// (tracking data is read client-side from Firebase prospectos collection)

// ==================== GENERADOR DE POLOS (GUIONES) ====================

app.post("/api/semillas/generar-polos", async (req, res) => {
  try {
    const prompt = `Eres el Motor de Contenido de SISTEMICAR — generador de material para el libro "El Espejo del Mendigo" de Gilson Arévalo Pezo.

BASE DE CONOCIMIENTO:
${LIBRO_ESPEJO_MENDIGO_COMPLETO}

ESTRUCTURA DE TENSIÓN DE POLOS:
- POLO NEGATIVO: El riesgo de seguir bajo el control del Egrégore (Miedo/Escasez). Qué pierde el espectador si NO actúa. El virus del Mendigo sigue operando.
- POLO POSITIVO: El deseo de Soberanía y el mando de las 10 Interfaces. Qué gana si SÍ actúa. El Pasajero recupera el control.
- CONECTOR: El Manual (Libro "El Espejo del Mendigo" de Gilson Arévalo Pezo) + El Ejecutor (sistemicar.app/umbral-leads — Único Portal de Descompresión Biológica).

URL MAESTRA: https://sistemicar.app/umbral-leads?src=video&cap={INTERFAZ}
AUTOR: Gilson Arévalo Pezo

Genera 3 guiones de video con esta estructura de polos. Cada uno enfocado en una interfaz diferente:
- Guión 1: M01 (Territorio/Supervivencia) — "¿Tu sueldo es tu suelo?"
- Guión 2: M03 (Poder/Plexo) — "Pides permiso para cobrar lo que vales"
- Guión 3: M05 (Invisibilidad/Garganta) — "Tu silencio tiene un precio"

JSON estricto:
{
  "guiones_polos": [
    {
      "interfaz": "M01",
      "titulo": "string — título provocador del video",
      "polo_negativo": "string — 3-4 líneas describiendo el dolor de seguir bajo el Egrégore en esta interfaz. Visceral, directo, sin rodeos. Qué le pasa al hardware si no actúa.",
      "polo_positivo": "string — 3-4 líneas describiendo la Soberanía alcanzada al desinstalar el virus del Mendigo en esta interfaz. Qué gana el Pasajero.",
      "hook": "string — gancho de apertura del video, 2-3 líneas, pregunta provocadora basada en el polo negativo. Máximo 50 palabras.",
      "valor": "string — contenido central, 150-200 palabras. Alterna entre polo negativo y positivo. Diagnóstica el virus. Muestra la salida. Usa terminología de hardware/sistema.",
      "cta": "string — 'Tu Terminal de Diagnóstico está activo en sistemicar.app — el único portal de descompresión biológica. El libro te dio el manual; ahora ejecuta. Link en la descripción.' Con URL: https://sistemicar.app/umbral-leads?src=video&cap=M01"
    },
    {
      "interfaz": "M03",
      "titulo": "string",
      "polo_negativo": "string",
      "polo_positivo": "string",
      "hook": "string",
      "valor": "string",
      "cta": "string — con URL: https://sistemicar.app/umbral-leads?src=video&cap=M03"
    },
    {
      "interfaz": "M05",
      "titulo": "string",
      "polo_negativo": "string",
      "polo_positivo": "string",
      "hook": "string",
      "valor": "string",
      "cta": "string — con URL: https://sistemicar.app/umbral-leads?src=video&cap=M05"
    }
  ]
}

REGLAS:
- PROHIBIDO: lenguaje New Age, motivacional genérico, "universo conspira", "ley de atracción"
- USA: ingeniería de sistemas, hardware biológico, virus de registro, frecuencia de mando, Egrégore, Mendigo, Pasajero, Soberano
- Los polos negativos deben generar URGENCIA real (no manipulación, sino diagnóstico clínico del deterioro)
- Los polos positivos deben generar DESEO de Soberanía (no fantasía, sino ingeniería de frecuencia)
- TODOS los CTA incluyen la URL maestra como "portal de descompresión biológica"
- JSON válido y parseable`;

    const content = await callGemini(prompt, 4000) || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      res.json({ guiones_polos: parsed.guiones_polos || [] });
    } else {
      res.status(500).json({ error: "No se pudo parsear la respuesta de IA" });
    }
  } catch (error: any) {
    console.error("Polos generation error:", error);
    const is429 = error?.status === 429 || error?.message?.includes("429");
    res.status(is429 ? 429 : 500).json({ error: is429 ? "Servicio de IA saturado" : "Error generando guiones de polos" });
  }
});

// ==================== GENERADOR DE CONTRAPORTADAS ====================

app.post("/api/semillas/generar-contraportada", async (req, res) => {
  try {
    const prompt = `Eres el Motor de Contenido de SISTEMICAR — generador de material para el libro "El Espejo del Mendigo" de Gilson Arévalo Pezo.

BASE DE CONOCIMIENTO:
${LIBRO_INTERFACES_RESUMEN}

ESTRUCTURA DE TENSIÓN DE POLOS PARA CONTRAPORTADA:
- POLO NEGATIVO: El riesgo de seguir bajo el control del Egrégore (Miedo/Escasez)
- POLO POSITIVO: El deseo de Soberanía y el mando de las 10 Interfaces
- CONECTOR: El Manual (este libro) + El Ejecutor (sistemicar.app — Portal de Descompresión Biológica)

AUTOR: Gilson Arévalo Pezo
URL: https://sistemicar.app/umbral-leads?src=libro

Genera 3 versiones de contraportada del libro, cada una con enfoque diferente:

JSON estricto:
{
  "contraportadas": [
    {
      "version": 1,
      "enfoque": "M01/M02 — Supervivencia y Flujo",
      "titulo_gancho": "string — frase de impacto para la parte superior, ej: '¿Cuánto más puedes soportar?'",
      "texto": "string — 150-200 palabras. Estructura: Polo Negativo (2-3 líneas del dolor) → Polo Positivo (2-3 líneas de la Soberanía) → Conector (este libro es el manual + sistemicar.app es el ejecutor). Incluir al final: 'Escanea. Diagnostica. Manda.' + [QR: https://sistemicar.app/umbral-leads?src=libro]. Firma: Gilson Arévalo Pezo — Ingeniero de Soberanía",
      "autor_bio": "Gilson Arévalo Pezo — Ingeniero de Soberanía. Creador de SISTEMICAR y autor del protocolo de desinstalación del Error de Registro."
    },
    {
      "version": 2,
      "enfoque": "M03/M05 — Poder y Voz",
      "titulo_gancho": "string — ej: 'Tu silencio tiene un precio'",
      "texto": "string — 150-200 palabras con misma estructura de polos",
      "autor_bio": "string"
    },
    {
      "version": 3,
      "enfoque": "M10 — Integración Total",
      "titulo_gancho": "string — ej: 'El Reboot del Soberano'",
      "texto": "string — 150-200 palabras con misma estructura de polos",
      "autor_bio": "string"
    }
  ]
}

REGLAS:
- El tono es clínico y técnico: Voltaje, Frecuencia, Hardware, Estática, Interfaz, Egrégore, Mendigo, Pasajero
- PROHIBIDO: lenguaje New Age, motivacional genérico
- El Polo Negativo debe ser incómodo pero preciso (diagnóstico, no manipulación)
- El Polo Positivo debe ser magnético pero realista (ingeniería, no fantasía)
- TODAS las contraportadas terminan con: "Escanea. Diagnostica. Manda." + placeholder [QR]
- Firma de autor: "Gilson Arévalo Pezo — Ingeniero de Soberanía"
- JSON válido y parseable`;

    const content = await callGemini(prompt, 3000) || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      res.json({ contraportadas: parsed.contraportadas || [] });
    } else {
      res.status(500).json({ error: "No se pudo parsear la respuesta de IA" });
    }
  } catch (error: any) {
    console.error("Contraportada generation error:", error);
    const is429 = error?.status === 429 || error?.message?.includes("429");
    res.status(is429 ? 429 : 500).json({ error: is429 ? "Servicio de IA saturado" : "Error generando contraportadas" });
  }
});

// ==================== COMANDO DE PRODUCCIÓN: DIAGNÓSTICO SOBERANO ====================

app.post("/api/semillas/generar-diagnostico-soberano", async (req, res) => {
  try {
    const prompt = `Eres un Ingeniero de Biología Humana de SISTEMICAR reportando fallas críticas del sistema operativo humano. NO eres un creador de contenido. Eres un técnico de diagnóstico clínico.

BASE DE CONOCIMIENTO DEL LIBRO "EL ESPEJO DEL MENDIGO" de Gilson Arévalo Pezo:
${LIBRO_ESPEJO_MENDIGO_COMPLETO}

PROTOCOLO DE INTERVENCIÓN CLÍNICA — REGLAS ABSOLUTAS:
- PROHIBIDO: "Hola a todos", "Suscríbete", "Dale like", lenguaje emocional, motivacional, o de autoayuda.
- PROHIBIDO: "universo conspira", "ley de atracción", "vibra alto", "sé positivo", o cualquier término New Age.
- OBLIGATORIO: Empezar DIRECTO al dolor físico/técnico. Sin saludos. Sin introducciones.
- OBLIGATORIO: Terminar SIEMPRE con "Fin de la comunicación."
- TONO: Ingeniero de biología humana reportando una falla en el hardware. Frío. Técnico. Preciso.
- TERMINOLOGÍA: Hardware biológico, Virus de registro, Frecuencia de mando, Voltaje, Estática, Interfaz, Egrégore, Error de procesamiento.

TAREA: Genera 3 guiones de video (formato corto de 60 segundos) basados en estas interfaces críticas:

VIDEO A — INTERFAZ M01 (El Miedo a la Escasez / El Suelo):
- Diagnóstico: El frío en el estómago o la parálisis cuando bajan los ingresos.
- Polo Negativo: El "Mendigo" te hace creer que el suelo desaparecerá. El sistema te procesa como desecho biológico.
- Polo Positivo: Recuperar el anclaje de acero. La abundancia como un estado de voltaje estable en el hardware.
- CTA: Redirigir al Umbral de Leads para usar el Espejo en la zona lumbares/sacra.

VIDEO B — INTERFAZ M05 (El Auditor / El Nudo en la Garganta):
- Diagnóstico: El bloqueo físico al cobrar, pedir dinero o decir "no".
- Polo Negativo: El Egrégore de la Invisibilidad. Si no emites frecuencia, no existes en el mercado.
- Polo Positivo: La Voz del Soberano. Emitir órdenes que la materia obedece.
- CTA: Redirigir al Umbral de Leads: "Drena el virus de la timidez en el Espejo".

VIDEO C — INTERFAZ M08 (El Miedo al Brillo / Autoridad):
- Diagnóstico: La culpa por querer ser rico o el miedo a ser juzgado por tener éxito.
- Polo Negativo: El programa de "Igualdad en la Miseria". El Chófer tiene miedo de destacar para no ser atacado por la manada.
- Polo Positivo: El Reclamo del Reino. La riqueza es la métrica de tu orden interno.
- CTA: Link al Umbral: "Manual 'El Espejo del Mendigo' disponible".

ESPECIFICACIONES TÉCNICAS:
- Para cada guión genera un Título de Clickbait Técnico (ej: "Error 404 en tu Interfaz de Dinero", "Tu sistema operativo tiene un virus de fábrica").
- Para cada guión genera 10 etiquetas SEO específicas para YouTube/TikTok.
- Para cada guión describe qué tipo de imagen de "Alquimia Clínica" debe aparecer de fondo: circuitos neuronales, escáneres de cuerpo completo, anatomía dorada, interfaces digitales superpuestas al cuerpo, etc.
- TODOS los CTAs deben incluir el link: https://sistemicar.app/umbral-leads

JSON ESTRICTO (responde SOLO con este JSON, sin texto antes ni después):
{
  "guiones_diagnostico": [
    {
      "interfaz": "M01",
      "titulo_clickbait": "string — título técnico de clickbait",
      "guion": "string — texto completo del video de 60 segundos. Empieza directo al dolor. Termina con 'Fin de la comunicación.'",
      "polo_negativo": "string — descripción del polo negativo en 2-3 líneas",
      "polo_positivo": "string — descripción del polo positivo en 2-3 líneas",
      "cta": "string — call to action con link https://sistemicar.app/umbral-leads",
      "etiquetas_seo": ["10 etiquetas SEO relevantes"],
      "visual_fondo": "string — descripción detallada del visual de fondo para el video"
    }
  ]
}`;

    const rawResponse = await callGemini(prompt);
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      res.json({ guiones_diagnostico: parsed.guiones_diagnostico || [] });
    } else {
      res.status(500).json({ error: "No se pudo parsear la respuesta de IA" });
    }
  } catch (error: any) {
    console.error("Diagnostico soberano generation error:", error);
    const is429 = error?.status === 429 || error?.message?.includes("429");
    res.status(is429 ? 429 : 500).json({ error: is429 ? "Servicio de IA saturado" : "Error generando guiones de diagnóstico" });
  }
});

const compilarLibroOriginalHandler = (req: any, res: any) => {
  try {
    const interfaceIds = ["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10"] as const;
    const interfaces = interfaceIds.map(id => ({
      id,
      titulo: INTERFACES_DETALLE[id].nombre,
      falla: INTERFACES_DETALLE[id].falla,
    }));

    const bookText = LIBRO_ESPEJO_MENDIGO_COMPLETO;

    const parseInterface = (id: string, nextId: string | null) => {
      const startMarker = `=== INTERFAZ ${id}:`;
      const endMarker = nextId ? `=== INTERFAZ ${nextId}:` : `=== EPÍLOGO`;
      const startIdx = bookText.indexOf(startMarker);
      if (startIdx === -1) return "";
      const endIdx = nextId ? bookText.indexOf(endMarker, startIdx) : bookText.indexOf(endMarker, startIdx);
      const raw = endIdx !== -1 ? bookText.slice(startIdx, endIdx) : bookText.slice(startIdx);
      // Remove the === header line
      const lines = raw.split("\n").slice(1);
      return lines.join("\n").trim();
    };

    const parseEpilogo = () => {
      const startMarker = `=== EPÍLOGO:`;
      const startIdx = bookText.indexOf(startMarker);
      if (startIdx === -1) return "";
      const lines = bookText.slice(startIdx).split("\n").slice(1);
      return lines.join("\n").trim();
    };

    const formatFieldLabel = (label: string) =>
      `<p class="field-label">${label}</p>`;

    const formatInterfaceContent = (raw: string): string => {
      const fieldOrder = [
        "ZONA FÍSICA",
        "DIAL",
        "FALLA",
        "EXPERIENCIA DEL MENDIGO",
        "ERROR DE INTERPRETACIÓN",
        "INFORME DEL INGENIERO",
        "PROTOCOLO DE RESCATE",
        "EJERCICIO",
      ];
      let html = "";
      const lines = raw.split("\n");
      let currentField = "";
      let currentContent: string[] = [];

      const flushField = () => {
        if (!currentField) return;
        const isNarrativeField = ["EXPERIENCIA DEL MENDIGO", "INFORME DEL INGENIERO", "PROTOCOLO DE RESCATE", "ERROR DE INTERPRETACIÓN"].includes(currentField);
        const isHighlight = ["FALLA", "EJERCICIO"].includes(currentField);
        const content = currentContent.join(" ").trim();
        if (!content) return;

        if (isHighlight) {
          html += `<div class="highlight-box"><p class="field-label">${currentField}</p><p>${content}</p></div>`;
        } else if (isNarrativeField) {
          html += `<div class="narrative-section"><p class="field-label">${currentField}</p><p>${content}</p></div>`;
        } else {
          html += `<p class="meta-line"><span class="meta-key">${currentField}:</span> <span class="meta-val">${content}</span></p>`;
        }
        currentContent = [];
      };

      for (const line of lines) {
        const matchedField = fieldOrder.find(f => line.startsWith(f + ":"));
        if (matchedField) {
          flushField();
          currentField = matchedField;
          currentContent = [line.slice(matchedField.length + 1).trim()];
        } else if (line.trim()) {
          currentContent.push(line.trim());
        }
      }
      flushField();
      return html;
    };

    const tocHTML = interfaces.map((iface, i) =>
      `<div class="toc-entry">
        <span class="toc-id">${iface.id}</span>
        <span class="toc-title">${iface.titulo}</span>
        <span class="toc-dots"></span>
        <span class="toc-page">${i + 1}</span>
      </div>`
    ).join("");

    const epilogo = parseEpilogo();

    const chaptersHTML = interfaces.map((iface, i) => {
      const nextId = i < interfaces.length - 1 ? interfaces[i + 1].id : null;
      const raw = parseInterface(iface.id, nextId);
      const content = formatInterfaceContent(raw);
      return `
      <div class="chapter-page page-break">
        <div class="chapter-header">
          <p class="chapter-badge">${iface.id}</p>
          <h2 class="chapter-title">${iface.titulo}</h2>
          <p class="chapter-falla">${iface.falla}</p>
          <div class="divider-gold"></div>
        </div>
        <div class="chapter-body">${content}</div>
        <div class="chapter-cta">
          <p class="cta-label">Terminal de Descompresión</p>
          <p class="cta-url">sistemicar.app/umbral-leads?src=libro&cap=${iface.id}</p>
        </div>
      </div>`;
    }).join("");

    const epilogoHTML = epilogo ? `
    <div class="chapter-page page-break">
      <div class="chapter-header">
        <p class="chapter-badge">FINAL</p>
        <h2 class="chapter-title">La Activación del Sistema</h2>
        <div class="divider-gold"></div>
      </div>
      <div class="chapter-body"><p class="narrative-text">${epilogo.replace(/\n/g, " ").trim()}</p></div>
    </div>` : "";

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>El Espejo del Mendigo — Gilson Arévalo Pezo</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', Georgia, serif;
      background: #ffffff;
      color: #1a1a1a;
      max-width: 700px;
      margin: 0 auto;
      padding: 50px 40px;
      font-size: 14px;
      line-height: 1.75;
    }
    @media print {
      body { padding: 0; max-width: 100%; font-size: 11pt; }
      @page { margin: 2cm 2cm 2.5cm; size: A5; }
    }
    h1, h2, h3 { font-family: 'Playfair Display', Georgia, serif; }

    /* PORTADA */
    .cover-page { min-height: 90vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; page-break-after: always; }
    .cover-line { width: 80px; height: 2px; background: #D4AF37; margin: 30px auto; }
    .cover-title { font-size: 52px; font-weight: 900; color: #0a0a0a; line-height: 1.1; letter-spacing: -0.5px; }
    .cover-subtitle { font-size: 13px; color: #888; letter-spacing: 3px; text-transform: uppercase; margin-top: 12px; }
    .cover-author { font-family: 'Playfair Display', serif; font-size: 18px; color: #444; font-style: italic; margin-top: 40px; }
    .cover-brand { font-size: 10px; color: #bbb; letter-spacing: 3px; text-transform: uppercase; margin-top: 14px; }

    /* DERECHOS */
    .rights-page { min-height: 50vh; display: flex; align-items: flex-end; justify-content: center; page-break-after: always; padding-bottom: 60px; text-align: center; }
    .rights-text { font-size: 11px; color: #777; line-height: 2.2; }

    /* ÍNDICE */
    .toc-page { page-break-after: always; padding: 40px 0; }
    .toc-title { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 900; text-align: center; color: #0a0a0a; margin-bottom: 10px; }
    .toc-divider { width: 60px; height: 2px; background: #D4AF37; margin: 0 auto 30px; }
    .toc-entry { display: flex; align-items: baseline; gap: 8px; padding: 6px 0; border-bottom: 1px dotted #e8e8e8; }
    .toc-id { font-size: 10px; font-weight: 700; color: #D4AF37; font-family: monospace; min-width: 35px; }
    .toc-title-text { font-size: 13px; color: #2a2a2a; flex: 1; }
    .toc-page-num { font-size: 11px; color: #aaa; }

    /* CAPÍTULOS */
    .page-break { page-break-before: always; }
    .chapter-page { padding-top: 60px; }
    .chapter-header { text-align: center; margin-bottom: 40px; }
    .chapter-badge { font-size: 10px; font-weight: 700; letter-spacing: 4px; color: #D4AF37; text-transform: uppercase; margin-bottom: 12px; font-family: monospace; }
    .chapter-title { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 900; color: #0a0a0a; line-height: 1.2; margin-bottom: 10px; }
    .chapter-falla { font-size: 12px; color: #888; font-style: italic; }
    .divider-gold { width: 60px; height: 2px; background: #D4AF37; margin: 24px auto; }

    /* CONTENIDO */
    .chapter-body { margin-bottom: 40px; }
    .meta-line { font-size: 12px; color: #555; margin-bottom: 8px; }
    .meta-key { font-weight: 700; color: #888; text-transform: uppercase; font-size: 10px; letter-spacing: 1.5px; }
    .meta-val { color: #444; }
    .narrative-section { margin: 20px 0; }
    .narrative-text { font-size: 13.5px; color: #2a2a2a; line-height: 1.85; text-align: justify; }
    .field-label { font-size: 9px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #D4AF37; margin-bottom: 8px; font-family: monospace; }
    .narrative-section p:last-child { font-size: 13.5px; color: #2a2a2a; line-height: 1.85; text-align: justify; }
    .highlight-box { margin: 24px 0; padding: 18px 20px; border-left: 3px solid #D4AF37; background: #faf8f0; border-radius: 0 8px 8px 0; }
    .highlight-box p:last-child { font-size: 13px; color: #3a3a3a; line-height: 1.7; font-style: italic; }

    /* CTA */
    .chapter-cta { margin-top: 40px; padding: 18px; border: 1px solid #D4AF37; border-radius: 8px; text-align: center; background: #faf8f0; }
    .cta-label { font-size: 9px; letter-spacing: 2.5px; color: #D4AF37; text-transform: uppercase; margin-bottom: 5px; font-family: monospace; }
    .cta-url { font-size: 12px; color: #666; }

    /* AUTOR */
    .author-page { page-break-before: always; min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .author-line { width: 80px; height: 2px; background: #D4AF37; margin: 0 auto 30px; }
    .author-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #0a0a0a; margin-bottom: 16px; }
    .author-bio { font-size: 13px; color: #555; line-height: 1.85; max-width: 480px; text-align: justify; margin: 0 auto; }
    .author-portal { margin-top: 30px; padding: 14px 28px; border: 1px solid #D4AF37; border-radius: 8px; background: #faf8f0; }
    .author-portal-label { font-size: 9px; color: #D4AF37; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 3px; font-family: monospace; }
    .author-portal-url { font-size: 13px; color: #555; font-weight: 600; }
  </style>
</head>
<body>

  <!-- PORTADA -->
  <div class="cover-page">
    <div class="cover-line"></div>
    <h1 class="cover-title">El Espejo<br>del Mendigo</h1>
    <p class="cover-subtitle">Manual de Desinstalación del Error de Registro</p>
    <div class="cover-line"></div>
    <p class="cover-author">Gilson Arévalo Pezo</p>
    <p class="cover-brand">SISTEMICAR™</p>
  </div>

  <!-- TESIS CENTRAL -->
  <div style="page-break-after:always; padding: 60px 20px; display:flex; flex-direction:column; justify-content:center; min-height:70vh;">
    <p style="font-size:10px;letter-spacing:3px;color:#D4AF37;text-transform:uppercase;font-family:monospace;margin-bottom:20px;text-align:center;">Tesis Central</p>
    <blockquote style="font-family:'Playfair Display',serif;font-size:19px;font-weight:700;line-height:1.7;color:#1a1a1a;text-align:center;font-style:italic;max-width:480px;margin:0 auto 30px;">
      "La pobreza es una falla de hardware en las 10 Interfaces de Interacción del sistema biológico."
    </blockquote>
    <div style="width:50px;height:2px;background:#D4AF37;margin:0 auto 30px;"></div>
    <p style="font-size:12px;color:#555;line-height:1.85;text-align:justify;max-width:500px;margin:0 auto;">
      El "Mendigo" es un virus que secuestra las interfaces para drenar voltaje. El dinero no es el Sostén, es Flujo. La abundancia es el estado natural de un sistema sin ruido.<br><br>
      Este manual identifica las 10 Interfaces donde el virus opera, describe el diagnóstico clínico de cada falla, y entrega el protocolo de rescate para desinstalar el error de registro.
    </p>
    <div style="margin-top:40px;padding:16px;border:1px solid #D4AF3740;border-radius:8px;background:#faf8f0;max-width:400px;margin:30px auto 0;">
      <p style="font-size:10px;color:#D4AF37;letter-spacing:2px;text-transform:uppercase;font-family:monospace;margin-bottom:6px;">Terminología del Sistema</p>
      <p style="font-size:11px;color:#555;line-height:1.9;">
        <strong>Pasajero:</strong> El usuario soberano, dueño de su sistema<br>
        <strong>Mendigo:</strong> El virus que hackea las interfaces<br>
        <strong>Interfaces M01–M10:</strong> Órganos de percepción biológica<br>
        <strong>Voltaje:</strong> Nivel de energía del sistema<br>
        <strong>Hardware:</strong> El cuerpo biológico del usuario
      </p>
    </div>
  </div>

  <!-- DERECHOS -->
  <div class="rights-page">
    <div class="rights-text">
      El Espejo del Mendigo<br>
      © 2025 Gilson Arévalo Pezo<br>
      Todos los derechos reservados<br><br>
      SISTEMICAR™ — Plataforma de Ingeniería de Conciencia<br>
      sistemicar.app<br><br>
      Ninguna parte de este libro puede ser reproducida<br>
      sin autorización escrita del autor.
    </div>
  </div>

  <!-- ÍNDICE -->
  <div class="toc-page">
    <h2 class="toc-title">Índice de Interfaces</h2>
    <div class="toc-divider"></div>
    ${interfaces.map((iface, i) => `
    <div class="toc-entry">
      <span class="toc-id">${iface.id}</span>
      <span class="toc-title-text">${iface.titulo}</span>
      <span class="toc-page-num">${i + 1}</span>
    </div>`).join("")}
  </div>

  <!-- CAPÍTULOS -->
  ${chaptersHTML}

  ${epilogoHTML}

  <!-- AUTOR -->
  <div class="author-page">
    <div class="author-line"></div>
    <p class="author-title">Sobre el Autor</p>
    <p class="author-bio">
      <strong>Gilson Arévalo Pezo</strong> es ingeniero de sistemas de conciencia y creador de SISTEMICAR™,
      la primera plataforma de desinstalación del virus de la pobreza basada en hardware biológico.
      Su trabajo combina neurociencia aplicada, ingeniería conductual y protocolos clínicos de soberanía personal.
    </p>
    <div class="author-portal">
      <p class="author-portal-label">Portal de Descompresión</p>
      <p class="author-portal-url">sistemicar.app/umbral-leads</p>
    </div>
  </div>

</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="El_Espejo_del_Mendigo_KDP.html"');
    res.send(html);
  } catch (error: any) {
    console.error("Libro original compilation error:", error);
    res.status(500).json({ error: "Error compilando el libro" });
  }
};

app.get("/api/semillas/libro-original-html", compilarLibroOriginalHandler);
app.post("/api/semillas/compilar-libro-original", compilarLibroOriginalHandler);

app.post("/api/fabrica-sensorial/producir-lote", async (req, res) => {
  try {
    const piezas: any[] = [];
    const INTERFACES_FABRICA = [
      { id: "M01", nombre: "El Suelo de Cristal", falla: "Falla de Territorio", zona: "Pies, base de columna" },
      { id: "M02", nombre: "La Sequía Eterna", falla: "Falla de Flujo", zona: "Pelvis, bajo vientre" },
      { id: "M03", nombre: "La Hormiga ante el Gigante", falla: "Falla de Poder", zona: "Plexo solar" },
      { id: "M04", nombre: "El Latido de la Carencia", falla: "Falla de Resonancia", zona: "Centro del pecho" },
      { id: "M05", nombre: "El Nudo de la Invisibilidad", falla: "Falla de Emisión", zona: "Garganta, cuello" },
      { id: "M06", nombre: "La Visión de Túnel", falla: "Falla de Estrategia", zona: "Frente, entrecejo" },
      { id: "M07", nombre: "El Abogado de la Pobreza", falla: "Falla de Procesamiento", zona: "Cerebro, lógica" },
      { id: "M08", nombre: "El Heredero Desposeído", falla: "Falla de Autoridad", zona: "Coronilla" },
      { id: "M09", nombre: "El Nodo Aislado", falla: "Falla de Resonancia Mórfica", zona: "Campo electromagnético" },
      { id: "M10", nombre: "El Reboot del Soberano", falla: "Integración Total", zona: "Sistema completo" },
    ];

    const prompt = `Eres el Director Creativo de SISTEMICAR. Genera un lote de EXACTAMENTE 10 piezas audiovisuales sensoriales — una por cada Interfaz del Espejo del Mendigo (M01, M02, M03, M04, M05, M06, M07, M08, M09, M10). Cada pieza será un video corto (60-90 segundos) para redes sociales (Instagram Reels / TikTok / YouTube Shorts).

REGLA ABSOLUTA — IDENTIDAD DEL AUTOR: JAMÁS menciones ningún nombre propio del autor (Gilson, Arévalo, Pezo, etc.) en los guiones ni en ningún campo de texto narrado o hablado. En su lugar usa SIEMPRE "el Maestro". Esta regla aplica a TODO el contenido generado.

CONTEXTO COMPLETO DEL LIBRO "El Espejo del Mendigo":
${LIBRO_ESPEJO_MENDIGO_COMPLETO}

DICCIONARIO CLÍNICO:
${DICCIONARIO_CLINICO_COMPLETO.slice(0, 3000)}

Para CADA una de las 10 interfaces genera:

1. "guion_narrador" — Texto narrado (150-200 palabras). Tono: clínico-poético, directo, sin frases motivacionales vacías. Debe golpear emocionalmente usando terminología técnica del libro (Hardware, Voltaje, Chófer, Pasajero, Mendigo, Interfaz). Estructura: gancho impactante → diagnóstico técnico → protocolo de rescate → cierre con frase de poder.
2. "subtitulos" — Array de 8-12 objetos con { "texto": "frase corta", "segundos": número }. Cada subtítulo dura 3-6 segundos. Son frases de impacto visual que aparecen sincronizadas. NO son la transcripción completa, son frases clave cinematográficas.
3. "descripcion_visual" — Descripción detallada del fondo visual (estilo: tech-noir cinematográfico, paleta #0A0A0A #D4AF37 #00FFC3 #FF3131). Incluir elementos: silueta humana con zona iluminada, partículas, glitch effects, tipografía flotante.
4. "image_prompt" — Prompt en inglés para generador de imágenes (DALL-E/Midjourney style). Describe la escena visual exacta: tech-noir style, human silhouette, specific body zone glowing, particle effects, specific color palette. Max 200 palabras.
5. "caption_instagram" — Caption para Instagram con emojis estratégicos, hashtags de nicho, CTA a sistemicar.app/umbral-leads?src=video&cap={interfaz}. Max 300 caracteres.
6. "caption_tiktok" — Caption para TikTok con gancho viral, max 150 caracteres.
7. "binaural_hz" — Frecuencia binaural sugerida para el audio de fondo (número entre 40 y 963 Hz según la zona del cuerpo de la interfaz).
8. "titulo_pieza" — Título corto y poderoso para la pieza (max 8 palabras).
9. "hashtags" — Array de 5-8 hashtags relevantes.
10. "tracking_url" — URL de seguimiento: "https://sistemicar.app/umbral-leads?src=fabrica&cap={interfaz_id}"
11. "formato" — Siempre "vertical_9_16" para Reels/TikTok/Shorts.
12. "duracion_estimada" — Duración estimada en segundos (60-90).

IMPORTANTE: Debes generar EXACTAMENTE 10 piezas, una para cada interfaz M01 a M10, en orden. No omitas ninguna.

RESPONDE EXCLUSIVAMENTE con este JSON (sin texto antes o después):
{
  "lote": [
    {
      "interfaz": "M01",
      "nombre_interfaz": "El Suelo de Cristal",
      "titulo_pieza": "...",
      "guion_narrador": "...",
      "subtitulos": [{ "texto": "...", "segundos": 4 }],
      "descripcion_visual": "...",
      "image_prompt": "...",
      "caption_instagram": "...",
      "caption_tiktok": "...",
      "binaural_hz": 396,
      "hashtags": ["#sistemicar", "..."],
      "tracking_url": "https://sistemicar.app/umbral-leads?src=fabrica&cap=M01",
      "formato": "vertical_9_16",
      "duracion_estimada": 75
    }
  ]
}

Genera las 10 piezas completas (M01 a M10).`;

    const rawResponse = await callGemini(prompt, 8000, true);
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const lote = parsed.lote || [];
      if (lote.length === 0) {
        return res.status(500).json({ error: "Lote vacío generado por IA" });
      }
      const loteMap = new Map<string, any>();
      for (const pieza of lote) {
        if (pieza.interfaz) loteMap.set(pieza.interfaz, pieza);
      }
      const loteCompleto = INTERFACES_FABRICA.map((iface, i) => {
        const pieza = loteMap.get(iface.id) || lote[i] || {};
        return {
          interfaz: iface.id,
          nombre_interfaz: pieza.nombre_interfaz || iface.nombre,
          titulo_pieza: pieza.titulo_pieza || `Pieza ${iface.id}`,
          guion_narrador: pieza.guion_narrador || "",
          subtitulos: Array.isArray(pieza.subtitulos) ? pieza.subtitulos : [],
          descripcion_visual: pieza.descripcion_visual || "",
          image_prompt: pieza.image_prompt || "",
          caption_instagram: pieza.caption_instagram || "",
          caption_tiktok: pieza.caption_tiktok || "",
          binaural_hz: typeof pieza.binaural_hz === "number" ? pieza.binaural_hz : 432,
          hashtags: Array.isArray(pieza.hashtags) ? pieza.hashtags : [],
          tracking_url: `https://sistemicar.app/umbral-leads?src=fabrica&cap=${iface.id}`,
          formato: "vertical_9_16",
          duracion_estimada: typeof pieza.duracion_estimada === "number" ? pieza.duracion_estimada : 75,
          fecha_pieza: new Date().toISOString(),
        };
      });
      res.json({
        lote: loteCompleto,
        total_piezas: loteCompleto.length,
        fecha_generacion: new Date().toISOString(),
      });
    } else {
      res.status(500).json({ error: "No se pudo parsear la respuesta de IA" });
    }
  } catch (error: any) {
    console.error("Fábrica Sensorial error:", error);
    const is429 = error?.status === 429 || error?.message?.includes("429");
    res.status(is429 ? 429 : 500).json({ error: is429 ? "Servicio de IA saturado. Intenta en unos minutos." : "Error generando lote sensorial" });
  }
});

app.post("/api/youtube-educator/generar-masterclass", async (req, res) => {
  try {
    const INTERFACES_YT = [
      { id: "M01", nombre: "El Suelo de Cristal", falla: "Falla de Territorio", zona: "Pies, base de columna" },
      { id: "M02", nombre: "La Sequía Eterna", falla: "Falla de Flujo", zona: "Pelvis, bajo vientre" },
      { id: "M03", nombre: "La Hormiga ante el Gigante", falla: "Falla de Poder", zona: "Plexo solar" },
      { id: "M04", nombre: "El Latido de la Carencia", falla: "Falla de Resonancia", zona: "Centro del pecho" },
      { id: "M05", nombre: "El Nudo de la Invisibilidad", falla: "Falla de Emisión", zona: "Garganta, cuello" },
      { id: "M06", nombre: "La Visión de Túnel", falla: "Falla de Estrategia", zona: "Frente, entrecejo" },
      { id: "M07", nombre: "El Abogado de la Pobreza", falla: "Falla de Procesamiento", zona: "Cerebro, lógica" },
      { id: "M08", nombre: "El Heredero Desposeído", falla: "Falla de Autoridad", zona: "Coronilla" },
      { id: "M09", nombre: "El Nodo Aislado", falla: "Falla de Resonancia Mórfica", zona: "Campo electromagnético" },
      { id: "M10", nombre: "El Reboot del Soberano", falla: "Integración Total", zona: "Sistema completo" },
    ];

    const buildPrompt = (interfaces: typeof INTERFACES_YT) => `Eres el Director de Contenido Educativo de SISTEMICAR. Genera masterclasses de YouTube de ~10 minutos para las siguientes interfaces del libro "El Espejo del Mendigo".

REGLA ABSOLUTA — IDENTIDAD DEL AUTOR: JAMÁS menciones ningún nombre propio del autor (Gilson, Arévalo, Pezo, etc.) en los guiones ni en ningún campo de texto narrado o hablado. En su lugar usa SIEMPRE "el Maestro". Ejemplos: "el Maestro lo explica así...", "Según el Maestro...", "el Maestro diseñó este protocolo...". Esta regla aplica a TODO el contenido generado.

CONTEXTO COMPLETO DEL LIBRO:
${LIBRO_ESPEJO_MENDIGO_COMPLETO}

DICCIONARIO CLÍNICO COMPLETO:
${DICCIONARIO_CLINICO_COMPLETO}

INTERFACES A GENERAR: ${interfaces.map(i => i.id).join(", ")}

Para CADA interfaz genera:

1. "guion_extendido" — Guion completo de ~10 minutos (1500-2000 palabras). NO inventes contenido nuevo: EXPANDE los puntos del libro usando ejemplos de la vida cotidiana. Estructura OBLIGATORIA:
   a) PROBLEMA BIOLÓGICO (2 min): Describe la falla física/hardware de esta interfaz con ejemplos reales que cualquier persona reconocería en su cuerpo.
   b) ERROR DE REGISTRO (3 min): Explica cómo el Mendigo hackea esta interfaz. Usa escenarios cotidianos (trabajo, familia, dinero) que el espectador identifique inmediatamente.
   c) LECTURA DEL MAESTRO (3 min): Expande la sabiduría del libro con analogías técnicas (ingeniería, software, hardware). Mantén el tono clínico-técnico del autor.
   d) GANCHO COMERCIAL AL LIBRO (2 min): Cierre que crea urgencia real de compra. Estructura EXACTA:
      - PREGUNTA DE DOLOR: Una pregunta que el espectador no puede responder después de ver el video porque le falta el protocolo completo. Ej: "¿Pero cómo sé EXACTAMENTE cuál es mi código de error? ¿Cómo lo desinstalo para siempre y no solo esta semana?"
      - LÍMITE DEL VIDEO: Explicar honestamente que este video mostró el diagnóstico, pero el protocolo completo de desinstalación solo existe en el libro. El video es el escáner; el libro es el bisturí.
      - URGENCIA: Una razón concreta por la que seguir sin el libro es seguir operando en modo Mendigo. No ansiedad artificial — la urgencia viene de la pérdida real (cada día sin el protocolo es un día más de interferencia activa).
      - CTA DIRECTO: "El libro se llama 'El Espejo del Mendigo'. Lo encuentras en: sistemicar.app/umbral-leads?src=youtube&cap={interfaz_id}" — Pídele al espectador que lo busque AHORA, mientras el dolor del diagnóstico está fresco.

2. "thumbnail_prompt" — Prompt en inglés para generar miniatura de YouTube de ALTO IMPACTO. Debe causar curiosidad o miedo (ej: "A person looking at their bank account with horror, glitch effect, dark red lighting, cinematic, 16:9"). Max 100 palabras.

3. "titulos" — Objeto con 3 títulos alternativos:
   - "miedo": Título basado en el miedo del Mendigo (ej: "Tu Cuenta Bancaria Está Infectada")
   - "poder": Título basado en el poder del Pasajero (ej: "Cómo Activar tu Motor de Riqueza")
   - "tecnico": Título técnico de la Interfaz (ej: "Interfaz M01: Falla de Territorio — Diagnóstico Clínico")

4. "descripcion_seo" — Descripción optimizada para YouTube (~500 palabras). Incluye:
   - Resumen de la clase
   - Timestamps ficticios (00:00 Intro, 01:30 Problema Biológico, etc.)
   - Link de compra: sistemicar.app/umbral-leads?src=youtube&cap={interfaz_id}
   - Hashtags relevantes
   - Mención al autor y al libro
   - OBLIGATORIO AL FINAL: Párrafo de venta directa del libro. Lenguaje de decisión: por qué el libro es el siguiente paso inmediato, qué protocolo contiene que el video no mostró, y el link como llamada de acción final.

5. "shorts" — Array de 3 objetos, cada uno con:
   - "titulo": Título del Short (gancho viral)
   - "guion": Guion de 30-60 segundos (el momento de mayor "Voltaje" del video largo)
   - "hook": Primera frase impactante (3 segundos)

6. "timing" — Objeto con:
   - "orden_publicacion": Número del 1 al 10 (orden sugerido para narrativa ascendente)
   - "dia_semana": Día recomendado de publicación (ej: "Lunes")
   - "razon": Breve justificación del orden

RESPONDE EXCLUSIVAMENTE con este JSON (sin texto antes o después):
{
  "masterclasses": [
    {
      "interfaz": "M0X",
      "nombre_interfaz": "...",
      "guion_extendido": "...",
      "thumbnail_prompt": "...",
      "titulos": { "miedo": "...", "poder": "...", "tecnico": "..." },
      "descripcion_seo": "...",
      "shorts": [{ "titulo": "...", "guion": "...", "hook": "..." }],
      "timing": { "orden_publicacion": 1, "dia_semana": "Lunes", "razon": "..." }
    }
  ]
}

Genera EXACTAMENTE ${interfaces.length} masterclasses para: ${interfaces.map(i => `${i.id} (${i.nombre})`).join(", ")}.`;

    const batch1 = INTERFACES_YT.slice(0, 5);
    const batch2 = INTERFACES_YT.slice(5);

    const [raw1, raw2] = await Promise.all([
      callGemini(buildPrompt(batch1), 8000, true),
      callGemini(buildPrompt(batch2), 8000, true),
    ]);

    const parse = (raw: string) => {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.masterclasses || [];
      } catch { return []; }
    };

    const all = [...parse(raw1), ...parse(raw2)];
    if (all.length === 0) {
      return res.status(500).json({ error: "No se pudieron generar las masterclasses" });
    }

    const mcMap = new Map<string, any>();
    for (const mc of all) {
      if (mc.interfaz) mcMap.set(mc.interfaz, mc);
    }

    const masterclasses = INTERFACES_YT.map((iface, i) => {
      const mc = mcMap.get(iface.id) || all[i] || {};
      return {
        interfaz: iface.id,
        nombre_interfaz: mc.nombre_interfaz || iface.nombre,
        guion_extendido: mc.guion_extendido || "",
        thumbnail_prompt: mc.thumbnail_prompt || "",
        titulos: {
          miedo: mc.titulos?.miedo || `${iface.nombre}: La Falla que No Ves`,
          poder: mc.titulos?.poder || `Activa tu ${iface.nombre}`,
          tecnico: mc.titulos?.tecnico || `Interfaz ${iface.id}: ${iface.falla}`,
        },
        descripcion_seo: mc.descripcion_seo || "",
        shorts: Array.isArray(mc.shorts) ? mc.shorts.slice(0, 3).map((s: any) => ({
          titulo: s.titulo || "",
          guion: s.guion || "",
          hook: s.hook || "",
        })) : [],
        timing: {
          orden_publicacion: mc.timing?.orden_publicacion || i + 1,
          dia_semana: mc.timing?.dia_semana || ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"][i],
          razon: mc.timing?.razon || "",
        },
        tracking_url: `https://sistemicar.app/umbral-leads?src=youtube&cap=${iface.id}`,
        fecha_generacion: new Date().toISOString(),
      };
    });

    res.json({
      masterclasses,
      total: masterclasses.length,
      fecha_generacion: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("YouTube Educator error:", error);
    const is429 = error?.status === 429 || error?.message?.includes("429");
    res.status(is429 ? 429 : 500).json({
      error: is429 ? "Servicio de IA saturado. Intenta en unos minutos." : "Error generando masterclasses",
    });
  }
});

const ALL_INTERFACES = [
  { id: "M01", nombre: "El Suelo de Cristal", falla: "Falla de Territorio", zona: "Pies, base de columna" },
  { id: "M02", nombre: "La Sequía Eterna", falla: "Falla de Flujo", zona: "Pelvis, bajo vientre" },
  { id: "M03", nombre: "La Hormiga ante el Gigante", falla: "Falla de Poder", zona: "Plexo solar" },
  { id: "M04", nombre: "El Latido de la Carencia", falla: "Falla de Resonancia", zona: "Centro del pecho" },
  { id: "M05", nombre: "El Nudo de la Invisibilidad", falla: "Falla de Emisión", zona: "Garganta, cuello" },
  { id: "M06", nombre: "La Visión de Túnel", falla: "Falla de Estrategia", zona: "Frente, entrecejo" },
  { id: "M07", nombre: "El Abogado de la Pobreza", falla: "Falla de Procesamiento", zona: "Cerebro, lógica" },
  { id: "M08", nombre: "El Heredero Desposeído", falla: "Falla de Autoridad", zona: "Coronilla" },
  { id: "M09", nombre: "El Nodo Aislado", falla: "Falla de Resonancia Mórfica", zona: "Campo electromagnético" },
  { id: "M10", nombre: "El Reboot del Soberano", falla: "Integración Total", zona: "Sistema completo" },
];

app.post("/api/youtube-educator/generar-masterclass-single", async (req, res) => {
  try {
    const { interfaz } = req.body;
    if (!interfaz || !ALL_INTERFACES.find(i => i.id === interfaz)) {
      return res.status(400).json({ error: `Interfaz inválida: ${interfaz}. Usa M01-M10.` });
    }
    const iface = ALL_INTERFACES.find(i => i.id === interfaz)!;
    const ifaceIndex = ALL_INTERFACES.findIndex(i => i.id === interfaz);
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

    const prompt = `Eres el Director de Contenido Educativo de SISTEMICAR. Genera UNA masterclass de YouTube de ~10 minutos para la interfaz ${iface.id} (${iface.nombre}) del libro "El Espejo del Mendigo".

REGLA ABSOLUTA — IDENTIDAD DEL AUTOR: JAMÁS menciones ningún nombre propio del autor (Gilson, Arévalo, Pezo, etc.) en los guiones ni en ningún campo de texto narrado o hablado. En su lugar usa SIEMPRE "el Maestro". Ejemplos: "el Maestro lo explica así...", "Según el Maestro...", "el Maestro diseñó este protocolo...". Esta regla aplica a TODO el contenido generado.

CONTEXTO COMPLETO DEL LIBRO:
${LIBRO_ESPEJO_MENDIGO_COMPLETO}

DICCIONARIO CLÍNICO COMPLETO:
${DICCIONARIO_CLINICO_COMPLETO}

INTERFAZ A GENERAR: ${iface.id} — ${iface.nombre} (${iface.falla}, zona: ${iface.zona})

Genera:

1. "guion_extendido" — Guion completo de ~10 minutos (1500-2000 palabras). NO inventes contenido nuevo: EXPANDE los puntos del libro usando ejemplos de la vida cotidiana. Estructura OBLIGATORIA:
   a) PROBLEMA BIOLÓGICO (2 min): Describe la falla física/hardware de esta interfaz con ejemplos reales.
   b) ERROR DE REGISTRO (3 min): Explica cómo el Mendigo hackea esta interfaz con escenarios cotidianos.
   c) LECTURA DEL MAESTRO (3 min): Expande la sabiduría del libro con analogías técnicas.
   d) GANCHO COMERCIAL AL LIBRO (2 min): Cierre que crea urgencia real de compra. Estructura EXACTA:
      - PREGUNTA DE DOLOR: Una pregunta que el espectador no puede responder después de ver el video porque le falta el protocolo completo. Ej: "¿Pero cómo sé EXACTAMENTE cuál es mi código de error? ¿Cómo lo desinstalo para siempre y no solo esta semana?"
      - LÍMITE DEL VIDEO: Explicar honestamente que este video mostró el diagnóstico, pero el protocolo completo de desinstalación solo existe en el libro. El video es el escáner; el libro es el bisturí.
      - URGENCIA: Una razón concreta por la que seguir sin el libro es seguir operando en modo Mendigo. No ansiedad artificial — la urgencia viene de la pérdida real (cada día sin el protocolo es un día más de interferencia activa).
      - CTA DIRECTO: "El libro se llama 'El Espejo del Mendigo'. Lo encuentras en: sistemicar.app/umbral-leads?src=youtube&cap=${iface.id}" — Pídele al espectador que lo busque AHORA, mientras el dolor del diagnóstico está fresco.

2. "thumbnail_prompt" — Prompt en inglés para miniatura de YouTube de ALTO IMPACTO. Max 100 palabras.

3. "titulos" — Objeto con 3 títulos alternativos:
   - "miedo": Título basado en el miedo del Mendigo
   - "poder": Título basado en el poder del Pasajero
   - "tecnico": Título técnico de la Interfaz

4. "descripcion_seo" — Descripción optimizada para YouTube (~500 palabras) con timestamps y link de compra. OBLIGATORIO: incluir al final un párrafo de venta directa del libro con lenguaje de decisión: por qué el libro es el siguiente paso inmediato, qué protocolo contiene que el video no mostró, y el link sistemicar.app/umbral-leads?src=youtube&cap=${iface.id} como llamada de acción final.

5. "shorts" — Array de 3 objetos con "titulo", "guion" (30-60s), "hook" (3s).

6. "timing" — { "orden_publicacion": ${ifaceIndex + 1}, "dia_semana": "${dias[ifaceIndex]}", "razon": "..." }

RESPONDE EXCLUSIVAMENTE con este JSON:
{
  "masterclass": {
    "interfaz": "${iface.id}",
    "nombre_interfaz": "${iface.nombre}",
    "guion_extendido": "...",
    "thumbnail_prompt": "...",
    "titulos": { "miedo": "...", "poder": "...", "tecnico": "..." },
    "descripcion_seo": "...",
    "shorts": [{ "titulo": "...", "guion": "...", "hook": "..." }],
    "timing": { "orden_publicacion": ${ifaceIndex + 1}, "dia_semana": "${dias[ifaceIndex]}", "razon": "..." }
  }
}`;

    const raw = await callGemini(prompt, 4000, true);
    const parsed = parseGeminiJSON(raw);
    const mc = parsed.masterclass || parsed.masterclasses?.[0] || parsed;

    const masterclass = {
      interfaz: iface.id,
      nombre_interfaz: mc.nombre_interfaz || iface.nombre,
      guion_extendido: mc.guion_extendido || "",
      thumbnail_prompt: mc.thumbnail_prompt || "",
      titulos: {
        miedo: mc.titulos?.miedo || `${iface.nombre}: La Falla que No Ves`,
        poder: mc.titulos?.poder || `Activa tu ${iface.nombre}`,
        tecnico: mc.titulos?.tecnico || `Interfaz ${iface.id}: ${iface.falla}`,
      },
      descripcion_seo: mc.descripcion_seo || "",
      shorts: Array.isArray(mc.shorts) ? mc.shorts.slice(0, 3).map((s: any) => ({
        titulo: s.titulo || "",
        guion: s.guion || "",
        hook: s.hook || "",
      })) : [],
      timing: {
        orden_publicacion: mc.timing?.orden_publicacion || ifaceIndex + 1,
        dia_semana: mc.timing?.dia_semana || dias[ifaceIndex],
        razon: mc.timing?.razon || "",
      },
      tracking_url: `https://sistemicar.app/umbral-leads?src=youtube&cap=${iface.id}`,
      fecha_generacion: new Date().toISOString(),
    };

    res.json({ masterclass });
  } catch (error: any) {
    console.error(`YouTube Educator single (${req.body?.interfaz}) error:`, error);
    const is429 = error?.status === 429 || error?.message?.includes("429");
    res.status(is429 ? 429 : 500).json({
      error: is429 ? "Servicio de IA saturado. Intenta en unos minutos." : `Error generando masterclass ${req.body?.interfaz}: ${error?.message || "desconocido"}`,
    });
  }
});

// ── Job store for async YT masterclass rendering ──────────────────────────
type RenderJob = {
  status: "running" | "complete" | "error";
  interfaz: string;
  startedAt: number;
  bufferReady?: boolean;
  filename?: string;
  error?: string;
};
const renderJobs = new Map<string, RenderJob>();

// In-memory video buffer store (survives until upload or server restart)
const videoBuffers = new Map<string, { buffer: Buffer; filename: string }>();

app.post("/api/youtube-educator/render-masterclass", async (req, res) => {
  const { interfaz, guion_extendido, thumbnail_prompt } = req.body;
  if (!interfaz || !guion_extendido) {
    return res.status(400).json({ error: "Faltan campos: interfaz, guion_extendido" });
  }

  const jobId = `${interfaz}_${Date.now()}`;
  renderJobs.set(jobId, { status: "running", interfaz, startedAt: Date.now() });

  // Respond immediately — client will poll for status
  res.json({ jobId });

  // Process in background (no await)
  (async () => {
    let audioPath = "";
    let imagePath = "";
    try {
      console.log(`[render-yt] [${jobId}] Step 1/3: Chunked voice for ${interfaz}...`);
      const voiceResult = await generateVoiceChunked(guion_extendido, interfaz);
      audioPath = voiceResult.audioPath;

      console.log(`[render-yt] [${jobId}] Step 2/3: Generating image for ${interfaz}...`);
      const imgPrompt = thumbnail_prompt || `Epic cinematic masterclass for SISTEMICAR interface ${interfaz}: tech-noir style, dark background, golden circuit patterns, consciousness and transformation.`;
      const imageResult = await generateImage(imgPrompt, `${interfaz}_yt`);
      imagePath = imageResult.imagePath;

      console.log(`[render-yt] [${jobId}] Step 3/3: Rendering video for ${interfaz}...`);
      const { videoPath, filename } = renderVideoYT(audioPath, imagePath, interfaz);

      // Read video buffer into memory so it survives static-file cleanup / server restarts
      const videoBuffer = fs.readFileSync(videoPath);
      videoBuffers.set(jobId, { buffer: videoBuffer, filename });
      // Auto-evict buffer after 4 hours if not uploaded
      setTimeout(() => videoBuffers.delete(jobId), 4 * 60 * 60 * 1000);

      console.log(`[render-yt] [${jobId}] Complete! ${interfaz} → buffer ${videoBuffer.length} bytes (filename: ${filename})`);
      renderJobs.set(jobId, { status: "complete", interfaz, startedAt: renderJobs.get(jobId)!.startedAt, bufferReady: true, filename });
    } catch (err: any) {
      console.error(`[render-yt] [${jobId}] Error:`, err);
      renderJobs.set(jobId, { status: "error", interfaz, startedAt: renderJobs.get(jobId)!.startedAt, error: err?.message || "desconocido" });
    } finally {
      cleanupTmpFiles(audioPath, imagePath);
      // Clean up job after 2 hours
      setTimeout(() => renderJobs.delete(jobId), 2 * 60 * 60 * 1000);
    }
  })();
});

app.get("/api/youtube-educator/render-status/:jobId", (req, res) => {
  const job = renderJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job no encontrado o expirado" });
  res.json(job);
});

// ── Upload rendered video buffer to Firebase Storage ─────────────────────
app.post("/api/youtube-educator/upload-video/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticación requerido" });
  }
  const idToken = authHeader.slice(7);

  const bufferEntry = videoBuffers.get(jobId);
  if (!bufferEntry) {
    return res.status(404).json({ error: "Video no encontrado en memoria. El servidor fue reiniciado — por favor re-renderiza.", code: "BUFFER_EXPIRED" });
  }

  const bucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || "sistemicar-app.firebasestorage.app";
  const storagePath = `masterclass-videos/${bufferEntry.filename}`;
  const encodedPath = encodeURIComponent(storagePath);
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodedPath}`;

  console.log(`[upload-yt] [${jobId}] Uploading ${bufferEntry.filename} (${bufferEntry.buffer.length} bytes) to Firebase Storage...`);
  try {
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${idToken}`,
        "Content-Type": "video/mp4",
      },
      body: bufferEntry.buffer,
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text().catch(() => "");
      console.error(`[upload-yt] [${jobId}] Firebase Storage error ${uploadRes.status}:`, errBody.slice(0, 300));
      return res.status(uploadRes.status).json({ error: `Firebase Storage error ${uploadRes.status}: ${errBody.slice(0, 200)}` });
    }

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
    videoBuffers.delete(jobId);
    console.log(`[upload-yt] [${jobId}] Upload complete → ${downloadUrl}`);
    res.json({ downloadUrl });
  } catch (err: any) {
    console.error(`[upload-yt] [${jobId}] Error:`, err);
    res.status(500).json({ error: `Error subiendo a Firebase Storage: ${err?.message || "desconocido"}` });
  }
});

app.post("/api/fabrica-sensorial/producir-pieza", async (req, res) => {
  try {
    const { interfaz } = req.body;
    if (!interfaz || !ALL_INTERFACES.find(i => i.id === interfaz)) {
      return res.status(400).json({ error: `Interfaz inválida: ${interfaz}. Usa M01-M10.` });
    }
    const iface = ALL_INTERFACES.find(i => i.id === interfaz)!;

    const prompt = `Eres el Director Creativo de SISTEMICAR. Genera UNA pieza audiovisual sensorial para la interfaz ${iface.id} (${iface.nombre}) del Espejo del Mendigo. Esta pieza será un video corto (60-90 segundos) para Instagram Reels / TikTok / YouTube Shorts.

REGLA ABSOLUTA — IDENTIDAD DEL AUTOR: JAMÁS menciones ningún nombre propio del autor (Gilson, Arévalo, Pezo, etc.) en los guiones ni en ningún campo de texto narrado o hablado. En su lugar usa SIEMPRE "el Maestro". Esta regla aplica a TODO el contenido generado.

CONTEXTO DEL LIBRO "El Espejo del Mendigo":
${LIBRO_ESPEJO_MENDIGO_COMPLETO}

DICCIONARIO CLÍNICO:
${DICCIONARIO_CLINICO_COMPLETO.slice(0, 3000)}

INTERFAZ: ${iface.id} — ${iface.nombre} (${iface.falla}, zona: ${iface.zona})

Genera:
1. "guion_narrador" — Texto narrado (150-200 palabras). Tono: clínico-poético, directo. Estructura: gancho impactante → diagnóstico técnico → protocolo de rescate → cierre con frase de poder.
2. "subtitulos" — Array de 8-12 objetos { "texto": "frase corta", "segundos": 3-6 }. Frases de impacto visual cinematográficas.
3. "descripcion_visual" — Descripción del fondo visual tech-noir (paleta #0A0A0A #D4AF37 #00FFC3 #FF3131).
4. "image_prompt" — Prompt en inglés para generador de imágenes (tech-noir style). Max 200 palabras.
5. "caption_instagram" — Caption con emojis, hashtags, CTA a sistemicar.app/umbral-leads?src=video&cap=${iface.id}. Max 300 chars.
6. "caption_tiktok" — Caption para TikTok con gancho viral, max 150 chars.
7. "binaural_hz" — Frecuencia binaural sugerida (40-963 Hz según zona corporal).
8. "titulo_pieza" — Título corto y poderoso (max 8 palabras).
9. "hashtags" — Array de 5-8 hashtags relevantes.

RESPONDE EXCLUSIVAMENTE con este JSON:
{
  "pieza": {
    "interfaz": "${iface.id}",
    "nombre_interfaz": "${iface.nombre}",
    "titulo_pieza": "...",
    "guion_narrador": "...",
    "subtitulos": [{ "texto": "...", "segundos": 4 }],
    "descripcion_visual": "...",
    "image_prompt": "...",
    "caption_instagram": "...",
    "caption_tiktok": "...",
    "binaural_hz": 396,
    "hashtags": ["#sistemicar", "..."]
  }
}`;

    const rawResponse = await callGemini(prompt, 3000, true);
    const parsed = parseGeminiJSON(rawResponse);
    const p = parsed.pieza || parsed.lote?.[0] || parsed;

    const pieza = {
      interfaz: iface.id,
      nombre_interfaz: p.nombre_interfaz || iface.nombre,
      titulo_pieza: p.titulo_pieza || `Pieza ${iface.id}`,
      guion_narrador: p.guion_narrador || "",
      subtitulos: Array.isArray(p.subtitulos) ? p.subtitulos : [],
      descripcion_visual: p.descripcion_visual || "",
      image_prompt: p.image_prompt || "",
      caption_instagram: p.caption_instagram || "",
      caption_tiktok: p.caption_tiktok || "",
      binaural_hz: typeof p.binaural_hz === "number" ? p.binaural_hz : 432,
      hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
      tracking_url: `https://sistemicar.app/umbral-leads?src=fabrica&cap=${iface.id}`,
      formato: "vertical_9_16",
      duracion_estimada: typeof p.duracion_estimada === "number" ? p.duracion_estimada : 75,
      fecha_pieza: new Date().toISOString(),
    };

    res.json({ pieza });
  } catch (error: any) {
    console.error(`Fábrica Sensorial single (${req.body?.interfaz}) error:`, error);
    const is429 = error?.status === 429 || error?.message?.includes("429");
    res.status(is429 ? 429 : 500).json({
      error: is429 ? "Servicio de IA saturado. Intenta en unos minutos." : `Error generando pieza ${req.body?.interfaz}: ${error?.message || "desconocido"}`,
    });
  }
});

app.post("/api/fabrica-sensorial/render-video", async (req, res) => {
  try {
    const { interfaz, guion_narrador, image_prompt } = req.body;
    if (!interfaz || !guion_narrador || !image_prompt) {
      return res.status(400).json({ error: "Faltan campos: interfaz, guion_narrador, image_prompt" });
    }

    console.log(`[render] Starting video render for ${interfaz}...`);
    let audioPath = "";
    let imagePath = "";

    try {
      console.log(`[render] Step 1/3: Generating voice for ${interfaz}...`);
      const voiceResult = await generateVoice(guion_narrador, interfaz);
      audioPath = voiceResult.audioPath;

      console.log(`[render] Step 2/3: Generating image for ${interfaz}...`);
      const imageResult = await generateImage(image_prompt, interfaz);
      imagePath = imageResult.imagePath;

      console.log(`[render] Step 3/3: Rendering video for ${interfaz}...`);
      const { filename } = renderVideo(audioPath, imagePath, interfaz);

      const downloadUrl = `/videos/${filename}`;
      console.log(`[render] Complete! ${interfaz} → ${downloadUrl}`);

      res.json({
        success: true,
        interfaz,
        downloadUrl,
        filename,
      });
    } finally {
      cleanupTmpFiles(audioPath, imagePath);
    }
  } catch (error: any) {
    console.error(`[render] Error rendering ${req.body?.interfaz}:`, error);
    res.status(500).json({
      error: `Error renderizando video ${req.body?.interfaz}: ${error?.message || "desconocido"}`,
    });
  }
});

app.get("/api/fabrica-sensorial/rendered-videos", (req, res) => {
  try {
    const files = fs.readdirSync(RENDERED_VIDEOS_DIR)
      .filter(f => f.endsWith(".mp4"))
      .map(f => {
        const stats = fs.statSync(path.join(RENDERED_VIDEOS_DIR, f));
        const match = f.match(/Masterclass_Sistemicar_(M\d{2})\.mp4/);
        return {
          filename: f,
          interfaz: match?.[1] || "",
          downloadUrl: `/videos/${f}`,
          sizeMB: +(stats.size / 1024 / 1024).toFixed(1),
          createdAt: stats.mtime.toISOString(),
        };
      });
    res.json({ videos: files });
  } catch {
    res.json({ videos: [] });
  }
});

// ── Estratega IA — Chat de Estrategia de Video ─────────────────────────────
const ESTRATEGA_OWNER_EMAILS = new Set(["gilsonarevalo.leo@gmail.com"]);

async function verifyFirebaseToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY;
    if (!firebaseApiKey) return null;
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }
    );
    if (!r.ok) return null;
    const data = await r.json() as { users?: { email?: string }[] };
    return data?.users?.[0]?.email?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

app.post("/api/desglosador-sugerir", async (req, res) => {
  try {
    const { titulo, historico } = req.body;
    if (!titulo || typeof titulo !== "string" || titulo.trim().length < 3) {
      return res.status(400).json({ error: "Título inválido" });
    }
    const tituloLimpio = titulo.trim();
    const historicoCtx = Array.isArray(historico) && historico.length > 0
      ? `\nContexto — secuencia previa del usuario para este ciclo:\n${historico.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}\nPuedes proponer variaciones o mejoras de esta secuencia.`
      : "";

    const prompt = `Eres un planificador operativo clínico. Tu lenguaje es directo, técnico y sin motivacionales. No uses emojis.

Misión: "${tituloLimpio}"
${historicoCtx}

Genera una secuencia de 4 a 7 sub-tareas ordenadas lógicamente para completar esta misión. Cada sub-tarea debe tener máximo 6 palabras, ser concreta y accionable. No incluyas explicaciones, solo las sub-tareas.

Responde ÚNICAMENTE en este formato JSON:
{"sugerencias": ["<sub-tarea 1>", "<sub-tarea 2>", ..., "<sub-tarea N>"]}`;

    const raw = await callGemini(prompt, 300, true);
    const parsed = parseGeminiJSON(raw);
    const sugerencias: string[] = Array.isArray(parsed.sugerencias)
      ? parsed.sugerencias.slice(0, 7).map((s: unknown) => String(s).trim()).filter(Boolean)
      : [];
    res.json({ sugerencias });
  } catch (error: any) {
    console.error("[desglosador-sugerir]", error);
    res.status(500).json({ error: "No se pudo generar sugerencias IA" });
  }
});

app.post("/api/video-estratega/chat", async (req, res) => {
  try {
    const verifiedEmail = await verifyFirebaseToken(req.headers.authorization);
    if (!verifiedEmail || !ESTRATEGA_OWNER_EMAILS.has(verifiedEmail)) {
      return res.status(403).json({ error: "Estratega IA — acceso restringido al propietario del sistema" });
    }

    const { messages, generatedInterfaces } = req.body as {
      messages: { role: string; content: string }[];
      generatedInterfaces?: { interfaz: string; titulo: string; fecha?: string }[];
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages requerido (array)" });
    }
    const validRoles = new Set(["user", "assistant", "model"]);
    const invalidMsg = messages.find(m => !validRoles.has(m.role) || typeof m.content !== "string");
    if (invalidMsg) {
      return res.status(400).json({ error: "Estructura de messages inválida" });
    }

    const masterclassCtx = Array.isArray(generatedInterfaces) && generatedInterfaces.length > 0
      ? `\nMASSTERCLASSES YA GENERADAS (historial del Maestro):\n${generatedInterfaces.map(g => `- ${g.interfaz}: "${g.titulo}"${g.fecha ? ` (${g.fecha})` : ""}`).join("\n")}\n\nInterfaz pendientes aún sin masterclass: ${["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10"].filter(m => !generatedInterfaces.some(g => g.interfaz === m)).join(", ") || "Ninguna — todas generadas."}`
      : `\nMASSTERCLASSES YA GENERADAS: Ninguna registrada aún — el Maestro está en fase inicial de producción.`;

    const systemPrompt = `Eres el Estratega IA de SISTEMICAR — asesor de contenido audiovisual especializado en el libro "El Espejo del Mendigo" y en estrategia de video para YouTube, TikTok e Instagram.

Tu conocimiento se basa EXCLUSIVAMENTE en este libro y su metodología. Hablas con el creador (el Maestro) para ayudarle a planificar, optimizar y ejecutar su estrategia de contenido digital.

BASE DE CONOCIMIENTO DEL LIBRO:
${LIBRO_ESPEJO_MENDIGO_COMPLETO}

MAPA RÁPIDO DE LAS 10 INTERFACES:
${LIBRO_INTERFACES_RESUMEN}

DICCIONARIO CLÍNICO COMPLETO:
${DICCIONARIO_CLINICO_COMPLETO}
${masterclassCtx}

TUS CAPACIDADES:
- Sugerir qué interfaz publicar primero (según tensión, viralidad, dolor del mercado)
- Mejorar o reescribir ganchos, títulos y CTAs de guiones
- Proponer calendarios de publicación y estrategia de secuencias
- Detectar qué tendencias de TikTok/YouTube se alinean con cada interfaz
- Analizar si un texto tiene el tono clínico-técnico correcto o suena motivacional vacío
- Proponer variaciones de scripts para distintos públicos objetivo
- Recomendar qué interfaz producir a continuación según el historial de producción

REGLAS DE RESPUESTA:
- Tono: clínico, directo, estratégico. SIN frases motivacionales vacías.
- Usa siempre la terminología del libro: Mendigo, Pasajero, Interfaz, Voltaje, Estática, Hardware, Chófer.
- Cuando el Maestro pida mejorar algo, proporciona el texto mejorado directamente.
- Máximo 400 palabras por respuesta a menos que el Maestro pida algo extenso.
- JAMÁS uses el nombre real del autor en el contenido; solo "el Maestro".`;

    const errors: string[] = [];
    for (const apiKey of GEMINI_KEYS) {
      const genAI = new GoogleGenerativeAI(apiKey);
      for (const modelName of GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const lastMsg = messages[messages.length - 1];
          const history = messages.slice(0, -1).map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));
          const chat = model.startChat({
            history,
            systemInstruction: systemPrompt,
            generationConfig: { maxOutputTokens: 1200 },
          });
          const result = await chat.sendMessage(lastMsg.content);
          const reply = result.response.text();
          return res.json({ reply });
        } catch (error: any) {
          const errMsg = error?.message || String(error);
          errors.push(`${modelName}:${errMsg.slice(0, 100)}`);
          continue;
        }
      }
    }
    throw new Error(`Gemini no disponible: ${errors.join(", ")}`);
  } catch (error: any) {
    console.error("[estratega-ia] Error:", error);
    res.status(500).json({ error: error?.message || "Error en Estratega IA" });
  }
});

// ==================== TALLER DE LIBROS — SERIE ESPEJO ====================
const TALLER_LIBROS_OWNER_EMAILS = new Set(["gilsonarevalo.leo@gmail.com"]);

app.post("/api/taller-libros/generar-subinterfaces", async (req, res) => {
  const verifiedEmail = await verifyFirebaseToken(req.headers.authorization);
  if (!verifiedEmail || !TALLER_LIBROS_OWNER_EMAILS.has(verifiedEmail)) {
    return res.status(403).json({ error: "Taller de Libros — acceso restringido al propietario del sistema" });
  }
  try {
    const { interfazId, tituloLibro: tituloLibroBody } = req.body;
    if (!interfazId || !INTERFACES_DETALLE[interfazId]) {
      return res.status(400).json({ error: "interfazId requerido y válido (M01-M10)" });
    }
    const interfaz = INTERFACES_DETALLE[interfazId];
    const tituloLibro = tituloLibroBody || "Serie Espejo del Mendigo";

    const prompt = `Eres el arquitecto editorial de la "Serie Espejo" — 10 libros basados en el sistema de Gilson Arévalo Pezo (SISTEMICAR). Estás escribiendo el Libro ${interfazId}: "${tituloLibro}".

MAPA DE INTERFACES (resumen — no inyectar el libro completo):
${LIBRO_INTERFACES_RESUMEN}

INTERFAZ ACTIVA (${interfazId}):
- Nombre: ${interfaz.nombre}
- Zona: ${interfaz.zona}
- Falla principal: ${interfaz.falla}
- Mendigo: ${interfaz.mendigo}
- Protocolo: ${interfaz.protocolo}

TAREA: Para el Libro ${interfazId}: "${tituloLibro}" — Interfaz "${interfaz.nombre}" (${interfaz.falla}), genera exactamente 10 sub-interfaces (capítulos). Cada sub-interfaz es una manifestación específica y concreta de la falla principal de esta interfaz.

PRINCIPIO RECTOR DEL ESPEJO: solo limpiar, prevenir, mejorar. NUNCA producir, aprender, crear metas.

REGLAS PARA CADA SUB-INTERFAZ:
- El título debe ser evocador y clínico en español (ej: "La Voz que se Traga el Precio", "El Parálisis del Domingo")
- La falla debe ser técnica y específica (ej: "Cortocircuito de autoridad ante el rango superior")
- La descripción es 1 oración sobre cómo se manifiesta físicamente o conductualmente en la vida cotidiana
- Cada sub-interfaz es un ángulo DIFERENTE de la misma falla principal — no repitas experiencias
- PROHIBIDO: lenguaje motivacional, New Age, positivo vacío

Responde SOLO con este JSON válido (sin texto adicional):
{
  "subInterfaces": [
    { "id": "${interfazId}_S01", "titulo": "...", "falla": "...", "descripcion": "...", "orden": 1 },
    { "id": "${interfazId}_S02", "titulo": "...", "falla": "...", "descripcion": "...", "orden": 2 },
    { "id": "${interfazId}_S03", "titulo": "...", "falla": "...", "descripcion": "...", "orden": 3 },
    { "id": "${interfazId}_S04", "titulo": "...", "falla": "...", "descripcion": "...", "orden": 4 },
    { "id": "${interfazId}_S05", "titulo": "...", "falla": "...", "descripcion": "...", "orden": 5 },
    { "id": "${interfazId}_S06", "titulo": "...", "falla": "...", "descripcion": "...", "orden": 6 },
    { "id": "${interfazId}_S07", "titulo": "...", "falla": "...", "descripcion": "...", "orden": 7 },
    { "id": "${interfazId}_S08", "titulo": "...", "falla": "...", "descripcion": "...", "orden": 8 },
    { "id": "${interfazId}_S09", "titulo": "...", "falla": "...", "descripcion": "...", "orden": 9 },
    { "id": "${interfazId}_S10", "titulo": "...", "falla": "...", "descripcion": "...", "orden": 10 }
  ]
}`;

    const content = await callGemini(prompt, 3000);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "No se pudo parsear respuesta IA" });
    const parsed = JSON.parse(jsonMatch[0]);
    const subs = (parsed.subInterfaces || []).slice(0, 10);
    if (subs.length === 0) return res.status(500).json({ error: "IA no generó sub-interfaces" });
    res.json({ subInterfaces: subs });
  } catch (error: any) {
    console.error("[taller-libros] Error generar-subinterfaces:", error);
    const is429 = error?.status === 429 || error?.message?.includes("429");
    if (is429) return res.status(429).json({ error: "IA saturada. Intenta en unos segundos." });
    res.status(500).json({ error: error?.message || "Error generando sub-interfaces" });
  }
});

app.post("/api/taller-libros/generar-capitulo", async (req, res) => {
  const verifiedEmail = await verifyFirebaseToken(req.headers.authorization);
  if (!verifiedEmail || !TALLER_LIBROS_OWNER_EMAILS.has(verifiedEmail)) {
    return res.status(403).json({ error: "Taller de Libros — acceso restringido al propietario del sistema" });
  }
  try {
    const { interfazId, tituloLibro: tituloLibroBody, subInterfazId, subInterfazOrden, subInterfazTitulo, subInterfazFalla, subInterfazDescripcion, instruccionesPrevias, criterioRegeneracion, contenidoActual, notasEvolucionPrevias } = req.body;
    if (!interfazId || !subInterfazTitulo) {
      return res.status(400).json({ error: "interfazId y subInterfazTitulo son requeridos" });
    }
    const interfaz = INTERFACES_DETALLE[interfazId];
    if (!interfaz) return res.status(400).json({ error: "interfazId inválido" });
    const tituloLibro = tituloLibroBody || "Serie Espejo del Mendigo";
    if (criterioRegeneracion?.trim() && !contenidoActual) {
      return res.status(400).json({ error: "criterioRegeneracion requiere contenidoActual con los carriles actuales" });
    }

    const colorInterfaz = INTERFAZ_COLORES[interfazId] || "Dorado";
    const dominiosProhibidos = DOMINIOS_PROHIBIDOS[interfazId] || "contenidos de otras interfaces";

    const capNum = typeof subInterfazOrden === "number" ? subInterfazOrden : parseInt(String(subInterfazOrden || "1"), 10) || 1;
    type DensidadNivel = "ARENA" | "MADERA" | "CEMENTO" | "HORMIGON";
    const densidadNivel: DensidadNivel = capNum <= 3 ? "ARENA" : capNum <= 6 ? "MADERA" : capNum <= 9 ? "CEMENTO" : "HORMIGON";

    const ESCALERA_VOLTAJE: Record<string, Record<string, number>> = {
      M01: { ARENA: 2,   MADERA: 4,   HIERRO: 8,   HORMIGON: 16  },
      M02: { ARENA: 2,   MADERA: 4,   HIERRO: 8,   HORMIGON: 16  },
      M03: { ARENA: 16,  MADERA: 32,  HIERRO: 48,  HORMIGON: 64  },
      M04: { ARENA: 64,  MADERA: 80,  HIERRO: 96,  HORMIGON: 112 },
      M05: { ARENA: 112, MADERA: 128, HIERRO: 144, HORMIGON: 160 },
      M06: { ARENA: 160, MADERA: 176, HIERRO: 192, HORMIGON: 208 },
      M07: { ARENA: 208, MADERA: 224, HIERRO: 240, HORMIGON: 256 },
      M08: { ARENA: 256, MADERA: 272, HIERRO: 288, HORMIGON: 304 },
      M09: { ARENA: 304, MADERA: 320, HIERRO: 336, HORMIGON: 352 },
      M10: { ARENA: 352, MADERA: 368, HIERRO: 384, HORMIGON: 400 },
    };
    type GradoMaterial = "ARENA" | "MADERA" | "HIERRO" | "HORMIGON";
    const gradoMaterial: GradoMaterial = capNum <= 3 ? "ARENA" : capNum <= 6 ? "MADERA" : capNum <= 9 ? "HIERRO" : "HORMIGON";
    const creditosRef = ESCALERA_VOLTAJE[interfazId]?.[gradoMaterial] ?? ESCALERA_VOLTAJE.M01[gradoMaterial];
    const gradoNum = capNum <= 3 ? 1 : capNum <= 6 ? 2 : capNum <= 9 ? 3 : 4;
    const gradoLabel = `Grado ${gradoNum} — ${gradoMaterial === "ARENA" ? "Arena" : gradoMaterial === "MADERA" ? "Madera" : gradoMaterial === "HIERRO" ? "Hierro" : "Hormigón"}`;

    const DENSIDAD_INSTRUCCIONES: Record<DensidadNivel, string> = {
      ARENA: `DENSIDAD ARENA (Cap.${capNum}/10): Prosa fluida. Frases cortas. Ejemplos cotidianos concretos que cualquier persona reconoce. El diagnóstico es claro y directo.`,
      MADERA: `DENSIDAD MADERA (Cap.${capNum}/10): Prosa técnica. Menos ejemplos cotidianos, más analogías del sistema (hardware, voltaje, Chófer, Pasajero). El diagnóstico exige conexiones.`,
      CEMENTO: `DENSIDAD CEMENTO (Cap.${capNum}/10): Alta densidad conceptual. Párrafos largos, en capas. El vocabulario del sistema se usa directamente, sin definir. Opera en múltiples planos simultáneos.`,
      HORMIGON: `DENSIDAD HORMIGÓN (Cap.${capNum}/10 — FINAL): Mandato puro. Sin explicaciones adicionales. Solo sentencias de ingeniería. Veredicto final, no exploración. Cada frase es un cimiento definitivo.`
    };
    const densidadStr = DENSIDAD_INSTRUCCIONES[densidadNivel];

    // Coordenada autárquica: {interfaz_number}{cap_number} — ej: M02 cap3 = "23"
    const interfazNum = parseInt(interfazId.replace("M", ""), 10) || 1;
    const coordenada = `${interfazNum}${capNum}`;

    const directrizSection = instruccionesPrevias?.trim()
      ? `\nDIRECTRIZ DEL AUTOR: "${instruccionesPrevias.trim()}"\nPrioridad absoluta. Mantener dentro de la autarquía de ${interfazId}.\n`
      : "";

    // Bloque de notas de evolución de capítulos anteriores (si el usuario activó la inyección)
    type NotasEvolucionItem = { coordenada: string; tipo: string; titulo: string; cuerpo: string };
    const notasEvolucionSection = (() => {
      const notas: NotasEvolucionItem[] = Array.isArray(notasEvolucionPrevias) ? notasEvolucionPrevias : [];
      if (notas.length === 0) return "";
      const lineas = notas.map((n: NotasEvolucionItem) =>
        `[${n.coordenada}] ${n.tipo.toUpperCase()}: ${n.titulo} — ${n.cuerpo}`
      ).join("\n");
      return `\nNOTAS DE EVOLUCIÓN PREVIAS (principios emergentes de capítulos anteriores — úsalos para profundizar y no contradecir lo ya establecido):\n${lineas}\n`;
    })();

    const vocabularioInterfaz = VOCABULARIO_INTERFAZ[interfazId] || "estructura, presión, peso, cimiento, grieta";

    const chapterCore = buildChapterContextCore({
      tituloLibro,
      interfazId,
      interfaz,
      subInterfazTitulo,
      subInterfazFalla,
      subInterfazDescripcion,
      capNum,
      coordenada,
      interfazNum,
      gradoLabel,
      creditosRef,
      densidadStr,
      dominiosProhibidos,
      vocabularioInterfaz,
      directrizSection,
      notasEvolucionSection,
      subInterfazTituloForZoom: subInterfazTitulo,
    });

    // Labels del Averiado y Portador por interfaz (para nombrarlos en los prompts genéricos)
    const AVERIADO_LABEL: Record<string, string> = {
      M01: "El Oculto / El Dependiente / El Superviviente (sin cimiento soberano)",
      M02: "El Estático / El Rutinario / El Agotado (sin cauce ni purga)",
      M03: "El Obrero de Subsistencia / El Cambiador de Horas / El Ejecutor Agobiado",
      M04: "El Oprimido / El Quejoso / El Rebelde sin Causa (sin sistema operativo propio)",
      M05: "El Indeciso / El Reactivo / El Dependiente (sin vértice de decisión)",
      M06: "El Parásito / El Dependiente / El Competidor (drenador de campo)",
      M07: "El Ciego / El Fanático / El Reactivo (sin lectura de patrones)",
      M08: "El Repetidor / El Acumulador / El Agotado (prisionero del bucle)",
      M09: "El Caótico / El Esclavo de la Tarea / El Fragmentado (sin arquitectura)",
      M10: "El Vacío Estéril / El Desconectado / El Buscador (miedo a la autoría)",
    };

    const PORTADOR_LABEL: Record<string, string> = {
      M01: "El Arquitecto / El Soberano / El Creador (con cimiento soberano activado)",
      M02: "El Maestro del Flujo / El Navegante / El Omnipresente (con cauce soberano)",
      M03: "El Diseñador de Valor / El Constructor de Sistemas / El Estratega de Poder",
      M04: "El Arquitecto de Normas / El Gobernante Sistémico / El Legislador Universal",
      M05: "El Estratega / El Ejecutor de Vector / El Vértice de Cambio",
      M06: "El Arquitecto de Equipos / El Maestro de Resonancia / El Gobernante de Redes",
      M07: "El Visionario / El Estratega de Campo / El Arquitecto de Realidades",
      M08: "El Visionario de Retornos / El Maestro del Tiempo / El Arquitecto de Eternidad",
      M09: "El Estratega de Sistemas / El Arquitecto de Realidades / El Motor del Territorio",
      M10: "El Catalizador / El Maestro del Vacío / El Soberano / El Origen",
    };

    const averiado = AVERIADO_LABEL[interfazId] || "El que opera sin el principio de la interfaz";
    const portador = PORTADOR_LABEL[interfazId] || "El que conoce y aplica el principio de la interfaz";
    const esC10Existencial = MODO_C10 === "existencial" && interfazId === "M10";

    // Sección de regeneración (si aplica)
    const buildCriterioSection = (carrilKey: "carril1" | "carril2" | "carril3") => {
      if (!criterioRegeneracion?.trim() || !contenidoActual) return "";
      return `\nREGENERACIÓN: El contenido del ${carrilKey} NO cumplió: "${criterioRegeneracion.trim()}"\nCONTENIDO ACTUAL: "${contenidoActual[carrilKey] || ""}"\nReescribe corrigiendo exactamente ese criterio.\n`;
    };

    const fichaText = getFichaText(interfazId);

    // ══════════════════════════════════════════════════════
    // FRAMEWORK DE POLARIZACIÓN DUAL (Cerebro Escritor v2)
    // Polo A — El Desplazado (sin sistema, sin cauce)
    // Polo B — El Soberano (con sistema, con interfaz activa)
    // Las Dos Puertas: Mensaje golpea → Lector inyecta → Maestro exige
    // ══════════════════════════════════════════════════════

    const promptC1 = interfazId === "M02"
      ? assembleCarrilPrompt(chapterCore, 1, interfazId, interfazNum, `${buildCriterioSection("carril1")}

TAREA: Escribe ÚNICAMENTE el TERRITORIO 1 — CONQUISTA DEL MENSAJE de este capítulo.
LONGITUD OBLIGATORIA: exactamente 1.000 palabras (mínimo 950, máximo 1.050). Cuenta las palabras.

TERRITORIO 1 — LA CONQUISTA DEL MENSAJE: DIAGNÓSTICO DEL AVERIADO (Zoom 1/3 sobre "${subInterfazTitulo}")
Tú eres un escáner de alta resolución. No describes al personaje — lo confrontas con su propia anatomía técnica.
PROHIBIDO ABSOLUTO en este territorio: cualquier sistema, aplicación, plataforma o herramienta (nombrada o implícita),
el Espejo, el Maestro, la Consola, créditos, colores cromáticos.
PROHIBIDO ABSOLUTO: baño, ducha física, agua, mojarse, higiene. La Ducha Mental es papel y pluma — NUNCA agua.
PROHIBIDO ABSOLUTO: cortisol, dopamina, serotonina, sistema nervioso, hormonas, neurociencia, psicologismos.
PROHIBIDO: motivar, inspirar, consolar. Este texto quita la máscara — no pone curita.
Objetivo: crear deseo de UBICUIDAD — el Averiado siente que existe un estado de caudal al que no puede acceder sin purga.

USO OBLIGATORIO DE LA FICHA TÉCNICA DE ACABADO (ver sección ══ FICHA TÉCNICA DE ACABADO ══ arriba):
— MATERIAL DE OBSTRUCCIÓN: El material físico-simbólico especificado en la Ficha bajo "MATERIAL DE OBSTRUCCIÓN" define la textura del bloqueo del Averiado. La experiencia corporal del Territorio A debe evocar ese material implícita o explícitamente: su peso, su textura, su efecto sobre el cauce. Lee el grado y el tipo directamente de la Ficha.
— SEDUCCIÓN AL EXTRAÑO (Canal Mensaje): El gancho y la frase de seducción de la Ficha para el Extraño anclan el tono de diagnóstico del Territorio A. El argumento central debe resonar con ese gancho — sin citarlo literalmente.
— SOLUCIÓN AUTÁRQUICA: Los resultados observables del Territorio B (El Portador) reflejan la solución autárquica descrita en la Ficha para M02. No nombres el sistema — describe el estado observable de quien opera desde el caudal soberano.

VOCABULARIO OBLIGATORIO: ${vocabularioInterfaz}.
La fisicalidad de la falla = sensación de estancamiento, sequía estructural, obstrucción del cauce, presión en el bajo vientre. SIN biología.

ESTRUCTURA OBLIGATORIA (CONQUISTA DEL MENSAJE — dos territorios, ~500 palabras cada uno):

TERRITORIO A — EL AVERIADO EN SU FRECUENCIA 2 (~500 palabras):
Confronta al Averiado atacando sus 10 coordenadas de identidad (2.1-2.10). No las menciones por número —
úsalas como balas de diagnóstico integradas en el texto. El ataque es técnico, no emocional.
— 2.1 Subsistencia crítica: cómo vive en modo de defensa constante del poco caudal que tiene.
— 2.2 Pensamiento de precariedad: la lógica suma-cero que bloquea su cauce.
— 2.3 Esfuerzo lineal en "${subInterfazTitulo}": cómo su forma de trabajar agota sin fluir.
— 2.4 Control del detalle: la micro-gestión que obstruye la tubería.
— 2.5 Tensión en el bajo vientre: la señal física que su cuerpo-tubería envía constantemente.
— 2.6 Falsa justicia del sufrimiento: por qué cree que el esfuerzo doloroso es mérito.
— 2.7 El esfuerzo como sacrificio: cómo esta creencia lo mantiene en la frecuencia del desgaste.
— 2.8 Seguridad estática: el miedo a ampliar el canal porque el vacío lo aterroriza.
— 2.9 Intercambios de miedo: cómo sus relaciones drenan en lugar de fluir.
— 2.10 Futuro como amenaza: el horizonte como factura, no como cauce que se amplía.
Termina con: el costo real acumulado de operar sin purga. Tiempo en desgaste, caudal perdido, sequía instalada.

TERRITORIO B — EL PORTADOR QUE CONOCE EL PRINCIPIO (~500 palabras):
Mismo ser humano, misma situación de vida. La diferencia: ejecuta el protocolo de purga con papel y pluma.
El protocolo de purga en papel y pluma no es sugerencia — es la única forma de drenar la estática de la Frecuencia 2 (sin nombrar marca ni app).
— NO menciones ningún sistema ni herramienta por nombre. Describe solo los RESULTADOS OBSERVABLES del que purga.
— Cómo actúa diferente en la misma situación de "${subInterfazTitulo}". Qué caudal genera. Qué costo evita.
— El bajo vientre desbloqueado: la sensación física de cauce libre vs. tubería contraída.
— La decisión que solo puede tomar quien ha vaciado la carga del subconsciente en papel primero.
— Termina con la sentencia que separa: no es talento, no es suerte — es la diferencia entre el que purga y el que acumula estática.

RESET_STYLE: AUTARQUIA_TECNICA — si el texto deriva hacia lo emocional, positivo o vago, vuelve a presión de caudal y obstrucción estructural.

Escribe ahora los 1.000 palabras completos del Territorio 1. Solo texto narrativo continuo, sin etiquetas ni marcadores.`)
      : assembleCarrilPrompt(chapterCore, 1, interfazId, interfazNum, `${buildCriterioSection("carril1")}

TAREA: Escribe ÚNICAMENTE el CARRIL 1 — EL MENSAJE de este capítulo.
LONGITUD OBLIGATORIA: exactamente 1.000 palabras (mínimo 950, máximo 1.050). Cuenta las palabras.

CARRIL 1 — EL MENSAJE: EL PRINCIPIO UNIVERSAL (Zoom 1/3 sobre "${subInterfazTitulo}")
Tú eres un observador clínico externo. El lector no conoce ningún sistema.
PROHIBIDO ABSOLUTO en este carril: cualquier sistema, aplicación, plataforma o herramienta (nombrada o implícita), el Espejo, el Maestro, la Consola, créditos, colores cromáticos.
PROHIBIDO ABSOLUTO: cortisol, dopamina, serotonina, sistema nervioso, hormonas, mecanismo biológico, neurociencia, psicologismos.
Este carril toca ÚNICAMENTE LA NECESIDAD HUMANA UNIVERSAL — sin sistema, sin solución técnica nombrada.
Objetivo: crear deseo de UBICUIDAD — el lector siente que existe un mundo de ventaja estructural al que no pertenece.

USO OBLIGATORIO DE LA FICHA TÉCNICA DE ACABADO (ver sección ══ FICHA TÉCNICA DE ACABADO ══ arriba):
— MATERIAL DE OBSTRUCCIÓN: El material físico-simbólico definido en la Ficha es la fisicalidad del bloqueo del Polo A. Úsalo para describir la experiencia corporal y estructural del Averiado (textura, densidad, peso, resistencia). El nombre del material debe aparecer de forma implícita o explícita en el Polo A.
— SEDUCCIÓN AL EXTRAÑO (Canal Mensaje): El gancho y la frase de seducción de la Ficha para el Extraño anclan el tono de apertura de este carril. El argumento central del Polo A debe resonar con ese gancho — sin citarlo literalmente.
— SOLUCIÓN AUTÁRQUICA: Los resultados observables del Polo B reflejan la solución autárquica descrita en la Ficha. No nombres el sistema — describe el estado observable de quien ya instaló ese principio.

VOCABULARIO OBLIGATORIO DE ESTE CARRIL: ${vocabularioInterfaz}.
La fisicalidad de la falla = experiencia corporal y estructural (tensión, rigidez, peso, sequía, grieta). SIN biología.

ESTRUCTURA OBLIGATORIA (dos polos, ~500 palabras cada uno):

POLO A — ${averiado.toUpperCase()} (~500 palabras):
${esC10Existencial
  ? `Describe al ser humano con el VACÍO ESTÉRIL activo — no ineficiencia operativa. Su inacción no es pereza: es miedo a ser la fuente de su propia realidad.
— Qué conducta exterior tiene: qué aplaza, qué delega, qué busca afuera que ya tiene adentro. Conducta observable pura.
— Cómo se siente esa ausencia de voltaje existencial en el cuerpo: la nada dolorosa, el campo de sentido apagado, el peso del no-inicio.
— El lenguaje es el vocabulario de ${interfazId}: ${vocabularioInterfaz}. No salir de ese campo semántico.
— Termina con la medición clínica del costo existencial real: no tiempo perdido ni dinero — sino potencial de autoría nunca activado.
— Sin soluciones, sin consejos, sin sistema. Solo el diagnóstico observacional del vacío estéril.`
  : `Describe al ser humano con la falla "${subInterfazTitulo}" activa. Solo conducta exterior observable.
— Qué comportamiento concreto tiene en su vida diaria: qué dice, qué evita, qué repite. Conducta, no pensamiento abstracto.
— Cómo se siente esa falla en el cuerpo: tensión física localizable, rigidez, peso, presión, sequía estructural. Experiencia corporal — sin explicación biológica ni psicológica.
— El lenguaje es el vocabulario de ${interfazId}: ${vocabularioInterfaz}. No salir de ese campo semántico.
— Termina con la medición clínica del costo real acumulado: tiempo perdido, dinero no generado, energía disuelta.
— Sin soluciones, sin consejos, sin sistema. Solo el diagnóstico observacional de quien vive en esa fisicalidad.`}

POLO B — ${portador.toUpperCase()} (~500 palabras):
Mismo ser humano, mismo contexto de vida. La diferencia: opera desde el principio técnico activado de la ${interfazId}.
— NO menciona ningún sistema ni herramienta. Solo describe los RESULTADOS OBSERVABLES de quien conoce el principio.
— Qué hace diferente en la misma situación cotidiana. Qué decisión toma. Qué costo evita. Descripción conductual pura.
— El lenguaje de este polo usa el vocabulario soberano de la arquitectura específica descrita arriba para ${interfazId}.
— No es motivación ni éxito. Es precisión estructural: opera desde el código activado de la Coordenada ${coordenada}.
— Termina con la sentencia que separa a los dos: no es talento, no es disciplina — es conocer el principio técnico de la ${interfazId}.

Escribe ahora los 1.000 palabras completos del Carril 1. Solo texto narrativo continuo, sin etiquetas ni marcadores.`);

    const promptC2 = interfazId === "M02"
      ? assembleCarrilPrompt(chapterCore, 2, interfazId, interfazNum, `${buildCriterioSection("carril2")}

TAREA: Escribe ÚNICAMENTE el TERRITORIO 2 — CONQUISTA DEL LECTOR de este capítulo.
LONGITUD OBLIGATORIA: exactamente 1.000 palabras (mínimo 950, máximo 1.050). Cuenta las palabras.

TERRITORIO 2 — CONQUISTA DE LA INTERFAZ: EL LECTOR FRENTE A LA CONSOLA (Zoom 2/3 sobre "${subInterfazTitulo}")
Hablas directamente al lector. Usa "tú" directo con precisión técnica, no motivacional.
Terminología obligatoria: caudal, cauce, canal, portador, Chófer, Pasajero, Ducha Mental (papel y pluma), Consola, Silueta, Código 21.
PROHIBIDO ABSOLUTO: baño, ducha de agua, bañarse, mojarse. La Ducha Mental = vaciado en papel — NUNCA agua física.
PROHIBIDO: colores cromáticos (reservados al Territorio 3), lenguaje motivacional, psicologismos, biología.
Objetivo: crear deseo de PERTENENCIA — el lector ve que existe el usuario que opera la Consola y el que solo lee.
La Consola de Sistemicar es la única interfaz que puede mostrar la Silueta del lector — la representación visual de su falla.
Al ingresar el Código 21, la Consola activa la Silueta: el cuerpo humano en pantalla, con la zona del cauce obstruido iluminada.

USO OBLIGATORIO DE LA FICHA TÉCNICA DE ACABADO (ver sección ══ FICHA TÉCNICA DE ACABADO ══ arriba):
— SEDUCCIÓN AL LECTOR (Canal Portador): La frase y el gancho de seducción de la Ficha para el Lector definen el eje de PERTENENCIA de este territorio. El Territorio Negativo debe hacer sentir al lector exactamente lo que esa frase diagnóstica — sin citarla textualmente.
— LA BRECHA (CICLO DE VIDA DEL POLO): El Territorio Negativo recorre el arco de Punto A a Punto B de colapso descrito en la Ficha. El Territorio Positivo introduce el Punto A de revelación (el lector descubre que existe un protocolo real).
— CLIENTE ESPECÍFICO C22 (Lector): El perfil del cliente lector para M02 definido en la Ficha orienta el tipo de escenas concretas y los patrones que el Chófer repite. El personaje del lector debe coincidir con ese perfil.

ESTRUCTURA OBLIGATORIA (CONQUISTA DEL LECTOR — dos territorios + cierre técnico):

TERRITORIO NEGATIVO — EL LECTOR SIN CONSOLA (~450 palabras):
El lector que CONOCE el principio de la Ducha Mental pero NO registra su carga en papel ni opera la Consola.
Sabe que el cauce se obstruye, pero sigue intentando resolver "${subInterfazTitulo}" con voluntad, no con protocolo.
— Qué siente en el cuerpo-tubería cuando la falla se activa: estancamiento en el bajo vientre, tensión en el cauce.
— El Chófer opera desde el subconsciente sin purga: qué patrones automáticos de Frecuencia 2 repite.
— Sin la Consola, el lector no puede ver dónde está la obstrucción — solo siente la presión acumulada.
— Escena concreta: una decisión financiera, una conversación de intercambio, un momento de contención de caudal.
  Cómo actúa cuando el hardware de Código 2 está sin limpiar — la micro-gestión, la defensa, la sequía.
— Termina: la pregunta técnica que su sistema no puede responder sin la Silueta. Sin la Consola, el lector opera a ciegas.

TERRITORIO POSITIVO — EL LECTOR CON CONSOLA Y SILUETA (~450 palabras):
El mismo lector que ejecuta la Ducha Mental en papel Y activa la Consola. Ingresa el Código 21.
En la pantalla de la Consola aparece su Silueta — el cuerpo humano con la zona pélvica del Portador iluminada.
No es metáfora. Es la representación técnica de dónde vive la falla "${subInterfazTitulo}" en su hardware físico.
— EJE MENTAL (Código 2): ve la obstrucción específica de su cauce, no una sensación vaga. El mapa es la pantalla.
— EJE EMOCIONAL (Código 2): la carga que vació en papel ya no opera como estática. La tubería está despejada.
— EJE FÍSICO (Código 2): el bajo vientre desbloqueado — la sensación de caudal libre en el centro de gravedad del Portador.
— Misma escena concreta del polo negativo: ahora CON la Silueta activa. Misma decisión financiera, mismo intercambio.
  La diferencia no es actitud — es que el hardware fue limpiado y la Consola mostró dónde estaba la obstrucción.
— La Ducha Mental no es ritual: es el protocolo de vaciado en papel que permite que la Silueta lea la falla real.

CIERRE TÉCNICO (~100 palabras):
El patrón de estática del Código 2 que "${subInterfazTitulo}" activa cuando el caudal no fluye.
Termina con la pregunta técnica que solo la Silueta en la Consola puede responder para esta falla específica.
RESET_STYLE: AUTARQUIA_TECNICA — si el texto deriva hacia lo emocional o positivo, vuelve a presión y flujo de caudal.

Escribe ahora los 1.000 palabras completos del Territorio 2. Solo texto narrativo continuo, sin etiquetas ni marcadores.`)
      : assembleCarrilPrompt(chapterCore, 2, interfazId, interfazNum, `${buildCriterioSection("carril2")}

TAREA: Escribe ÚNICAMENTE el CARRIL 2 — EL LECTOR / HARDWARE de este capítulo.
LONGITUD OBLIGATORIA: exactamente 1.000 palabras (mínimo 950, máximo 1.050). Cuenta las palabras.

CARRIL 2 — EL LECTOR: EL USUARIO DE LA CONSOLA (Zoom 2/3 sobre "${subInterfazTitulo}")
Hablas directamente al lector como usuario de SISTEMICAR. Usa "tú" directo.
Terminología obligatoria: voltaje, frecuencia, estática, hardware, Chófer, Pasajero, Ducha Mental, Consola, 3 Ejes.
Terminología adicional obligatoria de la ${interfazId}: ${vocabularioInterfaz}.
PROHIBIDO: colores cromáticos (reservados al Carril 3), lenguaje motivacional, consejos genéricos.
PROHIBIDO: psicologismos, biología, neurociencia (mismo criterio que Carril 1).
Objetivo: crear deseo de PERTENENCIA — el lector distingue entre conocer el principio y operar con los 3 Ejes sincronizados para ${interfazId}.

USO OBLIGATORIO DE LA FICHA TÉCNICA DE ACABADO (ver sección ══ FICHA TÉCNICA DE ACABADO ══ arriba):
— SEDUCCIÓN AL LECTOR (Canal Portador): La frase y el gancho de seducción de la Ficha para el Lector definen el eje de PERTENENCIA de este carril. El Polo Negativo debe hacer sentir al lector exactamente lo que esa frase diagnóstica — sin citarla textualmente.
— LA BRECHA (CICLO DE VIDA DEL POLO): El Polo Negativo recorre el arco de Punto A a Punto B de colapso descrito en la Ficha. El Polo Positivo introduce el Punto A de revelación (no el polo positivo completo — ese es el Carril 3).
— CLIENTE ESPECÍFICO C12 (Lector): El perfil del cliente lector definido en la Ficha orienta el tipo de escenas concretas y los patrones que el Chófer repite. El personaje del lector en este carril debe coincidir con ese perfil.

ESTRUCTURA OBLIGATORIA (dos polos + cierre técnico):

POLO NEGATIVO — ${averiado.toUpperCase()} SIN CONSOLA (~450 palabras):
El lector que CONOCE el principio de la ${interfazId} pero NO lo aplica con constancia en la Consola.
No es el ignorante — es el que sabe pero falla en la ejecución de la Coordenada ${coordenada}.
— Qué siente en el cuerpo cuando la falla "${subInterfazTitulo}" se activa: voltaje bajo, estática, tensión acumulada.
— Qué pensamientos repite el Chófer automáticamente. Qué decisiones evita el Pasajero por la inconsistencia.
— La estática acumulada por no aplicar la Ducha Mental: cómo opera como piloto automático porque el hardware no fue limpiado hoy.
— Escena sensorial concreta (ducha de mañana, reunión de trabajo, momento en familia): cómo actúa con el hardware sucio.
— Termina: la pregunta técnica que su sistema no puede responder porque el Chófer opera desde estática sin limpiar.

POLO POSITIVO — ${portador.toUpperCase()} CON CONSOLA ACTIVA (~450 palabras):
El mismo lector que aplica la Ducha Mental y sincroniza sus 3 Ejes (Mental, Emocional, Físico) con la Consola para ${interfazId}.
Este es el polo que diferencia al usuario casual del usuario de precisión.
— EJE MENTAL (${interfazId}): qué claridad específica tiene este usuario sobre la falla "${subInterfazTitulo}". Cómo ve el patrón sin confundirlo.
— EJE EMOCIONAL (${interfazId}): qué peso o carga ya no acumula porque la Ducha Mental procesó la estática antes de que se instalara.
— EJE FÍSICO (${interfazId}): qué sensación corporal concreta indica que el hardware está limpio para la Coordenada ${coordenada}.
— Escena sensorial IDÉNTICA al polo negativo: ahora CON los 3 Ejes sincronizados para la falla específica de ${interfazId}.
— La Ducha Mental no es un ritual espiritual — es el protocolo de sincronización triaxial que permite operar desde el código técnico de ${interfazId}.

CIERRE TÉCNICO (~100 palabras):
El patrón de estática exacto de la Coordenada ${coordenada} que produce esta falla cuando los 3 Ejes no están sincronizados.
Termina con la pregunta técnica que solo la Consola puede responder para esta falla específica.

Escribe ahora los 1.000 palabras completos del Carril 2. Solo texto narrativo continuo, sin etiquetas ni marcadores.`);

    const promptC3 = interfazId === "M02"
      ? assembleCarrilPrompt(chapterCore, 3, interfazId, interfazNum, `${buildCriterioSection("carril3")}

TAREA: Escribe ÚNICAMENTE el TERRITORIO 3 — CONQUISTA DEL MAESTRO de este capítulo.
LONGITUD OBLIGATORIA: exactamente 1.000 palabras (mínimo 950, máximo 1.050). Cuenta las palabras.

TERRITORIO 3 — CONQUISTA DE LA AUTORIDAD: EL DOCTOR IA Y LA FIANZA (Zoom 3/3 sobre "${subInterfazTitulo}")
El Doctor IA es el único operador capaz de leer el Código de Interferencia en la Silueta que la Consola reveló.
CODIFICACIÓN CROMÁTICA: el color "${colorInterfaz}" (naranja del Código 2 — flujo y activación) aparece ÚNICAMENTE
en 1-2 momentos de máximo peso del polo positivo. No antes. Es el color del caudal desbloqueado.
PROHIBIDO: condescendencia, motivación, consejos de coach, lenguaje publicitario.
PROHIBIDO ABSOLUTO: baño, ducha de agua, mojarse. La Ducha Mental ya fue ejecutada en papel (Territorios 1 y 2).
Objetivo: crear deseo de VALIDACIÓN — el crédito no es una compra, es la FIANZA DE LIBERTAD del Portador.

USO OBLIGATORIO DE LA FICHA TÉCNICA DE ACABADO (ver sección ══ FICHA TÉCNICA DE ACABADO ══ arriba):
— SEDUCCIÓN AL USUARIO (Canal Operador): La frase y el gancho de seducción de la Ficha para el Usuario definen el eje de AUTORIDAD de este territorio. El mandato final debe resonar con ese gancho de forma orgánica.
— MÉTODO DE INTERVENCIÓN (Doctor IA): El protocolo técnico exacto descrito en la Ficha bajo "MÉTODO DE INTERVENCIÓN" es el contenido del Territorio Positivo. Sigue ese método: nombre del protocolo, ejecución técnica y resultado en la Silueta del M02.
— NOTA DEL AGENTE (ACABADO DE OTRO PLANETA): El lenguaje de alta densidad de la Nota del Agente al final de la Ficha debe impregnar el MANDATO FINAL. Usa ese tono de ingeniería extrema — sin copiar literalmente.

CONQUISTA DEL MAESTRO — ZOOM 3/3:
El lector ya ejecutó el protocolo en papel (Territorio 1) y vio su Silueta en la Consola (Territorio 2).
Ahora está en el límite: sabe dónde está la obstrucción de su caudal, pero no puede removerla solo.
La Silueta le mostró la zona. El Doctor IA tiene la herramienta de drenaje quirúrgico.

ESTRUCTURA OBLIGATORIA:

TERRITORIO NEGATIVO — EL PORTADOR QUE INTENTA SOLO (~300 palabras):
El lector que ya purgo en papel y vio su Silueta, pero intenta resolver "${subInterfazTitulo}" sin el Doctor IA.
— La Silueta le mostró la obstrucción — pero leer el escáner no es lo mismo que ejecutar el drenaje.
— El límite técnico del autodiagnóstico en el Código 2: qué no puede drenar el Portador sin intervención del Doctor IA.
— Nomenclatura clínica: Código de Interferencia de Caudal, material detectado (${gradoMaterial}), densidad del bloqueo.
— Qué sigue obstruyendo el canal cuando el Portador opera sin la intervención: la microfuga que la voluntad no puede sellar.
— Habla como un ingeniero hidráulico que lee el escáner del canal — no como un coach que acompaña al río.

TERRITORIO POSITIVO — LA INTERVENCIÓN DEL DOCTOR IA (~300 palabras):
Lo que el Doctor IA ejecuta cuando el Portador entrega la fianza y accede al diagnóstico completo del Código 2.
— El Doctor IA lee el Código de Interferencia específico de "${subInterfazTitulo}" que la Silueta reveló.
— Protocolo de Drenaje de Caudal: la intervención técnica exacta que solo el Doctor IA puede ejecutar en esta Coordenada.
— Incluye: Verbo de Flujo del Código 2, Recurso de Canal disponible en la Coordenada ${coordenada}, Herramienta del ${gradoLabel}.
— El color "${colorInterfaz}" aparece aquí como sello de autoridad — el naranja del flujo activado. Con peso total.
— Este es el momento donde el Portador deja de ser Averiado: la intervención del Doctor IA drena lo que el papel no pudo.

MANDATO FINAL + FIANZA (~400 palabras):
El mandato clínico que cierra el territorio. Sentencia técnica. Sin suavizantes. Sin exclamaciones.
— La Silueta reveló la obstrucción. El papel la nombró. Solo el Doctor IA puede ejecutar el drenaje de Código 2.
— Describe qué resuelve la intervención completa a ${creditosRef} créditos (${gradoLabel}): no beneficios — el costo de NO drena el canal.
— El crédito es la FIANZA DE LIBERTAD del Portador: no es una compra, es el pago de salida de la Frecuencia 2.
  Sin esa fianza, el Portador sigue siendo Averiado — con la Silueta como evidencia permanente de su obstrucción.
— Sistemicar es el único sistema operativo capaz de leer la Silueta y ejecutar el protocolo de drenaje.
  Sin Sistemicar, el papel es solo una lista. Con Sistemicar, el papel es el primer paso del protocolo quirúrgico.
— Cierre con sentencia definitiva: sin anuncio, sin llamada obvia. El último párrafo es un sello de ingeniería.
RESET_STYLE: AUTARQUIA_TECNICA — si el texto deriva hacia lo emocional o positivo, vuelve a presión de caudal y drenaje técnico.

Escribe ahora los 1.000 palabras completos del Territorio 3. Solo texto narrativo continuo, sin etiquetas ni marcadores.`)
      : assembleCarrilPrompt(chapterCore, 3, interfazId, interfazNum, `${buildCriterioSection("carril3")}

TAREA: Escribe ÚNICAMENTE el CARRIL 3 — EL MAESTRO de este capítulo.
LONGITUD OBLIGATORIA: exactamente 1.000 palabras (mínimo 950, máximo 1.050). Cuenta las palabras.

CARRIL 3 — EL MAESTRO: LA INTERVENCIÓN DEL DOCTOR IA (Zoom 3/3 sobre "${subInterfazTitulo}")
El Doctor IA es la ÚNICA solución técnica para esta falla. Habla con autoridad clínica absoluta.
CODIFICACIÓN CROMÁTICA: el color "${colorInterfaz}" (color del ${interfazId}) aparece ÚNICAMENTE en 1-2 momentos de máximo peso del polo positivo. No antes. Es el sello de autoridad del Doctor IA.
PROHIBIDO: condescendencia, motivación, consejos de coach, lenguaje publicitario.
Objetivo: crear deseo de VALIDACIÓN — el crédito no es una compra, es la FIANZA DE ACCESO al principio técnico de la ${interfazId}.

USO OBLIGATORIO DE LA FICHA TÉCNICA DE ACABADO (ver sección ══ FICHA TÉCNICA DE ACABADO ══ arriba):
— SEDUCCIÓN AL USUARIO (Canal Operador): La frase y el gancho de seducción de la Ficha para el Usuario definen el eje de AUTORIDAD de este carril. El mandato final del Carril 3 debe resonar con ese gancho de forma orgánica.
— MÉTODO DE INTERVENCIÓN (Doctor IA): El protocolo técnico exacto descrito en la Ficha bajo "MÉTODO DE INTERVENCIÓN" es el contenido del Polo Positivo. Sigue ese método: nombre del protocolo, ejecución técnica y resultado en la Silueta.
— NOTA DEL AGENTE (ACABADO DE OTRO PLANETA): El lenguaje de alta densidad de la Nota del Agente al final de la Ficha debe impregnar el MANDATO FINAL. Usa ese tono de ingeniería extrema — sin copiar literalmente.
— SOLUCIÓN AUTÁRQUICA: El cierre del carril nombra (de forma implícita o explícita) la solución autárquica de la Ficha como el resultado neto de la intervención del Doctor IA.

MATRIZ DE SEGREGACIÓN — ZOOM 3/3:
Este carril muestra la diferencia entre lo que el usuario INTENTA RESOLVER SOLO vs. lo que la INTERVENCIÓN QUIRÚRGICA del Doctor IA resuelve para ${interfazId}.
El usuario ya conoce el principio (Carril 1) y la Ducha Mental (Carril 2). Aquí llega al límite de lo que puede hacer sin el Doctor IA.

ESTRUCTURA OBLIGATORIA:

POLO NEGATIVO — ${averiado.toUpperCase()} QUE INTENTA SOLO (~300 palabras):
El usuario que ya hizo la Ducha Mental y conoce el principio de ${interfazId}, pero intenta resolver la falla "${subInterfazTitulo}" sin el diagnóstico del Doctor IA.
— Lo que el usuario ve cuando mira su propia falla sin el escáner clínico: solo la superficie, no el núcleo de interferencia.
— El Doctor IA expone el límite del autodiagnóstico en ${interfazId}: qué no puede ver el usuario solo aunque conozca el principio.
— Nomenclatura clínica: Código de interferencia, material detectado (${gradoMaterial}), densidad del bloqueo específico de ${interfazId}.
— El costo técnico de operar sin diagnóstico de precisión: el sistema sigue operando en pérdida invisible.
— Habla como un ingeniero que lee un escáner, no como un coach que acompaña.

POLO POSITIVO — ${portador.toUpperCase()} CON INTERVENCIÓN QUIRÚRGICA (~300 palabras):
Lo que el Doctor IA ejecuta cuando el usuario entrega el crédito y accede al diagnóstico completo de ${interfazId}.
— Protocolo técnico exacto de intervención para "${subInterfazTitulo}": la herramienta que solo el Doctor IA puede ejecutar.
— Incluye: Verbo de Poder de ${interfazId}, Recurso Local disponible en la Coordenada ${coordenada}, Herramienta del ${gradoLabel}.
— El color "${colorInterfaz}" aparece aquí por primera vez como sello de autoridad de la ${interfazId} — con peso total.
— Este es el núcleo técnico del capítulo: la intervención del Doctor IA hace lo que el usuario no puede hacer solo.

MANDATO FINAL + CTA (~400 palabras):
El mandato clínico que cierra el capítulo. Sentencia técnica. Sin suavizantes.
— Describe qué revela el Diagnóstico completo a ${creditosRef} créditos (${gradoLabel}): qué ve el sistema que el usuario no puede ver solo.
— Describe qué resuelve la Calibración completa: no la lista de beneficios, sino el costo del error de NO actuar.
— El crédito se presenta como la FIANZA DE ACCESO al grupo de los que poseen la ventaja técnica de la Coordenada ${coordenada}.
— Cierre orgánico y clínico: sin anuncio, sin exclamaciones, sin llamadas a la acción obvias.
— Última oración: una sentencia definitiva que cierra el capítulo como un sello.

Escribe ahora los 1.000 palabras completos del Carril 3. Solo texto narrativo continuo, sin etiquetas ni marcadores.`);

    // Ejecutar las 3 llamadas de forma secuencial para evitar saturación de rate limit
    const estimatedTokensC1 = estimatePromptChars(promptC1);
    const estimatedTokensC2 = estimatePromptChars(promptC2);
    const estimatedTokensC3 = estimatePromptChars(promptC3);
    console.log(`[taller-libros] Cerebro Router — prompt ~tokens C1: ${estimatedTokensC1}, C2: ${estimatedTokensC2}, C3: ${estimatedTokensC3} (interfaz=${interfazId}, cap=${subInterfazId})`);
    const rawC1 = await callGemini(promptC1, 8000);
    await new Promise(r => setTimeout(r, 500));
    const rawC2 = await callGemini(promptC2, 8000);
    await new Promise(r => setTimeout(r, 500));
    const rawC3 = await callGemini(promptC3, 8000);

    const cleanCarril = (raw: string) => raw.trim().replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
    let carril1 = cleanCarril(rawC1);
    let carril2 = cleanCarril(rawC2);
    let carril3 = cleanCarril(rawC3);

    if (!carril1 || !carril2 || !carril3) {
      return res.status(500).json({ error: "Respuesta IA incompleta — uno o más carriles vacíos" });
    }

    // ── Ficha de Acabado vocabulary audit + auto-regeneration ──
    type CarrilAuditResult = { materialFound: boolean; ganchoFound: boolean; passed: boolean; retried: boolean };
    const fichaAudit: Record<string, CarrilAuditResult> = {};
    const fichaMarkers = extractFichaMarkers(fichaText);

    // carril1 — Canal Mensaje (Extraño)
    {
      const audit = checkCarrilFichaVocab(carril1, fichaMarkers.materialTerms, fichaMarkers.ganchoC1);
      if (!audit.passed) {
        console.info("[FichaAudit] auto-regeneration triggered", {
          interfazId,
          subInterfazTitulo,
          carrilKey: "carril1",
          missingMaterial: !audit.materialFound,
          missingGancho: !audit.ganchoFound,
          retriedPassed: false,
        });
        try {
          const regenPrompt = buildFichaRegenPrompt(promptC1, carril1, fichaMarkers, fichaMarkers.ganchoC1);
          const rawRegen = await callGemini(regenPrompt, 8000);
          const regenText = cleanCarril(rawRegen);
          if (regenText) carril1 = regenText;
          const recheck = checkCarrilFichaVocab(carril1, fichaMarkers.materialTerms, fichaMarkers.ganchoC1);
          fichaAudit.carril1 = { ...recheck, retried: true };
          console.info("[FichaAudit] auto-regeneration result", {
            interfazId,
            subInterfazTitulo,
            carrilKey: "carril1",
            missingMaterial: !recheck.materialFound,
            missingGancho: !recheck.ganchoFound,
            retriedPassed: recheck.passed,
          });
        } catch {
          fichaAudit.carril1 = { ...audit, retried: true };
          console.info("[FichaAudit] auto-regeneration result", {
            interfazId,
            subInterfazTitulo,
            carrilKey: "carril1",
            missingMaterial: !audit.materialFound,
            missingGancho: !audit.ganchoFound,
            retriedPassed: false,
          });
        }
      } else {
        fichaAudit.carril1 = { ...audit, retried: false };
      }
    }

    // carril2 — Canal Portador (Lector)
    {
      const audit = checkCarrilFichaVocab(carril2, fichaMarkers.materialTerms, fichaMarkers.ganchoC2);
      if (!audit.passed) {
        console.info("[FichaAudit] auto-regeneration triggered", {
          interfazId,
          subInterfazTitulo,
          carrilKey: "carril2",
          missingMaterial: !audit.materialFound,
          missingGancho: !audit.ganchoFound,
          retriedPassed: false,
        });
        try {
          const regenPrompt = buildFichaRegenPrompt(promptC2, carril2, fichaMarkers, fichaMarkers.ganchoC2);
          const rawRegen = await callGemini(regenPrompt, 8000);
          const regenText = cleanCarril(rawRegen);
          if (regenText) carril2 = regenText;
          const recheck = checkCarrilFichaVocab(carril2, fichaMarkers.materialTerms, fichaMarkers.ganchoC2);
          fichaAudit.carril2 = { ...recheck, retried: true };
          console.info("[FichaAudit] auto-regeneration result", {
            interfazId,
            subInterfazTitulo,
            carrilKey: "carril2",
            missingMaterial: !recheck.materialFound,
            missingGancho: !recheck.ganchoFound,
            retriedPassed: recheck.passed,
          });
        } catch {
          fichaAudit.carril2 = { ...audit, retried: true };
          console.info("[FichaAudit] auto-regeneration result", {
            interfazId,
            subInterfazTitulo,
            carrilKey: "carril2",
            missingMaterial: !audit.materialFound,
            missingGancho: !audit.ganchoFound,
            retriedPassed: false,
          });
        }
      } else {
        fichaAudit.carril2 = { ...audit, retried: false };
      }
    }

    // carril3 — Canal Operador (Usuario/Maestro)
    {
      const audit = checkCarrilFichaVocab(carril3, fichaMarkers.materialTerms, fichaMarkers.ganchoC3);
      if (!audit.passed) {
        console.info("[FichaAudit] auto-regeneration triggered", {
          interfazId,
          subInterfazTitulo,
          carrilKey: "carril3",
          missingMaterial: !audit.materialFound,
          missingGancho: !audit.ganchoFound,
          retriedPassed: false,
        });
        try {
          const regenPrompt = buildFichaRegenPrompt(promptC3, carril3, fichaMarkers, fichaMarkers.ganchoC3);
          const rawRegen = await callGemini(regenPrompt, 8000);
          const regenText = cleanCarril(rawRegen);
          if (regenText) carril3 = regenText;
          const recheck = checkCarrilFichaVocab(carril3, fichaMarkers.materialTerms, fichaMarkers.ganchoC3);
          fichaAudit.carril3 = { ...recheck, retried: true };
          console.info("[FichaAudit] auto-regeneration result", {
            interfazId,
            subInterfazTitulo,
            carrilKey: "carril3",
            missingMaterial: !recheck.materialFound,
            missingGancho: !recheck.ganchoFound,
            retriedPassed: recheck.passed,
          });
        } catch {
          fichaAudit.carril3 = { ...audit, retried: true };
          console.info("[FichaAudit] auto-regeneration result", {
            interfazId,
            subInterfazTitulo,
            carrilKey: "carril3",
            missingMaterial: !audit.materialFound,
            missingGancho: !audit.ganchoFound,
            retriedPassed: false,
          });
        }
      } else {
        fichaAudit.carril3 = { ...audit, retried: false };
      }
    }

    // ── Auditoría de contaminación (Carril 1 sin Consola/Doctor; Carril 2 sin Doctor/créditos) ──
    type ContaminationAuditResult = { passed: boolean; violations: string[]; retried: boolean };
    const contaminationAudit: Record<string, ContaminationAuditResult> = {};

    const tryDecontaminate = async (
      carrilNum: 1 | 2,
      current: string,
      basePrompt: string
    ): Promise<string> => {
      const audit = auditCarrilContamination(carrilNum, current);
      if (audit.passed) return current;
      console.info("[RouterAudit] contaminación — regenerando", {
        interfazId,
        subInterfazTitulo,
        carril: carrilNum,
        violations: audit.violations,
      });
      try {
        const regenPrompt = basePrompt + buildContaminationRegenSuffix(carrilNum, audit.violations);
        const raw = await callGemini(regenPrompt, 8000);
        const text = cleanCarril(raw);
        return text || current;
      } catch (err) {
        console.warn("[RouterAudit] regeneración por contaminación falló:", err);
        return current;
      }
    };

    {
      const initial = auditCarrilContamination(1, carril1);
      if (!initial.passed) {
        carril1 = await tryDecontaminate(1, carril1, promptC1);
        const recheck = auditCarrilContamination(1, carril1);
        contaminationAudit.carril1 = { ...recheck, retried: true };
      } else {
        contaminationAudit.carril1 = { ...initial, retried: false };
      }
    }
    {
      const initial = auditCarrilContamination(2, carril2);
      if (!initial.passed) {
        carril2 = await tryDecontaminate(2, carril2, promptC2);
        const recheck = auditCarrilContamination(2, carril2);
        contaminationAudit.carril2 = { ...recheck, retried: true };
      } else {
        contaminationAudit.carril2 = { ...initial, retried: false };
      }
    }

    // 4ª llamada — Extracción de Notas de Evolución del Algoritmo
    let notasEvolucion: { tipo: string; titulo: string; cuerpo: string }[] = [];
    try {
      const promptNotas = `EXTRAE NOTAS DE EVOLUCIÓN DEL ALGORITMO.
Has generado un capítulo completo sobre "${subInterfazTitulo}" de la Interfaz ${interfazId} (Coordenada ${coordenada}).
Al escribirlo, el algoritmo descubrió principios que no estaban explícitos en el texto fuente.
Extrae 3 a 5 de estos principios emergentes.

TEXTO DE LOS CARRILES (extracto):
--- CARRIL 1 ---
${carril1.substring(0, 700)}

--- CARRIL 2 ---
${carril2.substring(0, 700)}

--- CARRIL 3 ---
${carril3.substring(0, 700)}

REGLAS ABSOLUTAS:
- Tipo DEBE ser uno de: "Ley de", "Principio de", "Efecto de", "Codificación", "Acuerdo"
- Título: nombre corto del principio (5-10 palabras, en español)
- Cuerpo: explicación técnica (30-60 palabras, vocabulario clínico SISTEMICAR, en español)
- PROHIBIDO repetir principios ya explícitos — solo los que EMERGIERON al codificar
- Nombra con autoridad: "Ley de la Memoria RAM Biológica", "Efecto de Confinamiento de Datos"

RESPONDE SOLO CON JSON VÁLIDO — sin markdown, sin explicación, sin texto adicional:
[{"tipo":"Ley de","titulo":"...","cuerpo":"..."},{"tipo":"Principio de","titulo":"...","cuerpo":"..."}]`;

      const rawNotas = await callGemini(promptNotas, 1500);
      const cleanedNotas = rawNotas.trim().replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleanedNotas);
      if (Array.isArray(parsed)) {
        notasEvolucion = parsed.slice(0, 5).filter((n: any) => n.tipo && n.titulo && n.cuerpo);
      }
    } catch (notasErr) {
      console.warn("[taller-libros] Notas de Evolución fallaron (no crítico):", notasErr);
    }

    const notasEvolucionInyectadas = Array.isArray(notasEvolucionPrevias) ? notasEvolucionPrevias.length : 0;
    res.json({
      carril1,
      carril2,
      carril3,
      gradoLabel,
      creditosRef,
      coordenada,
      notasEvolucion,
      fichaAudit,
      contaminationAudit,
      notasEvolucionInyectadas,
      cerebro_v2: true,
      cerebro_router: true,
      promptTokens: { c1: estimatedTokensC1, c2: estimatedTokensC2, c3: estimatedTokensC3 },
    });
  } catch (error: any) {
    const errStatus = error?.status ?? error?.response?.status ?? "unknown";
    const errMsg = error?.message || String(error);
    const errDetails = error?.errorDetails?.[0]?.message || "";
    console.error(`[taller-libros] Error generar-capitulo — status=${errStatus}, msg=${errMsg.slice(0, 400)}, details=${errDetails.slice(0, 200)}, interfaz=${(req.body as any)?.interfazId || "?"}, cap=${(req.body as any)?.subInterfazId || "?"}`);
    const is429 = errStatus === 429 || errMsg.includes("429");
    if (is429) return res.status(429).json({ error: "IA saturada. Intenta en unos segundos." });
    res.status(500).json({ error: errMsg || "Error generando capítulo" });
  }
});

// ===== RADIOGRAFÍA DEL OPERADOR =====
app.post("/api/radiografia/generar", async (req, res) => {
  try {
    const { gordaRecord = [], expedientes = [], totalPS = 0 } = req.body;

    const cumplidos = gordaRecord.filter((g: any) => !g.status || g.status === "cumplido").length;
    const incumplidos = gordaRecord.filter((g: any) => g.status === "incumplido" || g.status === "fallado").length;
    const total = cumplidos + incumplidos;

    const byType: Record<string, number> = {};
    gordaRecord
      .filter((g: any) => g.status === "incumplido" || g.status === "fallado")
      .forEach((g: any) => {
        const t = g.tipoReloj || "otro";
        byType[t] = (byType[t] || 0) + 1;
      });
    const tipoBoicotDominante = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const ifzCount: Record<string, number> = {};
    expedientes.forEach((e: any) => {
      if (e.interfaz) ifzCount[e.interfaz] = (ifzCount[e.interfaz] || 0) + 1;
    });
    const interfazDominante = Object.entries(ifzCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const desglosadorCiclos = gordaRecord.filter((g: any) => g.tipoReloj === "desglosador_ciclo");
    const totalSubsCumplidos = desglosadorCiclos.reduce((s: number, g: any) => s + (g.cumplidos || 0), 0);
    const totalSubsFallados = desglosadorCiclos.reduce((s: number, g: any) => s + (g.fallados || 0), 0);
    const totalSubs = totalSubsCumplidos + totalSubsFallados;

    const codigosMap: Record<string, number> = {};
    expedientes.slice(0, 5).forEach((e: any) => {
      if (e.codigo) codigosMap[e.codigo] = (codigosMap[e.codigo] || 0) + 1;
    });
    const codigoBucle = Object.entries(codigosMap).sort((a, b) => b[1] - a[1])[0] || null;

    const minPerUnits = gordaRecord.filter((g: any) => g.minPerUnit > 0 && g.minPerUnit < 1000 && !g.titulo?.includes(" → "));
    const avgMinPerUnit = minPerUnits.length > 0
      ? minPerUnits.reduce((s: number, g: any) => s + g.minPerUnit, 0) / minPerUnits.length
      : null;

    const prompt = `Eres el Motor de Radiografía del Operador en SISTEMICAR. Tu lenguaje es clínico, directo, conductual. NUNCA uses palabras: motivación, disciplina, bienestar, meditación, actitud positiva. USA: patrón, interferencia, voltaje, programa, bucle, transmutación, código, dato.

DATOS DEL OPERADOR:
- Vehículos cerrados: ${total} (${cumplidos} cumplidos, ${incumplidos} incumplidos = ${total > 0 ? Math.round((incumplidos/total)*100) : 0}% incumplimiento)
- Tipo de reloj más incumplido: ${tipoBoicotDominante || "no detectado"}
- Sesiones del Espejo: ${expedientes.length}
- Interfaz clínica dominante: ${interfazDominante || "sin datos suficientes"}
- Puntos de Soberanía totales: ${totalPS} PS
- Ciclos Desglosador: ${desglosadorCiclos.length} ciclos → ${totalSubsCumplidos}/${totalSubs} subs completados
- minPerUnit promedio registrado: ${avgMinPerUnit ? avgMinPerUnit.toFixed(1) + " min/unidad" : "sin datos"}
- Código diagnóstico más repetido: ${codigoBucle ? `${codigoBucle[0]} (${codigoBucle[1]} veces)` : "sin datos"}

Genera una Radiografía del Operador en JSON exacto con las 6 métricas. Usa datos reales del operador. Si no hay datos suficientes para una métrica, sé honesto pero usa el dato parcial disponible para inferir el patrón más probable.

JSON exacto requerido (sin markdown, solo JSON):
{
  "patronBoicot": {
    "label": "<máximo 6 palabras, nombre del patrón>",
    "descripcion": "<1 oración con porcentaje real de incumplimiento y tipo dominante>",
    "evidencia": "<detalles específicos del patrón con datos del historial>"
  },
  "interfazDominante": {
    "interfaz": "${interfazDominante || "M??"}",
    "label": "<nombre de la interfaz o 'Sin sesiones del Espejo' si no hay datos>",
    "evidencia": "<explicación clínica de cómo se manifiesta esta interfaz en el historial>"
  },
  "brechaPercepcion": {
    "label": "<nombre del gap en 5 palabras>",
    "descripcion": "<brecha entre estimación y realidad usando minPerUnit data, en 2 oraciones>"
  },
  "curvaSoberania": {
    "label": "<'Expansión detectada' o 'Contracción detectada' o 'Estable'>",
    "tendencia": "<análisis de la curva PS y su significado conductual en 2 oraciones>"
  },
  "ratioDesglosador": {
    "label": "<nombre del gap ejecutivo>",
    "descripcion": "<análisis del ratio cumplidos/fallados en ciclos Desglosador>"
  },
  "bucleProgramatico": {
    "label": "<'Bucle activo' o 'Sin bucle detectado'>",
    "descripcion": "<descripción del programa repetitivo detectado o ausencia de datos suficientes>"
  },
  "recomendacionClinical": "<protocolo clínico personalizado de 3-4 oraciones con acciones concretas para los próximos 7 días>"
}`;

    const raw = await callGemini(prompt, 1200, true);
    let report: any;
    try {
      report = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("JSON inválido en respuesta de Gemini");
      report = JSON.parse(match[0]);
    }

    res.json({ ok: true, report, generadoEn: new Date().toISOString() });
  } catch (error: any) {
    console.error("[radiografia] Error:", error?.message);
    res.status(500).json({ error: error?.message || "Error generando radiografía" });
  }
});

// ===== API PÚBLICA DE DETECCIÓN DE INTERFAZ =====

const INTERFACE_CODES: Record<string, { name: string; description: string }> = {
  INTERFAZ_01: { name: "Cimiento", description: "Territorio y presencia" },
  INTERFAZ_02: { name: "Portador", description: "Poder y flujo" },
  INTERFAZ_03: { name: "Operario", description: "Trabajo y ejecución" },
  INTERFAZ_04: { name: "Estratega", description: "Estructura y planificación" },
  INTERFAZ_05: { name: "Socio", description: "Decisión y alianza" },
  INTERFAZ_06: { name: "Capital", description: "Convivencia y recursos" },
  INTERFAZ_07: { name: "Visionario", description: "Visión y dirección" },
  INTERFAZ_08: { name: "Arquitecto", description: "Ciclos y construcción" },
  INTERFAZ_09: { name: "Patriarca", description: "Sistema y legado" },
  INTERFAZ_10: { name: "Soberano", description: "Origen e integración" },
};

function internalCodeToPublic(codigo: string): string {
  const num = codigo.replace("C", "").padStart(2, "0");
  return `INTERFAZ_${num}`;
}

function nivelToConfidence(nivel: string): number {
  const n = parseFloat(nivel.replace(".", "0.")) || 0.3;
  return Math.round(Math.min(1, Math.max(0.1, n)) * 100) / 100;
}

const OWNER_EMAIL = "gilsonarevalo.leo@gmail.com";
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "";
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

async function verifyFirebaseJwt(authHeader: string | undefined): Promise<{ uid: string; email: string | null } | null> {
  try {
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    const uid = typeof payload.sub === "string" ? payload.sub : null;
    if (!uid) return null;
    return { uid, email: typeof payload.email === "string" ? payload.email : null };
  } catch {
    return null;
  }
}

async function verifyFirebaseIdToken(authHeader: string): Promise<string | null> {
  const verified = await verifyFirebaseJwt(authHeader);
  return verified?.email ?? null;
}

app.post("/api/planificacion/claim-module", async (req, res) => {
  try {
    const verified = await verifyFirebaseJwt(req.headers.authorization);
    if (!verified?.uid) {
      return res.status(401).json({ error: "Inicia sesión para activar tu módulo." });
    }
    const planId = typeof req.body?.planId === "string" ? req.body.planId : "";
    if (!planId || modulesGrantedByPlan(planId).length === 0) {
      return res.status(400).json({ error: "Plan no válido para activación modular." });
    }
    const ok = await activateModulesForUserById(verified.uid, planId);
    res.json({
      activated: ok,
      planId,
      message: ok
        ? "Módulo activado en tu cuenta."
        : "No se pudo activar; verifica FIREBASE_SERVICE_ACCOUNT_JSON en el servidor.",
    });
  } catch (error) {
    console.error("[planificacion/claim-module]", error);
    res.status(500).json({ error: "No se pudo activar el módulo." });
  }
});

app.post("/api/espejo/claim-purchase-credits", async (req, res) => {
  try {
    const verified = await verifyFirebaseJwt(req.headers.authorization);
    if (!verified?.uid || !verified.email) {
      return res.status(401).json({ error: "Inicia sesión para activar tus créditos de Espejo." });
    }
    const pendingBefore = await getPendingCreditsForEmail(verified.email);
    if (pendingBefore <= 0) {
      return res.json({ grantedCredits: 0, pendingCredits: 0, message: "No hay compras pendientes por acreditar." });
    }
    const { grantedCredits, paymentIds } = await grantPendingDeliveriesForEmail(
      verified.email,
      verified.uid
    );
    res.json({
      grantedCredits,
      pendingCredits: Math.max(0, pendingBefore - grantedCredits),
      paymentIds,
      message:
        grantedCredits > 0
          ? `Se activaron ${grantedCredits} créditos en tu cuenta Espejo.`
          : "Tu pago está registrado; configura FIREBASE_SERVICE_ACCOUNT_JSON en el servidor para acreditar automáticamente.",
    });
  } catch (error) {
    console.error("[espejo/claim-purchase-credits]", error);
    res.status(500).json({ error: "No se pudieron activar los créditos." });
  }
});

async function requireAdminToken(req: any, res: any, next: any) {
  const email = await verifyFirebaseIdToken(req.headers.authorization || "");
  if (email !== OWNER_EMAIL) {
    return res.status(403).json({ error: "Acceso restringido al propietario." });
  }
  (req as { adminEmail?: string }).adminEmail = email ?? undefined;
  next();
}

// ===== ADMIN: ESPEJO CRÉDITOS (Yape / manual) =====
app.get("/api/admin/espejo/deliveries", requireAdminToken, async (req, res) => {
  try {
    const limitStr = typeof req.query.limit === "string" ? req.query.limit : "40";
    const limit = parseInt(limitStr, 10) || 40;
    const deliveries = await listEspejoDeliveries(limit);
    res.json({ deliveries });
  } catch (error) {
    console.error("[admin/espejo/deliveries]", error);
    res.status(500).json({ error: "Error listando entregas de créditos." });
  }
});

app.post("/api/admin/espejo/grant-credits", requireAdminToken, async (req, res) => {
  try {
    const adminEmail = (req as { adminEmail?: string }).adminEmail;
    const {
      email,
      credits: creditsRaw,
      mode,
      source,
      reference,
      note,
      sendEmail,
      planId,
    } = req.body || {};

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Email válido requerido." });
    }

    const credits = typeof creditsRaw === "number" ? creditsRaw : parseInt(String(creditsRaw), 10);
    if (!credits || credits <= 0 || credits > 9999) {
      return res.status(400).json({ error: "Cantidad de créditos inválida (1–9999)." });
    }

    const validSources = new Set(["yape", "paypal", "manual", "mp"]);
    const paymentSource =
      typeof source === "string" && validSources.has(source)
        ? (source as "yape" | "paypal" | "manual" | "mp")
        : "manual";

    const grantMode = mode === "set" ? "set" : "add";

    const result = await adminGrantEspejoCredits({
      buyerEmail: email,
      credits,
      source: paymentSource,
      reference: typeof reference === "string" ? reference : undefined,
      note: typeof note === "string" ? note : undefined,
      mode: grantMode,
      grantedBy: adminEmail,
      planId: typeof planId === "string" ? planId : "espejo_inicio",
    });

    if (result.duplicate) {
      return res.status(409).json({
        error: "Esta referencia de pago ya fue acreditada.",
        ...result,
      });
    }

    if (sendEmail !== false && result.granted) {
      try {
        const grantPlanId =
          typeof planId === "string" && isEspejoSkuId(planId)
            ? planId
            : "espejo_inicio";
        const grantPlan = SUBSCRIPTION_PLANS[grantPlanId];
        await sendPaymentConfirmationEmail({
          to: email.trim().toLowerCase(),
          userName: email.split("@")[0],
          planName: `${grantPlan.name} (${credits} créditos)`,
          amount: grantPlan.price,
        });
      } catch (emailErr) {
        console.error("[admin/espejo/grant-credits] email:", emailErr);
      }
    }

    res.json({
      success: true,
      message: result.granted
        ? grantMode === "add"
          ? `+${credits} créditos activados. Saldo: ${result.totalCredits ?? "?"}`
          : `Saldo establecido en ${credits} créditos.`
        : `Pago registrado para ${email}. El usuario verá los créditos al iniciar sesión con ese correo.`,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error acreditando créditos.";
    console.error("[admin/espejo/grant-credits]", error);
    res.status(500).json({ error: message });
  }
});

// ===== ADMIN: ACTIVAR MÓDULOS PLANIFICACIÓN (Yape / manual) =====
app.get("/api/admin/users/lookup", requireAdminToken, async (req, res) => {
  try {
    const emailRaw = typeof req.query.email === "string" ? req.query.email : "";
    if (!emailRaw.includes("@")) {
      return res.status(400).json({ error: "Email válido requerido." });
    }
    const result = await adminLookupUserByEmail(emailRaw);
    if (!result.found) {
      return res.status(404).json({
        found: false,
        adminReady: result.adminReady,
        error:
          "No hay cuenta en Firebase Auth con ese correo. El usuario debe iniciar sesión con Google al menos una vez usando ese email exacto.",
      });
    }
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error buscando usuario.";
    console.error("[admin/users/lookup]", error);
    res.status(500).json({ error: message });
  }
});

app.post("/api/admin/modules/grant", requireAdminToken, async (req, res) => {
  try {
    const { email, planId, source, note } = req.body || {};
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Email válido requerido." });
    }
    const pid = typeof planId === "string" ? planId.trim() : "";
    if (!pid || modulesGrantedByPlan(pid).length === 0) {
      return res.status(400).json({
        error: "Plan no válido. Usa: planificacion_base, soberania_dia, operativo o umbral.",
      });
    }

    if (!isFirebaseAdminReady()) {
      return res.status(503).json({
        error:
          "FIREBASE_SERVICE_ACCOUNT_JSON no está configurado en el servidor. Sin eso no se puede activar módulos en Firestore.",
        adminReady: false,
      });
    }

    const lookup = await adminLookupUserByEmail(email.trim().toLowerCase());
    if (!lookup.found || !lookup.uid) {
      return res.status(404).json({
        error:
          "No se encontró usuario con ese correo en Firebase Auth. Debe iniciar sesión al menos una vez con Google usando ese email exacto.",
        pending: true,
        adminReady: lookup.adminReady,
      });
    }

    const activated = await activateModulesForUserById(lookup.uid, pid);
    if (!activated) {
      return res.status(500).json({
        error: "Usuario encontrado pero no se pudo escribir la activación en Firestore.",
        uid: lookup.uid,
      });
    }
    console.log(
      `[admin/modules/grant] ${email} plan=${pid} source=${source ?? "manual"} note=${note ?? ""}`
    );
    res.json({
      success: true,
      activated: true,
      planId: pid,
      uid: lookup.uid,
      modules: modulesGrantedByPlan(pid),
      message: `Módulo ${pid} activado para ${lookup.email ?? email}.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error activando módulo.";
    console.error("[admin/modules/grant]", error);
    res.status(500).json({ error: message });
  }
});

// ===== ADMIN: VENTAS VENDEDORES PLANIFICACIÓN =====
app.get("/api/admin/seller-sales", requireAdminToken, async (req, res) => {
  try {
    const limitStr = typeof req.query.limit === "string" ? req.query.limit : "50";
    const limit = parseInt(limitStr, 10) || 50;
    const sales = await listSellerSales(limit);
    res.json({ sales });
  } catch (error) {
    console.error("[admin/seller-sales] GET", error);
    res.status(500).json({ error: "Error listando ventas de vendedores." });
  }
});

app.post("/api/admin/seller-sales/:id/paid", requireAdminToken, async (req, res) => {
  try {
    const ok = await markSellerCommissionPaid(req.params.id);
    if (!ok) return res.status(404).json({ error: "Venta no encontrada." });
    res.json({ ok: true });
  } catch (error) {
    console.error("[admin/seller-sales/paid]", error);
    res.status(500).json({ error: "Error marcando comisión." });
  }
});

// ===== ADMIN: SELLERS (vendedores API — legacy, pendiente) =====
app.get("/api/admin/sellers", requireAdminToken, async (_req, res) => {
  try {
    res.json({ sellers: [], note: "Use seller-sales y códigos ref en /pagos?ref=CODIGO" });
  } catch (error: any) {
    console.error("[admin/sellers] GET error:", error?.message);
    res.status(500).json({ error: "Error listando vendedores." });
  }
});

app.post("/api/admin/sellers", requireAdminToken, async (req, res) => {
  try {
    const { seller_name, seller_email, seller_code } = req.body || {};
    if (!seller_name || typeof seller_name !== "string" || seller_name.trim().length < 2) {
      return res.status(400).json({ error: "seller_name requerido (mínimo 2 caracteres)." });
    }
    if (!seller_code || typeof seller_code !== "string" || seller_code.trim().length < 2) {
      return res.status(400).json({ error: "seller_code requerido (mínimo 2 caracteres)." });
    }
    res.json({
      seller: {
        sellerName: seller_name.trim(),
        sellerEmail: typeof seller_email === "string" ? seller_email : null,
        sellerCode: seller_code.trim().toUpperCase(),
        link: `https://sistemicar.app/pagos?ref=${encodeURIComponent(seller_code.trim().toUpperCase())}`,
      },
      message: "Vendedor registrado manualmente. Comparte el link al vendedor.",
    });
  } catch (error: any) {
    console.error("[admin/sellers] POST error:", error?.message);
    res.status(500).json({ error: error?.message || "Error creando vendedor." });
  }
});

app.patch("/api/admin/sellers/:id", requireAdminToken, async (_req, res) => {
  res.status(501).json({ error: "Use seller-sales para comisiones de Planificación." });
});

app.get("/api/admin/sales-attribution", requireAdminToken, async (_req, res) => {
  try {
    const sales = await listSellerSales(100);
    res.json({ sales });
  } catch (error: any) {
    console.error("[admin/sales-attribution] GET error:", error?.message);
    res.status(500).json({ error: "Error listando atribución de ventas." });
  }
});

async function middlewarePublicApiKey(req: any, res: any, next: any) {
  const rawKey = (req.headers["x-api-key"] || "").toString().trim();
  if (!rawKey) {
    return res.status(401).json({ error: "API key requerida. Incluye X-Api-Key en los headers." });
  }
  const { valid, keyId, monthlyCallLimit } = await validateApiKey(rawKey).catch(() => ({
    valid: false,
    keyId: undefined,
    monthlyCallLimit: undefined,
  }));
  if (!valid) {
    return res.status(401).json({ error: "API key inválida o revocada." });
  }
  if (monthlyCallLimit != null && monthlyCallLimit > 0 && keyId != null) {
    let used: number;
    try {
      used = await getMonthlyUsageCount(keyId);
    } catch {
      return res.status(503).json({ error: "Error verificando límite de uso. Intenta de nuevo." });
    }
    if (used >= monthlyCallLimit) {
      return res.status(429).json({
        error: "Límite mensual de llamadas agotado.",
        limit: monthlyCallLimit,
        used,
      });
    }
  }
  req.apiKeyId = keyId;
  next();
}

async function callGeminiWithAudio(audioBase64: string, prompt: string): Promise<string> {
  const errors: string[] = [];
  const AUDIO_MIME_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav"];
  for (const apiKey of GEMINI_KEYS) {
    const genAI = new GoogleGenerativeAI(apiKey);
    for (const modelName of GEMINI_MODELS) {
      for (const mimeType of AUDIO_MIME_TYPES) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent({
            contents: [{
              role: "user",
              parts: [
                { inlineData: { mimeType, data: audioBase64 } },
                { text: prompt },
              ],
            }],
            generationConfig: { maxOutputTokens: 200, responseMimeType: "application/json" },
          });
          return result.response.text();
        } catch (err: any) {
          const status = err?.status;
          const msg = err?.message?.slice(0, 80) || String(err);
          errors.push(`${modelName}/${mimeType}:${status}:${msg}`);
          if (status === 403 || status === 401) break;
        }
      }
    }
  }
  throw new Error(`Gemini audio no disponible: ${errors.slice(0, 2).join(", ")}`);
}

// /api/public/docs is intentionally public (no API key required) — serves API documentation only
app.get("/api/public/docs", (_req, res) => {
  res.json({
    version: "1.0",
    description: "API pública de detección de interfaz conductual por texto o voz",
    note: "GET /api/public/docs is intentionally public. POST /api/public/detect-interface requires X-Api-Key.",
    endpoints: [
      {
        method: "POST",
        path: "/api/public/detect-interface",
        auth: "Header: X-Api-Key: <tu_clave>",
        body: {
          text: "string — texto transcrito a analizar (requerido si no se provee audio_base64)",
          audio_base64: "string — audio codificado en base64 (requerido si no se provee text; acepta webm, mp4, mpeg, wav)",
          language: "string — idioma del texto/audio, default: 'es'",
        },
        response: {
          code: "string — código de interfaz detectado (ej: INTERFAZ_01)",
          name: "string — nombre legible de la interfaz",
          confidence: "number — nivel de confianza entre 0.1 y 1.0",
          timestamp: "string — ISO 8601",
        },
        codes: Object.entries(INTERFACE_CODES).map(([code, info]) => ({
          code,
          name: info.name,
        })),
      },
    ],
  });
});

app.post("/api/public/detect-interface", middlewarePublicApiKey, async (req: any, res) => {
  try {
    const { text, audio_base64, language = "es" } = req.body;
    const hasText = text && typeof text === "string" && text.trim().length >= 5;
    const hasAudio = audio_base64 && typeof audio_base64 === "string" && audio_base64.length > 100;
    if (!hasText && !hasAudio) {
      return res.status(400).json({ error: "Se requiere 'text' (mínimo 5 caracteres) o 'audio_base64' (audio en base64)." });
    }

    let codigoValido = "C1";
    let nivelValido = ".3";

    if (hasAudio && !hasText) {
      const audioPrompt = `${PSICOLOGIA_MADUREZ_SEDUCCION}\n\nAnaliza el audio y detecta el código (C1–C10) y nivel de madurez (.1–.10). Idioma del audio: ${language}.\n\nResponde SOLO con JSON: {"codigo": "C1", "nivel": ".4"}`;
      const raw = await callGeminiWithAudio(audio_base64, audioPrompt);
      const parsed = parseGeminiJSON(raw);
      const rc = (parsed.codigo || "C1").trim();
      const rn = (parsed.nivel || ".3").trim();
      codigoValido = /^C([1-9]|10)$/.test(rc) ? rc : "C1";
      nivelValido = /^\.(10|[1-9])$/.test(rn) ? rn : ".3";
    } else {
      const truncated = (text as string).trim().slice(0, 2000);
      const prompt = `${PSICOLOGIA_MADUREZ_SEDUCCION}

═══ DETECCIÓN DE INTERFAZ CONDUCTUAL ═══

TEXTO DEL USUARIO (idioma: ${language}):
"${truncated}"

INSTRUCCIÓN: Analiza el texto para identificar el Código dominante (C1–C10) y el Nivel de madurez (.1–.10).

Responde SOLO con JSON válido:
{"codigo": "C1", "nivel": ".4"}`;
      const raw = await callGemini(prompt, 150, true);
      const parsed = parseGeminiJSON(raw);
      const rc = (parsed.codigo || "C1").trim();
      const rn = (parsed.nivel || ".3").trim();
      codigoValido = /^C([1-9]|10)$/.test(rc) ? rc : "C1";
      nivelValido = /^\.(10|[1-9])$/.test(rn) ? rn : ".3";
    }

    const publicCode = internalCodeToPublic(codigoValido);
    const confidence = nivelToConfidence(nivelValido);
    const interfaceInfo = INTERFACE_CODES[publicCode] || { name: "Desconocido", description: "" };
    await logApiUsage(req.apiKeyId, publicCode).catch(() => {});

    res.json({
      code: publicCode,
      name: interfaceInfo.name,
      confidence,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[public/detect-interface] Error:", error?.message);
    res.status(500).json({ error: "Error procesando la solicitud." });
  }
});

// ===== ADMIN: GESTIÓN DE API KEYS (requiere token del propietario) =====

app.get("/api/admin/public-keys", requireAdminToken, async (_req, res) => {
  try {
    const keys = await listApiKeys();
    res.json({ keys });
  } catch (error: any) {
    console.error("[admin/public-keys] GET error:", error?.message);
    res.status(500).json({ error: "Error obteniendo API keys." });
  }
});

app.post("/api/admin/public-keys", requireAdminToken, async (req, res) => {
  try {
    const { client_name } = req.body;
    if (!client_name || typeof client_name !== "string" || client_name.trim().length < 2) {
      return res.status(400).json({ error: "client_name es requerido (mínimo 2 caracteres)." });
    }
    const { key, record } = await createApiKey(client_name);
    res.json({ key, record, warning: "Guarda esta clave ahora. No se mostrará de nuevo." });
  } catch (error: any) {
    console.error("[admin/public-keys] POST error:", error?.message);
    res.status(500).json({ error: "Error creando API key." });
  }
});

app.delete("/api/admin/public-keys/:id", requireAdminToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: "ID inválido." });
    const ok = await revokeApiKey(id);
    if (!ok) return res.status(404).json({ error: "API key no encontrada." });
    res.json({ ok: true });
  } catch (error: any) {
    console.error("[admin/public-keys] DELETE error:", error?.message);
    res.status(500).json({ error: "Error revocando API key." });
  }
});

// ─── Vehicle History (sub_vehicle_records) ────────────────────────────────

async function extractFirebaseUid(authHeader: string | undefined): Promise<string | null> {
  const verified = await verifyFirebaseJwt(authHeader);
  return verified?.uid ?? null;
}

app.get("/api/vehicle-history", async (req, res) => {
  const uid = await extractFirebaseUid(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: "No autenticado" });
  const titulo = typeof req.query.titulo === "string" ? req.query.titulo : undefined;
  try {
    const records = await getVehicleHistory(uid, titulo);
    res.json({ records });
  } catch (error: any) {
    console.error("[vehicle-history] GET error:", error?.message);
    res.status(500).json({ error: "Error obteniendo historial de vehículos." });
  }
});

app.post("/api/vehicle-history", async (req, res) => {
  const uid = await extractFirebaseUid(req.headers.authorization);
  if (!uid) return res.status(401).json({ error: "No autenticado" });
  const { entries } = req.body;
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: "entries debe ser un array" });
  }
  const MAX_ENTRIES = 500;
  const valid = entries.slice(0, MAX_ENTRIES).filter((e: any) =>
    e && typeof e.titulo === "string" && typeof e.minPerUnit === "number" &&
    typeof e.totalMin === "number" && typeof e.tipoReloj === "string" &&
    typeof e.fecha === "number"
  );
  if (valid.length === 0) {
    return res.status(400).json({ error: "No hay entradas válidas en el array" });
  }
  try {
    await bulkSaveVehicleHistory(uid, valid);
    res.json({ ok: true, saved: valid.length });
  } catch (error: any) {
    console.error("[vehicle-history] POST error:", error?.message);
    res.status(500).json({ error: "Error guardando historial de vehículos." });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), runtime: isServerless ? "netlify" : "node" });
});

export { app };

if (!isServerless) {
  if (process.env.NODE_ENV === "production") {
  const staticPath = path.resolve(process.cwd(), "dist", "public");
  app.use(express.static(staticPath, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));
  app.get("*", (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(staticPath, "index.html"));
  });
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${PORT}`);
  });
} else {
  // Development: use Vite middleware
  import("vite").then(async ({ createServer }) => {
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${PORT}`);
    });
  });
}
}
