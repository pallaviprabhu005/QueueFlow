import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import queueRoutes from "./routes/queue.routes.js";
import tokenRoutes from "./routes/token.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import { requireAuth } from "./middleware/auth.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing. Set it in backend/.env");
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "QueueFlow API" }));
app.use("/api/auth", authRoutes);
app.use("/api/queues", requireAuth, queueRoutes);
app.use("/api/tokens", requireAuth, tokenRoutes);
app.use("/api/analytics", requireAuth, analyticsRoutes);

app.use((req, res) => res.status(404).json({ message: "Endpoint not found." }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.status ? error.message : "Something went wrong on the server."
  });
});

const port = Number(process.env.PORT) || 5000;
app.listen(port, () => console.log(`QueueFlow API running at http://localhost:${port}`));
