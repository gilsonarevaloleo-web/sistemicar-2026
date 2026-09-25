/**
 * Rastro proyectivo de Puertas del día — barra horizontal de círculos.
 * Rojo / dorado / verde + costado del foco. Sin métricas de conciencia.
 */
import { useEffect, useMemo, useState } from "react";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import {
  buildCoberturaTimeline,
  COBERTURA_KIND_LABEL,
} from "@/jornada4/coberturaTimeline";
import {
  computeDisciplinaPlanDia,
  formatTardanzaPuertaLabel,
  puntualidadPuertaKind,
  summarizePuntualidadPuertas,
} from "@/jornada4/disciplinaPlanDia";
import {
  pickPuertaTimelineFocusId,
  PUERTA_TIMELINE_KIND_LABEL,
  resolvePuertaTimelineVisual,
} from "@/jornada4/puertaTimelineVisual";
import { getSegmentCalendarDayStartMs } from "@/lib/segmentTime";
import { J4_COLORS } from "./Jornada4Shell";
import { J4_UI } from "./jornada4Ui";

const { MUTED, GOLD, INK } = J4_COLORS;
const BLOOD_BRIGHT = "#FF2A2A";
const EMERALD = "#00C851";

type Props = {
  segmentos: SegmentoV5[];
  vehicles?: Vehicle[];
};

