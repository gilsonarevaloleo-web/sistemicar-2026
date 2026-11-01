/**
 * Asistencia consciente de Depósito.
 * Un día Lima, una elección. La ventana nombra fecha-disciplina;
 * no cierra la puerta. La persistencia sube de valor cuando se elige.
 */

export const DEPOSITO_ASISTENCIA_TZ = "America/Lima" as const;
export const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;
export const CALENDARIO_SEMANAS = 4;
export const MENSAJE_SESION_CUMPLIDA =
  "Sesión Sistemicar cumplida. Continúa así con tu desarrollo.";

export const DIAS_SEMANA = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export type IntencionAsistencia = "si" | "no";

export type EstadoDiaAsistencia =
  | "cumplida"
  | "dijo_si"
  | "dijo_no"
  | "ausente"
  | "futuro"
  | "hoy";

export interface RegistroAsistencia {
  fecha: string;
  intencion?: IntencionAsistencia;
  horaIntencion?: string;
  sesionCumplida: boolean;
  horaCumplida?: string;
}

export interface LibroAsistencia {
  registros: Record<string, RegistroAsistencia>;
}

export interface MarcaConciencia {
  fecha: string;
  dia: string;
  hora: string;
  fechaHumana: string;
}

export interface CeldaAsistencia {
  fecha: string;
  dia: (typeof DIAS_SEMANA)[number];
  estado: EstadoDiaAsistencia;
  esHoy: boolean;
  registro?: RegistroAsistencia;
}

export interface ResumenAsistencia {
  diasConSesion: number;
  diasSinSesion: number;
  rachaActual: number;
  nombradosSinSesion: number;
}

