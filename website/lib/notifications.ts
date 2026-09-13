import {
  dateLabel,
  sortedSessions,
  studioNow,
  timeLabel,
  type StudioData,
} from "./model";

export type EmailJob = {
  id: string;
  entityId: string;
  kind: "booking" | "inquiry" | "booking-alert" | "inquiry-alert" | "reminder";
  session?: string;
  state: "pending" | "sending" | "sent" | "failed" | "skipped";
  attempts: number;
  nextAttemptAt: number;
  leaseUntil?: number;
  leaseToken?: string;
  sentAt?: string;
  error?: string;
};
export function queueEmail(
  data: StudioData,
  job: Pick<EmailJob, "id" | "entityId" | "kind" | "session">,
) {
  const jobs = (data.emailJobs ??= []);
  if (!jobs.some((j) => j.id === job.id))
    jobs.push({
      ...job,
      state: "pending",
      attempts: 0,
      nextAttemptAt: Date.now(),
    });
}
export function queueReceipt(
  data: StudioData,
  entityId: string,
  kind: "booking" | "inquiry",
) {
  queueEmail(data, { id: `${kind}:${entityId}`, entityId, kind });
  queueEmail(data, {
    id: `${kind}-alert:${entityId}`,
    entityId,
    kind: `${kind}-alert`,
  });
}
export function queueReminders(data: StudioData, now: number) {
  const current = studioNow(new Date(now));
  const tomorrow = studioNow(new Date(now + 24 * 60 * 60 * 1000));
  for (const registration of data.registrations) {
    if (registration.status !== "reserved") continue;
    const event = data.events.find((e) => e.id === registration.eventId);
    if (!event) continue;
    for (const session of event.sessions) {
      const start = `${session.date}T${session.start}`;
      if (start > current && start <= tomorrow)
        queueEmail(data, {
          id: `reminder:${registration.id}:${start}`,
          entityId: registration.id,
          kind: "reminder",
          session: start,
        });
    }
  }
}
export function renderEmail(
  data: StudioData,
  job: EmailJob,
  studioEmail: string,
  now = Date.now(),
) {
  const footer = `\n\n${data.settings.name}\n${data.settings.location}\nQuestions? Reply to this email.\nhttps://www.nongsartden.com`;
  if (job.kind === "inquiry" || job.kind === "inquiry-alert") {
    const inquiry = data.inquiries.find((i) => i.id === job.entityId);
    if (!inquiry) return null;
    const offering = data.offerings.find((o) => o.id === inquiry.offeringId);
    const title = offering?.title ?? "Custom artwork";
    const date = inquiry.date
      ? `\nRequested date: ${dateLabel(inquiry.date)}`
      : "";
    if (job.kind === "inquiry-alert")
      return {
        to: studioEmail,
        subject: `New inquiry: ${title} · ${inquiry.reference}`,
        text: `${inquiry.customerName} submitted a ${title} inquiry.${date}\nReference: ${inquiry.reference}\n\nReview and reply in the studio admin:\nhttps://www.nongsartden.com/admin/inquiries${footer}`,
      };
    return {
      to: inquiry.email,
      subject: `We received your art request · ${inquiry.reference}`,
      text: `Hi ${inquiry.customerName},\n\nThank you for your ${title} inquiry! Nong will be in touch to discuss your idea, pricing, and timing.${date}\nReference: ${inquiry.reference}\n\n${offering?.category === "wedding" ? "Your request has been received. A date hold is not a confirmed wedding booking; Nong will confirm availability and details with you.\n\n" : ""}No payment was collected.${footer}`,
    };
  }
  const registration = data.registrations.find((r) => r.id === job.entityId);
  const event = data.events.find((e) => e.id === registration?.eventId);
  if (!registration || !event) return null;
  if (job.kind !== "booking-alert" && registration.status !== "reserved")
    return null;
  if (
    job.kind === "reminder" &&
    (!event.sessions.some((s) => `${s.date}T${s.start}` === job.session) ||
      job.session! <= studioNow(new Date(now)))
  )
    return null;
  const sessions = sortedSessions(event)
    .map(
      (s) =>
        `${dateLabel(s.date)}: ${timeLabel(s.start)}–${timeLabel(s.end)} (Eastern time)`,
    )
    .join("\n");
  const details = `${event.title}\n${sessions}\nLocation: ${data.settings.location}\nParticipants: ${registration.participants.join(", ")}\nReference: ${registration.reference}`;
  if (job.kind === "booking-alert")
    return {
      to: studioEmail,
      subject: `New registration: ${event.title} · ${registration.reference}`,
      text: `${registration.customerName} reserved ${registration.participants.length} place(s).\n\n${details}\n\nReview the registration:\nhttps://www.nongsartden.com/admin/registrations${footer}`,
    };
  return {
    to: registration.email,
    subject: `${job.kind === "reminder" ? "Class reminder" : "Your places are reserved"}: ${event.title}`,
    text: `Hi ${registration.customerName},\n\n${job.kind === "reminder" ? "We’re looking forward to seeing you at your upcoming class session!" : "Your places are reserved. Thank you for joining us!"}\n\n${details}\n\nPayment is arranged with the studio; this email is not a payment receipt.${footer}`,
  };
}
export function claimEmail(
  data: StudioData,
  now: number,
  token: string,
  studioEmail: string,
) {
  for (const job of data.emailJobs ?? []) {
    if (job.state === "sending" && (job.leaseUntil ?? 0) <= now) {
      job.state = job.attempts >= 5 ? "failed" : "pending";
      job.error =
        "Delivery interrupted; the previous attempt may have been accepted.";
    }
    if (job.state !== "pending" || job.nextAttemptAt > now) continue;
    const message = renderEmail(data, job, studioEmail, now);
    if (!message) {
      job.state = "skipped";
      continue;
    }
    job.state = "sending";
    job.attempts++;
    job.leaseUntil = now + 5 * 60_000;
    job.leaseToken = token;
    return { jobId: job.id, message };
  }
  return null;
}
export function finishEmail(
  data: StudioData,
  id: string,
  token: string,
  error?: string,
  now = Date.now(),
) {
  const job = data.emailJobs?.find(
    (j) => j.id === id && j.leaseToken === token,
  );
  if (!job || job.state !== "sending") return;
  if (!error) {
    job.state = "sent";
    job.sentAt = new Date(now).toISOString();
    delete job.error;
  } else {
    job.state = job.attempts >= 5 ? "failed" : "pending";
    job.error = error;
    job.nextAttemptAt = now + 60_000 * 5 * 2 ** (job.attempts - 1);
  }
  delete job.leaseToken;
  delete job.leaseUntil;
}
