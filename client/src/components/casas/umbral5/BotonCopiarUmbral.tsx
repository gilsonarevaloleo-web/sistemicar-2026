import React, { useState, type MouseEvent } from "react";
import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { copiarTexto } from "@/lib/casas/codigo4/copiar";
import { UMBRAL5_BRONZE } from "./LienzoLimite";

export function BotonCopiarUmbral({
  texto,
  etiqueta = "Copiar volcado",
  copiadoLabel = "Copiado",
  toastOk = "Volcado copiado al portapapeles",
  testId,
}: {
  texto: string;
  etiqueta?: string;
  copiadoLabel?: string;
  toastOk?: string;
  testId: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copiarTexto(texto);
    if (!ok) return;
    setCopiado(true);
    toast.success(toastOk);
    window.setTimeout(() => setCopiado(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={(e) => void copiar(e)}
      className="inline-flex items-center gap-2 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
      style={{ borderColor: `${UMBRAL5_BRONZE}55`, color: UMBRAL5_BRONZE }}
      data-testid={testId}
    >
      <ClipboardCopy size={13} aria-hidden />
      {copiado ? copiadoLabel : etiqueta}
    </button>
  );
}
