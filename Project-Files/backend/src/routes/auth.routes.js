import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must contain at least 8 characters." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.manager.findUnique({ where: { email: normalizedEmail } });
    if (existing) return res.status(409).json({ message: "An account with this email already exists." });

    const hashedPassword = await bcrypt.hash(password, 12);
    const manager = await prisma.manager.create({
      data: { name: name.trim(), email: normalizedEmail, password: hashedPassword },
      select: { id: true, name: true, email: true }
    });

    const token = jwt.sign({ managerId: manager.id }, process.env.JWT_SECRET, { expiresIn: "12h" });
    res.status(201).json({ token, manager });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const manager = await prisma.manager.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!manager || !(await bcrypt.compare(password, manager.password))) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const token = jwt.sign({ managerId: manager.id }, process.env.JWT_SECRET, { expiresIn: "12h" });
    res.json({
      token,
      manager: { id: manager.id, name: manager.name, email: manager.email }
    });
  } catch (error) { next(error); }
});

export default router;
