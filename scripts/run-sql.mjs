// ParkMan2 -- run a raw multi-statement SQL file against the database.
// supabase db query --file uses prepared-statement execution, which
// Postgres rejects for multi-command files -- pg's simple query
// protocol (a plain string to client.query) doesn't have that
// restriction, so this is the actual way to apply 01-schema.sql /
// 02-rls-policies.sql style files.
//
//   node scripts/run-sql.mjs supabase/01-schema.sql
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql.mjs <path-to-sql-file>");
  process.exit(1);
}

const dbUrl = readFileSync(".supabase-db-url", "utf8").trim();
const sql = readFileSync(file, "utf8");

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log(`Applied ${file}`);
} finally {
  await client.end();
}
