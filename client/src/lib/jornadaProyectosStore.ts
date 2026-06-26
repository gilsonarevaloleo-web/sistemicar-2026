import { create } from "zustand";
import { getProyectos, type Proyecto } from "@/lib/proyectos";
import { isInterModuleSyncBlocked } from "@/lib/viewTransitionShield";

type JornadaProyectosState = {
  proyectos: Proyecto[];
  proyectoIds: string[];
  setProyectos: (proyectos: Proyecto[]) => void;
};

function proyectoIdsFromList(proyectos: Proyecto[]): string[] {
  return proyectos.map(p => p.id);
}

export const useJornadaProyectosStore = create<JornadaProyectosState>(set => ({
  proyectos: [],
  proyectoIds: [],
  setProyectos: proyectos =>
    set({
      proyectos,
      proyectoIds: proyectoIdsFromList(proyectos),
    }),
}));

export async function syncJornadaProyectosFromRemote(
  userId: string,
  opts?: { force?: boolean }
): Promise<void> {
  if (!opts?.force && isInterModuleSyncBlocked()) return;
  const proyectos = await getProyectos(userId);
  useJornadaProyectosStore.getState().setProyectos(proyectos);
}

/** Solo tests. */
export function resetJornadaProyectosStoreForTests(): void {
  useJornadaProyectosStore.setState({ proyectos: [], proyectoIds: [] });
}
