"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  defaultHomepage,
  homepageCopyDefaults,
  type Homepage,
  type PublicStudio,
} from "@/lib/model";
import { ImageChooser, type AdminData } from "./admin-editor";
import { Modal } from "./shared";
import { HomeContent } from "./home-content";

function initialHomepage(data: AdminData): Homepage {
  const source = structuredClone(
    data.homepageDraft ?? data.homepage ?? defaultHomepage,
  );
  const main = data.artworks.find((a) => a.published && a.hero === "main");
  const accent = data.artworks.find((a) => a.published && a.hero === "accent");
  return {
    ...source,
    heroMain: source.heroMain ?? main?.image ?? "/art/floral.webp",
    heroAccent: source.heroAccent ?? accent?.image ?? "/art/cat-sketch.webp",
    heroMainAlt: source.heroMainAlt ?? main?.title ?? "Nong’s floral painting",
    heroAccentAlt: source.heroAccentAlt ?? accent?.title ?? "Nong’s cat sketch",
    aboutImage: source.aboutImage ?? "/art/studio-art.webp",
    aboutImageAlt:
      source.aboutImageAlt ?? "Original artwork from Nong’s studio",
    aboutBio: source.aboutBio ?? data.settings.bio,
    copy: {
      ...homepageCopyDefaults,
      ...(accent ? { accentCaption: accent.title } : {}),
      ...source.copy,
    },
  };
}
function field(value: Homepage, path: string): string {
  if (path.startsWith("copy.")) return value.copy?.[path.slice(5)] ?? "";
  if (path.startsWith("cards.")) {
    const [, i, key] = path.split(".");
    return value.cards[Number(i)][key as keyof Homepage["cards"][number]];
  }
  return String(value[path as keyof Homepage] ?? "");
}
function change(value: Homepage, path: string, text: string): Homepage {
  if (path.startsWith("copy."))
    return { ...value, copy: { ...value.copy, [path.slice(5)]: text } };
  if (path.startsWith("cards.")) {
    const [, i, key] = path.split(".");
    return {
      ...value,
      cards: value.cards.map((c, index) =>
        index === Number(i) ? { ...c, [key]: text } : c,
      ),
    };
  }
  return { ...value, [path]: text };
}
function Canvas({
  children,
  mobile,
}: {
  children: React.ReactNode;
  mobile: boolean;
}) {
  const [doc, setDoc] = useState<Document | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const initialize = useCallback(() => {
    const target = frame.current?.contentDocument;
    if (!target?.getElementById("home-preview")) return;
    if (!target.head.querySelector("base")) {
      const base = target.createElement("base");
      base.href = window.location.origin;
      target.head.appendChild(base);
      document
        .querySelectorAll('style, link[rel="stylesheet"]')
        .forEach((style) => target.head.appendChild(style.cloneNode(true)));
    }
    setDoc(target);
  }, []);
  useEffect(() => {
    initialize();
  }, [initialize]);
  return (
    <div className="home-canvas-scroll">
      <iframe
        ref={frame}
        title={mobile ? "Mobile homepage preview" : "Desktop homepage preview"}
        className="home-canvas"
        style={{ width: mobile ? 390 : 1200 }}
        srcDoc={
          '<!DOCTYPE html><html><head></head><body><div id="home-preview"></div></body></html>'
        }
        onLoad={initialize}
      />
      {doc &&
        createPortal(
          <div
            onClickCapture={(event) => {
              if ((event.target as Element).closest("a"))
                event.preventDefault();
            }}
          >
            {children}
          </div>,
          doc.getElementById("home-preview")!,
        )}
    </div>
  );
}
export function HomepageEditor({
  data,
  save,
}: {
  data: AdminData;
  save: (action: string, payload: unknown) => Promise<boolean>;
}) {
  const [value, setValue] = useState(() => initialHomepage(data));
  const [mobile, setMobile] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(
    data.homepageDraft ? "Saved draft loaded. It is not yet published." : "",
  );
  const [selected, setSelected] = useState<{
    path: string;
    kind: "text" | "image" | "link";
  } | null>(null);
  const [pending, setPending] = useState("");
  const [alt, setAlt] = useState("");
  const altPath =
    selected && ["heroMain", "heroAccent", "aboutImage"].includes(selected.path)
      ? `${selected.path}Alt`
      : null;
  const publicData: PublicStudio = {
    settings: data.settings,
    homepage: value,
    programs: data.programs.filter((p) => p.published),
    artworks: data.artworks.filter((a) => a.published),
    offerings: data.offerings.filter((o) => o.published),
    events: data.events
      .filter(
        (e) =>
          e.published &&
          data.programs.some((p) => p.id === e.programId && p.published),
      )
      .map((e) => ({
        ...e,
        seatsRemaining:
          e.capacity -
          data.registrations
            .filter((r) => r.eventId === e.id && r.status !== "cancelled")
            .reduce((n, r) => n + r.participants.length, 0),
      })),
    blockedDates: [],
  };
  async function persist(publish: boolean) {
    setBusy(true);
    setMessage("");
    try {
      if (await save(publish ? "homepage" : "homepage-draft", value))
        setMessage(
          publish
            ? "Homepage changes are live."
            : "Draft saved. The live homepage has not changed.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="visual-home-editor">
      <div className="visual-home-toolbar">
        <div role="group" aria-label="Preview size">
          <button
            className={`button small ${!mobile ? "dark" : ""}`}
            onClick={() => setMobile(false)}
          >
            Desktop
          </button>
          <button
            className={`button small ${mobile ? "dark" : ""}`}
            onClick={() => setMobile(true)}
          >
            Mobile
          </button>
        </div>
        <button
          className="button small"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Back to editing" : "Preview"}
        </button>
        <button
          className="button small"
          disabled={busy || uploading}
          onClick={() => void persist(false)}
        >
          Save draft
        </button>
        <button
          className="button dark small"
          disabled={busy || uploading}
          onClick={() => void persist(true)}
        >
          {busy ? "Saving…" : "Publish changes"}
        </button>
      </div>
      <p className="form-hint">
        {preview
          ? "Preview shows the homepage content without editing controls. Links stay inside the editor."
          : "Click text to edit it, or Change image to choose artwork. Scroll sideways to see the full desktop layout on a smaller screen."}{" "}
        Gallery artwork and upcoming classes reflect their published entries.
      </p>
      {message && <p role="status">{message}</p>}
      <Canvas mobile={mobile}>
        <HomeContent
          data={publicData}
          homepage={value}
          edit={
            preview
              ? undefined
              : (path, kind) => {
                  setSelected({ path, kind });
                  setPending(
                    path === "featuredArt"
                      ? JSON.stringify(
                          value.featuredArtworkIds ??
                            data.artworks
                              .filter((a) => a.published && a.featured)
                              .slice(0, 4)
                              .map((a) => a.id),
                        )
                      : field(value, path),
                  );
                  setAlt(field(value, `${path}Alt`));
                }
          }
        />
      </Canvas>
      {selected && (
        <Modal
          title={
            selected.kind === "image"
              ? "Change homepage image"
              : selected.kind === "link"
                ? "Edit destination"
                : "Edit homepage text"
          }
          onClose={() => {
            if (!uploading) setSelected(null);
          }}
        >
          <form
            className="studio-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (uploading) return;
              let next =
                selected.path === "featuredArt"
                  ? {
                      ...value,
                      featuredArtworkIds: JSON.parse(pending) as string[],
                    }
                  : change(value, selected.path, pending);
              if (altPath) next = change(next, altPath, alt);
              setValue(next);
              setSelected(null);
              setMessage(
                "Unsaved changes. Save a draft or publish when ready.",
              );
            }}
          >
            {selected.path === "featuredArt" ? (
              <fieldset>
                <legend>Choose up to four published artworks</legend>
                {data.artworks
                  .filter((a) => a.published)
                  .map((art) => {
                    const ids = JSON.parse(pending || "[]") as string[];
                    return (
                      <label className="checkbox-label" key={art.id}>
                        <input
                          type="checkbox"
                          checked={ids.includes(art.id)}
                          disabled={!ids.includes(art.id) && ids.length >= 4}
                          onChange={(e) =>
                            setPending(
                              JSON.stringify(
                                e.target.checked
                                  ? [...ids, art.id]
                                  : ids.filter((id) => id !== art.id),
                              ),
                            )
                          }
                        />
                        <img src={art.image} alt="" width={60} />
                        {art.title}
                      </label>
                    );
                  })}
              </fieldset>
            ) : selected.kind === "image" ? (
              <>
                <ImageChooser
                  value={pending}
                  onChange={setPending}
                  data={data}
                  onBusy={setUploading}
                />
                {altPath && (
                  <label>
                    Image description
                    <input
                      value={alt}
                      onChange={(e) => setAlt(e.target.value)}
                      required
                      maxLength={300}
                    />
                  </label>
                )}
              </>
            ) : (
              <label>
                {selected.kind === "link" ? "Destination link" : "Text"}
                <textarea
                  value={pending}
                  onChange={(e) => setPending(e.target.value)}
                  required
                  rows={selected.kind === "link" ? 2 : 5}
                  maxLength={
                    selected.kind === "link"
                      ? 2000
                      : selected.path.startsWith("copy.") ||
                          selected.path === "aboutBio"
                        ? 5000
                        : selected.path.endsWith(".text")
                          ? 1000
                          : 300
                  }
                />
              </label>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="button"
                disabled={uploading}
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button
                className="button dark"
                type="submit"
                disabled={uploading || !pending.trim()}
              >
                Apply to preview
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
