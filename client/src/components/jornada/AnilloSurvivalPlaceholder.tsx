type Props = {
  size?: number;
  showCaption?: boolean;
};

/** Placeholder estático del anillo en modo supervivencia móvil. */
export function AnilloSurvivalPlaceholder({ size = 72, showCaption = false }: Props) {
  return (
    <div className="flex flex-col items-center" data-testid="anillo-survival-placeholder">
      <div
        className="flex items-center justify-center rounded-full border border-dashed"
        style={{
          width: size,
          height: size,
          borderColor: "rgba(212,175,55,0.28)",
          backgroundColor: "rgba(255,255,255,0.02)",
        }}
      >
        <p className="text-[7px] text-slate-500 text-center px-2 leading-snug">
          Modo ligero
        </p>
      </div>
      {showCaption && (
        <p className="text-[7px] text-slate-600 text-center mt-2 px-2 leading-snug max-w-[200px]">
          Anillo en vivo disponible al activar modo completo
        </p>
      )}
    </div>
  );
}
