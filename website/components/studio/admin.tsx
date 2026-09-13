"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Palette,
  Users,
  MessageSquare,
  ImagePlus,
  Settings2,
  ArrowUpRight,
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Search,
  RefreshCw,
  LogOut,
  Check,
  X,
  CalendarOff,
  Heart,
  Images,
  ExternalLink,
} from "lucide-react";
import {
  dateLabel,
  moneyLabel,
  sortedSessions,
  studioNow,
  timeLabel,
  type Registration,
  type Settings,
} from "@/lib/model";
import { Brand, EmptyState, Modal, postJson, SubmitButton } from "./shared";
import { HomepageEditor } from "./homepage-editor";
import { ItemEditor, type AdminData, type EditorState } from "./admin-editor";

export const adminSections = [
  "overview",
  "calendar",
  "programs",
  "registrations",
  "inquiries",
  "homepage",
  "gallery",
  "offerings",
  "settings",
];
const navigation = [
  { id: "inquiries", title: "Inquiries", icon: MessageSquare },
  { id: "registrations", title: "Registrations", icon: Users },
  { id: "overview", title: "Overview", icon: LayoutDashboard },
  { id: "calendar", title: "Classes & Events", icon: CalendarDays },
  { id: "homepage", title: "Homepage", icon: LayoutDashboard },
  { id: "gallery", title: "Gallery", icon: Images },
  { id: "offerings", title: "Custom offerings", icon: Heart },
  { id: "settings", title: "Studio settings", icon: Settings2 },
];
const captions: Record<string, string> = {
  overview: "A little overview of your creative world.",
  calendar:
    "Plan each painting week, manage program defaults, and make room for special days.",
  programs: "The creative experiences that make your studio yours.",
  registrations: "A place for every artist. A simple view of every booking.",
  inquiries: "New stories, special requests, and dates to remember.",
  homepage: "Make your homepage feel like your studio.",
  gallery: "Keep your walls fresh. Share something you’ve made.",
  offerings: "Your one-of-a-kind work, ready to be discovered.",
  settings: "The little details that make it your studio.",
};
function seats(data: AdminData, eventId: string) {
  return data.registrations
    .filter((r) => r.eventId === eventId && r.status !== "cancelled")
    .reduce((n, r) => n + r.participants.length, 0);
}
export function AdminStudio({
  initial,
  section = "overview",
  preview,
}: {
  initial: AdminData;
  section?: string;
  preview: boolean;
}) {
  const [classView, setClassView] = useState(
    section === "programs" ? "programs" : "calendar",
  );
  const isClasses = section === "calendar" || section === "programs";
  const [data, setData] = useState(initial);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleting, setDeleting] = useState<{
    kind: string;
    id: string;
    title: string;
  } | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const router = useRouter();
  const today = studioNow().slice(0, 10);
  const next = data.events
    .filter((e) =>
      sortedSessions(e).some((s) => `${s.date}T${s.end}` > studioNow()),
    )
    .sort((a, b) =>
      sortedSessions(a)[0].date.localeCompare(sortedSessions(b)[0].date),
    );
  const inquiries = data.inquiries.filter((i) => i.status === "new");
  const reservedRegistrations = data.registrations.filter(
    (r) => r.status === "reserved",
  );
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) router.push("/admin/login");
        throw new Error(result.error);
      }
      setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function save(action: string, payload: unknown) {
    setError("");
    setNotice("");
    try {
      const updated = await postJson("/api/admin", {
        action,
        payload,
        revision: data.revision,
        adminRevision: data.adminRevision ?? 0,
      });
      setData(updated);
      setNotice(
        action === "delete"
          ? "Removed from the studio."
          : "Your changes are saved.",
      );
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  }
  const addAction =
    isClasses && classView === "programs"
      ? { label: "New program", kind: "program" as const }
      : section === "gallery"
        ? { label: "Add artwork", kind: "artwork" as const }
        : section === "offerings"
          ? { label: "New offering", kind: "offering" as const }
          : { label: "Add a class", kind: "event" as const };
  const visibleRegistrations = data.registrations
    .filter(
      (r) =>
        (statusFilter === "all" || r.status === statusFilter) &&
        `${r.customerName} ${r.email} ${r.participants.join(" ")} ${r.reference} ${data.events.find((e) => e.id === r.eventId)?.title}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Brand name={data.settings.name} />
        <p className="admin-studio-label">THE STUDIO</p>
        <nav aria-label="Studio administration">
          {navigation.map((item) => (
            <Link
              key={item.id}
              href={item.id === "overview" ? "/admin" : `/admin/${item.id}`}
              aria-current={section === item.id ? "page" : undefined}
              className={section === item.id ? "active" : ""}
            >
              <item.icon size={18} />
              {item.title}
              {item.id === "inquiries" && inquiries.length > 0 && (
                <span className="nav-count">{inquiries.length}</span>
              )}
              {item.id === "registrations" &&
                reservedRegistrations.length > 0 && (
                  <span className="nav-count" title="Reserved registrations">
                    {reservedRegistrations.length}
                  </span>
                )}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="studio-owner">
            <span>N</span>
            <div>
              <strong>Nong’s studio</strong>
              <p>{preview ? "Local preview" : "Administrator"}</p>
            </div>
          </div>
          {!preview && (
            <button
              onClick={async () => {
                await fetch("/api/auth", { method: "DELETE" });
                router.push("/admin/login");
                router.refresh();
              }}
            >
              <LogOut size={16} />
              Sign out
            </button>
          )}
          <Link href="/" target="_blank">
            View website <ExternalLink size={15} />
          </Link>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <span>
            Studio /{" "}
            <strong>
              {isClasses
                ? "Classes & Events"
                : navigation.find((n) => n.id === section)?.title}
            </strong>
          </span>
          <div>
            <span
              className={`studio-status ${data.settings.bookingsOpen ? "open" : ""}`}
            >
              <i />
              {data.settings.bookingsOpen
                ? "Registration open"
                : "Getting ready"}
            </span>
            <button
              className="icon-button"
              aria-label="Refresh studio data"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw size={17} className={loading ? "spin" : ""} />
            </button>
          </div>
        </header>
        <main className="admin-main">
          <div className="admin-page-heading">
            <div>
              <p className="eyebrow">
                {section === "overview"
                  ? dateLabel(today, { weekday: "long", year: "numeric" })
                  : "NONG’S ART DEN / THE STUDIO"}
              </p>
              <h1>
                {section === "overview" ? (
                  <>
                    Hello, Nong<span className="greeting-dot">.</span>
                  </>
                ) : isClasses ? (
                  "Classes & Events"
                ) : (
                  navigation.find((n) => n.id === section)?.title
                )}
              </h1>
              <p>{captions[section]}</p>
            </div>
            {[
              "overview",
              "calendar",
              "programs",
              "gallery",
              "offerings",
            ].includes(section) && (
              <button
                className="button dark small"
                onClick={() => setEditor({ kind: addAction.kind })}
              >
                <Plus size={17} />
                {addAction.label}
              </button>
            )}
          </div>
          {(error || notice) && (
            <div
              className={`admin-message ${error ? "error" : ""}`}
              role={error ? "alert" : "status"}
            >
              <span>
                {error || (
                  <>
                    <Check size={16} />
                    {notice}
                  </>
                )}
              </span>
              {error && (
                <button onClick={() => void refresh()} className="text-link">
                  Refresh data
                </button>
              )}
              <button
                className="icon-button"
                aria-label="Dismiss message"
                onClick={() => {
                  setError("");
                  setNotice("");
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {section === "overview" && (
            <>
              <div className="stats-grid">
                {[
                  {
                    icon: CalendarDays,
                    number: next.length,
                    label: "Upcoming classes",
                    detail: "Creative days ahead",
                    link: "calendar",
                  },
                  {
                    icon: Users,
                    number: next.reduce((n, e) => n + seats(data, e.id), 0),
                    label: "Reserved places",
                    detail: "Across upcoming classes",
                    link: "registrations",
                  },
                  {
                    icon: MessageSquare,
                    number: inquiries.length,
                    label: "New inquiries",
                    detail: "Stories waiting to be painted",
                    link: "inquiries",
                  },
                  {
                    icon: Images,
                    number: data.artworks.filter((a) => a.published).length,
                    label: "Pieces in the gallery",
                    detail: "A little window into your work",
                    link: "gallery",
                  },
                ].map((stat) => (
                  <Link
                    className="stat-card"
                    href={`/admin/${stat.link}`}
                    key={stat.label}
                  >
                    <div>
                      <stat.icon size={19} />
                      <ArrowUpRight size={16} />
                    </div>
                    <strong>{stat.number}</strong>
                    <h3>{stat.label}</h3>
                    <p>{stat.detail}</p>
                  </Link>
                ))}
              </div>
              {!data.settings.bookingsOpen && (
                <div className="welcome-banner">
                  <span>
                    <Palette size={26} />
                  </span>
                  <div>
                    <h3>Your studio is taking shape.</h3>
                    <p>
                      Programs, dates, and prices are examples. Make them yours,
                      then open registration in Studio settings.
                    </p>
                  </div>
                  <Link href="/admin/settings">
                    Studio settings <ArrowRight size={17} />
                  </Link>
                </div>
              )}
              <div className="dashboard-columns">
                <section className="admin-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">ON THE EASEL</p>
                      <h2>Coming up next</h2>
                    </div>
                    <Link className="text-link" href="/admin/calendar">
                      Full calendar <ArrowUpRight size={15} />
                    </Link>
                  </div>
                  <div className="agenda-list">
                    {next.slice(0, 4).map((event) => {
                      const first = sortedSessions(event).find(
                        (s) => `${s.date}T${s.end}` > studioNow(),
                      )!;
                      const count = seats(data, event.id);
                      return (
                        <button
                          key={event.id}
                          className="agenda-item"
                          onClick={() =>
                            setEditor({ kind: "event", item: event })
                          }
                        >
                          <div className="agenda-date">
                            <span>
                              {dateLabel(first.date, {
                                month: "short",
                                day: undefined,
                              })}
                            </span>
                            <strong>{first.date.slice(8)}</strong>
                          </div>
                          <div className="agenda-copy">
                            <h3>{event.title}</h3>
                            <p>
                              {timeLabel(first.start)} – {timeLabel(first.end)}{" "}
                              · {event.sessions.length}{" "}
                              {event.sessions.length === 1
                                ? "session"
                                : "sessions"}
                            </p>
                            <div className="seat-meter">
                              <span
                                style={{
                                  width: `${(100 * count) / event.capacity}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="agenda-seats">
                            {count}/{event.capacity}
                            <small>places</small>
                          </span>
                        </button>
                      );
                    })}
                    {!next.length && (
                      <EmptyState title="A fresh calendar.">
                        Add a class to start filling your studio with
                        creativity.
                      </EmptyState>
                    )}
                  </div>
                </section>
                <section className="quick-actions">
                  <p className="eyebrow">A LITTLE SOMETHING NEW</p>
                  <h2>Make it happen.</h2>
                  <button onClick={() => setEditor({ kind: "event" })}>
                    <span>
                      <CalendarDays size={20} />
                    </span>
                    <div>
                      <strong>Put a class on the calendar</strong>
                      <p>Choose a day. Make some space.</p>
                    </div>
                    <ArrowUpRight size={17} />
                  </button>
                  <button onClick={() => setEditor({ kind: "artwork" })}>
                    <span>
                      <ImagePlus size={20} />
                    </span>
                    <div>
                      <strong>Share a new piece</strong>
                      <p>A fresh addition to your gallery.</p>
                    </div>
                    <ArrowUpRight size={17} />
                  </button>
                  <button onClick={() => setEditor({ kind: "block" })}>
                    <span>
                      <CalendarOff size={20} />
                    </span>
                    <div>
                      <strong>Keep a day for yourself</strong>
                      <p>Block a date in your calendar.</p>
                    </div>
                    <ArrowUpRight size={17} />
                  </button>
                  <div className="quick-note">
                    <img src="/art/cat-sketch.webp" alt="Nong’s cat sketch" />
                    <span className="handwritten">
                      Good things take
                      <br />a little creativity.
                    </span>
                  </div>
                </section>
              </div>
            </>
          )}
          {isClasses && (
            <div
              className="class-view-switcher"
              role="group"
              aria-label="Classes and events views"
            >
              {[
                ["calendar", "Calendar"],
                ["list", "Scheduled classes"],
                ["programs", "Programs & defaults"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={classView === id ? "active" : ""}
                  aria-pressed={classView === id}
                  onClick={() => setClassView(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {isClasses && classView === "list" && (
            <div className="admin-grid">
              {[...data.events]
                .sort((a, b) =>
                  (a.sessions[0]?.date ?? "").localeCompare(
                    b.sessions[0]?.date ?? "",
                  ),
                )
                .map((event) => {
                  const program = data.programs.find(
                    (p) => p.id === event.programId,
                  );
                  return (
                    <article className="admin-content-card" key={event.id}>
                      <div className="admin-card-photo">
                        <img
                          src={event.image ?? program?.image}
                          alt={event.title}
                        />
                      </div>
                      <div className="admin-card-body">
                        <p className="eyebrow">
                          {program?.title} ·{" "}
                          {event.published ? "Published" : "Draft"}
                        </p>
                        <h3>{event.title}</h3>
                        <p>{event.description || program?.description}</p>
                        <p>
                          {event.sessions
                            .map(
                              (s) =>
                                `${dateLabel(s.date)} · ${timeLabel(s.start)}–${timeLabel(s.end)}`,
                            )
                            .join(" / ")}
                        </p>
                        <p>
                          {seats(data, event.id)}/{event.capacity} places
                          reserved · {moneyLabel(event.price)}
                        </p>
                        <div className="admin-card-actions">
                          <button
                            className="text-link"
                            onClick={() =>
                              setEditor({ kind: "event", item: event })
                            }
                          >
                            Edit class
                          </button>
                          <button
                            className="text-link"
                            onClick={() =>
                              setEditor({
                                kind: "event",
                                item: {
                                  ...event,
                                  id: undefined,
                                  published: false,
                                  sessions: event.sessions.map((s) => ({
                                    ...s,
                                    date: "",
                                  })),
                                },
                              })
                            }
                          >
                            Duplicate week
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              {!data.events.length && (
                <EmptyState title="Plan your first painting week.">
                  Add a class to choose a program, painting, and dates.
                </EmptyState>
              )}
            </div>
          )}
          {isClasses && classView === "calendar" && (
            <AdminCalendar
              data={data}
              setEditor={setEditor}
              remove={setDeleting}
            />
          )}
          {isClasses && classView === "programs" && (
            <>
              <div className="admin-grid">
                {data.programs.map((program) => (
                  <article key={program.id} className="admin-content-card">
                    <div className="admin-card-photo">
                      <img src={program.image} alt={program.title} />
                      <span
                        className={`status-badge ${program.published ? "published" : ""}`}
                      >
                        {program.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="admin-card-body">
                      <p className="eyebrow">
                        {program.category === "children"
                          ? "LITTLE ARTISTS"
                          : program.category === "adult"
                            ? "PAINT NIGHTS"
                            : "WORKSHOPS"}
                      </p>
                      <h3>{program.title}</h3>
                      <p>{program.description}</p>
                      <div className="admin-card-meta">
                        <span>{moneyLabel(program.price)} / person</span>
                        <span>
                          <Users size={14} />
                          {program.capacity} places
                        </span>
                      </div>
                      <div className="admin-card-actions">
                        <button
                          className="text-link"
                          onClick={() =>
                            setEditor({ kind: "program", item: program })
                          }
                        >
                          <Pencil size={14} />
                          Edit program
                        </button>
                        <button
                          className="text-link"
                          onClick={() =>
                            setEditor({
                              kind: "event",
                              item: { programId: program.id },
                            })
                          }
                        >
                          Add dates
                        </button>
                        <div>
                          <button
                            className="icon-button"
                            aria-label={`${program.published ? "Hide" : "Publish"} ${program.title}`}
                            onClick={() =>
                              void save("program", {
                                ...program,
                                published: !program.published,
                              })
                            }
                          >
                            {program.published ? (
                              <Eye size={17} />
                            ) : (
                              <EyeOff size={17} />
                            )}
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Delete ${program.title}`}
                            onClick={() =>
                              setDeleting({
                                kind: "program",
                                id: program.id,
                                title: program.title,
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!data.programs.length && (
                <EmptyState
                  icon={<Palette />}
                  title="A program starts with an idea."
                >
                  Add a program, then schedule individual classes with their own
                  dates and places.
                </EmptyState>
              )}
              <p className="section-footnote">
                Programs hold the description, image, and defaults. Use the
                calendar to schedule bookable classes.
              </p>
            </>
          )}
          {section === "registrations" && (
            <section className="admin-panel">
              <div className="table-toolbar">
                <label className="search-input">
                  <Search size={17} />
                  <input
                    placeholder="Search names, classes, or references"
                    aria-label="Search registrations"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Filter registration status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All registrations</option>
                  <option value="reserved">Reserved</option>
                  <option value="attended">Attended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {visibleRegistrations.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Artist / parent</th>
                        <th>Class</th>
                        <th>Places</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRegistrations.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.customerName}</strong>
                            <small>{r.email}</small>
                          </td>
                          <td>
                            {data.events.find((e) => e.id === r.eventId)?.title}
                            <small>{r.reference}</small>
                          </td>
                          <td>{r.participants.length}</td>
                          <td>
                            <span className={`status-badge ${r.status}`}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="text-link"
                              onClick={() => setRegistration(r)}
                            >
                              Details <ArrowUpRight size={15} />
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`Delete registration ${r.reference}`}
                              onClick={() => {
                                setError("");
                                setDeleting({
                                  kind: "registration",
                                  id: r.id,
                                  title: `${r.customerName} · ${r.reference}`,
                                });
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={<Users />}
                  title={
                    search || statusFilter !== "all"
                      ? "No matching registrations."
                      : "A place for your first artist."
                  }
                >
                  {search || statusFilter !== "all"
                    ? "Try another name or status."
                    : "When someone reserves a class, their details and participants will appear here."}
                </EmptyState>
              )}
            </section>
          )}
          {section === "inquiries" && (
            <>
              <div className="filter-pills admin-filter-pills">
                {["all", "new", "accepted", "completed", "declined"].map(
                  (status) => (
                    <button
                      className={statusFilter === status ? "active" : ""}
                      aria-pressed={statusFilter === status}
                      key={status}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === "all" ? "All inquiries" : status}
                    </button>
                  ),
                )}
              </div>
              <div className="inquiry-list">
                {data.inquiries
                  .filter(
                    (i) => statusFilter === "all" || i.status === statusFilter,
                  )
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((inquiry) => (
                    <article className="inquiry-card" key={inquiry.id}>
                      <div className="inquiry-card-heading">
                        <div>
                          <p className="eyebrow">
                            {
                              data.offerings.find(
                                (o) => o.id === inquiry.offeringId,
                              )?.title
                            }
                          </p>
                          <h3>{inquiry.customerName}</h3>
                        </div>
                        <span className={`status-badge ${inquiry.status}`}>
                          {inquiry.status}
                        </span>
                      </div>
                      {inquiry.date && (
                        <p className="inquiry-date">
                          <CalendarDays size={17} />
                          {dateLabel(inquiry.date, {
                            weekday: "long",
                            year: "numeric",
                          })}{" "}
                          ·{" "}
                          {inquiry.status === "declined"
                            ? "Date released"
                            : "Full day held"}
                        </p>
                      )}
                      <p className="inquiry-description">
                        {inquiry.description}
                      </p>
                      {!!inquiry.photos?.length && (
                        <div className="inquiry-references">
                          <p className="eyebrow">PRIVATE REFERENCE PHOTOS</p>
                          <div className="reference-grid">
                            {inquiry.photos.map((photo, index) => (
                              <a
                                key={photo.id}
                                href={`/api/references/${photo.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={`/api/references/${photo.id}`}
                                  alt={`Reference ${index + 1} from ${inquiry.customerName}`}
                                  loading="lazy"
                                />
                                <span>{photo.name}</span>
                                <small>Open full image ↗</small>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="inquiry-contact">
                        <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
                        {inquiry.phone && (
                          <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>
                        )}
                      </div>
                      <div className="inquiry-card-footer">
                        <small>
                          {inquiry.reference} ·{" "}
                          {dateLabel(inquiry.createdAt.slice(0, 10))}
                        </small>
                        <label>
                          Status
                          <select
                            value={inquiry.status}
                            onChange={(e) =>
                              void save("inquiry-status", {
                                id: inquiry.id,
                                status: e.target.value,
                              })
                            }
                          >
                            <option value="new">New</option>
                            <option value="accepted">Accepted</option>
                            <option value="completed">Completed</option>
                            <option value="declined">
                              Declined · release date
                            </option>
                          </select>
                        </label>
                      </div>
                    </article>
                  ))}
              </div>
              {!data.inquiries.some(
                (i) => statusFilter === "all" || i.status === statusFilter,
              ) && (
                <EmptyState
                  icon={<MessageSquare />}
                  title="Every piece starts with a conversation."
                >
                  Wedding requests and custom art inquiries will appear here.
                  Wedding requests hold a full day until you release them.
                </EmptyState>
              )}
            </>
          )}
          {section === "gallery" && (
            <>
              <div className="gallery-admin-note">
                <span>{data.artworks.length} pieces in your collection</span>
                <span>
                  <Eye size={15} />
                  {data.artworks.filter((a) => a.published).length} visible on
                  the website
                </span>
              </div>
              <div className="admin-gallery-grid">
                {data.artworks.map((art) => (
                  <article className="admin-art-card" key={art.id}>
                    <div className="admin-art-image">
                      <img src={art.image} alt={art.title} loading="lazy" />
                      {art.featured && (
                        <span className="image-chip">Homepage feature</span>
                      )}
                      {!art.published && (
                        <span className="draft-overlay">Draft</span>
                      )}
                    </div>
                    <div>
                      <p className="eyebrow">{art.category}</p>
                      <h3>{art.title}</h3>
                      {art.hero && art.hero !== "none" && (
                        <p className="form-hint">
                          Hero ·{" "}
                          {art.hero === "main" ? "large image" : "small image"}
                          {!art.published ? " (hidden)" : ""}
                        </p>
                      )}
                      <div className="admin-card-actions">
                        <button
                          className="text-link"
                          onClick={() =>
                            setEditor({ kind: "artwork", item: art })
                          }
                        >
                          <Pencil size={14} />
                          Edit piece
                        </button>
                        <div>
                          <button
                            className="icon-button"
                            aria-label={`${art.published ? "Hide" : "Publish"} ${art.title}`}
                            onClick={() =>
                              void save("artwork", {
                                ...art,
                                published: !art.published,
                              })
                            }
                          >
                            {art.published ? (
                              <Eye size={16} />
                            ) : (
                              <EyeOff size={16} />
                            )}
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Delete ${art.title}`}
                            onClick={() =>
                              setDeleting({
                                kind: "artwork",
                                id: art.id,
                                title: art.title,
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!data.artworks.length && (
                <EmptyState
                  icon={<ImagePlus />}
                  title="Your next gallery wall starts here."
                >
                  Upload a piece, give it a title, and share it with the world.
                </EmptyState>
              )}
            </>
          )}
          {section === "offerings" && (
            <div className="admin-offerings-list">
              {data.offerings.map((o) => (
                <article className="admin-offering" key={o.id}>
                  <img src={o.image} alt={o.title} />
                  <div>
                    <p className="eyebrow">{o.category}</p>
                    <h3>{o.title}</h3>
                    <p>{o.description}</p>
                    <strong>
                      {o.startingPrice
                        ? `From ${moneyLabel(o.startingPrice)}`
                        : "Price by request"}
                    </strong>
                  </div>
                  <div className="offering-controls">
                    <span
                      className={`status-badge ${o.published ? "published" : ""}`}
                    >
                      {o.published ? "Published" : "Draft"}
                    </span>
                    <button
                      className="button small"
                      onClick={() => setEditor({ kind: "offering", item: o })}
                    >
                      <Pencil size={14} />
                      Edit offering
                    </button>
                    <button
                      className="text-link danger-text"
                      onClick={() =>
                        setDeleting({
                          kind: "offering",
                          id: o.id,
                          title: o.title,
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {section === "homepage" && <HomepageEditor data={data} save={save} />}
          {section === "settings" && (
            <>
              <StudioSettings
                key={data.revision}
                settings={data.settings}
                save={save}
              />
              <section className="admin-card">
                <h2>Email delivery</h2>
                <p>
                  {data.emailConfigured
                    ? "Email sending is enabled."
                    : "Email sending is paused until Gmail is connected in Vercel."}
                </p>
                <p>
                  Confirmations and studio alerts are queued after submissions.
                  Class reminders go out about 24 hours before each session.
                  Refresh studio data to see the latest results.
                </p>
                {(data.emailJobs?.length ?? 0) > 0 ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Message</th>
                          <th>Reference</th>
                          <th>Status</th>
                          <th>Attempts</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {[...(data.emailJobs ?? [])]
                          .reverse()
                          .slice(0, 30)
                          .map((job) => (
                            <tr key={job.id}>
                              <td>
                                {job.kind.replaceAll("-", " ")}
                                {job.session && (
                                  <small>
                                    {job.session.replace("T", " ")} ET
                                  </small>
                                )}
                              </td>
                              <td>
                                {[
                                  ...data.registrations,
                                  ...data.inquiries,
                                ].find((item) => item.id === job.entityId)
                                  ?.reference ?? "Removed record"}
                              </td>
                              <td>
                                {job.state === "sent"
                                  ? "Accepted by Gmail"
                                  : job.state}
                                {job.error && <small>{job.error}</small>}
                              </td>
                              <td>{job.attempts}</td>
                              <td>
                                {job.state === "failed" && (
                                  <button
                                    className="button small"
                                    onClick={() =>
                                      void save("retry-email", { id: job.id })
                                    }
                                  >
                                    Retry email
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No emails have been queued yet.</p>
                )}
                <p className="form-hint">
                  Gmail acceptance does not guarantee inbox delivery. An
                  interrupted send can occasionally be retried twice; check
                  Gmail’s Sent folder before manually retrying an uncertain
                  delivery.
                </p>
              </section>
            </>
          )}
          <footer className="admin-footer">
            <span>Made with a little color & a lot of heart.</span>
            <span>{data.settings.location}</span>
          </footer>
        </main>
      </div>
      {editor && (
        <ItemEditor
          key={`${editor.kind}:${editor.item?.id ?? "new"}`}
          editor={editor}
          onCreateProgram={(draft) =>
            setEditor({ kind: "program", scheduleAfterSave: draft })
          }
          onProgramCreated={(programId) =>
            setEditor({
              kind: "event",
              item: { ...editor.scheduleAfterSave, programId },
            })
          }
          data={data}
          save={save}
          error={error}
          onClose={() => setEditor(null)}
        />
      )}{" "}
      {deleting && (
        <Modal
          title={
            deleting.kind === "registration"
              ? "Delete registration?"
              : "Remove from the studio?"
          }
          onClose={() => setDeleting(null)}
        >
          <div className="delete-dialog">
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <p>
              {deleting.kind === "registration" ? (
                <>
                  Permanently delete <strong>{deleting.title}</strong>? This
                  removes the customer and participant details, releases their
                  places, and removes queued emails and reminders. It cannot be
                  undone. Emails already sent cannot be recalled. No
                  cancellation email will be sent.
                </>
              ) : (
                <>
                  Remove <strong>{deleting.title}</strong>? Items with booking
                  history must be kept; you can hide those from the website
                  instead.
                </>
              )}
            </p>
            <div className="dialog-actions">
              <button
                className="button"
                disabled={deleteBusy}
                onClick={() => setDeleting(null)}
              >
                Keep it
              </button>
              <button
                className="button danger"
                disabled={deleteBusy}
                onClick={async () => {
                  setDeleteBusy(true);
                  try {
                    if (await save("delete", deleting)) setDeleting(null);
                  } finally {
                    setDeleteBusy(false);
                  }
                }}
              >
                {deleteBusy
                  ? "Removing…"
                  : deleting.kind === "registration"
                    ? "Delete registration"
                    : "Remove"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {registration && (
        <Modal
          title="Registration details"
          onClose={() => setRegistration(null)}
        >
          <div className="registration-details">
            <p className="eyebrow">{registration.reference}</p>
            <h3>{registration.customerName}</h3>
            <p>
              {data.events.find((e) => e.id === registration.eventId)?.title}
            </p>
            <dl>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${registration.email}`}>
                  {registration.email}
                </a>
              </dd>
              <dt>Phone</dt>
              <dd>{registration.phone || "Not provided"}</dd>
              <dt>Participants</dt>
              <dd>{registration.participants.join(", ")}</dd>
              <dt>Notes</dt>
              <dd>{registration.notes || "No notes"}</dd>
            </dl>
            <label>
              Status
              <select
                value={
                  data.registrations.find((r) => r.id === registration.id)
                    ?.status
                }
                onChange={(e) =>
                  void save("registration-status", {
                    id: registration.id,
                    status: e.target.value,
                  })
                }
              >
                <option value="reserved">Reserved</option>
                <option value="attended">Attended</option>
                <option value="cancelled">Cancelled · release places</option>
              </select>
            </label>
            <p className="form-hint">
              Cancelling releases the reserved places. No email is sent
              automatically.
            </p>
            <button
              className="button danger"
              onClick={() => {
                setError("");
                setDeleting({
                  kind: "registration",
                  id: registration.id,
                  title: `${registration.customerName} · ${registration.reference}`,
                });
                setRegistration(null);
              }}
            >
              Delete registration
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AdminCalendar({
  data,
  setEditor,
  remove,
}: {
  data: AdminData;
  setEditor: (editor: EditorState) => void;
  remove: (item: { kind: string; id: string; title: string }) => void;
}) {
  const today = studioNow().slice(0, 10);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const base = new Date(month + "-01T12:00:00Z");
  const offset = base.getUTCDay();
  const days = new Date(
    base.getUTCFullYear(),
    base.getUTCMonth() + 1,
    0,
  ).getDate();
  const onDay = (date: string) =>
    data.events.filter((e) => e.sessions.some((s) => s.date === date));
  const blocks = data.blocks.filter((b) => b.date === selected);
  function step(n: number) {
    const d = new Date(base);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
    setSelected(d.toISOString().slice(0, 10));
  }
  return (
    <>
      <section className="admin-calendar admin-panel">
        <div className="panel-heading">
          <h2>
            {dateLabel(month + "-01", {
              month: "long",
              year: "numeric",
              day: undefined,
            })}
          </h2>
          <div className="calendar-navigation">
            <button
              className="button small"
              onClick={() => {
                setMonth(today.slice(0, 7));
                setSelected(today);
              }}
            >
              Today
            </button>
            <button
              className="icon-button"
              aria-label="Previous month"
              onClick={() => step(-1)}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="icon-button"
              aria-label="Next month"
              onClick={() => step(1)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="admin-calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div className="calendar-weekday" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div className="calendar-blank" key={`blank-${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`;
            const events = onDay(date);
            const blocked = data.blocks.find((b) => b.date === date);
            return (
              <button
                key={date}
                className={`calendar-cell ${date === selected ? "selected" : ""} ${date === today ? "today" : ""}`}
                aria-pressed={date === selected}
                aria-label={`${dateLabel(date, { month: "long" })}, ${events.length} classes${blocked ? ", blocked" : ""}`}
                onClick={() => setSelected(date)}
              >
                <span className="calendar-day-number">{i + 1}</span>
                {events.slice(0, 2).map((e) => (
                  <span
                    className={`calendar-event ${data.programs.find((p) => p.id === e.programId)?.category}`}
                    key={e.id}
                  >
                    {e.title}
                  </span>
                ))}
                {events.length > 2 && <small>+{events.length - 2} more</small>}
                {blocked && (
                  <span
                    className={`calendar-event ${blocked.inquiryId ? "wedding" : "blocked"}`}
                  >
                    {blocked.inquiryId ? "Wedding hold" : blocked.reason}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="calendar-color-key">
          <span>
            <i className="children" />
            Little artists
          </span>
          <span>
            <i className="adult" />
            Paint nights
          </span>
          <span>
            <i className="workshop" />
            Workshops
          </span>
          <span>
            <i className="wedding" />
            Wedding / blocked
          </span>
        </div>
      </section>
      <section className="admin-panel day-agenda">
        <div className="panel-heading">
          <h2>{dateLabel(selected, { weekday: "long", month: "long" })}</h2>
          <button
            className="text-link"
            onClick={() =>
              setEditor({ kind: "event", item: { date: selected } })
            }
          >
            Add class
          </button>
          <button
            className="text-link"
            onClick={() =>
              setEditor({
                kind: "program",
                scheduleAfterSave: { date: selected },
              })
            }
          >
            New program & dates
          </button>
          <button
            className="text-link"
            onClick={() =>
              setEditor({ kind: "block", item: { date: selected } })
            }
          >
            <CalendarOff size={16} />
            Block this day
          </button>
        </div>
        {onDay(selected).map((event) => (
          <div className="day-agenda-row" key={event.id}>
            <span className="day-agenda-time">
              {event.sessions
                .filter((s) => s.date === selected)
                .map((s) => `${timeLabel(s.start)} – ${timeLabel(s.end)}`)
                .join(", ")}
            </span>
            <div>
              <h3>{event.title}</h3>
              <p>
                {seats(data, event.id)}/{event.capacity} places reserved ·{" "}
                {moneyLabel(event.price)} / person ·{" "}
                {event.published ? "Published" : "Draft"}
              </p>
            </div>
            <button
              className="icon-button"
              aria-label={`Edit ${event.title}`}
              onClick={() => setEditor({ kind: "event", item: event })}
            >
              <Pencil size={17} />
            </button>
            <button
              className="icon-button"
              aria-label={`Delete ${event.title}`}
              onClick={() =>
                remove({ kind: "event", id: event.id, title: event.title })
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {blocks.map((block) => (
          <div className="day-agenda-row" key={block.id}>
            <CalendarOff size={22} />
            <div>
              <h3>{block.reason}</h3>
              <p>Full day{block.inquiryId ? " · managed in Inquiries" : ""}</p>
            </div>
            {block.inquiryId ? (
              <Link className="text-link" href="/admin/inquiries">
                View inquiry <ArrowUpRight size={16} />
              </Link>
            ) : (
              <button
                className="text-link"
                onClick={() =>
                  remove({ kind: "block", id: block.id, title: block.reason })
                }
              >
                Release date
              </button>
            )}
          </div>
        ))}
        {!onDay(selected).length && !blocks.length && (
          <div className="open-day">
            <p>A little room to create. Nothing scheduled for this day.</p>
            <button
              className="button small"
              onClick={() =>
                setEditor({ kind: "event", item: { date: selected } })
              }
            >
              <Plus size={16} />
              Add a class
            </button>
          </div>
        )}
      </section>
    </>
  );
}
function StudioSettings({
  settings,
  save,
}: {
  settings: Settings;
  save: (action: string, payload: unknown) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    await save("settings", {
      name: form.get("name"),
      location: form.get("location"),
      tagline: form.get("tagline"),
      bio: form.get("bio"),
      contactEmail: form.get("contactEmail"),
      instagram: form.get("instagram"),
      bookingsOpen: form.has("bookingsOpen"),
    });
    setBusy(false);
  }
  return (
    <form className="studio-form settings-form" onSubmit={submit}>
      <section className="admin-panel settings-panel">
        <p className="eyebrow">A WARM WELCOME</p>
        <h2>Your studio details</h2>
        <div className="form-row">
          <label>
            Studio name
            <input
              name="name"
              defaultValue={settings.name}
              required
              maxLength={300}
            />
          </label>
          <label>
            Location
            <input
              name="location"
              defaultValue={settings.location}
              required
              maxLength={300}
            />
          </label>
        </div>
        <label>
          Studio tagline
          <input
            name="tagline"
            defaultValue={settings.tagline}
            required
            maxLength={300}
          />
        </label>
        <label>
          About Nong
          <textarea
            name="bio"
            defaultValue={settings.bio}
            required
            rows={7}
            maxLength={5000}
          />
        </label>
        <div className="form-row">
          <label>
            Public contact email <small>(optional)</small>
            <input
              type="email"
              name="contactEmail"
              defaultValue={settings.contactEmail}
            />
          </label>
          <label>
            Instagram URL <small>(optional)</small>
            <input
              type="url"
              name="instagram"
              defaultValue={settings.instagram}
              placeholder="https://www.instagram.com/…"
            />
          </label>
        </div>
      </section>
      <section className="admin-panel settings-panel">
        <p className="eyebrow">OPEN THE DOOR</p>
        <h2>Welcome new bookings</h2>
        <p>
          Review your programs, dates, capacities, and prices before opening the
          booking forms.
        </p>
        <label className="checkbox-label booking-toggle">
          <input
            type="checkbox"
            name="bookingsOpen"
            defaultChecked={settings.bookingsOpen}
          />
          <span>
            <strong>Open class registration & custom art inquiries</strong>
            <small>
              Customers can reserve places and request artwork. Wedding
              inquiries hold a full day. Payment is arranged with the studio.
            </small>
          </span>
        </label>
      </section>
      <div>
        <SubmitButton busy={busy}>
          Save studio settings <Check size={17} />
        </SubmitButton>
      </div>
    </form>
  );
}
