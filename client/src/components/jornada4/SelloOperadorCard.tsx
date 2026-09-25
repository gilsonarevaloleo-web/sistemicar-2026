import { useEffect, useMemo, useState } from "react";
import { Stamp } from "lucide-react";
import { J4_COLORS } from "./Jornada4Shell";
import { J4_UI } from "./jornada4Ui";
import { buildSelloDraft, emitirSelloOperador } from "@/lib/selloOperadorBuild";
import { selloTiempoDesdeTriada } from "@/lib/selloTiempoTriada";
import {
  readLocalCierreJornadaByFecha,
  type CierreJornadaLog,
  type SegmentoV5,
  type Vehicle,
} from "@/lib/persistence";
import { getJournalDateString } from "@/lib/segmentTime";
import type { ConcienciaTriadaModel } from "@/lib/concienciaTriadaOperador";
import {
  debeMostrarRelatoSello,
  formatTerminoLabel,
  hechosTiempoSello,
  isHechoTiempoSello,
  resolveTerminoPlanMs,
} from "@shared/selloOperador";
import {
  APUNTE_MAX_LEN,
  cierreDesdeApunte,
  fraseValida,
} from "@shared/jornadaApunte";
import { apuntarJornada, cerrarApunteJornada } from "@/lib/jornadaApunteStore";
import { useJornadaApunte } from "@/hooks/useJornadaApunte";

const { INK, MUTED, GOLD } = J4_COLORS;

type Props = {
  userId: string | undefined;
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  todayPs: number;
  /** Misma tríada que Cobertura del día — el sello no inventa otro reloj. */
  triada?: ConcienciaTriadaModel;
  /** Pulso de la isla Métricas — el relato nace al término sin recargar. */
  tick?: number;
};

function FraseField({
  label,
  value,
  onChange,
  testId,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
  placeholder: string;
}) {
  return (
    <label className="block space-y-1">
      <span
        className="text-[9px] font-black uppercase tracking-widest"
        style={{ color: GOLD }}
      >
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, APUNTE_MAX_LEN))}
        placeholder={placeholder}
        rows={2}
        className="w-full rounded-lg px-2.5 py-2 text-[13px] bg-black/40 border border-white/10 text-slate-100 resize-none"
        data-testid={testId}
      />
    </label>
  );
}

