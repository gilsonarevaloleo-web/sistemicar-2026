import type { SubTarea, Vehicle } from "./persistence";

/** Minutos de holgura en meta para invitar a nueva ronda o vehículo. */
export const RING_SOBRA_INVITACION_MIN = 20;

export const RING_COPY = {
  taller: "Taller",
  ring: "Ring de enfoque real",
  abrirRing: "Abrir ring de enfoque real",
  siguienteRonda: "Siguiente ronda",
  sellarEnRing: "Sellar en ring (con tiempo)",
  cerrarRing: "Cerrar ring de enfoque real",
  cerrarRingGolpe: "Cerrar ring de golpe",
  anadirAlRing: "Añadir al ring de enfoque",
  sellarDirectoRing: "Sellar en ring",
  rondaLista: "Ronda lista — cierra el ring cuando quieras",
  tallerHint:
    "Izq. sellar en ring (con tiempo) · Der. cerrar sin reloj (+2 PS)",
  ringHint:
    "El ring es limitado — sella aquí solo lo que vas a sostener con tiempo. El resto ciérralo en Taller sin reloj.",
} as const;

export function ringBienvenidaParts(retoNumero: number): string[] {
  if (retoNumero > 1) {
    return [
      "Siguiente ronda. Ring de enfoque real.",
      "Sostén cada decisión con tiempo sellado.",
    ];
  }
  return [
    "Bienvenido al entrenamiento de enfoque real.",
    "Aquí ejercitas sostener una decisión con tiempo sellado.",
    "Lo que cierres aquí cuenta; lo que abandones, no.",
  ];
}

export function ringTiempoSobraParts(minutosSobra: number): string[] {
  const n = Math.max(RING_SOBRA_INVITACION_MIN, Math.round(minutosSobra));
  return [
    `Dominaste este bloque. Te sobran ${n} minutos en la meta.`,
    "Puedes abrir un vehículo nuevo si quieres seguir,",
    "o sellar otra ronda y terminar en victoria.",
  ];
}

/** Cierra el cronómetro sin contar reto completado ni bolsa (solo cierre manual legacy). */
export function buildSituacionCronometroPausaInactividad(
  sc: NonNullable<Vehicle["situacionCronometro"]>
): NonNullable<Vehicle["situacionCronometro"]> {
  return {
    activo: false,
    bloqueInicioAt: sc.bloqueInicioAt,
    depthBlockPsGranted: sc.depthBlockPsGranted ?? 0,
    retosCompletados: sc.retosCompletados ?? 0,
    retoNumero: sc.retoNumero ?? 1,
    minutosGanadosReto: sc.minutosGanadosReto ?? 0,
    minutosGanadosSesion: sc.minutosGanadosSesion ?? 0,
    saldoAdelantoMin: sc.saldoAdelantoMin ?? 0,
    ...(sc.bolsaSegundoRetoMin != null ? { bolsaSegundoRetoMin: sc.bolsaSegundoRetoMin } : {}),
    ...(sc.horaFinContratoMs != null
      ? { horaFinContratoMs: sc.horaFinContratoMs, horaFinMs: sc.horaFinMs ?? sc.horaFinContratoMs }
      : sc.horaFinMs != null
        ? { horaFinMs: sc.horaFinMs, horaFinContratoMs: sc.horaFinMs }
        : {}),
    ...(sc.proyectoEnfoqueId ? { proyectoEnfoqueId: sc.proyectoEnfoqueId } : {}),
  };
}

/** Filas pendientes selladas en el ring activo. */
export function filtrarRingPendientes(subTareas: SubTarea[]): SubTarea[] {
  return subTareas.filter(
    st => st.enDesgloseCronometro && (st.resultadoSituacion ?? "pendiente") === "pendiente"
  );
}

export function ringTieneFilasPendientes(subTareas: SubTarea[]): boolean {
  return filtrarRingPendientes(subTareas).length > 0;
}

/** Ring activo o pausado con filas pendientes — permite cumplido/fallado tras pausa. */
export function ringSessionOperable(
  sc: Vehicle["situacionCronometro"] | null | undefined,
  subTareas: SubTarea[]
): boolean {
  if (!sc) return false;
  if (sc.activo === true) return true;
  return ringTieneFilasPendientes(subTareas);
}

/** Reanuda cronómetro pausado (mismo bloque). */
export function reanudarSituacionCronometroRing(
  sc: NonNullable<Vehicle["situacionCronometro"]>
): NonNullable<Vehicle["situacionCronometro"]> {
  return { ...sc, activo: true };
}

export function quitarSubsPorId(subTareas: SubTarea[], ids: Set<string>): SubTarea[] {
  if (ids.size === 0) return subTareas;
  return subTareas.filter(st => !ids.has(st.id));
}

/** Reserva de respaldo: devuelve al Taller del vehículo si falla el Crisol. */
export function liberarRingPendientesAlTaller(subTareas: SubTarea[]): SubTarea[] {
  return subTareas.map(st => {
    if (!st.enDesgloseCronometro) return st;
    if ((st.resultadoSituacion ?? "pendiente") !== "pendiente") return st;
    const next: SubTarea = {
      ...st,
      enDesgloseCronometro: false,
      completada: false,
    };
    delete (next as { resultadoSituacion?: string }).resultadoSituacion;
    delete (next as { minutosCupo?: number }).minutosCupo;
    delete (next as { cupoFijo?: boolean }).cupoFijo;
    delete (next as { duracionRealSec?: number }).duracionRealSec;
    delete (next as { cerradaAt?: number }).cerradaAt;
    return next;
  });
}
