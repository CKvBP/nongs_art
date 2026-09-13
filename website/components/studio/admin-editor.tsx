"use client";
import { useState } from "react";
import { Plus, Trash2, Upload, LoaderCircle, Check } from "lucide-react";
import type { StudioData, StudioEvent } from "@/lib/model";
import { studioNow } from "@/lib/model";
import { FormMessage, Modal, SubmitButton } from "./shared";

export type AdminData = Omit<StudioData, "loginAttempts">;
export type EditorKind = "program" | "event" | "artwork" | "offering" | "block";
export type EditorValue = {
  id?: string;
  title?: string;
  description?: string;
  image?: string;
  category?: string;
  price?: number;
  capacity?: number;
  durationNote?: string;
  published?: boolean;
  programId?: string;
  sessions?: StudioEvent["sessions"];
  featured?: boolean;
  hero?: "none" | "main" | "accent";
  startingPrice?: number;
  date?: string;
  reason?: string;
};
export type EditorState = { kind: EditorKind; item?: EditorValue };
export function ImageChooser({
  value,
  onChange,
  data,
  onBusy,
}: {
  value: string;
  onChange: (url: string) => void;
  data: AdminData;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const images = [
    ...new Map(
      [
        ...data.artworks.map((a) => ({ image: a.image, title: a.title })),
        ...data.programs.map((p) => ({ image: p.image, title: p.title })),
        ...data.offerings.map((o) => ({ image: o.image, title: o.title })),
      ].map((i) => [i.image, i]),
    ).values(),
  ];
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Choose a JPG, PNG, or WebP image.");
      if (file.size > 30_000_000)
        throw new Error("Choose an image smaller than 30 MB.");
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error("Could not prepare this image.")),
          "image/webp",
          0.85,
        ),
      );
      const form = new FormData();
      form.append("image", blob, "artwork.webp");
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onChange(result.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <fieldset className="image-chooser">
      <legend>Artwork image</legend>
      <div className="image-upload-row">
        {value && <img src={value} alt="Selected artwork" />}
        <label className="upload-target">
          {busy ? (
            <LoaderCircle className="spin" size={24} />
          ) : (
            <Upload size={24} />
          )}
          <strong>
            {busy ? "Preparing your artwork…" : "Upload a new image"}
          </strong>
          <span>JPG, PNG, or WebP · automatically resized</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <FormMessage error={error} />
      <p className="form-hint">Or choose a piece already in the studio.</p>
      <div className="image-options">
        {images.map((img) => (
          <button
            key={img.image}
            type="button"
            aria-label={`Use ${img.title}`}
            aria-pressed={value === img.image}
            className={value === img.image ? "selected" : ""}
            onClick={() => onChange(img.image)}
          >
            <img src={img.image} alt={img.title} />
            {value === img.image && (
              <span>
                <Check size={12} />
              </span>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
const labels = {
  program: "program",
  event: "class",
  artwork: "artwork",
  offering: "custom offering",
  block: "day block",
};
export function ItemEditor({
  editor,
  data,
  save,
  onClose,
  error,
}: {
  editor: EditorState;
  data: AdminData;
  error: string;
  save: (action: string, payload: unknown) => Promise<boolean>;
  onClose: () => void;
}) {
  const { kind, item = {} } = editor;
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState(
    item.image ?? data.artworks[0]?.image ?? "/art/floral.webp",
  );
  const firstProgram =
    data.programs.find((p) => p.id === item.programId) ?? data.programs[0];
  const [programId, setProgramId] = useState(
    item.programId ?? firstProgram?.id ?? "",
  );
  const [title, setTitle] = useState(
    item.title ?? (kind === "event" ? (firstProgram?.title ?? "") : ""),
  );
  const [price, setPrice] = useState(item.price ?? firstProgram?.price ?? 0);
  const [capacity, setCapacity] = useState(
    item.capacity ?? firstProgram?.capacity ?? 8,
  );
  const [sessions, setSessions] = useState(
    item.sessions ?? [
      {
        date: item.date ?? studioNow().slice(0, 10),
        start: "15:00",
        end: "17:00",
      },
    ],
  );
  const [formError, setFormError] = useState("");
  function chooseProgram(value: string) {
    setProgramId(value);
    const program = data.programs.find((p) => p.id === value);
    if (program) {
      setTitle(program.title);
      setPrice(program.price);
      setCapacity(program.capacity);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    const base = { id: item.id ?? crypto.randomUUID() };
    let payload: unknown;
    if (kind === "program")
      payload = {
        ...base,
        title: value("title"),
        category: value("category"),
        description: value("description"),
        image,
        price: Number(value("price")),
        capacity: Number(value("capacity")),
        durationNote: value("durationNote"),
        published: form.has("published"),
      };
    if (kind === "event")
      payload = {
        ...base,
        title,
        programId,
        price,
        capacity,
        sessions: sessions.map((s, i) => ({
          date: value(`session-date-${i}`),
          start: value(`session-start-${i}`),
          end: value(`session-end-${i}`),
        })),
        published: form.has("published"),
      };
    if (kind === "artwork")
      payload = {
        ...base,
        title: value("title"),
        category: value("category"),
        description: value("description"),
        image,
        featured: form.has("featured"),
        hero: value("hero"),
        published: form.has("published"),
      };
    if (kind === "offering")
      payload = {
        ...base,
        title: value("title"),
        category: value("category"),
        description: value("description"),
        image,
        startingPrice: Number(value("startingPrice")),
        published: form.has("published"),
      };
    if (kind === "block")
      payload = { ...base, date: value("date"), reason: value("reason") };
    try {
      if (await save(kind, payload)) onClose();
      else
        setFormError(
          "Your changes haven’t been saved. Review the message above and try again.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${item.id ? "Edit" : "Add"} ${labels[kind]}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="studio-form editor-form">
        {kind === "event" ? (
          <>
            <p className="form-hint">
              A class is one bookable event. Add both sessions to sell a
              children’s week as one registration.
            </p>
            <label>
              Program
              <select
                value={programId}
                onChange={(e) => chooseProgram(e.target.value)}
                required
              >
                <option value="" disabled>
                  Choose a program
                </option>
                {data.programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Class title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={300}
              />
            </label>
            <div className="form-row">
              <label>
                Price per person ($)
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </label>
              <label>
                Total places
                <input
                  type="number"
                  min="1"
                  max="200"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </label>
            </div>
            <fieldset className="session-editor">
              <legend>
                Sessions <small>Eastern Time · Aiken</small>
              </legend>
              {sessions.map((s, i) => (
                <div className="session-editor-row" key={i}>
                  <label>
                    Date
                    <input
                      type="date"
                      name={`session-date-${i}`}
                      value={s.date}
                      required
                      onInput={(e) =>
                        setSessions(
                          sessions.map((v, n) =>
                            n === i ? { ...v, date: e.currentTarget.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Start
                    <input
                      type="time"
                      name={`session-start-${i}`}
                      value={s.start}
                      required
                      onInput={(e) =>
                        setSessions(
                          sessions.map((v, n) =>
                            n === i
                              ? { ...v, start: e.currentTarget.value }
                              : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    End
                    <input
                      type="time"
                      name={`session-end-${i}`}
                      value={s.end}
                      required
                      onInput={(e) =>
                        setSessions(
                          sessions.map((v, n) =>
                            n === i ? { ...v, end: e.currentTarget.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove session ${i + 1}`}
                    disabled={sessions.length <= 1}
                    onClick={() =>
                      setSessions(sessions.filter((_, n) => n !== i))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-link"
                disabled={sessions.length >= 14}
                onClick={() =>
                  setSessions([...sessions, { ...sessions.at(-1)! }])
                }
              >
                <Plus size={16} />
                Add another session
              </button>
            </fieldset>
            {item.id && (
              <p className="form-hint">
                Existing registrations include every session. Review the roster
                before changing dates; customers are not emailed automatically.
              </p>
            )}
          </>
        ) : kind === "block" ? (
          <>
            <p className="form-hint">
              Keep a full day free for personal plans or an appointment. New
              classes and wedding requests cannot use a blocked day.
            </p>
            <label>
              Date
              <input
                type="date"
                name="date"
                defaultValue={item.date ?? studioNow().slice(0, 10)}
                required
              />
            </label>
            <label>
              Private calendar note
              <input
                name="reason"
                defaultValue={item.reason ?? ""}
                placeholder="Away from the studio"
                required
                maxLength={300}
              />
            </label>
          </>
        ) : (
          <>
            <label>
              {kind === "artwork" ? "Artwork title" : "Title"}
              <input
                name="title"
                defaultValue={item.title ?? ""}
                required
                maxLength={300}
              />
            </label>
            <label>
              Category
              <select
                name="category"
                defaultValue={
                  item.category ??
                  (kind === "program"
                    ? "children"
                    : kind === "artwork"
                      ? "Paintings"
                      : "ornament")
                }
              >
                {(kind === "program"
                  ? [
                      ["children", "Children’s classes"],
                      ["adult", "Adult paint nights"],
                      ["workshop", "Workshops"],
                    ]
                  : kind === "artwork"
                    ? [
                        "Paintings",
                        "Scribbles",
                        "Ornaments",
                        "Little artists",
                      ].map((v) => [v, v])
                    : [
                        ["ornament", "Custom ornaments"],
                        ["wedding", "Wedding painting"],
                        ["scribble", "Scribbles & sketches"],
                        ["acrylic", "Acrylic painting"],
                      ]
                ).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={item.description ?? ""}
                rows={4}
                required={kind !== "artwork"}
                maxLength={3000}
              />
            </label>
            {kind === "program" && (
              <>
                <label>
                  Short format description
                  <input
                    name="durationNote"
                    defaultValue={item.durationNote ?? ""}
                    placeholder="Two sessions · one creative week"
                    required
                    maxLength={300}
                  />
                </label>
                <div className="form-row">
                  <label>
                    Default price ($)
                    <input
                      name="price"
                      type="number"
                      min="0"
                      max="100000"
                      step="0.01"
                      defaultValue={item.price ?? 0}
                      required
                    />
                  </label>
                  <label>
                    Default places
                    <input
                      name="capacity"
                      type="number"
                      min="1"
                      max="200"
                      defaultValue={item.capacity ?? 8}
                      required
                    />
                  </label>
                </div>
                <p className="form-hint">
                  These defaults fill in new classes. Each scheduled class keeps
                  its own price and capacity.
                </p>
              </>
            )}
            {kind === "offering" && (
              <label>
                Starting price ($)
                <input
                  name="startingPrice"
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  defaultValue={item.startingPrice ?? 0}
                  required
                />
                <small>Use 0 to show “price by request.”</small>
              </label>
            )}
            <ImageChooser
              data={data}
              value={image}
              onChange={setImage}
              onBusy={setUploading}
            />
          </>
        )}
        {kind !== "block" && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="published"
              defaultChecked={item.published ?? true}
            />
            <span>Visible on the website</span>
          </label>
        )}
        {kind === "artwork" && (
          <label>
            Hero image
            <select name="hero" defaultValue={item.hero ?? "none"}>
              <option value="none">Not a hero image</option>
              <option value="main">Hero · large image</option>
              <option value="accent">Hero · small overlapping image</option>
            </select>
            <small>
              Choose where this artwork appears at the top of the homepage.
              Saving replaces the previous image in that position. Keep it
              visible on the website to display it. An unassigned position uses
              the original studio image.
            </small>
          </label>
        )}
        {kind === "artwork" && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={item.featured ?? false}
            />
            <span>
              Feature on the homepage{" "}
              <small>The first four featured pieces are shown.</small>
            </span>
          </label>
        )}
        <FormMessage error={error || formError} />
        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <SubmitButton busy={busy || uploading}>
            Save {labels[kind]} <Check size={16} />
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
