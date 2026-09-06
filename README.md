# SalesPulse

A sales manager uploads a call recording; twenty seconds later they get the
transcript, the talk ratio, a SPIN score and the moments they let slip.

This repository is the frontend. Transcription and analysis run on a separate
Railway service, and the data lives in Supabase.

## Running it

```bash
npm install
cp .env.local.example .env.local   # then fill in the Supabase values
npm run dev
```

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key. **Never the service key** — row level security is what separates one company's calls from another's, and a service key in the bundle would defeat it |
| `NEXT_PUBLIC_API_URL` | Railway processing API |
| `NEXT_PUBLIC_API_AUTH` | `1` once that API verifies Supabase JWTs; `0` (default) until then |

`npm run build` type-checks and compiles; `npm run typecheck` does the former
alone. Deploy target is Vercel — the four variables above are all it needs.

## Backend setup this app depends on

Two things live in the database rather than in this repo, and the app cannot
work without them. Both are in [`supabase/`](supabase/) and are safe to re-run.

- **[`profile-on-signup.sql`](supabase/profile-on-signup.sql)** — a trigger that
  creates a `profiles` row for each new `auth.users` record. Every RLS policy
  keys off `my_company_id()`, which reads from `profiles`; with no profile row
  that returns NULL, every policy fails, and a signed-in person sees an app with
  nothing in it. New profiles get `company_id = NULL` and the lowest role, so
  signing up grants nobody access to a company's calls — an owner attaches them
  afterwards with the `update` at the bottom of that file.
- **[`fix-seller-stats-rls.sql`](supabase/fix-seller-stats-rls.sql)** — sets
  `security_invoker` on the `seller_stats` view. Without it the view runs as its
  owner, RLS on the underlying tables is never evaluated, and every company's
  figures are readable by anyone holding the publishable key — which ships in
  the browser. Verify with an unauthenticated request: it must return `[]`.

## How it is put together

- **Next.js 15** App Router, everything under `app/[locale]` so `next-intl`
  owns the URL. Uzbek is the default; the choice is kept in a cookie.
- **Tailwind v4**, configured in CSS. `app/globals.css` holds the whole design
  system: semantic colour tokens on `:root`, the same names redefined under
  `.dark`, and `@theme inline` mapping them to utilities. Nothing is hardcoded,
  so both themes come from one set of declarations.
- **Auth and reads are client-side.** `components/SessionProvider.tsx` resolves
  the session, the profile row and the company, then hands them to the app
  shell. No session goes to sign-in; a profile with no `company_id` gets its own
  screen rather than an empty dashboard.
- **Writes to the processing API** go through `lib/api.ts`. Every failure is
  mapped onto a small vocabulary (`limit`, `not_found`, `too_large`, `server`,
  `network`) that the UI turns into a localised sentence — no server prose ever
  reaches a user.

### Things worth knowing before you change them

**The ribbon** (`components/Ribbon.tsx`) is the product. One component at three
sizes: 6px in a list row, 10px averaged on a seller, 14px and interactive on the
call detail page, where clicking a slice seeks the audio. Its slice elements are
memoised separately from the playhead, because a long call is a few hundred
slices and the player moves the playhead four times a second.

**Speaker roles** come from one convention, encoded once in `lib/speakers.ts`:
the person who speaks first is the salesperson. The diarizer only ever hands
back `SPEAKER_00`, `SPEAKER_01`; resolve the map once per call and pass it down.
Never render a raw label.

**Red and blue mean one thing each.** Red is the salesperson, blue is the
client, everywhere. The single exception is the SPIN block, where an axis
scoring four or below turns red to mark it weak — and that exception does not
get extended anywhere else.

**Dates and numbers are not formatted with `Intl` for Uzbek.** Chrome ships no
`uz` locale data and silently falls back to the ICU root format (`2026 M09 4`)
and to English number conventions (`1,234.5`), while Node has the Uzbek data —
so the same value rendered differently on the server and in the browser, and
what the browser showed was wrong for the market. Dates are composed from month
names in the message files (`lib/useDateFormat.ts`, pinned to Asia/Tashkent) and
numbers use `ru-RU`, whose grouping and decimal marks match Uzbek usage and
which every engine ships.

**Live status** has two paths. Supabase Realtime on the `calls` table is the
fast one; polling `GET /calls/{id}` every five seconds for unsettled calls is
the guarantee, and it stops as soon as everything has settled.

**Flowbite** supplies the modal, dropdown, drawer, table, badge, avatar and form
controls. `components/flowbiteTheme.ts` remaps every surface it paints onto the
design tokens, and clears Flowbite's own strings for those keys — merging alone
leaves its `dark:bg-gray-700` sitting next to our `bg-canvas`, because
tailwind-merge sees no conflict between a variant and a bare utility.

**Motion is rationed.** The ribbon draws itself in once on the detail page,
left to right over about half a second; SPIN bars grow from zero; the total
score counts up. That is all of it, and `prefers-reduced-motion` turns each one
off.
