import { cn } from "@/lib/utils";
import {
  NIDO_ETIQUETAS,
  NIDO_NATURALEZA,
  type ProyectoEtiqueta,
} from "@/lib/nidoNaturaleza";

const CYAN = "#00FFC3";

type Props = {
  value: ProyectoEtiqueta;
  onChange: (etiqueta: ProyectoEtiqueta) => void;
  disabled?: boolean;
  testId?: string;
};

export function NidoNaturalezaPicker({
  value,
  onChange,
  disabled = false,
  testId = "nido-naturaleza-picker",
}: Props) {
  const meta = NIDO_NATURALEZA[value];
  return (
    <div data-testid={testId}>
      <div className="grid grid-cols-3 gap-1.5">
        {NIDO_ETIQUETAS.map(e => {
          const on = value === e;
          return (
            <button
              key={e}
              type="button"
              disabled={disabled}
              onClick={() => onChange(e)}
              className={cn(
                "py-2 px-1 rounded-lg text-[8px] font-black uppercase tracking-wider disabled:opacity-50",
                on ? "text-white" : "text-slate-500"
              )}
              style={
                on
                  ? { backgroundColor: `${CYAN}25`, border: `1px solid ${CYAN}50` }
                  : { border: "1px solid rgba(255,255,255,0.08)" }
              }
              data-testid={`${testId}-${e}`}
            >
              {NIDO_NATURALEZA[e].label}
            </button>
          );
        })}
      </div>
      <p className="text-[8px] text-slate-500 mt-1.5 leading-relaxed" data-testid={`${testId}-hint`}>
        {meta.hint}
      </p>
    </div>
  );
}
