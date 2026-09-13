import { requireAdmin } from "@/lib/auth";
import { StudioError } from "@/lib/domain";
import { responseError } from "@/lib/http";
import { readReference } from "@/lib/reference-photos";
import { readStudio } from "@/lib/store";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const data = await readStudio();
    const photo = data.inquiries
      .flatMap((i) => i.photos ?? [])
      .find((p) => p.id === id);
    if (!photo) throw new StudioError("Photo not found.", 404);
    return new Response(await readReference(photo), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="reference-${photo.id}.webp"`,
      },
    });
  } catch (error) {
    return responseError(error);
  }
}
