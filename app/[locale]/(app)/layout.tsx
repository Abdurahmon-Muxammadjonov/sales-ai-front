"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Drawer, DrawerItems, Label, TextInput } from "flowbite-react";
import { createCompanyForCurrentUser } from "@/lib/queries";
import { usePathname } from "@/i18n/navigation";
import { SessionProvider, useGuardedSession } from "@/components/SessionProvider";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { Logo } from "@/components/Logo";
import { Button, Notice, SkeletonRows } from "@/components/ui";

export default function AppLayout({ children }: { children: ReactNode }) {
  const guard = useGuardedSession();

  if (guard.kind === "loading") return <ShellSkeleton />;
  if (guard.kind === "unconfigured") return <UnconfiguredScreen />;
  if (guard.kind === "no-company") {
    return (
      <OnboardingScreen
        email={guard.email}
        onSignOut={guard.signOut}
        onCreated={guard.refresh}
      />
    );
  }

  return <AppShell guard={guard}>{children}</AppShell>;
}

/** Which nav item the current URL belongs to, for the topbar title. */
function usePageTitle(): string {
  const t = useTranslations("nav");
  const pathname = usePathname();
  if (pathname.startsWith("/speech/stt")) return t("stt");
  if (pathname.startsWith("/speech")) return t("main");
  if (pathname.startsWith("/calls")) return t("calls");
  if (pathname.startsWith("/sellers")) return t("sellers");
  if (pathname.startsWith("/settings")) return t("settings");
  return t("main");
}

function AppShell({
  guard,
  children,
}: {
  guard: Extract<ReturnType<typeof useGuardedSession>, { kind: "ready" }>;
  children: ReactNode;
}) {
  const { value } = guard;
  const title = usePageTitle();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <SessionProvider value={value}>
      <div className="flex min-h-dvh">
        {/* Fixed rail on desktop; the same component rides in a drawer below lg. */}
        <aside className="vibrancy sticky top-0 hidden h-dvh w-sidebar shrink-0 border-r border-line lg:block">
          <Sidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            title={title}
            fullName={value.profile.full_name}
            email={value.user.email ?? ""}
            hoursUsed={value.company?.hours_used ?? null}
            hoursLimit={value.company?.hours_limit ?? null}
            onSignOut={() => void value.signOut()}
            onOpenMenu={() => setDrawerOpen(true)}
          />
          <main className="flex-1 px-4 pb-20 sm:px-6">
            <div className="mx-auto w-full max-w-[1180px]">{children}</div>
          </main>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        className="w-sidebar p-0 lg:hidden"
      >
        <DrawerItems className="h-full">
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </DrawerItems>
      </Drawer>
    </SessionProvider>
  );
}

/** Chrome first, content shape second — never a bare spinner on a full page. */
function ShellSkeleton() {
  const t = useTranslations("guard");
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="sticky top-0 z-40 border-b border-line bg-canvas">
        <div className="shell flex h-16 items-center">
          <Logo />
        </div>
      </div>
      <main className="shell flex-1 pb-20" aria-busy="true" aria-label={t("checking")}>
        <div className="py-8">
          <div className="skeleton h-7 w-40" />
        </div>
        <SkeletonRows count={6} />
      </main>
    </div>
  );
}

function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-md">
        <Logo />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

/**
 * What a brand-new account sees. Anyone who signs up can name a company here
 * and land straight in the app as its owner — nobody has to be provisioned by
 * hand first.
 *
 * The note about an existing team is doing real work: the failure mode of
 * self-serve onboarding is a person whose colleagues already use SalesPulse
 * creating a second, empty company and wondering where everyone's calls went.
 */
function OnboardingScreen({
  email,
  onSignOut,
  onCreated,
}: {
  email: string;
  onSignOut: () => Promise<void>;
  onCreated: () => void;
}) {
  const t = useTranslations("onboarding");
  const tNav = useTranslations("nav");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const clean = name.trim();
    if (busy) return;
    if (!clean) {
      setErrorKey("nameRequired");
      return;
    }
    setBusy(true);
    setErrorKey(null);
    try {
      await createCompanyForCurrentUser(clean);
      onCreated();
    } catch (error) {
      // The function refuses anyone who already has a company; that is a stale
      // page rather than a failure, so it gets its own sentence.
      const code = (error as { code?: string } | null)?.code;
      setErrorKey(code === "42501" ? "alreadyMember" : "failed");
      setBusy(false);
    }
  }

  return (
    <CenteredCard>
      <h1 className="font-display text-xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-ink-2">{t("body")}</p>

      <form className="mt-6" onSubmit={onSubmit} noValidate>
        <Label htmlFor="company-name" className="mb-1.5 block text-sm text-ink-2">
          {t("companyName")}
        </Label>
        <TextInput
          id="company-name"
          value={name}
          autoFocus
          maxLength={120}
          placeholder={t("companyNamePlaceholder")}
          onChange={(event) => setName(event.target.value)}
        />
        {errorKey ? (
          <p role="alert" className="mt-2 text-sm text-red-text">
            {t(errorKey)}
          </p>
        ) : null}
        <Button type="submit" tone="primary" className="mt-4 h-10 w-full" disabled={busy}>
          {busy ? t("creating") : t("create")}
        </Button>
      </form>

      <p className="mt-8 border-t border-line pt-5 text-sm text-ink-3">
        {t("alreadyInTeam", { email })}
      </p>
      <Button className="mt-4" onClick={() => void onSignOut()}>
        {tNav("signOut")}
      </Button>
    </CenteredCard>
  );
}

function UnconfiguredScreen() {
  const t = useTranslations("common");
  return (
    <CenteredCard>
      <Notice tone="warning" title={t("somethingBroke")} body={t("somethingBrokeBody")} />
    </CenteredCard>
  );
}
