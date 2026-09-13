import { createHash } from "node:crypto";
import { after, NextResponse } from "next/server";
import { deliverAfterResponse } from "@/lib/mailer";
import { checkOrigin } from "@/lib/auth";
import { requestArt, StudioError } from "@/lib/domain";
import { readJson, responseError } from "@/lib/http";
import { inquiryInputSchema, type ReferencePhoto } from "@/lib/model";
import {
  prepareReferences,
  referenceInputSchema,
  saveReference,
  removeReference,
} from "@/lib/reference-photos";
import { changeStudio, readStudio } from "@/lib/store";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const saved: ReferencePhoto[] = [];
  let committed = false;
  try {
    checkOrigin(request);
    const raw = await readJson(request, 3_400_000);
    const input = inquiryInputSchema.parse(raw);
    const photos = referenceInputSchema.parse(raw.photos);
    const snapshot = await readStudio();
    const result = requestArt(structuredClone(snapshot), input);
    if (snapshot.inquiries.some((i) => i.id === input.requestId))
      return NextResponse.json(result, { status: 201 });
    if (
      photos.length &&
      !snapshot.offerings.some(
        (o) =>
          o.id === input.offeringId &&
          ["ornament", "scribble"].includes(o.category),
      )
    ) {
      throw new StudioError(
        "Reference photos are available for ornaments and scribbles.",
      );
    }
    if (photos.length) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
      const key = "photos:" + createHash("sha256").update(ip).digest("hex");
      const allowed = await changeStudio((data) => {
        const now = Date.now();
        const entry = data.loginAttempts[key];
        const counter =
          entry && entry.until > now
            ? entry
            : { count: 0, until: now + 3600000 };
        if (counter.count >= 10) return false;
        counter.count++;
        data.loginAttempts[key] = counter;
        return true;
      });
      if (!allowed)
        throw new StudioError(
          "Too many photo submissions. Please try again in an hour.",
          429,
        );
    }
    const prepared = await prepareReferences(photos);
    for (const photo of prepared) saved.push(await saveReference(photo));
    const response = await changeStudio((data) => {
      const exists = data.inquiries.some((i) => i.id === input.requestId);
      const response = requestArt(data, input);
      if (!exists)
        data.inquiries.find((i) => i.id === input.requestId)!.photos = saved;
      return { response, attached: !exists };
    });
    committed = response.attached;
    after(deliverAfterResponse);
    return NextResponse.json(response.response, { status: 201 });
  } catch (error) {
    return responseError(error);
  } finally {
    if (!committed)
      await Promise.all(
        saved.map((p) =>
          removeReference(p).catch(() =>
            console.error("Could not clean up an unattached reference photo."),
          ),
        ),
      );
  }
}
