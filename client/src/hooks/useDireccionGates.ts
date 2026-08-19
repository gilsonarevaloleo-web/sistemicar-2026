import { useMemo } from "react";
import {
  mapDireccionGates,
  type DireccionGate,
} from "@/lib/direccionElegibilidad";
import {
  getPeldanosByProyectoLocal,
  getProyectosLocal,
  type Proyecto,
} from "@/lib/proyectos";

export function useDireccionGates(userId?: string | null): {
  proyectos: Proyecto[];
  gates: DireccionGate[];
  abiertas: DireccionGate[];
} {
  return useMemo(() => {
    if (!userId) {
      return { proyectos: [] as Proyecto[], gates: [] as DireccionGate[], abiertas: [] as DireccionGate[] };
    }
    const proyectos = getProyectosLocal(userId);
    const gates = mapDireccionGates(proyectos, id => getPeldanosByProyectoLocal(userId, id));
    return { proyectos, gates, abiertas: gates.filter(g => g.ok) };
  }, [userId]);
}
