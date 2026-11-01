import React from "react";
import {
  CASCADE_CODES,
  EYE_CODES,
  etiquetaCodigoOjo,
  INDICE_CASCADA_MAX,
  type EvolucionOjos,
} from "@shared/deposito/v3";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

const ETIQUETAS_PELDANO = ["0", "C1", "C2", "C4", "C5", "C7", "C10"];

export function GraficoEvolucionOjos({ evo }: { evo: EvolucionOjos }) {
  const puntos = evo.puntos.slice(-14);
  const w = 320;
  const h = 120;
  const padX = 18;
  const padY = 12;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const xs = puntos.map((_, i) =>
    puntos.length === 1
      ? padX + innerW / 2
      : padX + (i / (puntos.length - 1)) * innerW,
  );
  const ys = puntos.map(
    (p) => padY + innerH - (p.indice / INDICE_CASCADA_MAX) * innerH,
  );
  const path =
    xs.length === 0
      ? ""
      : xs
          .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`)
          .join(" ");

  const maxPresencia = Math.max(1, ...EYE_CODES.map((n) => evo.presenciaPorOjo[n]));

  return (
    <section
      className="border px-5 py-5"
      style={{ borderColor: `${GOLD}33`, backgroundColor: "rgba(0,0,0,0.35)" }}
      data-testid="deposito-evolucion"
    >
      <div className="mb-4 flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: `${GOLD}22` }}>
        <div>
          <h3
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            Evolución de ojos · Ley de Cascada
          </h3>
          <p
            className="mt-1 text-[11px] text-white/40"
            data-testid="deposito-evolucion-criterio"
          >
            Se mide el peldaño C1→C2→C4→C5→C7→C10, no la cantidad de
            volcados. La cantidad es persistencia: vive en la asistencia.
          </p>
        </div>
        <p
          className="text-right font-mono text-[10px] text-white/45"
          data-testid="deposito-evolucion-indice"
        >
          {evo.peldanoActual === 0 ? "sin ancla" : `C${evo.peldanoActual}`} ·{" "}
          {evo.tendencia}
        </p>
      </div>

      <ol
        className="mb-4 grid grid-cols-6 gap-1"
        aria-label="Escalera de cascada"
        data-testid="deposito-evolucion-escalera"
      >
        {CASCADE_CODES.map((code, i) => {
          const alcanzado = evo.indiceActual > i;
          const pendiente = evo.pendienteActual === code;
          return (
            <li
              key={code}
              className="px-1 py-2 text-center font-mono text-[10px]"
              style={{
                border: `1px solid ${alcanzado || pendiente ? GOLD : "rgba(255,255,255,0.1)"}`,
                backgroundColor: alcanzado ? `${GOLD}22` : "transparent",
                color: alcanzado || pendiente ? GOLD : "rgba(255,255,255,0.3)",
              }}
              data-testid={`deposito-evolucion-peldano-${code}`}
              data-alcanzado={alcanzado ? "1" : "0"}
              data-pendiente={pendiente ? "1" : "0"}
            >
              C{code}
            </li>
          );
        })}
      </ol>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mb-3 w-full"
        role="img"
        aria-label="Gráfico de peldaño de cascada"
        data-testid="deposito-evolucion-grafico"
      >
        {ETIQUETAS_PELDANO.map((label, i) => {
          const y = padY + innerH - (i / INDICE_CASCADA_MAX) * innerH;
          return (
            <g key={label}>
              <line
                x1={padX}
                x2={w - padX}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
              />
              <text
                x={4}
                y={y + 3}
                fill="rgba(255,255,255,0.28)"
                fontSize="7"
                fontFamily="ui-monospace, monospace"
              >
                {label}
              </text>
            </g>
          );
        })}
        {path && (
          <path d={path} fill="none" stroke={GOLD} strokeWidth="1.6" />
        )}
        {xs.map((x, i) => (
          <circle
            key={puntos[i].timestamp}
            cx={x}
            cy={ys[i]}
            r="3"
            fill={GOLD}
          />
        ))}
      </svg>

      <p
        className="text-[12px] leading-relaxed text-white/70"
        data-testid="deposito-evolucion-mensaje"
      >
        {evo.mensaje}
      </p>

      <div className="mt-5 border-t pt-4" style={{ borderColor: `${GOLD}18` }}>
        <p
          className="mb-2 text-[10px] tracking-[0.2em]"
          style={{ color: AZURE }}
        >
          PRESENCIA · no es evolución
        </p>
        <ol className="grid grid-cols-5 gap-1.5 sm:grid-cols-10" data-testid="deposito-evolucion-presencia">
          {EYE_CODES.map((n) => {
            const count = evo.presenciaPorOjo[n];
            const hBar = Math.round((count / maxPresencia) * 28);
            return (
              <li
                key={n}
                className="flex flex-col items-center gap-1"
                title={`${etiquetaCodigoOjo(n)} · ${count}`}
                data-testid={`deposito-evolucion-presencia-${n}`}
              >
                <span
                  className="w-full"
                  style={{
                    height: 28,
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <span
                    className="block w-full"
                    style={{
                      height: hBar,
                      marginTop: 28 - hBar,
                      backgroundColor: `${AZURE}66`,
                    }}
                  />
                </span>
                <span className="font-mono text-[9px] text-white/35">C{n}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default GraficoEvolucionOjos;
