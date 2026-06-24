import { motion } from "framer-motion";
import { Target, Clock, Flag, Coffee, MessageSquare } from "lucide-react";
import type { SubTarea, SubVehiculo, TipoFlota, Vehicle } from "@/lib/persistence";
import type { RutaBandaId } from "@/lib/rutaEnfoque";
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

export const GOLD = "#D4AF37";
export const AZURE = "#1E90FF";
export const EMERALD = "#50C878";
export const VIOLET = "#9B59B6";
export const SLATE = "#64748b";
export const BLOOD = "#991b1b";
export const PIZARRA = "#1e293b";

export const NARANJA = "#f97316";
export const PLATA = "#94a3b8";
export const VERDE = "#22c55e";
export const GRIS = "#6b7280";
export const CYAN = "#00FFC3";

export const FLOTA_CONFIG: Record<TipoFlota, { label: string; sublabel: string; color: string; icon: typeof Target; relojVisible: boolean; relojLabel: string; psBase: number; psCierre: string }> = {
  tiempo: { label: FLOTA_BRAND.tiempo.labelUpper, sublabel: FLOTA_BRAND.tiempo.sublabel, color: NARANJA, icon: Clock, relojVisible: true, relojLabel: FLOTA_BRAND.tiempo.relojLabel, psBase: 0, psCierre: FLOTA_BRAND.tiempo.psCierre },
  situacion: { label: FLOTA_BRAND.situacion.labelUpper, sublabel: FLOTA_BRAND.situacion.sublabel, color: PLATA, icon: Flag, relojVisible: true, relojLabel: FLOTA_BRAND.situacion.relojLabel, psBase: 0, psCierre: FLOTA_BRAND.situacion.psCierre },
  descanso: { label: FLOTA_BRAND.descanso.labelUpper, sublabel: FLOTA_BRAND.descanso.sublabel, color: VERDE, icon: Coffee, relojVisible: false, relojLabel: FLOTA_BRAND.descanso.relojLabel, psBase: 0, psCierre: FLOTA_BRAND.descanso.psCierre },
  verdad: { label: FLOTA_BRAND.verdad.labelUpper, sublabel: FLOTA_BRAND.verdad.sublabel, color: GRIS, icon: MessageSquare, relojVisible: false, relojLabel: FLOTA_BRAND.verdad.relojLabel, psBase: 0, psCierre: FLOTA_BRAND.verdad.psCierre },
};

export const getHistoricalVehicleData = (missionTitle: string): { lastMinPerUnit?: number; bestMinPerUnit?: number; lastTotalMin?: number; count: number } => {
  try {
    const data = localStorage.getItem("sistemicar_vehicle_history");
    if (!data) return { count: 0 };
    const history: Array<{ titulo: string; minPerUnit: number; totalMin: number; tipoReloj: string; fecha: number }> = JSON.parse(data);
    const matching = history.filter(h => h.titulo.toLowerCase() === missionTitle.toLowerCase());
    if (matching.length === 0) return { count: 0 };
    const sorted = matching.sort((a, b) => b.fecha - a.fecha);
    const best = matching.reduce((min, h) => h.minPerUnit < min ? h.minPerUnit : min, Infinity);
    return {
      lastMinPerUnit: sorted[0].minPerUnit,
      bestMinPerUnit: best,
      lastTotalMin: sorted[0].totalMin,
      count: matching.length
    };
  } catch { return { count: 0 }; }
};

export const getDesglosadorHistorico = (misionTitulo: string): string[] => {
  try {
    const data = localStorage.getItem("sistemicar_vehicle_history");
    if (!data) return [];
    const history: Array<{ titulo: string; minPerUnit: number; totalMin: number; tipoReloj: string; fecha: number; excluirDeHistorial?: boolean }> = JSON.parse(data);
    const prefix = `${misionTitulo.trim()} → `;
    const matching = history.filter(h =>
      h.tipoReloj === "desglosador" &&
      h.titulo.startsWith(prefix) &&
      !h.excluirDeHistorial
    );
    if (matching.length === 0) return [];
    // Agrupa por sesión (≤1h entre entradas consecutivas)
    const sorted = [...matching].sort((a, b) => a.fecha - b.fecha);
    const sessions: Array<typeof sorted> = [];
    let current: typeof sorted = [];
    for (const entry of sorted) {
      if (current.length === 0) { current.push(entry); continue; }
      if (entry.fecha - current[current.length - 1].fecha <= 3600000) {
        current.push(entry);
      } else {
        sessions.push(current);
        current = [entry];
      }
    }
    if (current.length > 0) sessions.push(current);
    if (sessions.length === 0) return [];
    // Tomar la sesión más reciente
    const lastSession = sessions[sessions.length - 1];
    // Extraer subtítulos en orden ascendente de fecha
    return lastSession.map(e => e.titulo.slice(prefix.length).trim()).filter(Boolean);
  } catch { return []; }
};

