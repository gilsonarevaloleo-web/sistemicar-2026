import { JORNADA_MODULE } from "@/lib/jornadaBrand";

const PIZARRA = "#0a0a0a";
const GOLD = "#D4AF37";
const VERDE = "#00C851";

type Props = {
  /** Texto bajo el header mientras carga el chunk o verifica acceso. */
  statusLine?: string;
};

/** Shell ligero de Jornada — pinta en <50ms; no depende del chunk lazy. */
export function JornadaShell({ statusLine }: Props) {
  return (
    <div
      className="min-h-[60vh] pb-24"
      style={{ backgroundColor: PIZARRA }}
      data-testid="jornada-shell"
    >
      <div
        className="sticky top-0 z-30 px-4 pt-3 pb-2"
        style={{
          backgroundColor: "rgba(2,2,2,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-lg mx-auto">
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
            {JORNADA_MODULE.titleUpper}
          </p>
          <p className="text-[8px] text-slate-600 mt-0.5">{JORNADA_MODULE.tagline}</p>
          <div className="mt-2 flex gap-1">
            {(["operar", "metricas", "meta"] as const).map((tab, i) => (
              <div
                key={tab}
                className="flex-1 py-1.5 rounded-lg text-center text-[8px] font-black uppercase tracking-wider"
                style={{
                  backgroundColor: i === 0 ? `${VERDE}18` : "rgba(255,255,255,0.04)",
                  color: i === 0 ? VERDE : "rgba(255,255,255,0.35)",
                  border: i === 0 ? `1px solid ${VERDE}40` : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {tab === "operar" ? "Operar" : tab === "metricas" ? "Métricas" : "Meta"}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">
        <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: GOLD }}>
          Flota activa
        </p>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="rounded-xl border p-3 animate-pulse"
            style={{
              backgroundColor: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.08)",
              animationDuration: i === 0 ? "1.4s" : `${1.4 + i * 0.2}s`,
            }}
            data-testid={`jornada-shell-vehicle-${i}`}
          >
            <div className="h-2.5 w-2/3 rounded bg-white/10 mb-2" />
            <div className="h-2 w-1/2 rounded bg-white/5" />
          </div>
        ))}
        {statusLine && (
          <p className="text-[9px] text-center text-slate-500 pt-2">{statusLine}</p>
        )}
      </div>
    </div>
  );
}
