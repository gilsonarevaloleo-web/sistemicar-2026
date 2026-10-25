/**
 * Historial público del Juez. Fase 2 solo si ya se desbloqueó.
 */

import { hidratarFase1 } from "./motor.ts";
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
  /** Alias público de la confrontación. Null si sigue sellada. */
  confrontacionDeFuerza: string | null;
}

function fase1Publica(fase1: JuezSerioFase1): JuezSerioFase1 {
  return hidratarFase1(fase1);
}

export function publicHistorialItem(sesion: SesionJuez): HistorialJuezItem {
  const abierta = sesion.estado === "FASE2_ABIERTA";
  const fase1 = fase1Publica(sesion.fase1);
  return {
    id: sesion.id,
    createdAt: sesion.createdAt,
    updatedAt: sesion.updatedAt,
    textoVolcado: sesion.textoVolcado,
    fase1,
    fase2Desbloqueada: abierta,
    directivaOperacional: abierta
      ? sesion.fase2.confrontacionDeFuerza || sesion.fase2.directivaOperacional
      : null,
    confrontacionDeFuerza: abierta
      ? sesion.fase2.confrontacionDeFuerza || sesion.fase2.directivaOperacional
      : null,
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
    "FASE 1 — MAPA DE FUERZAS",
    `Código que habla: ${etiquetaPrincipio(problema.codigo)}`,
    `Perímetro conquistado: C1 → ${etiquetaPrincipio(techo.codigo)}`,
    `Cierre teórico: ${
      item.fase1.codigoQueCerroTeorico
        ? etiquetaPrincipio(item.fase1.codigoQueCerroTeorico)
        : "ninguno"
    }`,
    `Fuerza usada: ${
      item.fase1.fuerzaUsada ? etiquetaPrincipio(item.fase1.fuerzaUsada) : "ninguna"
    }`,
    `Fuerza debida: ${etiquetaPrincipio(item.fase1.fuerzaDebida ?? techo.codigo)}`,
    `Cascada: ${item.fase1.cascadaCumple ? "cumplida" : "incumplida"}`,
    `Desajuste: ${item.fase1.desajusteFuerza ?? item.fase1.fugaInconsciente}`,
    `Fuga inconsciente: ${item.fase1.fugaInconsciente}`,
    `Lectura fría: ${item.fase1.lecturaPerimetroFria}`,
  ];
  const confrontacion = item.confrontacionDeFuerza ?? item.directivaOperacional;
  if (item.fase2Desbloqueada && confrontacion) {
    lineas.push("", "FASE 2 — CONFRONTACIÓN DE FUERZA", confrontacion);
  } else {
    lineas.push("", "FASE 2 — CONFRONTACIÓN DE FUERZA", "(sin desbloquear)");
  }
  return lineas.join("\n");
}
