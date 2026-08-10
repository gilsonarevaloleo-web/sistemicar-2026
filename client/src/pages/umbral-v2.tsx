import { useEffect, useState } from "react";
import { ConsolaUmbral } from "@/components/umbral/ConsolaUmbral";
import { useAuthContext } from "@/App";
import {
  hasUmbralAccess,
  subscribeToProgression,
  type UserProgression,
} from "@/lib/persistence";
import { isPreviewOpsUnlocked } from "@/lib/previewOps";
import { UMBRAL_SKU } from "@shared/umbralPricing";

/**
 * Consola Umbral v2 — UI del motor de 10 Códigos.
 * Trial: Código 1 gratis. Paid: Códigos 2–10 + métricas.
 */
export default function UmbralV2() {
  const { user } = useAuthContext();
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setReady(false);
      return;
    }
    const unsub = subscribeToProgression(
      user.uid,
      (prog) => {
        setProgression(prog);
        setReady(true);
      },
      () => {
        setProgression(null);
        setReady(true);
      },
    );
    return () => unsub();
  }, [user?.uid]);

  if (!user?.uid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white/50">
        Cargando consola…
      </div>
    );
  }

  const paid =
    isPreviewOpsUnlocked() ||
    hasUmbralAccess(
      progression?.subscriptionPlan,
      user.email,
      progression?.rank,
      progression?.activeModules,
    );

  return (
    <div
      className="min-h-screen text-[#E8E8E8]"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -10%, #141820 0%, #0A0A0A 42%, #050505 100%)",
      }}
      data-testid="umbral-v2-page"
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,175,55,0.45) 3px)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-4 py-6 pb-28 sm:py-10">
        {!ready ? (
          <p className="text-center text-white/40">Verificando acceso…</p>
        ) : (
          <ConsolaUmbral
            userId={user.uid}
            hasPaidAccess={paid}
            checkoutHref={UMBRAL_SKU.checkoutHref}
          />
        )}
      </div>
    </div>
  );
}
