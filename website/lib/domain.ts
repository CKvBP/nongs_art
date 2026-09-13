import { randomUUID } from "node:crypto";
import { queueReceipt } from "./notifications";
import {
  artworkSchema,
  homepageSchema,
  defaultHomepage,
  blockSchema,
  eventSchema,
  inquiryInputSchema,
  offeringSchema,
  programSchema,
  registrationInputSchema,
  settingsSchema,
  sortedSessions,
  studioNow,
  type PublicStudio,
  type StudioData,
  type StudioEvent,
} from "./model";

export class StudioError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function occupiedSeats(data: StudioData, eventId: string) {
  return data.registrations
    .filter((r) => r.eventId === eventId && r.status !== "cancelled")
    .reduce((n, r) => n + r.participants.length, 0);
}
export function publicStudio(data: StudioData): PublicStudio {
  return {
    settings: data.settings,
    homepage: data.homepage ?? defaultHomepage,
    programs: data.programs.filter((p) => p.published),
    artworks: data.artworks.filter((a) => a.published),
    offerings: data.offerings.filter((o) => o.published),
    events: data.events
      .filter(
        (e) =>
          e.published &&
          data.programs.some((p) => p.id === e.programId && p.published),
      )
      .map((e) => ({
        ...e,
        seatsRemaining: e.capacity - occupiedSeats(data, e.id),
      })),
    blockedDates: [
      ...new Set([
        ...data.blocks.map((b) => b.date),
        ...data.events.flatMap((e) => e.sessions.map((s) => s.date)),
      ]),
    ],
  };
}
function checkEvent(data: StudioData, event: StudioEvent) {
  if (!data.programs.some((p) => p.id === event.programId))
    throw new StudioError("Choose an existing program.");
  if (event.capacity < occupiedSeats(data, event.id))
    throw new StudioError(
      "Capacity cannot be lower than the number of reserved seats.",
    );
  const sessions = sortedSessions(event);
  for (let index = 0; index < sessions.length; index++) {
    const s = sessions[index];
    if (data.blocks.some((b) => b.date === s.date))
      throw new StudioError(
        "This day is blocked on the studio calendar. Choose another day.",
      );
    const otherSessions = [
      ...sessions.slice(0, index),
      ...data.events
        .filter((e) => e.id !== event.id)
        .flatMap((e) => e.sessions),
    ];
    if (
      otherSessions.some(
        (o) => o.date === s.date && s.start < o.end && s.end > o.start,
      )
    )
      throw new StudioError(
        "This session overlaps another session. Choose a different time.",
      );
  }
}
export function reserveClass(data: StudioData, raw: unknown) {
  const input = registrationInputSchema.parse(raw);
  const existing = data.registrations.find((r) => r.id === input.requestId);
  if (existing) {
    if (existing.email !== input.email || existing.eventId !== input.eventId)
      throw new StudioError("Please start a new reservation.");
    return { reference: existing.reference };
  }
  if (!data.settings.bookingsOpen)
    throw new StudioError(
      "Registration is not open yet. Please check back soon.",
    );
  const event = data.events.find((e) => e.id === input.eventId && e.published);
  if (
    !event ||
    !data.programs.some((p) => p.id === event.programId && p.published)
  )
    throw new StudioError("This class is no longer available.", 404);
  const first = sortedSessions(event)[0];
  if (`${first.date}T${first.start}` <= studioNow())
    throw new StudioError("Registration for this class has closed.");
  if (
    input.participants.length >
    event.capacity - occupiedSeats(data, event.id)
  )
    throw new StudioError(
      "There aren’t enough seats left. Please select fewer seats or another class.",
      409,
    );
  const { requestId, website: _website, ...details } = input;
  const reference = `ART-${randomUUID().slice(0, 8).toUpperCase()}`;
  data.registrations.push({
    ...details,
    id: requestId,
    reference,
    status: "reserved",
    createdAt: new Date().toISOString(),
  });
  queueReceipt(data, requestId, "booking");
  return { reference };
}
export function requestArt(data: StudioData, raw: unknown) {
  const input = inquiryInputSchema.parse(raw);
  const existing = data.inquiries.find((i) => i.id === input.requestId);
  if (existing) {
    if (
      existing.email !== input.email ||
      existing.offeringId !== input.offeringId
    )
      throw new StudioError("Please start a new inquiry.");
    return { reference: existing.reference };
  }
  if (!data.settings.bookingsOpen)
    throw new StudioError(
      "The inquiry book is not open yet. Please check back soon.",
    );
  const offering = data.offerings.find(
    (o) => o.id === input.offeringId && o.published,
  );
  if (!offering)
    throw new StudioError("This offering is no longer available.", 404);
  if (offering.category === "wedding") {
    if (!input.date || input.date <= studioNow().slice(0, 10))
      throw new StudioError("Choose a future wedding date.");
    if (
      data.blocks.some((b) => b.date === input.date) ||
      data.events.some((e) => e.sessions.some((s) => s.date === input.date))
    )
      throw new StudioError(
        "That day is already reserved. Please choose another date.",
        409,
      );
    data.blocks.push({
      id: randomUUID(),
      date: input.date,
      reason: "Wedding inquiry",
      inquiryId: input.requestId,
    });
  }
  const { requestId, website: _website, ...details } = input;
  const reference = `ART-${randomUUID().slice(0, 8).toUpperCase()}`;
  data.inquiries.push({
    ...details,
    id: requestId,
    reference,
    status: "new",
    createdAt: new Date().toISOString(),
  });
  queueReceipt(data, requestId, "inquiry");
  return { reference };
}
function upsert<T extends { id: string }>(items: T[], value: T) {
  const i = items.findIndex((item) => item.id === value.id);
  if (i < 0) items.push(value);
  else items[i] = value;
}
export function adminMutation(data: StudioData, action: string, raw: unknown) {
  switch (action) {
    case "retry-email": {
      const job = data.emailJobs?.find(
        (j) => j.id === (raw as { id?: string })?.id,
      );
      if (!job || job.state !== "failed")
        throw new StudioError("Only failed emails can be retried.");
      job.state = "pending";
      job.attempts = 0;
      job.nextAttemptAt = Date.now();
      delete job.error;
      break;
    }
    case "program":
      upsert(data.programs, programSchema.parse(raw));
      break;
    case "event": {
      const event = eventSchema.parse(raw);
      checkEvent(data, event);
      upsert(data.events, event);
      break;
    }
    case "artwork": {
      const artwork = artworkSchema.parse(raw);
      if (artwork.hero && artwork.hero !== "none") {
        for (const other of data.artworks) {
          if (other.id !== artwork.id && other.hero === artwork.hero)
            other.hero = "none";
        }
      }
      upsert(data.artworks, artwork);
      break;
    }
    case "offering":
      upsert(data.offerings, offeringSchema.parse(raw));
      break;
    case "homepage":
      data.homepage = homepageSchema.parse(raw);
      break;
    case "settings":
      data.settings = settingsSchema.parse(raw);
      break;
    case "block": {
      const block = blockSchema.parse(raw);
      if (
        data.blocks.some((b) => b.date === block.date && b.id !== block.id) ||
        data.events.some((e) => e.sessions.some((s) => s.date === block.date))
      )
        throw new StudioError("This date already has a class or a day block.");
      if (data.blocks.some((b) => b.id === block.id && b.inquiryId))
        throw new StudioError("Manage wedding holds from Inquiries.");
      upsert(data.blocks, block);
      break;
    }
    case "registration-status": {
      const value = raw as { id: string; status: string };
      const item = data.registrations.find((r) => r.id === value.id);
      if (
        !item ||
        !["reserved", "attended", "cancelled"].includes(value.status)
      )
        throw new StudioError("Invalid registration.");
      const event = data.events.find((e) => e.id === item.eventId);
      if (
        item.status === "cancelled" &&
        value.status !== "cancelled" &&
        (!event ||
          occupiedSeats(data, event.id) + item.participants.length >
            event.capacity)
      )
        throw new StudioError(
          "This class does not have enough available seats.",
        );
      item.status = value.status as typeof item.status;
      break;
    }
    case "inquiry-status": {
      const value = raw as { id: string; status: string };
      const item = data.inquiries.find((i) => i.id === value.id);
      if (
        !item ||
        !["new", "accepted", "completed", "declined"].includes(value.status)
      )
        throw new StudioError("Invalid inquiry.");
      if (
        item.status === "declined" &&
        value.status !== "declined" &&
        data.offerings.some(
          (o) => o.id === item.offeringId && o.category === "wedding",
        )
      ) {
        if (
          data.blocks.some((b) => b.date === item.date) ||
          data.events.some((e) => e.sessions.some((s) => s.date === item.date))
        )
          throw new StudioError("That date has since been reserved.");
        data.blocks.push({
          id: randomUUID(),
          date: item.date,
          reason: "Wedding inquiry",
          inquiryId: item.id,
        });
      }
      item.status = value.status as typeof item.status;
      if (value.status === "declined")
        data.blocks = data.blocks.filter((b) => b.inquiryId !== item.id);
      break;
    }
    case "delete": {
      const { kind, id } = raw as { kind: string; id: string };
      if (kind === "registration") {
        if (!data.registrations.some((r) => r.id === id))
          throw new StudioError(
            "Registration not found. Refresh the studio and try again.",
          );
        if (
          data.emailJobs?.some(
            (job) =>
              job.entityId === id &&
              job.state === "sending" &&
              (job.leaseUntil ?? 0) > Date.now(),
          )
        )
          throw new StudioError(
            "An email for this registration is being sent. Please try deleting it again in a few minutes.",
          );
        data.registrations = data.registrations.filter((r) => r.id !== id);
        data.emailJobs = data.emailJobs?.filter((job) => job.entityId !== id);
      } else if (kind === "program") {
        if (data.events.some((e) => e.programId === id))
          throw new StudioError(
            "This program has scheduled classes. Hide it instead, or remove its classes first.",
          );
        data.programs = data.programs.filter((p) => p.id !== id);
      } else if (kind === "event") {
        if (data.registrations.some((r) => r.eventId === id))
          throw new StudioError(
            "This class has registration history. Hide it to preserve the records.",
          );
        data.events = data.events.filter((e) => e.id !== id);
      } else if (kind === "offering") {
        if (data.inquiries.some((i) => i.offeringId === id))
          throw new StudioError(
            "This offering has inquiries. Hide it to preserve the records.",
          );
        data.offerings = data.offerings.filter((o) => o.id !== id);
      } else if (kind === "artwork")
        data.artworks = data.artworks.filter((a) => a.id !== id);
      else if (kind === "block") {
        if (data.blocks.some((b) => b.id === id && b.inquiryId))
          throw new StudioError(
            "Decline the wedding inquiry to release its date.",
          );
        data.blocks = data.blocks.filter((b) => b.id !== id);
      } else throw new StudioError("Unknown item.");
      break;
    }
    default:
      throw new StudioError("Unknown action.");
  }
}

/** Only admin edits invalidate another admin's form, not mail jobs or bookings. */
export function applyAdminEdit(
  data: StudioData,
  action: string,
  payload: unknown,
  expectedRevision: number,
) {
  if ((data.adminRevision ?? 0) !== expectedRevision)
    throw new StudioError(
      "Another administrator saved changes. Refresh studio data and review your changes before saving again.",
      409,
    );
  adminMutation(data, action, payload);
  data.adminRevision = (data.adminRevision ?? 0) + 1;
}
