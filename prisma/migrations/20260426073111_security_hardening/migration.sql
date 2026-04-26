/*
  Warnings:

  - You are about to drop the column `voterId` on the `ballots` table. All the data in the column will be lost.
  - Added the required column `ballotToken` to the `ballots` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "voter_eligibility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voterId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "votedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "voter_eligibility_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "voters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "voter_eligibility_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT,
    "adminEmail" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ballots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "electionId" TEXT NOT NULL,
    "ballotToken" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ballots_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ballots" ("electionId", "id", "submittedAt") SELECT "electionId", "id", "submittedAt" FROM "ballots";
DROP TABLE "ballots";
ALTER TABLE "new_ballots" RENAME TO "ballots";
CREATE UNIQUE INDEX "ballots_ballotToken_key" ON "ballots"("ballotToken");
CREATE INDEX "ballots_electionId_idx" ON "ballots"("electionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "voter_eligibility_electionId_idx" ON "voter_eligibility"("electionId");

-- CreateIndex
CREATE INDEX "voter_eligibility_voterId_idx" ON "voter_eligibility"("voterId");

-- CreateIndex
CREATE UNIQUE INDEX "voter_eligibility_electionId_voterId_key" ON "voter_eligibility"("electionId", "voterId");

-- CreateIndex
CREATE INDEX "audit_log_adminId_idx" ON "audit_log"("adminId");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");
