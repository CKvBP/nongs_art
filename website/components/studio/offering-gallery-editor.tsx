"use client";
import { useState } from "react";
import { ImageChooser, type AdminData } from "./admin-editor";
type Sample = { image: string; caption: string };
export function OfferingGalleryEditor({
  samples,
  onChange,
  data,
  onBusy,
}: {
  samples: Sample[];
  onChange: (samples: Sample[]) => void;
  data: AdminData;
  onBusy: (busy: boolean) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  function move(index: number, direction: number) {
    const next = [...samples];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    onChange(next);
  }
  return (
    <fieldset className="offering-sample-editor">
      <legend>Sample gallery</legend>
      <p className="form-hint">
        Add up to 12 examples for this offering. They appear below its main
        image. Changes are applied when you save the offering.
      </p>
      <div className="offering-sample-grid">
        {samples.map((sample, index) => (
          <div key={index}>
            <img
              src={sample.image}
              alt={sample.caption || `Sample ${index + 1}`}
            />
            <label>
              Caption for sample {index + 1}
              <input
                value={sample.caption}
                maxLength={300}
                onChange={(event) =>
                  onChange(
                    samples.map((v, i) =>
                      i === index ? { ...v, caption: event.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <div className="sample-actions">
              <button
                type="button"
                className="text-link"
                disabled={busy}
                onClick={() => setEditing(index)}
              >
                Change image
              </button>
              <button
                type="button"
                className="text-link"
                disabled={busy || editing !== null || index === 0}
                aria-label={`Move sample ${index + 1} earlier`}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="text-link"
                disabled={
                  busy || editing !== null || index === samples.length - 1
                }
                aria-label={`Move sample ${index + 1} later`}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="text-link danger-text"
                disabled={busy}
                onClick={() => {
                  onChange(samples.filter((_, i) => i !== index));
                  setEditing(null);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      {editing === null ? (
        <button
          type="button"
          className="button small"
          disabled={samples.length >= 12}
          onClick={() => setEditing(-1)}
        >
          Add sample image
        </button>
      ) : (
        <div>
          <h3>{editing === -1 ? "Add a sample" : "Change sample image"}</h3>
          <ImageChooser
            key={editing}
            value={editing === -1 ? "" : samples[editing].image}
            data={data}
            onBusy={(value) => {
              setBusy(value);
              onBusy(value);
            }}
            onChange={(image) => {
              onChange(
                editing === -1
                  ? [...samples, { image, caption: "" }]
                  : samples.map((v, i) =>
                      i === editing ? { ...v, image } : v,
                    ),
              );
              setEditing(null);
            }}
          />
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => setEditing(null)}
          >
            Cancel image selection
          </button>
        </div>
      )}
    </fieldset>
  );
}
