import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const APP_TABLES =
  '"cards", "card_sets", "chat_history", "session", "account", "verification", "user"';

const requireDatabaseUrl = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set for the e2e suite.");
  }
  return connectionString;
};

const databaseName = (connectionString: string) => {
  const name = decodeURIComponent(new URL(connectionString).pathname.replace(/^\//, ""));
  if (!name) {
    throw new Error(`No database name found in DATABASE_URL: ${connectionString}`);
  }
  return name;
};

/**
 * Connects through the maintenance database so the e2e database can be created
 * on a fresh checkout. `CREATE DATABASE` cannot be parameterised, so the name is
 * quoted as a Postgres identifier.
 */
const createDatabaseIfMissing = async (connectionString: string) => {
  const name = databaseName(connectionString);
  const quotedName = `"${name.replace(/"/g, '""')}"`;
  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const existing = await admin.query("select 1 from pg_database where datname = $1", [name]);
    if (existing.rowCount === 0) {
      await admin.query(`create database ${quotedName}`);
    }
  } finally {
    await admin.end();
  }
};

export default async function globalSetup() {
  const connectionString = requireDatabaseUrl();
  await createDatabaseIfMissing(connectionString);

  const pool = new Pool({ connectionString });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder: "drizzle" });
    await pool.query(`truncate table ${APP_TABLES} restart identity cascade`);
  } finally {
    await pool.end();
  }
}
