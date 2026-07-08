import { useSyncExternalStore } from "react";
import {
  getJornadaChunkLastError,
  getJornadaChunkLoadPhase,
  subscribeJornadaChunkBoot,
  type JornadaChunkLoadPhase,
} from "@/lib/jornadaChunkBoot";

type BootSnapshot = { phase: JornadaChunkLoadPhase; error: string | null };

let cachedBootSnapshot: BootSnapshot = { phase: "idle", error: null };

function subscribe(cb: () => void): () => void {
  return subscribeJornadaChunkBoot(() => {
    cachedBootSnapshot = {
      phase: getJornadaChunkLoadPhase(),
      error: getJornadaChunkLastError(),
    };
    cb();
  });
}

function getSnapshot(): BootSnapshot {
  const phase = getJornadaChunkLoadPhase();
  const error = getJornadaChunkLastError();
  if (cachedBootSnapshot.phase !== phase || cachedBootSnapshot.error !== error) {
    cachedBootSnapshot = { phase, error };
  }
  return cachedBootSnapshot;
}

/** Muestra error de chunk si no pudo importarse (diagnóstico bloque 0). */
export function JornadaV3BootStatus() {
  const { phase, error } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (phase !== "failed" && phase !== "timeout") return null;

  return (
    <div
      className="mx-3 mt-2 rounded-lg border px-3 py-2 text-[10px] font-mono text-red-400/90"
      style={{ borderColor: "rgba(239,68,68,0.35)", backgroundColor: "rgba(10,10,10,0.8)" }}
      data-testid="jornada-v3-boot-error"
    >
      Chunk: {phase}
      {error ? ` — ${error}` : ""}
    </div>
  );
}
