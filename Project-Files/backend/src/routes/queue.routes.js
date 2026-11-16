import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const queues = await prisma.queue.findMany({
      where: { managerId: req.managerId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { tokens: { where: { status: "WAITING" } } } }
      }
    });
    res.json(queues);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: "Queue name is required." });
    if (name.length > 60) return res.status(400).json({ message: "Queue name must be 60 characters or fewer." });

    const queue = await prisma.queue.create({
      data: { name, managerId: req.managerId }
    });
    res.status(201).json(queue);
  } catch (error) { next(error); }
});

export default router;
