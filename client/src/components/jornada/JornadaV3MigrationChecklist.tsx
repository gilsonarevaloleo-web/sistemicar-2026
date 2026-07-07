import { useSyncExternalStore } from "react";
import {
  buildJornadaV3MigrationChecklistWithOverrides,
  isJornadaV3ReadyForMigration,
  saveJornadaV3ChecklistOverride,
  type JornadaV3ChecklistItem,
} from "@/lib/jornadaV3Migration";
import { subscribeJornadaChunkBoot } from "@/lib/jornadaChunkBoot";

let checklistVersion = 0;
let cachedChecklistSnapshot: JornadaV3ChecklistItem[] = [];
let cachedChecklistVersion = -1;
const checklistListeners = new Set<() => void>();

function bumpChecklist(): void {
  checklistVersion += 1;
  cachedChecklistVersion = -1;
  checklistListeners.forEach(fn => fn());
}

function subscribeChecklist(cb: () => void): () => void {
  const wrapped = () => {
    cachedChecklistVersion = -1;
    cb();
  };
  checklistListeners.add(wrapped);
  const unsubChunk = subscribeJornadaChunkBoot(wrapped);
  return () => {
    checklistListeners.delete(wrapped);
    unsubChunk();
  };
}

function getChecklistSnapshot(): JornadaV3ChecklistItem[] {
  if (cachedChecklistVersion !== checklistVersion) {
    cachedChecklistVersion = checklistVersion;
    cachedChecklistSnapshot = buildJornadaV3MigrationChecklistWithOverrides();
  }
  return cachedChecklistSnapshot;
}

/** Panel de checklist tronco — marcar en celular tras validar cada criterio. */
export function JornadaV3MigrationChecklist() {
  const items = useSyncExternalStore(subscribeChecklist, getChecklistSnapshot, getChecklistSnapshot);
  const ready = isJornadaV3ReadyForMigration(items);

  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{ borderColor: "rgba(212,175,55,0.25)", backgroundColor: "rgba(10,10,10,0.6)" }}
      data-testid="jornada-v3-migration-checklist"
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
        Checklist migración V3 {ready ? "· listo" : ""}
      </p>
      <ul className="space-y-1">
        {items.map(item => (
          <li key={item.id} className="flex items-start gap-2 text-[10px] text-slate-400">
            <button
              type="button"
              onClick={() => {
                saveJornadaV3ChecklistOverride(item.id, !item.pass);
                bumpChecklist();
              }}
              className="mt-0.5 w-4 h-4 rounded border shrink-0 touch-manipulation"
              style={{
                borderColor: item.pass ? "#22c55e" : "rgba(148,163,184,0.4)",
                backgroundColor: item.pass ? "rgba(34,197,94,0.2)" : "transparent",
              }}
              aria-label={item.label}
            />
            <span className={item.pass ? "text-slate-300" : ""}>{item.label}</span>
          </li>
        ))}
      </ul>
      {ready && (
        <p className="text-[9px] text-emerald-400/90 leading-snug">
          Criterios cumplidos en este dispositivo — puedes usar V3 como superficie operativa diaria.
        </p>
      )}
    </div>
  );
}
