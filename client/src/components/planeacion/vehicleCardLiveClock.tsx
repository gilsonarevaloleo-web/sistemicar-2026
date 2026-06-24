import { useEffect, useMemo, type ReactNode } from "react";
import { useVehicleTimerTick } from "@/lib/concienciaClock";

/** Suscripción al reloj global — solo montar cuando el card necesita tick en vivo. */
export function VehicleCardLiveClock({ onTick }: { onTick: () => void }) {
  const tick = useVehicleTimerTick();
  useEffect(() => {
    onTick();
  }, [tick, onTick]);
  return null;
}

/**
 * Aísla re-renders por tick: solo este subárbol se actualiza cada segundo,
 * no todo el VehicleCard.
 */
export function VehicleCardLiveNow({
  children,
}: {
  children: (nowMs: number) => ReactNode;
}) {
  const tick = useVehicleTimerTick();
  const nowMs = useMemo(() => Date.now(), [tick]);
  return <>{children(nowMs)}</>;
}
