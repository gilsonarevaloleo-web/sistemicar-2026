import { forceResetOrphanMutationLocks } from "@/lib/localMutationLock";
import { flushFlotaDeferredMergeIfReady } from "@/flota/flotaStore";

/** Aduana de prioridad absoluta del operador — primer microsegundo del tap de OPERAR/lanzamiento. */
export function releaseOperatorTapLocks(): void {
  forceResetOrphanMutationLocks();
  flushFlotaDeferredMergeIfReady({ force: true });
}
