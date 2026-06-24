import { useCallback, useEffect, useState } from "react";
import type { Vehicle } from "@/lib/persistence";
import {
  acquireFlotaStore,
  getFlotaVehicles,
  setFlotaVehicles,
  subscribeFlotaStore,
} from "@/flota/flotaStore";

/**
 * Suscripción React a la fuente de verdad de flota.
 * `setVehicles` actualiza el store (y todos los consumidores).
 */
export function useFlotaStore(userId: string | undefined): {
  vehicles: Vehicle[];
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void;
} {
  const [vehicles, setVehiclesState] = useState<Vehicle[]>(() => getFlotaVehicles());

  useEffect(() => {
    if (!userId) return;

    const release = acquireFlotaStore(userId);
    const unsub = subscribeFlotaStore(() => {
      setVehiclesState(getFlotaVehicles());
    });
    setVehiclesState(getFlotaVehicles());

    return () => {
      unsub();
      release();
    };
  }, [userId]);

  const setVehicles = useCallback(
    (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => {
      setFlotaVehicles(update);
    },
    []
  );

  return { vehicles, setVehicles };
}
