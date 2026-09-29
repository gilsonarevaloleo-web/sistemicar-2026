/**
 * Entitlements Universidad (Depósito): Matrícula / Carrera / Título.
 * Owner y preview ops → acceso completo.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "@/App";
import {
  hasDepositoCarreraAccess,
  hasDepositoMatriculaAccess,
  hasDepositoTituloAccess,
  subscribeToProgression,
  type UserProgression,
} from "@/lib/persistence";
import { isPreviewOpsUnlocked } from "@/lib/previewOps";
import { isOwnerEmail } from "@shared/moduleAccess";
import { gradoMaximoDeposito } from "@shared/depositoPricing";
import type { GradoMaestria } from "@shared/deposito/engineConfig";

export type DepositoEntitlements = {
  ready: boolean;
  hasMatricula: boolean;
  hasCarrera: boolean;
  hasTitulo: boolean;
  bypass: boolean;
  gradoMaximo: GradoMaestria;
};

export function useDepositoEntitlements(): DepositoEntitlements {
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
      },
    );
    return () => unsub();
  }, [user?.uid]);

  return useMemo(() => {
    const bypass =
      isOwnerEmail(user?.email) || previewOps || isPreviewOpsUnlocked();
    if (bypass) {
      return {
        ready: true,
        hasMatricula: true,
        hasCarrera: true,
        hasTitulo: true,
        bypass: true,
        gradoMaximo: 4 as GradoMaestria,
      };
    }
    const args = [
      progression?.subscriptionPlan,
      user?.email,
      progression?.rank,
      progression?.activeModules,
    ] as const;
    const hasCarrera = hasDepositoCarreraAccess(...args);
    const hasTitulo = hasDepositoTituloAccess(...args);
    return {
      ready,
      hasMatricula: hasDepositoMatriculaAccess(...args),
      hasCarrera,
      hasTitulo,
      bypass: false,
      gradoMaximo: gradoMaximoDeposito({ hasCarrera, hasTitulo }),
    };
  }, [user?.email, progression, ready, previewOps]);
}
