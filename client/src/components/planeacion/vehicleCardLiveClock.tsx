import { useEffect, useMemo, type ReactNode } from "react";
import { useVehicleTimerTick } from "@/lib/concienciaClock";
import { useIslandConcienciaClock } from "@/lib/useIslandConcienciaClock";

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
 * Watchdog DOM (1.5s) — tras CUMPLIDO el pulso global a veces se atrasa por
 * pelea de motores; el island no debe quedarse clavado en 09:59.
 */
export function VehicleCardLiveNow({
  children,
}: {
  children: (nowMs: number) => ReactNode;
}) {
  const tick = useIslandConcienciaClock(true);
  const nowMs = useMemo(() => Date.now(), [tick]);
  return <>{children(nowMs)}</>;
}
