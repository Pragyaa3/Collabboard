import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err);
});

export const query = <T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number | null }> => {
  return pool.query(text, params);
};

export default pool;