import {
  HUELLA_NIVELES,
  medirHuellaEjesFromLectura,
  type HuellaEjeMedida,
  type RingHuellaLectura,
} from "@/jornada4/huellaEnfoque";

const INK = "#f1f5f9";
const MUTED = "#64748b";
const GOLD = "#D4AF37";
const CYAN = "#00FFC3";

type Props = {
  lectura: RingHuellaLectura;
};

function Pips({ eje }: { eje: HuellaEjeMedida }) {
  const fill = eje.puntual ? CYAN : GOLD;
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={`${eje.label} ${eje.nivel} de ${HUELLA_NIVELES}`}
    >
      {Array.from({ length: HUELLA_NIVELES }, (_, i) => {
        const on = i < eje.nivel;
        return (
          <span
            key={i}
            className="block rounded-full"
            style={{
              width: 7,
              height: 7,
              backgroundColor: on ? fill : "rgba(255,255,255,0.12)",
              boxShadow: on && eje.puntual && eje.nivel >= 4 ? `0 0 6px ${CYAN}99` : undefined,
            }}
          />
        );
      })}
    </span>
  );
}

/**
 * Los 5 puntos del cierre: cada músculo con escala propia.
 * Atención y Foco se marcan en el radio de 5 minutos (puntual).
 */
export function HuellaCincoPuntos({ lectura }: Props) {
  const medidas = medirHuellaEjesFromLectura(lectura);
  return (
    <ol className="space-y-2" data-testid="j4-huella-cinco-puntos">
      {medidas.map(eje => (
        <li
          key={eje.id}
          className="flex items-center gap-2.5"
          title={eje.definicion}
          data-testid={`j4-huella-eje-${eje.id}`}
        >
          <span
            className="w-[4.75rem] shrink-0 text-[10px] font-black uppercase tracking-wider"
            style={{ color: eje.nivel > 0 ? INK : MUTED }}
          >
            {eje.label}
          </span>
          <Pips eje={eje} />
          <span
            className="ml-auto font-mono text-[11px] font-black tabular-nums"
            style={{
              color:
                eje.puntual && eje.nivel > 0 ? CYAN : eje.nivel > 0 ? GOLD : MUTED,
            }}
            data-testid={`j4-huella-marca-${eje.id}`}
          >
            {eje.marca}
          </span>
        </li>
      ))}
    </ol>
  );
}
