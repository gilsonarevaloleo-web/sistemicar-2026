import { Component, type ErrorInfo, type ReactNode } from "react";
import { writeAnilloViewMode } from "@/lib/anilloViewMode";

type Props = { children: ReactNode; size?: number };
type State = { failed: boolean };

/** Aísla fallos del anillo para no tumbar toda Jornada. */
export class AnilloRingErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AnilloRingErrorBoundary]", error, info.componentStack);
    try {
      writeAnilloViewMode("mapa");
    } catch {
      /* noop */
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;

    const s = this.props.size ?? 72;
    return (
      <div
        className="flex flex-col items-center justify-center rounded-full border border-red-500/30"
        style={{ width: s, height: s, backgroundColor: "rgba(20,10,10,0.9)" }}
      >
        <p className="text-[7px] text-red-300 font-bold uppercase text-center px-1 leading-tight">
          Anillo
        </p>
        <button
          type="button"
          className="mt-1 text-[6px] text-slate-400 underline"
          onClick={() => this.setState({ failed: false })}
        >
          Reintentar
        </button>
      </div>
    );
  }
}
