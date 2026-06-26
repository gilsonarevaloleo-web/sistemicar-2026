/**
 * Cola de intenciones de vehículo — módulos secundarios NO escriben en Flota directamente.
 * Espejo encola; Jornada (Planificación) consume tras el escudo de transición.
 */
import type { Vehicle } from "@/lib/persistence";
import { isInterModuleSyncBlocked } from "@/lib/viewTransitionShield";

export type JornadaVehicleCreateIntent = {
  kind: "create";
  sourceModule: "espejo" | "radar" | "menu";
  payload: Omit<Vehicle, "id" | "createdAt" | "userId" | "status">;
};

let pendingIntent: JornadaVehicleCreateIntent | null = null;

export function enqueueJornadaVehicleIntent(intent: JornadaVehicleCreateIntent): void {
  pendingIntent = intent;
}

export function peekJornadaVehicleIntent(): JornadaVehicleCreateIntent | null {
  return pendingIntent;
}

export function consumeJornadaVehicleIntent(): JornadaVehicleCreateIntent | null {
  if (isInterModuleSyncBlocked()) return null;
  const intent = pendingIntent;
  pendingIntent = null;
  return intent;
}

export function clearJornadaVehicleIntent(): void {
  pendingIntent = null;
}

/** Solo tests. */
export function resetJornadaVehicleIntentForTests(): void {
  pendingIntent = null;
}
