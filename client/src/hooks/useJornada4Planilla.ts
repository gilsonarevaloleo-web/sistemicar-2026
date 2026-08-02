/**
 * Planilla del día + rutinas para Dual Kernel.
 * CRUD puro vía persistence — sin conciencia / voz / disciplina.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  applyPlantillaToday,
  addPlantillaRutina,
  deletePlantillaRutina,
  savePlanilla,
  subscribePlantillasRutina,
  subscribeToPlanilla,
  updateSegmentoInPlanilla,
  type Planilla,
  type PlantillaRutina,
  type SegmentoTemplate,
  type SegmentoV5,
} from "@/lib/persistence";
import {
  getJournalDateString,
  getSegmentCalendarDayStartMs,
  isWithinSegmentTimeMargin,
  validateSegmentTimes,
} from "@/lib/segmentTime";
import {
  classifyPuertaTiming,
  isWithinPuertaWindow,
} from "@/lib/segmentAttentionEngine";
import { setActiveSegmento, registrarEvento, COMPONENTES } from "@/lib/evento-universal";
import {
  canCerrarPuertaJ4,
  J4_PUERTA_MANTRA,
} from "@/jornada4/segmentAttentionJ4";

const PIZARRA = "#0a0a0a";
const BLOOD = "#FF2A2A";
const EMERALD = "#00C851";
const GOLD = "#D4AF37";
const PLATA = "#C0C0C0";
const VIOLET = "#8B5CF6";

export const J4_SEGMENT_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
] as const;

export type UseJornada4PlanillaParams = {
  userId: string | undefined;
  safeAwardPS: (amount: number, source: string) => Promise<boolean>;
};

export function useJornada4Planilla({ userId, safeAwardPS }: UseJornada4PlanillaParams) {
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [plantillasRutina, setPlantillasRutina] = useState<PlantillaRutina[]>([]);
  const [busySegId, setBusySegId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setPlanilla(null);
      return;
    }
    const fecha = getJournalDateString();
    return subscribeToPlanilla(
      userId,
      fecha,
      next => {
        setPlanilla(next);
      },
      e => console.error("[j4.planilla]", e)
    );
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setPlantillasRutina([]);
      return;
    }
    return subscribePlantillasRutina(userId, list => {
      setPlantillasRutina(list);
    });
  }, [userId]);

  const segmentoActivo = useMemo(
    () => planilla?.segmentos.find(s => s.estado === "activo") ?? null,
    [planilla]
  );

  const addSegmento = useCallback(
    async (input: {
      nombre: string;
      horaInicio: string;
      horaFin: string;
      color: string;
      proyectoVinculadoId?: string;
    }) => {
      if (!userId) {
        toast.error("Inicia sesión para programar segmentos");
        return false;
      }
      const nombre = input.nombre.trim();
      if (!nombre || !input.horaInicio || !input.horaFin) return false;

      const validation = validateSegmentTimes(input.horaInicio, input.horaFin);
      if (!validation.ok) {
        toast.error("Horario de segmento inválido", {
          description: validation.error,
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
        return false;
      }

      const fecha = getJournalDateString();
      const proyectoId = input.proyectoVinculadoId?.trim() || undefined;
      const seg: SegmentoV5 = {
        id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        nombre,
        horaInicio: input.horaInicio,
        horaFin: input.horaFin,
        color: input.color,
        icono: "layers",
        estado: "pendiente",
        eventos: [],
        psGanados: 0,
        ...(proyectoId ? { proyectoVinculadoId: proyectoId } : {}),
      };

      const planillaBase: Planilla = planilla ?? {
        id: `planilla_${fecha}_${Date.now()}`,
        fecha,
        segmentos: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const optimistic: Planilla = {
        ...planillaBase,
        segmentos: [...planillaBase.segmentos, seg],
        updatedAt: new Date().toISOString(),
      };
      setPlanilla(optimistic);

      try {
        await savePlanilla(userId, optimistic);
        toast.success("Segmento programado", {
          description: `${seg.nombre} · ${seg.horaInicio} – ${seg.horaFin}`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${VIOLET}`, color: VIOLET },
          duration: 2800,
        });
        void safeAwardPS(1, "Segmento creado: " + seg.nombre).then(ok => {
          if (ok) {
            toast.success("+1 PS · segmento", {
              description: seg.nombre,
              style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
              duration: 2000,
            });
          }
        });
        void registrarEvento(COMPONENTES.PLANIFICACION);
        return true;
      } catch {
        setPlanilla(planillaBase);
        toast.error("No se pudo programar el segmento", {
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
        return false;
      }
    },
    [userId, planilla, safeAwardPS]
  );

  const activarSegmento = useCallback(
    async (segId: string) => {
      if (!userId || !planilla || busySegId) return;
      const seg = planilla.segmentos.find(s => s.id === segId);
      if (!seg) return;
      if (seg.estado !== "pendiente") {
        toast.info("Este segmento ya no está pendiente", {
          description: seg.estado === "activo" ? "La puerta ya fue abierta." : `Estado: ${seg.estado}`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
        });
        return;
      }
      const nowMs = Date.now();
      const dayStart = getSegmentCalendarDayStartMs(nowMs);
      if (!isWithinPuertaWindow(nowMs, seg.horaInicio, dayStart)) {
        toast.warning("Ventana de puerta cerrada", {
          description: `Abre la puerta solo ±5 min de ${seg.horaInicio}.`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}40`, color: BLOOD },
          duration: 5000,
        });
        return;
      }
      const puertaTiming = classifyPuertaTiming(nowMs, seg.horaInicio, dayStart);
      const patch = {
        estado: "activo" as const,
        activadoAt: nowMs,
        puertaTiming,
        psGanados: (seg.psGanados || 0) + 2,
      };
      const optimistic: Planilla = {
        ...planilla,
        segmentos: planilla.segmentos.map(s => (s.id === segId ? { ...s, ...patch } : s)),
      };
      setBusySegId(segId);
      setPlanilla(optimistic);
      try {
        const { planilla: saved, localSaved } = await updateSegmentoInPlanilla(
          userId,
          segId,
          patch,
          optimistic
        );
        if (!localSaved) {
          setPlanilla(planilla);
          toast.error("No se pudo guardar en el dispositivo");
          return;
        }
        setPlanilla(saved);
        setActiveSegmento(userId, segId);
        toast.success(`+2 PS · ${J4_PUERTA_MANTRA}`, {
          description: `${seg.nombre} · puerta abierta con intención`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
        });
        void safeAwardPS(2, "Puerta de atención: " + seg.nombre);
        void registrarEvento(COMPONENTES.PLANIFICACION);
      } catch (e) {
        console.error("[j4.activarSegmento]", e);
        setPlanilla(planilla);
        toast.error("No se pudo abrir la puerta");
      } finally {
        setBusySegId(null);
      }
    },
    [userId, planilla, busySegId, safeAwardPS]
  );

  const cerrarSegmento = useCallback(
    async (segId: string) => {
      if (!userId || !planilla || busySegId) return;
      const seg = planilla.segmentos.find(s => s.id === segId);
      if (!seg || seg.estado !== "activo") return;
      const nowMs = Date.now();
      let withinFin = true;
      if (seg.horaFin) {
        const dayStart = getSegmentCalendarDayStartMs(nowMs);
        withinFin = isWithinSegmentTimeMargin(
          nowMs,
          seg.horaInicio,
          seg.horaFin,
          "fin",
          5,
          dayStart
        );
      }
      if (!canCerrarPuertaJ4(seg, nowMs, withinFin)) {
        toast.warning("La puerta está sellada", {
          description: `Cierre con intención (+2 PS) solo ±5 min de ${seg.horaFin}.`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}40`, color: BLOOD },
          duration: 5600,
        });
        return;
      }
      const patch = {
        estado: "cerrado_manual" as const,
        cerradoAt: nowMs,
        psGanados: (seg.psGanados || 0) + 2,
      };
      const optimistic: Planilla = {
        ...planilla,
        segmentos: planilla.segmentos.map(s => (s.id === segId ? { ...s, ...patch } : s)),
      };
      setBusySegId(segId);
      setPlanilla(optimistic);
      try {
        const { planilla: saved, localSaved } = await updateSegmentoInPlanilla(
          userId,
          segId,
          patch,
          optimistic
        );
        if (!localSaved) {
          setPlanilla(planilla);
          toast.error("No se pudo guardar en el dispositivo");
          return;
        }
        setPlanilla(saved);
        if (segmentoActivo?.id === segId) setActiveSegmento(userId, null);
        const recuperacion = seg.puertaSistema
          ? " · recuperaste la puerta del sistema"
          : " · cierre consciente";
        toast.success(`+2 PS · ${J4_PUERTA_MANTRA}`, {
          description: `${seg.nombre}${recuperacion}`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
        });
        void safeAwardPS(2, "Cierre consciente: " + seg.nombre);
        void registrarEvento(COMPONENTES.PLANIFICACION);
      } catch (e) {
        console.error("[j4.cerrarSegmento]", e);
        setPlanilla(planilla);
        toast.error("No se pudo cerrar la puerta");
      } finally {
        setBusySegId(null);
      }
    },
    [userId, planilla, busySegId, segmentoActivo?.id, safeAwardPS]
  );

  const guardarComoRutina = useCallback(
    async (nombre: string, diasActivos: number[]) => {
      if (!userId || !planilla || planilla.segmentos.length === 0) return false;
      const trimmed = nombre.trim();
      if (!trimmed || diasActivos.length === 0) {
        toast.error("Nombre y al menos un día activos");
        return false;
      }
      try {
        const segs: SegmentoTemplate[] = planilla.segmentos.map(s => ({
          nombre: s.nombre,
          horaInicio: s.horaInicio,
          horaFin: s.horaFin,
          color: s.color,
          icono: s.icono,
          ...(s.proyectoVinculadoId
            ? { proyectoVinculadoId: s.proyectoVinculadoId }
            : {}),
        }));
        const nueva = await addPlantillaRutina(userId, {
          nombre: trimmed,
          tipo: "dia_especial",
          diasActivos,
          segmentos: segs,
        });
        setPlantillasRutina(prev =>
          prev.some(p => p.id === nueva.id) ? prev : [nueva, ...prev]
        );
        toast.success("Rutina guardada", {
          description: `${segs.length} segmentos · "${trimmed}"`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
        });
        return true;
      } catch (e) {
        console.error("[j4.guardarComoRutina]", e);
        toast.error("No se pudo guardar la rutina");
        return false;
      }
    },
    [userId, planilla]
  );

  const cargarRutina = useCallback(
    async (plantilla: PlantillaRutina) => {
      if (!userId) {
        toast.error("Inicia sesión para cargar la rutina");
        return false;
      }
      try {
        const next = await applyPlantillaToday(userId, plantilla);
        setPlanilla(next);
        toast.success(`Rutina cargada: ${plantilla.nombre}`, {
          description: `${plantilla.segmentos.length} segmentos programados`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
        });
        return true;
      } catch (e) {
        console.error("[j4.cargarRutina]", e);
        toast.error("No se pudo cargar la rutina");
        return false;
      }
    },
    [userId]
  );

  const eliminarRutina = useCallback(
    async (plantillaId: string) => {
      if (!userId) return;
      await deletePlantillaRutina(userId, plantillaId);
      setPlantillasRutina(prev => prev.filter(p => p.id !== plantillaId));
      toast.success("Rutina eliminada", {
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
    },
    [userId]
  );

  return {
    planilla,
    plantillasRutina,
    segmentoActivo,
    busySegId,
    addSegmento,
    activarSegmento,
    cerrarSegmento,
    guardarComoRutina,
    cargarRutina,
    eliminarRutina,
  };
}
