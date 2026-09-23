"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, Notice, PageHeader } from "@/components/ui";
import { IconCode } from "@/components/icons";

export default function DevelopersPage() {
  const t = useTranslations("docs");
  const tNav = useTranslations("nav");

  // The examples print real, runnable commands, so they need the deployed
  // origin rather than a placeholder. Only knowable in the browser.
  const [origin, setOrigin] = useState("https://your-app.vercel.app");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <div className="pb-16">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link
            href="/settings"
            className="inline-flex h-9 items-center rounded-control bg-accent-fill px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            {tNav("apiKeysItem")}
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <div className="space-y-6">
          <Section icon title={t("overviewTitle")} body={t("overviewBody")}>
            <Flow />
          </Section>

          <Section title={t("authTitle")} body={t("authBody")}>
            <Code>{`Authorization: Bearer sp_YOUR_KEY`}</Code>
            <Notice className="mt-4" tone="warning" title={t("authWarn")} />
          </Section>

          <Section title={t("statusTitle")} body={t("statusFlow")}>
            <StatusTable />
          </Section>

          <Section title={t("errorsTitle")}>
            <ErrorTable />
          </Section>

          <Section title={t("limitsTitle")}>
            <ul className="space-y-2 text-[13px] leading-relaxed text-ink-2">
              <li>{t("limitSize")}</li>
              <li>{t("limitLen")}</li>
              <li>{t("limitLang")}</li>
            </ul>
          </Section>
        </div>

        <div className="space-y-6">
          <Endpoint
            method="POST"
            path="/api/v1/calls"
            title={t("ep1Title")}
            body={t("ep1Body")}
          >
            <ParamTable />
            <Label>{t("responseTitle")}</Label>
            <Code>{`{
  "id": "600eddb2-a579-4da7-902a-89fc9e286e74",
  "status": "pending",
  "duration_sec": null,
  "error": null
}`}</Code>
          </Endpoint>

          <Endpoint
            method="GET"
            path="/api/v1/calls/{id}"
            title={t("ep2Title")}
            body={t("ep2Body")}
          >
            <Label>{t("responseTitle")}</Label>
            <Code>{`{
  "call": {
    "id": "600eddb2-…",
    "status": "done",
    "duration_sec": 156.4,
    "client_name": "Jahongir",
    "error": null
  },
  "transcript": {
    "full_text": "alo, assalomu alaykum…",
    "words_count": 3274,
    "talk_ratio": { "SPEAKER_00": 71, "SPEAKER_01": 29 },
    "dialog": [
      { "start": 12.78, "end": 29.75,
        "speaker": "SPEAKER_00",
        "text": "alo, assalomu alaykum…" }
    ]
  },
  "analysis": {
    "situation": 7, "problem": 7,
    "implication": 3, "need_payoff": 4,
    "total_score": 5,
    "strengths": [], "mistakes": [],
    "missed": [], "recommendations": []
  }
}`}</Code>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-3">{t("responseNote")}</p>
          </Endpoint>

          <Examples origin={origin} />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  body,
  children,
  icon,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
  icon?: boolean;
}) {
  return (
    <section className="card p-5 sm:p-6">
      {icon ? (
        <span
          aria-hidden="true"
          className="mb-3 grid size-9 place-items-center rounded-full"
          style={{
            background: "color-mix(in srgb, var(--teal) 12%, transparent)",
            color: "var(--teal)",
          }}
        >
          <IconCode />
        </span>
      ) : null}
      <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>
      {body ? <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{body}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

function Endpoint({
  method,
  path,
  title,
  body,
  children,
}: {
  method: string;
  path: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-[6px] px-2 py-0.5 font-mono text-[11px] font-semibold text-white"
          style={{ background: method === "POST" ? "var(--green)" : "var(--accent-fill)" }}
        >
          {method}
        </span>
        <code className="font-mono text-[13px] text-ink">{path}</code>
      </div>
      <h2 className="mt-3 text-[17px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{body}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mt-5 mb-2 text-[12px] font-medium text-ink-3">{children}</p>;
}

function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-control bg-tint p-3.5 font-mono text-[12px] leading-relaxed text-ink">
      {children}
    </pre>
  );
}

function Flow() {
  const steps = ["POST /api/v1/calls", "pending → transcribing → analyzing", "GET /api/v1/calls/{id}"];
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={step} className="flex items-start gap-2.5">
          <span className="tnum mt-px font-mono text-[11px] text-ink-3">{i + 1}</span>
          <code className="font-mono text-[12px] text-ink-2">{step}</code>
        </li>
      ))}
    </ol>
  );
}

