import type { MutableRefObject } from "react";
import {
  executeFlotaLaunch,
  type DesglosadorSubFormRow,
  type ExecuteFlotaLaunchParams,
  type FlotaLaunchForm,
} from "@/lib/executeFlotaLaunch";
import {
  flushLocalVehicles,
  parkActiveVehiclesForResume,
  updateVehicle,
  type Vehicle,
} from "@/lib/persistence";
import { scheduleSaveLocalVehicles } from "@/lib/deferredVehicleSave";
import { runShadowTaskAsync } from "@/lib/desglosadorShadow";
import {
  situacionMinutosHastaObjetivoHora,
  situacionObjetivoHoraToContratoMs,
} from "@/lib/situacionGanancia";
import { buildSituacionRingSeed } from "./situacionLaunchSeed";
import { buildSituacionLibreSeed } from "./situacionLibreSeed";
import { burstJornada4Tick } from "./jornada4Tick";
import { reconcileCoberturaHuecos } from "./coberturaHuecosLog";

export type Jornada4LaunchForm = FlotaLaunchForm & {
  /** Filas situacionales (lista libre o ring). */
  situacionFilas?: string[];
  /** Dirección por fila situacional (paralelo a situacionFilas). */
  situacionFilasProyectoIds?: Array<string | undefined>;
  /** @deprecated Preferir situacionObjetivoHora (HH:mm). */
  situacionMinutosBloque?: number;
  /** Hora de término del ring (HH:mm) — no minutos ciegos. */
  situacionObjetivoHora?: string;
  /**
   * Conquista: varias tareas independientes → N desglosadores de 1 sub
   * (sin secuencia compartida).
   */
  tareasIndependientes?: DesglosadorSubFormRow[];
  /** Si true con tareasIndependientes: lanzar N desglosadores 1-sub. */
  conquistaComoIndependientes?: boolean;
  /** Opt-in ring: entrenamiento de enfoque serio (Soberanía). */
  modoEntrenamientoRing?: boolean;
  /** Opt-in conquista: desglosador anclado al segmento (Operativo). */
  ancladoAlSegmento?: boolean;
};

export type ExecuteJornada4LaunchParams = Omit<ExecuteFlotaLaunchParams, "form"> & {
  form: Jornada4LaunchForm;
};

/**
 * Lanza Conquista/Situacional en modo rápido o desglose.
 * - Conquista rápido: tarea = título + unidades (sin secuencia).
 * - Situacional libre: filas sin ring/meta.
 * - Situacional ring: filas + meta sellada (atómico en el paint/remote del launch).
 */
