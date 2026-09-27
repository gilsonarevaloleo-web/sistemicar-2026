/**
 * Atribución del anuncio Meta → landing → vendedor.
 * utm_content distingue video A vs video B. fbclid lo pone Facebook solo.
 */

export type AdAttribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  /** video_a | video_b | otro creativo */
  utmContent: string | null;
  fbclid: string | null;
};

export const VIDEO_A_CONTENT = "video_a";
export const VIDEO_B_CONTENT = "video_b";

export const VENTAS_JORNADA_VIDEO_A_URL =
  "https://sistemicar.app/ventas-jornada?utm_source=facebook&utm_medium=paid&utm_campaign=jornada_base&utm_content=video_a";

export const VENTAS_JORNADA_VIDEO_B_URL =
  "https://sistemicar.app/ventas-jornada?utm_source=facebook&utm_medium=paid&utm_campaign=jornada_base&utm_content=video_b";

const EMPTY: AdAttribution = {
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  fbclid: null,
};

function clean(value: string | null): string | null {
  const v = (value || "").trim();
  if (!v || v.length > 80) return null;
  return v;
}

export function parseAdAttribution(search: string): AdAttribution {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  return {
    utmSource: clean(params.get("utm_source")),
    utmMedium: clean(params.get("utm_medium")),
    utmCampaign: clean(params.get("utm_campaign")),
    utmContent: clean(params.get("utm_content")),
    fbclid: clean(params.get("fbclid")),
  };
}

export function mergeAdAttribution(
  incoming: AdAttribution,
  previous: AdAttribution | null,
): AdAttribution {
  if (!previous) return incoming;
  return {
    utmSource: incoming.utmSource ?? previous.utmSource,
    utmMedium: incoming.utmMedium ?? previous.utmMedium,
    utmCampaign: incoming.utmCampaign ?? previous.utmCampaign,
    utmContent: incoming.utmContent ?? previous.utmContent,
    fbclid: incoming.fbclid ?? previous.fbclid,
  };
}

export function hasAdAttribution(a: AdAttribution | null | undefined): boolean {
  if (!a) return false;
  return Boolean(a.utmContent || a.utmCampaign || a.fbclid || a.utmSource);
}

/** Etiqueta corta para Pixel / admin: VIDEO A, VIDEO B, o el utm_content. */
export function adVideoLabel(content: string | null | undefined): string | null {
  const v = (content || "").trim().toLowerCase();
  if (!v) return null;
  if (v === VIDEO_A_CONTENT || v === "a" || v === "video-a") return "VIDEO A";
  if (v === VIDEO_B_CONTENT || v === "b" || v === "video-b") return "VIDEO B";
  return content!.trim();
}

export function adAttributionToSearch(a: AdAttribution): string {
  const p = new URLSearchParams();
  if (a.utmSource) p.set("utm_source", a.utmSource);
  if (a.utmMedium) p.set("utm_medium", a.utmMedium);
  if (a.utmCampaign) p.set("utm_campaign", a.utmCampaign);
  if (a.utmContent) p.set("utm_content", a.utmContent);
  if (a.fbclid) p.set("fbclid", a.fbclid);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Copia utm_* y fbclid a un href interno sin pisar lo que ya trae. */
export function withAdAttribution(
  href: string,
  attribution: AdAttribution | null | undefined,
): string {
  if (!attribution || !hasAdAttribution(attribution)) return href;
  const url = new URL(href, "https://sistemicar.app");
  const pairs: Array<[string, string | null]> = [
    ["utm_source", attribution.utmSource],
    ["utm_medium", attribution.utmMedium],
    ["utm_campaign", attribution.utmCampaign],
    ["utm_content", attribution.utmContent],
    ["fbclid", attribution.fbclid],
  ];
  for (const [key, value] of pairs) {
    if (value && !url.searchParams.get(key)) {
      url.searchParams.set(key, value);
    }
  }
  return `${url.pathname}${url.search}`;
}
