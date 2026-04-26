"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronRightIcon } from "@/icons";
import { validateEmail, validatePassword } from "@/lib/validators";
import { apiCall } from "@/lib/api-client";

interface FieldErrors {
  email?: string;
  password?: string;
  form?: string;
}

export default function VoterSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: FieldErrors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
    };
    if (next.email || next.password) {
      setErrors(next);
      return;
    }
    setSubmitting(true);
    const result = await apiCall<{ voter: unknown }>("/api/voters/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!result.ok) {
      setErrors({ form: result.error });
      setSubmitting(false);
      return;
    }
    router.push("/ballot");
  };

  return (
    <div className="w-full max-w-md self-center">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image
          src="/images/NSE-Logo.png"
          alt="Nigerian Society of Engineers"
          width={400}
          height={120}
          priority
          className="h-14 w-auto dark:brightness-0 dark:invert"
        />
        <h1 className="mt-6 text-3xl font-semibold text-gray-900 dark:text-white">
          Sign in to vote
        </h1>
        <p className="mt-2 max-w-xs text-base text-gray-500 dark:text-gray-400">
          Enter the email and password your election administrator gave you.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8 dark:bg-gray-900 dark:ring-gray-800">
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
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              required
              error={Boolean(errors.email)}
              hint={errors.email}
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-base">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              size="lg"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
              autoComplete="current-password"
              maxLength={64}
              required
              error={Boolean(errors.password)}
              hint={errors.password}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-2 w-full"
            loading={submitting}
          >
            {submitting ? "Signing in…" : "Sign in to vote"}
          </Button>
        </form>

        <div className="mt-5 text-right">
          <Link
            href="/change-password"
            className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Change my password
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <Link
          href="/dashboard"
          className="text-base font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400"
        >
          View live dashboard
        </Link>
        <Link
          href="/admin/sign-in"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-brand-500 dark:text-gray-400"
        >
          Election administrator sign in
          <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
