import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

test("concurrent reservations serialize and persist without overselling", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "nong-store-test-"));
  const previous = {
    url: process.env.DATABASE_URL,
    vercel: process.env.VERCEL,
    directory: process.env.LOCAL_DATA_DIR,
  };
  delete process.env.DATABASE_URL;
  delete process.env.VERCEL;
  process.env.LOCAL_DATA_DIR = directory;
  try {
    const { changeStudio, readStudio } = await import("../lib/store");
    const { reserveClass, occupiedSeats } = await import("../lib/domain");
    await changeStudio((data) => {
      data.settings.bookingsOpen = true;
    });
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        changeStudio((data) =>
          reserveClass(data, {
            requestId: randomUUID(),
            eventId: "kids-mw-0",
            customerName: `Test ${i}`,
            email: `test${i}@example.test`,
            phone: "",
            participants: ["Test Artist"],
            notes: "",
          }),
        ),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 8);
    assert.equal(results.filter((r) => r.status === "rejected").length, 12);
    const data = await readStudio();
    assert.equal(occupiedSeats(data, "kids-mw-0"), 8);
    assert.equal(data.registrations.length, 8);
    await assert.rejects(
      changeStudio((state) => {
        state.settings.name = "Should not persist";
        throw new Error("Abort");
      }),
    );
    assert.equal((await readStudio()).settings.name, "Nong’s Art Den");
  } finally {
    for (const [key, value] of Object.entries({
      DATABASE_URL: previous.url,
      VERCEL: previous.vercel,
      LOCAL_DATA_DIR: previous.directory,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
});
