import type { ReactNode } from "react";
import { useConcienciaClockTickWhen } from "@/lib/concienciaClock";

/**
 * B2: aísla el re-render por reloj (1 s) del listado de segmentos. La suscripción
 * al tick global vive AQUÍ, no en la raíz de /planeacion, de modo que el latido
 * re-renderiza solo este subárbol (el `.map` de segmentos) y no toda la página.
 *
 * `children` es una render-prop: se invoca en el render de este componente, así
 * el tick interno vuelve a evaluar el mapa con `Date.now()` fresco sin re-renderizar
 * el árbol padre. Solo activo en planeación clásica (`enabled = !useJornadaV3`).
 */
export function SegmentTicker({
  enabled,
  children,
}: {
  enabled: boolean;
  children: () => ReactNode;
}) {
  useConcienciaClockTickWhen(enabled);
  return <>{children()}</>;
}
