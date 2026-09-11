import { Bookmark, CheckSquare, Square } from "lucide-react";

const INK = "#f1f5f9";
const MUTED = "#64748b";

export type DesglosadorListaPickerItem = {
  titulo: string;
  seccionTitulo?: string;
};

type Props = {
  items: DesglosadorListaPickerItem[];
  selected: boolean[];
  onChange: (next: boolean[]) => void;
  accent?: string;
  testIdPrefix: string;
  /** Si true, lista larga (25 ops) con scroll. */
  compact?: boolean;
};

export function DesglosadorListaPicker({
  items,
  selected,
  onChange,
  accent = "#D4AF37",
  testIdPrefix,
  compact = true,
}: Props) {
  const picked = selected.filter(Boolean).length;
  const allOn = items.length > 0 && picked === items.length;
  const toggle = (idx: number) => {
    const next = selected.slice();
    next[idx] = !next[idx];
    onChange(next);
  };
  return (
    <div className="space-y-2" data-testid={`${testIdPrefix}-picker`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: accent }}>
          {picked}/{items.length} seleccionadas
        </p>
        <button
          type="button"
          onClick={() => onChange(items.map(() => !allOn))}
          className="text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-lg"
          style={{ color: accent, border: `1px solid ${accent}45` }}
          data-testid={`${testIdPrefix}-toggle-all`}
        >
          {allOn ? "Ninguna" : "Todas"}
        </button>
      </div>
      <ol
        className={compact ? "space-y-0.5 max-h-52 overflow-y-auto pr-1" : "space-y-0.5"}
      >
        {items.map((item, i) => {
          const on = selected[i] === true;
          return (
            <li key={`${item.titulo}-${i}`}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left touch-manipulation"
                style={{
                  backgroundColor: on ? `${accent}14` : "transparent",
                }}
                data-testid={`${testIdPrefix}-item-${i}`}
              >
                {on ? (
                  <CheckSquare size={14} style={{ color: accent }} className="shrink-0" />
                ) : (
                  <Square size={14} style={{ color: MUTED }} className="shrink-0" />
                )}
                <span className="text-[10px] font-mono shrink-0" style={{ color: accent }}>
                  {i + 1}.
                </span>
                <span className="text-[11px] truncate flex-1" style={{ color: INK }}>
                  {item.titulo}
                  {item.seccionTitulo ? (
                    <span className="ml-1 text-[8px] uppercase" style={{ color: MUTED }}>
                      · {item.seccionTitulo}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ListaGuardadaBadge({ label = "Lista guardada" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ backgroundColor: "rgba(212,175,55,0.18)", color: "#D4AF37" }}
    >
      <Bookmark size={9} /> {label}
    </span>
  );
}
