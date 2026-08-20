import mysql, { type Pool } from "mysql2/promise";

let pool: Pool | undefined;

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const protocol = new URL(databaseUrl).protocol;
    if (protocol !== "mysql:" && protocol !== "mysql2:") {
      throw new Error(
        "DATABASE_URL must be a MySQL connection string. Use mysql://... or set the DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME variables.",
      );
    }
    return mysql.createPool(databaseUrl);
  }

  const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"] as const;
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing MySQL environment variables: ${missing.join(", ")}. Set DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.`,
    );
  }

  return mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
  });
}

export function getPool(): Pool {
  pool ??= createPool();
  return pool;
}

export async function checkDatabaseConnection(): Promise<void> {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}