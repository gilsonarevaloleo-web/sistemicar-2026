import { auth } from "@/lib/firebase";

/**
 * Al primer login con Google, aplica Yape/MP pendientes
 * (módulos de planificación y créditos Espejo) al uid nuevo.
 */
export async function claimPendingPurchases(): Promise<{
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

  if (grantedPlans.length > 0) {
    window.dispatchEvent(new CustomEvent("progression-updated"));
  }
  if (grantedCredits > 0) {
    window.dispatchEvent(new CustomEvent("espejo-credits-updated"));
  }

  return { grantedPlans, grantedCredits };
}
