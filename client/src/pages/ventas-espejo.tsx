import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Landing comercial Espejo → packs de créditos en /pagos.
 */
export default function VentasEspejo() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/pagos?plan=espejo_inicio", { replace: true });
  }, [navigate]);

  return null;
}
