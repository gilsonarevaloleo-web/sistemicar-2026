/**
 * Contrato del reporte semanal de virtudes (Paso 2).
 * Spec: docs/REPORTE_SEMANAL_VIRTUDES.md
 */

export type SemanaId = string;
export type EstadoReporte = "EN_CURSO" | "SELLADO" | "INSUFICIENTE";
export type ObjetivoVentana = "actual" | "cerrada";

export type VirtudId =
  | "disposicion"
  | "disciplina"
  | "termino"
  | "integridad"
  | "temple"
  | "agencia";

export type PatronVeredicto =
  | "carga"
  | "sin_ley"
  | "puerta_hueca"
  | "desequilibrio"
  | "piso"
  | "techo"
  | "delta"
  | "default"
  | "insuficiente";

export type CodigoFriccionNumero = 1 | 4 | 5 | 7 | 8;

export interface EvidenciaVirtud {
  hechos: string[];
  numerador?: number;
  denominador?: number;
}

export interface ScoreVirtud {
  id: VirtudId;
  score: number | null;
  delta: number | null;
  evidencia: EvidenciaVirtud;
}

export interface ReporteSemanal {
  semanaId: SemanaId;
  estado: EstadoReporte;
  ventana: { inicioJournal: string; finJournal: string };
  virtudes: ScoreVirtud[];
  virtudAlta: VirtudId | null;
  virtudBaja: VirtudId | null;
  codigoFriccion: {
    codigo: CodigoFriccionNumero;
    virtud: VirtudId;
    accionMinima: string;
  } | null;
  umbralCuello: { codigo: number; intentos: number } | null;
  psSemana: number;
  veredicto: {
    patron: PatronVeredicto;
    tension: string;
    evidencia: string[];
    mandato: string;
  };
  selladoAt: number | null;
}

export interface SegmentoSemanal {
  horaInicio: string;
  horaFin: string;
  estado?: "pendiente" | "activo" | "cerrado_manual" | "entropia";
  activadoAt?: number;
  cerradoAt?: number;
  puertaTiming?: "antes_voz" | "despues_voz";
  puertaSistema?: boolean;
  puertaManual?: boolean;
}

export interface PlanillaSemanal {
  fecha: string;
  segmentos: SegmentoSemanal[];
  atencionSnapshot?: { puertasAbiertas?: number };
}

export interface SnapshotSemanal {
  fecha: string;
  segmentosCerradosManual?: number;
  segmentosTotales?: number;
  segmentosEntropia?: number;
  decisionesDelDia?: number;
  psDesglose?: { total?: number };
  segmentos?: Array<{
    estado?: string;
    horaInicio?: string;
    horaFin?: string;
  }>;
  atencionSnapshot?: { puertasAbiertas?: number };
}

export interface VehiculoSemanal {
  id: string;
  cierreAt?: number | null;
  cierreManual?: boolean;
  bonoTemple?: boolean;
  energiaOscura?: boolean;
  justificacion?: string;
  status?: string;
  titulo?: string;
  autoVerdad?: boolean;
  excluirDeHistorial?: boolean;
  ejes?: {
    enfoque?: { trifecta?: string };
    conflicto?: { trifecta?: string };
    pasos?: { trifecta?: string };
    limite?: { trifecta?: string };
  };
}

export interface SelloDiarioSemanal {
  fecha: string;
  selloEmitido: boolean;
  jornadaPlanMin?: number;
}

export interface LedgerTerminoSemanal {
  fecha: string;
  n: number;
}

export interface RevelacionSemanal {
  fecha: string;
  minutosPlan: number;
}

export interface SesionUmbralSemanal {
  createdAt: string;
  intentosTotales: number;
  historialCodigos: Array<{ codigo: number; intentos: number }>;
  modo?: string;
  intentosCodigoActual?: number;
}

export interface CalcularReporteSemanalInput {
  nowMs: number;
  /** `cerrada` = semana que ya terminó (cosecha). `actual` = semana en curso. */
  objetivo?: ObjetivoVentana;
  planillas?: PlanillaSemanal[];
  snapshots?: SnapshotSemanal[];
  vehiculos?: VehiculoSemanal[];
  sellos?: SelloDiarioSemanal[];
  ledgersTermino?: LedgerTerminoSemanal[];
  revelaciones?: RevelacionSemanal[];
  sesionesUmbral?: SesionUmbralSemanal[];
  reportePrevio?: ReporteSemanal | null;
}

export interface VentanaSemanal {
  semanaId: SemanaId;
  startMs: number;
  endMs: number;
  inicioJournal: string;
  finJournal: string;
  fechas: string[];
}

export const VIRTUD_ORDEN_INSTALACION: VirtudId[] = [
  "disposicion",
  "disciplina",
  "integridad",
  "temple",
  "agencia",
  "termino",
];

export const VIRTUD_LABEL: Record<VirtudId, string> = {
  disposicion: "Disposición",
  disciplina: "Disciplina",
  termino: "Término",
  integridad: "Integridad",
  temple: "Temple",
  agencia: "Agencia",
};

export const ACCION_MINIMA: Record<VirtudId, string> = {
  disposicion:
    "Plantar el anillo de mañana antes de abrir el primer vehículo. Mínimo 3 segmentos.",
  disciplina:
    "Abrir y cerrar a mano la próxima puerta. Si el sistema la abre, no cuenta.",
  termino:
    "Cerrar la Puerta del Término antes de que el sistema archive la última franja. Una noche basta para empezar el corte de carga.",
  integridad:
    "Cerrar a mano el próximo vehículo antes de que el segmento lo archive.",
  temple: "Lanzar 1 vehículo fuera de segmento o 1 misión con eje RETO.",
  agencia: "Declarar criterio de fin antes de abrir el siguiente vehículo.",
};

export const CODIGO_FRICCION: Record<VirtudId, CodigoFriccionNumero> = {
  disposicion: 4,
  disciplina: 1,
  termino: 8,
  integridad: 7,
  temple: 8,
  agencia: 5,
};

export const TEXTO_INSUFICIENTE =
  "Esta semana no hubo evidencia suficiente para un espejo. El reporte no se inventa. Planta el anillo 3 días, o abre 3 puertas, o sella 2 jornadas.";

export const MINUTOS_DIA_JORNADA = 24 * 60;
export const CENTINELA_TITULO = "Modo Centinela";
