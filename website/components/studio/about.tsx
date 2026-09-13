"use client";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useStudio } from "./provider";
export function About() {
  const { data } = useStudio();
  return (
    <main id="main-content">
      <section className="about about-page wrap">
        <div className="about-image">
          <img
            src="/art/studio-art.webp"
            alt="An original painting by Nong, photographed in the studio"
          />
          <span className="handwritten">From my studio to your home.</span>
        </div>
        <div>
          <p className="eyebrow">THE ARTIST BEHIND THE EASEL</p>
          <h1>
            Hi, I’m Nong.
            <br />
            <em>
              Let’s make
              <br />
              something lovely.
            </em>
          </h1>
          <div className="bio-copy">
            {data.settings.bio
              .split("\n")
              .filter(Boolean)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
          </div>
          <p className="location-line">
            <MapPin size={17} />
            {data.settings.location}
          </p>
          <Link href="/classes" className="button dark">
            Come create with me <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="about-bottom">
        <div className="wrap">
          <p className="eyebrow">A LITTLE MORE ART IN EVERYDAY LIFE</p>
          <h2>
            For the joy of making.
            <br />
            <em>And the joy of keeping.</em>
          </h2>
          <Link className="text-link" href="/gallery">
            A look around my world <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
