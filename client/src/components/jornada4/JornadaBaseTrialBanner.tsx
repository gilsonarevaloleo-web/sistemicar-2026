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
  if (!text) return null;

  const progress =
    access.kind === "trial"
      ? Math.min(100, Math.round((access.points / JORNADA_BASE_POINTS_UNLOCK) * 100))
      : 100;

  return (
    <section
      className={`mx-3 mb-3 sm:mx-4 ${J4_UI.card} space-y-2`}
      data-testid="jornada-base-trial-banner"
    >
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: GOLD }}>
        {access.kind === "points" ? "Gancho ganado" : JORNADA_BASE_TRIAL_COPY.headline}
      </p>
      <p className="text-[12px] leading-snug text-white">{text}</p>
      {access.kind === "trial" ? (
        <>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: GOLD }}
              data-testid="jornada-base-trial-progress"
            />
          </div>
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
    </section>
  );
}
