import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { checkOrigin, requireAdmin } from "@/lib/auth";
import { StudioError } from "@/lib/domain";
import { responseError } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireAdmin();
    if (Number(request.headers.get("content-length") ?? 0) > 4_200_000)
      throw new StudioError("Choose an image smaller than 4 MB.", 413);
    const form = await request.formData();
    const file = form.get("image");
    if (
      !(file instanceof File) ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw new StudioError("Choose a JPG, PNG, or WebP image.");
    if (file.size > 4_000_000)
      throw new StudioError("Choose an image smaller than 4 MB.", 413);
    let buffer: Buffer;
    try {
      buffer = await sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 40_000_000,
      })
        .rotate()
        .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new StudioError(
        "This image could not be opened. Try another JPG or PNG.",
      );
    }
    const filename = randomUUID() + ".webp";
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`artwork/${filename}`, buffer, {
        access: "public",
        contentType: "image/webp",
        addRandomSuffix: false,
      });
      return NextResponse.json({ url: blob.url });
    }
    if (process.env.VERCEL)
      throw new StudioError(
        "Connect Vercel Blob to enable image uploads.",
        503,
      );
    const directory = path.join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), buffer);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    return responseError(error);
  }
}
