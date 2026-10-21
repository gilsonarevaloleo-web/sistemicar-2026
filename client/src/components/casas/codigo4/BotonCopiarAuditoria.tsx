import React, { useState } from "react";
import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import {
  formatearAuditoriaJuez,
  type HistorialJuezItem,
} from "@shared/casas/codigo4";
import { copiarTexto } from "@/lib/casas/codigo4/copiar";
import { JUEZ_IRON } from "./LienzoEntrada";

export const TOAST_AUDITORIA_COPIADA = "Auditoría copiada al portapapeles";

export function BotonCopiarAuditoria({
  item,
  testId = "juez-copiar",
}: {
  item: HistorialJuezItem;
  testId?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    const ok = await copiarTexto(formatearAuditoriaJuez(item));
    if (!ok) return;
    setCopiado(true);
    toast.success(TOAST_AUDITORIA_COPIADA);
    window.setTimeout(() => setCopiado(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={() => void copiar()}
      className="inline-flex items-center gap-2 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
      style={{ borderColor: `${JUEZ_IRON}55`, color: JUEZ_IRON }}
      data-testid={testId}
    >
      <ClipboardCopy size={13} aria-hidden />
      {copiado ? "Copiada" : "Copiar Auditoría"}
    </button>
  );
}
