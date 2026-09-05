import {
  calcularReporteSemanal,
  resolveVentanaSemanal,
  type CalcularReporteSemanalInput,
  type ReporteSemanal,
} from "@shared/reporteSemanal";
import {
  getLocalVehicles,
  readLocalCierresJornada,
  readLocalPlanilla,
} from "@/lib/persistence";

const CACHE_PREFIX = "sistemicar_reporte_semanal_v1_";

function cacheKey(userId: string, semanaId: string): string {
  return `${CACHE_PREFIX}${userId}_${semanaId}`;
}

function gatherInput(nowMs: number, objetivo: "actual" | "cerrada"): CalcularReporteSemanalInput {
  const ventana = resolveVentanaSemanal(nowMs, objetivo);
  const planillas = ventana.fechas
    .map((fecha) => {
      const p = readLocalPlanilla(fecha);
      if (!p) return null;
      return {
        fecha: p.fecha,
        segmentos: (p.segmentos ?? []).map((s) => ({
          horaInicio: s.horaInicio,
          horaFin: s.horaFin,
          estado: s.estado,
          activadoAt: s.activadoAt,
          cerradoAt: s.cerradoAt,
          puertaTiming: s.puertaTiming,
          puertaSistema: s.puertaSistema,
        })),
        atencionSnapshot: p.atencionSnapshot
          ? { puertasAbiertas: p.atencionSnapshot.puertasAbiertas }
          : undefined,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  const vehiculos = getLocalVehicles().map((v) => ({
    id: v.id,
    cierreAt: v.cierreAt ?? null,
    cierreManual: v.cierreManual,
    bonoTemple: v.bonoTemple,
    energiaOscura: v.energiaOscura,
    justificacion: v.justificacion,
    status: v.status,
    titulo: v.titulo,
    autoVerdad: v.autoVerdad,
    excluirDeHistorial: v.excluirDeHistorial,
    ejes: v.ejes,
  }));

  const sellos = readLocalCierresJornada()
    .filter((c) => c.selloEmitido === true)
    .map((c) => ({
      fecha: c.fecha,
      selloEmitido: true as const,
      jornadaPlanMin: c.jornadaPlanMin,
    }));

  return {
    nowMs,
    objetivo,
    planillas,
    vehiculos,
    sellos,
  };
}

export function leerReporteSemanalCache(
  userId: string,
  semanaId: string,
): ReporteSemanal | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId, semanaId));
    if (!raw) return null;
    return JSON.parse(raw) as ReporteSemanal;
  } catch {
    return null;
  }
}

function escribirCache(userId: string, reporte: ReporteSemanal): void {
  if (reporte.estado === "EN_CURSO") return;
  try {
    localStorage.setItem(cacheKey(userId, reporte.semanaId), JSON.stringify(reporte));
  } catch (e) {
    console.error("[reporteSemanal] cache", e);
  }
}

/** Semana en curso: pulso. Semana cerrada: sello único (no se reabre). */
export function cargarEspejoSemanal(userId: string, nowMs: number = Date.now()): {
  enCurso: ReporteSemanal;
  cosecha: ReporteSemanal;
  pulsoAncla: number;
} {
  const inputActual = gatherInput(nowMs, "actual");
  const enCurso = calcularReporteSemanal(inputActual);
  const pulsoAncla = new Set([
    ...(inputActual.planillas ?? []).map((p) => p.fecha),
    ...(inputActual.sellos ?? []).map((s) => s.fecha),
  ]).size;
  const ventanaCerrada = resolveVentanaSemanal(nowMs, "cerrada");
  const cached = leerReporteSemanalCache(userId, ventanaCerrada.semanaId);
  if (cached && (cached.estado === "SELLADO" || cached.estado === "INSUFICIENTE")) {
    return { enCurso, cosecha: cached, pulsoAncla };
  }
  const cosecha = calcularReporteSemanal(gatherInput(nowMs, "cerrada"));
  escribirCache(userId, cosecha);
  return { enCurso, cosecha, pulsoAncla };
}
