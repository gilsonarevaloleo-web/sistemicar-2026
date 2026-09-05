/**
 * Semilla de ring situacional al lanzar desde Dual Kernel.
 * Deja el vehículo operable de inmediato (sin pasar por V3).
 */
import type { SubTarea, Vehicle } from "@/lib/persistence";
import { normalizeSeccionTitulo } from "@/lib/desglosadorSecciones";
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
  /** Familia / título propio por fila (paralelo; vacío = sale del bloque). */
  filasSeccionTitulos?: Array<string | undefined>;
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
  const ids = opts.filasProyectoIds ?? [];
  const secciones = opts.filasSeccionTitulos ?? [];
  const filas = opts.filas
    .map((f, i) => ({
      texto: f.trim(),
      proyectoId: ids[i]?.trim() || undefined,
      seccionTitulo: normalizeSeccionTitulo(secciones[i]) ?? undefined,
    }))
    .filter(f => f.texto.length > 0);
  if (filas.length === 0) return null;
  const minutosBloque = Math.max(1, Math.round(opts.minutosBloque));
  const proyectoEnfoqueId = opts.proyectoEnfoqueId?.trim() || undefined;

  let subTareas: SubTarea[] = filas.map((fila, i) => {
    const proyectoId = fila.proyectoId || proyectoEnfoqueId;
    return {
      id: `st_j4_${now}_${i}`,
      texto: fila.texto,
      completada: false,
      creadaAt: now,
      enDesgloseCronometro: true,
      resultadoSituacion: "pendiente" as const,
      ...(proyectoId ? { proyectoId } : {}),
      ...(fila.seccionTitulo ? { seccionTitulo: fila.seccionTitulo } : {}),
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
