"use client";
import Link from "next/link";
import { defaultHomepage } from "@/lib/model";
import { dateLabel, moneyLabel, sortedSessions, studioNow } from "@/lib/model";
import type { PublicStudio, Homepage } from "@/lib/model";
import { homepageCopyDefaults } from "@/lib/model";
import { ArrowUpRight, ArrowRight } from "lucide-react";
export function HomeContent({
  data,
  homepage = data.homepage ?? defaultHomepage,
  edit,
}: {
  data: PublicStudio;
  homepage?: Homepage;
  edit?: (path: string, kind: "text" | "image" | "link") => void;
}) {
  const copy = { ...homepageCopyDefaults, ...homepage.copy };
  const editable = (
    path: string,
    value: string,
    kind: "text" | "image" | "link" = "text",
    display?: React.ReactNode,
  ) =>
    edit ? (
      <span
        className="home-editable"
        role="button"
        tabIndex={0}
        aria-label={`Edit ${path}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          edit(path, kind);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            edit(path, kind);
          }
        }}
      >
        {display ?? value}
      </span>
    ) : (
      (display ?? value)
    );
  const t = (key: keyof typeof homepageCopyDefaults) =>
    editable(`copy.${key}`, copy[key]);
  const editImage = (path: string) =>
    edit ? (
      <button
        type="button"
        className="home-image-edit"
        onClick={() => edit(path, "image")}
      >
        Change image
      </button>
    ) : null;
  const upcoming = data.events
    .filter((event) => {
      const first = sortedSessions(event)[0];
      return first && `${first.date}T${first.start}` > studioNow();
    })
    .sort((a, b) =>
      sortedSessions(a)[0].date.localeCompare(sortedSessions(b)[0].date),
    )
    .slice(0, 3);
  const mainHero = data.artworks.find((art) => art.hero === "main");
  const accentHero = data.artworks.find((art) => art.hero === "accent");
  return (
    <>
      <main id="main-content">
        <section className="hero wrap">
          <div className="hero-copy">
            <p className="eyebrow">{t("heroEyebrow")}</p>
            <h1 style={{ whiteSpace: "pre-line" }}>
              {editable(
                "copy.heroHeading",
                copy.heroHeading,
                "text",
                copy.heroHeading === homepageCopyDefaults.heroHeading ? (
                  <>
                    A little color.
                    <br />A lot of <em>joy.</em>
                  </>
                ) : undefined,
              )}
            </h1>
            <p className="intro">{t("heroIntro")}</p>
            <div className="hero-actions">
              <Link className="button dark" href="/classes">
                {t("heroPrimary")} <ArrowUpRight size={18} />
              </Link>
              <Link className="text-link" href="/gallery">
                {t("heroSecondary")} <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-note">
              <span>{t("heroNote")}</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-caption">{t("heroCaption")}</div>
            <img
              className="hero-painting"
              src={homepage.heroMain ?? mainHero?.image ?? "/art/floral.webp"}
              alt={
                homepage.heroMainAlt ??
                mainHero?.title ??
                "Nong’s acrylic painting of white flowers and green leaves"
              }
            />
            {editImage("heroMain")}
            <div className="sketch-frame">
              <img
                src={
                  homepage.heroAccent ??
                  accentHero?.image ??
                  "/art/cat-sketch.webp"
                }
                alt={
                  homepage.heroAccentAlt ??
                  accentHero?.title ??
                  "Nong’s expressive ink and watercolor cat sketch"
                }
              />
              <span>
                {editable(
                  "copy.accentCaption",
                  homepage.copy?.accentCaption ??
                    accentHero?.title ??
                    copy.accentCaption,
                )}
              </span>
            </div>
            {editImage("heroAccent")}
            <div className="art-seal" style={{ whiteSpace: "pre-line" }}>
              {t("heroSeal")}
            </div>
          </div>
        </section>
        <section className="offerings wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{editable("eyebrow", homepage.eyebrow)}</p>
              <h2>{editable("heading", homepage.heading)}</h2>
            </div>
            <span className="handwritten">
              {editable("subtitle", homepage.subtitle)}
            </span>
          </div>
          <div className="offering-grid">
            {homepage.cards.map((o, index) => (
              <article className="offering-card" key={index}>
                <div className="card-image">
                  <Link href={o.link}>
                    <img src={o.image} alt={o.title} />
                  </Link>
                  <span>{editable(`cards.${index}.tag`, o.tag)}</span>
                  {editImage(`cards.${index}.image`)}
                </div>
                <div className="card-copy">
                  <p className="card-number">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3>{editable(`cards.${index}.title`, o.title)}</h3>
                  <p>{editable(`cards.${index}.text`, o.text)}</p>
                  <Link href={o.link} className="card-link">
                    {editable(`cards.${index}.cta`, o.cta)}{" "}
                    <ArrowUpRight size={20} />
                  </Link>
                  {edit && (
                    <button
                      type="button"
                      className="home-link-edit"
                      onClick={() => edit(`cards.${index}.link`, "link")}
                    >
                      Edit destination
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="gallery-strip">
          <div className="wrap">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t("galleryEyebrow")}</p>
                <h2>{t("galleryHeading")}</h2>
                {edit && (
                  <button
                    className="home-link-edit"
                    onClick={() => edit("featuredArt", "text")}
                  >
                    Choose featured artwork
                  </button>
                )}
              </div>
              <Link className="text-link" href="/gallery">
                {t("galleryLink")} <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="art-grid">
              {(homepage.featuredArtworkIds
                ? homepage.featuredArtworkIds
                    .map((id) => data.artworks.find((a) => a.id === id))
                    .filter((a): a is PublicStudio["artworks"][number] => !!a)
                : data.artworks.filter((a) => a.featured)
              )
                .slice(0, 4)
                .map((a) => (
                  <Link href="/gallery" key={a.id}>
                    <img src={a.image} alt={a.title} />
                    <h3>{a.title}</h3>
                    <p>{a.category}</p>
                  </Link>
                ))}
            </div>
          </div>
        </section>
        {upcoming.length > 0 && (
          <section className="wrap page-space">
            <p className="eyebrow">{t("upcomingEyebrow")}</p>
            <h2>{t("upcomingHeading")}</h2>
            <div className="classes-grid">
              {upcoming.map((event) => {
                const program = data.programs.find(
                  (p) => p.id === event.programId,
                );
                return (
                  <article className="class-card" key={event.id}>
                    <Link
                      className="class-card-image"
                      href={`/classes/${event.id}`}
                    >
                      <img
                        src={event.image ?? program?.image}
                        alt={event.title}
                      />
                    </Link>
                    <div className="class-card-content">
                      <p className="eyebrow">{program?.title}</p>
                      <h3>{event.title}</h3>
                      <p>
                        {sortedSessions(event)
                          .map((s) => dateLabel(s.date))
                          .join(" & ")}
                      </p>
                      <p>
                        {moneyLabel(event.price)} ·{" "}
                        {event.seatsRemaining > 0
                          ? `${event.seatsRemaining} places left`
                          : "Fully booked"}
                      </p>
                      <Link className="text-link" href={`/classes/${event.id}`}>
                        View class <ArrowUpRight size={16} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        <section id="about" className="about wrap">
          <div className="about-image">
            <img
              src={homepage.aboutImage ?? "/art/studio-art.webp"}
              alt={
                homepage.aboutImageAlt ??
                "An original painting by Nong, pictured in the studio"
              }
            />
            {editImage("aboutImage")}
            <span className="handwritten">{t("aboutCaption")}</span>
          </div>
          <div>
            <p className="eyebrow">{t("aboutEyebrow")}</p>
            <h2 style={{ whiteSpace: "pre-line" }}>{t("aboutHeading")}</h2>
            <div style={{ whiteSpace: "pre-line" }}>
              {editable("aboutBio", homepage.aboutBio ?? data.settings.bio)}
            </div>
            <Link href="/commissions" className="text-link">
              {t("aboutLink")} <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
