import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";
import { setTimeout } from "node:timers/promises";

// An isolated production server: never touches the local studio or cloud data.
const directory = await mkdtemp(path.join(tmpdir(), "nong-production-check-"));
const password = randomBytes(24).toString("hex");
const base = "http://127.0.0.1:3081";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3081",
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      VERCEL: "",
      DATABASE_URL: "",
      BLOB_READ_WRITE_TOKEN: "",
      REFERENCE_BLOB_READ_WRITE_TOKEN: "",
      LOCAL_DATA_DIR: directory,
      LOCAL_ADMIN_PREVIEW: "true",
      ADMIN_USERNAME: "test-admin",
      ADMIN_PASSWORD: password,
      SESSION_SECRET: randomBytes(32).toString("hex"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let startup = "";
server.stdout.on("data", (chunk) => {
  startup += chunk;
});
server.stderr.on("data", (chunk) => {
  startup += chunk;
});
let cookie = "";
const post = (url, body, authenticated = false, origin = base) =>
  fetch(base + url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      ...(authenticated ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null)
      throw new Error("Production server failed to start: " + startup);
    try {
      const r = await fetch(base + "/api/studio");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await setTimeout(250);
  }
  assert.ok(ready, "Production server becomes ready");
  assert.equal(
    (await fetch(base + "/api/admin")).status,
    401,
    "Local preview cannot bypass production authentication",
  );
  assert.equal((await post("/api/admin", {})).status, 401);
  const deniedUpload = await fetch(base + "/api/uploads", {
    method: "POST",
    headers: { origin: base },
    body: new FormData(),
  });
  assert.equal(deniedUpload.status, 401);
  assert.equal(
    (await post("/api/auth", { username: "test-admin", password: "wrong" }))
      .status,
    401,
  );
  const login = await post("/api/auth", { username: "test-admin", password });
  assert.equal(login.status, 200);
  const header = login.headers.get("set-cookie");
  assert.ok(header.includes("HttpOnly"));
  assert.ok(header.includes("Secure"));
  assert.ok(header.includes("SameSite=lax"));
  cookie = header.split(";")[0];
  const admin = await fetch(base + "/api/admin", { headers: { cookie } });
  assert.equal(admin.status, 200);
  let data = await admin.json();
  assert.ok(!("loginAttempts" in data));
  assert.equal(
    (
      await post(
        "/api/admin",
        { action: "settings", payload: data.settings, revision: data.revision },
        true,
        "https://unrelated.example",
      )
    ).status,
    403,
  );
  const saved = await post(
    "/api/admin",
    {
      action: "settings",
      payload: { ...data.settings, bookingsOpen: true },
      revision: data.revision,
    },
    true,
  );
  assert.equal(saved.status, 200);
  data = await saved.json();
  const input = {
    requestId: randomUUID(),
    eventId: "kids-mw-0",
    customerName: "Production Test",
    email: "test@example.test",
    phone: "",
    participants: ["Test Artist"],
    notes: "",
  };
  const results = await Promise.all(
    Array.from({ length: 12 }, () =>
      post("/api/bookings", { ...input, requestId: randomUUID() }),
    ),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 8);
  assert.equal(results.filter((r) => r.status === 409).length, 4);
  const publicData = await (await fetch(base + "/api/studio")).json();
  assert.equal(
    publicData.events.find((e) => e.id === input.eventId).seatsRemaining,
    0,
  );
  assert.ok(!JSON.stringify(publicData).includes("test@example.test"));
  const request = {
    requestId: randomUUID(),
    offeringId: "wedding-painting",
    customerName: "Wedding Test",
    email: "wedding@example.test",
    phone: "",
    date: "2099-11-11",
    description: "A test wedding request for this date.",
  };
  assert.equal((await post("/api/inquiries", request)).status, 201);
  assert.equal(
    (await post("/api/inquiries", { ...request, requestId: randomUUID() }))
      .status,
    409,
  );
  const photo = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#354938" } }).png().toBuffer();
  const artworkRequest = {
    ...request, requestId: randomUUID(), date: "",
    offeringId: data.offerings.find(o => o.category === "ornament").id,
    photos: [{ name: "my-pet.png", data: "data:image/png;base64," + photo.toString("base64") }],
  };
  assert.equal((await post("/api/inquiries", artworkRequest)).status, 201);
  const updated = await (await fetch(base + "/api/admin", { headers: { cookie } })).json();
  const attached = updated.inquiries.find(i => i.id === artworkRequest.requestId).photos;
  assert.equal(attached.length, 1);
  const imagePath = "/api/references/" + attached[0].id;
  assert.equal((await fetch(base + imagePath)).status, 401, "Reference photos require admin sign-in");
  const image = await fetch(base + imagePath, { headers: { cookie } });
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/webp");
  assert.equal(image.headers.get("cache-control"), "private, no-store");
  assert.equal((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).format, "webp");
  assert.equal((await post("/api/inquiries", artworkRequest)).status, 201);
  assert.equal((await readdir(path.join(directory, "references"))).length, 1, "Retries do not duplicate uploaded files");
  assert.equal((await post("/api/inquiries", { ...artworkRequest, requestId: randomUUID(), photos: Array(4).fill(artworkRequest.photos[0]) })).status, 400);
  assert.equal((await post("/api/inquiries", { ...artworkRequest, requestId: randomUUID(), photos: [{ name: "fake.png", data: "data:image/png;base64,bm90IGFuIGltYWdl" }] })).status, 400);
  const visible = JSON.stringify(await (await fetch(base + "/api/studio")).json());
  assert.ok(!visible.includes(attached[0].id), "Reference photo identifiers are private");
  assert.equal((await fetch(base + "/references/" + attached[0].id + ".webp")).status, 404);
  for (const route of [
    "/",
    "/classes",
    "/classes/kids-mw-0",
    "/gallery",
    "/commissions",
    "/weddings",
    "/about",
    "/admin",
    "/admin/calendar",
    "/admin/programs",
    "/admin/registrations",
    "/admin/inquiries",
    "/admin/gallery",
    "/admin/offerings",
    "/admin/settings",
  ]) {
    const response = await fetch(base + route, { headers: { cookie } });
    assert.equal(response.status, 200, route);
    assert.ok(
      !(await response.text()).includes("The studio needs"),
      route + " renders without error",
    );
  }
  const logout = await fetch(base + "/api/auth", {
    method: "DELETE",
    headers: { origin: base, cookie },
  });
  assert.equal(logout.status, 200);
  assert.match(
    logout.headers.get("set-cookie"),
    /expires=Thu, 01 Jan 1970|Max-Age=0/i,
  );
  console.log(
    "Production checks passed: login, protected APIs/uploads, secure cookies, origin protection, concurrent seat limits, wedding conflicts, private reference uploads/retrieval, retry safety, invalid images, privacy, logout, and 15 page routes.",
  );
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => {
    if (server.exitCode !== null) resolve();
    else server.once("exit", resolve);
  });
  await rm(directory, { recursive: true, force: true });
}
