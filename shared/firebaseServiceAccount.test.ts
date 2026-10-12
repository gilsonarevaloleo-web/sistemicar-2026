import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gmailLocalAnagram,
  parseFirebaseServiceAccountJson,
} from "./firebaseServiceAccount.ts";

const VALID = {
  type: "service_account",
  project_id: "sistemicar-app",
  client_email: "firebase-adminsdk@sistemicar-app.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n",
};

describe("FIREBASE_SERVICE_ACCOUNT_JSON — pegado en Netlify", () => {
  it("acepta JSON de una línea", () => {
    const r = parseFirebaseServiceAccountJson(JSON.stringify(VALID));
    assert.equal(r.ok, true);
  });

  it("acepta el JSON envuelto en comillas extra (Netlify)", () => {
    const r = parseFirebaseServiceAccountJson(JSON.stringify(JSON.stringify(VALID)));
    assert.equal(r.ok, true);
  });

  it("acepta private_key con saltos reales", () => {
    const broken = `{
      "type": "service_account",
      "project_id": "sistemicar-app",
      "client_email": "a@b.iam.gserviceaccount.com",
      "private_key": "-----BEGIN PRIVATE KEY-----
ABC
-----END PRIVATE KEY-----
"
    }`;
    const r = parseFirebaseServiceAccountJson(broken);
    assert.equal(r.ok, true);
  });

  it("falla si está vacía", () => {
    assert.equal(parseFirebaseServiceAccountJson("").ok, false);
    assert.equal(parseFirebaseServiceAccountJson("  ").error, "missing");
  });

  it("reconoce Tina vs PinoCarreraTina", () => {
    assert.equal(
      gmailLocalAnagram("tinapinocarrera", "pinocarreratina"),
      true,
    );
    assert.equal(gmailLocalAnagram("tina", "karina"), false);
  });
});
