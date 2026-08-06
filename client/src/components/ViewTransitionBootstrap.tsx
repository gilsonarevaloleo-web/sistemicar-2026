import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { beginViewTransition } from "@/lib/viewTransitionShield";
import { armDualKernelExitSoftStart } from "@/lib/dualKernelQuiet";
import { isJornada4Path } from "@/lib/jornadaBrand";

/** Arma el escudo en cada cambio de ruta (navegación programática o por Link). */
export function ViewTransitionBootstrap() {
  const [location] = useLocation();
  const prevRef = useRef(location);
  const isFirstRef = useRef(true);

  useEffect(() => {
    if (isFirstRef.current) {
      isFirstRef.current = false;
      prevRef.current = location;
      return;
    }
    if (prevRef.current !== location) {
      // Respaldo si la nav no pasó por NavTransitionLink.
      // Arma o alarga soft-start (Hub pide ventana más larga).
      if (isJornada4Path(prevRef.current) && !isJornada4Path(location)) {
        armDualKernelExitSoftStart({ href: location });
        // Sheet de lanzamiento / overlays pueden dejar body overflow:hidden al desmontar.
        if (typeof document !== "undefined" && document.body.style.overflow === "hidden") {
          document.body.style.overflow = "";
        }
      }
      beginViewTransition();
      prevRef.current = location;
    }
  }, [location]);

  return null;
}