export const getDesglosadorMisionTitles = (query: string, limit = 6): string[] => {
  try {
    const data = localStorage.getItem("sistemicar_vehicle_history");
    if (!data) return [];
    const history: Array<{ titulo: string; tipoReloj: string; fecha: number }> = JSON.parse(data);
    const q = query.toLowerCase().trim();
    const seen = new Set<string>();
    return history
      .filter(h => h.tipoReloj === "desglosador" && h.titulo.includes(" → "))
      .sort((a, b) => b.fecha - a.fecha)
      .map(h => h.titulo.split(" → ")[0].trim())
      .filter(t => {
        if (!t || !t.toLowerCase().includes(q)) return false;
        const key = t.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);
  } catch { return []; }
};

export const getDesglosadorMisionData = (query: string, limit = 6): Array<{ titulo: string; subs: Array<{ nombre: string; duracionMin: number | null }> }> => {
  try {
    const data = localStorage.getItem("sistemicar_vehicle_history");
    if (!data) return [];
    const history: Array<{ titulo: string; tipoReloj: string; fecha: number; totalMin?: number }> = JSON.parse(data);
    const q = query.toLowerCase().trim();
    const seen = new Set<string>();
    const parentTitles: string[] = [];
    history
      .filter(h => h.tipoReloj === "desglosador" && h.titulo.includes(" → "))
      .sort((a, b) => b.fecha - a.fecha)
      .forEach(h => {
        const parent = h.titulo.split(" → ")[0].trim();
        if (!parent || !parent.toLowerCase().includes(q)) return;
        const key = parent.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        if (parentTitles.length < limit) parentTitles.push(parent);
      });
    return parentTitles.map(titulo => {
      const prefix = `${titulo} → `;
      const matching = history.filter(h => h.tipoReloj === "desglosador" && h.titulo.startsWith(prefix));
      const sorted = [...matching].sort((a, b) => a.fecha - b.fecha);
      const sessions: Array<typeof sorted> = [];
      let current: typeof sorted = [];
      for (const entry of sorted) {
        if (current.length === 0) { current.push(entry); continue; }
        if (entry.fecha - current[current.length - 1].fecha <= 3600000) {
          current.push(entry);
        } else {
          sessions.push(current);
          current = [entry];
        }
      }
      if (current.length > 0) sessions.push(current);
      const lastSession = sessions[sessions.length - 1] ?? [];
      const subs = lastSession.map(e => ({
        nombre: e.titulo.slice(prefix.length).trim(),
        duracionMin: e.totalMin != null ? e.totalMin : null
      }));
      return { titulo, subs };
    });
  } catch { return []; }
};

export const getRecordSuggestions = (query: string, limit = 5): Array<{ titulo: string; minPerUnit: number }> => {
  if (!query.trim() || query.trim().length < 2) return [];
  try {
    const data = localStorage.getItem("sistemicar_vehicle_history");
    if (!data) return [];
    const history: Array<{ titulo: string; minPerUnit: number; tipoReloj: string }> = JSON.parse(data);
    const q = query.toLowerCase().trim();
    const matching = history.filter(h => h.titulo.toLowerCase().includes(q) && h.minPerUnit > 0);
    const map = new Map<string, { titulo: string; sum: number; count: number }>();
    for (const h of matching) {
      const key = h.titulo.toLowerCase().trim();
      const ex = map.get(key);
      if (ex) { ex.sum += h.minPerUnit; ex.count++; }
      else map.set(key, { titulo: h.titulo, sum: h.minPerUnit, count: 1 });
    }
    return [...map.values()]
      .map(e => ({ titulo: e.titulo, minPerUnit: e.sum / e.count }))
      .sort((a, b) => a.minPerUnit - b.minPerUnit)
      .slice(0, limit);
  } catch { return []; }
};

/** Opciones de energía al inicio / al cierre (Espejo). Letras ASCII: evitan "?" en móviles sin fuente Unicode. */
export const ENERGIA_ESPEJO_OPTIONS = [
  { id: "fluido" as const, label: "Fluido", badge: "F", desc: "Sin presión" },
  { id: "concentrado" as const, label: "Concentrado", badge: "C", desc: "Foco activo" },
  { id: "limite" as const, label: "Al límite", badge: "L", desc: "Alta presión" },
];

/** Payload del modal «Cierre consciente» — energía al terminar (todos los tipos de vehículo). */
export type CierreEnergiaModalPayload =
  | { kind: "flota"; vehicleId: string; status: "cumplido" | "archivado" }
  | { kind: "investigador"; vehicleId: string; cumplido: boolean; cantidadRealizada: number }
  | { kind: "desglosador"; vehicleId: string; subs: SubVehiculo[] }
  | { kind: "descanso"; vehicleId: string; status: "cumplido" | "archivado"; etiqueta: "recuperado" | "parcial" | "fragmentado"; nota: string };

export const cleanSubTitulo = (t: string): string =>
  t.replace(/^Día\s+\d+\s*\[[^\]]+\]:\s*/i, "").trim();

