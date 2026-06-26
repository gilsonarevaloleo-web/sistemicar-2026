import type { Vehicle } from "@/lib/persistence";
import {
  useFlotaMutator,
  useFlotaVehiclesShallow,
} from "@/hooks/useModularStoreSelectors";

/**
 * @deprecated Usar useFlotaVehiclesShallow + useFlotaMutator (selectores aislados).
 * Suscripción React a la fuente de verdad de flota con comparación por firma.
 */
export function useFlotaStore(userId: string | undefined): {
  vehicles: Vehicle[];
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void;
} {
  const vehicles = useFlotaVehiclesShallow(userId);
  const setVehicles = useFlotaMutator();
  return { vehicles, setVehicles };
}

export { useFlotaVehiclesShallow, useFlotaMutator, useJornadaActiveVehicleIds } from "@/hooks/useModularStoreSelectors";