export function SelloOperadorCard({
  userId,
  segmentos,
  vehicles,
  todayPs,
  triada,
  tick = 0,
}: Props) {
  void tick;
  const nowMs = Date.now();
  const fecha = getJournalDateString(nowMs);
  const { record, apuntado } = useJornadaApunte(nowMs);
  const [sello, setSello] = useState<CierreJornadaLog | null>(() =>
    readLocalCierreJornadaByFecha(fecha),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blanco, setBlanco] = useState(record?.blanco ?? "");
  const [ocurrio, setOcurrio] = useState(record?.ocurrio ?? "");
  const [noOcurrio, setNoOcurrio] = useState(record?.noOcurrio ?? "");

  useEffect(() => {
    setSello(readLocalCierreJornadaByFecha(fecha));
  }, [fecha]);

  useEffect(() => {
    if (record?.blanco) setBlanco(record.blanco);
    if (record?.ocurrio) setOcurrio(record.ocurrio);
    if (record?.noOcurrio) setNoOcurrio(record.noOcurrio);
  }, [record]);

  const sellado = sello?.selloEmitido === true && sello.selladoPor === "operador";
  const terminoMs = resolveTerminoPlanMs(segmentos, nowMs);
  const terminoLabel = terminoMs != null ? formatTerminoLabel(terminoMs) : null;
  const relatoVisible = debeMostrarRelatoSello(nowMs, sellado, terminoMs);
  const puedeSellar =
    fraseValida(apuntado ? record?.blanco ?? blanco : blanco) &&
    fraseValida(ocurrio) &&
    fraseValida(noOcurrio);

  const draft = useMemo(() => {
    if (!userId || sello?.selloEmitido || !relatoVisible) return null;
    return buildSelloDraft({
      userId,
      segmentos,
      vehicles,
      totalPS: todayPs,
      nowMs,
      triada,
    });
    // nowMs se ancla al tick de la isla; relatoVisible cambia al término.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, segmentos, vehicles, todayPs, sello?.selloEmitido, relatoVisible, triada]);

  const sellar = async () => {
    if (!userId || busy || !puedeSellar) return;
    setBusy(true);
    setError(null);
    try {
      if (!apuntado) apuntarJornada(blanco);
      const cerrado = cerrarApunteJornada(ocurrio, noOcurrio);
      const log = await emitirSelloOperador({
        userId,
        segmentos,
        vehicles,
        totalPS: todayPs,
        cierre: cierreDesdeApunte(cerrado),
        triada,
      });
      setSello(log);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo sellar.");
    } finally {
      setBusy(false);
    }
  };

  const tension = sellado ? sello?.tension ?? sello?.selloTexto : draft?.tension;
  const mandato = sellado ? sello?.mandato : draft?.mandato;
  const tiempoHechos = useMemo(() => {
    if (!triada?.hasPlanificacion) return null;
    return hechosTiempoSello(selloTiempoDesdeTriada(triada));
  }, [triada]);
  const rawHechos = sellado ? sello?.evidenciaHechos : draft?.evidenciaHechos;
  const hechos = useMemo(() => {
    if (!tiempoHechos) return rawHechos;
    const rest = (rawHechos ?? []).filter((h) => !isHechoTiempoSello(h));
    return [...tiempoHechos, ...rest];
  }, [tiempoHechos, rawHechos]);

  return (
    <section
      className={`mx-3 mb-3 sm:mx-4 ${J4_UI.card} space-y-3`}
      style={{
        boxShadow: sellado
          ? "0 0 28px rgba(212,175,55,0.18)"
          : "0 0 20px rgba(241,245,249,0.06)",
      }}
      data-testid="sello-operador-card"
    >
      <p className={`${J4_UI.label} flex items-center gap-1.5`}>
        <Stamp size={12} style={{ color: GOLD }} />
        Sello de jornada
      </p>
      <p className={J4_UI.hint} data-testid="sello-encuadre">
        {terminoLabel
          ? `Término · ${terminoLabel}`
          : "Sin anillo no hay término."}
        {!sellado && terminoLabel && !relatoVisible
          ? " El plan aún no termina."
          : ""}
      </p>
      {relatoVisible ? (
        <>
          <p className="text-[12px] leading-snug" style={{ color: INK }} data-testid="sello-tension">
            {tension}
          </p>
          <ul className="space-y-1" data-testid="sello-hechos">
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
        </>
      ) : (
        <p className="text-[11px] leading-snug" style={{ color: INK }} data-testid="sello-espera">
          {terminoLabel
            ? `Se sella a las ${terminoLabel}. Ahí verás conquista, puertas y lo ajeno.`
            : "El relato nace cuando selles. Hoy no hay hora de término que esperar."}
        </p>
      )}
      {sellado ? (
        <div className="space-y-1" data-testid="sello-apunte-cerrado">
          <p className="text-[11px] leading-snug" style={{ color: INK }}>
            <span style={{ color: GOLD }}>Hoy apunté. </span>
            {sello?.apunteBlanco}
          </p>
          <p className="text-[11px] leading-snug" style={{ color: INK }}>
            <span style={{ color: GOLD }}>Esto ocurrió. </span>
            {sello?.apunteOcurrio}
          </p>
          <p className="text-[11px] leading-snug" style={{ color: INK }}>
            <span style={{ color: MUTED }}>Esto no. </span>
            {sello?.apunteNoOcurrio}
          </p>
          <p
            className="text-[9px] font-black uppercase tracking-widest pt-1"
            style={{ color: GOLD }}
            data-testid="sello-cerrado"
          >
            Día sellado · tú firmaste
          </p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="sello-apunte-form">
          {apuntado ? (
            <p className="text-[12px] leading-snug" style={{ color: INK }} data-testid="sello-apunte-blanco">
              <span style={{ color: GOLD }}>Hoy apunté a esto. </span>
              {record?.blanco}
            </p>
          ) : (
            <FraseField
              label="Hoy apunto a esto"
              value={blanco}
              onChange={setBlanco}
              testId="sello-apunte-blanco-input"
              placeholder="Hoy apunto a esto"
            />
          )}
          <FraseField
            label="Esto ocurrió"
            value={ocurrio}
            onChange={setOcurrio}
            testId="sello-apunte-ocurrio"
            placeholder="Esto ocurrió"
          />
          <FraseField
            label="Esto no"
            value={noOcurrio}
            onChange={setNoOcurrio}
            testId="sello-apunte-no"
            placeholder="Esto no"
          />
          <button
            type="button"
            disabled={!userId || busy || !puedeSellar}
            onClick={() => void sellar()}
            className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.18em] disabled:opacity-40"
            style={{ backgroundColor: "#f8fafc", color: "#0a0a0a" }}
            data-testid="sello-operador-firmar"
          >
            {busy ? "Sellando…" : "Yo sello la jornada"}
          </button>
        </div>
      )}
      {error ? (
        <p className="text-[10px] text-red-400" data-testid="sello-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
