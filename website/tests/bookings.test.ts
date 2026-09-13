import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createSeed } from "../lib/seed";
import {
  adminMutation,
  occupiedSeats,
  publicStudio,
  requestArt,
  reserveClass,
} from "../lib/domain";
import { dateSchema } from "../lib/model";

function studio() {
  const data = createSeed();
  data.settings.bookingsOpen = true;
  return data;
}
function booking(eventId = "kids-mw-0", count = 1) {
  return {
    requestId: randomUUID(),
    eventId,
    customerName: "Test Parent",
    email: "parent@example.test",
    phone: "",
    participants: Array.from({ length: count }, (_, i) => `Artist ${i + 1}`),
    notes: "",
  };
}
function wedding(date = "2099-10-10") {
  return {
    requestId: randomUUID(),
    offeringId: "wedding-painting",
    customerName: "Test Couple",
    email: "couple@example.test",
    phone: "",
    date,
    description: "A wedding painting at our venue.",
  };
}

test("a weekly registration reserves one place across both sessions", () => {
  const data = studio();
  const input = booking();
  reserveClass(data, input);
  assert.equal(data.registrations.length, 1);
  assert.equal(data.events[0].sessions.length, 2);
  assert.equal(occupiedSeats(data, input.eventId), 1);
  assert.equal(publicStudio(data).events[0].seatsRemaining, 7);
});
test("the last seats cannot be oversold and cancelled seats become available", () => {
  const data = studio();
  const input = booking("kids-mw-0", 8);
  reserveClass(data, input);
  assert.throws(() => reserveClass(data, booking()), /enough seats/);
  adminMutation(data, "registration-status", {
    id: input.requestId,
    status: "cancelled",
  });
  assert.equal(occupiedSeats(data, input.eventId), 0);
  reserveClass(data, booking("kids-mw-0", 8));
  assert.throws(
    () =>
      adminMutation(data, "registration-status", {
        id: input.requestId,
        status: "reserved",
      }),
    /enough available seats/,
  );
});
test("retrying the same submission does not reserve twice", () => {
  const data = studio();
  const input = booking();
  const first = reserveClass(data, input);
  assert.deepEqual(reserveClass(data, input), first);
  assert.equal(occupiedSeats(data, input.eventId), 1);
});
test("capacity cannot be reduced below existing reservations", () => {
  const data = studio();
  reserveClass(data, booking("kids-mw-0", 3));
  assert.throws(
    () => adminMutation(data, "event", { ...data.events[0], capacity: 2 }),
    /Capacity cannot be lower/,
  );
});
test("wedding requests hold the whole day and declining releases it", () => {
  const data = studio();
  const input = wedding();
  const result = requestArt(data, input);
  assert.deepEqual(requestArt(data, input), result);
  assert.equal(data.blocks.length, 1);
  assert.throws(() => requestArt(data, wedding()), /already reserved/);
  assert.throws(
    () =>
      adminMutation(data, "event", {
        ...data.events[0],
        id: "new-class",
        sessions: [{ date: input.date, start: "10:00", end: "11:00" }],
      }),
    /day is blocked/,
  );
  adminMutation(data, "inquiry-status", {
    id: input.requestId,
    status: "declined",
  });
  assert.equal(data.blocks.length, 0);
  requestArt(data, wedding());
  assert.equal(data.blocks.length, 1);
  assert.throws(
    () =>
      adminMutation(data, "inquiry-status", {
        id: input.requestId,
        status: "accepted",
      }),
    /since been reserved/,
  );
});
test("weddings cannot displace classes or personal day blocks", () => {
  const data = studio();
  assert.throws(
    () => requestArt(data, wedding(data.events[0].sessions[0].date)),
    /already reserved/,
  );
  adminMutation(data, "block", {
    id: "away",
    date: "2099-09-09",
    reason: "Away",
  });
  assert.throws(
    () => requestArt(data, wedding("2099-09-09")),
    /already reserved/,
  );
});
test("overlapping sessions are rejected while adjacent sessions are allowed", () => {
  const data = studio();
  const original = data.events[0];
  assert.throws(
    () => adminMutation(data, "event", { ...original, id: "overlap" }),
    /overlaps/,
  );
  adminMutation(data, "event", {
    ...original,
    id: "adjacent",
    sessions: [{ ...original.sessions[0], start: "17:00", end: "18:00" }],
  });
  assert.ok(data.events.some((e) => e.id === "adjacent"));
});
test("private customer data and calendar notes never enter public data", () => {
  const data = studio();
  reserveClass(data, booking());
  requestArt(data, wedding());
  data.loginAttempts.secret = { count: 1, until: Date.now() };
  const result = JSON.stringify(publicStudio(data));
  assert.ok(!result.includes("parent@example.test"));
  assert.ok(!result.includes("couple@example.test"));
  assert.ok(!result.includes("loginAttempts"));
  assert.ok(!result.includes("Wedding inquiry"));
  assert.ok(result.includes("2099-10-10"));
});
test("hidden programs and closed registration cannot accept new bookings", () => {
  const data = studio();
  data.settings.bookingsOpen = false;
  assert.throws(() => reserveClass(data, booking()), /not open/);
  assert.throws(() => requestArt(data, wedding()), /not open/);
  data.settings.bookingsOpen = true;
  data.programs[0].published = false;
  assert.equal(
    publicStudio(data).events.filter((e) => e.programId === "little-artists")
      .length,
    0,
  );
  assert.throws(() => reserveClass(data, booking()), /no longer available/);
});
test("invalid dates and empty participant names are rejected", () => {
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(dateSchema.safeParse("2028-02-29").success, true);
  const data = studio();
  assert.throws(() =>
    reserveClass(data, { ...booking(), participants: [" "] }),
  );
});
test("program defaults do not rewrite already scheduled classes", () => {
  const data = studio();
  const price = data.events[0].price;
  adminMutation(data, "program", {
    ...data.programs[0],
    price: 99,
    capacity: 20,
  });
  assert.equal(data.events[0].price, price);
  assert.equal(data.events[0].capacity, 8);
});
test("booking history cannot be orphaned by deleting its class or offering", () => {
  const data = studio();
  reserveClass(data, booking());
  requestArt(data, wedding());
  assert.throws(
    () => adminMutation(data, "delete", { kind: "event", id: "kids-mw-0" }),
    /registration history/,
  );
  assert.throws(
    () =>
      adminMutation(data, "delete", {
        kind: "offering",
        id: "wedding-painting",
      }),
    /has inquiries/,
  );
});

