"use client";
import { useState } from "react";
import { ReferencePhotos, type PhotoInput } from "./reference-photos";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { dateLabel, moneyLabel, studioNow } from "@/lib/model";
import { useStudio } from "./provider";
import {
  BackLink,
  EmptyState,
  FormMessage,
  Honeypot,
  PageIntro,
  postJson,
  SubmitButton,
  SuccessMessage,
} from "./shared";
const categoryLabels = {
  ornament: "CUSTOM ORNAMENTS",
  wedding: "WEDDING PAINTINGS",
  scribble: "SCRIBBLES & SKETCHES",
  acrylic: "ACRYLIC PAINTINGS",
};
export function Commissions() {
  const { data } = useStudio();
  return (
    <main id="main-content" className="wrap">
      <PageIntro
        eyebrow="YOUR STORY, MADE INTO ART"
        title={
          <>
            For the things
            <br />
            you <em>hold close.</em>
          </>
        }
      >
        A beloved pet. The place you call home. The day you said “I do.” Let’s
        turn what matters to you into something you can keep.
      </PageIntro>
      <div className="commission-list">
        {data.offerings.map((offering, index) => (
          <section
            key={offering.id}
            className={`commission-feature ${index % 2 ? "reverse" : ""}`}
          >
            <div className="commission-image">
              <img
                src={offering.image}
                alt={`An example of Nong’s ${offering.category === "wedding" ? "acrylic artwork" : offering.category + " work"}`}
              />
              {offering.category === "wedding" && (
                <span className="image-caption">
                  A study in color from Nong’s studio
                </span>
              )}
            </div>
            <div>
              <p className="eyebrow">
                0{index + 1} / {categoryLabels[offering.category]}
              </p>
              <h2>{offering.title}</h2>
              <p>{offering.description}</p>
              <p className="commission-price">
                {offering.startingPrice > 0
                  ? `From ${moneyLabel(offering.startingPrice)}`
                  : "Made just for you · price by request"}
              </p>
              <Link
                className="button"
                href={
                  offering.category === "wedding"
                    ? "/weddings"
                    : `/commissions/${offering.id}`
                }
              >
                {offering.category === "wedding"
                  ? "Find your wedding date"
                  : "Tell me your idea"}{" "}
                <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>
        ))}
      </div>
      {!data.offerings.length && (
        <EmptyState title="Something personal is coming.">
          Custom art offerings will be available here soon.
        </EmptyState>
      )}
      <div className="process-strip">
        <p className="eyebrow">SOMETHING SPECIAL, TOGETHER</p>
        <div>
          {[
            [
              "01",
              "Tell me your story",
              "Share your idea and the details that make it yours.",
            ],
            [
              "02",
              "We’ll make a plan",
              "Together we’ll settle on the piece, price, and timing.",
            ],
            [
              "03",
              "I’ll bring it to life",
              "Your story becomes a one-of-a-kind piece of art.",
            ],
          ].map(([n, title, text]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
export function DatePicker({
  value,
  onChange,
  blocked,
}: {
  value: string;
  onChange: (date: string) => void;
  blocked: string[];
}) {
  const today = studioNow().slice(0, 10);
  const [month, setMonth] = useState(today.slice(0, 7));
  const base = new Date(month + "-01T12:00:00Z");
  const offset = base.getUTCDay();
  const days = new Date(
    base.getUTCFullYear(),
    base.getUTCMonth() + 1,
    0,
  ).getDate();
  function step(n: number) {
    const d = new Date(base);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  }
  return (
    <div className="date-picker">
      <div className="calendar-title">
        <button
          type="button"
          className="icon-button"
          aria-label="Previous month"
          disabled={month <= today.slice(0, 7)}
          onClick={() => step(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <strong>
          {dateLabel(month + "-01", {
            month: "long",
            year: "numeric",
            day: undefined,
          })}
        </strong>
        <button
          type="button"
          className="icon-button"
          aria-label="Next month"
          onClick={() => step(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="date-picker-grid">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span className="weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const unavailable = date <= today || blocked.includes(date);
          return (
            <button
              type="button"
              key={date}
              disabled={unavailable}
              className={date === value ? "selected" : ""}
              aria-pressed={date === value}
              aria-label={`${dateLabel(date, { month: "long", year: "numeric" })}${unavailable ? ", unavailable" : ""}`}
              onClick={() => onChange(date)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i />
          Available
        </span>
        <span>
          <i className="unavailable" />
          Unavailable
        </span>
      </div>
      {value && (
        <p className="selected-date">
          <CalendarDays size={15} />
          {dateLabel(value, { weekday: "long", year: "numeric" })}
        </p>
      )}
    </div>
  );
}
export function CommissionDetails({
  id,
  wedding = false,
}: {
  id?: string;
  wedding?: boolean;
}) {
  const { data, refresh } = useStudio();
  const offering = wedding
    ? data.offerings.find((o) => o.category === "wedding")
    : data.offerings.find((o) => o.id === id);
  const [date, setDate] = useState("");
  const [photos, setPhotos] = useState<PhotoInput[]>([]);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  if (!offering)
    return (
      <main id="main-content" className="wrap page-space">
        <BackLink href="/commissions">Custom art</BackLink>
        <EmptyState title="More handmade happiness is on its way.">
          This offering is not currently available.
        </EmptyState>
      </main>
    );
  const isWedding = offering.category === "wedding";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (preparingPhotos || busy) return;
    if (isWedding && !date) {
      setError("Choose your wedding date on the calendar.");
      return;
    }
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await postJson("/api/inquiries", {
        requestId,
        offeringId: offering!.id,
        date: isWedding ? date : "",
        customerName: form.get("customerName"),
        email: form.get("email"),
        phone: form.get("phone"),
        description: form.get("description"),
        website: form.get("website"),
        photos,
      });
      setReference(result.reference);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
      void refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className="wrap page-space">
      <BackLink href="/commissions">All custom art</BackLink>
      <div className="detail-layout commission-detail">
        <div>
          <p className="eyebrow">{categoryLabels[offering.category]}</p>
          <h1>{offering.title}</h1>
          <p className="detail-intro">{offering.description}</p>
          <div className="commission-detail-image">
            <img src={offering.image} alt="Original artwork by Nong" />
            {isWedding && (
              <span className="image-caption">
                Original acrylic artwork from Nong’s studio
              </span>
            )}
          </div>
          <div className="personal-note">
            <Heart size={21} />
            <p>
              {isWedding
                ? "One day, one couple. I keep your wedding day clear so I can give your painting the care it deserves."
                : "Every piece is made by hand and shaped by your story. Share the details you love; we’ll work out the rest together."}
            </p>
          </div>
        </div>
        <aside className="booking-panel">
          {reference ? (
            <SuccessMessage
              title={
                isWedding
                  ? "Your date is on hold."
                  : "Your idea is in the studio."
              }
              reference={reference}
            >
              {isWedding
                ? "Your full wedding day is held for review. This is an inquiry, with final details and booking arrangements still to be agreed with Nong."
                : "Your inquiry has been saved for Nong to review. Pricing and timing will be agreed before work begins."}{" "}
              Save your reference for your records.
            </SuccessMessage>
          ) : (
            <>
              <p className="eyebrow">LET’S MAKE SOMETHING MEANINGFUL</p>
              <h2>
                {isWedding ? "Save a little magic." : "Tell me your idea."}
              </h2>
              <p className="panel-intro">
                {offering.startingPrice > 0
                  ? `Pieces start at ${moneyLabel(offering.startingPrice)}. Final pricing depends on your project.`
                  : "Each piece is personal. We’ll agree on the price and timing together."}
              </p>
              <form className="studio-form" onSubmit={submit}>
                {isWedding && (
                  <>
                    <label>Your wedding date</label>
                    <DatePicker
                      value={date}
                      onChange={setDate}
                      blocked={data.blockedDates}
                    />
                    <p className="form-hint">
                      Submitting an inquiry holds this entire day for studio
                      review.
                    </p>
                  </>
                )}
                <label>
                  Your name
                  <input
                    name="customerName"
                    autoComplete="name"
                    required
                    maxLength={300}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Phone <small>(optional)</small>
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    maxLength={30}
                  />
                </label>
                <label>
                  {isWedding
                    ? "Tell me about your wedding"
                    : "What would you love to have painted?"}
                  <textarea
                    name="description"
                    minLength={10}
                    maxLength={4000}
                    rows={5}
                    required
                    placeholder={
                      isWedding
                        ? "Your venue, location, and the moment you’d love to remember…"
                        : "Your idea, who it’s for, and any date you have in mind…"
                    }
                  />
                </label>
                {["ornament", "scribble"].includes(offering.category) && (
                  <ReferencePhotos
                    photos={photos}
                    onChange={setPhotos}
                    onBusy={setPreparingPhotos}
                    disabled={busy}
                  />
                )}
                <Honeypot />
                <FormMessage error={error} />
                {data.settings.bookingsOpen ? (
                  <SubmitButton busy={busy || preparingPhotos}>
                    {isWedding ? "Request this date" : "Send my idea"}{" "}
                    <ArrowRight size={17} />
                  </SubmitButton>
                ) : (
                  <div className="soft-notice">
                    <p>
                      The inquiry book opens soon. You’re welcome to explore the
                      offerings in the meantime.
                    </p>
                  </div>
                )}
                <p className="form-hint">
                  No payment is collected when you submit an inquiry.
                </p>
              </form>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
