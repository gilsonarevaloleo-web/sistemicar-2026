import { SUBSCRIPTION_PLANS } from "../shared/mercadopagoPlans";
import { isEspejoSkuId } from "../shared/espejoPricing";

type MpPaymentInfo = {
  id?: string | number;
  external_reference?: string | null;
  payer?: { email?: string | null };
  transaction_amount?: number | null;
};
import {
  getEspejoDeliveryByPaymentId,
  processEspejoCreditPayment,
} from "./espejoCreditDeliveries";
import { sendPaymentConfirmationEmail } from "./emailService";

export type MpExternalRef = {
  planId?: string;
  email?: string;
  userName?: string;
  timestamp?: number;
  /** Código de vendedor (Planificación / Espejo). */
  sellerRef?: string;
};

export function parseMpExternalRef(paymentInfo: MpPaymentInfo): MpExternalRef {
  const externalRef: MpExternalRef = paymentInfo.external_reference
    ? JSON.parse(paymentInfo.external_reference)
    : {};
  if (!externalRef.email && paymentInfo.payer?.email) {
    externalRef.email = paymentInfo.payer.email;
  }
  return externalRef;
}

/** Entrega de créditos Espejo para packs espejo_inicio / espejo_recarga (idempotente por payment id). */
export async function deliverEspejoCreditsIfNeeded(
  paymentInfo: MpPaymentInfo,
  externalRef: MpExternalRef
): Promise<void> {
  const planId = externalRef.planId;
  if (!planId || !isEspejoSkuId(planId)) return;

  const plan = SUBSCRIPTION_PLANS[planId];
  const credits = "espejoCredits" in plan ? plan.espejoCredits : 0;
  if (!credits) {
    console.warn(`[MP] ${planId} sin espejoCredits configurados`);
    return;
  }

  const email = externalRef.email?.trim();
  if (!email) {
    console.warn(`[MP] ${planId} sin email — no se pueden acreditar créditos`);
    return;
  }

  const paymentIdStr = String(paymentInfo.id);
  const existing = await getEspejoDeliveryByPaymentId(paymentIdStr);
  if (existing.exists && existing.status === "granted") {
    console.log(`[MP] Espejo: pago ${paymentIdStr} ya acreditado`);
    return;
  }

  const result = await processEspejoCreditPayment({
    mpPaymentId: paymentIdStr,
    buyerEmail: email,
    credits,
    planId,
  });

  try {
    await sendPaymentConfirmationEmail({
      to: email,
      userName: externalRef.userName || "Explorador",
      planName: `${plan.name} (${credits} créditos)`,
      amount: paymentInfo.transaction_amount ?? plan.price,
    });
  } catch (emailErr) {
    console.error(`[MP] Email confirmación Espejo falló para ${email}`, emailErr);
  }

  if (result.granted) {
    console.log(`[MP] Espejo: créditos activados para ${email} (${planId})`);
  } else {
    console.log(
      `[MP] Espejo: pago registrado para ${email} — claim al iniciar sesión con el mismo correo`
    );
  }
}
