import { NextResponse } from "next/server";
import { publicStudio } from "@/lib/domain";
import { responseError } from "@/lib/http";
import { readStudio } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(publicStudio(await readStudio()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return responseError(error);
  }
}
