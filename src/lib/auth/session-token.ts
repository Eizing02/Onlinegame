import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { jwtVerify, SignJWT } from "jose";
import { getDataDirectory } from "@/lib/data/paths";
import { getDataBackend } from "@/lib/data/backend";
import type { SheetAccount } from "@/types/auth";

export const SESSION_DURATION = 60 * 60 * 8;
let secretPromise: Promise<Uint8Array> | undefined;
async function readSecret() {
  const configured = process.env.AUTH_SESSION_SECRET;
  if (configured) {
    if (Buffer.byteLength(configured) < 32) throw new Error("AUTH_SECRET_TOO_SHORT");
    return new TextEncoder().encode(configured);
  }
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET_MISSING");
  const file = path.join(getDataDirectory(), ".auth-secret");
  await mkdir(getDataDirectory(), { recursive: true });
  try { await writeFile(file, randomBytes(48).toString("hex"), { flag: "wx", mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  return new TextEncoder().encode(await readFile(file, "utf8"));
}
function getSecret() { return secretPromise ??= readSecret().catch(error => { secretPromise = undefined; throw error; }); }
async function accountVersion(account: SheetAccount) {
  return createHmac("sha256", await getSecret()).update(JSON.stringify([account.userCode, account.role, account.password])).digest("base64url");
}
export async function createSessionToken(account: SheetAccount) {
  const sessionId = randomUUID();
  const token = await new SignJWT({ version: await accountVersion(account), backend: getDataBackend() })
    .setProtectedHeader({ alg: "HS256" }).setSubject(account.userCode).setJti(sessionId)
    .setIssuer("kruei-quiz").setAudience("classroom").setIssuedAt().setExpirationTime(`${SESSION_DURATION}s`).sign(await getSecret());
  return { token, sessionId };
}
export async function verifySessionToken(token: string) {
  const secret = await getSecret();
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"], issuer: "kruei-quiz", audience: "classroom" });
    if (!payload.sub || !payload.jti || typeof payload.version !== "string" || payload.backend !== getDataBackend()) return null;
    return { userCode: payload.sub, sessionId: payload.jti, version: payload.version };
  } catch { return null; }
}
export async function matchesAccountVersion(account: SheetAccount, version: string) {
  return await accountVersion(account) === version;
}
