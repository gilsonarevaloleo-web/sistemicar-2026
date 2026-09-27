/**
 * Persiste el rastro del anuncio (video A/B + fbclid) en este navegador.
 * Facebook atribuye con el Pixel + fbclid; nosotros guardamos utm_content
 * para que landing, vendedor y checkout sepan qué video trajo a la persona.
 */

import {
  adVideoLabel,
  hasAdAttribution,
  mergeAdAttribution,
  parseAdAttribution,
  type AdAttribution,
} from "@shared/adAttribution";

const STORAGE_KEY = "sistemicar_ad_attribution";

function readStored(): AdAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdAttribution>;
    if (!parsed || typeof parsed !== "object") return null;
    const a: AdAttribution = {
      utmSource: typeof parsed.utmSource === "string" ? parsed.utmSource : null,
      utmMedium: typeof parsed.utmMedium === "string" ? parsed.utmMedium : null,
      utmCampaign: typeof parsed.utmCampaign === "string" ? parsed.utmCampaign : null,
      utmContent: typeof parsed.utmContent === "string" ? parsed.utmContent : null,
      fbclid: typeof parsed.fbclid === "string" ? parsed.fbclid : null,
    };
    return hasAdAttribution(a) ? a : null;
  } catch {
    return null;
  }
}

function writeStored(a: AdAttribution): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch {
    // quota / private mode
  }
}

export function getAdAttribution(): AdAttribution | null {
  return readStored();
}

export function getAdVideoLabel(): string | null {
  return adVideoLabel(readStored()?.utmContent);
}

/** Lee la URL, mezcla con lo ya guardado y persiste. */
export function captureAdAttributionFromUrl(
  search?: string,
): AdAttribution | null {
  const incoming = parseAdAttribution(
    search ?? (typeof window !== "undefined" ? window.location.search : ""),
  );
  const previous = readStored();
  if (!hasAdAttribution(incoming) && !previous) return null;
  const merged = mergeAdAttribution(incoming, previous);
  if (hasAdAttribution(merged)) writeStored(merged);
  return hasAdAttribution(merged) ? merged : null;
}

export { adVideoLabel, hasAdAttribution };
