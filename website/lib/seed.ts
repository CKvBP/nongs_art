import type { StudioData } from "./model";
import { studioNow } from "./model";

export function createSeed(): StudioData {
  const day = new Date(studioNow().slice(0, 10) + "T12:00:00Z");
  day.setUTCDate(day.getUTCDate() + ((8 - day.getUTCDay()) % 7 || 7));
  const date = (offset: number) => {
    const d = new Date(day);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  return {
    revision: 0,
    settings: {
      name: "Nong’s Art Den",
      location: "Aiken, SC",
      tagline: "A little art. A little connection. A lot of heart.",
      bio: "My world is full of paintings, playful sketches, and the little details that make something personal. I create custom pieces to celebrate the people, pets, and places you love.\n\nAnd I love making room for your creativity, too. Join me for children’s classes or an evening of painting and good company.",
      contactEmail: "",
      instagram: "",
      bookingsOpen: false,
    },
    programs: [
      {
        id: "little-artists",
        title: "Little artists club",
        category: "children",
        description:
          "A welcoming place for curious minds and colorful ideas. Explore painting, drawing, and new ways to make art in a small, encouraging group. One weekly registration includes both sessions.",
        image: "/art/kids.webp",
        price: 65,
        capacity: 8,
        durationNote: "Two sessions · one creative week",
        published: true,
      },
      {
        id: "paint-unwind",
        title: "Paint & unwind",
        category: "adult",
        description:
          "Settle in for an easygoing evening of painting, conversation, drinks, and snacks. I’ll guide you from the first brushstroke to a piece that is all your own. Beginners are warmly welcome.",
        image: "/art/moonlight.webp",
        price: 45,
        capacity: 12,
        durationNote: "An evening of painting & good company",
        published: true,
      },
      {
        id: "seasonal-workshop",
        title: "Seasonal studio workshop",
        category: "workshop",
        description:
          "Make a little handmade happiness for the season. A relaxed, guided workshop for creating a keepsake to give or keep.",
        image: "/art/seasonal-ornament.webp",
        price: 40,
        capacity: 10,
        durationNote: "A special day in the studio",
        published: false,
      },
    ],
    events: [0, 7].flatMap((week, index) => [
      {
        id: `kids-mw-${index}`,
        programId: "little-artists",
        title: "Little artists · Monday & Wednesday",
        price: 65,
        capacity: 8,
        sessions: [
          { date: date(week), start: "15:00", end: "17:00" },
          { date: date(week + 2), start: "15:00", end: "17:00" },
        ],
        published: true,
      },
      {
        id: `kids-tt-${index}`,
        programId: "little-artists",
        title: "Little artists · Tuesday & Thursday",
        price: 65,
        capacity: 8,
        sessions: [
          { date: date(week + 1), start: "15:00", end: "17:00" },
          { date: date(week + 3), start: "15:00", end: "17:00" },
        ],
        published: true,
      },
      {
        id: `paint-${index}`,
        programId: "paint-unwind",
        title: "Friday paint & unwind",
        price: 45,
        capacity: 12,
        sessions: [{ date: date(week + 4), start: "17:00", end: "20:00" }],
        published: true,
      },
    ]),
    artworks: [
      [
        "floral",
        "In full bloom",
        "Paintings",
        "White blossoms, lush greens, and a little stillness.",
      ],
      [
        "cat-sketch",
        "A face full of character",
        "Scribbles",
        "Expressive little lines for a much-loved companion.",
      ],
      [
        "mermaid",
        "A world of imagination",
        "Paintings",
        "Color, wonder, and a story beneath the surface.",
      ],
      [
        "house-ornaments",
        "Home for the holidays",
        "Ornaments",
        "A favorite place, painted by hand to keep close.",
      ],
      [
        "landscape",
        "A little room to wander",
        "Paintings",
        "A moment outside, captured in color.",
      ],
      [
        "pet-ornaments",
        "The ones we love",
        "Ornaments",
        "Small keepsakes with a whole lot of personality.",
      ],
      [
        "house-sketch",
        "Home, in a few little lines",
        "Scribbles",
        "An expressive sketch of a place that matters.",
      ],
      [
        "family-sketch",
        "Together, always",
        "Scribbles",
        "People and moments worth remembering.",
      ],
      [
        "owl",
        "A wise little artist",
        "Little artists",
        "An example of the playful projects we can explore.",
      ],
    ].map(([key, title, category, description], i) => ({
      id: key,
      title,
      category: category as StudioData["artworks"][number]["category"],
      description,
      image: `/art/${key}.webp`,
      published: true,
      featured: i < 4,
    })),
    offerings: [
      {
        id: "custom-ornaments",
        title: "Little keepsakes, big meaning.",
        category: "ornament",
        description:
          "Hand-painted ornaments of beloved pets, favorite homes, and seasonal moments. Thoughtful gifts, made personal.",
        image: "/art/pet-ornaments.webp",
        startingPrice: 0,
        published: true,
      },
      {
        id: "wedding-painting",
        title: "Your day, forever in color.",
        category: "wedding",
        description:
          "A painting that celebrates your wedding day and the people who make it yours. Let’s talk about your vision, your venue, and the moment you want to remember.",
        image: "/art/floral.webp",
        startingPrice: 0,
        published: true,
      },
      {
        id: "scribbles",
        title: "A few lines. So much life.",
        category: "scribble",
        description:
          "Quick, expressive sketches that find the personality in your favorite faces, furry friends, and places.",
        image: "/art/dog-sketch.webp",
        startingPrice: 0,
        published: true,
      },
      {
        id: "acrylic-painting",
        title: "Something to make a room yours.",
        category: "acrylic",
        description:
          "An original acrylic painting, created around your story. From a favorite landscape to a playful idea, we’ll find the color in it together.",
        image: "/art/landscape.webp",
        startingPrice: 0,
        published: true,
      },
    ],
    blocks: [],
    registrations: [],
    inquiries: [],
    loginAttempts: {},
  };
}
