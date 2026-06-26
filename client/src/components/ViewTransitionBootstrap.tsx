import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { beginViewTransition } from "@/lib/viewTransitionShield";

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
      beginViewTransition();
      prevRef.current = location;
    }
  }, [location]);

  return null;
}
