/**
 * Liquidación del cierre de bloque situacional (tronco B.5 / brief Capa C).
 * Orden: teardown → celebración ms0 → sombra (Firebase + PS).
 */
import type { SubTarea, Vehicle } from "@/lib/persistence";
import { runShadowTaskAsync } from "@/lib/desglosadorShadow";
import { recordPerfSample } from "@/lib/jornadaPerfStats";

export type SituacionDesgloseShadowDeps = {
  userId: string;
  vehicleId: string;
  titulo: string;
  subTareas: SubTarea[];
  situacionCronometro: NonNullable<Vehicle["situacionCronometro"]>;
  clearCupoAnchor?: boolean;
  deltaDepth: number;
  syncCupoAnchor?: (vehicleId: string) => void | Promise<void>;
  updateVehicle: (
    userId: string,
    vehicleId: string,
    patch: Partial<Vehicle>
  ) => Promise<unknown>;
  awardSovereigntyPoints: (
    userId: string,
    amount: number,
    source: string
  ) => Promise<unknown>;
  /** Side-effects ligeros post-red (puntos módulo, evento universal). */
  onShadowComplete?: () => void;
};

/**
 * Programa Firebase/PS fuera del gesto. No bloquea celebración ni teardown.
 */
export function scheduleSituacionDesgloseShadow(deps: SituacionDesgloseShadowDeps): void {
  runShadowTaskAsync(async () => {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const patch: Partial<Vehicle> = {
        subTareas: deps.subTareas,
        situacionCronometro: deps.situacionCronometro,
      };
      if (deps.clearCupoAnchor) {
        patch.situacionCupoAnchor = null;
      }
      await deps.updateVehicle(deps.userId, deps.vehicleId, patch);
      if (deps.deltaDepth > 0) {
        await deps.awardSovereigntyPoints(
          deps.userId,
          deps.deltaDepth,
          `Profundidad bloque situación: ${deps.titulo}`
        );
      }
      if (deps.syncCupoAnchor) {
        void deps.syncCupoAnchor(deps.vehicleId);
      }
      deps.onShadowComplete?.();
    } catch (e) {
      console.error("[scheduleSituacionDesgloseShadow]", e);
    } finally {
      recordPerfSample(
        "situacionShadow",
        (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0
      );
    }
  });
}
