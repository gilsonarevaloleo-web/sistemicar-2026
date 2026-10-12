import { auth } from "@/lib/firebase";
import { activateModulesForUser, modulesGrantedByPlan } from "@/lib/persistence";

let claimInFlight: Promise<{
  grantedPlans: string[];
  grantedCredits: number;
}> | null = null;

/**
 * Aplica Yape/MP pendientes (módulos y créditos Espejo) a la cuenta
 * Google ya abierta. Si la clienta pagó después del trial, esto tiene
 * que terminar ANTES de mandarla a /pagos.
 */
export async function claimPendingPurchases(): Promise<{
  grantedPlans: string[];
  grantedCredits: number;
}> {
  if (claimInFlight) return claimInFlight;
  claimInFlight = claimPendingPurchasesOnce().finally(() => {
    claimInFlight = null;
  });
  return claimInFlight;
}

async function claimPendingPurchasesOnce(): Promise<{
  grantedPlans: string[];
  grantedCredits: number;
}> {
  const user = auth?.currentUser;
  if (!user || user.isAnonymous || !user.email) {
    return { grantedPlans: [], grantedCredits: 0 };
  }

  const token = await user.getIdToken();
  const headers = { Authorization: `Bearer ${token}` };

  const [modulesRes, creditsRes] = await Promise.all([
    fetch("/api/planificacion/claim-purchases", {
      method: "POST",
      headers,
    }).catch(() => null),
    fetch("/api/espejo/claim-purchase-credits", {
      method: "POST",
      headers,
    }).catch(() => null),
  ]);

  const modules = modulesRes ? await modulesRes.json().catch(() => ({})) : {};
  const credits = creditsRes ? await creditsRes.json().catch(() => ({})) : {};

  const grantedPlans: string[] = Array.isArray(modules.grantedPlans)
    ? modules.grantedPlans
    : [];
  const grantedCredits =
    typeof credits.grantedCredits === "number" ? credits.grantedCredits : 0;

  if (modules.applyOnClient && grantedPlans.length > 0) {
    const unlocked = grantedPlans.flatMap((id) => modulesGrantedByPlan(id));
    if (unlocked.length > 0) {
      await activateModulesForUser(user.uid, unlocked, {
        subscriptionPlan: grantedPlans[0],
      });
    }
    const confirmIds = Array.isArray(modules.deliveryIdsToConfirm)
      ? modules.deliveryIdsToConfirm
      : [];
    if (confirmIds.length > 0) {
      await fetch("/api/planificacion/confirm-client-apply", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryIds: confirmIds }),
      }).catch(() => null);
    }
  }

  if (grantedPlans.length > 0) {
    window.dispatchEvent(new CustomEvent("progression-updated"));
  }
  if (grantedCredits > 0) {
    window.dispatchEvent(new CustomEvent("espejo-credits-updated"));
  }

  return { grantedPlans, grantedCredits };
}
