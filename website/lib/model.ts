import { z } from "zod";

const text = z.string().trim().min(1).max(300);
const image = z
  .string()
  .max(2000)
  .refine(
    (value) =>
      /^\/(art|uploads)\/[a-zA-Z0-9._-]+$/.test(value) ||
      /^https:\/\/[^\s]+$/.test(value),
    "Choose an image or upload one.",
  );
const id = z.string().min(1).max(100);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    "Enter a valid date.",
  );
const money = z.number().min(0).max(100000).multipleOf(0.01);
export const programSchema = z.object({
  id,
  title: text,
  category: z.enum(["children", "adult", "workshop"]),
  description: z.string().trim().min(1).max(3000),
  image,
  price: money,
  capacity: z.number().int().min(1).max(200),
  durationNote: text,
  published: z.boolean(),
});
export const sessionSchema = z
  .object({
    date: dateSchema,
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .refine((s) => s.end > s.start, "End time must be after start time.");
export const eventSchema = z.object({
  id,
  image: image.optional(),
  description: z.string().trim().max(3000).optional(),
  programId: id,
  title: text,
  price: money,
  capacity: z.number().int().min(1).max(200),
  sessions: z.array(sessionSchema).min(1).max(14),
  published: z.boolean(),
});
export const artworkSchema = z.object({
  id,
  title: text,
  category: z.enum(["Paintings", "Scribbles", "Ornaments", "Little artists"]),
  description: z.string().trim().max(3000),
  image,
  featured: z.boolean(),
  hero: z.enum(["none", "main", "accent"]).optional(),
  published: z.boolean(),
});
export const offeringSampleSchema = z.object({
  image,
  caption: z.string().trim().max(300),
});
export const offeringSchema = z.object({
  samples: z.array(offeringSampleSchema).max(12).optional(),
  id,
  title: text,
  category: z.enum(["ornament", "wedding", "scribble", "acrylic", "art-class"]),
  description: z.string().trim().min(1).max(3000),
  image,
  startingPrice: money,
  published: z.boolean(),
});
export const homepageCopyDefaults = {
  heroEyebrow: "ART FOR THE EVERYDAY & THE EXTRAORDINARY",
  heroHeading: "A little color.\nA lot of joy.",
  heroIntro:
    "A welcoming space to get creative. A hand-painted piece to hold close. Come find a little art that feels like you.",
  heroPrimary: "Make something with me",
  heroSecondary: "Explore my work",
  heroNote: "Made by hand. Always from the heart.",
  heroCaption: "FROM NONG’S EASEL, WITH LOVE",
  accentCaption: "Little lines, big personality.",
  heroSeal: "a little\nhandmade\nhappiness",
  galleryEyebrow: "A FEW THINGS FROM MY WORLD",
  galleryHeading: "From the studio.",
  galleryLink: "Visit the gallery",
  upcomingEyebrow: "COMING UP IN THE STUDIO",
  upcomingHeading: "What we’re painting next",
  aboutCaption: "From my studio to your home.",
  aboutEyebrow: "THE ARTIST BEHIND THE EASEL",
  aboutHeading: "Hi, I’m Nong.\nLet’s bring a little more art into your life.",
  aboutLink: "Let’s create something together",
};
export const homepageSchema = z.object({
  featuredArtworkIds: z.array(id).max(4).optional(),
  copy: z.record(z.string().trim().min(1).max(5000)).optional(),
  heroMain: image.optional(),
  heroAccent: image.optional(),
  aboutImage: image.optional(),
  heroMainAlt: text.optional(),
  heroAccentAlt: text.optional(),
  aboutImageAlt: text.optional(),
  aboutBio: z.string().trim().min(1).max(5000).optional(),
  eyebrow: text,
  heading: text,
  subtitle: text,
  cards: z
    .array(
      z.object({
        title: text,
        text: z.string().trim().min(1).max(1000),
        image,
        tag: text,
        cta: text,
        link: z
          .string()
          .trim()
          .max(2000)
          .refine(
            (value) =>
              /^\/(?!\/)[^\s\\]*$/.test(value) ||
              /^https:\/\/[^\s]+$/.test(value),
            "Use a site path such as /classes or an https:// link.",
          ),
      }),
    )
    .length(3),
});
export type Homepage = z.infer<typeof homepageSchema>;
export const defaultHomepage: Homepage = {
  eyebrow: "THERE’S A LITTLE SOMETHING FOR EVERYONE",
  heading: "Find your kind of creative.",
  subtitle: "Let’s make something lovely.",
  cards: [
    {
      title: "Little artists, big imaginations.",
      text: "After-school art adventures, one creative week at a time.",
      image: "/art/kids.webp",
      link: "/classes?type=children",
      cta: "Children’s art classes",
      tag: "MAKE & EXPLORE",
    },
    {
      title: "A night to paint & unwind.",
      text: "Good company, a little color, drinks, and snacks.",
      image: "/art/moonlight.webp",
      link: "/classes?type=adult",
      cta: "Adult paint nights",
      tag: "SIP & CREATE",
    },
    {
      title: "Your story, made into art.",
      text: "Beloved pets, favorite places, and moments worth keeping.",
      image: "/art/pet-ornaments.webp",
      link: "/commissions",
      cta: "Something just for you",
      tag: "GIVE & KEEP",
    },
  ],
};
export const settingsSchema = z.object({
  name: text,
  location: text,
  tagline: text,
  bio: z.string().trim().min(1).max(5000),
  contactEmail: z.union([z.literal(""), z.string().email().max(254)]),
  instagram: z.union([z.literal(""), z.string().url().startsWith("https://")]),
  bookingsOpen: z.boolean(),
});
export const blockSchema = z.object({ id, date: dateSchema, reason: text });
const contact = {
  customerName: text,
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30),
  website: z.string().max(0).optional(),
  requestId: z.string().uuid(),
};
export const registrationInputSchema = z.object({
  ...contact,
  eventId: id,
  participants: z.array(text).min(1).max(20),
  notes: z.string().trim().max(2000),
});
export const inquiryInputSchema = z.object({
  ...contact,
  offeringId: id,
  date: z.union([z.literal(""), dateSchema]),
  description: z.string().trim().min(10).max(4000),
});
export type Program = z.infer<typeof programSchema>;
export type StudioEvent = z.infer<typeof eventSchema>;
export type Artwork = z.infer<typeof artworkSchema>;
export type Offering = z.infer<typeof offeringSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type DayBlock = z.infer<typeof blockSchema> & { inquiryId?: string };
export type Registration = Omit<
  z.infer<typeof registrationInputSchema>,
  "website" | "requestId"
> & {
  id: string;
  reference: string;
  status: "reserved" | "attended" | "cancelled";
  createdAt: string;
};
export type ReferencePhoto = {
  id: string;
  name: string;
  storage: "local" | "blob";
  key: string;
};
export type Inquiry = Omit<
  z.infer<typeof inquiryInputSchema>,
  "website" | "requestId"
> & {
  id: string;
  reference: string;
  status: "new" | "accepted" | "completed" | "declined";
  photos?: ReferencePhoto[];
  createdAt: string;
};
export type StudioData = {
  adminRevision?: number;
  homepage?: Homepage;
  homepageDraft?: Homepage;
  emailJobs?: import("./notifications").EmailJob[];
  revision: number;
  settings: Settings;
  programs: Program[];
  events: StudioEvent[];
  artworks: Artwork[];
  offerings: Offering[];
  blocks: DayBlock[];
  registrations: Registration[];
  inquiries: Inquiry[];
  loginAttempts: Record<string, { count: number; until: number }>;
};
export type PublicStudio = Pick<
  StudioData,
  "settings" | "programs" | "artworks" | "offerings" | "homepage"
> & {
  events: (StudioEvent & { seatsRemaining: number })[];
  blockedDates: string[];
};
export const moneyLabel = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
export function dateLabel(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...options,
  });
}
export function timeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}${m ? ":" + String(m).padStart(2, "0") : ""} ${h >= 12 ? "PM" : "AM"}`;
}
export function studioNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (key: string) => parts.find((p) => p.type === key)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
export function sortedSessions(event: StudioEvent) {
  return [...event.sessions].sort((a, b) =>
    `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`),
  );
}
