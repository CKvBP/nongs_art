"use client";
import { useState } from "react";
import { prepareImage } from "@/lib/browser-images";
import { ImagePlus, X } from "lucide-react";
export type PhotoInput = { name: string; data: string };
async function prepare(file: File): Promise<PhotoInput> {
  const blob = await prepareImage(file, 790_000);
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error("This photo could not be read. Please try again."));
    reader.readAsDataURL(blob);
  });
  return { name: file.name.slice(0, 200), data };
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
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
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
              const prepared: PhotoInput[] = [];
              for (const file of files) prepared.push(await prepare(file));
              onChange([...photos, ...prepared]);
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
