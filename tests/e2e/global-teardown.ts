import { Pool } from "pg";

/**
 * Leaves the e2e database empty for the next run. The database itself is kept
 * so migrations only need to be applied when they change.
 */
export default async function globalTeardown() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return;
  }

  const pool = new Pool({ connectionString });
  try {
    await pool.query('truncate table "cards", "card_sets" restart identity cascade');
  } catch (error) {
    // 3D000: setup never created the database, so there is nothing to clear.
    if ((error as { code?: string }).code !== "3D000") {
      throw error;
    }
  } finally {
    await pool.end();
  }
}
