import { useEffect, useState, type CSSProperties } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { DireccionGate } from "@/lib/direccionElegibilidad";
import { rumboChipLabel, rumboChipLines } from "@/lib/direccionElegibilidad";
import {
  proyectoColorAlpha,
  resolveProyectoColor,
  rumboPickerListVisible,
  rumboPickerToggleEnabled,
} from "@/lib/proyectoColor";

const MUTED = "#64748b";
const INK = "#e2e8f0";

type Props = {
  abiertas: DireccionGate[];
  selected: DireccionGate;
  activePid: string;
  held: string | null;
  pulse: string | null;
  onHold: (id: string | null) => void;
  onPick: (id: string) => void;
  /** Sube al reclamar Dirección: abre la lista para elegir, no para mirarla. */
  expandSignal: number;
};

function RumboRow({
  gate,
  active,
  pressed,
  onHold,
  onPick,
}: {
  gate: DireccionGate;
  active: boolean;
  pressed: boolean;
  onHold: (id: string | null) => void;
  onPick: (id: string) => void;
}) {
  const tint = resolveProyectoColor(gate.proyectoId, gate.color);
  const lines = rumboChipLines(gate);
  const hot = active || pressed;
  return (
    <button
      type="button"
      onPointerDown={() => onHold(gate.proyectoId)}
      onPointerUp={() => onHold(null)}
      onPointerCancel={() => onHold(null)}
      onPointerLeave={() => onHold(null)}
      onClick={() => onPick(gate.proyectoId)}
      className="w-full flex items-stretch gap-2 rounded-lg text-left touch-manipulation select-none transition-[transform,background-color,box-shadow] duration-100 overflow-hidden"
      style={{
        backgroundColor: hot ? proyectoColorAlpha(tint, "28") : "rgba(255,255,255,0.03)",
        border: `1px solid ${hot ? tint : proyectoColorAlpha(tint, "45")}`,
        boxShadow: hot ? `0 0 12px ${proyectoColorAlpha(tint, "40")}` : undefined,
        transform: pressed ? "scale(0.97)" : undefined,
      }}
      aria-pressed={active}
      aria-label={rumboChipLabel(gate)}
      data-testid={`destino-proyecto-${gate.proyectoId}`}
    >
      <span
        className="w-1.5 shrink-0"
        style={{ backgroundColor: tint }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 py-1.5 pr-2">
        <span
          className="block text-[10px] font-black truncate"
          style={{ color: hot ? tint : INK }}
        >
          {lines.titulo}
        </span>
        {lines.punto ? (
          <span className="block text-[8px] truncate" style={{ color: MUTED }}>
            {lines.punto}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/**
 * Destino del envío: un resumen con tint del proyecto.
 * La lista solo se abre para cambiar rumbo — no ocupa el ring.
 */
export function RumboProyectoPicker({
  abiertas,
  selected,
  activePid,
  held,
  pulse,
  onHold,
  onPick,
  expandSignal,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const canToggle = rumboPickerToggleEnabled(abiertas.length);
  const showList = rumboPickerListVisible(abiertas.length, expanded);
  const tint = resolveProyectoColor(selected.proyectoId, selected.color);
  const lines = rumboChipLines(selected);

  useEffect(() => {
    if (expandSignal > 0 && canToggle) setExpanded(true);
  }, [expandSignal, canToggle]);

  const pickAndFold = (id: string) => {
    onPick(id);
    setExpanded(false);
  };

  const SummaryInner = (
    <>
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: tint }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black truncate" style={{ color: tint }}>
          {lines.titulo}
        </span>
        {lines.punto ? (
          <span className="block text-[8px] truncate" style={{ color: MUTED }}>
            {lines.punto}
          </span>
        ) : null}
      </span>
      {canToggle ? (
        <span className="flex items-center gap-1 shrink-0" style={{ color: tint }}>
          <span className="text-[8px] font-black uppercase tracking-wider">
            {showList ? "Ocultar" : `${abiertas.length} rumbos`}
          </span>
          {showList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      ) : null}
    </>
  );

  const summaryStyle: CSSProperties = {
    backgroundColor: proyectoColorAlpha(tint, "18"),
    border: `1px solid ${tint}`,
    boxShadow: `0 0 10px ${proyectoColorAlpha(tint, "30")}`,
  };

  return (
    <div className="space-y-1" data-testid="destino-proyecto-picker">
      {canToggle ? (
        <button
          type="button"
          onClick={() => setExpanded(o => !o)}
          className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left touch-manipulation select-none"
          style={summaryStyle}
          aria-expanded={showList}
          aria-controls="destino-proyecto-lista"
          data-testid="destino-proyecto-resumen"
        >
          {SummaryInner}
        </button>
      ) : (
        <div
          className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5"
          style={summaryStyle}
          data-testid="destino-proyecto-resumen"
        >
          {SummaryInner}
        </div>
      )}

      {showList ? (
        <div
          id="destino-proyecto-lista"
          className="space-y-1 overflow-y-auto pr-0.5"
          style={{ maxHeight: 148 }}
          data-testid="destino-proyecto-lista"
        >
          {abiertas.map(g => (
            <RumboRow
              key={g.proyectoId}
              gate={g}
              active={g.proyectoId === activePid}
              pressed={held === g.proyectoId || pulse === g.proyectoId}
              onHold={onHold}
              onPick={pickAndFold}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
