import React from "react";
import type { LucideIcon } from "lucide-react";
import { DEPOSITO_COLORS } from "@/lib/depositoBrand";

const { MUTED, INK, GOLD, PIZARRA } = DEPOSITO_COLORS;

export type DepositoTabItem<T extends string> = {
  id: T;
  label: string;
  short: string;
  icon: LucideIcon;
};

type Props<T extends string> = {
  value: T;
  onChange: (tab: T) => void;
  tabs: readonly DepositoTabItem<T>[];
  ariaLabel: string;
  testId?: string;
};

/** Pestañas — agrupa el scroll interminable sin tocar el motor. */
export function DepositoMobileNav<T extends string>({
  value,
  onChange,
  tabs,
  ariaLabel,
  testId = "deposito-mobile-nav",
}: Props<T>) {
  return (
    <nav
      className="px-3 pt-2 pb-1 sm:px-4"
      style={{ backgroundColor: `${PIZARRA}eb` }}
      data-testid={testId}
    >
      <div
        className="mx-auto grid max-w-xl gap-1 rounded-xl border p-1"
        style={{
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
          backgroundColor: "rgba(23,23,23,0.85)",
          borderColor: "rgba(64,64,64,0.9)",
        }}
        role="tablist"
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => {
          const active = value === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 touch-manipulation transition-colors"
              style={{
                backgroundColor: active ? "rgba(212,175,55,0.14)" : "transparent",
                color: active ? GOLD : MUTED,
                boxShadow: active ? `inset 0 0 0 1px ${GOLD}55` : "none",
              }}
              data-testid={`deposito-tab-${tab.id}`}
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
