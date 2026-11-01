import React from "react";
import type { CeldaAsistencia, ResumenAsistencia } from "@shared/deposito/v3";

const GOLD = "#D4AF37";

const LEYENDA: Array<{ estado: CeldaAsistencia["estado"]; label: string }> = [
  { estado: "cumplida", label: "sesión" },
  { estado: "dijo_si", label: "dijo sí" },
  { estado: "dijo_no", label: "dijo no" },
  { estado: "ausente", label: "sin sesión" },
];

function tono(celda: CeldaAsistencia): { bg: string; border: string } {
  if (celda.estado === "cumplida") {
    return { bg: GOLD, border: GOLD };
  }
  if (celda.estado === "dijo_si") {
    return { bg: "transparent", border: GOLD };
  }
  if (celda.estado === "dijo_no") {
    return { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.22)" };
  }
  if (celda.estado === "futuro") {
    return { bg: "transparent", border: "rgba(255,255,255,0.04)" };
  }
  return { bg: "transparent", border: "rgba(255,255,255,0.12)" };
}

export function ControlAsistencia({
  celdas,
  resumen,
}: {
  celdas: readonly CeldaAsistencia[];
  resumen: ResumenAsistencia;
}) {
  return (
    <section
      className="border px-5 py-5"
      style={{ borderColor: `${GOLD}33`, backgroundColor: "rgba(0,0,0,0.35)" }}
      data-testid="deposito-asistencia"
    >
      <div className="mb-4 flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: `${GOLD}22` }}>
        <div>
          <h3
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            Control de asistencia
          </h3>
          <p className="mt-1 text-[11px] text-white/40">
            Qué días hizo la sesión. Qué días no. Un día Lima, una marca.
          </p>
        </div>
        <p
          className="text-right font-mono text-[10px] text-white/45"
          data-testid="deposito-asistencia-resumen"
        >
          {resumen.diasConSesion} con sesión · {resumen.diasSinSesion} sin
          sesión · racha {resumen.rachaActual}
        </p>
      </div>

      <ol
        className="grid grid-cols-7 gap-1.5"
        aria-label="Calendario de asistencia"
        data-testid="deposito-asistencia-calendario"
      >
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <li
            key={d}
            className="pb-1 text-center text-[9px] tracking-[0.16em] text-white/30"
          >
            {d}
          </li>
        ))}
        {celdas.map((celda) => {
          const t = tono(celda);
          return (
            <li key={celda.fecha}>
              <span
                title={`${celda.dia} ${celda.fecha} · ${celda.estado}`}
                className="flex h-8 items-center justify-center font-mono text-[10px]"
                style={{
                  backgroundColor: t.bg,
                  border: `1px solid ${t.border}`,
                  color: celda.estado === "cumplida" ? "#111" : "rgba(255,255,255,0.55)",
                  boxShadow: celda.esHoy ? `0 0 0 1px ${GOLD}` : undefined,
                }}
                data-testid={`deposito-asistencia-dia-${celda.fecha}`}
                data-estado={celda.estado}
                data-hoy={celda.esHoy ? "1" : "0"}
              >
                {Number(celda.fecha.slice(8))}
              </span>
            </li>
          );
        })}
      </ol>

      <ul className="mt-4 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.14em] text-white/35">
        {LEYENDA.map((item) => (
          <li key={item.estado} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5"
              style={{
                backgroundColor: tono({
                  fecha: "",
                  dia: "lunes",
                  estado: item.estado,
                  esHoy: false,
                }).bg,
                border: `1px solid ${tono({
                  fecha: "",
                  dia: "lunes",
                  estado: item.estado,
                  esHoy: false,
                }).border}`,
              }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ControlAsistencia;
