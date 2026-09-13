import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareImage, uploadResult } from "../lib/browser-images";

test("HTML gateway errors produce actionable messages instead of JSON syntax errors", async () => {
  await assert.rejects(
    uploadResult(new Response("Request too large", { status: 413 })),
    /too large/,
  );
  await assert.rejects(
    uploadResult(new Response("<html>Bad gateway</html>", { status: 502 })),
    /could not finish/,
  );
  assert.equal(
    await uploadResult(Response.json({ url: "/uploads/test.webp" })),
    "/uploads/test.webp",
  );
});

test("unsupported WebP encoding falls back to bounded JPEG and releases bitmap", async () => {
  let closed = false;
  const encodings: string[] = [];
  const ctx = {
    drawImage() {},
    fillRect() {},
    fillStyle: "",
    globalCompositeOperation: "",
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toBlob(callback: (b: Blob) => void, type: string) {
      encodings.push(type);
      callback(
        new Blob(
          [new Uint8Array(type === "image/webp" ? 4_500_000 : 500_000)],
          { type: type === "image/webp" ? "image/png" : "image/jpeg" },
        ),
      );
    },
  };
  const previous = ["document", "createImageBitmap", "HTMLImageElement"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  try {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { createElement: () => canvas },
    });
    Object.defineProperty(globalThis, "HTMLImageElement", {
      configurable: true,
      value: class {},
    });
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: async () => ({
        width: 4000,
        height: 3000,
        close() {
          closed = true;
        },
      }),
    });
    const blob = await prepareImage(
      new File(["photo"], "photo.jpg", { type: "image/jpeg" }),
      790_000,
    );
    assert.equal(blob.type, "image/jpeg");
    assert.ok(blob.size <= 790_000);
    assert.deepEqual(encodings, ["image/webp", "image/jpeg"]);
    assert.equal(closed, true);
    assert.equal(canvas.width, 0);
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
