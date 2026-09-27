/**
 * UserMetacognitionStore — persistencia local de axiomas descubiertos.
 * Estructura > 85/100. Local-first: el Maestro no espera la red para recordar.
 */

import {
  absorberHallazgo,
  normalizarStore,
  type AxiomaDescubierto,
  type UserMetacognitionStore,
} from "@shared/deposito/memoryEngine";
import type { DiagnosticoVolcado } from "@shared/deposito/engineConfig";

const STORAGE_KEY = "sistemicar_deposito_metacognicion";

interface AcervoUsuario {
  userId: string;
  store: UserMetacognitionStore;
  updatedAt: string;
}

function parseAll(): AcervoUsuario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AcervoUsuario[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => ({
      userId: String(p.userId ?? ""),
      store: normalizarStore(p.store),
      updatedAt: String(p.updatedAt ?? ""),
    }));
  } catch {
    return [];
  }
}

function saveAll(acervos: AcervoUsuario[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(acervos));
}

function persist(userId: string, store: UserMetacognitionStore): UserMetacognitionStore {
  const limpio = normalizarStore(store);
  const rest = parseAll().filter((p) => p.userId !== userId);
  saveAll([
    { userId, store: limpio, updatedAt: new Date().toISOString() },
    ...rest,
  ]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("deposito-metacognicion-updated"));
  }
  return limpio;
}

export function leerMetacognicion(userId?: string | null): UserMetacognitionStore {
  if (!userId) return { axiomas: [] };
  const found = parseAll().find((p) => p.userId === userId);
  return found ? found.store : { axiomas: [] };
}

export function guardarMetacognicion(
  userId: string,
  store: UserMetacognitionStore,
): UserMetacognitionStore {
  return persist(userId, store);
}

export function absorberHallazgoLocal(
  userId: string,
  diagnostico: DiagnosticoVolcado,
  volcadoCrudo: string,
): {
  store: UserMetacognitionStore;
  diagnostico: DiagnosticoVolcado;
  axiomaNuevo?: AxiomaDescubierto;
} {
  const hallazgo = absorberHallazgo({
    store: leerMetacognicion(userId),
    diagnostico,
    volcadoCrudo,
    principioSugerido: diagnostico.axiomaDescubierto?.principioDescubierto,
    metaforaSugerida: diagnostico.axiomaDescubierto?.metaforaClave,
  });
  persist(userId, hallazgo.store);
  return hallazgo;
}
