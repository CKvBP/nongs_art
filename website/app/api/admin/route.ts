import { after, NextResponse } from "next/server";
import { deliverAfterResponse, emailReady } from "@/lib/mailer";
import { z } from "zod";
import { requireAdmin, checkOrigin } from "@/lib/auth";
import { adminMutation, StudioError } from "@/lib/domain";
import { readJson, responseError } from "@/lib/http";
import { changeStudio, readStudio } from "@/lib/store";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
function adminView(data: Awaited<ReturnType<typeof readStudio>>) {
  const { loginAttempts: _attempts, ...view } = data;
  return { ...view, emailConfigured: emailReady() };
}
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(adminView(await readStudio()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return responseError(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireAdmin();
    const input = z
      .object({
        action: z.string().max(50),
        payload: z.unknown(),
        revision: z.number().int(),
      })
      .parse(await readJson(request));
    const result = await changeStudio((data) => {
      if (data.revision !== input.revision)
        throw new StudioError(
          "The studio changed in another window. Refresh and try again.",
          409,
        );
      adminMutation(data, input.action, input.payload);
      return adminView({ ...data, revision: data.revision + 1 });
    });
    if (input.action === "retry-email") after(deliverAfterResponse);
    return NextResponse.json(result);
  } catch (error) {
    return responseError(error);
  }
}
