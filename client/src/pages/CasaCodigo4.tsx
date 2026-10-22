import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Scale } from "lucide-react";
import { useAuthContext } from "@/App";
import { CardLeyCasasUmbral } from "@/components/planetas/CardLeyCasasUmbral";
import {
  LienzoEntrada,
  JUEZ_IRON,
  JUEZ_STEEL,
  PREGUNTA_MATRIZ_ENTRADA,
} from "@/components/casas/codigo4/LienzoEntrada";
import { PanelLectura } from "@/components/casas/codigo4/PanelLectura";
import { BloqueDirectiva } from "@/components/casas/codigo4/BloqueDirectiva";
import { BotonCopiarAuditoria } from "@/components/casas/codigo4/BotonCopiarAuditoria";
import { HistorialAuditorias } from "@/components/casas/codigo4/HistorialAuditorias";
import { ModalSaldoInsuficiente } from "@/components/casas/codigo4/ModalSaldoInsuficiente";
import {
  JuezSaldoError,
  auditarFase1,
  desbloquearFase2,
  leerHistorialJuez,
  leerSaldoJuez,
} from "@/lib/casas/codigo4/api";
import {
  CASA_CODIGO4_FIRMA,
  CASA_CODIGO4_NOMBRE,
  CREDITO_FASE1_LECTURA,
  CREDITO_FASE2_SOLUCION,
} from "@shared/casas/codigo4";
import { PLANETA_JUEZ } from "@shared/planetas/leyCasasUmbral";
import type {
  HistorialJuezItem,
  JuezSerioFase1,
  JuezSerioFase2,
} from "@shared/casas/codigo4";

