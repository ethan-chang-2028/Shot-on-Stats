import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { checkDatabaseConnection } from "../lib/mysql";

const router: IRouter = Router();

router.get("/health", async (_req, res) => {
  try {
    await checkDatabaseConnection();
    const data = HealthCheckResponse.parse({ status: "ok", db: "connected" });
    res.status(200).json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    const data = HealthCheckResponse.parse({
      status: "error",
      db: "disconnected",
      error: message,
    });
    res.status(503).json(data);
  }
});

export default router;