export type DesglosadorSubFormRow = {
  titulo: string;
  cantidadObjetivo: string;
  tiempoRecordMinPerUnit?: number;
  rutaEnfoqueActiva?: boolean;
};

export function buildDesglosadorSubFromForm(
  s: DesglosadorSubFormRow,
  idx: number,
  idSuffix: number
): SubVehiculo {
  const cant = s.cantidadObjetivo ? Number(s.cantidadObjetivo) : undefined;
  const record = s.tiempoRecordMinPerUnit;
  const rutaEnfoque =
    resolveRutaEnfoqueForSub(cant, record, undefined, { enabled: s.rutaEnfoqueActiva !== false }) ?? undefined;
  return {
    id: `sv_${idSuffix}_${idx}`,
    titulo: s.titulo.trim(),
    status: (idx === 0 ? "activo" : "pendiente") as SubVehiculo["status"],
    aperturaAt: idx === 0 ? Date.now() : undefined,
    cantidadObjetivo: cant,
    tiempoRecordMinPerUnit: record,
    tiempoSugeridoSeg:
      cant && record && cant > 0 ? Math.round(cant * record * 60) : undefined,
    rutaEnfoque,
  };
}

/** Sub en cola (o activo si la sesión ya terminó todos los planificados). */
export function buildDesglosadorSubFromRuntime(
  form: DesglosadorSubFormRow,
  existingSubs: SubVehiculo[],
  opts?: { activate?: boolean }
): SubVehiculo {
  const cant = form.cantidadObjetivo ? Number(form.cantidadObjetivo) : undefined;
  const record = form.tiempoRecordMinPerUnit;
  const rutaEnfoque =
    resolveRutaEnfoqueForSub(cant, record, undefined, { enabled: form.rutaEnfoqueActiva !== false }) ?? undefined;
  const activate = opts?.activate ?? false;
  const now = Date.now();
  return {
    id: `sv_${now}_${existingSubs.length}`,
    titulo: form.titulo.trim(),
    status: activate ? "activo" : "pendiente",
    aperturaAt: activate ? now : undefined,
    cantidadObjetivo: cant,
    tiempoRecordMinPerUnit: record,
    tiempoSugeridoSeg:
      cant && record && cant > 0 ? Math.round(cant * record * 60) : undefined,
    rutaEnfoque,
  };
}

export function cierrePayloadHasRutaEnfoque(_p: CierreEnergiaModalPayload): boolean {
  // La ruta se declara al cerrar cada sub; no repetir en cierre global del desglosador.
  return false;
}

