import { after, NextResponse } from "next/server";
import { deliverAfterResponse, emailReady } from "@/lib/mailer";
import { z } from "zod";
import { requireAdmin, checkOrigin } from "@/lib/auth";
import { applyAdminEdit, StudioError } from "@/lib/domain";
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
        adminRevision: z.number().int().nonnegative().optional(),
      })
      .parse(await readJson(request));
    const result = await changeStudio((data) => {
      // Older tabs retain their existing whole-store conflict protection.
      if (input.adminRevision === undefined && data.revision !== input.revision)
        throw new StudioError(
          "The studio changed. Refresh the page to load the latest editor.",
          409,
        );
      applyAdminEdit(
        data,
        input.action,
        input.payload,
        input.adminRevision ?? data.adminRevision ?? 0,
      );
      return adminView({ ...data, revision: data.revision + 1 });
    });
    if (input.action === "retry-email") after(deliverAfterResponse);
    return NextResponse.json(result);
  } catch (error) {
    return responseError(error);
  }
}
