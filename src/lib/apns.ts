import "server-only";
import http2 from "node:http2";
import { createPrivateKey, sign } from "node:crypto";

// Tikri iOS programėlės pranešimai per Apple (APNs). Reikia Apple rakto (.p8):
// APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY (rakto tekstas), APNS_BUNDLE_ID (lt.ridu.app).
// TestFlight ir App Store versijos naudoja produkcinį APNs serverį.
const HOST = process.env.APNS_HOST ?? "https://api.push.apple.com";
let jwt: { token: string; at: number } | null = null;

export const apnsReady = () => Boolean(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_KEY);

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

function token(): string {
  const now = Math.floor(Date.now() / 1000);
  if (jwt && now - jwt.at < 50 * 60) return jwt.token; // Apple leidžia iki 60 min.
  const header = b64url(JSON.stringify({ alg: "ES256", kid: process.env.APNS_KEY_ID }));
  const claims = b64url(JSON.stringify({ iss: process.env.APNS_TEAM_ID, iat: now }));
  const key = createPrivateKey((process.env.APNS_KEY ?? "").replace(/\\n/g, "\n"));
  const sig = sign("sha256", Buffer.from(`${header}.${claims}`), { key, dsaEncoding: "ieee-p1363" });
  jwt = { token: `${header}.${claims}.${b64url(sig)}`, at: now };
  return jwt.token;
}

export type ApnsResult = "ok" | "gone" | "error";

// Siunčia vieną pranešimą. "gone" reiškia, kad programėlė ištrinta ar raktas nebegalioja.
export async function sendApns(deviceToken: string, title: string, body: string, url: string): Promise<ApnsResult> {
  if (!apnsReady()) return "error";
  const payload = JSON.stringify({ aps: { alert: { title, body }, sound: "default" }, url });
  return new Promise((resolve) => {
    const client = http2.connect(HOST);
    client.on("error", () => resolve("error"));
    const req = client.request({
      ":method": "POST", ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${token()}`, "apns-topic": process.env.APNS_BUNDLE_ID ?? "lt.ridu.app",
      "apns-push-type": "alert", "apns-priority": "10", "content-type": "application/json",
    });
    let status = 0;
    req.on("response", (h) => { status = Number(h[":status"]); });
    req.on("data", () => {});
    req.on("end", () => { client.close(); resolve(status === 200 ? "ok" : status === 410 ? "gone" : "error"); });
    req.on("error", () => { client.close(); resolve("error"); });
    req.setTimeout(10000, () => { req.close(); client.close(); resolve("error"); });
    req.end(payload);
  });
}