export function RutaEnfoqueBar({ restantes, ruta }: { restantes: number; ruta: { N: number; umbrales: { fluido: number; concentrado: number } } }) {
  const { umbrales, N } = ruta;
  const banda = getRutaBandaActual(restantes, umbrales);
  const meta = RUTA_BANDA_META[banda];
  const n = Math.max(1, N);
  const wFluido = ((n - umbrales.fluido) / n) * 100;
  const wConc = ((umbrales.fluido - umbrales.concentrado) / n) * 100;
  const wLim = (umbrales.concentrado / n) * 100;
  const markerLeft = Math.min(98, Math.max(2, ((n - Math.max(0, restantes)) / n) * 100));
  const segments: Array<{ id: RutaBandaId; widthPct: number }> = [
    { id: "fluido", widthPct: wFluido },
    { id: "concentrado", widthPct: wConc },
    { id: "limite", widthPct: wLim },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5" data-testid="ruta-enfoque-bar">
      <motion.div
        className="relative h-2.5 rounded-full overflow-hidden flex"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        animate={banda === "limite" ? { boxShadow: ["0 0 0 rgba(255,49,49,0)", "0 0 10px rgba(255,49,49,0.45)", "0 0 0 rgba(255,49,49,0)"] } : {}}
        transition={banda === "limite" ? { duration: 1.2, repeat: Infinity } : {}}
      >
        {segments.map((seg, i) => {
          const color = RUTA_BANDA_META[seg.id].color;
          const active = banda === seg.id;
          return (
            <motion.div
              key={seg.id}
              className="h-full"
              style={{
                width: `${seg.widthPct}%`,
                backgroundColor: color,
                opacity: active ? 1 : 0.42,
                boxShadow: active ? `inset 0 0 8px ${color}55` : "none",
                borderRight: i < segments.length - 1 ? "1px solid rgba(0,0,0,0.35)" : undefined,
              }}
              animate={active ? { opacity: [0.72, 1, 0.72] } : {}}
              transition={{ duration: seg.id === "limite" ? 1.2 : seg.id === "concentrado" ? 1.6 : 2, repeat: active ? Infinity : 0 }}
            />
          );
        })}
        <div className="absolute top-0 bottom-0 w-0.5 rounded-full" style={{ left: `${markerLeft}%`, backgroundColor: "#fff", boxShadow: "0 0 6px rgba(255,255,255,0.8)" }} />
      </motion.div>
      <div className="flex justify-between px-0.5">
        {segments.map(seg => (
          <span
            key={seg.id}
            className="text-[6px] font-black uppercase tracking-wider"
            style={{ color: banda === seg.id ? RUTA_BANDA_META[seg.id].color : "rgba(255,255,255,0.35)" }}
          >
            {RUTA_BANDA_META[seg.id].icon} {RUTA_BANDA_META[seg.id].label}
          </span>
        ))}
      </div>
      <p className="text-[8px] text-center font-bold uppercase tracking-wider" style={{ color: meta.color }}>
        Banda actual: {meta.label} {meta.icon} · Restan {Math.max(0, Math.floor(restantes))}
      </p>
    </motion.div>
  );
}

/** PS por resistencia de profundidad (referencia por sub — solo situación/planificación). */
const computeDesglosadorDepthPS = (tiempoSugeridoSeg: number | undefined): number => {
  if (tiempoSugeridoSeg == null || !Number.isFinite(tiempoSugeridoSeg) || tiempoSugeridoSeg <= 0) return 0;
  return computeDesglosadorSessionDepthPS(tiempoSugeridoSeg);
};

export type SituacionDesgloseSummary = {
  cumplidos: number;
  fallados: number;
  totalFilas: number;
  psFilas: number;
  psProfundidad: number;
  psDetalles: number;
  psTotal: number;
  minutosBloque: number;
  minutosGanados: number;
  minutosEnCola: number;
  minutosAdelanto: number;
  minutosGanadosSesion: number;
  minutosReales: number;
  eficienciaPct: number | null;
  retoNumero: number;
  casaHechas: number;
  casaPorTexto: CasaTextoCount[];
  mensaje: string;
  combustibleMensaje: string;
};

