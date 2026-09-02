import { PROYECTO_PALETTE, resolveProyectoColor } from "@/lib/proyectoColor";

type Props = {
  proyectoId: string;
  value?: string | null;
  onChange: (color: string) => void;
  disabled?: boolean;
};

/** Paleta del Hub: el tint viaja a operaciones de vehículo. */
export function ProyectoColorSwatches({
  proyectoId,
  value,
  onChange,
  disabled = false,
}: Props) {
  const current = resolveProyectoColor(proyectoId, value);
  return (
    <div className="flex items-center gap-1.5 flex-wrap" data-testid="hub-proyecto-colores">
      {PROYECTO_PALETTE.map(color => {
        const on = current.toLowerCase() === color.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            disabled={disabled}
            onClick={() => onChange(color)}
            className="w-6 h-6 rounded-full touch-manipulation select-none disabled:opacity-40"
            style={{
              backgroundColor: color,
              border: on ? "2px solid #f8fafc" : "2px solid transparent",
              boxShadow: on ? `0 0 10px ${color}` : `inset 0 0 0 1px ${color}99`,
            }}
            aria-label={`Color ${color}`}
            aria-pressed={on}
            data-testid={`hub-proyecto-color-${color.replace("#", "")}`}
          />
        );
      })}
    </div>
  );
}
