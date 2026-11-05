import React, { type ReactNode, useState } from "react";
import { Info } from "lucide-react";
import {
  DEPOSITO_COLORS,
  DEPOSITO_HINT_V2,
  DEPOSITO_HINT_V3,
  DEPOSITO_MODULE,
} from "@/lib/depositoBrand";

const { PIZARRA, INK, MUTED, GOLD } = DEPOSITO_COLORS;

type Props = {
  edition: "v2" | "v3";
  statusLine?: string;
  volcados?: number;
  racha?: number;
  hint?: string;
  endSlot?: ReactNode;
};

/** Shell Depósito — Compact App Bar, mismo gesto que Dual Kernel. */
export function DepositoShell({
  edition,
  statusLine,
  volcados = 0,
  racha,
  hint,
  endSlot,
}: Props) {
  const [showHint, setShowHint] = useState(false);
  const hintBody = hint ?? (edition === "v3" ? DEPOSITO_HINT_V3 : DEPOSITO_HINT_V2);
  const badge = edition === "v3" ? "V3" : "V2";

  return (
    <header
      className="sticky top-0 z-30 px-3 py-2 sm:px-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(2,2,2,0.98) 0%, rgba(2,2,2,0.92) 100%)",
        borderBottom: "1px solid rgba(212,175,55,0.18)",
        backdropFilter: "blur(10px)",
      }}
      data-testid="deposito-shell"
    >
      <div className="mx-auto max-w-xl">
        <div className="flex min-h-[36px] items-center gap-2">
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-black tracking-wider"
            style={{ backgroundColor: GOLD, color: PIZARRA }}
            data-testid="deposito-shell-badge"
          >
            {badge}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <h1
                className="truncate text-[13px] font-black leading-none sm:text-sm"
                style={{ color: INK }}
                data-testid="deposito-shell-title"
              >
                Universidad · Depósito
              </h1>
              <button
                type="button"
                aria-label="Qué es el Depósito"
                aria-expanded={showHint}
                onClick={() => setShowHint((v) => !v)}
                className="shrink-0 rounded p-0.5 touch-manipulation"
                style={{ color: MUTED }}
                data-testid="deposito-shell-hint"
              >
                <Info size={12} />
              </button>
            </div>
            <p
              className="mt-0.5 text-[8px] font-black uppercase leading-tight tracking-[0.12em]"
              style={{ color: GOLD }}
              data-testid="deposito-shell-tagline"
            >
              {DEPOSITO_MODULE.tagline}
            </p>
          </div>
          <div
            className="flex shrink-0 items-center gap-2 tabular-nums text-[10px]"
            style={{ color: MUTED }}
          >
            <span data-testid="deposito-shell-volcados">
              <strong style={{ color: INK }}>{volcados}</strong>
              <span className="ml-0.5 opacity-70">vol</span>
            </span>
            {typeof racha === "number" ? (
              <>
                <span aria-hidden style={{ opacity: 0.35 }}>
                  ·
                </span>
                <span data-testid="deposito-shell-racha">
                  <strong style={{ color: GOLD }}>{racha}</strong>
                  <span className="ml-0.5 opacity-70">racha</span>
                </span>
              </>
            ) : null}
            {endSlot}
          </div>
        </div>

        {showHint ? (
          <p
            className="mt-1.5 text-[10px] leading-snug"
            style={{ color: MUTED }}
            data-testid="deposito-shell-hint-body"
          >
            {hintBody}
            {statusLine ? (
              <>
                {" "}
                <span style={{ color: "rgba(241,245,249,0.55)" }}>{statusLine}</span>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </header>
  );
}
