import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Legacy: landing de venta del Espejo $17 (Corazón Sabio).
 * Retirado — el catálogo comercial es solo Jornada V4 en /pagos.
 */
export default function VentasEspejo() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/pagos", { replace: true });
  }, [navigate]);

  return null;
}
