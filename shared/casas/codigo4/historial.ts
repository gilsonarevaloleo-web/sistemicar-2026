/**
 * Historial público del Juez. Fase 2 solo si ya se desbloqueó.
 */

import { etiquetaPrincipio, principioDe } from "./prompt.ts";
import type { SesionJuez } from "./sesion.ts";
import type { JuezSerioFase1 } from "./types.ts";

export const HISTORIAL_JUEZ_LIMITE = 40;

export interface HistorialJuezItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  textoVolcado: string;
  fase1: JuezSerioFase1;
  fase2Desbloqueada: boolean;
  /** Null si la Fase 2 sigue sellada. */
  directivaOperacional: string | null;
}

export function publicHistorialItem(sesion: SesionJuez): HistorialJuezItem {
  const abierta = sesion.estado === "FASE2_ABIERTA";
  return {
    id: sesion.id,
    createdAt: sesion.createdAt,
    updatedAt: sesion.updatedAt,
    textoVolcado: sesion.textoVolcado,
    fase1: sesion.fase1,
    fase2Desbloqueada: abierta,
    directivaOperacional: abierta ? sesion.fase2.directivaOperacional : null,
  };
}

export function formatearFechaAuditoria(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatearAuditoriaJuez(item: HistorialJuezItem): string {
  const problema = principioDe(item.fase1.codigoProblemaDetectado);
  const techo = principioDe(item.fase1.codigoConquistadoMax);
  const lineas = [
    "JUEZ SERIO — AUDITORÍA",
    `Fecha y hora: ${formatearFechaAuditoria(item.createdAt)}`,
    "",
    "¿Cuál es tu problema?",
    item.textoVolcado.trim(),
    "",
    "FASE 1 — LECTURA DEL PERÍMETRO",
    `Código detectado: ${etiquetaPrincipio(problema.codigo)}`,
    `Perímetro conquistado: C1 → ${etiquetaPrincipio(techo.codigo)}`,
    `Fuga inconsciente: ${item.fase1.fugaInconsciente}`,
    `Lectura fría: ${item.fase1.lecturaPerimetroFria}`,
  ];
  if (item.fase2Desbloqueada && item.directivaOperacional) {
    lineas.push("", "FASE 2 — DIRECTIVA OPERACIONAL", item.directivaOperacional);
  } else {
    lineas.push("", "FASE 2 — DIRECTIVA OPERACIONAL", "(sin desbloquear)");
  }
  return lineas.join("\n");
}
