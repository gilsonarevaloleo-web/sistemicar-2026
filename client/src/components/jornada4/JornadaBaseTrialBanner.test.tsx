import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JornadaBaseTrialBanner } from "./JornadaBaseTrialBanner.tsx";

describe("JornadaBaseTrialBanner", () => {
  it("arranca en una línea, sin el gancho desplegado", () => {
    const html = renderToStaticMarkup(
      createElement(JornadaBaseTrialBanner, {
        access: {
          allowed: true,
          kind: "trial",
          daysLeft: 5,
          points: 120,
          pointsRemaining: 380,
        },
      })
    );
    assert.match(html, /jornada-base-trial-banner/);
    assert.match(html, /7 días gratis/i);
    assert.match(html, /jornada-base-trial-progress/);
    assert.equal(html.includes("jornada-base-trial-pagar"), false);
  });
});
