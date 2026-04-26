"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon } from "@/icons";
import { apiCall } from "@/lib/api-client";
import { validateEmail, validatePassword } from "@/lib/validators";

interface FormState {
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}


interface FieldErrors {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
}

const EMPTY_FORM: FormState = {
  email: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

type View = { kind: "form" } | { kind: "success" };

export default function ChangePasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [view, setView] = useState<View>({ kind: "form" });
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key] || errors.form) setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: FieldErrors = {
      email: validateEmail(form.email) ?? undefined,
      currentPassword: form.currentPassword
        ? undefined
        : "Current password is required",
      newPassword: validatePassword(form.newPassword) ?? undefined,
      confirmPassword:
        form.newPassword && form.confirmPassword !== form.newPassword
          ? "Passwords do not match"
          : undefined,
    };
    if (
      next.email ||
      next.currentPassword ||
      next.newPassword ||
      next.confirmPassword
    ) {
      setErrors(next);
      return;
    }
    setSubmitting(true);
    const result = await apiCall<{ ok: true }>("/api/voters/change-password", {
      method: "POST",
      body: JSON.stringify({
        email: form.email,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    });
    if (!result.ok) {
      setErrors({ form: result.error });
      setSubmitting(false);
      return;
    }
    setErrors({});
    setView({ kind: "success" });
  };

  return (
    <div className="w-full max-w-md self-center rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8 dark:bg-gray-900 dark:ring-gray-800">
      {view.kind === "form" && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Change password
            </h1>
            <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
              Enter your current password and choose a new one.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {errors.form && (
              <div
                role="alert"
                className="rounded-lg border border-error-500/30 bg-error-500/5 px-4 py-3 text-base text-error-600 dark:text-error-400"
              >
                {errors.form}
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-base">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                size="lg"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                required
                error={Boolean(errors.email)}
                hint={errors.email}
              />
            </div>

            <div>
              <Label htmlFor="current-password" className="text-base">
                Current password
              </Label>
              <Input
                id="current-password"
                type="password"
                size="lg"
                value={form.currentPassword}
                onChange={(e) => setField("currentPassword", e.target.value)}
                placeholder="Your current password"
                autoComplete="current-password"
                maxLength={64}
                required
                error={Boolean(errors.currentPassword)}
                hint={errors.currentPassword}
              />
            </div>

            <div>
              <Label htmlFor="new-password" className="text-base">
                New password
              </Label>
              <Input
                id="new-password"
                type="password"
                size="lg"
                value={form.newPassword}
                onChange={(e) => setField("newPassword", e.target.value)}
                placeholder="At least 4 characters"
                autoComplete="new-password"
                maxLength={64}
                required
                error={Boolean(errors.newPassword)}
                hint={errors.newPassword}
              />
            </div>

            <div>
              <Label htmlFor="confirm-password" className="text-base">
                Confirm new password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                size="lg"
                value={form.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                maxLength={64}
                required
                error={Boolean(errors.confirmPassword)}
                hint={errors.confirmPassword}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={submitting}
            >
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>

          <div className="mt-6 border-t border-gray-200 pt-5 text-center dark:border-gray-800">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-base text-gray-500 transition-colors hover:text-brand-500 dark:text-gray-400"
            >
              <ChevronLeftIcon aria-hidden="true" className="h-4 w-4" />
              Back to voter sign in
            </Link>
          </div>
        </>
      )}

      {view.kind === "success" && (
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-success-500/10 ring-1 ring-success-500/20">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="text-success-500"
            >
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Password updated
          </h2>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
            Use your new password the next time you sign in.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="mt-6 w-full"
            onClick={() => router.push("/")}
          >
            Sign in to vote
          </Button>
        </div>
      )}
    </div>
  );
}
