import type { TipoFlota } from "./persistence";

/** Copy visible de tipos de flota (ids internos: tiempo | situacion | descanso | verdad). */
export const FLOTA_SELECTOR_DISCRIMINATOR =
  "¿Vas a medir unidades o a sellar decisiones con tiempo?";

export type FlotaBrandEntry = {
  label: string;
  labelUpper: string;
  sublabel: string;
  relojLabel: string;
  psCierre: string;
  /** Nombre corto en frases: «vehículo de …» */
  vehiclePhrase: string;
};

export const FLOTA_BRAND: Record<TipoFlota, FlotaBrandEntry> = {
  tiempo: {
    label: "Conquista",
    labelUpper: "CONQUISTA",
    sublabel: "Desglosador · misión + unidades",
    relojLabel: "Reloj proyectivo",
    psCierre: "PS al cumplir objetivo",
    vehiclePhrase: "conquista",
  },
  situacion: {
    label: "Enfoque",
    labelUpper: "ENFOQUE",
    sublabel: "Lista libre o ring con meta",
    relojLabel: "Meta y cupos",
    psCierre: "2 PS por subtarea (+ cierre ciclo)",
    vehiclePhrase: "enfoque",
  },
  descanso: {
    label: "Descanso",
    labelUpper: "DESCANSO",
    sublabel: "Recarga consciente",
    relojLabel: "Oculto",
    psCierre: "PS por conciencia de recarga",
    vehiclePhrase: "descanso",
  },
  verdad: {
    label: "Verdad",
    labelUpper: "VERDAD",
    sublabel: "Sinceridad ante el vacío",
    relojLabel: "Oculto",
    psCierre: "PS por consciencia de verdad",
    vehiclePhrase: "verdad",
  },
};

export function flotaLabelUpper(tipo: TipoFlota): string {
  return FLOTA_BRAND[tipo].labelUpper;
}

export function flotaLabelsRecord(): Record<TipoFlota, string> {
  return {
    tiempo: FLOTA_BRAND.tiempo.labelUpper,
    situacion: FLOTA_BRAND.situacion.labelUpper,
    descanso: FLOTA_BRAND.descanso.labelUpper,
    verdad: FLOTA_BRAND.verdad.labelUpper,
  };
}

/** «vehículo de enfoque», «vehículo de conquista», … */
export function flotaVehiclePhrase(tipo: TipoFlota): string {
  return FLOTA_BRAND[tipo].vehiclePhrase;
}
