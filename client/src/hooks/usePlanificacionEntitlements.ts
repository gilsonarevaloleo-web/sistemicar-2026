/**
 * Entitlements comerciales Jornada V4: Base / Ritmo / Norte.
 * Owner y preview ops → acceso completo.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "@/App";
import {
  hasNorteAccess,
  hasPlanificacionBaseAccess,
  hasRitmoAccess,
  subscribeToProgression,
  type UserProgression,
} from "@/lib/persistence";
import { isPreviewOpsUnlocked } from "@/lib/previewOps";
import { isOwnerEmail } from "@shared/moduleAccess";

export type PlanificacionEntitlements = {
  ready: boolean;
  /** Jornada Base — Conquista + PS */
  hasBase: boolean;
  /** Ritmo — segmentos + Situacional */
  hasRitmo: boolean;
  /** Norte — Crisol + Hub */
  hasNorte: boolean;
  /** Bypass owner / preview */
  bypass: boolean;
};

export function usePlanificacionEntitlements(): PlanificacionEntitlements {
  const { user } = useAuthContext();
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [ready, setReady] = useState(false);
  const [previewOps, setPreviewOps] = useState(() => isPreviewOpsUnlocked());

  useEffect(() => {
    const sync = () => setPreviewOps(isPreviewOpsUnlocked());
    sync();
    window.addEventListener("sistemicar-preview-ops", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sistemicar-preview-ops", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setProgression(null);
      setReady(true);
      return;
    }
    setReady(false);
    const unsub = subscribeToProgression(
      user.uid,
      (prog) => {
        setProgression(prog);
        setReady(true);
      },
      () => {
        setProgression(null);
        setReady(true);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  return useMemo(() => {
    const bypass = isOwnerEmail(user?.email) || previewOps || isPreviewOpsUnlocked();
    if (bypass) {
      return {
        ready: true,
        hasBase: true,
        hasRitmo: true,
        hasNorte: true,
        bypass: true,
      };
    }
    const args = [
      progression?.subscriptionPlan,
      user?.email,
      progression?.rank,
      progression?.activeModules,
    ] as const;
    return {
      ready,
      hasBase: hasPlanificacionBaseAccess(...args),
      hasRitmo: hasRitmoAccess(...args),
      hasNorte: hasNorteAccess(...args),
      bypass: false,
    };
  }, [user?.email, progression, ready, previewOps]);
}
