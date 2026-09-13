import { after, NextResponse } from "next/server";
import { deliverAfterResponse } from "@/lib/mailer";
import { checkOrigin } from "@/lib/auth";
import { reserveClass } from "@/lib/domain";
import { readJson, responseError } from "@/lib/http";
import { changeStudio } from "@/lib/store";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const raw = await readJson(request);
    const result = await changeStudio((data) => reserveClass(data, raw));
    after(deliverAfterResponse);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return responseError(error);
  }
}
