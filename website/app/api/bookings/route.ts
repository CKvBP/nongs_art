import { NextResponse } from "next/server";
import { checkOrigin } from "@/lib/auth";
import { reserveClass } from "@/lib/domain";
import { readJson, responseError } from "@/lib/http";
import { changeStudio } from "@/lib/store";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const raw = await readJson(request);
    return NextResponse.json(
      await changeStudio((data) => reserveClass(data, raw)),
      { status: 201 },
    );
  } catch (error) {
    return responseError(error);
  }
}