export interface PreguntaConciencia {
  titulo: string;
  pregunta: string;
  marca: string;
  valor: string;
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

export function libroVacio(): LibroAsistencia {
  return { registros: {} };
}

export function esFechaCivil(value: unknown): value is string {
  return typeof value === "string" && FECHA_RE.test(value);
}

export function limaParts(fromMs: number = Date.now()): {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hours: number;
  minutes: number;
} {
  const lima = new Date(fromMs + LIMA_OFFSET_MS);
  return {
    year: lima.getUTCFullYear(),
    month: lima.getUTCMonth() + 1,
    day: lima.getUTCDate(),
    weekday: lima.getUTCDay(),
    hours: lima.getUTCHours(),
    minutes: lima.getUTCMinutes(),
  };
}

export function limaDateKey(fromMs: number = Date.now()): string {
  const p = limaParts(fromMs);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function limaHoraLabel(fromMs: number = Date.now()): string {
  const p = limaParts(fromMs);
  return `${String(p.hours).padStart(2, "0")}:${String(p.minutes).padStart(2, "0")}`;
}

export function marcaConciencia(fromMs: number = Date.now()): MarcaConciencia {
  const p = limaParts(fromMs);
  const fecha = limaDateKey(fromMs);
  return {
    fecha,
    dia: DIAS_SEMANA[p.weekday],
    hora: limaHoraLabel(fromMs),
    fechaHumana: `${p.day} de ${MESES[p.month - 1]} de ${p.year}`,
  };
}

export function preguntaConciencia(
  fromMs: number = Date.now(),
): PreguntaConciencia {
  const marca = marcaConciencia(fromMs);
  return {
    titulo: "CONCIENCIA · ASISTENCIA",
    pregunta: "¿Vas a iniciar tu sesión de Depósito hoy?",
    marca: `${marca.dia} · ${marca.fechaHumana} · ${marca.hora}`,
    valor:
      "La persistencia del estudio sube de valor cuando la eliges. Hoy es un día. Tú marcas si entra.",
  };
}

export function parseFecha(fecha: string): { y: number; m: number; d: number } {
  const [y, m, d] = fecha.split("-").map(Number);
  return { y, m, d };
}

export function fechaDesdeUtc(ms: number): string {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function sumarDias(fecha: string, n: number): string {
  const { y, m, d } = parseFecha(fecha);
  return fechaDesdeUtc(Date.UTC(y, m - 1, d + n));
}

export function weekdayDeFecha(fecha: string): number {
  const { y, m, d } = parseFecha(fecha);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function inicioSemanaLunes(fecha: string): string {
  const weekday = weekdayDeFecha(fecha);
  const atras = weekday === 0 ? 6 : weekday - 1;
  return sumarDias(fecha, -atras);
}

export function debeMostrarVentana(
  registro: RegistroAsistencia | null | undefined,
): boolean {
  if (!registro) return true;
  if (registro.intencion) return false;
  if (registro.sesionCumplida) return false;
  return true;
}

export function registrarIntencion(
  libro: LibroAsistencia,
  fecha: string,
  intencion: IntencionAsistencia,
  hora?: string,
): LibroAsistencia {
  if (!esFechaCivil(fecha)) return libro;
  const prev = libro.registros[fecha];
  if (prev?.intencion) return libro;
  return {
    registros: {
      ...libro.registros,
      [fecha]: {
        fecha,
        sesionCumplida: prev?.sesionCumplida ?? false,
        horaCumplida: prev?.horaCumplida,
        intencion,
        horaIntencion: hora,
      },
    },
  };
}

export function marcarSesionCumplida(
  libro: LibroAsistencia,
  fecha: string,
  hora?: string,
): LibroAsistencia {
  if (!esFechaCivil(fecha)) return libro;
  const prev = libro.registros[fecha];
  if (prev?.sesionCumplida) {
    return libro;
  }
  return {
    registros: {
      ...libro.registros,
      [fecha]: {
        fecha,
        intencion: prev?.intencion,
        horaIntencion: prev?.horaIntencion,
        sesionCumplida: true,
        horaCumplida: hora ?? prev?.horaCumplida,
      },
    },
  };
}

export function absorberDiasConVolcado(
  libro: LibroAsistencia,
  timestamps: readonly number[] | null | undefined,
): LibroAsistencia {
  if (!timestamps || timestamps.length === 0) return libro;
  let next = libro;
  for (const ts of timestamps) {
    if (typeof ts !== "number" || !Number.isFinite(ts)) continue;
    next = marcarSesionCumplida(next, limaDateKey(ts));
  }
  return next;
}

export function estadoDia(
  registro: RegistroAsistencia | undefined,
  opts: { esHoy: boolean; esFuturo: boolean },
): EstadoDiaAsistencia {
  if (opts.esFuturo) return "futuro";
  if (registro?.sesionCumplida) return "cumplida";
  if (registro?.intencion === "si") return "dijo_si";
  if (registro?.intencion === "no") return "dijo_no";
  if (opts.esHoy) return "hoy";
  return "ausente";
}

export function calendarioAsistencia(
  libro: LibroAsistencia,
  hoy: string,
  semanas: number = CALENDARIO_SEMANAS,
): CeldaAsistencia[] {
  if (!esFechaCivil(hoy) || semanas < 1) return [];
  const lunesActual = inicioSemanaLunes(hoy);
  const inicio = sumarDias(lunesActual, -7 * (semanas - 1));
  const celdas: CeldaAsistencia[] = [];
  for (let i = 0; i < semanas * 7; i++) {
    const fecha = sumarDias(inicio, i);
    const esHoy = fecha === hoy;
    const esFuturo = fecha > hoy;
    const registro = libro.registros[fecha];
    celdas.push({
      fecha,
      dia: DIAS_SEMANA[weekdayDeFecha(fecha)],
      estado: estadoDia(registro, { esHoy, esFuturo }),
      esHoy,
      registro,
    });
  }
  return celdas;
}

export function resumenAsistencia(
  celdas: readonly CeldaAsistencia[],
): ResumenAsistencia {
  const pasados = celdas.filter((c) => c.estado !== "futuro");
  const diasConSesion = pasados.filter((c) => c.estado === "cumplida").length;
  const diasSinSesion = pasados.filter((c) => c.estado !== "cumplida").length;
  const nombradosSinSesion = pasados.filter(
    (c) => c.estado === "dijo_si" || c.estado === "dijo_no",
  ).length;

  let rachaActual = 0;
  for (let i = pasados.length - 1; i >= 0; i--) {
    if (pasados[i].estado === "cumplida") rachaActual += 1;
    else if (pasados[i].esHoy) continue;
    else break;
  }

  return {
    diasConSesion,
    diasSinSesion,
    rachaActual,
    nombradosSinSesion,
  };
}

export function normalizarLibro(raw: unknown): LibroAsistencia {
  if (!raw || typeof raw !== "object") return libroVacio();
  const rec = raw as { registros?: unknown };
  if (!rec.registros || typeof rec.registros !== "object") return libroVacio();
  const registros: Record<string, RegistroAsistencia> = {};
  for (const [fecha, value] of Object.entries(
    rec.registros as Record<string, unknown>,
  )) {
    if (!esFechaCivil(fecha) || !value || typeof value !== "object") continue;
    const item = value as Partial<RegistroAsistencia>;
    const intencion =
      item.intencion === "si" || item.intencion === "no"
        ? item.intencion
        : undefined;
    registros[fecha] = {
      fecha,
      sesionCumplida: Boolean(item.sesionCumplida),
      ...(intencion ? { intencion } : {}),
      ...(typeof item.horaIntencion === "string"
        ? { horaIntencion: item.horaIntencion }
        : {}),
      ...(typeof item.horaCumplida === "string"
        ? { horaCumplida: item.horaCumplida }
        : {}),
    };
  }
  return { registros };
}
