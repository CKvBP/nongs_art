"use client";
import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
export type PhotoInput = { name: string; data: string };
async function prepare(file: File): Promise<PhotoInput> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Please choose JPG, PNG, or WebP photos. Export HEIC photos as JPG first.",
    );
  if (file.size > 30_000_000)
    throw new Error("Choose photos smaller than 30 MB each.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error(
        "This browser cannot prepare photos. Please try another browser.",
      );
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.8, 0.65, 0.5]) {
      const data = canvas.toDataURL("image/webp", quality);
      if (data.length <= 1_060_000)
        return { name: file.name.slice(0, 200), data };
    }
    throw new Error(
      "This photo is too detailed to send. Please choose a smaller copy.",
    );
  } finally {
    bitmap.close();
  }
}
export function ReferencePhotos({
  photos,
  onChange,
  onBusy,
  disabled,
}: {
  photos: PhotoInput[];
  onChange: (photos: PhotoInput[]) => void;
  onBusy: (busy: boolean) => void;
  disabled: boolean;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  return (
    <fieldset className="reference-upload" disabled={disabled || working}>
      <legend>
        Reference photos <small>(optional)</small>
      </legend>
      <p className="form-hint">
        Show me the pet, person, or home you’d like captured. Clear, well-lit
        photos work best. Add up to 3 JPG, PNG, or WebP images, up to 30 MB
        each.
      </p>
      <label className="reference-picker">
        <ImagePlus size={22} />
        <span>
          {working ? "Preparing your photos…" : "Choose reference photos"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-label="Choose reference photos"
          disabled={disabled || working || photos.length >= 3}
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            setError("");
            if (files.length + photos.length > 3) {
              setError(
                "You can add up to 3 photos. Remove one before adding another.",
              );
              return;
            }
            setWorking(true);
            onBusy(true);
            try {
              onChange([...photos, ...(await Promise.all(files.map(prepare)))]);
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "This photo could not be opened.",
              );
            } finally {
              setWorking(false);
              onBusy(false);
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="reference-grid">
        {photos.map((photo, index) => (
          <figure key={index}>
            <img
              src={photo.data}
              alt={`Reference photo ${index + 1}: ${photo.name}`}
            />
            <figcaption>{photo.name}</figcaption>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove photo ${index + 1}`}
              onClick={() => onChange(photos.filter((_, i) => i !== index))}
            >
              <X size={16} />
            </button>
          </figure>
        ))}
      </div>
      <p className="form-hint">
        Photos are shared privately with Nong for your request and won’t appear
        in the public gallery. They’re sent when you submit this form.
      </p>
    </fieldset>
  );
}
