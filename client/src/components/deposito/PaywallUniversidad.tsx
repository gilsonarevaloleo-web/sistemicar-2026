import { Check, Lock } from "lucide-react";
import type { DepositoSku } from "@shared/depositoPricing";

const GOLD = "#D4AF37";
const ORANGE = "#F97316";

export function PaywallUniversidad({
  sku,
  motivo,
  onVolverTrial,
}: {
  sku: DepositoSku;
  motivo: string;
  onVolverTrial?: () => void;
}) {
  return (
    <section
      className="border-2 p-5"
      style={{ borderColor: `${ORANGE}88`, background: `${ORANGE}10` }}
      data-testid="deposito-paywall"
    >
      <p
        className="flex items-center gap-2 text-[10px] tracking-[0.2em]"
        style={{ color: GOLD }}
      >
        <Lock size={14} />
        UNIVERSIDAD · {sku.shortName.toUpperCase()}
      </p>
      <h2
        className="mt-2 text-xl font-black text-white"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        ${sku.priceUsd} USD/mes
      </h2>
      <p className="mt-2 text-sm text-white/65">{motivo}</p>
      <p className="mt-1 text-xs text-white/40">{sku.identity}</p>
      <ul className="mt-4 space-y-1.5">
        {sku.unlocks.map((u) => (
          <li key={u} className="flex items-start gap-2 text-xs text-white/70">
            <Check
              size={12}
              className="mt-0.5 shrink-0"
              style={{ color: GOLD }}
            />
            {u}
          </li>
        ))}
      </ul>
      <a
        href={sku.checkoutHref}
        className="mt-5 flex w-full items-center justify-center gap-2 border px-4 py-3.5 text-[12px] font-bold tracking-[0.18em]"
        style={{
          background: `linear-gradient(90deg, ${GOLD}33, ${ORANGE}22)`,
          borderColor: `${GOLD}88`,
          color: GOLD,
        }}
        data-testid="deposito-paywall-cta"
      >
        ACTIVAR {sku.shortName.toUpperCase()} · ${sku.priceUsd}/MES
      </a>
      {onVolverTrial ? (
        <button
          type="button"
          onClick={onVolverTrial}
          className="mt-3 w-full text-center text-[11px] tracking-widest text-white/40 hover:text-white/70"
          data-testid="deposito-paywall-volver-trial"
        >
          VOLVER AL VOLCADO DE PRUEBA
        </button>
      ) : null}
    </section>
  );
}
