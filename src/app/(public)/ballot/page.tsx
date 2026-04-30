"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import { BallotSkeleton } from "@/components/voting/skeletons";
import { apiCall } from "@/lib/api-client";

interface VoterMe {
  id: string;
  name: string;
  email: string;
  voterId: string;
}

interface CandidateView {
  id: string;
  name: string;
  bio: string | null;
}

interface PositionView {
  id: string;
  title: string;
  description: string | null;
  candidates: CandidateView[];
}

interface BallotContext {
  voter: VoterMe;
  election: {
    id: string;
    name: string;
    description: string | null;
    positions: PositionView[];
  } | null;
  hasVoted: boolean;
}

type ViewState =
  | { kind: "loading" }
  | { kind: "no-election"; voter: VoterMe }
  | { kind: "ready"; context: BallotContext };

type SelectionMap = Record<string, string>;

export default function BallotPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [selections, setSelections] = useState<SelectionMap>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiCall<BallotContext>("/api/ballot-context").then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        router.replace("/");
        return;
      }
      const context = result.data;
      if (context.hasVoted) {
        router.replace("/confirmation?status=already");
        return;
      }
      if (!context.election) {
        setView({ kind: "no-election", voter: context.voter });
        return;
      }
      setView({ kind: "ready", context });
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const positions = useMemo(
    () =>
      view.kind === "ready" ? view.context.election?.positions ?? [] : [],
    [view],
  );
  const totalPositions = positions.length;
  const completedCount = useMemo(
    () => positions.filter((p) => Boolean(selections[p.id])).length,
    [positions, selections],
  );
  const allChosen = totalPositions > 0 && completedCount === totalPositions;

  const handleSelect = (positionId: string, candidateId: string) => {
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }));
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (view.kind !== "ready" || !view.context.election || !allChosen || submitting) return;

    setSubmitting(true);
    const result = await apiCall<{ ok: true }>("/api/ballots", {
      method: "POST",
      body: JSON.stringify({
        electionId: view.context.election.id,
        choices: positions.map((p) => ({
          positionId: p.id,
          candidateId: selections[p.id],
        })),
      }),
    });
    if (!result.ok) {
      setSubmitError(result.error);
      setSubmitting(false);
      return;
    }
    // Keep the voter signed in so they can browse to /dashboard from the
    // confirmation page. Sign-out is now an explicit action.
    router.push("/confirmation?status=submitted");
  };

  const handleSignOut = async () => {
    await apiCall("/api/voters/sign-out", { method: "POST" });
    router.replace("/");
  };

  if (view.kind === "loading") {
    return <BallotSkeleton />;
  }

  if (view.kind === "no-election") {
    return (
      <div className="w-full max-w-md self-center rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          No election is open
        </h1>
        <p className="mt-3 text-base text-gray-500 dark:text-gray-400">
          There&apos;s no active ballot at the moment. Please check back when
          your election administrator opens voting.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-6 text-base font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          Sign out
        </button>
      </div>
    );
  }

  const { context } = view;
  const election = context.election!;

  return (
    <div className="w-full max-w-2xl">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-wide text-brand-500">
            Now voting
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 sm:text-3xl dark:text-white">
            {election.name}
          </h1>
          {election.description && (
            <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
              {election.description}
            </p>
          )}
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Signed in as{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {context.voter.name}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-white/5"
        >
          Sign out
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {positions.map((position, idx) => {
          const isEmpty = position.candidates.length === 0;
          const groupName = `position-${position.id}`;
          return (
            <section
              key={position.id}
              aria-labelledby={`${groupName}-label`}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6 dark:bg-gray-900 dark:ring-gray-800"
            >
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                  Position {idx + 1} of {positions.length}
                </p>
                <h2
                  id={`${groupName}-label`}
                  className="mt-1 text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white"
                >
                  {position.title}
                </h2>
                {position.description && (
                  <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                    {position.description}
                  </p>
                )}
              </div>
              {isEmpty ? (
                <p className="rounded-lg bg-gray-50 p-4 text-base text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                  No candidates registered for this position.
                </p>
              ) : (
                <div
                  role="radiogroup"
                  aria-labelledby={`${groupName}-label`}
                  className="space-y-3"
                >
                  {position.candidates.map((candidate) => {
                    const inputId = `${groupName}-${candidate.id}`;
                    const selected = selections[position.id] === candidate.id;
                    return (
                      <label
                        key={candidate.id}
                        htmlFor={inputId}
                        className={`flex min-h-[68px] cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition focus-within:ring-3 focus-within:ring-brand-500/30 sm:p-5 ${
                          selected
                            ? "border-brand-500 bg-brand-500/5 dark:bg-brand-500/10"
                            : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                        }`}
                      >
                        <input
                          id={inputId}
                          type="radio"
                          name={groupName}
                          value={candidate.id}
                          checked={selected}
                          onChange={() => handleSelect(position.id, candidate.id)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                            selected
                              ? "border-brand-500 bg-brand-500"
                              : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
                          }`}
                        >
                          {selected && <span className="h-3 w-3 rounded-full bg-white" />}
                        </span>
                        <span className="flex-1">
                          <span className="block text-lg font-semibold text-gray-900 dark:text-white">
                            {candidate.name}
                          </span>
                          {candidate.bio && (
                            <span className="mt-1 block text-base text-gray-500 dark:text-gray-400">
                              {candidate.bio}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        <div className="sticky bottom-4 z-10">
          <div className="rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
            <div className="flex flex-col items-stretch gap-3">
              <p className="text-base text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {completedCount} of {totalPositions}
                </span>{" "}
                positions selected
              </p>
              {submitError && (
                <p role="alert" className="text-base text-error-500">
                  {submitError}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={!allChosen}
                loading={submitting}
              >
                {submitting ? "Submitting…" : "Submit ballot"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Once submitted, your ballot cannot be changed.{" "}
        <Link href="/" className="text-gray-500 underline hover:text-brand-500">
          Cancel and return home
        </Link>
      </p>
    </div>
  );
}
