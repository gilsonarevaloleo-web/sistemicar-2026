import { Fingerprint } from "lucide-react";
import { computeHuellaPeriodo } from "@/jornada4/huellaEnfoque";
import type { Vehicle } from "@/lib/persistence";
import { J4_COLORS } from "./Jornada4Shell";
import { J4_UI } from "./jornada4Ui";
import { HuellaCincoPuntos } from "./HuellaCincoPuntos";

const { INK, MUTED, GOLD } = J4_COLORS;
const VIOLET = "#8B5CF6";

type Props = {
  vehicles: Vehicle[];
};

function ringsDelDia(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.filter(
    v =>
      v.tipoFlota === "situacion" &&
      !v.vehiculoPadreDesglosadorId &&
      (v.ringHuella != null || v.situacionCronometro?.activo === true)
  );
}

/**
 * Gancho de cierre del día: una lectura por la suma de los desglosadores.
 * Los 5 puntos se ven uno por uno — escalables, no amontonados.
 */
export function Jornada4HuellaEnfoqueCard({ vehicles }: Props) {
  const rings = ringsDelDia(vehicles);
  const lectura = computeHuellaPeriodo(rings);

  return (
    <section
      className={`mx-3 mb-3 sm:mx-4 ${J4_UI.card} space-y-3`}
      data-testid="jornada4-huella-enfoque"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`${J4_UI.label} flex items-center gap-1`}>
            <Fingerprint size={10} style={{ color: VIOLET }} />
            Huella del día
          </p>
          <p className={`${J4_UI.value} mt-0.5`} style={{ color: rings.length ? GOLD : INK }}>
            {rings.length === 0 ? "—" : `${lectura.huella}%`}
          </p>
        </div>
      </div>
      {rings.length === 0 ? (
        <p className="text-[11px] leading-snug" style={{ color: MUTED }}>
          El gancho es el cierre del día: la suma de los desglosadores, no cada
          vehículo. Los PS de Jornada se quedan.
        </p>
      ) : (
        <>
          <p className="text-[13px] leading-snug font-semibold" style={{ color: INK }}>
            {lectura.relato}
          </p>
          <p className="text-[10px] leading-snug" style={{ color: MUTED }}>
            {rings.length} desglosador{rings.length === 1 ? "" : "es"} · {lectura.vehiculos}{" "}
            filas
          </p>
          <HuellaCincoPuntos lectura={lectura} />
          <p className="text-[9px] leading-snug" style={{ color: MUTED }}>
            Atención y Foco: radio de 5 minutos. Decisión, Producción y Orden se
            escalan.
          </p>
        </>
      )}
    </section>
  );
}
