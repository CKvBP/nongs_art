import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { StudioError } from "./domain";
export function responseError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(" ")}: ${i.message}`)
          .join(". "),
      },
      { status: 400 },
    );
  if (error instanceof StudioError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: "Please check your form and try again." },
      { status: 400 },
    );
  console.error(
    "Studio request failed:",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    {
      error: "The studio is temporarily unavailable. Please try again shortly.",
    },
    { status: 503 },
  );
}
export async function readJson(request: Request, limit = 40000) {
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    throw new StudioError("This form is too large.", 413);
  const body = await request.text();
  if (body.length > limit)
    throw new StudioError("This form is too large.", 413);
  return JSON.parse(body);
}
