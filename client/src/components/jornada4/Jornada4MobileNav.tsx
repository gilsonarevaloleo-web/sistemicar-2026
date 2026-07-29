import { BarChart3, CalendarDays, Rocket } from "lucide-react";
import { J4_COLORS } from "./Jornada4Shell";

const { MUTED, INK, GOLD } = J4_COLORS;

export type Jornada4MobileTab = "operar" | "plan" | "metricas";

const TABS: {
  id: Jornada4MobileTab;
  label: string;
  short: string;
  icon: typeof Rocket;
}[] = [
  { id: "operar", label: "Operar", short: "Operar", icon: Rocket },
  { id: "plan", label: "Plan & cobertura", short: "Plan", icon: CalendarDays },
  { id: "metricas", label: "Métricas & récords", short: "Métricas", icon: BarChart3 },
];

type Props = {
  value: Jornada4MobileTab;
  onChange: (tab: Jornada4MobileTab) => void;
};

/** Pestañas móviles — agrupa scroll interminable sin tocar la lógica Dual Kernel. */
export function Jornada4MobileNav({ value, onChange }: Props) {
  return (
    <nav
      className="sticky top-[52px] z-20 px-3 pt-2 pb-1 sm:px-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,10,10,0.96) 0%, rgba(10,10,10,0.88) 100%)",
        backdropFilter: "blur(8px)",
      }}
      data-testid="jornada4-mobile-nav"
    >
      <div
        className="max-w-lg mx-auto grid grid-cols-3 gap-1 p-1 rounded-xl border"
        style={{
          backgroundColor: "rgba(23,23,23,0.85)",
          borderColor: "rgba(64,64,64,0.9)",
        }}
        role="tablist"
        aria-label="Secciones Dual Kernel"
      >
        {TABS.map(tab => {
          const active = value === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg touch-manipulation transition-colors"
              style={{
                backgroundColor: active ? "rgba(212,175,55,0.14)" : "transparent",
                color: active ? GOLD : MUTED,
                boxShadow: active ? `inset 0 0 0 1px ${GOLD}55` : "none",
              }}
              data-testid={`jornada4-tab-${tab.id}`}
            >
              <Icon size={13} strokeWidth={active ? 2.4 : 2} />
              <span
                className="text-[8px] font-black uppercase tracking-wider leading-none"
                style={{ color: active ? INK : MUTED }}
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
