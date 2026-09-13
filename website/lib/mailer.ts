import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";
import { z } from "zod";
import { changeStudio } from "./store";
import { claimEmail, finishEmail, queueReminders } from "./notifications";

export function emailReady() {
  return (
    process.env.EMAIL_ENABLED === "true" &&
    (!process.env.VERCEL || process.env.VERCEL_ENV === "production") &&
    z.string().email().safeParse(process.env.GMAIL_USER).success &&
    Boolean(process.env.GMAIL_APP_PASSWORD) &&
    z.string().email().safeParse(process.env.EMAIL_FROM).success &&
    z.string().email().safeParse(process.env.STUDIO_NOTIFICATION_EMAIL).success
  );
}
export function cronAuthorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function deliverEmails(reminders = false) {
  if (!emailReady()) return { enabled: false, processed: 0 };
  if (reminders) await changeStudio((data) => queueReminders(data, Date.now()));
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  let processed = 0;
  const deadline = Date.now() + 40_000;
  try {
    while (processed < 10 && Date.now() < deadline) {
      const token = randomUUID();
      const work = await changeStudio((data) =>
        claimEmail(
          data,
          Date.now(),
          token,
          process.env.STUDIO_NOTIFICATION_EMAIL!,
        ),
      );
      if (!work) break;
      let failure: string | undefined;
      try {
        await transport.sendMail({
          from: { name: "Nong’s Art Den", address: process.env.EMAIL_FROM! },
          replyTo: process.env.EMAIL_FROM!,
          to: { address: work.message.to, name: "" },
          subject: work.message.subject.replace(/[\r\n]/g, " "),
          text: work.message.text,
          messageId: `<${createHash("sha256").update(work.jobId).digest("hex")}@nongsartden.com>`,
        });
      } catch (error) {
        // SMTP responses may contain customer addresses or credentials; retain only safe categories.
        const code = (error as { code?: string }).code;
        failure =
          code === "EAUTH"
            ? "Gmail authentication failed. Check the app password."
            : "Gmail delivery failed. A retry is scheduled.";
      }
      await changeStudio((data) =>
        finishEmail(data, work.jobId, token, failure),
      );
      processed++;
      if (failure) break;
    }
  } finally {
    transport.close();
  }
  return { enabled: true, processed };
}
export async function deliverAfterResponse() {
  try {
    await deliverEmails();
  } catch {
    console.error(
      "Email worker interrupted; pending jobs remain queued for cron.",
    );
  }
}
