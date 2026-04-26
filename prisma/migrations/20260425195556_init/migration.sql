-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passcodeHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "voters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "elections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" DATETIME,
    "closedAt" DATETIME
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "electionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "positions_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "positionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "voterRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidates_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ballots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "electionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ballots_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ballots_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "voters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ballot_choices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ballotId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    CONSTRAINT "ballot_choices_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "ballots" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ballot_choices_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ballot_choices_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "voters_email_key" ON "voters"("email");

-- CreateIndex
CREATE UNIQUE INDEX "voters_voterId_key" ON "voters"("voterId");

-- CreateIndex
CREATE INDEX "positions_electionId_idx" ON "positions"("electionId");

-- CreateIndex
CREATE INDEX "candidates_positionId_idx" ON "candidates"("positionId");

-- CreateIndex
CREATE INDEX "ballots_electionId_idx" ON "ballots"("electionId");

-- CreateIndex
CREATE UNIQUE INDEX "ballots_electionId_voterId_key" ON "ballots"("electionId", "voterId");

-- CreateIndex
CREATE INDEX "ballot_choices_ballotId_idx" ON "ballot_choices"("ballotId");

-- CreateIndex
CREATE INDEX "ballot_choices_positionId_idx" ON "ballot_choices"("positionId");

-- CreateIndex
CREATE INDEX "ballot_choices_candidateId_idx" ON "ballot_choices"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ballot_choices_ballotId_positionId_key" ON "ballot_choices"("ballotId", "positionId");
