export interface ModuleCatalogEntry {
  id: string;
  nombre: string;
  desc: string;
  route?: string;
  /**
   * true = sigue dentro del paquete (no ocupa una ficha propia en el menú).
   * Al trabajarlo, poné enCamino: false y sale solo al menú.
   */
  enCamino: boolean;
  color?: string;
}

/**
 * Ecosistema futuro — no son recintos vivos.
 * Recintos vivos hoy: Espejo, Umbral, Depósito, Jornada (menú de primera).
 */
export const MODULOS_ECOSISTEMA: ModuleCatalogEntry[] = [
  { id: "alquimia", nombre: "Alquimia", desc: "Transformación de estados internos", route: "/alquimia", enCamino: true, color: "#A855F7" },
  { id: "proyector", nombre: "Proyector", desc: "Arquitectura de realidad futura", route: "/proyector", enCamino: true, color: "#6366F1" },
  { id: "mentor", nombre: "Mentor IA", desc: "Diagnóstico avanzado", route: "/mentor", enCamino: true, color: "#3B82F6" },
  { id: "alianza", nombre: "Alianza", desc: "Tu red de poder", route: "/socios", enCamino: true, color: "#7C3AED" },
  { id: "radar", nombre: "Radar IA", desc: "Detección de tensiones con Gemini", route: "/radar", enCamino: true, color: "#3B82F6" },
  { id: "manuales", nombre: "Manuales y Códice", desc: "Biblioteca de guías y leyes", route: "/manuales", enCamino: true, color: "#D4AF37" },
  { id: "proximo", nombre: "Próximo módulo", desc: "En diseño — venta independiente próximamente", enCamino: true, color: "#64748b" },
];

export function modulosEnCamino(): ModuleCatalogEntry[] {
  return MODULOS_ECOSISTEMA.filter((m) => m.enCamino);
}

export function modulosLiberados(): ModuleCatalogEntry[] {
  return MODULOS_ECOSISTEMA.filter((m) => !m.enCamino);
}

/** Alias de los que siguen empaquetados. Preferí `modulosEnCamino()`. */
export const MODULOS_EN_CAMINO: ModuleCatalogEntry[] = modulosEnCamino();

export const PAQUETE_EN_CAMINO = {
  id: "paquete-en-camino",
  nombre: "En camino",
  desc: "Módulos empaquetados — se sueltan al menú cuando están listos",
  route: "/en-camino",
  color: "#64748b",
} as const;

export const BADGE_EN_CAMINO = "En camino de implementación";
