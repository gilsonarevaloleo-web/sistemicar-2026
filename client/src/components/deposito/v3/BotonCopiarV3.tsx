import React, { useState } from "react";
import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { copiarTexto } from "@/lib/deposito/v3/copiar";
import {
  formatearAuditoriaDepositoV3,
  type AuditoriaV3Copiable,
} from "@/lib/deposito/v3/formatear";

const GOLD = "#D4AF37";
export const TOAST_AUDITORIA_V3_COPIADA = "Auditoría copiada al portapapeles";

export function BotonCopiarV3({
  item,
  testId = "deposito-v3-copiar",
}: {
  item: AuditoriaV3Copiable;
  testId?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    const ok = await copiarTexto(formatearAuditoriaDepositoV3(item));
    if (!ok) return;
    setCopiado(true);
    toast.success(TOAST_AUDITORIA_V3_COPIADA);
    window.setTimeout(() => setCopiado(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void copiar();
      }}
      className="inline-flex items-center gap-2 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
      style={{ borderColor: `${GOLD}55`, color: GOLD }}
      data-testid={testId}
    >
      <ClipboardCopy size={13} aria-hidden />
      {copiado ? "Copiada" : "Copiar Auditoría"}
    </button>
  );
}
