"use client";

import React, { useCallback, useEffect, useState } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Breadcrumb from "@/components/common/Breadcrumb";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { TableSkeleton } from "@/components/voting/skeletons";
import { apiCall } from "@/lib/api-client";
import { validateEmail, validatePassword, validateVoterId } from "@/lib/validators";
import { CopyIcon, PlusIcon, TrashBinIcon } from "@/icons";

interface VoterRow {
  id: string;
  name: string;
  email: string;
  voterId: string;
  registeredAt: string;
  ballotCount: number;
}

interface VotersPage {
  data: VoterRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface VoterCredentials {
  id: string;
  name: string;
  email: string;
  voterId: string;
  password: string;
}

interface VoterForm {
  name: string;
  email: string;
  voterId: string;
  password: string;
}

interface FieldErrors {
  name?: string;
  email?: string;
  voterId?: string;
  password?: string;
  form?: string;
}

const EMPTY_FORM: VoterForm = { name: "", email: "", voterId: "", password: "" };
const PAGE_SIZE = 20;

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

type ModalView =
  | { kind: "closed" }
  | { kind: "form" }
  | { kind: "success"; voter: VoterCredentials };

export default function VotersPage() {
  const [page, setPage] = useState<VotersPage | null>(null);
  const [filter, setFilter] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [view, setView] = useState<ModalView>({ kind: "closed" });
  const [form, setForm] = useState<VoterForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirm, setConfirm] = useState<VoterRow | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (currentPage: number, q: string) => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(currentPage),
      pageSize: String(PAGE_SIZE),
    });
    if (q) qs.set("q", q);
    const result = await apiCall<VotersPage>(`/api/voters?${qs}`);
    if (result.ok) setPage(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      setPageNum(1);
      refresh(1, filter.trim());
    }, filter.trim() ? 250 : 0);
    return () => clearTimeout(id);
  }, [filter, refresh]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(pageNum, filter.trim());
  }, [pageNum, refresh, filter]);

  const closeModal = () => {
    setView({ kind: "closed" });
    setForm(EMPTY_FORM);
    setErrors({});
    setCopied(false);
  };

  const openForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setView({ kind: "form" });
  };

  const handleAutoGenerateId = async () => {
    const result = await apiCall<{ voterId: string }>(
      "/api/voters/generate-id",
      { method: "POST" },
    );
    if (result.ok) {
      setForm((p) => ({ ...p, voterId: result.data.voterId }));
      if (errors.voterId || errors.form) setErrors({});
    } else {
      setErrors({ form: result.error });
    }
  };

  const handleAutoGeneratePassword = async () => {
    const result = await apiCall<{ password: string }>(
      "/api/voters/generate-password",
      { method: "POST" },
    );
    if (result.ok) {
      setForm((p) => ({ ...p, password: result.data.password }));
      if (errors.password || errors.form) setErrors({});
    } else {
      setErrors({ form: result.error });
    }
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: FieldErrors = {
      name: form.name.trim() ? undefined : "Name is required",
      email: validateEmail(form.email) ?? undefined,
      voterId: validateVoterId(form.voterId) ?? undefined,
      password: validatePassword(form.password) ?? undefined,
    };
    if (next.name || next.email || next.voterId || next.password) {
      setErrors(next);
      return;
    }
    const result = await apiCall<{ voter: VoterCredentials }>("/api/voters", {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (!result.ok) {
      setErrors({ form: result.error });
      return;
    }
    setErrors({});
    setView({ kind: "success", voter: result.data.voter });
    refresh(pageNum, filter.trim());
  };

  const handleCopyCredentials = async (voter: VoterCredentials) => {
    const text = `Sign-in credentials\nName: ${voter.name}\nEmail: ${voter.email}\nNSE Number: ${voter.voterId}\nPassword: ${voter.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    const result = await apiCall<{ ok: true }>(
      `/api/voters/${confirm.id}`,
      { method: "DELETE" },
    );
    setConfirm(null);
    if (result.ok) {
      refresh(pageNum, filter.trim());
    }
  };

  const setField = <K extends keyof VoterForm>(key: K, value: VoterForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key] || errors.form) setErrors({});
  };

  if (!page) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" rounded="lg" />
        </div>
        <TableSkeleton rows={6} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Voters" },
        ]}
      />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Voters
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Only registered voters can sign in to cast a ballot.
          </p>
        </div>
        <Button startIcon={<PlusIcon />} onClick={openForm}>
          Register voter
        </Button>
      </header>

      {page.total === 0 && !filter ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            No voters registered yet
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Register at least one voter before opening an election.
          </p>
          <div className="mt-5">
            <Button startIcon={<PlusIcon />} onClick={openForm}>
              Register first voter
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <Input
              id="voter-filter"
              type="text"
              placeholder="Search by name, email or NSE number"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              maxLength={64}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">NSE Number</th>
                  <th className="px-4 py-3 font-medium">Registered</th>
                  <th className="px-4 py-3 font-medium">Ballots</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {page.data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      {loading ? "Loading…" : "No voters match this search."}
                    </td>
                  </tr>
                ) : (
                  page.data.map((voter) => (
                    <tr key={voter.id} className="text-gray-700 dark:text-gray-300">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {voter.name}
                      </td>
                      <td className="px-4 py-3">{voter.email}</td>
                      <td className="px-4 py-3 font-mono">{voter.voterId}</td>
                      <td className="px-4 py-3">{formatDate(voter.registeredAt)}</td>
                      <td className="px-4 py-3">{voter.ballotCount}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          ariaLabel={`Remove voter ${voter.name}`}
                          startIcon={<TrashBinIcon />}
                          onClick={() => setConfirm(voter)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {page.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-200 p-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400">
              <span>
                Page {page.page} of {page.totalPages} · {page.total} voters
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page.page <= 1}
                  onClick={() => setPageNum((n) => Math.max(1, n - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page.page >= page.totalPages}
                  onClick={() => setPageNum((n) => n + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={view.kind !== "closed"}
        onClose={closeModal}
        className="m-4 max-w-md p-6"
      >
        {view.kind === "form" && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Register a voter
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              The voter signs in using exactly these credentials.
            </p>
            <form onSubmit={handleAdd} noValidate className="mt-5 space-y-4">
              {errors.form && (
                <div
                  role="alert"
                  className="rounded-lg border border-error-500/30 bg-error-500/5 px-3 py-2 text-sm text-error-600 dark:text-error-400"
                >
                  {errors.form}
                </div>
              )}
              <div>
                <Label htmlFor="new-voter-name">Full name</Label>
                <Input
                  id="new-voter-name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="off"
                  maxLength={80}
                  required
                  error={Boolean(errors.name)}
                  hint={errors.name}
                />
              </div>
              <div>
                <Label htmlFor="new-voter-email">Email</Label>
                <Input
                  id="new-voter-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="voter@example.com"
                  autoComplete="off"
                  maxLength={254}
                  required
                  error={Boolean(errors.email)}
                  hint={errors.email}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-voter-id">NSE Number</Label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateId}
                    className="text-xs font-medium text-brand-500 hover:text-brand-600"
                  >
                    Auto-generate
                  </button>
                </div>
                <Input
                  id="new-voter-id"
                  type="text"
                  value={form.voterId}
                  onChange={(e) => setField("voterId", e.target.value)}
                  placeholder="NSE-1234"
                  autoComplete="off"
                  maxLength={32}
                  required
                  error={Boolean(errors.voterId)}
                  hint={errors.voterId ?? "4–32 letters, numbers or dashes"}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-voter-password">Password</Label>
                  <button
                    type="button"
                    onClick={handleAutoGeneratePassword}
                    className="text-xs font-medium text-brand-500 hover:text-brand-600"
                  >
                    Auto-generate
                  </button>
                </div>
                <Input
                  id="new-voter-password"
                  type="text"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="At least 4 characters"
                  autoComplete="off"
                  maxLength={64}
                  required
                  error={Boolean(errors.password)}
                  hint={errors.password ?? "Voters use this with their email to sign in"}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Register
                </Button>
              </div>
            </form>
          </>
        )}

        {view.kind === "success" && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-500/10 text-success-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Voter registered
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Share these credentials with the voter.
                </p>
              </div>
            </div>

            <dl className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-800/40">
              <Row label="Name" value={view.voter.name} />
              <Row label="Email" value={view.voter.email} />
              <Row label="NSE Number" value={view.voter.voterId} mono />
              <Row label="Password" value={view.voter.password} mono />
            </dl>

            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              The password is shown only this once. Copy it and share through your usual channel — the platform does not send emails.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                startIcon={<CopyIcon />}
                onClick={() => handleCopyCredentials(view.voter)}
              >
                {copied ? "Copied" : "Copy credentials"}
              </Button>
              <Button size="sm" onClick={closeModal}>
                Done
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        className="m-4 max-w-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Remove voter
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {confirm
            ? `Remove ${confirm.name} (${confirm.email})?${
                confirm.ballotCount > 0
                  ? " This voter has already cast a ballot — removal will be blocked."
                  : ""
              }`
            : ""}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-base font-semibold text-gray-900 dark:text-white ${
          mono ? "font-mono text-brand-500" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
