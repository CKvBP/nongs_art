import { cronAuthorized, deliverEmails } from "@/lib/mailer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization")))
    return new Response("Unauthorized", { status: 401 });
  try {
    return Response.json(await deliverEmails(true), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("Scheduled email processing failed.");
    return Response.json({ error: "Email processing failed" }, { status: 503 });
  }
}
