import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVoter } from "@/lib/auth-guards";

export async function GET() {
  const guard = await requireVoter();
  if (!guard.ok) return guard.response;
  const voterId = guard.value.voterId;

  const [voter, election] = await Promise.all([
    db.voter.findUnique({
      where: { id: voterId },
      select: { id: true, name: true, email: true, voterId: true },
    }),
    db.election.findFirst({
      where: { status: "open" },
      orderBy: { openedAt: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        positions: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            candidates: {
              orderBy: { createdAt: "asc" },
              select: { id: true, name: true, bio: true },
            },
          },
        },
      },
    }),
  ]);

  if (!voter) {
    return NextResponse.json({ error: "Voter not found" }, { status: 404 });
  }
  if (!election) {
    return NextResponse.json({ voter, election: null, hasVoted: false });
  }

  const eligibility = await db.voterEligibility.findUnique({
    where: {
      electionId_voterId: { electionId: election.id, voterId: voter.id },
    },
    select: { id: true },
  });

  return NextResponse.json({
    voter,
    election,
    hasVoted: Boolean(eligibility),
  });
}
