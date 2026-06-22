import { repairAndReloadJornada } from "@/lib/jornadaRecovery";
import { getPlaneacionCrashCount } from "@/lib/situacionRepair";

type Props = {
  title?: string;
  description?: string;
  compact?: boolean;
};

export function BotonRepararJornada({
  title = "Reparar Jornada",
  description = "Limpia caché local y recarga el módulo sin perder tu sesión.",
  compact = false,
}: Props) {
  const crashes = getPlaneacionCrashCount();
  const archiveSituacion = crashes >= 2;

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
      {archiveSituacion && (
        <p className="text-[9px] text-amber-400/90">
          Varios intentos fallidos — se archivarán vehículos situación activos al reparar.
        </p>
      )}
      <button
        type="button"
        onClick={() => repairAndReloadJornada(archiveSituacion)}
        className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-wider touch-manipulation"
        style={{ backgroundColor: "#D4AF37", color: "#000" }}
        data-testid="jornada-repair-button"
      >
        {title}
      </button>
    </div>
  );
}
