import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkOrigin, setSession, validLogin } from "@/lib/auth";
import { StudioError } from "@/lib/domain";
import { readJson, responseError } from "@/lib/http";
import { changeStudio } from "@/lib/store";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { username, password } = z
      .object({ username: z.string().max(100), password: z.string().max(300) })
      .parse(await readJson(request));
    const key = createHash("sha256")
      .update(
        request.headers.get("x-vercel-forwarded-for") ??
          request.headers.get("x-forwarded-for") ??
          "local",
      )
      .digest("hex");
    const permitted = await changeStudio((data) => {
      const now = Date.now();
      data.loginAttempts = Object.fromEntries(
        Object.entries(data.loginAttempts).filter(([, a]) => a.until > now),
      );
      const attempt = data.loginAttempts[key] ?? {
        count: 0,
        until: now + 15 * 60000,
      };
      if (attempt.count >= 10) return false;
      attempt.count++;
      data.loginAttempts[key] = attempt;
      return true;
    });
    if (!permitted)
      throw new StudioError(
        "Too many sign-in attempts. Please try again in 15 minutes.",
        429,
      );
    if (!validLogin(username, password))
      throw new StudioError("The username or password is incorrect.", 401);
    await setSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return responseError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    (await cookies()).delete("studio_session");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return responseError(error);
  }
}
