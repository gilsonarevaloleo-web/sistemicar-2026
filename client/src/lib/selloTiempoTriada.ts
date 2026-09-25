/**
 * Reloj del sello = reloj de Cobertura del día.
 * Consciente = presencia + dirección (minutos únicos sobre el plan).
 * No suma vehículos solapados ni segmentos crudos.
 */
import type { ConcienciaTriadaModel } from "./concienciaTriadaOperador.ts";

export function selloTiempoDesdeTriada(model: ConcienciaTriadaModel): {
  conquistaMin: number;
  entropiaMin: number;
  vacioMin: number;
  jornadaPlanMin: number;
  minutosPresencia: number;
  minutosDireccion: number;
  minutosNoConquistado: number;
  coberturaPct: number;
} {
  const minutosPresencia = Math.max(0, model.minutosPresencia);
  const minutosDireccion = Math.max(0, model.minutosDireccion);
  const conquistaMin = Math.round((minutosPresencia + minutosDireccion) * 10) / 10;
  const entropiaMin = Math.max(0, model.minutosInconsciente);
  const vacioMin = Math.max(0, model.minutosNoConquistado);
  return {
    conquistaMin,
    entropiaMin,
    vacioMin,
    jornadaPlanMin: Math.max(0, model.minutosPlan),
    minutosPresencia,
    minutosDireccion,
    minutosNoConquistado: vacioMin,
    coberturaPct: Math.max(0, 100 - model.pctNoConquistado),
  };
}
