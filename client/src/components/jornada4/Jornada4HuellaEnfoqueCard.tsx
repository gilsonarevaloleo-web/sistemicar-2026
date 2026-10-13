import { Fingerprint } from "lucide-react";
import { computeHuellaEnfoque, HUELLA_EJES } from "@/jornada4/huellaEnfoque";
import type { Vehicle } from "@/lib/persistence";
import { J4_COLORS } from "./Jornada4Shell";
import { J4_UI } from "./jornada4Ui";

const { INK, MUTED, GOLD } = J4_COLORS;
const VIOLET = "#8B5CF6";

type Props = {
  vehicles: Vehicle[];
};

function ringsConHuella(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.filter(
    v =>
      v.tipoFlota === "situacion" &&
      !v.vehiculoPadreDesglosadorId &&
      (v.ringHuella != null || v.situacionCronometro?.activo === true)
  );
}

/**
 * Espejo diario de la coreografía del ring. Sin tick 1s: compute puro.
 */
export function Jornada4HuellaEnfoqueCard({ vehicles }: Props) {
  const rings = ringsConHuella(vehicles);
  const lecturas = rings.map(v => ({
    id: v.id,
    titulo: v.titulo,
    vivo: v.status === "activo",
    lectura: computeHuellaEnfoque(v),
  }));
  const media =
    lecturas.length > 0
      ? Math.round(lecturas.reduce((s, r) => s + r.lectura.huella, 0) / lecturas.length)
      : 0;

  return (
    <section
      className={`mx-3 mb-3 sm:mx-4 ${J4_UI.card} space-y-2.5`}
      data-testid="jornada4-huella-enfoque"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`${J4_UI.label} flex items-center gap-1`}>
            <Fingerprint size={10} style={{ color: VIOLET }} />
            Huella de enfoque
          </p>
          <p className={`${J4_UI.value} mt-0.5`} style={{ color: media >= 60 ? GOLD : INK }}>
            {lecturas.length === 0 ? "—" : `${media}%`}
          </p>
        </div>
      </div>
      <ul className="space-y-0.5">
        {HUELLA_EJES.map(eje => (
          <li key={eje.id} className="text-[10px] leading-snug" style={{ color: MUTED }}>
            <span className="font-bold" style={{ color: INK }}>
              {eje.label}.
            </span>{" "}
            {eje.definicion}
          </li>
        ))}
      </ul>
      {lecturas.length === 0 ? (
        <p className="text-[11px] leading-snug" style={{ color: MUTED }}>
          No hay etiqueta negativa. Solo músculo que se desarrolla en el
          desglosador.
        </p>
      ) : (
        <ul className="space-y-2">
          {lecturas.map(item => (
            <li key={item.id} className="space-y-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[12px] font-bold truncate" style={{ color: INK }}>
                  {item.titulo}
                  {item.vivo ? (
                    <span className="ml-1 text-[9px] font-black uppercase" style={{ color: VIOLET }}>
                      vivo
                    </span>
                  ) : null}
                </p>
                <p className="text-[12px] font-black tabular-nums shrink-0" style={{ color: GOLD }}>
                  {item.lectura.huella}%
                </p>
              </div>
              <p className="text-[10px] leading-snug" style={{ color: MUTED }}>
                {HUELLA_EJES.map(e => `${e.label} ${item.lectura[e.id]}`).join(" · ")}
              </p>
              <p className="text-[10px] leading-snug" style={{ color: MUTED }}>
                {item.lectura.relato}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
