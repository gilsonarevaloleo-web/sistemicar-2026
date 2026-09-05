import { useMemo, useState } from "react";
import { Stamp } from "lucide-react";
import { J4_COLORS } from "./Jornada4Shell";
import { buildSelloDraft, emitirSelloOperador } from "@/lib/selloOperadorBuild";
import {
  readLocalCierreJornadaByFecha,
  type CierreJornadaLog,
  type SegmentoV5,
  type Vehicle,
} from "@/lib/persistence";
import { getJournalDateString } from "@/lib/segmentTime";
import {
  formatTerminoLabel,
  planYaTermino,
  resolveTerminoPlanMs,
} from "@shared/selloOperador";

const { PIZARRA, INK, MUTED, GOLD } = J4_COLORS;

type Props = {
  userId: string | undefined;
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  todayPs: number;
};

export function SelloOperadorCard({ userId, segmentos, vehicles, todayPs }: Props) {
  const fecha = getJournalDateString();
  const [sello, setSello] = useState<CierreJornadaLog | null>(() =>
    readLocalCierreJornadaByFecha(fecha),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = useMemo(() => {
    if (!userId || sello?.selloEmitido) return null;
    return buildSelloDraft({
      userId,
      segmentos,
      vehicles,
      totalPS: todayPs,
    });
  }, [userId, segmentos, vehicles, todayPs, sello?.selloEmitido]);

  const sellar = async () => {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const log = await emitirSelloOperador({
        userId,
        segmentos,
        vehicles,
        totalPS: todayPs,
      });
      setSello(log);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo sellar.");
    } finally {
      setBusy(false);
    }
  };

  const sellado = sello?.selloEmitido === true && sello.selladoPor === "operador";
  const tension = sellado ? sello?.tension ?? sello?.selloTexto : draft?.tension;
  const hechos = sellado ? sello?.evidenciaHechos : draft?.evidenciaHechos;
  const mandato = sellado ? sello?.mandato : draft?.mandato;
  const terminoMs = resolveTerminoPlanMs(segmentos, Date.now());
  const terminoLabel = terminoMs != null ? formatTerminoLabel(terminoMs) : null;
  const terminoLlego = planYaTermino(segmentos, Date.now());

  return (
    <section
      className="mx-4 mb-3 rounded-xl border p-3 space-y-2.5"
      style={{
        backgroundColor: PIZARRA,
        borderColor: sellado ? "rgba(212,175,55,0.45)" : "rgba(212,175,55,0.28)",
      }}
      data-testid="sello-operador-card"
    >
      <p
        className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
        style={{ color: MUTED }}
      >
        <Stamp size={10} style={{ color: GOLD }} />
        Sello de jornada
      </p>
      <p className="text-[10px] leading-snug" style={{ color: MUTED }} data-testid="sello-encuadre">
        {terminoLabel
          ? `Término del plan: ${terminoLabel}. Un bloque (costura, estudio) se cierra aparte. Si el trabajo se alarga, mueve la última puerta.`
          : "Sin anillo no hay término. Puedes cosechar evidencia; no hay Puerta del Término que recordar."}
        {!sellado && terminoLabel && !terminoLlego
          ? " El plan aún no termina. Sellar ahora corta la jornada."
          : ""}
      </p>
      <p className="text-[12px] leading-snug" style={{ color: INK }} data-testid="sello-tension">
        {tension}
      </p>
      <ul className="space-y-1">
        {(hechos ?? []).map((h) => (
          <li key={h} className="text-[10px] leading-snug" style={{ color: MUTED }}>
            {h}
          </li>
        ))}
      </ul>
      {mandato ? (
        <p className="text-[10px] leading-snug" style={{ color: GOLD }} data-testid="sello-mandato">
          {mandato}
        </p>
      ) : null}
      {sellado ? (
        <p
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: GOLD }}
          data-testid="sello-cerrado"
        >
          Día sellado · tú firmaste
        </p>
      ) : (
        <button
          type="button"
          disabled={!userId || busy}
          onClick={() => void sellar()}
          className="w-full py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider"
          style={{ backgroundColor: `${GOLD}22`, color: GOLD }}
          data-testid="sello-operador-firmar"
        >
          {busy ? "Sellando…" : "Yo sello la jornada"}
        </button>
      )}
      {error ? (
        <p className="text-[10px] text-red-400" data-testid="sello-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
