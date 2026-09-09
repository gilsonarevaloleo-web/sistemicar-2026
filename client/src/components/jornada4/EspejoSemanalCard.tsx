import { useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";
import { esLunesDeCosecha, TEXTO_INSUFICIENTE, VIRTUD_LABEL } from "@shared/reporteSemanal";
import type { ReporteSemanal } from "@shared/reporteSemanal";
import { J4_COLORS } from "./Jornada4Shell";
import { cargarEspejoSemanal } from "@/lib/reporteSemanalLive";

const { PIZARRA, INK, MUTED, GOLD } = J4_COLORS;

type Props = {
  userId: string | undefined;
  /** Pulso de la isla Métricas — el lunes 05:00 Lima revela sin recargar. */
  tick?: number;
};

export function EspejoSemanalCard({ userId, tick = 0 }: Props) {
  const [pulso, setPulso] = useState(0);
  const [cosecha, setCosecha] = useState<ReporteSemanal | null>(null);
  const [semanaId, setSemanaId] = useState<string>("");

  useEffect(() => {
    if (!userId) {
      setCosecha(null);
      return;
    }
    const { enCurso, cosecha: next, pulsoAncla } = cargarEspejoSemanal(userId);
    setPulso(pulsoAncla);
    setSemanaId(enCurso.semanaId);
    setCosecha(next);
  }, [userId]);

  if (!userId) return null;

  void tick;
  const mostrarCosecha =
    Boolean(cosecha && cosecha.estado !== "EN_CURSO") && esLunesDeCosecha(Date.now());

  return (
    <section
      className="mx-4 mb-3 rounded-xl border p-3 space-y-2"
      style={{ backgroundColor: PIZARRA, borderColor: "rgba(212,175,55,0.22)" }}
      data-testid="espejo-semanal-card"
    >
      <p
        className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
        style={{ color: MUTED }}
      >
        <CalendarRange size={10} style={{ color: GOLD }} />
        Espejo semanal
      </p>
      <p className="text-[11px] leading-snug" style={{ color: INK }} data-testid="espejo-pulso">
        Semana {semanaId} en curso · {pulso} de 7 días con ancla. El relato se sella el lunes
        05:00 Lima.
      </p>
      {mostrarCosecha && cosecha ? (
        <div className="space-y-1.5 pt-1 border-t border-white/5" data-testid="espejo-cosecha">
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: GOLD }}>
            Cosecha {cosecha.semanaId} · {cosecha.estado}
          </p>
          <p className="text-[12px] leading-snug" style={{ color: INK }}>
            {cosecha.veredicto.tension}
          </p>
          {cosecha.estado === "SELLADO" ? (
            <>
              <ul className="space-y-1">
                {cosecha.veredicto.evidencia.map((h) => (
                  <li key={h} className="text-[10px]" style={{ color: MUTED }}>
                    {h}
                  </li>
                ))}
              </ul>
              <p className="text-[10px]" style={{ color: GOLD }}>
                {cosecha.veredicto.mandato}
              </p>
              {cosecha.virtudAlta && cosecha.virtudBaja ? (
                <p className="text-[9px]" style={{ color: MUTED }}>
                  Alta {VIRTUD_LABEL[cosecha.virtudAlta]} · baja {VIRTUD_LABEL[cosecha.virtudBaja]}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-[10px]" style={{ color: MUTED }}>
              {TEXTO_INSUFICIENTE}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
