import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  explainFirebaseAdminError,
  explainFirestoreAccessError,
  firestoreEnableUrl,
  gmailLocalAnagram,
  normalizeServiceAccountPrivateKey,
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
    if (r.ok) {
      assert.ok(String(r.value.private_key).includes("\n"));
      assert.equal(String(r.value.private_key).includes("\\n"), false);
    }
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

  it("convierte \\n literales en saltos reales del PEM", () => {
    const raw = "-----BEGIN PRIVATE KEY-----\\nABCDEFGHIJKLMNOP\\n-----END PRIVATE KEY-----\\n";
    const pem = normalizeServiceAccountPrivateKey(raw);
    assert.equal(pem.includes("\\n"), false);
    assert.ok(pem.startsWith("-----BEGIN PRIVATE KEY-----\n"));
    assert.ok(pem.includes("\nABCDEFGHIJKLMNOP\n"));
  });

  it("falla si está vacía", () => {
    assert.equal(parseFirebaseServiceAccountJson("").ok, false);
    assert.equal(parseFirebaseServiceAccountJson("  ").error, "missing");
  });

  it("traduce el error de OpenSSL a una instrucción", () => {
    const msg = explainFirebaseAdminError(
      null,
      "Failed to parse private key: Error: error:1E08010C:DECODER routines::unsupported",
    );
    assert.match(msg ?? "", /llave de Firebase en Netlify/);
    assert.match(msg ?? "", /9000/);
  });

  it("traduce Firestore apagado a una instrucción, no al error de Google", () => {
    const raw =
      "7 PERMISSION_DENIED: Cloud Firestore API has not been used in project sistemicar-app before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=sistemicar-app then retry.";
    const msg = explainFirestoreAccessError(raw);
    assert.match(msg ?? "", /Firestore está apagado/);
    assert.match(msg ?? "", /9000/);
    assert.match(msg ?? "", /Realtime Database/);
    assert.equal(
      firestoreEnableUrl("sistemicar-app"),
      "https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=sistemicar-app",
    );
    assert.match(explainFirebaseAdminError(null, raw) ?? "", /Firestore está apagado/);
  });

  it("reconoce Tina vs PinoCarreraTina", () => {
    assert.equal(
      gmailLocalAnagram("tinapinocarrera", "pinocarreratina"),
      true,
    );
    assert.equal(gmailLocalAnagram("tina", "karina"), false);
  });
});
