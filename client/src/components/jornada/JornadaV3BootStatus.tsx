import { useSyncExternalStore } from "react";
import {
  getJornadaChunkLastError,
  getJornadaChunkLoadPhase,
  subscribeJornadaChunkBoot,
} from "@/lib/jornadaChunkBoot";

function subscribe(cb: () => void): () => void {
  return subscribeJornadaChunkBoot(cb);
}

function getSnapshot(): { phase: ReturnType<typeof getJornadaChunkLoadPhase>; error: string | null } {
  return { phase: getJornadaChunkLoadPhase(), error: getJornadaChunkLastError() };
}

/** Muestra error de chunk si V3 no pudo importarse (diagnóstico bloque 0). */
export function JornadaV3BootStatus() {
  const { phase, error } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (phase !== "failed" && phase !== "timeout") return null;

  return (
    <div
      className="mx-3 mt-2 rounded-lg border px-3 py-2 text-[10px] font-mono text-red-400/90"
      style={{ borderColor: "rgba(239,68,68,0.35)", backgroundColor: "rgba(10,10,10,0.8)" }}
      data-testid="jornada-v3-boot-error"
    >
      V3 boot: {phase}
      {error ? ` — ${error}` : ""}
    </div>
  );
}
