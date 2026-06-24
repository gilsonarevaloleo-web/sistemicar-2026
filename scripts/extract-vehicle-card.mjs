import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const planeacionPath = path.join(root, "client/src/pages/planeacion.tsx");
const sharedPath = path.join(root, "client/src/components/flota/vehicleCardShared.ts");
const cardPath = path.join(root, "client/src/components/flota/VehicleCard.tsx");

const lines = fs.readFileSync(planeacionPath, "utf8").split("\n");

// 1-based line numbers from investigation
const SHARED_START = 534; // GOLD
const SHARED_END = 1008; // through vehicleClosedAtMs (exclusive of saveVehicleHistory)
const SCORE_START = 10196; // EXPRESS_PS
const SCORE_END = 10247; // end calculateVehicleScore
const CARD_START = 10248; // function VehicleCard
const CARD_END = 13564; // const MemoVehicleCard = ... (exclusive end)

const sharedHeader = `import { motion } from "framer-motion";
import { Target, Clock, Flag, Coffee, MessageSquare } from "lucide-react";
import type { SubTarea, SubVehiculo, TipoFlota, Vehicle, RutaBandaId } from "@shared/schema";
import { FLOTA_BRAND } from "@/lib/flotaBrand";
import {
  computeDesglosadorSessionDepthPS,
} from "@/lib/desglosadorDepth";
import { estimateDesglosadorSessionPs } from "@/lib/desglosadorPointsAward";
import {
  createRutaEnfoqueState,
  getRutaBandaActual,
  resolveRutaEnfoqueForSub,
  RUTA_BANDA_META,
} from "@/lib/rutaEnfoque";
import { situacionFilaCronometroPendiente } from "@/lib/situacionCupoDistrib";
import { playSituacionCumplidoChimes } from "@/lib/situacionAlertSounds";
import {
  computeEficienciaSituacionPct,
  computeSituacionBolsaGanancia,
  sumMinutosRealesCronometro,
} from "@/lib/situacionGanancia";
import { countCasaHechas, groupCasaByTexto, type CasaTextoCount } from "@/lib/situacionCasa";
import { formatCombustibleCelebracionBloque } from "@/lib/combustibleConciencia";
import {
  VEHICLE_ARCHIVADO_BASE_PS,
  VEHICLE_CUMPLIDO_BASE_PS,
} from "@/lib/sovereigntyPointsConfig";

`;

const sharedBody = [
  ...lines.slice(SHARED_START - 1, SHARED_END - 1),
  "",
  ...lines.slice(SCORE_START - 1, SCORE_END),
]
  .map((l) =>
    l
      .replace(/^const GOLD/, "export const GOLD")
      .replace(/^const AZURE/, "export const AZURE")
      .replace(/^const EMERALD/, "export const EMERALD")
      .replace(/^const VIOLET/, "export const VIOLET")
      .replace(/^const SLATE/, "export const SLATE")
      .replace(/^const BLOOD/, "export const BLOOD")
      .replace(/^const PIZARRA/, "export const PIZARRA")
      .replace(/^const NARANJA/, "export const NARANJA")
      .replace(/^const PLATA/, "export const PLATA")
      .replace(/^const VERDE/, "export const VERDE")
      .replace(/^const GRIS/, "export const GRIS")
      .replace(/^const CYAN/, "export const CYAN")
      .replace(/^const FLOTA_CONFIG/, "export const FLOTA_CONFIG")
      .replace(/^const getHistoricalVehicleData/, "export const getHistoricalVehicleData")
      .replace(/^const getDesglosadorHistorico/, "export const getDesglosadorHistorico")
      .replace(/^const getDesglosadorMisionTitles/, "export const getDesglosadorMisionTitles")
      .replace(/^const getDesglosadorMisionData/, "export const getDesglosadorMisionData")
      .replace(/^const getRecordSuggestions/, "export const getRecordSuggestions")
      .replace(/^const ENERGIA_ESPEJO_OPTIONS/, "export const ENERGIA_ESPEJO_OPTIONS")
      .replace(/^type CierreEnergiaModalPayload/, "export type CierreEnergiaModalPayload")
      .replace(/^const cleanSubTitulo/, "export const cleanSubTitulo")
      .replace(/^type DesglosadorSubFormRow/, "export type DesglosadorSubFormRow")
      .replace(/^function buildDesglosadorSubFromForm/, "export function buildDesglosadorSubFromForm")
      .replace(/^function buildDesglosadorSubFromRuntime/, "export function buildDesglosadorSubFromRuntime")
      .replace(/^function cierrePayloadHasRutaEnfoque/, "export function cierrePayloadHasRutaEnfoque")
      .replace(/^function RutaEnfoqueBar/, "export function RutaEnfoqueBar")
      .replace(/^type SituacionDesgloseSummary/, "export type SituacionDesgloseSummary")
      .replace(/^function computeSituacionDesgloseSummary/, "export function computeSituacionDesgloseSummary")
      .replace(/^function situacionDesgloseBloqueTerminado/, "export function situacionDesgloseBloqueTerminado")
      .replace(/^function situacionDesgloseBloqueListo/, "export function situacionDesgloseBloqueListo")
      .replace(/^async function playSituacionChimes/, "export async function playSituacionChimes")
      .replace(/^const getSubVehicleRecordSuggestions/, "export const getSubVehicleRecordSuggestions")
      .replace(/^type VehicleHistoryOpts/, "export type VehicleHistoryOpts")
      .replace(/^function isSubTareaSituacionTerminada/, "export function isSubTareaSituacionTerminada")
      .replace(/^function sortSubTareasTrabajoPrimero/, "export function sortSubTareasTrabajoPrimero")
      .replace(/^function vehicleClosedAtMs/, "export function vehicleClosedAtMs")
      .replace(/^const EXPRESS_PS/, "const EXPRESS_PS")
      .replace(/^function calculateVehicleScore/, "export function calculateVehicleScore")
  )
  .join("\n");

