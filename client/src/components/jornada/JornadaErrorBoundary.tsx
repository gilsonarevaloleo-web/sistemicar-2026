import { Component, type ErrorInfo, type ReactNode } from "react";
import { bumpPlaneacionCrashCount } from "@/lib/situacionRepair";
import { JornadaShell } from "./JornadaShell";
import { BotonRepararJornada } from "./BotonRepararJornada";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string; crashCount: number };

/** Captura crash del chunk lazy o render de Planeacion — evita spinner infinito. */
export class JornadaErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "", crashCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      message: error?.message || "Error al cargar Jornada",
      crashCount: bumpPlaneacionCrashCount(),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[JornadaErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="relative min-h-[60vh]" data-testid="jornada-error-boundary">
        <JornadaShell statusLine="Jornada no pudo cargar." />
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-24 bg-black/60">
          <div className="w-full max-w-lg space-y-3">
            <div className="rounded-xl border p-4 text-center" style={{ borderColor: "rgba(239,68,68,0.35)", backgroundColor: "rgba(10,10,10,0.95)" }}>
              <p className="text-sm font-bold text-white">Algo bloqueó Jornada</p>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                La vista se colgó (a menudo al volver de segundo plano). Reparar recarga el módulo
                sin borrar conquista ni ring abiertos.
              </p>
              {this.state.message && (
                <p className="text-[9px] text-slate-600 font-mono mt-2 break-all">{this.state.message}</p>
              )}
            </div>
            <BotonRepararJornada />
          </div>
        </div>
      </div>
    );
  }
}
