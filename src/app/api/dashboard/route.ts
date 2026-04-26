import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface CandidateLite {
  id: string;
  name: string;
}

interface PositionLite {
  id: string;
  title: string;
  description: string | null;
  candidates: CandidateLite[];
}

export async function GET() {
  const [openElections, closedElections, totalVoters] = await Promise.all([
    db.election.findMany({
      where: { status: "open" },
      orderBy: { openedAt: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        openedAt: true,
        closedAt: true,
        positions: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            candidates: {
              orderBy: { createdAt: "asc" },
              select: { id: true, name: true },
            },
          },
        },
        _count: { select: { ballots: true } },
      },
    }),
    db.election.findMany({
      where: { status: "closed" },
      orderBy: { closedAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        openedAt: true,
        closedAt: true,
        positions: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            candidates: {
              orderBy: { createdAt: "asc" },
              select: { id: true, name: true },
            },
          },
        },
        _count: { select: { ballots: true } },
      },
    }),
    db.voter.count(),
  ]);

  const visible = [...openElections, ...closedElections];
  const electionIds = visible.map((e) => e.id);

  const choiceCounts = electionIds.length
    ? await db.ballotChoice.groupBy({
        by: ["positionId", "candidateId"],
        where: { ballot: { electionId: { in: electionIds } } },
        _count: { _all: true },
      })
    : [];

  const countByKey = new Map<string, number>();
  for (const row of choiceCounts) {
    countByKey.set(`${row.positionId}:${row.candidateId}`, row._count._all);
  }

  const buildTally = (positions: PositionLite[]) =>
    positions.map((position) => {
      const results = position.candidates
        .map((c) => ({
          candidateId: c.id,
          name: c.name,
          votes: countByKey.get(`${position.id}:${c.id}`) ?? 0,
        }))
        .sort((a, b) => b.votes - a.votes);
      return {
        positionId: position.id,
        title: position.title,
        description: position.description,
        results,
        totalVotes: results.reduce((sum, r) => sum + r.votes, 0),
      };
    });

  return NextResponse.json({
    open: openElections.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      status: e.status,
      openedAt: e.openedAt?.toISOString() ?? null,
      closedAt: e.closedAt?.toISOString() ?? null,
      ballotCount: e._count.ballots,
      tally: buildTally(e.positions),
    })),
    closed: closedElections.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      status: e.status,
      openedAt: e.openedAt?.toISOString() ?? null,
      closedAt: e.closedAt?.toISOString() ?? null,
      ballotCount: e._count.ballots,
      tally: buildTally(e.positions),
    })),
    totalVoters,
  });
}
