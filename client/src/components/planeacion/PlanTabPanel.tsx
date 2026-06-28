import type { ReactNode } from "react";
import { shouldRunMobileSurvival } from "@/lib/mobilePerf";

export type PlanTabId = "operar" | "metricas" | "meta";

type PlanTabPanelProps = {
  planLayout: "compact" | "full";
  planTab: PlanTabId;
  tab: PlanTabId;
  children: ReactNode;
};

/** En móvil supervivencia desmonta tabs inactivos; en compact normal usa `hidden`. */
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
  if (shouldRunMobileSurvival()) {
    return null;
  }
  return (
    <div hidden aria-hidden="true">
      {children}
    </div>
  );
}
