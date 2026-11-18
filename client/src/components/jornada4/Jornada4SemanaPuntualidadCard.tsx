import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { getSemanaPuntualidad, type SemanaPuntualidad } from "@/jornada4/semanaPuntualidad";
import type { SegmentoV5 } from "@/lib/persistence";
import { J4_COLORS } from "./Jornada4Shell";
import { J4_UI } from "./jornada4Ui";

const { MUTED, GOLD, INK } = J4_COLORS;
const EMERALD = "#00C851";

type Props = {
  userId: string | undefined;
  segmentos: SegmentoV5[];
};

/** Puntualidad de puertas · últimos 7 días-jornada. */
export function Jornada4SemanaPuntualidadCard({ userId, segmentos }: Props) {
  const [semana, setSemana] = useState<SemanaPuntualidad | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void getSemanaPuntualidad(userId, segmentos).then(s => {
      if (!cancelled) setSemana(s);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, segmentos]);

  if (!userId || !semana) return null;

  const pct = semana.puntualidadPct;
  const color = pct != null && pct >= 80 ? EMERALD : GOLD;

  return (
    <section
      className={`mx-3 mb-3 sm:mx-4 ${J4_UI.card}`}
      data-testid="jornada4-semana-puntualidad"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
          style={{ color: MUTED }}
        >
          <CalendarCheck size={10} style={{ color: GOLD }} />
          Puntualidad · últimos 7 días
        </span>
        <span className="text-sm font-black tabular-nums" style={{ color }}>
          {pct != null ? `${pct}%` : "—"}
        </span>
      </div>

      {semana.evaluadas === 0 ? (
        <p className="text-[10px] leading-snug" style={{ color: MUTED }}>
          Aún no hay puertas evaluadas esta semana.
        </p>
      ) : (
        <>
          <p className="text-[10px] leading-snug" style={{ color: INK }}>
            {semana.aTiempo} de {semana.evaluadas} puertas abiertas a tiempo · mejor racha{" "}
            {semana.mejorRacha} · disciplina media {semana.disciplinaMediaPct}%
          </p>
          <div className="flex gap-1 mt-2" aria-label="Disciplina por día">
            {semana.dias.map(d => (
              <div key={d.fecha} className="flex-1 text-center" data-testid={`semana-dia-${d.fecha}`}>
                <div
                  className="h-8 rounded-sm flex items-end overflow-hidden"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="w-full"
                    style={{
                      height: `${d.conPlan ? Math.max(4, Math.min(100, d.porcentajeDia)) : 0}%`,
                      backgroundColor: d.porcentajeDia >= 80 ? EMERALD : GOLD,
                    }}
                  />
                </div>
                <span className="text-[7px]" style={{ color: MUTED }}>
                  {d.fecha.slice(8)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
