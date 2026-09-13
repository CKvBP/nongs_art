"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Expand, Images } from "lucide-react";
import type { Artwork } from "@/lib/model";
import { useStudio } from "./provider";
import { EmptyState, Modal, PageIntro } from "./shared";
export function Gallery() {
  const { data } = useStudio();
  const [category, setCategory] = useState("All work");
  const [selected, setSelected] = useState<Artwork | null>(null);
  const categories = [
    "All work",
    ...new Set(data.artworks.map((a) => a.category)),
  ];
  const works = data.artworks.filter(
    (a) => category === "All work" || a.category === category,
  );
  return (
    <main id="main-content" className="wrap">
      <div className="gallery-page-head">
        <PageIntro
          eyebrow="A FEW THINGS FROM MY WORLD"
          title={
            <>
              Made by hand.
              <br />
              <em>Always from the heart.</em>
            </>
          }
        >
          Paintings, playful lines, and little keepsakes. Every piece starts
          with something worth noticing.
        </PageIntro>
        <span className="handwritten">Come take a closer look.</span>
      </div>
      <div className="filter-pills gallery-filters" aria-label="Filter artwork">
        {categories.map((c) => (
          <button
            key={c}
            aria-pressed={c === category}
            onClick={() => setCategory(c)}
            className={c === category ? "active" : ""}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="gallery-masonry">
        {works.map((art) => (
          <button
            className="gallery-item"
            key={art.id}
            onClick={() => setSelected(art)}
            aria-label={`View ${art.title}`}
          >
            <div className="gallery-photo">
              <img src={art.image} alt={art.title} loading="lazy" />
              <span className="expand-art">
                <Expand size={18} />
              </span>
            </div>
            <div className="gallery-caption">
              <h3>{art.title}</h3>
              <p>{art.category}</p>
            </div>
          </button>
        ))}
      </div>
      {works.length === 0 && (
        <EmptyState icon={<Images />} title="Something lovely is on its way.">
          New work will appear here soon.
        </EmptyState>
      )}
      <div className="gallery-commission-cta">
        <span className="handwritten">Have something in mind?</span>
        <h2>Let’s make it personal.</h2>
        <p>Your people, your places, your little everyday joys.</p>
        <Link className="button dark" href="/commissions">
          Explore custom art <ArrowUpRight size={18} />
        </Link>
      </div>
      {selected && (
        <Modal title={selected.title} wide onClose={() => setSelected(null)}>
          <div className="art-lightbox">
            <img src={selected.image} alt={selected.title} />
            <div>
              <p className="eyebrow">{selected.category}</p>
              <p>{selected.description}</p>
              <Link
                className="text-link"
                href="/commissions"
                onClick={() => setSelected(null)}
              >
                A piece of your own <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
