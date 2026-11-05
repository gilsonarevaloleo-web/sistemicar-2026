/** Pestañas del recinto V2 — mismo gesto que Jornada, sin mezclar volcado y muro. */
export type DepositoV2Tab = "volcar" | "lectura" | "casa";

export const DEPOSITO_V2_TABS = [
  {
    id: "volcar" as const,
    label: "Volcar",
    short: "Volcar",
    step: "01",
    title: "Captura",
    hint: "El día entra crudo. Ritual y matrícula viven aquí.",
  },
  {
    id: "lectura" as const,
    label: "Lectura",
    short: "Lectura",
    step: "02",
    title: "Muro",
    hint: "Diagnóstico, dictamen y sello. Aparecen después de guardar.",
  },
  {
    id: "casa" as const,
    label: "Casa",
    short: "Casa",
    step: "03",
    title: "Archivo",
    hint: "Historial, mapa de calor y anexos. No tapan el volcado.",
  },
] as const;

export const DEPOSITO_V2_TAB_IDS: readonly DepositoV2Tab[] = DEPOSITO_V2_TABS.map(
  (tab) => tab.id,
);

export function isDepositoV2Tab(value: string | null | undefined): value is DepositoV2Tab {
  return value === "volcar" || value === "lectura" || value === "casa";
}

export function depositoV2TabMeta(id: DepositoV2Tab) {
  return DEPOSITO_V2_TABS.find((tab) => tab.id === id) ?? DEPOSITO_V2_TABS[0];
}
