"use client";
import { useState } from "react";
import { defaultHomepage, type Homepage } from "@/lib/model";
import { ImageChooser, type AdminData } from "./admin-editor";
import { SubmitButton } from "./shared";

export function HomepageEditor({
  data,
  save,
}: {
  data: AdminData;
  save: (action: string, payload: unknown) => Promise<boolean>;
}) {
  const [value, setValue] = useState<Homepage>(() =>
    structuredClone(data.homepage ?? defaultHomepage),
  );
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState<Record<number, boolean>>({});
  const uploading = Object.values(uploads).some(Boolean);
  function cardField(
    index: number,
    key: keyof Homepage["cards"][number],
    text: string,
  ) {
    setValue((old) => ({
      ...old,
      cards: old.cards.map((card, i) =>
        i === index ? { ...card, [key]: text } : card,
      ),
    }));
  }
  return (
    <form
      className="studio-form settings-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || uploading) return;
        setBusy(true);
        try {
          await save("homepage", value);
        } finally {
          setBusy(false);
        }
      }}
    >
      <section className="admin-panel settings-panel">
        <h2>Find your kind of creative</h2>
        <p className="form-hint">
          Edit the heading and three cards below the homepage hero. Saving
          updates the live homepage. Hero images are managed in Gallery.
        </p>
        {(
          [
            ["eyebrow", "Small heading"],
            ["heading", "Section heading"],
            ["subtitle", "Handwritten subtitle"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              value={value[key]}
              onChange={(e) => setValue({ ...value, [key]: e.target.value })}
              required
              maxLength={300}
            />
          </label>
        ))}
      </section>
      {value.cards.map((card, index) => (
        <section className="admin-panel settings-panel" key={index}>
          <h2>Card {index + 1}</h2>
          <ImageChooser
            value={card.image}
            onChange={(url) => cardField(index, "image", url)}
            data={data}
            onBusy={(status) =>
              setUploads((old) => ({ ...old, [index]: status }))
            }
          />
          {(
            [
              ["tag", "Image label"],
              ["title", "Title"],
              ["cta", "Button text"],
              ["link", "Destination link"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={card[key]}
                onChange={(e) => cardField(index, key, e.target.value)}
                required
                maxLength={key === "link" ? 2000 : 300}
              />
              {key === "link" && (
                <small>
                  Use /classes, /classes?type=children, /classes?type=adult,
                  /commissions, or another site path or HTTPS link.
                </small>
              )}
            </label>
          ))}
          <label>
            Description
            <textarea
              value={card.text}
              onChange={(e) => cardField(index, "text", e.target.value)}
              required
              maxLength={1000}
              rows={3}
            />
          </label>
        </section>
      ))}
      <div className="dialog-actions">
        <SubmitButton busy={busy || uploading}>Save homepage</SubmitButton>
      </div>
    </form>
  );
}