test("hero assignments replace only their own position and hidden art stays private", () => {
  const data = studio();
  const [first, second, third] = data.artworks;
  adminMutation(data, "artwork", { ...first, hero: "main" });
  adminMutation(data, "artwork", { ...second, hero: "accent" });
  adminMutation(data, "artwork", { ...third, hero: "main" });
  assert.equal(data.artworks.find((a) => a.id === first.id)?.hero, "none");
  assert.equal(data.artworks.find((a) => a.id === second.id)?.hero, "accent");
  assert.equal(
    publicStudio(data).artworks.find((a) => a.hero === "main")?.id,
    third.id,
  );
  adminMutation(data, "artwork", { ...third, hero: "main", published: false });
  assert.equal(
    publicStudio(data).artworks.find((a) => a.hero === "main"),
    undefined,
  );
  adminMutation(data, "artwork", { ...second, hero: "none" });
  assert.equal(
    publicStudio(data).artworks.find((a) => a.hero === "accent"),
    undefined,
  );
  assert.throws(() =>
    adminMutation(data, "artwork", { ...first, hero: "invalid" }),
  );
});

test("weekly painting details persist independently of program defaults and drafts stay private", () => {
  const data = studio();
  const original = data.events[0];
  const program = data.programs.find((p) => p.id === original.programId)!;
  const registration = reserveClass(data, booking(original.id));
  adminMutation(data, "event", {
    ...original,
    image: "/art/floral.webp",
    description: "Paint sunflowers this week.",
    title: "Sunflower Week",
    published: true,
  });
  adminMutation(data, "program", {
    ...program,
    description: "New default description",
    image: "/art/studio-art.webp",
  });
  const visible = publicStudio(data).events.find((e) => e.id === original.id)!;
  assert.equal(visible.description, "Paint sunflowers this week.");
  assert.equal(visible.image, "/art/floral.webp");
  assert.equal(visible.seatsRemaining, original.capacity - 1);
  assert.equal(data.registrations[0].reference, registration.reference);
  adminMutation(data, "event", { ...visible, published: false });
  assert.equal(
    publicStudio(data).events.some((e) => e.id === original.id),
    false,
  );
});

test("deleting junk registrations releases seats and removes their email jobs only", () => {
  const data = studio();
  reserveClass(data, booking("kids-mw-0", 2));
  reserveClass(data, booking("kids-mw-0", 1));
  const junk = data.registrations[0];
  const real = data.registrations[1];
  assert.equal(occupiedSeats(data, junk.eventId), 3);
  adminMutation(data, "delete", { kind: "registration", id: junk.id });
  assert.equal(occupiedSeats(data, real.eventId), 1);
  assert.deepEqual(
    data.registrations.map((r) => r.id),
    [real.id],
  );
  assert.ok(data.emailJobs!.every((job) => job.entityId !== junk.id));
  assert.ok(data.emailJobs!.some((job) => job.entityId === real.id));
  assert.throws(
    () => adminMutation(data, "delete", { kind: "registration", id: junk.id }),
    /not found/,
  );
});

test("registration deletion waits for an active email send", () => {
  const data = studio();
  reserveClass(data, booking());
  const job = data.emailJobs![0];
  job.state = "sending";
  job.leaseUntil = Date.now() + 60_000;
  const id = data.registrations[0].id;
  assert.throws(
    () => adminMutation(data, "delete", { kind: "registration", id }),
    /being sent/,
  );
  assert.equal(data.registrations.length, 1);
  job.state = "sent";
  adminMutation(data, "delete", { kind: "registration", id });
  assert.equal(data.registrations.length, 0);
});