export function Jornada4PuertasTimeline({ segmentos, vehicles = [] }: Props) {
  const tick = useJornada4Tick(segmentos.length > 0);
  const nowMs = useMemo(() => {
    void tick;
    return Date.now();
  }, [tick]);
  const dayStart = useMemo(() => getSegmentCalendarDayStartMs(nowMs), [nowMs]);

  const disciplina = useMemo(
    () =>
      computeDisciplinaPlanDia({
        segmentos,
        nowMs,
        dayStartMs: dayStart,
      }),
    [segmentos, nowMs, dayStart]
  );
  const puntualidadResumen = useMemo(
    () => summarizePuntualidadPuertas(disciplina.entradas),
    [disciplina]
  );
  const entradaBySegId = useMemo(() => {
    const map = new Map<string, (typeof disciplina.entradas)[number]>();
    for (const e of disciplina.entradas) map.set(e.segmentoId, e);
    return map;
  }, [disciplina]);

  const coberturaBySegId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildCoberturaTimeline>[number]>();
    for (const node of buildCoberturaTimeline({ segmentos, vehicles })) {
      map.set(node.segmentoId, node);
    }
    return map;
  }, [segmentos, vehicles]);

  const nodes = useMemo(
    () =>
      segmentos.map((seg, idx) => {
        const entrada = entradaBySegId.get(seg.id);
        const visual = resolvePuertaTimelineVisual({ seg, entrada });
        return { seg, idx, entrada, visual };
      }),
    [segmentos, entradaBySegId]
  );

  const autoFocusId = useMemo(
    () =>
      pickPuertaTimelineFocusId(nodes.map(n => ({ id: n.seg.id, kind: n.visual.kind }))),
    [nodes]
  );
  const [selectedId, setSelectedId] = useState<string | null>(autoFocusId);

  useEffect(() => {
    const ids = new Set(nodes.map(n => n.seg.id));
    setSelectedId(prev => (prev && ids.has(prev) ? prev : autoFocusId));
  }, [autoFocusId, nodes]);

  const selected = nodes.find(n => n.seg.id === selectedId) ?? nodes[0] ?? null;
  const selectedCover = selected ? coberturaBySegId.get(selected.seg.id) : undefined;
  const selectedTardanza = selected?.entrada
    ? formatTardanzaPuertaLabel(selected.entrada)
    : null;

  if (segmentos.length === 0) {
    return (
      <section
        className={`mx-3 mb-3 sm:mx-4 ${J4_UI.card}`}
        data-testid="jornada4-puertas-timeline"
      >
        <p
          className="text-[8px] font-black uppercase tracking-widest mb-0.5"
          style={{ color: MUTED }}
        >
          Puertas del día
        </p>
        <p className={`${J4_UI.hint} mt-2`}>
          Programa segmentos para proyectar el rastro del día.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`mx-3 mb-3 sm:mx-4 ${J4_UI.cardCompact} px-3 py-2.5`}
      data-testid="jornada4-puertas-timeline"
      aria-label="Puertas del día"
    >
      <style>{`
        @keyframes j4-puerta-foco-pulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(212,175,55,0.35), 0 0 8px rgba(212,175,55,0.12); }
          50% { box-shadow: 0 0 0 2px rgba(212,175,55,0.55), 0 0 16px rgba(212,175,55,0.32); }
        }
      `}</style>

      <p
        className="text-[8px] font-black uppercase tracking-widest mb-0.5"
        style={{ color: MUTED }}
      >
        Puertas del día
      </p>
      <p
        className="text-[9px] leading-snug mb-2"
        style={{ color: GOLD }}
        data-testid="jornada4-puertas-puntualidad"
      >
        {puntualidadResumen.headline}
      </p>

      <div className="relative flex items-start justify-between gap-1">
        <div
          className="absolute left-3 right-3 top-[11px] h-px"
          style={{ backgroundColor: "rgba(163,163,163,0.25)" }}
          aria-hidden
        />
        {nodes.map(({ seg, idx, entrada, visual }) => {
          const tardanzaLabel = entrada ? formatTardanzaPuertaLabel(entrada) : null;
          const tardanzaKind = entrada ? puntualidadPuertaKind(entrada) : "pendiente";
          const nodeTardanzaColor =
            tardanzaKind === "a_tiempo"
              ? EMERALD
              : tardanzaKind === "tardia"
                ? "#F59E0B"
                : tardanzaKind === "sin_entrada"
                  ? BLOOD_BRIGHT
                  : tardanzaKind === "en_ventana"
                    ? GOLD
                    : MUTED;
          const isSelected = selected?.seg.id === seg.id;
          return (
            <button
              key={seg.id}
              type="button"
              onClick={() => setSelectedId(seg.id)}
              className="relative z-[1] flex flex-col items-center gap-1 min-w-0 flex-1 touch-manipulation"
              data-testid={`jornada4-puerta-node-${seg.id}`}
              data-puerta-kind={visual.kind}
              aria-pressed={isSelected}
            >
              <div
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-black tabular-nums border"
                style={{
                  backgroundColor: visual.backgroundColor,
                  borderColor: visual.borderColor,
                  color: visual.numberColor,
                  outline: isSelected ? `1px solid ${visual.borderColor}` : undefined,
                  outlineOffset: 2,
                  animation: visual.pulse
                    ? "j4-puerta-foco-pulse 1.8s ease-in-out infinite"
                    : undefined,
                }}
              >
                {idx + 1}
              </div>
              <span
                className="text-[8px] font-bold truncate max-w-full px-0.5 text-center leading-tight"
                style={{ color: visual.labelColor }}
              >
                {seg.nombre}
              </span>
              <span className="text-[7px] font-mono tabular-nums" style={{ color: MUTED }}>
                {seg.horaInicio}
              </span>
              {tardanzaLabel ? (
                <span
                  className="text-[7px] font-black uppercase tracking-wide truncate max-w-full px-0.5 text-center leading-tight"
                  style={{ color: nodeTardanzaColor }}
                  data-testid={`jornada4-puerta-tardanza-${seg.id}`}
                >
                  {tardanzaLabel}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {selected ? (
        <div
          className="mt-2.5 pt-2 border-t"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
          data-testid="jornada4-puertas-costado"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold truncate" style={{ color: INK }}>
              {selected.seg.nombre}
            </p>
            <p className="font-mono text-[10px] tabular-nums shrink-0" style={{ color: MUTED }}>
              {selected.seg.horaInicio}–{selected.seg.horaFin}
            </p>
          </div>
          <p
            className="text-[9px] leading-snug mt-0.5"
            style={{ color: selected.visual.labelColor }}
          >
            {PUERTA_TIMELINE_KIND_LABEL[selected.visual.kind]}
            {selectedCover?.detail
              ? ` · ${COBERTURA_KIND_LABEL[selectedCover.kind]} · ${selectedCover.detail}`
              : selectedCover
                ? ` · ${COBERTURA_KIND_LABEL[selectedCover.kind]}`
                : ""}
            {selectedTardanza ? ` · ${selectedTardanza}` : ""}
          </p>
          <p className="text-[7px] mt-1.5 leading-snug" style={{ color: MUTED }}>
            <span style={{ color: BLOOD_BRIGHT }}>●</span> fracaso{" "}
            <span style={{ color: GOLD }}>●</span> foco{" "}
            <span style={{ color: EMERALD }}>●</span> logro
          </p>
        </div>
      ) : null}
    </section>
  );
}
