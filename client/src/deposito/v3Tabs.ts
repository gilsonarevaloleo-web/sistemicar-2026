/** Pestañas del recinto V3 — mismo gesto que Jornada (Operar / Plan / Métricas). */
export type DepositoV3Tab = "auditar" | "casa" | "huella";

export const DEPOSITO_V3_TABS = [
  {
    id: "auditar" as const,
    label: "Auditar",
    short: "Auditar",
    step: "01",
    title: "Laboratorio",
    hint: "Volcá el hecho. El dictamen vive aquí, no mezclado con la casa.",
  },
  {
    id: "casa" as const,
    label: "Casa",
    short: "Casa",
    step: "02",
    title: "Cerebro madre",
    hint: "Candidatos, filtro y leyes. El grado por firma no interrumpe el volcado.",
  },
  {
    id: "huella" as const,
    label: "Huella",
    short: "Huella",
    step: "03",
    title: "Asistencia y archivo",
    hint: "Calendario, evolución de ojos e historial. Se consulta; no se opera.",
  },
] as const;

export const DEPOSITO_V3_TAB_IDS: readonly DepositoV3Tab[] = DEPOSITO_V3_TABS.map(
  (tab) => tab.id,
);

export function isDepositoV3Tab(value: string | null | undefined): value is DepositoV3Tab {
  return value === "auditar" || value === "casa" || value === "huella";
}

export function depositoV3TabMeta(id: DepositoV3Tab) {
  return DEPOSITO_V3_TABS.find((tab) => tab.id === id) ?? DEPOSITO_V3_TABS[0];
}
