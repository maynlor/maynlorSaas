import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { config } from "../config/Config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../migrations");

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations");
  return new Set(result.rows.map((row) => row.filename));
}

/**
 * Identificador arbitrario pero estable del lock: cualquier proceso que quiera
 * migrar esta base usa el mismo número y por lo tanto espera su turno.
 */
const MIGRATION_LOCK_ID = 4815162342;

export async function runMigrations(pool: Pool): Promise<void> {
  // Con varias instancias desplegando a la vez, dos procesos podrían intentar
  // aplicar la misma migración y uno fallaría a mitad de camino. El lock de
  // Postgres serializa el proceso: el segundo espera y luego no encuentra
  // nada pendiente.
  const lockClient = await pool.connect();
  try {
    await lockClient.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await applyPendingMigrations(pool);
  } finally {
    await lockClient.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
    lockClient.release();
  }
}

async function applyPendingMigrations(pool: Pool): Promise<void> {
  await ensureMigrationsTable(pool);
  const applied = await getAppliedMigrations(pool);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf-8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`Applied migration: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Migration failed: ${file} — ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: config.databaseUrl });
  try {
    await runMigrations(pool);
    console.log("All migrations applied.");
  } finally {
    await pool.end();
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
