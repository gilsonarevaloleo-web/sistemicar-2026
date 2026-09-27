import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adVideoLabel,
  mergeAdAttribution,
  parseAdAttribution,
  withAdAttribution,
  VENTAS_JORNADA_VIDEO_A_URL,
  VENTAS_JORNADA_VIDEO_B_URL,
} from "./adAttribution.ts";

describe("adAttribution Meta → landing → vendedor", () => {
  it("parsea video A y video B desde la URL del anuncio", () => {
    const a = parseAdAttribution(VENTAS_JORNADA_VIDEO_A_URL.split("?")[1]);
    const b = parseAdAttribution(VENTAS_JORNADA_VIDEO_B_URL.split("?")[1]);
    assert.equal(a.utmCampaign, "jornada_base");
    assert.equal(a.utmContent, "video_a");
    assert.equal(b.utmContent, "video_b");
    assert.equal(adVideoLabel(a.utmContent), "VIDEO A");
    assert.equal(adVideoLabel(b.utmContent), "VIDEO B");
  });

  it("no pisa un video previo si la siguiente URL no trae utm_content", () => {
    const first = parseAdAttribution("utm_content=video_a&utm_campaign=jornada_base");
    const next = parseAdAttribution("utm_source=facebook");
    const merged = mergeAdAttribution(next, first);
    assert.equal(merged.utmContent, "video_a");
    assert.equal(merged.utmSource, "facebook");
  });

  it("fbclid de Facebook se guarda para el Pixel", () => {
    const a = parseAdAttribution("?fbclid=IwAR123&utm_content=video_b");
    assert.equal(a.fbclid, "IwAR123");
    assert.equal(a.utmContent, "video_b");
  });

  it("pega el video en el href del vendedor sin pisar planeta/código", () => {
    const a = parseAdAttribution(VENTAS_JORNADA_VIDEO_A_URL.split("?")[1]);
    const href = withAdAttribution("/vendedor?planeta=JORNADA&codigo=3", a);
    assert.match(href, /planeta=JORNADA/);
    assert.match(href, /codigo=3/);
    assert.match(href, /utm_content=video_a/);
    assert.match(href, /utm_campaign=jornada_base/);
  });
});
