import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

router.get("/:queueId", async (req, res, next) => {
  try {
    const queue = await prisma.queue.findFirst({
      where: { id: req.params.queueId, managerId: req.managerId }
    });
    if (!queue) return res.status(404).json({ message: "Queue not found." });

    const tokens = await prisma.token.findMany({ where: { queueId: queue.id } });
    const waiting = tokens.filter(t => t.status === "WAITING");
    const serving = tokens.filter(t => t.status === "SERVING");
    const completed = tokens.filter(t => t.status === "COMPLETED");
    const cancelled = tokens.filter(t => t.status === "CANCELLED");

    const average = values => values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length / 60000)
      : 0;

    const waitDurations = completed.concat(serving)
      .filter(t => t.calledAt)
      .map(t => new Date(t.calledAt).getTime() - new Date(t.createdAt).getTime());
    const serviceDurations = completed
      .filter(t => t.calledAt && t.completedAt)
      .map(t => new Date(t.completedAt).getTime() - new Date(t.calledAt).getTime());

    const now = new Date();
    const trend = [];
    for (let offset = 6; offset >= 0; offset--) {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      trend.push({
        date: day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        tokens: tokens.filter(t => t.createdAt >= day && t.createdAt < next).length
      });
    }

    res.json({
      total: tokens.length,
      waiting: waiting.length,
      serving: serving.length,
      completed: completed.length,
      cancelled: cancelled.length,
      averageWaitMinutes: average(waitDurations),
      averageServiceMinutes: average(serviceDurations),
      trend
    });
  } catch (error) { next(error); }
});

export default router;
