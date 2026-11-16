-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('WAITING', 'SERVING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Manager" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "tokenNumber" INTEGER NOT NULL,
    "personName" TEXT NOT NULL,
    "phone" TEXT,
    "position" INTEGER NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'WAITING',
    "queueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Manager_email_key" ON "Manager"("email");

-- CreateIndex
CREATE INDEX "Queue_managerId_idx" ON "Queue"("managerId");

-- CreateIndex
CREATE INDEX "Token_queueId_status_position_idx" ON "Token"("queueId", "status", "position");

-- CreateIndex
CREATE INDEX "Token_queueId_createdAt_idx" ON "Token"("queueId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Token_queueId_tokenNumber_key" ON "Token"("queueId", "tokenNumber");

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