fs.mkdirSync(path.dirname(sharedPath), { recursive: true });
fs.writeFileSync(sharedPath, sharedHeader + sharedBody + "\n");

const cardHeader = lines.slice(0, 533).join("\n") + `
import {
  GOLD, AZURE, EMERALD, VIOLET, SLATE, BLOOD, PIZARRA, NARANJA, PLATA, VERDE, GRIS, CYAN,
  FLOTA_CONFIG,
  getHistoricalVehicleData,
  getDesglosadorHistorico,
  getDesglosadorMisionTitles,
  getDesglosadorMisionData,
  getRecordSuggestions,
  ENERGIA_ESPEJO_OPTIONS,
  cleanSubTitulo,
  buildDesglosadorSubFromForm,
  buildDesglosadorSubFromRuntime,
  cierrePayloadHasRutaEnfoque,
  RutaEnfoqueBar,
  type SituacionDesgloseSummary,
  type CierreEnergiaModalPayload,
  type DesglosadorSubFormRow,
  computeSituacionDesgloseSummary,
  situacionDesgloseBloqueTerminado,
  situacionDesgloseBloqueListo,
  playSituacionChimes,
  getSubVehicleRecordSuggestions,
  sortSubTareasTrabajoPrimero,
  calculateVehicleScore,
} from "@/components/flota/vehicleCardShared";
`;

const cardBody = lines.slice(CARD_START - 1, CARD_END).join("\n");
const cardFooter = "\nexport { MemoVehicleCard };\n";

fs.writeFileSync(cardPath, cardHeader + "\n" + cardBody + cardFooter);

// Remove extracted sections from planeacion (bottom to top)
const newLines = [
  ...lines.slice(0, SHARED_START - 1),
  `import {
  GOLD, AZURE, EMERALD, VIOLET, SLATE, BLOOD, PIZARRA, NARANJA, PLATA, VERDE, GRIS, CYAN,
  FLOTA_CONFIG,
  getHistoricalVehicleData,
  getDesglosadorHistorico,
  getDesglosadorMisionTitles,
  getDesglosadorMisionData,
  getRecordSuggestions,
  ENERGIA_ESPEJO_OPTIONS,
  cleanSubTitulo,
  buildDesglosadorSubFromForm,
  buildDesglosadorSubFromRuntime,
  cierrePayloadHasRutaEnfoque,
  RutaEnfoqueBar,
  type SituacionDesgloseSummary,
  type CierreEnergiaModalPayload,
  type DesglosadorSubFormRow,
  computeSituacionDesgloseSummary,
  situacionDesgloseBloqueTerminado,
  situacionDesgloseBloqueListo,
  playSituacionChimes,
  getSubVehicleRecordSuggestions,
  type VehicleHistoryOpts,
  sortSubTareasTrabajoPrimero,
  vehicleClosedAtMs,
} from "@/components/flota/vehicleCardShared";`,
  ...lines.slice(SHARED_END - 1, SCORE_START - 1),
  `import { MemoVehicleCard } from "@/components/flota/VehicleCard";`,
  ...lines.slice(CARD_END),
];

fs.writeFileSync(planeacionPath, newLines.join("\n"));
console.log("Extracted vehicleCardShared.ts and VehicleCard.tsx");
