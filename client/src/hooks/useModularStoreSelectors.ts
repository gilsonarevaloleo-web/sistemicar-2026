/**
 * Mandato global de selectores — prohibido consumir stores completos en componentes.
 * Solo propiedades primitivas o referencias estables vía useShallow.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Vehicle } from "@/lib/persistence";
import type { Proyecto } from "@/lib/proyectos";
import { readLocalFlota } from "@/services/jornadaFlotaCache";
import {
  acquireFlotaStore,
  getFlotaMergedSignature,
  getFlotaVehicles,
  setFlotaVehicles,
  subscribeFlotaStore,
} from "@/flota/flotaStore";
import { useJornadaProyectosStore } from "@/lib/jornadaProyectosStore";
import { useSovereignMode } from "@/lib/sovereign-mode";

/** Zustand — solo flags de modo soberano. */
export function useSovereignModeShallow(): {
  isOfflineMode: boolean;
  errorMsg: string;
} {
  return useSovereignMode(
    useShallow(s => ({
      isOfflineMode: s.isOfflineMode,
      errorMsg: s.errorMsg,
    }))
  );
}

/** Zustand — solo IDs de proyectos (re-render si cambia el set físico de IDs). */
export function useJornadaProyectoIds(): string[] {
  return useJornadaProyectosStore(useShallow(s => s.proyectoIds));
}

/** Zustand — listado hub; shallow sobre array (misma ref si setProyectos no mutó). */
export function useJornadaProyectosHub(): Proyecto[] {
  return useJornadaProyectosStore(useShallow(s => s.proyectos));
}

function activeVehicleIdsSignature(vehicles: Vehicle[]): string {
  return vehicles
    .filter(v => v.status === "activo")
    .map(v => v.id)
    .sort()
    .join("\0");
}

/**
 * Flota — solo firma de IDs activos (lectura intermodular pura).
 * Espejo / Alquimia / Umbral: usar esto en lugar de useFlotaStore().
 */
export function useJornadaActiveVehicleIds(userId: string | undefined): string {
  const [sig, setSig] = useState(() => activeVehicleIdsSignature(getFlotaVehicles()));

  useEffect(() => {
    if (!userId) return;
    const release = acquireFlotaStore(userId);
    const refresh = () => {
      const next = activeVehicleIdsSignature(getFlotaVehicles());
      setSig(prev => (prev === next ? prev : next));
    };
    const unsub = subscribeFlotaStore(refresh);
    refresh();
    return () => {
      unsub();
      release();
    };
  }, [userId]);

  return sig;
}

function hydrateFlotaFromLocal(): Vehicle[] {
  const fromStore = getFlotaVehicles();
  if (fromStore.length > 0) return fromStore;
  return readLocalFlota();
}

/**
 * Flota — vehículos completos; re-render solo si cambia la firma reactiva del store.
 * Reservado a Jornada (Planificación) como módulo dueño de mutaciones.
 */
export function useFlotaVehiclesShallow(userId: string | undefined): Vehicle[] {
  const [vehicles, setVehicles] = useState<Vehicle[]>(hydrateFlotaFromLocal);
  const sigRef = useRef(getFlotaMergedSignature());

  useEffect(() => {
    if (!userId) return;
    const release = acquireFlotaStore(userId);
    if (getFlotaVehicles().length === 0) {
      const local = readLocalFlota(userId);
      if (local.length > 0) {
        setFlotaVehicles(local);
      }
    }
    const refresh = () => {
      const nextSig = getFlotaMergedSignature();
      if (nextSig === sigRef.current) return;
      sigRef.current = nextSig;
      setVehicles(getFlotaVehicles());
    };
    const unsub = subscribeFlotaStore(refresh);
    refresh();
    return () => {
      unsub();
      release();
    };
  }, [userId]);

  return vehicles;
}

/** Mutador estable de flota — no suscribe re-renders. */
export function useFlotaMutator(): (
  update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])
) => void {
  return useCallback((update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => {
    setFlotaVehicles(update);
  }, []);
}
