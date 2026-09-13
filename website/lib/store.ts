import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { createSeed } from "./seed";
import type { StudioData } from "./model";

const globals = globalThis as typeof globalThis & {
  studioSql?: ReturnType<typeof postgres>;
  studioQueue?: Promise<unknown>;
  studioReady?: Promise<void>;
};
const dataPath = path.join(
  process.env.LOCAL_DATA_DIR ?? path.join(process.cwd(), "data"),
  "studio.json",
);
function database() {
  if (!process.env.DATABASE_URL) {
    if (process.env.VERCEL)
      throw new Error("Connect DATABASE_URL before deploying the studio.");
    return null;
  }
  return (globals.studioSql ??= postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  }));
}
async function initialize() {
  const sql = database();
  if (!sql) return;
  globals.studioReady ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS studio_state (id integer PRIMARY KEY CHECK (id = 1), data jsonb NOT NULL)`;
    await sql`INSERT INTO studio_state (id, data) VALUES (1, ${JSON.stringify(createSeed())}::jsonb) ON CONFLICT (id) DO NOTHING`;
  })().catch((error) => {
    globals.studioReady = undefined;
    throw error;
  });
  await globals.studioReady;
}
async function readLocal(): Promise<StudioData> {
  try {
    return JSON.parse(await readFile(dataPath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return createSeed();
  }
}
async function writeLocal(data: StudioData) {
  await mkdir(path.dirname(dataPath), { recursive: true });
  const temp = dataPath + ".tmp";
  await writeFile(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
  await rename(temp, dataPath);
}
function localTransaction<T>(fn: (data: StudioData) => T): Promise<T> {
  const work = (globals.studioQueue ?? Promise.resolve()).then(async () => {
    const data = await readLocal();
    const result = fn(data);
    data.revision++;
    await writeLocal(data);
    return result;
  });
  globals.studioQueue = work.catch(() => {});
  return work;
}
export async function readStudio(): Promise<StudioData> {
  const sql = database();
  if (sql) {
    await initialize();
    const rows = await sql`SELECT data FROM studio_state WHERE id = 1`;
    return rows[0].data as StudioData;
  }
  await globals.studioQueue;
  return readLocal();
}
export async function changeStudio<T>(fn: (data: StudioData) => T): Promise<T> {
  const sql = database();
  if (!sql) return localTransaction(fn);
  await initialize();
  return (await sql.begin(async (tx) => {
    // A row lock serializes seat reservations, date holds, and admin edits.
    const rows =
      await tx`SELECT data FROM studio_state WHERE id = 1 FOR UPDATE`;
    const data = rows[0].data as StudioData;
    const result = fn(data);
    data.revision++;
    await tx`UPDATE studio_state SET data = ${JSON.stringify(data)}::jsonb WHERE id = 1`;
    return result;
  })) as T;
}
