/**
 * Horas enumeradas del timón.
 *
 * El punto de producción acumula vehículos en Hora 1, Hora 2, Hora 3…
 * La conciencia siente el enfoque en horas, no en minutos sueltos.
 * Al cambiar el timón, esa numeración se sella: la estancia se vuelve peldaño
 * (lo ya caminado). El nuevo punto empieza otra vez en Hora 1.
 */

export const MINUTOS_POR_HORA = 60;

export interface TimonVehiculoStamp {
  vehicleId: string;
  titulo: string;
  minutos: number;
  tipoOrigen: "tiempo" | "situacion";
  closedAt: number;
  /** Hora 1-based en la que empieza a contar este vehículo. */
  horaInicio: number;
  /** Hora 1-based en la que termina (puede ser la misma). */
  horaFin: number;
}

export interface TimonHoraVista {
  numero: number;
  minutos: number;
  vehiculos: TimonVehiculoStamp[];
  completa: boolean;
}

export interface TimonEpisodio {
  id: string;
  puntoId: string;
  puntoTitulo: string;
  startedAt: number;
  /** Minutos de todos los envíos a este timón (enumeración). */
  minutosAcumulados: number;
  /** Minutos de origen tiempo — alimentan Min/Horas norte al sellar. */
  minutosTiempo: number;
  vehiculos: TimonVehiculoStamp[];
}

export interface TimonResumenPeldano {
  puntoId: string;
  puntoTitulo: string;
  horas: number;
  minutos: number;
  minutosTiempo: number;
  vehiculos: TimonVehiculoStamp[];
}

/** Offset 0-based en la línea de minutos → número de hora (1-based). */
export function horaNumeroDeMinuto(offsetMin: number): number {
  if (offsetMin < 0) return 1;
  return Math.floor(offsetMin / MINUTOS_POR_HORA) + 1;
}

/** Hora en curso del episodio (siempre ≥ 1). */
export function horaEnCurso(minutosAcumulados: number): number {
  if (minutosAcumulados <= 0) return 1;
  return horaNumeroDeMinuto(minutosAcumulados - 1);
}

export function horasCompletasDeMinutos(minutos: number): number {
  return Math.max(0, Math.floor(Math.max(0, minutos) / MINUTOS_POR_HORA));
}

export function crearTimonEpisodio(
  puntoId: string,
  puntoTitulo: string,
  now = Date.now()
): TimonEpisodio {
  return {
    id: `timon_${now}_${Math.random().toString(36).slice(2, 7)}`,
    puntoId,
    puntoTitulo: puntoTitulo.trim() || "Punto de producción",
    startedAt: now,
    minutosAcumulados: 0,
    minutosTiempo: 0,
    vehiculos: [],
  };
}

export function episodioTimonVacio(
  episodio: TimonEpisodio | null | undefined
): boolean {
  if (!episodio) return true;
  return episodio.minutosAcumulados <= 0 && episodio.vehiculos.length === 0;
}

export function yaEstaEnTimon(
  episodio: TimonEpisodio | null | undefined,
  vehicleId: string
): boolean {
  const id = vehicleId.trim();
  if (!id || !episodio) return false;
  return episodio.vehiculos.some(v => v.vehicleId === id);
}

export function accrueVehiculoAlTimon(
  episodio: TimonEpisodio,
  input: {
    vehicleId: string;
    titulo: string;
    minutos: number;
    tipoOrigen: "tiempo" | "situacion";
    closedAt?: number;
  }
): TimonEpisodio {
  const vehicleId = input.vehicleId.trim();
  if (!vehicleId) return episodio;
  if (yaEstaEnTimon(episodio, vehicleId)) return episodio;
  const minutos = Math.max(0, Math.round(input.minutos));
  if (minutos <= 0) return episodio;

  const start = episodio.minutosAcumulados;
  const horaInicio = horaNumeroDeMinuto(start);
  const horaFin = horaNumeroDeMinuto(start + minutos - 1);
  const stamp: TimonVehiculoStamp = {
    vehicleId,
    titulo: input.titulo.trim() || "Vehículo",
    minutos,
    tipoOrigen: input.tipoOrigen,
    closedAt: input.closedAt ?? Date.now(),
    horaInicio,
    horaFin,
  };
  return {
    ...episodio,
    minutosAcumulados: start + minutos,
    minutosTiempo:
      input.tipoOrigen === "tiempo"
        ? episodio.minutosTiempo + minutos
        : episodio.minutosTiempo,
    vehiculos: [...episodio.vehiculos, stamp],
  };
}

export function horasDeEpisodio(episodio: TimonEpisodio): TimonHoraVista[] {
  if (episodio.minutosAcumulados <= 0) {
    return [
      {
        numero: 1,
        minutos: 0,
        vehiculos: [],
        completa: false,
      },
    ];
  }
  const n = horaEnCurso(episodio.minutosAcumulados);
  const horas: TimonHoraVista[] = [];
  for (let i = 1; i <= n; i++) {
    const isLast = i === n;
    const minutos = isLast
      ? episodio.minutosAcumulados - (i - 1) * MINUTOS_POR_HORA
      : MINUTOS_POR_HORA;
    const vehiculos = episodio.vehiculos.filter(
      v => v.horaInicio <= i && i <= v.horaFin
    );
    horas.push({
      numero: i,
      minutos,
      vehiculos,
      completa: minutos >= MINUTOS_POR_HORA,
    });
  }
  return horas;
}

export function formatHoraLabel(numero: number): string {
  return `Hora ${Math.max(1, Math.round(numero))}`;
}

/**
 * Cantidad que la conciencia puede sentir: horas enteras, sin minutos sueltos.
 * Menos de 60 min → "menos de 1 h".
 */
export function formatHorasCerradas(minutos: number): string {
  const h = horasCompletasDeMinutos(minutos);
  if (h <= 0) return "menos de 1 h";
  return h === 1 ? "1 h" : `${h} h`;
}

export function resumenTimonDesdeEpisodio(
  episodio: TimonEpisodio
): TimonResumenPeldano {
  const horas = horasDeEpisodio(episodio);
  const n =
    episodio.minutosAcumulados <= 0 ? 0 : horas.length;
  return {
    puntoId: episodio.puntoId,
    puntoTitulo: episodio.puntoTitulo,
    horas: n,
    minutos: episodio.minutosAcumulados,
    minutosTiempo: episodio.minutosTiempo,
    vehiculos: episodio.vehiculos,
  };
}
