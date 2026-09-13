import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createSeed } from "../lib/seed";
import {
  reserveClass,
  requestArt,
  publicStudio,
  adminMutation,
} from "../lib/domain";
import {
  claimEmail,
  finishEmail,
  queueReminders,
  renderEmail,
} from "../lib/notifications";
import { cronAuthorized, emailReady } from "../lib/mailer";

function fixture() {
  const data = createSeed();
  data.settings.bookingsOpen = true;
  const event = data.events[0];
  event.sessions = [
    { date: "2099-06-10", start: "15:00", end: "17:00" },
    { date: "2099-06-12", start: "15:00", end: "17:00" },
  ];
  const input = {
    requestId: randomUUID(),
    eventId: event.id,
    customerName: "Test parent",
    email: "parent@example.test",
    phone: "",
    participants: ["Artist"],
    notes: "",
  };
  reserveClass(data, input);
  return { data, event, input };
}
test("booking receipt and studio alert are atomic and idempotent, and private", () => {
  const { data, input } = fixture();
  reserveClass(data, input);
  assert.equal(data.emailJobs?.length, 2);
  assert.equal("emailJobs" in publicStudio(data), false);
  const message = renderEmail(data, data.emailJobs![0], "studio@example.test")!;
  assert.equal(message.to, input.email);
  assert.match(message.text, /Jun 10[\s\S]*3 PM–5 PM/);
  assert.match(message.text, /Jun 12/);
  assert.match(message.text, /not a payment receipt/);
});
test("inquiries acknowledge requests without confirming a wedding", () => {
  const data = createSeed();
  data.settings.bookingsOpen = true;
  const input = {
    requestId: randomUUID(),
    offeringId: "wedding-painting",
    customerName: "Test couple",
    email: "couple@example.test",
    phone: "",
    date: "2099-09-10",
    description: "A wedding painting please",
  };
  requestArt(data, input);
  requestArt(data, input);
  assert.equal(data.emailJobs?.length, 2);
  assert.match(
    renderEmail(data, data.emailJobs![0], "studio@example.test")!.text,
    /not a confirmed wedding booking/,
  );
});
test("session reminders are deduplicated and stale/cancelled sessions are skipped", () => {
  const { data, event } = fixture();
  data.emailJobs = [];
  const now = Date.parse("2099-06-09T19:01:00Z");
  queueReminders(data, now);
  queueReminders(data, now);
  assert.equal(data.emailJobs.length, 1);
  const job = data.emailJobs[0];
  assert.ok(renderEmail(data, job, "studio@example.test", now));
  event.sessions[0].start = "16:00";
  assert.equal(renderEmail(data, job, "studio@example.test", now), null);
  event.sessions[0].start = "15:00";
  data.registrations[0].status = "cancelled";
  assert.equal(renderEmail(data, job, "studio@example.test", now), null);
});
test("reminder horizon uses Eastern time through spring daylight-saving transition", () => {
  const { data, event } = fixture();
  data.emailJobs = [];
  event.sessions = [{ date: "2027-03-14", start: "15:00", end: "17:00" }];
  queueReminders(data, Date.parse("2027-03-13T18:59:00Z"));
  assert.equal(data.emailJobs.length, 0);
  queueReminders(data, Date.parse("2027-03-13T19:01:00Z"));
  assert.equal(data.emailJobs.length, 1);
});
test("leases prevent concurrent claims, recover interruptions, and ignore stale completions", () => {
  const { data } = fixture();
  data.emailJobs!.splice(1);
  const now = Date.now() + 1_000;
  const first = claimEmail(data, now, "worker-a", "studio@example.test")!;
  assert.ok(first);
  assert.equal(
    claimEmail(data, now + 1, "worker-b", "studio@example.test"),
    null,
  );
  assert.ok(claimEmail(data, now + 300_001, "worker-b", "studio@example.test"));
  finishEmail(data, first.jobId, "worker-a");
  assert.equal(data.emailJobs![0].state, "sending");
  finishEmail(data, first.jobId, "worker-b");
  assert.equal(data.emailJobs![0].state, "sent");
});
test("failed sends back off, stop at five attempts, and allow explicit admin retry", () => {
  const { data } = fixture();
  data.emailJobs!.splice(1);
  let now = Date.now() + 100;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const work = claimEmail(
      data,
      now,
      `worker-${attempt}`,
      "studio@example.test",
    )!;
    assert.ok(work);
    finishEmail(data, work.jobId, `worker-${attempt}`, "Safe error", now);
    assert.equal(
      claimEmail(data, now + 1, "early", "studio@example.test"),
      null,
    );
    now = data.emailJobs![0].nextAttemptAt;
  }
  assert.equal(data.emailJobs![0].state, "failed");
  adminMutation(data, "retry-email", { id: data.emailJobs![0].id });
  assert.equal(data.emailJobs![0].state, "pending");
  assert.equal(data.emailJobs![0].attempts, 0);
});
test("missing cron secret fails closed and preview cannot send mail", () => {
  const saved = { ...process.env };
  try {
    delete process.env.CRON_SECRET;
    assert.equal(cronAuthorized("Bearer undefined"), false);
    process.env.CRON_SECRET = "test-secret";
    assert.equal(cronAuthorized("Bearer test-secret"), true);
    assert.equal(cronAuthorized("Bearer wrong"), false);
    Object.assign(process.env, {
      EMAIL_ENABLED: "true",
      VERCEL: "1",
      VERCEL_ENV: "preview",
      GMAIL_USER: "nong@example.test",
      GMAIL_APP_PASSWORD: "fake",
      EMAIL_FROM: "hello@example.test",
      STUDIO_NOTIFICATION_EMAIL: "studio@example.test",
    });
    assert.equal(emailReady(), false);
  } finally {
    process.env = saved;
  }
});