export function computeSituacionDesgloseSummary(vehicle: Vehicle): SituacionDesgloseSummary {
  const subs = (vehicle.subTareas || []).filter(s => s.enDesgloseCronometro);
  const cumplidos = subs.filter(s => s.resultadoSituacion === "cumplido").length;
  const fallados = subs.filter(s => s.resultadoSituacion === "fallado").length;
  const psFilas = cumplidos * 4;
  const psProfundidad = vehicle.situacionCronometro?.depthBlockPsGranted ?? 0;
  const psDetalles = subs.reduce(
    (acc, st) => acc + (st.detalles?.filter(d => d.entregado && !d.casa).length ?? 0),
    0
  );
  const sc = vehicle.situacionCronometro;
  const bloqueInicio = sc?.bloqueInicioAt ?? vehicle.aperturaAt ?? Date.now();
  const bloqueFin =
    sc?.activo === true
      ? Date.now()
      : (() => {
          const cerradasAt = subs.map(s => s.cerradaAt).filter((t): t is number => t != null);
          return cerradasAt.length > 0 ? Math.max(...cerradasAt) : Date.now();
        })();
  const minutosBloque = Math.max(1, Math.round((bloqueFin - bloqueInicio) / 60000));
  const bolsa = computeSituacionBolsaGanancia(vehicle.subTareas || [], sc);
  const minutosGanados = bolsa.minutosGanadosReto;
  const minutosReales = sumMinutosRealesCronometro(vehicle.subTareas || []);
  const eficienciaPct = computeEficienciaSituacionPct(minutosGanados, minutosReales);
  const psTotal = psFilas + psProfundidad + psDetalles;
  const allCasaItems = (vehicle.subTareas || []).flatMap(st => (st.detalles || []).filter(d => d.casa));
  const casaHechas = countCasaHechas(allCasaItems);
  const casaPorTexto = groupCasaByTexto(allCasaItems).filter(g => g.hechas > 0);

  let mensaje: string;
  if (cumplidos === subs.length && subs.length > 0) {
    mensaje = "Dominio total del bloque. Enumeraste, ejecutaste y cerraste con soberanía.";
  } else if (cumplidos >= fallados && cumplidos > 0) {
    mensaje = "Trabajo duro convertido en territorio conquistado. La mayoría de filas quedó cumplida.";
  } else if (cumplidos > 0) {
    mensaje = "Avance parcial en el bloque. Cada cumplido cuenta, incluso entre el ruido.";
  } else if (fallados > 0) {
    mensaje = "El bloque fue exigente; registrar lo fallado también es soberanía. Mañana afinas el desglose.";
  } else {
    mensaje = "Bloque de desglose cerrado. La claridad de enumerar ya es un acto de poder.";
  }

  return {
    cumplidos,
    fallados,
    totalFilas: subs.length,
    psFilas,
    psProfundidad,
    psDetalles,
    psTotal,
    minutosBloque,
    minutosGanados,
    minutosEnCola: bolsa.minutosEnCola,
    minutosAdelanto: bolsa.minutosAdelanto,
    minutosGanadosSesion: bolsa.minutosGanadosSesion,
    minutosReales,
    eficienciaPct,
    retoNumero: bolsa.retoNumero,
    casaHechas,
    casaPorTexto,
    mensaje,
    combustibleMensaje: formatCombustibleCelebracionBloque({
      minutos: minutosBloque,
      decisiones: cumplidos,
      psTotal,
    }),
  };
}

export function situacionDesgloseBloqueTerminado(subTareas: SubTarea[]): boolean {
  const cronSubs = subTareas.filter(s => s.enDesgloseCronometro);
  if (cronSubs.length === 0) return false;
  return !cronSubs.some(situacionFilaCronometroPendiente);
}

export function situacionDesgloseBloqueListo(subTareas: SubTarea[], sc: Vehicle["situacionCronometro"]): boolean {
  if (sc?.activo !== true) return false;
  return situacionDesgloseBloqueTerminado(subTareas);
}

/** Timbres decrecientes al marcar cumplido — delegado a situacionAlertSounds. */
export async function playSituacionChimes(count: number) {
  return playSituacionCumplidoChimes(count);
}

export const getSubVehicleRecordSuggestions = (query: string, limit = 5): Array<{ titulo: string; minPerUnit: number }> => {
  if (!query.trim() || query.trim().length < 2) return [];
  try {
    const data = localStorage.getItem("sistemicar_vehicle_history");
    if (!data) return [];
    const history: Array<{ titulo: string; minPerUnit: number; tipoReloj: string }> = JSON.parse(data);
    const q = query.toLowerCase().trim();
    const map = new Map<string, { titulo: string; sum: number; count: number }>();
    for (const h of history) {
      if (h.minPerUnit <= 0 || !isFinite(h.minPerUnit)) continue;
      const rawClean = h.titulo.includes(" → ")
        ? h.titulo.split(" → ").slice(1).join(" → ").trim()
        : h.titulo;
      const cleanTitle = cleanSubTitulo(rawClean);
      if (!cleanTitle.toLowerCase().includes(q)) continue;
      const key = cleanTitle.toLowerCase().trim();
      const ex = map.get(key);
      if (ex) { ex.sum += h.minPerUnit; ex.count++; }
      else map.set(key, { titulo: cleanTitle, sum: h.minPerUnit, count: 1 });
    }
    return [...map.values()]
      .map(e => ({ titulo: e.titulo, minPerUnit: e.sum / e.count }))
      .sort((a, b) => a.minPerUnit - b.minPerUnit)
      .slice(0, limit);
  } catch { return []; }
};

