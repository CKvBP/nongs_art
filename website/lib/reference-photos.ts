import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { put, get, del } from "@vercel/blob";
import sharp from "sharp";
import { z } from "zod";
import { StudioError } from "./domain";
import type { ReferencePhoto } from "./model";

export const referenceInputSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(200),
      data: z
        .string()
        .max(1_100_000)
        .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/),
    }),
  )
  .max(3)
  .default([]);
const directory = () =>
  path.join(
    process.env.LOCAL_DATA_DIR ?? path.join(process.cwd(), "data"),
    "references",
  );
const token = () => process.env.REFERENCE_BLOB_READ_WRITE_TOKEN;
export async function prepareReferences(raw: unknown) {
  const inputs = referenceInputSchema.parse(raw);
  return Promise.all(
    inputs.map(async (input) => {
      const bytes = Buffer.from(input.data.split(",")[1], "base64");
      if (bytes.length > 800_000)
        throw new StudioError(
          "Each prepared photo must be smaller than 800 KB.",
          413,
        );
      try {
        const source = sharp(bytes, { limitInputPixels: 40_000_000 });
        const metadata = await source.metadata();
        if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
          throw new Error("Unsupported image");
        const buffer = await source
          .rotate()
          .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 88 })
          .toBuffer();
        return { name: input.name, buffer };
      } catch {
        throw new StudioError(
          "One of your photos could not be opened. Please choose a JPG, PNG, or WebP image.",
        );
      }
    }),
  );
}
export async function saveReference(photo: {
  name: string;
  buffer: Buffer;
}): Promise<ReferencePhoto> {
  const id = randomUUID();
  const key = `references/${id}.webp`;
  if (token()) {
    await put(key, photo.buffer, {
      access: "private",
      token: token(),
      contentType: "image/webp",
      addRandomSuffix: false,
    });
    return { id, key, name: photo.name, storage: "blob" };
  }
  if (process.env.VERCEL)
    throw new StudioError(
      "Photo submissions are temporarily unavailable. Please try again later.",
      503,
    );
  await mkdir(directory(), { recursive: true });
  await writeFile(path.join(directory(), id + ".webp"), photo.buffer, {
    mode: 0o600,
  });
  return { id, key, name: photo.name, storage: "local" };
}
export async function removeReference(photo: ReferencePhoto) {
  if (photo.storage === "blob") await del(photo.key, { token: token() });
  else await unlink(path.join(directory(), photo.id + ".webp"));
}
export async function readReference(photo: ReferencePhoto) {
  if (photo.storage === "blob") {
    if (!token())
      throw new StudioError("Connect the private reference photo store.", 503);
    const result = await get(photo.key, {
      access: "private",
      token: token(),
      useCache: false,
    });
    if (!result || result.statusCode !== 200)
      throw new StudioError("Photo not found.", 404);
    return result.stream;
  }
  return new Uint8Array(
    await readFile(path.join(directory(), photo.id + ".webp")),
  );
}
