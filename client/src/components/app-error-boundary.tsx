import { Component, type ErrorInfo, type ReactNode } from "react";
import { resetAnilloViewModeStorage } from "@/lib/anilloViewMode";
import { emergencyPruneStorage } from "@/lib/storageHygiene";
import {
  bumpPlaneacionCrashCount,
  clearPlaneacionCrashCount,
  forceArchiveSituacionActivos,
  repairStuckSituacionVehicles,
} from "@/lib/situacionRepair";
import { flushLocalVehicles } from "@/lib/persistence";
import { teardownAllSituacionSessions } from "@/lib/situacionSessionTeardown";
import { hardResetSpeechSystems } from "@/lib/speechRecovery";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string; crashCount: number };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "", crashCount: 0 };
  private nativeRecoveryAttached = false;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      message: error?.message || "Error inesperado",
      crashCount: bumpPlaneacionCrashCount(),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      this.attachNativeRecoveryHandlers();
    }
  }

  componentWillUnmount() {
    this.detachNativeRecoveryHandlers();
  }

  private attachNativeRecoveryHandlers() {
    if (this.nativeRecoveryAttached || typeof document === "undefined") return;
    const recover = document.getElementById("app-error-recover");
    const force = document.getElementById("app-error-force-situacion");
    const menu = document.getElementById("app-error-menu");
    recover?.addEventListener("click", this.handleRecover, true);
    force?.addEventListener("click", this.handleForceSituacion, true);
    menu?.addEventListener("click", this.handleGoMenu, true);
    this.nativeRecoveryAttached = true;
  }

  private detachNativeRecoveryHandlers() {
    if (!this.nativeRecoveryAttached || typeof document === "undefined") return;
    const recover = document.getElementById("app-error-recover");
    const force = document.getElementById("app-error-force-situacion");
    const menu = document.getElementById("app-error-menu");
    recover?.removeEventListener("click", this.handleRecover, true);
    force?.removeEventListener("click", this.handleForceSituacion, true);
    menu?.removeEventListener("click", this.handleGoMenu, true);
    this.nativeRecoveryAttached = false;
  }

  private reloadTo(path: string) {
    this.setState({ hasError: false, message: "", crashCount: 0 });
    window.location.href = path;
  }

  handleRecover = () => {
    // Remount suave: nunca archivar por conteo de crashes.
    try {
      hardResetSpeechSystems(true);
      teardownAllSituacionSessions();
      repairStuckSituacionVehicles();
      emergencyPruneStorage({ aggressive: false });
      resetAnilloViewModeStorage();
      flushLocalVehicles();
      clearPlaneacionCrashCount();
    } catch {
      // ignore
    }
    this.reloadTo("/jornada-v4");
  };

  handleForceSituacion = () => {
    // Emergencia explícita: archivar rings situacionales (no conquista ni su pausa).
    try {
      hardResetSpeechSystems(true);
      teardownAllSituacionSessions();
      repairStuckSituacionVehicles();
      emergencyPruneStorage({ aggressive: true });
      resetAnilloViewModeStorage();
      flushLocalVehicles();
      forceArchiveSituacionActivos();
      clearPlaneacionCrashCount();
    } catch {
      // ignore
    }
    this.reloadTo("/jornada-v4");
  };

  handleGoMenu = () => {
    try {
      repairStuckSituacionVehicles();
      clearPlaneacionCrashCount();
    } catch {
      // ignore
    }
    this.reloadTo("/menu");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: "#020202" }}
      >
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">SISTEMICAR</p>
          <h1 className="text-lg font-bold text-white">Algo bloqueó la interfaz</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Suele pasar al volver de segundo plano. «Reparar» recarga la vista y conserva conquista
            y rings abiertos. Solo usa emergencia si el ring situacional quedó irrecuperable.
          </p>
          {this.state.message && (
            <p className="text-[10px] text-slate-600 font-mono break-all px-2">{this.state.message}</p>
          )}
          <p className="text-[10px] text-emerald-400/90 leading-snug">
            Reparar no archiva ni borra desglosadores activos.
          </p>
          <button
            type="button"
            id="app-error-recover"
            onClick={this.handleRecover}
            className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider"
            style={{ backgroundColor: "#D4AF37", color: "#000" }}
          >
            Reparar y abrir Jornada
          </button>
          <button
            type="button"
            id="app-error-force-situacion"
            onClick={this.handleForceSituacion}
            className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider"
            style={{ backgroundColor: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.45)" }}
          >
            Cerrar ring situacional (emergencia)
          </button>
          <button
            type="button"
            id="app-error-menu"
            onClick={this.handleGoMenu}
            className="w-full py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300"
          >
            Solo volver al menú
          </button>
        </div>
      </div>
    );
  }
}
