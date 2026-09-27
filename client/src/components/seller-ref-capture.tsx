import { useEffect } from "react";
import { useLocation } from "wouter";
import { captureAdAttributionFromUrl } from "@/lib/adAttribution";
import { captureSellerRefFromUrl } from "@/lib/sellerRef";

/** Persiste ?ref= y el video del anuncio (utm_content / fbclid) en cualquier ruta. */
export function SellerRefCapture() {
  const [location] = useLocation();
  useEffect(() => {
    captureSellerRefFromUrl(window.location.search);
    captureAdAttributionFromUrl(window.location.search);
  }, [location]);
  return null;
}
