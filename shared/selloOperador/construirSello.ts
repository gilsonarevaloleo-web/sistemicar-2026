import {
  HORA_RECORDATORIO_SELLO,
  type EvidenciaSelloInput,
  type SelloOperadorDraft,
} from "./types.ts";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function minLabel(n: number): string {
  const v = Math.max(0, Math.round(n));
  if (v < 60) return `${v} min`;
  const h = Math.floor(v / 60);
  const m = v % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function limaHour(nowMs: number): number {
  const lima = new Date(nowMs - 5 * 60 * 60 * 1000);
  return lima.getUTCHours();
}

/** Recordatorio (no sello). El sistema avisa; el operador firma. */
export function debeRecordarSello(nowMs: number, yaSellado: boolean): boolean {
  if (yaSellado) return false;
  return limaHour(nowMs) >= HORA_RECORDATORIO_SELLO;
}

export function construirSelloOperador(input: EvidenciaSelloInput): SelloOperadorDraft {
  const conquista = round1(input.conquistaMin);
  const entropia = round1(input.entropiaMin);
  const vacio = round1(input.vacioMin);
  const plan = round1(input.jornadaPlanMin);

  const evidenciaHechos: string[] = [
    `Conquista ${minLabel(conquista)} · inconsciente ${minLabel(entropia)} · vacío ${minLabel(vacio)}`,
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
