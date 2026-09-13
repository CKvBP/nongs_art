/** Prepare bounded uploads even when a browser cannot encode WebP. */
export async function prepareImage(
  file: File,
  maxBytes: number,
): Promise<Blob> {
  if (
    !/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) &&
    !(file.type === "" && /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))
  )
    throw new Error("Choose a JPG, PNG, WebP, or iPhone photo.");
  if (file.size > 30_000_000)
    throw new Error("Choose an image smaller than 30 MB.");
  let source: ImageBitmap | HTMLImageElement;
  let cleanup = () => {};
  try {
    try {
      source = await createImageBitmap(file);
      const bitmap = source;
      cleanup = () => bitmap.close();
    } catch {
      const url = URL.createObjectURL(file);
      cleanup = () => URL.revokeObjectURL(url);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(
            new Error(
              "This photo could not be opened. Try a JPG copy or a screenshot.",
            ),
          );
        img.src = url;
      });
      source = img;
    }
    const width =
      source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const height =
      source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (!width || !height)
      throw new Error("This photo could not be opened. Try another image.");
    const canvas = document.createElement("canvas");
    try {
      for (const edge of [1800, 1400, 1000, 700]) {
        const scale = Math.min(1, edge / Math.max(width, height));
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx)
          throw new Error(
            "Your browser could not prepare this photo. Please reload and try again.",
          );
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        const webp = await encode(canvas, "image/webp", 0.85);
        if (webp && webp.size > 0 && webp.size <= maxBytes) return webp;
        // JPEG is widely supported; fill transparency before converting.
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
        for (const quality of [0.85, 0.7, 0.5]) {
          const jpeg = await encode(canvas, "image/jpeg", quality);
          if (jpeg && jpeg.size > 0 && jpeg.size <= maxBytes) return jpeg;
        }
      }
      throw new Error(
        "This photo is too large to send. Please choose a smaller copy.",
      );
    } finally {
      canvas.width = canvas.height = 0;
    }
  } finally {
    cleanup();
  }
}
function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, type, quality);
    } catch {
      resolve(null);
    }
  });
}
export async function uploadResult(response: Response): Promise<string> {
  const result = await response.json().catch(() => null);
  if (!response.ok || typeof result?.url !== "string") {
    if (response.status === 413)
      throw new Error(
        "The image is too large to upload. Please choose a smaller copy.",
      );
    if (response.status === 401 || response.redirected)
      throw new Error(
        "Your session expired. Sign in again, then retry the upload.",
      );
    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : "The upload could not finish. Please reload and try again.",
    );
  }
  return result.url;
}