export async function executeJornada4Launch(
  params: ExecuteJornada4LaunchParams
): Promise<string | null> {
  const { form, vehiclesRef, setVehicles, userId, ...rest } = params;
  const {
    situacionFilas,
    situacionFilasProyectoIds,
    situacionMinutosBloque,
    situacionObjetivoHora,
    tareasIndependientes,
    conquistaComoIndependientes,
    modoEntrenamientoRing,
    ancladoAlSegmento,
    ...baseForm
  } = form;

  const modo = baseForm.modo ?? "desglose";

  // Conquista independientes: N desglosadores de 1 sub (sin secuencia compartida).
  if (
    baseForm.tipoFlota === "tiempo" &&
    conquistaComoIndependientes &&
    (tareasIndependientes?.length ?? 0) > 0
  ) {
    const tasks = (tareasIndependientes ?? [])
      .map(t => ({
        ...t,
        titulo: t.titulo.trim(),
        cantidadObjetivo: t.cantidadObjetivo.trim(),
      }))
      .filter(t => t.titulo.length > 0 && Number(t.cantidadObjetivo) > 0);

    if (tasks.length === 0) return null;

    let lastId: string | null = null;
    for (const task of tasks) {
      const id = await executeFlotaLaunch({
        ...rest,
        userId,
        vehiclesRef,
        setVehicles,
        form: {
          titulo: task.titulo,
          tipoFlota: "tiempo",
          modo: "desglose",
          desglosadorSubs: [task],
          ...(task.proyectoId?.trim()
            ? { proyectoId: task.proyectoId.trim() }
            : baseForm.proyectoId?.trim()
              ? { proyectoId: baseForm.proyectoId.trim() }
              : {}),
          ...(ancladoAlSegmento === true ? { ancladoAlSegmento: true } : {}),
        },
      });
      if (!id) break;
      lastId = id;
      try {
        reconcileCoberturaHuecos({
          vehicles: vehiclesRef.current,
          coverTitulo: task.titulo,
        });
      } catch {
        /* non-fatal */
      }
    }
    return lastId;
  }

  // Legacy: conquista rápido produccion — migrar a 1-sub desglosador.
  if (baseForm.tipoFlota === "tiempo" && modo === "rapido") {
    const tasks = (tareasIndependientes ?? [])
      .map(t => ({
        ...t,
        titulo: t.titulo.trim(),
        cantidadObjetivo: t.cantidadObjetivo.trim(),
      }))
      .filter(t => t.titulo.length > 0);

    const toLaunch =
      tasks.length > 0
        ? tasks
        : baseForm.titulo.trim()
          ? [
              {
                tempId: "single",
                titulo: baseForm.titulo.trim(),
                cantidadObjetivo:
                  baseForm.cantidadObjetivo != null
                    ? String(baseForm.cantidadObjetivo)
                    : "",
                tiempoRecordMinPerUnit: baseForm.tiempoRecordMinPerUnit,
              },
            ]
          : [];

    if (toLaunch.length === 0) return null;

    let lastId: string | null = null;
    for (const task of toLaunch) {
      const id = await executeFlotaLaunch({
        ...rest,
        userId,
        vehiclesRef,
        setVehicles,
        form: {
          titulo: task.titulo,
          tipoFlota: "tiempo",
          modo: "desglose",
          desglosadorSubs: [
            {
              tempId: task.tempId ?? "single",
              titulo: task.titulo,
              cantidadObjetivo: task.cantidadObjetivo,
              tiempoRecordMinPerUnit: task.tiempoRecordMinPerUnit,
              proyectoId: task.proyectoId,
            },
          ],
          ...(task.proyectoId?.trim()
            ? { proyectoId: task.proyectoId.trim() }
            : baseForm.proyectoId?.trim()
              ? { proyectoId: baseForm.proyectoId.trim() }
              : {}),
          ...(ancladoAlSegmento === true ? { ancladoAlSegmento: true } : {}),
        },
      });
      if (!id) break;
      lastId = id;
      try {
        reconcileCoberturaHuecos({
          vehicles: vehiclesRef.current,
          coverTitulo: task.titulo,
        });
      } catch {
        /* non-fatal */
      }
    }
    return lastId;
  }

  const situacionTitulo =
    baseForm.tipoFlota === "situacion" && modo === "rapido"
      ? baseForm.titulo.trim() ||
        (situacionFilas ?? []).map(f => f.trim()).find(Boolean) ||
        "Lista libre"
      : baseForm.titulo;

  // Ring / lista libre: semilla ANTES del launch para paint + remote atómicos.
  let situacionLaunchSeed: FlotaLaunchForm["situacionLaunchSeed"];
  if (baseForm.tipoFlota === "situacion" && modo === "desglose") {
    const now = Date.now();
    const hora = situacionObjetivoHora?.trim();
    const fromHora = hora ? situacionMinutosHastaObjetivoHora(hora, now) : null;
    const contratoMs = hora ? situacionObjetivoHoraToContratoMs(hora, now) : null;
    const minutosBloque =
      fromHora ??
      (situacionMinutosBloque != null && situacionMinutosBloque > 0
        ? Math.round(situacionMinutosBloque)
        : 30);
    const proyectoEnfoqueId =
      baseForm.proyectoId?.trim() ||
      rest.segmentoActivo?.proyectoVinculadoId?.trim() ||
      undefined;
    const seed = buildSituacionRingSeed({
      filas: situacionFilas ?? [],
      filasProyectoIds: situacionFilasProyectoIds,
      minutosBloque,
      now,
      horaFinMs: contratoMs ?? undefined,
      proyectoEnfoqueId,
      modoEntrenamiento: modoEntrenamientoRing === true,
    });
    if (seed) {
      situacionLaunchSeed = {
        subTareas: seed.subTareas,
        situacionCronometro: seed.situacionCronometro,
        situacionCupoAnchor: seed.situacionCupoAnchor,
      };
    }
  }

  if (baseForm.tipoFlota === "situacion" && modo === "rapido") {
    const proyectoEnfoqueId =
      baseForm.proyectoId?.trim() ||
      rest.segmentoActivo?.proyectoVinculadoId?.trim() ||
      undefined;
    const seed = buildSituacionLibreSeed({
      filas: situacionFilas ?? [],
      filasProyectoIds: situacionFilasProyectoIds,
      proyectoEnfoqueId,
    });
    if (seed) {
      situacionLaunchSeed = {
        subTareas: seed.subTareas,
        situacionCronometro: null,
        situacionCupoAnchor: null,
      };
    }
  }

  const id = await executeFlotaLaunch({
    ...rest,
    userId,
    vehiclesRef,
    setVehicles,
    form: {
      ...baseForm,
      titulo: situacionTitulo,
      ...(situacionLaunchSeed ? { situacionLaunchSeed } : {}),
      ...(baseForm.tipoFlota === "tiempo" && ancladoAlSegmento === true
        ? { ancladoAlSegmento: true }
        : {}),
    },
  });
  if (!id) return null;

  try {
    reconcileCoberturaHuecos({
      vehicles: vehiclesRef.current,
      coverTitulo: situacionTitulo.trim(),
    });
  } catch {
    /* non-fatal */
  }

  // Defensa: si el launch pintó sin seed (legado / race), aplicar + flush sync.
  if (baseForm.tipoFlota === "situacion" && situacionLaunchSeed) {
    const launched = vehiclesRef.current.find(v => v.id === id);
    const needsSeed =
      (!launched?.situacionCronometro && situacionLaunchSeed.situacionCronometro != null) ||
      ((launched?.subTareas?.length ?? 0) === 0 &&
        (situacionLaunchSeed.subTareas?.length ?? 0) > 0);
    if (needsSeed && situacionLaunchSeed.situacionCronometro) {
      paintSituacionSeed(
        id,
        {
          subTareas: situacionLaunchSeed.subTareas,
          situacionCronometro: situacionLaunchSeed.situacionCronometro,
          situacionCupoAnchor: situacionLaunchSeed.situacionCupoAnchor!,
        },
        vehiclesRef,
        setVehicles
      );
      void runShadowTaskAsync(async () => {
        try {
          await updateVehicle(
            userId,
            id,
            {
              subTareas: situacionLaunchSeed!.subTareas,
              situacionCronometro: situacionLaunchSeed!.situacionCronometro,
              situacionCupoAnchor: situacionLaunchSeed!.situacionCupoAnchor,
            },
            { skipLocalSync: true }
          );
        } catch (e) {
          console.error("[executeJornada4Launch] seed situacion fallback", e);
        }
      });
    } else if (needsSeed) {
      // Lista libre: solo filas, sin cronómetro.
      paintSituacionLibre(id, situacionLaunchSeed.subTareas, vehiclesRef, setVehicles);
      void runShadowTaskAsync(async () => {
        try {
          await updateVehicle(
            userId,
            id,
            {
              subTareas: situacionLaunchSeed!.subTareas,
              situacionCronometro: null,
              situacionCupoAnchor: null,
            },
            { skipLocalSync: true }
          );
        } catch (e) {
          console.error("[executeJornada4Launch] seed situacion libre fallback", e);
        }
      });
    } else {
      // Seed ya en paint: asegurar disco síncrono (no solo debounce/idle).
      flushLocalVehicles(vehiclesRef.current);
      parkActiveVehiclesForResume(vehiclesRef.current);
      burstJornada4Tick();
    }
  }

  return id;
}

