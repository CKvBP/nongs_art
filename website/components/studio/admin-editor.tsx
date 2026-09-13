"use client";
import { useState } from "react";
import { OfferingGalleryEditor } from "./offering-gallery-editor";
import { prepareImage, uploadResult } from "@/lib/browser-images";
import { Plus, Trash2, Upload, LoaderCircle, Check } from "lucide-react";
import type { StudioData, StudioEvent } from "@/lib/model";
import { studioNow } from "@/lib/model";
import { FormMessage, Modal, SubmitButton } from "./shared";

export type AdminData = Omit<StudioData, "loginAttempts"> & {
  emailConfigured?: boolean;
};
export type EditorKind = "program" | "event" | "artwork" | "offering" | "block";
export type EditorValue = {
  samples?: { image: string; caption: string }[];
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
export type EditorState = {
  kind: EditorKind;
  item?: EditorValue;
  scheduleAfterSave?: EditorValue;
};
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
      const blob = await prepareImage(file, 3_500_000);
      const form = new FormData();
      form.append(
        "image",
        blob,
        `artwork.${blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg"}`,
      );
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: form,
      });
      onChange(await uploadResult(response));
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
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
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
  onCreateProgram,
  onProgramCreated,
  error,
}: {
  editor: EditorState;
  data: AdminData;
  error: string;
  save: (action: string, payload: unknown) => Promise<boolean>;
  onClose: () => void;
  onCreateProgram: (draft: EditorValue) => void;
  onProgramCreated: (programId: string) => void;
}) {
  const { kind, item = {} } = editor;
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sampleUploading, setSampleUploading] = useState(false);
  const [samples, setSamples] = useState(item.samples ?? []);
  const [image, setImage] = useState(
    item.image ??
      (kind === "event"
        ? (
            data.programs.find((p) => p.id === item.programId) ??
            data.programs[0]
          )?.image
        : undefined) ??
      data.artworks[0]?.image ??
      "/art/floral.webp",
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
  const [description, setDescription] = useState(
    item.description ?? firstProgram?.description ?? "",
  );
  const [formError, setFormError] = useState("");
  function chooseProgram(value: string) {
    setProgramId(value);
    const program = data.programs.find((p) => p.id === value);
    if (program) {
      setTitle(program.title);
      setImage(program.image);
      setDescription(program.description);
      setPrice(program.price);
      setCapacity(program.capacity);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || uploading || sampleUploading) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const publishClass =
      submitter instanceof HTMLButtonElement && submitter.value === "publish";
    if (
      kind === "event" &&
      publishClass &&
      !data.programs.find((p) => p.id === programId)?.published
    ) {
      setFormError(
        "Publish this class’s program in Programs & defaults first, then publish the class.",
      );
      return;
    }
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
        image,
        description,
        price,
        capacity,
        sessions: sessions.map((s, i) => ({
          date: value(`session-date-${i}`),
          start: value(`session-start-${i}`),
          end: value(`session-end-${i}`),
        })),
        published: publishClass,
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
        samples,
        startingPrice: Number(value("startingPrice")),
        published: form.has("published"),
      };
    if (kind === "block")
      payload = { ...base, date: value("date"), reason: value("reason") };
    try {
      if (await save(kind, payload)) {
        if (kind === "program" && editor.scheduleAfterSave)
          onProgramCreated(base.id);
        else onClose();
      } else
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
            <button
              type="button"
              className="text-link"
              disabled={busy || uploading || sampleUploading}
              onClick={() =>
                onCreateProgram({
                  ...item,
                  title,
                  image,
                  description,
                  price,
                  capacity,
                  sessions,
                })
              }
            >
              Create a new program
            </button>
            <ImageChooser
              value={image}
              onChange={setImage}
              data={data}
              onBusy={setUploading}
            />
            <label>
              About this week’s painting
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={3000}
                rows={4}
              />
            </label>
            <label>
              Painting / class title
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
                        ["art-class", "Art Classes"],
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
        {kind === "offering" && (
          <OfferingGalleryEditor
            samples={samples}
            onChange={setSamples}
            data={data}
            onBusy={setSampleUploading}
          />
        )}
        {kind !== "block" && kind !== "event" && (
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
        {kind === "event" && (
          <p className="form-hint">
            Save draft keeps this class off the website. Publish makes it
            visible to customers.
            {item.published
              ? " Saving this published class as a draft will hide it; existing registrations are kept."
              : ""}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          {kind === "event" ? (
            <>
              <button
                className="button"
                type="submit"
                name="intent"
                value="draft"
                disabled={busy || uploading || sampleUploading}
              >
                Save draft
              </button>
              <button
                className="button dark"
                type="submit"
                name="intent"
                value="publish"
                disabled={busy || uploading || sampleUploading}
              >
                {busy
                  ? "Saving…"
                  : item.published
                    ? "Publish changes"
                    : "Publish"}{" "}
                <Check size={16} />
              </button>
            </>
          ) : (
            <SubmitButton busy={busy || uploading || sampleUploading}>
              Save {labels[kind]} <Check size={16} />
            </SubmitButton>
          )}
        </div>
      </form>
    </Modal>
  );
}
