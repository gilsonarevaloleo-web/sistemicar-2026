import type { ReactNode } from "react";

export type PlanTabId = "operar" | "metricas" | "meta";

type PlanTabPanelProps = {
  planLayout: "compact" | "full";
  planTab: PlanTabId;
  tab: PlanTabId;
  children: ReactNode;
};

/** En móvil (compact) mantiene el DOM montado con `hidden` al cambiar de tab. */
export function PlanTabPanel({
  planLayout,
  planTab,
  tab,
  children,
}: PlanTabPanelProps) {
  const visible = planLayout === "full" || planTab === tab;
  if (planLayout === "full" || visible) {
    return <>{children}</>;
  }
  return (
    <div hidden aria-hidden="true">
      {children}
    </div>
  );
}
