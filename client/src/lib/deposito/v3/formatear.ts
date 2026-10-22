import {
  CANON_TEN_EYES,
  etiquetaCodigoOjo,
  focoRevelacionDe,
  type DepotAnalysisResult,
} from "@shared/deposito/v3";

export interface AuditoriaV3Copiable {
  createdAt: Date | string | number;
  rawFact: string;
  detectedNoise?: string;
  omittedShadow?: string;
  studentHypothesis?: string;
  result: DepotAnalysisResult;
}

export function formatearFechaAuditoriaV3(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatearAuditoriaDepositoV3(item: AuditoriaV3Copiable): string {
  const firma = CANON_TEN_EYES[item.result.characterSignedCode];
  const focoCode = focoRevelacionDe(item.result);
  const foco = CANON_TEN_EYES[focoCode];
  const vacios = (item.result.syntacticVacios ?? [])
    .map((n) => `C${n}`)
    .join(" · ");
  const lineas = [
    "DEPÓSITO V3 — AUDITORÍA",
    `Fecha y hora: ${formatearFechaAuditoriaV3(item.createdAt)}`,
    "",
    "Hecho crudo",
    item.rawFact.trim(),
  ];
  if (item.studentHypothesis?.trim()) {
    lineas.push("", "Hipótesis", item.studentHypothesis.trim());
  }
  if (item.detectedNoise?.trim()) {
    lineas.push("", "Flor / excusa", item.detectedNoise.trim());
  }
  if (item.omittedShadow?.trim()) {
    lineas.push("", "Sombra / lo no dicho", item.omittedShadow.trim());
  }
  lineas.push(
    "",
    "DICTAMEN",
    `Firma: ${etiquetaCodigoOjo(firma.id, "canon")} · ${firma.syntaxLabel}`,
    `Foco / escalón: ${etiquetaCodigoOjo(foco.id, "canon")} · ${foco.syntaxLabel}`,
    `Sintaxis: ${item.result.syntaxDiagnostic.syntaxCharacteristics}`,
    `Estabilidad: ${item.result.groundingStatus.diagnosticMessage}`,
  );
  if (vacios) lineas.push(`Vacíos sintácticos: ${vacios}`);
  lineas.push(
    `Ajuste: ${item.result.pedagogicalFeedback ?? item.result.immediateAdjustment}`,
  );
  return lineas.join("\n");
}