export type VehicleHistoryOpts = {
  status?: "cumplido" | "incumplido" | "fallado";
  excluirDeHistorial?: boolean;
  cumplidos?: number;
  fallados?: number;
  totalSubs?: number;
  subResumen?: Array<{
    titulo: string;
    status: "cumplido" | "fallado" | "pendiente";
    cantidadObjetivo?: number;
    cantidadLograda?: number;
    duracionMin?: number;
    rutaDeclarada?: RutaBandaId[];
  }>;
};

export function isSubTareaSituacionTerminada(st: SubTarea): boolean {
  if (st.enDesgloseCronometro) {
    const r = st.resultadoSituacion ?? "pendiente";
    return r === "cumplido" || r === "fallado";
  }
  return st.completada;
}

/** Pendientes arriba, cerradas abajo — conserva el orden relativo de cada grupo. */
export function sortSubTareasTrabajoPrimero(items: SubTarea[]): SubTarea[] {
  const pendientes = items.filter(s => !isSubTareaSituacionTerminada(s));
  const cerradas = items.filter(s => isSubTareaSituacionTerminada(s));
  return [...pendientes, ...cerradas];
}

export function vehicleClosedAtMs(v: Vehicle): number {
  return v.cierreAt || v.aperturaAt || v.createdAt?.getTime?.() || 0;
}


const EXPRESS_PS: Record<string, { cumple: number; arch: number }> = {
  hora: { cumple: VEHICLE_CUMPLIDO_BASE_PS, arch: VEHICLE_ARCHIVADO_BASE_PS },
  situacion: { cumple: 5, arch: 2 },
  omitido: { cumple: 1, arch: 0 },
};

export function calculateVehicleScore(vehicle: Vehicle): {
  difficulty: "facil" | "media" | "dificil";
  potentialCPCumplido: number;
  potentialCPArchivado: number;
  scorePercent: number;
  retoCount: number;
  blandoCount: number;
} {
  if (vehicle.tipoReloj === "desglosador") {
    const subs = vehicle.subVehiculos ?? [];
    const depth = vehicle.desglosadorBloqueDepthPsGranted ?? 0;
    return {
      difficulty: "facil",
      potentialCPCumplido: estimateDesglosadorSessionPs(subs, depth),
      potentialCPArchivado: 0,
      scorePercent: 50,
      retoCount: 0,
      blandoCount: 0,
    };
  }
  if (vehicle.tipoFlota === "situacion") {
    return { difficulty: "facil", potentialCPCumplido: 5, potentialCPArchivado: 0, scorePercent: 50, retoCount: 0, blandoCount: 0 };
  }
  if (vehicle.tipoTerminoRapido) {
    const ps = EXPRESS_PS[vehicle.tipoTerminoRapido] ?? {
      cumple: VEHICLE_CUMPLIDO_BASE_PS,
      arch: VEHICLE_ARCHIVADO_BASE_PS,
    };
    return { difficulty: "facil", potentialCPCumplido: ps.cumple, potentialCPArchivado: ps.arch, scorePercent: 50, retoCount: 0, blandoCount: 0 };
  }
  if (vehicle.tipoFlota === "tiempo") {
    return {
      difficulty: "media",
      potentialCPCumplido: VEHICLE_CUMPLIDO_BASE_PS,
      potentialCPArchivado: VEHICLE_ARCHIVADO_BASE_PS,
      scorePercent: 50,
      retoCount: 0,
      blandoCount: 0,
    };
  }
  if (vehicle.tipoFlota === "descanso") {
    return { difficulty: "facil", potentialCPCumplido: 10, potentialCPArchivado: 5, scorePercent: 50, retoCount: 0, blandoCount: 0 };
  }
  return { difficulty: "facil", potentialCPCumplido: 10, potentialCPArchivado: 5, scorePercent: 50, retoCount: 0, blandoCount: 0 };
}

