/**
 * Semilla de ring situacional al lanzar desde Dual Kernel.
 * Deja el vehículo operable de inmediato (sin pasar por V3).
 */
import type { SubTarea, Vehicle } from "@/lib/persistence";
import { redistribuirMinutosSituacionCronometro } from "@/lib/situacionCupoDistrib";

export type SituacionRingSeed = {
  subTareas: SubTarea[];
  situacionCronometro: NonNullable<Vehicle["situacionCronometro"]>;
  situacionCupoAnchor: { subTareaId: string; startedAt: number };
};

export function buildSituacionRingSeed(opts: {
  filas: string[];
  /** Dirección por fila (misma longitud o más corta; vacío = hereda enfoque). */
  filasProyectoIds?: Array<string | undefined>;
  minutosBloque: number;
  now?: number;
  /** Si se pasa, fija el contrato a esa hora (meta HH:mm convertida). */
  horaFinMs?: number;
  /** Proyecto / centro vinculado (enfoque del ring / default). */
  proyectoEnfoqueId?: string;
  /** Contrato opt-in: entrenamiento de enfoque serio. */
  modoEntrenamiento?: boolean;
}): SituacionRingSeed | null {
  const now = opts.now ?? Date.now();
  const filas = opts.filas.map(f => f.trim()).filter(Boolean);
  if (filas.length === 0) return null;
  const minutosBloque = Math.max(1, Math.round(opts.minutosBloque));
  const proyectoEnfoqueId = opts.proyectoEnfoqueId?.trim() || undefined;
  const ids = opts.filasProyectoIds ?? [];

  let subTareas: SubTarea[] = filas.map((texto, i) => {
    const filaId = ids[i]?.trim() || undefined;
    const proyectoId = filaId || proyectoEnfoqueId;
    return {
      id: `st_j4_${now}_${i}`,
      texto,
      completada: false,
      creadaAt: now,
      enDesgloseCronometro: true,
      resultadoSituacion: "pendiente" as const,
      ...(proyectoId ? { proyectoId } : {}),
    };
  });

  subTareas = redistribuirMinutosSituacionCronometro(subTareas, minutosBloque);
  const firstId = subTareas[0]?.id;
  if (!firstId) return null;

  const horaFinMs =
    opts.horaFinMs != null && opts.horaFinMs > now
      ? opts.horaFinMs
      : now + minutosBloque * 60_000;
  return {
    subTareas,
    situacionCronometro: {
      activo: true,
      bloqueInicioAt: now,
      horaFinMs,
      horaFinContratoMs: horaFinMs,
      retoNumero: 1,
      retosCompletados: 0,
      minutosGanadosReto: 0,
      minutosGanadosSesion: 0,
      saldoAdelantoMin: 0,
      depthBlockPsGranted: 0,
      ...(proyectoEnfoqueId ? { proyectoEnfoqueId } : {}),
      ...(opts.modoEntrenamiento === true ? { modoEntrenamiento: true } : {}),
    },
    situacionCupoAnchor: { subTareaId: firstId, startedAt: now },
  };
}
