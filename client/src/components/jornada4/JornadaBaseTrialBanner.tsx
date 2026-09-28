import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import type { JornadaBaseAccess } from "@shared/jornadaBaseAccess";
import {
  JORNADA_BASE_POINTS_UNLOCK,
  JORNADA_BASE_TRIAL_COPY,
  trialBannerText,
} from "@shared/jornadaBaseAccess";
import { J4_UI } from "./jornada4Ui";

const GOLD = "#D4AF37";

type Props = {
  access: JornadaBaseAccess;
};

export function JornadaBaseTrialBanner({ access }: Props) {
  const text = trialBannerText(access);
  const [open, setOpen] = useState(false);
  if (!text) return null;

  const progress =
    access.kind === "trial"
      ? Math.min(100, Math.round((access.points / JORNADA_BASE_POINTS_UNLOCK) * 100))
      : 100;

  const line =
    access.kind === "points"
      ? "Gancho ganado"
      : `${JORNADA_BASE_TRIAL_COPY.headline}${access.daysLeft != null ? ` · ${access.daysLeft}d` : ""} · ${access.points}/${JORNADA_BASE_POINTS_UNLOCK} PS`;

  return (
    <section
      className={`mx-3 mb-2 sm:mx-4 ${J4_UI.cardCompact}`}
      data-testid="jornada-base-trial-banner"
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left touch-manipulation"
        aria-expanded={open}
        data-testid="jornada-base-trial-toggle"
      >
        <p className="min-w-0 flex-1 truncate text-[10px] font-black uppercase tracking-wider" style={{ color: GOLD }}>
          {line}
        </p>
        {open ? (
          <ChevronUp size={12} className="shrink-0 text-neutral-500" />
        ) : (
          <ChevronDown size={12} className="shrink-0 text-neutral-500" />
        )}
      </button>
      {access.kind === "trial" ? (
        <div className="h-1 mx-3 mb-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, backgroundColor: GOLD }}
            data-testid="jornada-base-trial-progress"
          />
        </div>
      ) : null}
      {open ? (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[12px] leading-snug text-white">{text}</p>
          {access.kind === "trial" ? (
            <>
              <p className="text-[10px] text-white/45">{JORNADA_BASE_TRIAL_COPY.hook}</p>
              <Link
                href="/pagos?plan=planificacion_base"
                className="inline-block text-[10px] font-bold uppercase tracking-widest"
                style={{ color: GOLD }}
                data-testid="jornada-base-trial-pagar"
              >
                Activar ya · $24.99/mes
              </Link>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
