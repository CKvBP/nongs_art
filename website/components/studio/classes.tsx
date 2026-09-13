"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Users,
  MapPin,
  Palette,
  Check,
  ArrowRight,
} from "lucide-react";
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
import {
  dateLabel,
  moneyLabel,
  sortedSessions,
  studioNow,
  timeLabel,
} from "@/lib/model";

const categories = [
  ["all", "All classes"],
  ["children", "Little artists"],
  ["adult", "Paint nights"],
  ["workshop", "Workshops"],
];
export function Classes({ initialType = "all" }: { initialType?: string }) {
  const { data } = useStudio();
  const [filter, setFilter] = useState(initialType);
  const [from, setFrom] = useState("");
  const events = data.events
    .filter((event) => {
      const first = sortedSessions(event)[0];
      const program = data.programs.find((p) => p.id === event.programId);
      return (
        (filter === "all" || program?.category === filter) &&
        `${first.date}T${first.start}` > studioNow() &&
        (!from || first.date >= from)
      );
    })
    .sort((a, b) =>
      sortedSessions(a)[0].date.localeCompare(sortedSessions(b)[0].date),
    );
  return (
    <main id="main-content">
      <div className="wrap">
        <PageIntro
          eyebrow="PULL UP A CHAIR. PICK UP A BRUSH."
          title={
            <>
              A little time
              <br />
              to <em>make something.</em>
            </>
          }
        >
          Creative afternoons for little artists. Easygoing evenings for
          grown-ups. Small groups, plenty of encouragement, and room to make it
          your own.
        </PageIntro>
        <div className="class-intro-note">
          <Palette size={19} />
          <p>No experience needed. Just bring your curiosity.</p>
          <span>
            <MapPin size={14} />
            {data.settings.location}
          </span>
        </div>
        <div className="filter-bar">
          <div className="filter-pills" aria-label="Filter classes">
            {categories.map(([value, label]) => (
              <button
                key={value}
                aria-pressed={filter === value}
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="date-filter">
            Starting from
            <input
              type="date"
              value={from}
              onInput={(event) => setFrom(event.currentTarget.value)}
            />
          </label>
        </div>
        {!data.settings.bookingsOpen && (
          <div className="soft-notice">
            <span className="dot" />
            <p>
              A peek at what’s coming. Registration will open soon; dates and
              prices are a preview.
            </p>
          </div>
        )}
        <div className="classes-grid">
          {events.map((event) => {
            const program = data.programs.find(
              (p) => p.id === event.programId,
            )!;
            const sessions = sortedSessions(event);
            const first = sessions[0];
            return (
              <article className="class-card" key={event.id}>
                <Link
                  href={`/classes/${event.id}`}
                  className="class-card-image"
                >
                  <img src={program.image} alt={program.title} />
                  <span className="image-chip">
                    {
                      categories.find(
                        ([value]) => value === program.category,
                      )?.[1]
                    }
                  </span>
                </Link>
                <div className="class-card-content">
                  <div className="class-card-topline">
                    <span>
                      {dateLabel(first.date, { weekday: "short" })}
                      {sessions.length > 1
                        ? ` – ${dateLabel(sessions.at(-1)!.date)}`
                        : ""}
                    </span>
                    <span
                      className={`seat-count ${event.seatsRemaining <= 3 ? "few" : ""}`}
                    >
                      {event.seatsRemaining > 0
                        ? `${event.seatsRemaining} places left`
                        : "Fully booked"}
                    </span>
                  </div>
                  <h3>
                    <Link href={`/classes/${event.id}`}>{event.title}</Link>
                  </h3>
                  <p>{program.durationNote}</p>
                  <div className="class-meta">
                    <span>
                      <Clock3 size={15} />
                      {timeLabel(first.start)} – {timeLabel(first.end)}
                    </span>
                    <span>
                      <CalendarDays size={15} />
                      {sessions.length}{" "}
                      {sessions.length === 1 ? "session" : "sessions included"}
                    </span>
                  </div>
                  <div className="class-card-bottom">
                    <span>
                      <strong>{moneyLabel(event.price)}</strong> / person
                    </span>
                    <Link className="text-link" href={`/classes/${event.id}`}>
                      View class <ArrowUpRight size={17} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {events.length === 0 && (
          <EmptyState
            icon={<CalendarDays />}
            title="More creative days are on their way."
          >
            There are no upcoming classes for this selection. Try another
            category or date.
          </EmptyState>
        )}
        <section className="little-note">
          <span className="handwritten">A little note for parents</span>
          <h3>One week. Two afternoons of possibility.</h3>
          <p>
            Children’s weekly classes include every session listed in that
            week’s booking. Choose the week that works for your family, and
            reserve a place for each little artist.
          </p>
        </section>
      </div>
    </main>
  );
}
export function ClassDetails({ id }: { id: string }) {
  const { data, refresh } = useStudio();
  const event = data.events.find((e) => e.id === id);
  const program = data.programs.find((p) => p.id === event?.programId);
  const [seats, setSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  if (!event || !program)
    return (
      <main className="wrap page-space" id="main-content">
        <BackLink href="/classes">All classes</BackLink>
        <EmptyState title="This class isn’t available.">
          Browse the calendar for another creative day.
        </EmptyState>
      </main>
    );
  const sessions = sortedSessions(event);
  const closed = `${sessions[0].date}T${sessions[0].start}` <= studioNow();
  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(formEvent.currentTarget);
    try {
      const result = await postJson("/api/bookings", {
        requestId,
        eventId: id,
        customerName: form.get("customerName"),
        email: form.get("email"),
        phone: form.get("phone"),
        participants: Array.from({ length: seats }, (_, i) =>
          form.get(`participant-${i}`),
        ),
        notes: form.get("notes"),
        website: form.get("website"),
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
    <main className="wrap page-space" id="main-content">
      <BackLink href="/classes">All classes & workshops</BackLink>
      <div className="detail-layout">
        <div>
          <img className="detail-art" src={program.image} alt={program.title} />
          <div className="detail-copy">
            <p className="eyebrow">A LITTLE CREATIVITY GOES A LONG WAY</p>
            <h1>{event.title}</h1>
            <p>{program.description}</p>
            <div className="detail-features">
              <span>
                <Check size={17} />
                Small, welcoming group
              </span>
              <span>
                <Check size={17} />
                Guided by Nong
              </span>
              <span>
                <MapPin size={17} />
                {data.settings.location}
              </span>
            </div>
          </div>
        </div>
        <aside className="booking-panel">
          {reference ? (
            <SuccessMessage
              title="Your places are reserved."
              reference={reference}
            >
              Save your reference for your records. Your reservation includes
              all the sessions listed for this class. No payment has been
              collected online.
            </SuccessMessage>
          ) : (
            <>
              <p className="eyebrow">YOUR NEXT CREATIVE DAY</p>
              <h2>Make room for art.</h2>
              <div className="booking-price">
                {moneyLabel(event.price)}
                <span>
                  {" "}
                  / person · {sessions.length}{" "}
                  {sessions.length === 1 ? "session" : "sessions"}
                </span>
              </div>
              <div className="session-list">
                {sessions.map((session, i) => (
                  <div key={i}>
                    <CalendarDays size={19} />
                    <div>
                      <strong>
                        {dateLabel(session.date, {
                          weekday: "long",
                          year: "numeric",
                        })}
                      </strong>
                      <p>
                        {timeLabel(session.start)} – {timeLabel(session.end)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="time-zone-note">
                All times are local to Aiken (Eastern Time).
              </p>
              <div className="availability">
                <Users size={16} />
                {event.seatsRemaining} of {event.capacity} places available
              </div>
              {!data.settings.bookingsOpen ||
              closed ||
              event.seatsRemaining < 1 ? (
                <div className="soft-notice">
                  <p>
                    {closed
                      ? "Registration for this class has closed."
                      : event.seatsRemaining < 1
                        ? "This class is fully booked. Explore another day in the studio."
                        : "Registration opens soon. This schedule and pricing are a preview."}
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="studio-form">
                  <label>
                    Number of places
                    <select
                      value={seats}
                      onChange={(e) => setSeats(Number(e.target.value))}
                    >
                      {Array.from(
                        { length: Math.min(event.seatsRemaining, 20) },
                        (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} {i === 0 ? "place" : "places"}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    {program.category === "children"
                      ? "Parent or guardian’s name"
                      : "Your name"}
                    <input
                      name="customerName"
                      autoComplete="name"
                      required
                      maxLength={300}
                    />
                  </label>
                  <div className="form-row">
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
                  </div>
                  {Array.from({ length: seats }, (_, i) => (
                    <label key={i}>
                      {program.category === "children"
                        ? "Little artist"
                        : "Participant"}{" "}
                      {seats > 1 ? i + 1 : ""} name
                      <input
                        name={`participant-${i}`}
                        required
                        maxLength={300}
                      />
                    </label>
                  ))}
                  <label>
                    Anything you’d like me to know? <small>(optional)</small>
                    <textarea name="notes" rows={3} maxLength={2000} />
                  </label>
                  <Honeypot />
                  <div className="booking-total">
                    <span>
                      {seats} {seats === 1 ? "place" : "places"} · all sessions
                    </span>
                    <strong>{moneyLabel(seats * event.price)}</strong>
                  </div>
                  <p className="form-hint">
                    Payment is arranged with the studio. No payment is collected
                    on this page.
                  </p>
                  <FormMessage error={error} />
                  <SubmitButton busy={busy}>
                    Reserve {seats === 1 ? "my place" : "our places"}{" "}
                    <ArrowRight size={17} />
                  </SubmitButton>
                </form>
              )}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
