import type { EvidenciaSelloInput, SelloOperadorDraft } from "./types.ts";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function minLabelSello(n: number): string {
  const v = Math.max(0, Math.round(n));
  if (v < 60) return `${v} min`;
  const h = Math.floor(v / 60);
  const m = v % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Líneas de reloj del sello (cobertura / consciente / inconsciente). */
export function isHechoTiempoSello(line: string): boolean {
  return /^(Cobertura del día|Consciente |Conquista |Inconsciente )/.test(line);
}

/**
 * Hechos de tiempo. Si hay desglose de tríada, usa el mismo idioma que
 * Cobertura del día (minutos únicos: presencia + dirección = consciente).
 */
export function hechosTiempoSello(input: {
  conquistaMin: number;
  entropiaMin: number;
  vacioMin: number;
  minutosPresencia?: number;
  minutosDireccion?: number;
  minutosNoConquistado?: number;
  coberturaPct?: number;
}): string[] {
  const lines: string[] = [];
  if (input.coberturaPct != null && Number.isFinite(input.coberturaPct)) {
    lines.push(`Cobertura del día: ${Math.max(0, Math.round(input.coberturaPct))}%`);
  }
  const presencia = input.minutosPresencia;
  const direccion = input.minutosDireccion;
  if (presencia != null && direccion != null) {
    lines.push(
      `Consciente ${minLabelSello(input.conquistaMin)} · presencia ${minLabelSello(presencia)} · dirección ${minLabelSello(direccion)}`,
    );
    lines.push(
      `Inconsciente ${minLabelSello(input.entropiaMin)} · no conquistado ${minLabelSello(input.minutosNoConquistado ?? input.vacioMin)}`,
    );
    return lines;
  }
  lines.push(
    `Conquista ${minLabelSello(input.conquistaMin)} · inconsciente ${minLabelSello(input.entropiaMin)} · vacío ${minLabelSello(input.vacioMin)}`,
  );
  return lines;
}

export function construirSelloOperador(input: EvidenciaSelloInput): SelloOperadorDraft {
  const conquista = round1(input.conquistaMin);
  const entropia = round1(input.entropiaMin);
  const vacio = round1(input.vacioMin);
  const plan = round1(input.jornadaPlanMin);
  const minutosPresencia =
    input.minutosPresencia != null ? round1(input.minutosPresencia) : undefined;
  const minutosDireccion =
    input.minutosDireccion != null ? round1(input.minutosDireccion) : undefined;
  const minutosNoConquistado =
    input.minutosNoConquistado != null ? round1(input.minutosNoConquistado) : undefined;
  const coberturaPct =
    input.coberturaPct != null ? Math.max(0, Math.round(input.coberturaPct)) : undefined;

  const evidenciaHechos: string[] = [
    ...hechosTiempoSello({
      conquistaMin: conquista,
      entropiaMin: entropia,
      vacioMin: vacio,
      minutosPresencia,
      minutosDireccion,
      minutosNoConquistado,
      coberturaPct,
    }),
    `Puertas cerradas a mano: ${input.segmentosCerradosManual} de ${input.segmentosTotales}`,
    `Vehículos que cerraste: ${input.vehiculosCerradosManual}. El sistema archivó ${input.vehiculosCerradosSistema}`,
    `PS del día: ${Math.max(0, Math.round(input.totalPS))}`,
  ];

  if (input.recintosCerrados + input.recintosHeredados + input.recintosAbiertos > 0) {
    evidenciaHechos.push(
      `Lo ajeno: ${input.recintosCerrados} salió a su hora · ${input.recintosHeredados} se heredó · ${input.recintosAbiertos} sigue dentro`,
    );
  }

  const tension = tensionDesdeEvidencia(input);
  const mandato = mandatoDesdeEvidencia(input);

  return {
    fecha: input.fecha,
    userId: input.userId,
    timestamp: input.nowMs,
    selloEmitido: true,
    selladoPor: "operador",
    totalPS: Math.max(0, Math.round(input.totalPS)),
    conquistaMin: conquista,
    entropiaMin: entropia,
    vacioMin: vacio,
    jornadaPlanMin: plan,
    minutosPresencia,
    minutosDireccion,
    minutosNoConquistado,
    coberturaPct,
    segmentosTotales: input.segmentosTotales,
    segmentosCerradosManual: input.segmentosCerradosManual,
    tension,
    evidenciaHechos,
    mandato,
    recintosCerrados: input.recintosCerrados,
    recintosHeredados: input.recintosHeredados,
    recintosAbiertos: input.recintosAbiertos,
    vehiculosCerradosManual: input.vehiculosCerradosManual,
    vehiculosCerradosSistema: input.vehiculosCerradosSistema,
    vehiculosActivos: input.vehiculosActivos,
  };
}

function tensionDesdeEvidencia(input: EvidenciaSelloInput): string {
  const huboCierre =
    input.vehiculosCerradosManual > 0 || input.segmentosCerradosManual > 0;
  if (!huboCierre && input.segmentosTotales === 0 && input.vehiculosActivos === 0) {
    return "Hoy no hubo cierre. El día queda abierto hasta que lo selles.";
  }
  if (input.recintosHeredados > 0) {
    return "Algo ajeno no salió a su hora. El ciclo puede heredar lastre.";
  }
  if (input.vehiculosActivos > 0) {
    return "Hay un proceso consciente aún abierto. El sello corta el día; el sistema no lo firma por ti.";
  }
  if (input.entropiaMin >= 60 && input.conquistaMin < input.entropiaMin) {
    return `Hubo ejecución. El inconsciente se llevó ${minLabel(input.entropiaMin)}.`;
  }
  if (input.segmentosTotales > 0 && input.segmentosCerradosManual === 0) {
    return "Actuaste. Las puertas las cerró el sistema. El tiempo no tuvo dueño.";
  }
  return "Cerraste con evidencia. El ciclo no viaja a la cama.";
}

function mandatoDesdeEvidencia(input: EvidenciaSelloInput): string {
  if (input.recintosAbiertos > 0) {
    return "Antes de dormir: saca lo que sigue dentro o decláralo heredado.";
  }
  if (input.segmentosTotales === 0) {
    return "Mañana planta el anillo antes de abrir el primer vehículo. Mínimo 3 segmentos.";
  }
  if (input.segmentosCerradosManual === 0) {
    return "Mañana abre y cierra a mano la primera puerta. Si el sistema la abre, no cuenta.";
  }
  if (input.entropiaMin >= 60) {
    return "Mañana lanza el vehículo consciente al abrir la puerta. El hueco no se tapa solo.";
  }
  return "Mañana cierra la Puerta del Término tú. El archivo del sistema no corta la carga.";
}

/** El sistema puede recordar. No puede emitir selloEmitido. */
export function recordatorioNoEsSello(): { selloEmitido: false; selladoPor: null } {
  return { selloEmitido: false, selladoPor: null };
}