function paintSituacionSeed(
  vehicleId: string,
  seed: {
    subTareas: NonNullable<Vehicle["subTareas"]>;
    situacionCronometro: NonNullable<Vehicle["situacionCronometro"]>;
    situacionCupoAnchor: NonNullable<Vehicle["situacionCupoAnchor"]>;
  },
  vehiclesRef: MutableRefObject<Vehicle[]>,
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void
): void {
  const map = (list: Vehicle[]) =>
    list.map(v =>
      v.id === vehicleId
        ? {
            ...v,
            subTareas: seed.subTareas,
            situacionCronometro: seed.situacionCronometro,
            situacionCupoAnchor: seed.situacionCupoAnchor,
          }
        : v
    );
  vehiclesRef.current = map(vehiclesRef.current);
  setVehicles(map);
  flushLocalVehicles(vehiclesRef.current);
  parkActiveVehiclesForResume(vehiclesRef.current);
  scheduleSaveLocalVehicles(vehiclesRef.current);
  burstJornada4Tick();
}

function paintSituacionLibre(
  vehicleId: string,
  subTareas: NonNullable<Vehicle["subTareas"]>,
  vehiclesRef: MutableRefObject<Vehicle[]>,
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void
): void {
  const map = (list: Vehicle[]) =>
    list.map(v =>
      v.id === vehicleId
        ? {
            ...v,
            subTareas,
            situacionCronometro: undefined,
            situacionCupoAnchor: undefined,
          }
        : v
    );
  vehiclesRef.current = map(vehiclesRef.current);
  setVehicles(map);
  flushLocalVehicles(vehiclesRef.current);
  parkActiveVehiclesForResume(vehiclesRef.current);
  scheduleSaveLocalVehicles(vehiclesRef.current);
  burstJornada4Tick();
}
