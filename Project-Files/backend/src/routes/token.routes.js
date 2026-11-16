import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

async function ownedQueue(queueId, managerId) {
  return prisma.queue.findFirst({ where: { id: queueId, managerId } });
}

router.get("/queue/:queueId", async (req, res, next) => {
  try {
    const queue = await ownedQueue(req.params.queueId, req.managerId);
    if (!queue) return res.status(404).json({ message: "Queue not found." });

    const tokens = await prisma.token.findMany({
      where: { queueId: queue.id },
      orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "asc" }]
    });
    res.json(tokens);
  } catch (error) { next(error); }
});

router.post("/queue/:queueId", async (req, res, next) => {
  try {
    const queueId = req.params.queueId;
    const { personName, phone } = req.body;
    if (!personName?.trim()) return res.status(400).json({ message: "Person name is required." });
    if (personName.trim().length > 80) return res.status(400).json({ message: "Name must be 80 characters or fewer." });

    const queue = await ownedQueue(queueId, req.managerId);
    if (!queue) return res.status(404).json({ message: "Queue not found." });

    const created = await prisma.$transaction(async (tx) => {
      const last = await tx.token.aggregate({
        where: { queueId },
        _max: { tokenNumber: true }
      });
      const waitingCount = await tx.token.count({ where: { queueId, status: "WAITING" } });
      return tx.token.create({
        data: {
          queueId,
          tokenNumber: (last._max.tokenNumber || 0) + 1,
          personName: personName.trim(),
          phone: phone?.trim() || null,
          position: waitingCount + 1
        }
      });
    });
    res.status(201).json(created);
  } catch (error) { next(error); }
});

router.patch("/:tokenId/move", async (req, res, next) => {
  try {
    const direction = req.body.direction;
    if (!["up", "down"].includes(direction)) {
      return res.status(400).json({ message: "Direction must be 'up' or 'down'." });
    }

    const token = await prisma.token.findFirst({
      where: { id: req.params.tokenId, queue: { managerId: req.managerId } }
    });
    if (!token) return res.status(404).json({ message: "Token not found." });
    if (token.status !== "WAITING") return res.status(400).json({ message: "Only waiting tokens can be reordered." });

    const result = await prisma.$transaction(async (tx) => {
      const neighbor = await tx.token.findFirst({
        where: {
          queueId: token.queueId,
          status: "WAITING",
          position: direction === "up" ? { lt: token.position } : { gt: token.position }
        },
        orderBy: { position: direction === "up" ? "desc" : "asc" }
      });
      if (!neighbor) return token;

      await tx.token.update({ where: { id: token.id }, data: { position: neighbor.position } });
      await tx.token.update({ where: { id: neighbor.id }, data: { position: token.position } });
      return { ...token, position: neighbor.position };
    });
    res.json(result);
  } catch (error) { next(error); }
});

router.patch("/queue/:queueId/call-next", async (req, res, next) => {
  try {
    const queue = await ownedQueue(req.params.queueId, req.managerId);
    if (!queue) return res.status(404).json({ message: "Queue not found." });

    const serving = await prisma.token.findFirst({ where: { queueId: queue.id, status: "SERVING" } });
    if (serving) return res.status(409).json({ message: "Complete the currently serving token before calling the next person." });

    const nextToken = await prisma.token.findFirst({
      where: { queueId: queue.id, status: "WAITING" },
      orderBy: { position: "asc" }
    });
    if (!nextToken) return res.status(404).json({ message: "There are no waiting tokens." });

    const updated = await prisma.$transaction(async (tx) => {
      const called = await tx.token.update({
        where: { id: nextToken.id },
        data: { status: "SERVING", calledAt: new Date(), position: 0 }
      });
      const remaining = await tx.token.findMany({
        where: { queueId: queue.id, status: "WAITING" },
        orderBy: { position: "asc" }
      });
      for (let i = 0; i < remaining.length; i++) {
        await tx.token.update({ where: { id: remaining[i].id }, data: { position: i + 1 } });
      }
      return called;
    });
    res.json(updated);
  } catch (error) { next(error); }
});

router.patch("/:tokenId/complete", async (req, res, next) => {
  try {
    const token = await prisma.token.findFirst({
      where: { id: req.params.tokenId, queue: { managerId: req.managerId } }
    });
    if (!token) return res.status(404).json({ message: "Token not found." });
    if (token.status !== "SERVING") return res.status(400).json({ message: "Only a serving token can be completed." });

    const updated = await prisma.token.update({
      where: { id: token.id },
      data: { status: "COMPLETED", completedAt: new Date() }
    });
    res.json(updated);
  } catch (error) { next(error); }
});

router.patch("/:tokenId/cancel", async (req, res, next) => {
  try {
    const token = await prisma.token.findFirst({
      where: { id: req.params.tokenId, queue: { managerId: req.managerId } }
    });
    if (!token) return res.status(404).json({ message: "Token not found." });
    if (token.status !== "WAITING") return res.status(400).json({ message: "Only waiting tokens can be cancelled." });

    await prisma.$transaction(async (tx) => {
      await tx.token.update({
        where: { id: token.id },
        data: { status: "CANCELLED", cancelledAt: new Date(), position: 0 }
      });
      const remaining = await tx.token.findMany({
        where: { queueId: token.queueId, status: "WAITING" },
        orderBy: { position: "asc" }
      });
      for (let i = 0; i < remaining.length; i++) {
        await tx.token.update({ where: { id: remaining[i].id }, data: { position: i + 1 } });
      }
    });
    res.json({ message: "Token cancelled." });
  } catch (error) { next(error); }
});

export default router;
