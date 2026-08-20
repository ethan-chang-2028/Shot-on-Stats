import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { checkDatabaseConnection } from "./lib/mysql";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  try {
    await checkDatabaseConnection();
    logger.info("MySQL database connected");
  } catch (error) {
    logger.error({ err: error }, "Unable to connect to MySQL database");
  }

  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

void start();
