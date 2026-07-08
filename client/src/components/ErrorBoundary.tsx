import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon } from "lucide-react";
import { repairAndReloadJornada } from "@/lib/jornadaRecovery";
import { clearJornadaFatalError } from "@/lib/jornadaFatalError";
import { getPlaneacionCrashCount } from "@/lib/situacionRepair";

type Props = { children: ReactNode };
type State = { hasError: boolean };

const PIZARRA = "#0a0a0a";
const GOLD = "#D4AF37";

function repairJornadaFromBoundary(): void {
  clearJornadaFatalError();
  const archiveSituacion = getPlaneacionCrashCount() >= 2;
  repairAndReloadJornada(archiveSituacion);
}

/**
 * ErrorBoundary de Jornada — prioridad #1.
 * Pantalla de reparación si suspensión/background dejó el módulo colgado.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[JornadaErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center"
        style={{ backgroundColor: PIZARRA }}
        data-testid="jornada-error-boundary"
      >
        <AlertOctagon size={48} className="text-red-500 mb-4" strokeWidth={1.5} />
        <h1 className="text-base font-black text-white mb-2">
          Jornada bloqueada por suspensión
        </h1>
        <p className="text-[11px] text-slate-400 max-w-sm mb-8 leading-relaxed">
          La app quedó en segundo plano demasiado tiempo. Repara para volver a operar.
        </p>
        <button
          type="button"
          onClick={repairJornadaFromBoundary}
          className="w-full max-w-xs py-4 rounded-xl text-sm font-black uppercase tracking-wider touch-manipulation"
          style={{ backgroundColor: GOLD, color: "#000" }}
          data-testid="jornada-repair-button"
        >
          Reparar Jornada
        </button>
        <p className="text-[9px] text-slate-600 mt-6 max-w-xs leading-snug">
          Tus horas Consciente/Inconsciente del día están en backup. Solo reseteamos la vista.
        </p>
      </div>
    );
  }
}
