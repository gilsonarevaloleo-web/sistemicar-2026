import { repairAndReloadJornada } from "@/lib/jornadaRecovery";

type Props = {
  title?: string;
  description?: string;
  compact?: boolean;
};

/**
 * Remount suave: recarga el módulo sin archivar rings ni conquista.
 * El archive destructivo solo vive en el botón de emergencia del AppErrorBoundary.
 */
export function BotonRepararJornada({
  title = "Reparar Jornada",
  description = "Recarga la vista. Tus desglosadores activos (conquista y ring) se conservan.",
  compact = false,
}: Props) {
  return (
    <div
      className={`rounded-xl border p-4 text-center space-y-2 ${compact ? "" : "shadow-lg"}`}
      style={{
        backgroundColor: "rgba(10,10,10,0.95)",
        borderColor: "rgba(212,175,55,0.35)",
      }}
      data-testid="jornada-repair-panel"
    >
      {!compact && (
        <p className="text-[10px] text-slate-400 leading-snug">{description}</p>
      )}
      <p className="text-[9px] text-emerald-400/90 leading-snug" data-testid="jornada-repair-preserve-hint">
        No archiva ni borra sesiones abiertas.
      </p>
      <button
        type="button"
        onClick={() => repairAndReloadJornada(false)}
        className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-wider touch-manipulation"
        style={{ backgroundColor: "#D4AF37", color: "#000" }}
        data-testid="jornada-repair-button"
      >
        {title}
      </button>
    </div>
  );
}