function ParamTable() {
  const t = useTranslations("docs");
  const rows: Array<[string, string, string]> = [
    ["file", t("required"), t("paramFile")],
    ["seller_id", t("optional"), t("paramSeller")],
    ["client_name", t("optional"), t("paramClient")],
    ["speakers", t("optional"), t("paramSpeakers")],
  ];
  return (
    <>
      <Label>{t("paramsTitle")}</Label>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <tbody>
            {rows.map(([name, need, why]) => (
              <tr key={name} className="border-b border-divider last:border-0">
                <td className="py-2.5 pr-3 align-top font-mono whitespace-nowrap text-ink">{name}</td>
                <td className="py-2.5 pr-3 align-top whitespace-nowrap text-ink-3">{need}</td>
                <td className="py-2.5 align-top leading-relaxed text-ink-2">{why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusTable() {
  const tStatus = useTranslations("status");
  const rows = ["pending", "transcribing", "analyzing", "done", "failed"] as const;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {rows.map((s, i) => (
        <span key={s} className="flex items-center gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${
              s === "failed"
                ? "bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-red-text"
                : s === "done"
                  ? "bg-[color-mix(in_srgb,var(--green)_14%,transparent)] text-green"
                  : "bg-raised text-ink-2"
            }`}
            title={tStatus(s)}
          >
            {s}
          </span>
          {i < rows.length - 2 ? (
            <span aria-hidden="true" className="text-ink-4">
              →
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function ErrorTable() {
  const t = useTranslations("docs");
  const rows: Array<[string, string]> = [
    ["401", t("err401")],
    ["402", t("err402")],
    ["404", t("err404")],
    ["413", t("err413")],
    ["415", t("err415")],
    ["502", t("err502")],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="border-b border-line">
            <th className="py-2 pr-3 font-medium text-ink-3">{t("errCode")}</th>
            <th className="py-2 font-medium text-ink-3">{t("errMeaning")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([code, meaning]) => (
            <tr key={code} className="border-b border-divider last:border-0">
              <td className="py-2.5 pr-3 align-top font-mono text-ink">{code}</td>
              <td className="py-2.5 align-top leading-relaxed text-ink-2">{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const LANGS = ["curl", "Node.js", "Python", "PHP"] as const;

function Examples({ origin }: { origin: string }) {
  const t = useTranslations("docs");
  const [lang, setLang] = useState<(typeof LANGS)[number]>("curl");
  const [copied, setCopied] = useState(false);

  const snippets: Record<(typeof LANGS)[number], string> = {
    curl: `# 1. yuborish
curl -X POST ${origin}/api/v1/calls \\
  -H "Authorization: Bearer $SALESPULSE_KEY" \\
  -F "file=@qongiroq.mp3" \\
  -F "client_name=Jahongir"
# → {"id":"600eddb2-…","status":"pending"}

# 2. natijani olish
curl ${origin}/api/v1/calls/600eddb2-… \\
  -H "Authorization: Bearer $SALESPULSE_KEY"`,

    "Node.js": `const KEY = process.env.SALESPULSE_KEY;
const BASE = "${origin}/api/v1";

async function transcribe(filePath, clientName) {
  const form = new FormData();
  form.append("file", new Blob([await readFile(filePath)]), "call.mp3");
  if (clientName) form.append("client_name", clientName);

  const res = await fetch(\`\${BASE}/calls\`, {
    method: "POST",
    headers: { Authorization: \`Bearer \${KEY}\` },
    body: form,
  });
  if (!res.ok) throw new Error(\`upload failed: \${res.status}\`);
  const { id } = await res.json();

  // poll until it settles
  for (;;) {
    await new Promise((r) => setTimeout(r, 4000));
    const r = await fetch(\`\${BASE}/calls/\${id}\`, {
      headers: { Authorization: \`Bearer \${KEY}\` },
    });
    const data = await r.json();
    const status = data.call?.status;
    if (status === "done") return data;
    if (status === "failed") throw new Error(data.call.error ?? "failed");
  }
}`,

    Python: `import os, time, requests

KEY  = os.environ["SALESPULSE_KEY"]
BASE = "${origin}/api/v1"
HEAD = {"Authorization": f"Bearer {KEY}"}

def transcribe(path, client_name=None):
    with open(path, "rb") as f:
        data = {"client_name": client_name} if client_name else {}
        r = requests.post(f"{BASE}/calls", headers=HEAD,
                          files={"file": f}, data=data)
    r.raise_for_status()
    call_id = r.json()["id"]

    while True:
        time.sleep(4)
        r = requests.get(f"{BASE}/calls/{call_id}", headers=HEAD)
        r.raise_for_status()
        out = r.json()
        status = (out.get("call") or {}).get("status")
        if status == "done":
            return out
        if status == "failed":
            raise RuntimeError((out["call"] or {}).get("error") or "failed")`,

    PHP: `<?php
$key  = getenv('SALESPULSE_KEY');
$base = '${origin}/api/v1';

$ch = curl_init("$base/calls");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ["Authorization: Bearer $key"],
  CURLOPT_POSTFIELDS => [
    'file' => new CURLFile('qongiroq.mp3'),
    'client_name' => 'Jahongir',
  ],
]);
$id = json_decode(curl_exec($ch), true)['id'];
curl_close($ch);

do {
  sleep(4);
  $ch = curl_init("$base/calls/$id");
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ["Authorization: Bearer $key"],
  ]);
  $out = json_decode(curl_exec($ch), true);
  curl_close($ch);
  $status = $out['call']['status'] ?? null;
} while ($status !== 'done' && $status !== 'failed');`,
  };

  const current = snippets[lang];

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-ink">
          {t("examplesTitle")}
        </h2>
        <Button
          size="sm"
          onClick={() => {
            void navigator.clipboard?.writeText(current).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? "✓" : "Copy"}
        </Button>
      </div>

      <div role="tablist" className="mt-4 inline-flex rounded-control bg-raised p-0.5">
        {LANGS.map((l) => (
          <button
            key={l}
            role="tab"
            aria-selected={lang === l}
            onClick={() => setLang(l)}
            className={`rounded-[8px] px-3 py-1.5 font-mono text-[12px] transition-colors duration-150 ${
              lang === l ? "bg-canvas font-medium text-ink shadow-sm" : "text-ink-2 hover:text-ink"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <pre className="mt-4 max-h-[26rem] overflow-auto rounded-control bg-tint p-3.5 font-mono text-[12px] leading-relaxed text-ink">
        {current}
      </pre>
    </section>
  );
}
