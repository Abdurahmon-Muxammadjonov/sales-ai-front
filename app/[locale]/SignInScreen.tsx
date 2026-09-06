"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { AuthError } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { Label, TextInput } from "flowbite-react";
import { useRouter } from "@/i18n/navigation";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { Button, Notice } from "@/components/ui";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { DemoRibbon } from "@/components/DemoRibbon";

type Mode = "signIn" | "signUp";

/**
 * Supabase answers in English prose; the UI only ever shows its own sentences.
 *
 * Matched on `code` first — those identifiers are stable, whereas the prose
 * gets reworded between releases — with the message text kept as a fallback for
 * older responses that carry no code. The generic case has to know which form
 * the person was on: telling someone "could not sign in" while they are
 * creating an account is its own small confusion.
 */
function messageKeyFor(error: AuthError | null, mode: Mode): string {
  const code = error?.code ?? "";
  const status = error?.status ?? 0;
  const text = (error?.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || text.includes("invalid login")) {
    return "invalidCredentials";
  }
  if (code === "email_not_confirmed" || text.includes("not confirmed")) {
    return "emailNotConfirmed";
  }
  if (code === "weak_password" || (text.includes("password") && text.includes("at least"))) {
    return "weakPassword";
  }
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    text.includes("already registered")
  ) {
    return "emailTaken";
  }
  if (code === "email_address_invalid" || text.includes("email address") && text.includes("invalid")) {
    return "invalidEmail";
  }
  // Supabase caps confirmation emails per hour; the person has done nothing
  // wrong and only needs to be told to wait.
  if (
    status === 429 ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  ) {
    return "tooManyRequests";
  }
  return mode === "signIn" ? "genericSignIn" : "genericSignUp";
}

export default function SignInScreen() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<Mode>("signIn");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);

  // Someone arriving with a live session should never see the form flash.
  useEffect(() => {
    if (!supabaseConfigured) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data.session) router.replace("/calls");
        else setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorKey(null);
    setConfirmSentTo(null);

    try {
      const supabase = getSupabase();
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setErrorKey(messageKeyFor(error, mode));
          return;
        }
        router.replace("/calls");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() || null } },
      });
      if (error) {
        setErrorKey(messageKeyFor(error, mode));
        return;
      }
      // A session here means confirmations are switched off on the project.
      if (data.session) router.replace("/calls");
      else setConfirmSentTo(email);
    } catch {
      setErrorKey(mode === "signIn" ? "genericSignIn" : "genericSignUp");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <Wordmark className="text-lg" />
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center py-12">
          {checking ? (
            <FormSkeleton label={tCommon("loading")} />
          ) : (
          <div className="w-full max-w-[420px]">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {mode === "signIn" ? t("signInTitle") : t("signUpTitle")}
            </h1>

            {!supabaseConfigured ? (
              <Notice
                className="mt-6"
                tone="warning"
                title={tCommon("somethingBroke")}
                body={tCommon("somethingBrokeBody")}
              />
            ) : null}

            {confirmSentTo ? (
              <Notice
                className="mt-6"
                title={t("confirmTitle")}
                body={t("confirmBody", { email: confirmSentTo })}
              />
            ) : null}

            <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
              {mode === "signUp" ? (
                <div>
                  <Label htmlFor="fullName" className="mb-1.5 block text-sm text-ink-2">
                    {t("fullName")}
                  </Label>
                  <TextInput
                    id="fullName"
                    name="name"
                    autoComplete="name"
                    value={fullName}
                    placeholder={t("fullNamePlaceholder")}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </div>
              ) : null}

              <div>
                <Label htmlFor="email" className="mb-1.5 block text-sm text-ink-2">
                  {t("email")}
                </Label>
                <TextInput
                  id="email"
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={email}
                  placeholder={t("emailPlaceholder")}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="password" className="mb-1.5 block text-sm text-ink-2">
                  {t("password")}
                </Label>
                <TextInput
                  id="password"
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                  value={password}
                  placeholder={t("passwordPlaceholder")}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              {errorKey ? (
                <p role="alert" className="text-sm text-red-text">
                  {t(errorKey)}
                </p>
              ) : null}

              <Button
                type="submit"
                tone="primary"
                className="h-10 w-full"
                disabled={busy || !supabaseConfigured}
              >
                {busy
                  ? mode === "signIn"
                    ? t("signingIn")
                    : t("signingUp")
                  : mode === "signIn"
                    ? t("signIn")
                    : t("signUp")}
              </Button>
            </form>

            <button
              type="button"
              className="mt-5 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
              onClick={() => {
                setMode(mode === "signIn" ? "signUp" : "signIn");
                setErrorKey(null);
                setConfirmSentTo(null);
              }}
            >
              {mode === "signIn" ? t("noAccount") : t("haveAccount")}
            </button>
          </div>
          )}
        </div>
      </div>

      <aside className="hidden border-l border-line bg-raised px-10 py-8 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-[520px]">
          <p className="font-display text-xl leading-snug font-medium tracking-tight text-balance">
            {t("heroLine")}
          </p>
          <div className="mt-10">
            <DemoRibbon />
          </div>
          <p className="mt-6 max-w-sm text-sm text-ink-2">{t("demoInsight")}</p>
        </div>
      </aside>
    </main>
  );
}

/**
 * Shown while the existing session is checked. It holds the shape of the form
 * rather than spinning, so an already-signed-in visitor sees a steady page
 * instead of a flash of controls they are about to be redirected past.
 */
function FormSkeleton({ label }: { label: string }) {
  return (
    <div className="w-full max-w-[420px]" aria-busy="true" aria-label={label}>
      <div className="skeleton h-8 w-56" />
      <div className="mt-8 space-y-5">
        <div>
          <div className="skeleton h-3 w-28" />
          <div className="skeleton mt-2 h-10 w-full" />
        </div>
        <div>
          <div className="skeleton h-3 w-20" />
          <div className="skeleton mt-2 h-10 w-full" />
        </div>
        <div className="skeleton h-10 w-full" />
      </div>
    </div>
  );
}
