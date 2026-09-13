import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { StudioError } from "./domain";

export const localPreview = () =>
  process.env.NODE_ENV === "development" &&
  !process.env.VERCEL &&
  process.env.LOCAL_ADMIN_PREVIEW === "true";
const configured = () =>
  Boolean(
    process.env.ADMIN_USERNAME &&
    process.env.ADMIN_PASSWORD &&
    process.env.SESSION_SECRET &&
    process.env.SESSION_SECRET.length >= 32,
  );
function signature(value: string) {
  return createHmac("sha256", process.env.SESSION_SECRET!)
    .update(value)
    .digest("base64url");
}
function same(a: string, b: string) {
  const aa = createHash("sha256").update(a).digest();
  const bb = createHash("sha256").update(b).digest();
  return timingSafeEqual(aa, bb);
}
export function validLogin(username: string, password: string) {
  return (
    configured() &&
    same(username, process.env.ADMIN_USERNAME!) &&
    same(password, process.env.ADMIN_PASSWORD!)
  );
}
export async function isAdmin() {
  if (localPreview()) return true;
  if (!configured()) return false;
  const value = (await cookies()).get("studio_session")?.value;
  if (!value) return false;
  const [payload, sig] = value.split(".");
  if (!payload || !sig || !same(signature(payload), sig)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    return (
      session.expires > Date.now() &&
      session.user === process.env.ADMIN_USERNAME
    );
  } catch {
    return false;
  }
}
export async function requireAdmin() {
  if (!(await isAdmin()))
    throw new StudioError("Please sign in to the studio.", 401);
}
export async function setSession() {
  if (!configured())
    throw new StudioError("Admin sign-in needs to be configured.", 503);
  const payload = Buffer.from(
    JSON.stringify({
      user: process.env.ADMIN_USERNAME,
      expires: Date.now() + 8 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  (await cookies()).set("studio_session", `${payload}.${signature(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expectedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ??
    request.headers.get("host") ??
    new URL(request.url).host;
  let originHost = "";
  try {
    const parsed = new URL(origin ?? "");
    if (["http:", "https:"].includes(parsed.protocol)) originHost = parsed.host;
  } catch {
    /* Invalid origins fail closed. */
  }
  if (!originHost || originHost !== expectedHost)
    throw new StudioError(
      "Please submit this form from the studio website.",
      403,
    );
}
