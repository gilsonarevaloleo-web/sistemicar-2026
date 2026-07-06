import { getJornadaChunkLoadPhase } from "@/lib/jornadaChunkBoot";

export type JornadaV3ChecklistItem = {
  id: string;
  label: string;
  pass: boolean;
};

/** Checklist tronco para migrar operación diaria a V3 (bloque 4). */
export function buildJornadaV3MigrationChecklist(): JornadaV3ChecklistItem[] {
  const chunkOk = getJornadaChunkLoadPhase() === "loaded";
  return [
    { id: "chunk", label: "V3 abre en este dispositivo (chunk cargado)", pass: chunkOk },
    { id: "launch", label: "Lanzar conquista/enfoque sin freeze post-toast", pass: false },
    { id: "clock", label: "Reloj avanza 60s sin tocar pantalla", pass: false },
    { id: "close-sub", label: "Cerrar sub conquista → siguiente activo", pass: false },
    { id: "close-ring", label: "Cerrar ring → anchor nuevo", pass: false },
    { id: "nested", label: "Pausa/interrupción no resta tiempo base", pass: false },
  ];
}

export function isJornadaV3ReadyForMigration(items = buildJornadaV3MigrationChecklist()): boolean {
  return items.every(i => i.pass);
}

const STORAGE_KEY = "sistemicar_jornada_v3_checklist_v1";

export function loadJornadaV3ChecklistOverrides(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveJornadaV3ChecklistOverride(id: string, pass: boolean): void {
  const next = { ...loadJornadaV3ChecklistOverrides(), [id]: pass };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

export function buildJornadaV3MigrationChecklistWithOverrides(): JornadaV3ChecklistItem[] {
  const overrides = loadJornadaV3ChecklistOverrides();
  return buildJornadaV3MigrationChecklist().map(item => ({
    ...item,
    pass: overrides[item.id] ?? item.pass,
  }));
}
