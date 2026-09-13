"use client";
import Link from "next/link";
import { defaultHomepage } from "@/lib/model";
import { dateLabel, moneyLabel, sortedSessions, studioNow } from "@/lib/model";
import { useStudio } from "@/components/studio/provider";
import { ArrowUpRight, ArrowRight } from "lucide-react";
export default function Home() {
  const { data } = useStudio();
  const homepage = data.homepage ?? defaultHomepage;
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
            <p className="eyebrow">ART FOR THE EVERYDAY & THE EXTRAORDINARY</p>
            <h1>
              A little color.
              <br />A lot of <em>joy.</em>
            </h1>
            <p className="intro">
              A welcoming space to get creative. A hand-painted piece to hold
              close. Come find a little art that feels like you.
            </p>
            <div className="hero-actions">
              <Link className="button dark" href="/classes">
                Make something with me <ArrowUpRight size={18} />
              </Link>
              <Link className="text-link" href="/gallery">
                Explore my work <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-note">
              <span>Made by hand.</span>
              <span>Always from the heart.</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-caption">FROM NONG’S EASEL, WITH LOVE</div>
            <img
              className="hero-painting"
              src={mainHero?.image ?? "/art/floral.webp"}
              alt={
                mainHero?.title ??
                "Nong’s acrylic painting of white flowers and green leaves"
              }
            />
            <div className="sketch-frame">
              <img
                src={accentHero?.image ?? "/art/cat-sketch.webp"}
                alt={
                  accentHero?.title ??
                  "Nong’s expressive ink and watercolor cat sketch"
                }
              />
              <span>
                {accentHero?.title ?? "Little lines, big personality."}
              </span>
            </div>
            <div className="art-seal">
              a little
              <br />
              <em>handmade</em>
              <br />
              happiness
            </div>
          </div>
        </section>
        <section className="offerings wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{homepage.eyebrow}</p>
              <h2>{homepage.heading}</h2>
            </div>
            <span className="handwritten">{homepage.subtitle}</span>
          </div>
          <div className="offering-grid">
            {homepage.cards.map((o, index) => (
              <Link href={o.link} className="offering-card" key={index}>
                <div className="card-image">
                  <img src={o.image} alt={o.title} />
                  <span>{o.tag}</span>
                </div>
                <div className="card-copy">
                  <p className="card-number">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3>{o.title}</h3>
                  <p>{o.text}</p>
                  <div className="card-link">
                    {o.cta}
                    <ArrowUpRight size={20} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="gallery-strip">
          <div className="wrap">
            <div className="section-heading">
              <div>
                <p className="eyebrow">A FEW THINGS FROM MY WORLD</p>
                <h2>From the studio.</h2>
              </div>
              <Link className="text-link" href="/gallery">
                Visit the gallery <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="art-grid">
              {data.artworks
                .filter((a) => a.featured)
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
            <p className="eyebrow">COMING UP IN THE STUDIO</p>
            <h2>What we’re painting next</h2>
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
              src="/art/studio-art.webp"
              alt="An original painting by Nong, pictured in the studio"
            />
            <span className="handwritten">From my studio to your home.</span>
          </div>
          <div>
            <p className="eyebrow">THE ARTIST BEHIND THE EASEL</p>
            <h2>
              Hi, I’m Nong.
              <br />
              <em>
                Let’s bring a little
                <br />
                more art into your life.
              </em>
            </h2>
            {data.settings.bio
              .split("\n")
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            <Link href="/commissions" className="text-link">
              Let’s create something together <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