export default function CasaCodigo4() {
  const { user } = useAuthContext();
  const [, navigate] = useLocation();
  const userId = user?.uid ?? "";

  const [texto, setTexto] = useState("");
  const [saldo, setSaldo] = useState<number | null>(null);
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [fase1, setFase1] = useState<JuezSerioFase1 | null>(null);
  const [fase2, setFase2] = useState<JuezSerioFase2 | null>(null);
  const [auditando, setAuditando] = useState(false);
  const [desbloqueando, setDesbloqueando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal402, setModal402] = useState<string | null>(null);
  const [volcadoAuditado, setVolcadoAuditado] = useState("");
  const [auditadaEn, setAuditadaEn] = useState<string | null>(null);
  const [historial, setHistorial] = useState<HistorialJuezItem[]>([]);

  const recargarHistorial = async (uid: string) => {
    try {
      const out = await leerHistorialJuez(uid);
      setHistorial(out.items);
    } catch {
      // el lienzo sigue; el historial no bloquea
    }
  };

  useEffect(() => {
    if (!userId) return;
    void leerSaldoJuez(userId)
      .then((r) => setSaldo(r.saldo))
      .catch(() => setSaldo(0));
    void recargarHistorial(userId);
  }, [userId]);

  const abrir402 = (err: unknown) => {
    if (err instanceof JuezSaldoError) {
      setModal402(err.message);
      if (err.saldo != null) setSaldo(err.saldo);
      return true;
    }
    return false;
  };

  const auditar = async () => {
    if (!userId) return;
    setError(null);
    if ((saldo ?? 0) < CREDITO_FASE1_LECTURA) {
      setModal402(
        `Saldo insuficiente para la Fase 1 (Lectura del Perímetro). Se requieren ${CREDITO_FASE1_LECTURA} crédito(s). Saldo: ${saldo ?? 0}.`,
      );
      return;
    }
    setAuditando(true);
    try {
      const out = await auditarFase1({
        userId,
        friccionDiaria: texto,
      });
      setSesionId(out.sesionJuezId);
      setFase1(out.fase1_lectura);
      setFase2(null);
      setSaldo(out.saldo);
      setVolcadoAuditado(texto);
      setAuditadaEn(new Date().toISOString());
      await recargarHistorial(userId);
    } catch (err) {
      if (!abrir402(err)) {
        setError(err instanceof Error ? err.message : "El Juez no pudo leer.");
      }
    } finally {
      setAuditando(false);
    }
  };

  const desbloquear = async () => {
    if (!userId || !sesionId) return;
    setError(null);
    setDesbloqueando(true);
    try {
      const out = await desbloquearFase2({
        userId,
        sesionJuezId: sesionId,
      });
      setFase2(out.fase2_propuesta_solucion);
      setSaldo(out.saldo);
      await recargarHistorial(userId);
    } catch (err) {
      if (!abrir402(err)) {
        setError(err instanceof Error ? err.message : "No se pudo desbloquear.");
      }
    } finally {
      setDesbloqueando(false);
    }
  };

  return (
    <main
      className="min-h-screen px-4 py-10 text-white"
      style={{ backgroundColor: "#050505" }}
      data-testid="casa-codigo4-page"
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Scale size={14} style={{ color: JUEZ_IRON }} aria-hidden />
            <p
              className="text-[10px] tracking-[0.28em]"
              style={{ color: JUEZ_IRON }}
              data-testid="juez-badge"
            >
              PLANETA C4 · {CASA_CODIGO4_NOMBRE}
            </p>
          </div>
          <h1
            className="text-4xl font-light tracking-tight md:text-5xl"
            data-testid="juez-pregunta-entrada"
          >
            {PREGUNTA_MATRIZ_ENTRADA}
          </h1>
          <p className="mt-3 text-sm text-white/45">{CASA_CODIGO4_FIRMA}</p>
        </header>

        <div
          className="sticky top-0 z-20 flex items-center justify-between border px-4 py-3"
          style={{ borderColor: `${JUEZ_IRON}28`, backgroundColor: "#050505f2" }}
          data-testid="juez-saldo"
        >
          <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: JUEZ_STEEL }}>
            Saldo
          </span>
          <span className="text-sm" style={{ color: JUEZ_IRON }}>
            {saldo == null ? "…" : `${saldo} crédito${saldo === 1 ? "" : "s"}`}
          </span>
        </div>

        <LienzoEntrada
          texto={texto}
          onTexto={setTexto}
          onAuditar={() => void auditar()}
          cargando={auditando}
          saldo={saldo}
          costo={CREDITO_FASE1_LECTURA}
          deshabilitado={!userId || auditando}
        />

        {error && (
          <p className="text-sm text-red-400/80" data-testid="juez-error">
            {error}
          </p>
        )}

        {fase1 && (
          <PanelLectura
            fase1={fase1}
            onDesbloquear={() => void desbloquear()}
            desbloqueando={desbloqueando}
            costoFase2={CREDITO_FASE2_SOLUCION}
            yaDesbloqueada={Boolean(fase2)}
          />
        )}

        {fase2 && <BloqueDirectiva fase2={fase2} />}

        {fase1 && sesionId && (
          <BotonCopiarAuditoria
            item={{
              id: sesionId,
              createdAt: auditadaEn ?? new Date().toISOString(),
              updatedAt: auditadaEn ?? new Date().toISOString(),
              textoVolcado: volcadoAuditado,
              fase1,
              fase2Desbloqueada: Boolean(fase2),
              directivaOperacional: fase2?.directivaOperacional ?? null,
            }}
            testId="juez-copiar-actual"
          />
        )}

        <HistorialAuditorias items={historial} />

        <CardLeyCasasUmbral planetaActivo={PLANETA_JUEZ} />

        <Link
          href="/menu"
          className="inline-block text-[10px] uppercase tracking-[0.2em] text-white/35 hover:text-white/70"
        >
          Volver al menú
        </Link>
      </div>

      <ModalSaldoInsuficiente
        abierto={Boolean(modal402)}
        mensaje={modal402 ?? ""}
        onCerrar={() => setModal402(null)}
        onRecargar={() => {
          setModal402(null);
          navigate("/pagos");
        }}
      />
    </main>
  );
}
